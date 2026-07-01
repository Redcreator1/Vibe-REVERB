import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cpu, ChevronRight } from "lucide-react";

const BOOT_LINES = [
  { delay: 200,  text: "REVERB OS v3.0 — INITIALISATION SYSTÈME...",             color: "text-reverb-cyan" },
  { delay: 700,  text: "[SCAN] Détection réseau Vice City Leonida...",            color: "text-gray-400" },
  { delay: 1200, text: "[OK] Protocole de chiffrement REVERB activé",             color: "text-emerald-400" },
  { delay: 1700, text: "[OK] Empire cryptographique chargé — 4 entreprises",      color: "text-emerald-400" },
  { delay: 2200, text: "[VCPD] Niveau d'alerte actuel : 2/5 — Zone contrôlée",   color: "text-amber-400" },
  { delay: 2700, text: "[OK] ChatREVERB — réseau opérateurs en attente",          color: "text-reverb-cyan" },
  { delay: 3300, text: "ACCÈS AUTORISÉ — BIENVENUE CHEF.",                        color: "text-reverb-pink" },
];

const STORAGE_KEY = "reverb-visited-v3";

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [showEnter, setShowEnter] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Reveal boot lines one by one
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines(prev => [...prev, i]), line.delay)
    );

    // Progress bar fills over 3s
    const barTimer = setTimeout(() => setBarWidth(100), 100);

    // Show enter button after last line
    const enterTimer = setTimeout(() => setShowEnter(true), 3800);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(barTimer);
      clearTimeout(enterTimer);
    };
  }, []);

  const handleEnter = () => {
    setExiting(true);
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(onEnter, 600);
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-reverb-dark flex flex-col items-center justify-center p-6 crt-grid"
        >
          {/* Corner decorations */}
          <div className="absolute top-4 left-4 text-[9px] font-mono text-reverb-cyan/30 select-none">
            [REVERB_CORE_OK] [DECRYPTED_LINK] [ALERT_LVL_2]
          </div>
          <div className="absolute top-4 right-4 text-[9px] font-mono text-gray-700 select-none">
            SYS::{Math.floor(Date.now() / 1000)}
          </div>

          <div className="w-full max-w-lg space-y-8">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="text-center space-y-2"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-reverb-pink/40 bg-reverb-pink/10 shadow-glow-pink mb-4">
                <Cpu className="w-8 h-8 text-reverb-pink animate-pulse" />
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-widest">
                <span className="text-white">SYSTÈME</span>{" "}
                <span className="text-reverb-pink drop-shadow-[0_0_16px_rgba(255,42,116,0.9)]">REVERB</span>
              </h1>
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em]">
                Console inversive de sécurité — Vice City Leonida
              </p>
            </motion.div>

            {/* Loading bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-reverb-card border border-reverb-cyan/20 h-2 rounded overflow-hidden">
                <motion.div
                  className="h-full bg-reverb-cyan shadow-glow-cyan"
                  initial={{ width: "0%" }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9px] text-gray-600">
                <span>BOOT SEQUENCE</span>
                <motion.span
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                >
                  {barWidth === 100 ? "100%" : "..."}
                </motion.span>
              </div>
            </div>

            {/* Boot terminal */}
            <div className="bg-reverb-card border border-gray-800 rounded-lg p-4 font-mono text-[11px] space-y-1.5 min-h-[160px]">
              {BOOT_LINES.map((line, i) => (
                <AnimatePresence key={i}>
                  {visibleLines.includes(i) && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-start gap-2 ${line.color}`}
                    >
                      <span className="text-gray-700 shrink-0 mt-px">›</span>
                      <span>{line.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
              {/* Blinking cursor */}
              {!showEnter && (
                <span className="inline-block w-2 h-3.5 bg-reverb-cyan animate-pulse ml-4" />
              )}
            </div>

            {/* Enter button */}
            <AnimatePresence>
              {showEnter && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="flex justify-center"
                >
                  <button
                    onClick={handleEnter}
                    className="group relative px-8 py-3.5 bg-reverb-pink hover:bg-reverb-pink/90 text-white font-display font-extrabold text-sm tracking-widest uppercase rounded shadow-glow-pink transition-all flex items-center gap-2"
                  >
                    <span>ENTRER DANS LE SYSTÈME</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    {/* Scan line effect on hover */}
                    <span className="absolute inset-0 rounded overflow-hidden pointer-events-none">
                      <span className="absolute inset-x-0 top-0 h-px bg-white/20 animate-pulse" />
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom tagline */}
            <p className="text-center font-mono text-[9px] text-gray-700 tracking-widest">
              GTA 6 · VICE CITY · COMPANION IMMERSIF · © REVERB SYSTEM INC.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Returns true if this is the user's first visit */
export function isFirstVisit(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}
