import { useState, useEffect, Dispatch, SetStateAction } from "react";

/**
 * Generic hook that wraps useState with localStorage persistence.
 * Falls back silently to initialValue on JSON parse errors.
 */
export function usePersistedState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return initialValue;
      return JSON.parse(stored) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage quota exceeded or unavailable — fail silently
    }
  }, [key, state]);

  return [state, setState];
}
