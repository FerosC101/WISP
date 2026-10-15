import { Easing, interpolate } from "remotion";

export const soft = Easing.bezier(0.25, 0.8, 0.3, 1);
export const inOut = Easing.bezier(0.45, 0, 0.55, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 over [start, start+dur] frames with the brand's soft ease. */
export const prog = (f: number, start: number, dur = 18, ease = soft) =>
  interpolate(f, [start, start + dur], [0, 1], { ...clamp, easing: ease });

/** Linear map with clamping. */
export const map = (f: number, a: number, b: number, from = 0, to = 1, ease?: (t: number) => number) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: ease });

/** Fade + lift in at `start`, optional fade out at `end`. */
export const enter = (f: number, start: number, end?: number, dy = 26, dur = 18) => {
  const i = prog(f, start, dur);
  const o = end === undefined ? 1 : 1 - prog(f, end, 14, inOut);
  return { opacity: i * o, transform: `translateY(${(1 - i) * dy}px)` } as const;
};

/** Natural blink: closed for ~4 frames at a few irregular points in each 4.3 s cycle. */
export const blink = (f: number, seed = 0) => {
  const t = (f + seed * 37) % 130;
  return (t > 62 && t < 66) || (t > 120 && t < 124 && (f + seed) % 260 > 130);
};

export const breathe = (f: number, amp = 1, period = 120) => Math.sin((f / period) * Math.PI * 2) * amp;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
