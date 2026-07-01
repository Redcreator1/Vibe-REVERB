/**
 * Cloudflare Worker — REVERB API Backend
 * Chat temps réel multi-opérateurs via Durable Object WebSocket.
 * L'intégration Gemini a été retirée — le système fonctionne entièrement en local.
 */

// Minimal type stubs for Cloudflare Workers globals (not in standard DOM lib)
declare class DurableObjectState { storage: unknown }
declare class DurableObjectStub { fetch(r: Request): Promise<Response> }
declare class DurableObjectNamespace { idFromName(n: string): object; get(id: object): DurableObjectStub }
declare class WebSocketPair { 0: WebSocket; 1: WebSocket }

interface Env {
  REVERB_CHAT: DurableObjectNamespace;
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

export class ReverbChat {
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
      return json({ status: "REVERB CORE ONLINE", version: "3.0", chat: "durable-object-ready" });
    }

    // WebSocket — chat opérateurs REVERB
    if (url.pathname === "/api/chat/ws") {
      const id = env.REVERB_CHAT.idFromName("global");
      const stub = env.REVERB_CHAT.get(id);
      return stub.fetch(request);
    }

    return json({ error: "Route inconnue" }, 404);
  },
};
