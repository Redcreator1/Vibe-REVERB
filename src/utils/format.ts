/** Shared formatting helpers so amounts/times render consistently across the app. */

/** Always renders as "$50,000" — never "50,000$". */
export function formatUSD(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

/** Real HH:MM clock time, used for any freshly-created message/event. */
export function formatClockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
