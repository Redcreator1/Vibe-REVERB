/**
 * Cloudflare Worker — REVERB API Backend
 * Chat temps réel multi-opérateurs via Durable Object WebSocket.
 * L'intégration Gemini a été retirée — le système fonctionne entièrement en local.
 */

// Minimal type stubs for Cloudflare Workers globals (not in standard DOM lib)
declare class DurableObjectState {
  storage: { get<T = unknown>(key: string): Promise<T | undefined>; put(key: string, value: unknown): Promise<void> };
}
declare class DurableObjectStub { fetch(r: Request): Promise<Response> }
declare class DurableObjectNamespace { idFromName(n: string): object; get(id: object): DurableObjectStub }
declare class WebSocketPair { 0: WebSocket; 1: WebSocket }

interface Env {
  REVERB_CHAT: DurableObjectNamespace;
  REVERB_TERRITORIES: DurableObjectNamespace;
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
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

export class ReverbChatSQL {
  private sessions: Map<WebSocket, { callsign: string }> = new Map();
  private history: ChatEntry[] = [];

  constructor(private state: DurableObjectState) {
    void this.state;
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
// Durable Object — Guerre de territoires entre opérateurs REVERB
// ──────────────────────────────────────────────────────────────
interface Zone {
  id: string;
  name: string;
  owner: string | null; // callsign, or null = neutral faction below
  faction: string; // flavor name shown when unclaimed / as origin faction
  control: number; // 0-100, resistance the current owner has built up
  lastAttack: number; // epoch ms, for cooldown
}

interface TerritoryEvent {
  type: "capture" | "defense" | "system";
  text: string;
  time: string;
}

const ATTACK_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes per zone
const ATTACK_COST = 15000; // dirty cash cost, enforced client-side (trust boundary: cosmetic in v1)

const INITIAL_ZONES: Zone[] = [
  { id: "ocean-drive",   name: "Ocean Drive",         owner: null, faction: "Malibu Syndicate",  control: 55, lastAttack: 0 },
  { id: "kelley-county", name: "Kelley County",       owner: null, faction: "Cartel Diaz",       control: 60, lastAttack: 0 },
  { id: "port-gellhorn", name: "Port Gellhorn",       owner: null, faction: "Cholos Street Gang", control: 65, lastAttack: 0 },
  { id: "downtown-vice", name: "Downtown Vice",       owner: null, faction: "Malibu Syndicate",  control: 50, lastAttack: 0 },
  { id: "leonida-keys",  name: "Leonida Keys",        owner: null, faction: "Cartel Diaz",       control: 45, lastAttack: 0 },
  { id: "grassrivers",   name: "Grassrivers",         owner: null, faction: "Cholos Street Gang", control: 58, lastAttack: 0 },
];

export class ReverbTerritories {
  private sessions: Map<WebSocket, { callsign: string }> = new Map();
  private zones: Zone[] = INITIAL_ZONES;
  private events: TerritoryEvent[] = [];
  private loaded = false;

  constructor(private state: DurableObjectState) {}

  private async ensureLoaded() {
    if (this.loaded) return;
    const stored = await this.state.storage.get<Zone[]>("zones");
    if (stored) this.zones = stored;
    this.loaded = true;
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureLoaded();

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const raw = url.searchParams.get("callsign") ?? `OP_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const callsign = raw.slice(0, 20);

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.handleSession(server, callsign);
    return new Response(null, { status: 101, ...(({ webSocket: client }) as unknown as ResponseInit) });
  }

  private handleSession(ws: WebSocket, callsign: string) {
    (ws as unknown as { accept: () => void }).accept();
    this.sessions.set(ws, { callsign });

    ws.send(JSON.stringify({ type: "init", zones: this.zones, events: this.events.slice(-20) }));

    ws.addEventListener("message", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { type?: string; zoneId?: string };
        if (data.type === "attack" && typeof data.zoneId === "string") {
          this.handleAttack(data.zoneId, callsign);
        }
      } catch { /* ignore malformed */ }
    });

    ws.addEventListener("close", () => {
      this.sessions.delete(ws);
    });
  }

  private async handleAttack(zoneId: string, callsign: string) {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return;

    if (zone.owner === callsign) return; // already yours

    const now = Date.now();
    if (now - zone.lastAttack < ATTACK_COOLDOWN_MS) {
      const secsLeft = Math.ceil((ATTACK_COOLDOWN_MS - (now - zone.lastAttack)) / 1000);
      this.sendTo(callsign, { type: "attack_rejected", zoneId, reason: "cooldown", secsLeft });
      return;
    }

    const successChance = Math.max(15, Math.min(85, 60 - zone.control / 2));
    const success = Math.random() * 100 <= successChance;
    zone.lastAttack = now;

    let evt: TerritoryEvent;
    if (success) {
      const previousOwner = zone.owner ?? zone.faction;
      zone.owner = callsign;
      zone.control = 40;
      evt = { type: "capture", text: `⚔️ ${callsign} a pris ${zone.name} à ${previousOwner} !`, time: new Date().toLocaleTimeString() };
    } else {
      zone.control = Math.min(95, zone.control + 8);
      evt = { type: "defense", text: `🛡️ ${zone.owner ?? zone.faction} a repoussé l'attaque de ${callsign} sur ${zone.name}.`, time: new Date().toLocaleTimeString() };
    }

    this.events.push(evt);
    if (this.events.length > 50) this.events.shift();
    await this.state.storage.put("zones", this.zones);
    this.broadcast({ type: "update", zones: this.zones, event: evt });
  }

  private sendTo(callsign: string, data: unknown) {
    const payload = JSON.stringify(data);
    this.sessions.forEach((info, ws) => {
      if (info.callsign === callsign) {
        try { ws.send(payload); } catch { /* dead socket */ }
      }
    });
  }

  private broadcast(data: unknown) {
    const payload = JSON.stringify(data);
    this.sessions.forEach((_, ws) => {
      try { ws.send(payload); } catch { /* dead socket */ }
    });
  }
}

// ──────────────────────────────────────────────────────────────
// Main Worker
// ──────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "") {
      return json({ status: "REVERB CORE ONLINE", version: "3.1", chat: "durable-object-ready", territories: "durable-object-ready" });
    }

    // WebSocket — chat opérateurs REVERB
    if (url.pathname === "/api/chat/ws") {
      const id = env.REVERB_CHAT.idFromName("global");
      const stub = env.REVERB_CHAT.get(id);
      return stub.fetch(request);
    }

    // WebSocket — guerre de territoires
    if (url.pathname === "/api/territories/ws") {
      const id = env.REVERB_TERRITORIES.idFromName("global");
      const stub = env.REVERB_TERRITORIES.get(id);
      return stub.fetch(request);
    }

    return json({ error: "Route inconnue" }, 404);
  },
};
