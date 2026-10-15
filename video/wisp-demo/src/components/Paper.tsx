import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

/** Warm ivory paper with a fine grain and soft vignette — the base of every scene. */
export const Paper: React.FC<{ tone?: string; dark?: boolean; children?: React.ReactNode }> = ({ tone, dark, children }) => (
  <AbsoluteFill style={{ background: tone ?? (dark ? C.deep : C.ivory) }}>
    {children}
    <Grain opacity={dark ? 0.1 : 0.07} />
  </AbsoluteFill>
);

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <filter id="paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.32  0 0 0 0 0.26  0 0 0 0 0.18  0 0 0 1 0" />
      </filter>
      <rect width="1920" height="1080" filter="url(#paper-grain)" opacity={opacity} />
      <radialGradient id="vig" cx="50%" cy="48%" r="75%">
        <stop offset="62%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#3a2e1e" stopOpacity="0.13" />
      </radialGradient>
      <rect width="1920" height="1080" fill="url(#vig)" />
    </svg>
  </AbsoluteFill>
);
