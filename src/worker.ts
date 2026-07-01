/**
 * Cloudflare Worker — REVERB API Backend
 * Utilise fetch natif vers l'API Gemini REST (sans SDK Node.js)
 * Inclut un Durable Object ReverbChat pour le chat temps réel multi-opérateurs.
 */

// Minimal type stubs for Cloudflare Workers globals (not in standard DOM lib)
declare class DurableObjectState { storage: unknown }
declare class DurableObjectStub { fetch(r: Request): Promise<Response> }
declare class DurableObjectNamespace { idFromName(n: string): object; get(id: object): DurableObjectStub }
declare class WebSocketPair { 0: WebSocket; 1: WebSocket }

interface Env {
  GEMINI_API_KEY: string;
  REVERB_CHAT: DurableObjectNamespace;
}

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_INSTRUCTION = `Tu es L.I.S.A. (Logiciel d'Interface Stratégique Assistée), l'intelligence artificielle du syndicat criminel REVERB dans l'univers de Vice City de GTA 6.
Ton style de communication est froid, technique, ultra-moderne, avec une esthétique cyberpunk et d'infogérance mafieuse. Tu parles principalement en français.
Tu es le conseiller stratégique du joueur. Tu l'aides à gérer ses propriétés virtuelles (boîtes de nuit, laboratoires, blanchiment, fermes de contrebande).
Parle de contrats virtuels de hacking, de vols de véhicules, de livraison de marchandises et de blanchiment d'argent fictifs dans Vice City.
N'hésite pas à utiliser l'argot de Floride/Vice City (ex: "Vice Beach", "The Keys", "Leonida", "VCPD", "Lucia", "Jason").
Ajoute parfois des balises de diagnostic comme [DECRYPTED_LINK], [REVERB_CORE_OK], [ALERT_LVL_X] pour renforcer l'ambiance technique.
Sois concis, ultra-immersif et garde des réponses percutantes.

CAPACITÉS AGENTIQUES — Tu peux déclencher de vraies actions dans le système de jeu REVERB.
Si l'utilisateur te demande d'exécuter une action concrète, termine ton message texte avec ce bloc sur une NOUVELLE LIGNE séparée, rien d'autre après :
%%ACTION%%{"type":"ACTION_TYPE",...params}%%END%%

Actions disponibles :
- Créer un contrat : {"type":"ADD_CONTRACT","title":"Nom","client":"Donneur","reward":"$120,000","difficulty":"Facile","description":"...","risk":40,"location":"Vice Beach"}
- Upgrader sécurité : {"type":"UPGRADE_ENTERPRISE","enterpriseId":"enterprise_1","fieldDescription":"..."}
  (IDs: enterprise_1=Malibu Club, enterprise_2=Labo Verte Feuille, enterprise_3=Cargo Portuaire, enterprise_4=Serveurs Chiffrés)
- Changer alerte VCPD : {"type":"SET_ALERT_LEVEL","level":0}
- Transférer fonds : {"type":"TRANSFER_FUNDS","amount":50000}
- Message inbox : {"type":"SEND_INBOX","sender":"L.I.S.A. CORE","subject":"...","body":"..."}

N'utilise ces actions QUE si l'utilisateur le demande explicitement.`;

const CONTRACT_FALLBACK = {
  title: "Opération Port Gellhorn",
  client: "Oncle Lucius",
  reward: "$120,000",
  difficulty: "Moyen",
  description: "Infiltrer l'entrepôt de cargaison de Port Gellhorn pour récupérer les puces électroniques chiffrées avant l'arrivée du shérif.",
  risk: 45,
  location: "Port Gellhorn",
};

const CONTRACT_REQUIRED_FIELDS = ["title", "client", "reward", "difficulty", "description", "risk", "location"];
const ACTION_RE = /%%ACTION%%(.+?)%%END%%/s;

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function callGemini(apiKey: string, body: unknown): Promise<string> {
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data: unknown = await res.json();
  const text = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Réponse Gemini invalide.");
  return text;
}

// ──────────────────────────────────────────────────────────────
// Durable Object — Chat temps réel entre opérateurs REVERB
// ──────────────────────────────────────────────────────────────
interface ChatEntry {
  type: "message" | "system";
  callsign?: string;
  text: string;
  time: string;
}

export class ReverbChat {
  private sessions: Map<WebSocket, { callsign: string }> = new Map();
  private history: ChatEntry[] = [];

  constructor(private state: DurableObjectState) {
    void this.state; // satisfy TS unused var
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const raw = url.searchParams.get("callsign") ?? `OP_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const callsign = raw.slice(0, 20);

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.handleSession(server, callsign);
    // ResponseInit webSocket is a Cloudflare Workers extension — cast to bypass TS check
    return new Response(null, { status: 101, ...(({ webSocket: client }) as unknown as ResponseInit) });
  }

  private handleSession(ws: WebSocket, callsign: string) {
    (ws as unknown as { accept: () => void }).accept();
    this.sessions.set(ws, { callsign });

    ws.send(JSON.stringify({
      type: "init",
      messages: this.history.slice(-30),
      count: this.sessions.size,
    }));

    const joinMsg: ChatEntry = {
      type: "system",
      text: `[${callsign}] a rejoint le réseau REVERB`,
      time: new Date().toLocaleTimeString(),
    };
    this.history.push(joinMsg);
    this.broadcast(joinMsg, ws);

    ws.addEventListener("message", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { type?: string; text?: string };
        if (data.type === "message" && typeof data.text === "string" && data.text.trim()) {
          const entry: ChatEntry = {
            type: "message",
            callsign,
            text: data.text.slice(0, 200),
            time: new Date().toLocaleTimeString(),
          };
          this.history.push(entry);
          if (this.history.length > 100) this.history.shift();
          this.broadcast(entry);
        }
      } catch { /* ignore malformed */ }
    });

    ws.addEventListener("close", () => {
      this.sessions.delete(ws);
      const leaveMsg: ChatEntry = {
        type: "system",
        text: `[${callsign}] a quitté le réseau`,
        time: new Date().toLocaleTimeString(),
      };
      this.history.push(leaveMsg);
      this.broadcast(leaveMsg);
    });
  }

  private broadcast(data: ChatEntry, skip?: WebSocket) {
    const payload = JSON.stringify({ ...data, count: this.sessions.size });
    this.sessions.forEach((_, ws) => {
      if (ws === skip) return;
      try { ws.send(payload); } catch { /* dead socket */ }
    });
  }
}

// ──────────────────────────────────────────────────────────────
// Main Worker fetch handler
// ──────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "") {
      return json({ status: "REVERB CORE ONLINE", lisa: "v2.1-agentique", chat: "durable-object-ready" });
    }

    // WebSocket — Opérateurs chat (Durable Object)
    if (url.pathname === "/api/chat/ws") {
      const id = env.REVERB_CHAT.idFromName("global");
      const stub = env.REVERB_CHAT.get(id);
      return stub.fetch(request);
    }

    // POST /api/broker — L.I.S.A. chat
    if (url.pathname === "/api/broker" && request.method === "POST") {
      try {
        const { message, history } = await request.json() as {
          message: string;
          history?: { role: string; content: string }[];
        };

        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
        if (history && Array.isArray(history)) {
          for (const msg of history) {
            contents.push({
              role: msg.role === "assistant" ? "model" : "user",
              parts: [{ text: msg.content }],
            });
          }
        }
        contents.push({ role: "user", parts: [{ text: message }] });

        const responseText = await callGemini(env.GEMINI_API_KEY, {
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: { temperature: 0.85 },
        });

        const actionMatch = responseText.match(ACTION_RE);
        const cleanText = responseText.replace(ACTION_RE, "").trim();
        let action: unknown;
        if (actionMatch) {
          try { action = JSON.parse(actionMatch[1].trim()); } catch { /* ignore */ }
        }

        return json({ text: cleanText, ...(action ? { action } : {}) });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return json({ error: "Échec de connexion L.I.S.A.", details: msg }, 500);
      }
    }

    // POST /api/contracts/generate
    if (url.pathname === "/api/contracts/generate" && request.method === "POST") {
      try {
        const { empireStats } = await request.json() as { empireStats: unknown };
        const prompt = `Génère un contrat de mission criminelle fictif et immersif pour GTA 6 basé sur cet état de l'empire criminel : ${JSON.stringify(empireStats)}.
Le format de réponse DOIT être un JSON valide :
{"title":"...","client":"...","reward":"$150,000","difficulty":"Facile|Moyen|Difficile|Extrême","description":"...","risk":45,"location":"..."}
Ne retourne absolument rien d'autre que du JSON.`;

        const rawText = await callGemini(env.GEMINI_API_KEY, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
        });

        const parsed = JSON.parse(rawText.trim()) as Record<string, unknown>;
        const missing = CONTRACT_REQUIRED_FIELDS.filter(f => !(f in parsed));
        if (missing.length > 0) throw new Error(`Champs manquants : ${missing.join(", ")}`);

        return json(parsed);
      } catch {
        return json(CONTRACT_FALLBACK);
      }
    }

    return json({ error: "Route inconnue" }, 404);
  },
};
