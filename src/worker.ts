/**
 * Cloudflare Worker — REVERB API Backend
 * Remplace Express pour le déploiement sans serveur.
 */

import { GoogleGenAI } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

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
  (IDs: enterprise_1=Malibu Club, enterprise_2=Labo Verte Feuille, enterprise_3=Contrebande Portuaire, enterprise_4=Serveurs Chiffrés)
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

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    // POST /api/broker — L.I.S.A. chat
    if (url.pathname === "/api/broker" && request.method === "POST") {
      try {
        const { message, history } = await request.json() as { message: string; history?: { role: string; content: string }[] };

        let contentsInput: { role: string; parts: { text: string }[] }[] = [];
        if (history && Array.isArray(history)) {
          contentsInput = history.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          }));
          contentsInput.push({ role: "user", parts: [{ text: message }] });
        } else {
          contentsInput = [{ role: "user", parts: [{ text: message }] }];
        }

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: contentsInput,
          config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.85 },
        });

        const responseText = response.text;
        if (typeof responseText !== "string") throw new Error("Réponse Gemini invalide.");

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

    // POST /api/contracts/generate — génération de contrat
    if (url.pathname === "/api/contracts/generate" && request.method === "POST") {
      try {
        const { empireStats } = await request.json() as { empireStats: unknown };
        const prompt = `Génère un contrat de mission criminelle fictif et immersif pour GTA 6 basé sur cet état de l'empire criminel : ${JSON.stringify(empireStats)}.
Le format de réponse DOIT être un JSON valide correspondant à ce schéma :
{"title":"...","client":"...","reward":"$150,000","difficulty":"Facile|Moyen|Difficile|Extrême","description":"...","risk":45,"location":"..."}
Ne retourne absolument rien d'autre que du JSON.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.9 },
        });

        const rawText = response.text;
        if (typeof rawText !== "string" || !rawText.trim()) throw new Error("Réponse vide.");

        const parsed = JSON.parse(rawText.trim());
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
