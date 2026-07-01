/// <reference types="vite/client" />
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { MessageSquare, X, Send, Wifi, WifiOff, Users } from "lucide-react";
import { useI18n } from "../i18n";
import { useSoundSystem } from "../hooks/useSound";

interface ChatMsg {
  type: "message" | "system";
  callsign?: string;
  text: string;
  time: string;
}

// Random cyberpunk callsign per session
function genCallsign(): string {
  const prefixes = ["GHOST", "NEON", "VIPER", "BLAZE", "NOVA", "ROGUE", "CIPHER", "PIXEL"];
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}_${suffix}`;
}

const MY_CALLSIGN = genCallsign();
const WS_URL = import.meta.env.VITE_WS_URL as string | undefined;

type ConnState = "disconnected" | "connecting" | "connected";

export default function OperatorChat() {
  const { t } = useI18n();
  const play = useSoundSystem();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [connState, setConnState] = useState<ConnState>("disconnected");
  const [onlineCount, setOnlineCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playRef = useRef(play);
  useEffect(() => { playRef.current = play; }, [play]);

  const connect = useCallback(() => {
    if (!WS_URL) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnState("connecting");
    const url = `${WS_URL}/api/chat/ws?callsign=${encodeURIComponent(MY_CALLSIGN)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnState("connected");

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string);
        if (data.type === "init") {
          setMessages(data.messages ?? []);
          setOnlineCount(data.count ?? 1);
        } else if (data.type === "message" || data.type === "system") {
          setMessages(prev => [...prev.slice(-99), data as ChatMsg]);
          if (data.type === "message" && data.callsign !== MY_CALLSIGN) {
            playRef.current("message");
          }
          if (data.count !== undefined) setOnlineCount(data.count);
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnState("disconnected");
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    if (WS_URL) connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = () => {
    const text = input.trim();
    if (!text || connState !== "connected" || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "message", text }));
    setInput("");
    play("click");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const statusColor = connState === "connected" ? "text-reverb-cyan" : connState === "connecting" ? "text-yellow-400" : "text-gray-500";
  const statusDot = connState === "connected" ? "bg-reverb-cyan animate-pulse" : connState === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-gray-600";

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => { setOpen(o => !o); play("nav"); }}
        className="fixed bottom-20 sm:bottom-6 right-4 z-40 w-12 h-12 rounded-full bg-reverb-card border border-reverb-cyan/40 shadow-glow-cyan flex items-center justify-center hover:bg-reverb-cyan/10 transition group"
        title="Opérateurs REVERB"
      >
        <MessageSquare className="w-5 h-5 text-reverb-cyan group-hover:scale-110 transition-transform" />
        {connState === "connected" && onlineCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-reverb-cyan text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {onlineCount}
          </span>
        )}
        <span className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-reverb-card ${statusDot}`} />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 sm:bottom-20 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] bg-reverb-card border border-reverb-cyan/30 rounded-lg shadow-glow-cyan flex flex-col overflow-hidden"
          style={{ maxHeight: "min(420px, calc(100dvh - 120px))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-reverb-cyan/20 bg-reverb-dark/60">
            <div className="flex items-center gap-2 font-mono text-xs">
              {connState === "connected" ? <Wifi className="w-3.5 h-3.5 text-reverb-cyan" /> : <WifiOff className="w-3.5 h-3.5 text-gray-500" />}
              <span className={`font-bold uppercase tracking-wider ${statusColor}`}>
                {t("chat.title")}
              </span>
              {connState === "connected" && (
                <span className="flex items-center gap-1 text-gray-400">
                  <Users className="w-3 h-3" /> {onlineCount}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Callsign */}
          <div className="px-3 py-1.5 bg-reverb-cyan/5 border-b border-reverb-cyan/10 font-mono text-[10px] text-reverb-cyan/70">
            ID : <span className="text-reverb-cyan font-bold">{MY_CALLSIGN}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto h-52 p-2 space-y-1.5 font-mono text-[11px]">
            {!WS_URL ? (
              <div className="text-center text-gray-500 mt-8 space-y-1">
                <p className="text-reverb-pink/70">{t("chat.offline")}</p>
                <p className="text-[9px] text-gray-600">{t("chat.config")}</p>
              </div>
            ) : connState === "connecting" && messages.length === 0 ? (
              <div className="text-center text-yellow-400/60 mt-8 animate-pulse text-[10px]">
                {t("chat.connecting")}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-600 mt-8 text-[10px]">— réseau silencieux —</div>
            ) : (
              messages.map((msg, i) =>
                msg.type === "system" ? (
                  <div key={i} className="text-center text-gray-600 text-[9px] italic">{msg.text}</div>
                ) : (
                  <div key={i} className={`flex gap-1.5 ${msg.callsign === MY_CALLSIGN ? "flex-row-reverse" : ""}`}>
                    <span className={`shrink-0 font-bold text-[9px] mt-0.5 ${msg.callsign === MY_CALLSIGN ? "text-reverb-pink" : "text-reverb-cyan"}`}>
                      {msg.callsign === MY_CALLSIGN ? "MOI" : msg.callsign}
                    </span>
                    <span className={`rounded px-2 py-1 leading-relaxed ${msg.callsign === MY_CALLSIGN ? "bg-reverb-pink/15 text-white" : "bg-reverb-cyan/10 text-gray-200"}`}>
                      {msg.text}
                    </span>
                  </div>
                )
              )
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-1.5 p-2 border-t border-reverb-cyan/20">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
              placeholder={t("chat.placeholder")}
              disabled={connState !== "connected" || !WS_URL}
              maxLength={200}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              inputMode="text"
              className="flex-1 bg-reverb-dark border border-gray-800 focus:border-reverb-cyan/50 rounded px-2.5 py-1.5 text-white font-mono text-[11px] outline-none placeholder:text-gray-600 disabled:opacity-40"
            />
            <button
              onClick={send}
              disabled={connState !== "connected" || !input.trim() || !WS_URL}
              className="px-2.5 py-1.5 bg-reverb-cyan/15 hover:bg-reverb-cyan/25 border border-reverb-cyan/30 rounded text-reverb-cyan transition disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
