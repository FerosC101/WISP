import React from "react";
import { evolvePath } from "@remotion/paths";
import { C, SERIF } from "../theme";

const ARC = "M6 46 C 70 14, 150 4, 236 18";

/**
 * The WISP wordmark: lowercase serif "wisp" with the WISP Line arcing over it,
 * a small leaf on the line and the amber point. Native SVG, so it stays crisp at any size.
 */
export const Wordmark: React.FC<{ size?: number; color?: string; lineColor?: string; draw?: number; textIn?: number }> = ({
  size = 200,
  color = C.forest,
  lineColor = C.sage,
  draw = 1,
  textIn = 1,
}) => {
  const { strokeDasharray, strokeDashoffset } = evolvePath(Math.min(1, draw), ARC);
  const leaf = Math.max(0, Math.min(1, (draw - 0.55) / 0.35));
  const pt = Math.max(0, Math.min(1, (draw - 0.85) / 0.15));
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
      <svg viewBox="0 0 260 56" width={size * 1.36} height={size * 0.29} style={{ overflow: "visible", marginBottom: -size * 0.1, marginLeft: size * 0.02 }}>
        <path d={ARC} stroke={lineColor} strokeWidth={6} strokeLinecap="round" fill="none" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
        <g transform={`translate(118 13) rotate(-28) scale(${leaf})`}>
          <path d="M0 0 C 6 -14, 22 -18, 30 -16 C 26 -6, 14 2, 0 0 Z" fill={lineColor} />
          <path d="M2 -1 C 10 -7, 18 -11, 26 -14" stroke={C.ivory} strokeOpacity={0.55} strokeWidth={1.2} fill="none" />
        </g>
        <circle cx={248} cy={20} r={9 * pt} fill={C.amber} />
      </svg>
      <span
        style={{
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: size,
          letterSpacing: "0.01em",
          color,
          opacity: textIn,
          transform: `translateY(${(1 - textIn) * size * 0.08}px)`,
        }}
      >
        wisp
      </span>
    </div>
  );
};
