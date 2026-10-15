import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import React from "react";
import { C } from "../theme";

/**
 * THE WISP LINE — a thin organic line that guides the eye from symptom to next step.
 * `progress` draws it in (0→1). The amber point rides the drawing tip.
 */
export const WispLine: React.FC<{
  d: string;
  progress: number;
  color?: string;
  width?: number;
  dot?: boolean;
  dotColor?: string;
  opacity?: number;
  glow?: boolean;
}> = ({ d, progress, color = C.sage, width = 4, dot = true, dotColor = C.amber, opacity = 1, glow }) => {
  const p = Math.max(0, Math.min(1, progress));
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
  const len = getLength(d);
  const tip = getPointAtLength(d, Math.max(0.001, p * len));
  return (
    <g opacity={opacity}>
      {glow && <path d={d} stroke={color} strokeWidth={width * 4} strokeOpacity={0.12} fill="none" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />}
      <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      {dot && tip && p > 0.01 && <circle cx={tip.x} cy={tip.y} r={width * 2.3} fill={dotColor} />}
    </g>
  );
};

/** Full-frame SVG layer for drawing lines in 1920×1080 space. */
export const Layer: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);
