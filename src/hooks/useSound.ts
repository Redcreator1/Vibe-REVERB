import { useRef, useCallback, MutableRefObject } from "react";

export type SoundType = "nav" | "success" | "error" | "alert" | "decrypt" | "click" | "message";

function tone(
  ctx: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.08,
  delay = 0
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur + 0.01);
}

function getCtx(ref: MutableRefObject<AudioContext | null>): AudioContext | null {
  if (!ref.current) {
    try {
      ref.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ref.current;
}

export function useSoundSystem() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback((type: SoundType) => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    // Resume if suspended (autoplay policy)
    if (ctx.state === "suspended") ctx.resume();

    switch (type) {
      case "click":
        tone(ctx, 660, 0.06, "square", 0.06);
        break;

      case "nav":
        tone(ctx, 880, 0.07, "square", 0.07);
        tone(ctx, 1100, 0.07, "square", 0.05, 0.08);
        break;

      case "success":
        tone(ctx, 523, 0.1, "sine", 0.09);
        tone(ctx, 659, 0.1, "sine", 0.09, 0.12);
        tone(ctx, 784, 0.18, "sine", 0.1, 0.26);
        tone(ctx, 1047, 0.22, "sine", 0.08, 0.46);
        break;

      case "error":
        tone(ctx, 220, 0.14, "sawtooth", 0.1);
        tone(ctx, 165, 0.18, "sawtooth", 0.09, 0.17);
        break;

      case "alert":
        for (let i = 0; i < 3; i++) {
          tone(ctx, 1200, 0.07, "square", 0.1, i * 0.12);
          tone(ctx, 800, 0.07, "square", 0.08, i * 0.12 + 0.08);
        }
        break;

      case "decrypt": {
        // Glitchy random noise then resolution
        for (let i = 0; i < 8; i++) {
          tone(ctx, 150 + Math.random() * 900, 0.04, "square", 0.05, i * 0.05);
        }
        tone(ctx, 1760, 0.3, "sine", 0.09, 0.5);
        tone(ctx, 880, 0.3, "sine", 0.07, 0.55);
        break;
      }

      case "message":
        tone(ctx, 587, 0.07, "sine", 0.07);
        tone(ctx, 880, 0.09, "sine", 0.06, 0.1);
        break;
    }
  }, []);

  return play;
}
