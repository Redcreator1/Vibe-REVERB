/// <reference types="vite/client" />
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Swords, Shield, Wifi, WifiOff } from "lucide-react";
import { useI18n } from "../i18n";
import { useSoundSystem } from "../hooks/useSound";
import { getPlayerCallsign } from "../hooks/usePlayerIdentity";

interface Zone {
  id: string;
  name: string;
  owner: string | null;
  faction: string;
  control: number;
  lastAttack: number;
}

interface TerritoryEvt {
  type: "capture" | "defense" | "system";
  text: string;
  time: string;
}

const MY_CALLSIGN = getPlayerCallsign();
const WS_URL = import.meta.env.VITE_WS_URL as string | undefined;
const COOLDOWN_MS = 2 * 60 * 1000;

type ConnState = "disconnected" | "connecting" | "connected";

export default function TerritoryMap() {
  const { t } = useI18n();
  const play = useSoundSystem();
  const [zones, setZones] = useState<Zone[]>([]);
  const [events, setEvents] = useState<TerritoryEvt[]>([]);
  const [connState, setConnState] = useState<ConnState>("disconnected");
  const [now, setNow] = useState(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playRef = useRef(play);
  useEffect(() => { playRef.current = play; }, [play]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const connect = useCallback(() => {
    if (!WS_URL) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnState("connecting");
    const url = `${WS_URL}/api/territories/ws?callsign=${encodeURIComponent(MY_CALLSIGN)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnState("connected");

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string);
        if (data.type === "init") {
          setZones(data.zones ?? []);
          setEvents(data.events ?? []);
        } else if (data.type === "update") {
          setZones(data.zones ?? []);
          if (data.event) {
            setEvents(prev => [...prev.slice(-49), data.event as TerritoryEvt]);
            if (data.event.type === "capture") {
              playRef.current(data.event.text.startsWith(`⚔️ ${MY_CALLSIGN}`) ? "success" : "alert");
            }
          }
        } else if (data.type === "attack_rejected") {
          playRef.current("error");
        }
      } catch { /* ignore */ }
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

  const attack = (zoneId: string) => {
    if (connState !== "connected" || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "attack", zoneId }));
    play("click");
  };

  if (!WS_URL) {
    return (
      <div className="bg-reverb-card border border-gray-800 rounded-lg p-5 text-center space-y-1">
        <p className="text-reverb-pink/70 font-mono text-xs">{t("chat.offline")}</p>
        <p className="text-[10px] text-gray-600 font-mono">{t("chat.config")}</p>
      </div>
    );
  }

  return (
    <div className="bg-reverb-card border border-reverb-pink/20 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-reverb-pink/10 pb-3">
        <h3 className="font-display font-bold text-reverb-pink text-sm flex items-center gap-2">
          <Swords className="w-4 h-4" />
          {t("territories.title")}
        </h3>
        <span className="flex items-center gap-1.5 font-mono text-[10px]">
          {connState === "connected" ? <Wifi className="w-3 h-3 text-reverb-cyan" /> : <WifiOff className="w-3 h-3 text-gray-500" />}
          <span className={connState === "connected" ? "text-reverb-cyan" : "text-gray-500"}>
            {connState === "connected" ? t("status.online") : connState === "connecting" ? t("chat.connecting") : t("status.offline")}
          </span>
        </span>
      </div>

      {/* Zones grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {zones.map(zone => {
          const isMine = zone.owner === MY_CALLSIGN;
          const cooldownLeft = Math.max(0, COOLDOWN_MS - (now - zone.lastAttack));
          const onCooldown = cooldownLeft > 0;
          const ownerLabel = zone.owner ?? zone.faction;

          return (
            <div
              key={zone.id}
              className={`rounded p-3 border font-mono text-[11px] space-y-2 ${
                isMine ? "border-reverb-cyan/40 bg-reverb-cyan/5" : "border-gray-800 bg-reverb-dark/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <MapPin className="w-3 h-3 text-reverb-pink/70" />
                  {zone.name}
                </span>
                {isMine && <span className="text-[9px] text-reverb-cyan font-bold uppercase">{t("territories.yours")}</span>}
              </div>

              <div className="flex items-center gap-1.5 text-gray-400">
                <Shield className={`w-3 h-3 ${zone.owner ? "text-reverb-pink/60" : "text-gray-600"}`} />
                <span className={zone.owner ? "text-gray-300" : "text-gray-500 italic"}>{ownerLabel}</span>
              </div>

              <div className="w-full bg-gray-950 h-1.5 rounded overflow-hidden">
                <motion.div
                  className="h-full bg-reverb-pink/70"
                  initial={false}
                  animate={{ width: `${zone.control}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <button
                onClick={() => attack(zone.id)}
                disabled={isMine || onCooldown || connState !== "connected"}
                className="w-full py-1.5 bg-reverb-pink/15 hover:bg-reverb-pink/25 border border-reverb-pink/30 rounded text-reverb-pink font-bold uppercase tracking-wider text-[10px] transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {onCooldown
                  ? `${Math.ceil(cooldownLeft / 1000)}s`
                  : t("territories.attack")}
              </button>
            </div>
          );
        })}
        {zones.length === 0 && (
          <p className="col-span-2 text-center text-gray-600 text-[10px] py-4">{t("chat.connecting")}</p>
        )}
      </div>

      {/* Events feed */}
      <div className="border-t border-gray-800 pt-3 space-y-1 max-h-32 overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.slice(-8).reverse().map((evt, i) => (
            <motion.div
              key={`${evt.time}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`font-mono text-[10px] ${
                evt.type === "capture" ? "text-reverb-pink" : evt.type === "defense" ? "text-reverb-cyan" : "text-gray-500"
              }`}
            >
              {evt.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && (
          <p className="text-center text-gray-600 text-[10px]">{t("territories.noEvents")}</p>
        )}
      </div>
    </div>
  );
}
