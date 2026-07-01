/// <reference types="vite/client" />
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserCircle, X, Copy, Check, KeyRound, ShieldCheck, Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { useSoundSystem } from "../hooks/useSound";
import { getPlayerCallsign, setPlayerCallsign, isRegistered, markRegistered } from "../hooks/usePlayerIdentity";

const WS_URL = import.meta.env.VITE_WS_URL as string | undefined;
const HTTP_BASE = WS_URL?.replace(/^wss:/, "https:").replace(/^ws:/, "http:");

type Mode = "closed" | "menu" | "register" | "restore";

export default function AccountPanel() {
  const { t } = useI18n();
  const play = useSoundSystem();
  const [mode, setMode] = useState<Mode>("closed");
  const [callsignInput, setCallsignInput] = useState(getPlayerCallsign());
  const [recoveryInput, setRecoveryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => { setMode("closed"); setError(""); setRecoveryCode(null); };

  const doRegister = async () => {
    if (!HTTP_BASE) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${HTTP_BASE}/api/accounts/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callsign: callsignInput.trim() }),
      });
      const data = await res.json() as { callsign?: string; recoveryCode?: string; error?: string };
      if (!res.ok || !data.recoveryCode) {
        setError(data.error ?? t("account.error"));
        play("error");
        return;
      }
      setRecoveryCode(data.recoveryCode);
      setPlayerCallsign(data.callsign!);
      markRegistered();
      play("success");
    } catch {
      setError(t("account.networkError"));
      play("error");
    } finally {
      setLoading(false);
    }
  };

  const doRecover = async () => {
    if (!HTTP_BASE) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${HTTP_BASE}/api/accounts/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryCode: recoveryInput.trim() }),
      });
      const data = await res.json() as { callsign?: string; error?: string };
      if (!res.ok || !data.callsign) {
        setError(data.error ?? t("account.error"));
        play("error");
        return;
      }
      setPlayerCallsign(data.callsign);
      markRegistered();
      play("success");
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError(t("account.networkError"));
      play("error");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!recoveryCode) return;
    await navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const finishRegistration = () => {
    close();
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => { setMode("menu"); play("nav"); }}
        className="flex items-center gap-1 text-[9px] font-mono font-bold border border-gray-700 hover:border-reverb-cyan/50 px-2 py-1 rounded text-gray-400 hover:text-reverb-cyan transition"
        title={t("account.title")}
      >
        <UserCircle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline max-w-[90px] truncate">{getPlayerCallsign()}</span>
        {isRegistered() && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
      </button>

      <AnimatePresence>
        {mode !== "closed" && (
          <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className="bg-reverb-card border border-reverb-cyan/30 rounded-xl p-5 max-w-sm w-full font-mono shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h2 className="font-display font-bold text-reverb-cyan text-sm flex items-center gap-2">
                  <UserCircle className="w-4 h-4" /> {t("account.title")}
                </h2>
                <button onClick={close} className="text-gray-500 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!HTTP_BASE && (
                <p className="text-center text-reverb-pink/70 text-xs py-4">{t("chat.offline")}</p>
              )}

              {HTTP_BASE && mode === "menu" && (
                <div className="space-y-2.5">
                  <div className="bg-reverb-dark rounded p-3 border border-gray-800 text-[11px] space-y-1">
                    <span className="text-gray-500 block">{t("account.current")}</span>
                    <span className="text-white font-bold flex items-center gap-1.5">
                      {getPlayerCallsign()}
                      {isRegistered() && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    </span>
                  </div>
                  <button
                    onClick={() => setMode("register")}
                    className="w-full py-2.5 bg-reverb-cyan/15 hover:bg-reverb-cyan/25 border border-reverb-cyan/30 rounded text-reverb-cyan font-bold uppercase tracking-wider text-[11px] transition"
                  >
                    {t("account.registerCta")}
                  </button>
                  <button
                    onClick={() => setMode("restore")}
                    className="w-full py-2.5 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 rounded text-gray-300 font-bold uppercase tracking-wider text-[11px] transition flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> {t("account.restoreCta")}
                  </button>
                </div>
              )}

              {HTTP_BASE && mode === "register" && !recoveryCode && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400 leading-relaxed">{t("account.registerDesc")}</p>
                  <input
                    value={callsignInput}
                    onChange={e => setCallsignInput(e.target.value)}
                    maxLength={20}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    placeholder="CALLSIGN_123"
                    className="w-full bg-reverb-dark border border-gray-800 focus:border-reverb-cyan/50 rounded px-3 py-2 text-white text-sm outline-none placeholder:text-gray-600"
                  />
                  {error && <p className="text-reverb-pink text-[10px]">{error}</p>}
                  <button
                    onClick={doRegister}
                    disabled={loading || !callsignInput.trim()}
                    className="w-full py-2.5 bg-reverb-cyan hover:bg-reverb-cyan/85 text-black rounded font-bold uppercase tracking-wider text-[11px] transition disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("account.confirm")}
                  </button>
                </div>
              )}

              {HTTP_BASE && mode === "register" && recoveryCode && (
                <div className="space-y-3">
                  <p className="text-[11px] text-amber-400 leading-relaxed font-bold">⚠️ {t("account.saveWarning")}</p>
                  <div className="bg-reverb-dark border border-reverb-cyan/40 rounded p-3 flex items-center justify-between gap-2">
                    <span className="text-reverb-cyan font-bold tracking-widest text-sm">{recoveryCode}</span>
                    <button onClick={copyCode} className="text-gray-400 hover:text-reverb-cyan transition shrink-0">
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={finishRegistration}
                    className="w-full py-2.5 bg-reverb-cyan hover:bg-reverb-cyan/85 text-black rounded font-bold uppercase tracking-wider text-[11px] transition"
                  >
                    {t("account.done")}
                  </button>
                </div>
              )}

              {HTTP_BASE && mode === "restore" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400 leading-relaxed">{t("account.restoreDesc")}</p>
                  <input
                    value={recoveryInput}
                    onChange={e => setRecoveryInput(e.target.value.toUpperCase())}
                    maxLength={12}
                    autoComplete="off"
                    placeholder="XXXXX-XXXXX"
                    className="w-full bg-reverb-dark border border-gray-800 focus:border-reverb-cyan/50 rounded px-3 py-2 text-white text-sm outline-none placeholder:text-gray-600 tracking-widest text-center"
                  />
                  {error && <p className="text-reverb-pink text-[10px]">{error}</p>}
                  <button
                    onClick={doRecover}
                    disabled={loading || !recoveryInput.trim()}
                    className="w-full py-2.5 bg-reverb-cyan hover:bg-reverb-cyan/85 text-black rounded font-bold uppercase tracking-wider text-[11px] transition disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("account.confirm")}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
