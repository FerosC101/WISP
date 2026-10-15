import React from "react";
import { C } from "../theme";

// Line icons on a 48×48 grid. `draw` (0→1) draws every stroke in, so icons can write themselves on screen.
const P: Record<string, string[]> = {
  home: ["M8 22 L24 9 L40 22", "M12 19 V39 H36 V19", "M20 39 V28 H28 V39"],
  clinic: ["M9 40 V15 H39 V40", "M5 40 H43", "M24 20 V32", "M18 26 H30", "M15 15 V9 H33 V15"],
  emergency: ["M24 6 A18 18 0 1 1 23.9 6", "M24 14 V34", "M14 24 H34"],
  shield: ["M24 6 L39 12 V23 C39 33 32 39 24 42 C16 39 9 33 9 23 V12 Z", "M17 24 L22 29 L31 19"],
  chat: ["M8 12 H40 V32 H22 L13 39 V32 H8 Z", "M15 20 H33", "M15 26 H27"],
  chair: ["M14 8 V40", "M14 26 H36 V40", "M14 26 V22", "M36 26 V40", "M14 32 H36"],
  waves: ["M10 30 C 16 22, 22 22, 24 24", "M6 24 C 14 12, 28 10, 36 20", "M24 34 A3 3 0 1 1 23.9 34"],
  guide: ["M10 38 L24 8 L38 38 L24 30 Z"],
  reassess: ["M38 24 A14 14 0 1 1 33 13", "M33 6 V14 H41"],
  question: ["M17 18 C17 11 31 10 31 18 C31 24 24 24 24 30", "M24 37 V38"],
  lock: ["M13 22 H35 V40 H13 Z", "M17 22 V15 C17 7 31 7 31 15 V22", "M24 29 V33"],
  cloud: ["M14 36 H35 C42 36 42 25 35 24 C35 15 22 13 19 21 C11 20 9 36 14 36 Z"],
  people: ["M17 20 A6 6 0 1 1 16.9 20", "M6 40 C6 31 28 31 28 40", "M33 18 A5 5 0 1 1 32.9 18", "M30 29 C37 28 43 32 43 38"],
  rules: ["M10 10 H38 V38 H10 Z", "M16 18 H32", "M16 24 H32", "M16 30 H26"],
  audit: ["M12 6 H30 L37 13 V42 H12 Z", "M30 6 V13 H37", "M18 22 H31", "M18 28 H31", "M18 34 H26"],
  phone: ["M15 5 H33 V43 H15 Z", "M21 38 H27"],
  check: ["M10 25 L20 34 L38 14"],
  cross: ["M14 14 L34 34", "M34 14 L14 34"],
  spark: ["M24 6 L27 21 L42 24 L27 27 L24 42 L21 27 L6 24 L21 21 Z"],
  chip: ["M14 14 H34 V34 H14 Z", "M19 8 V14", "M24 8 V14", "M29 8 V14", "M19 34 V40", "M24 34 V40", "M29 34 V40", "M8 19 H14", "M8 29 H14", "M34 19 H40", "M34 29 H40"],
  router: ["M8 30 H40 V38 H8 Z", "M14 30 L12 14", "M34 30 L36 14", "M14 34 H16", "M20 34 H22"],
  baseline: ["M6 18 H42", "M6 32 H42", "M12 14 V22", "M20 14 V22", "M28 14 V22", "M36 14 V22", "M12 28 V36", "M22 28 V36", "M33 28 V36", "M42 28 V36"],
  plug: ["M24 4 V12", "M16 12 H32 V22 C32 30 16 30 16 22 Z", "M24 29 V44"],
  eye: ["M4 24 C12 12 36 12 44 24 C36 36 12 36 4 24 Z", "M24 19 A5 5 0 1 1 23.9 19"],
  heart: ["M24 40 C10 30 6 22 10 15 C14 9 22 10 24 16 C26 10 34 9 38 15 C42 22 38 30 24 40 Z"],
  arrow: ["M8 24 H38", "M30 16 L38 24 L30 32"],
  steth: ["M14 8 V20 C14 28 26 28 26 20 V8", "M20 27 V32 C20 40 36 40 36 32 V28", "M36 22 A3 3 0 1 1 35.9 22"],
  bowl: ["M8 24 H40 C40 33 33 38 24 38 C15 38 8 33 8 24 Z", "M18 16 C18 12 22 12 22 8", "M26 16 C26 12 30 12 30 8"],
  pause: ["M24 6 A18 18 0 1 1 23.9 6", "M19 17 V31", "M29 17 V31"],
};

export type IconName = keyof typeof P;

export const Icon: React.FC<{ name: IconName; size?: number; color?: string; draw?: number; width?: number; style?: React.CSSProperties }> = ({
  name,
  size = 48,
  color = C.forest,
  draw = 1,
  width = 2.6,
  style,
}) => (
  <svg viewBox="0 0 48 48" width={size} height={size} fill="none" style={{ overflow: "visible", ...style }}>
    {P[name].map((d, i) => (
      <path key={i} d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.max(0, Math.min(1, draw))} />
    ))}
  </svg>
);
