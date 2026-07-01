const STORAGE_KEY = "reverb-callsign";

const PREFIXES = ["GHOST", "NEON", "VIPER", "BLAZE", "NOVA", "ROGUE", "CIPHER", "PIXEL"];

function generateCallsign(): string {
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}_${suffix}`;
}

/** Stable per-player callsign, persisted across sessions (unlike a random per-tab id). */
export function getPlayerCallsign(): string {
  if (typeof localStorage === "undefined") return generateCallsign();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const fresh = generateCallsign();
  localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}
