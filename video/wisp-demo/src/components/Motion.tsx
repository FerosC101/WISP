import React from "react";
import { AbsoluteFill, spring, useCurrentFrame } from "remotion";
import { C, SANS, SERIF } from "../theme";

/* ------------------------------------------------------------------------------------------------
 * Motion-graphics toolkit: springs, kinetic type, brand blobs, bursts, floating 3D cards.
 * Everything is a pure function of the frame.
 * ---------------------------------------------------------------------------------------------- */

/** Brand spring: quick, soft overshoot. 0 before `start`, settles to 1. */
export const sp = (f: number, start: number, cfg: Partial<{ damping: number; stiffness: number; mass: number }> = {}) =>
  spring({ frame: f - start, fps: 30, config: { damping: 14, stiffness: 150, mass: 0.7, ...cfg } });

/** Pops a child in with a springy scale. */
export const Pop: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; from?: number; out?: number }> = ({ at, children, style, from = 0.4, out }) => {
  const f = useCurrentFrame();
  const s = sp(f, at);
  const o = out === undefined ? 1 : 1 - sp(f, out, { damping: 20 });
  return <div style={{ transform: `scale(${(from + (1 - from) * s) * (0.85 + 0.15 * o)})`, opacity: Math.min(1, s * 1.6) * o, ...style }}>{children}</div>;
};

/** Slides a child in from a direction with a spring. */
export const Slide: React.FC<{ at: number; dx?: number; dy?: number; children: React.ReactNode; style?: React.CSSProperties; out?: number; rot?: number }> = ({
  at,
  dx = 0,
  dy = 60,
  children,
  style,
  out,
  rot = 0,
}) => {
  const f = useCurrentFrame();
  const s = sp(f, at);
  const o = out === undefined ? 0 : sp(f, out, { damping: 20 });
  return (
    <div
      style={{
        transform: `translate(${dx * (1 - s) - dx * o}px, ${dy * (1 - s) - dy * 0.5 * o}px) rotate(${rot * (1 - s)}deg)`,
        opacity: Math.min(1, s * 1.5) * (1 - o),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Kinetic type: each word rises out of a mask with a staggered spring.
 * `accent` words are coloured and get a hand-drawn marker swash underneath.
 */
export const Kinetic: React.FC<{
  text: string;
  at: number;
  size?: number;
  color?: string;
  accent?: string[];
  accentColor?: string;
  marker?: string;
  serif?: boolean;
  italic?: boolean;
  weight?: number;
  stagger?: number;
  align?: "left" | "center" | "right";
  width?: number;
  out?: number;
  lineHeight?: number;
  upper?: boolean;
}> = ({
  text,
  at,
  size = 96,
  color = C.forest,
  accent = [],
  accentColor = C.amberText,
  marker = C.amber,
  serif = true,
  italic,
  weight,
  stagger = 3,
  align = "left",
  width,
  out,
  lineHeight = 1.12,
  upper,
}) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  const o = out === undefined ? 0 : sp(f, out, { damping: 22 });
  return (
    <div
      style={{
        fontFamily: serif ? SERIF : SANS,
        fontSize: size,
        fontWeight: weight ?? (serif ? 500 : 750),
        fontStyle: italic ? "italic" : "normal",
        lineHeight,
        color,
        textAlign: align,
        width,
        letterSpacing: upper ? "0.04em" : serif ? "-0.01em" : "-0.02em",
        textTransform: upper ? "uppercase" : "none",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        columnGap: size * 0.26,
      }}
    >
      {words.map((w, i) => {
        const s = sp(f, at + i * stagger, { damping: 16, stiffness: 170 });
        const clean = w.replace(/[.,!?“”"’:]/g, "");
        const isAccent = accent.includes(clean);
        const m = sp(f, at + i * stagger + 8, { damping: 30, stiffness: 90 });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12, marginBottom: -size * 0.12, position: "relative" }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - s) * 105 + o * -105}%)`,
                color: isAccent ? accentColor : color,
                position: "relative",
              }}
            >
              {isAccent && (
                <svg
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                  style={{ position: "absolute", left: "-4%", bottom: size * 0.02, width: "108%", height: size * 0.3, zIndex: -1, overflow: "visible" }}
                >
                  <path d="M2 14 C 30 8, 60 18, 98 9" stroke={marker} strokeOpacity={0.55} strokeWidth={9} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - m} />
                </svg>
              )}
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Drifting organic colour blobs — the living background of the ad. */
export const Blobs: React.FC<{ colors?: string[]; speed?: number; opacity?: number; seed?: number }> = ({ colors = [C.paleSage, "#F3E3C4", "#DCE8E6"], speed = 1, opacity = 1, seed = 0 }) => {
  const f = useCurrentFrame();
  const t = (f / 30) * speed;
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity }}>
      {colors.map((c, i) => {
        const k = i + seed;
        const x = 50 + 34 * Math.sin(t * 0.21 + k * 2.1);
        const y = 50 + 30 * Math.cos(t * 0.17 + k * 1.3);
        const r = 46 + 10 * Math.sin(t * 0.3 + k);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x - r}%`,
              top: `${y - r}%`,
              width: `${r * 2}%`,
              height: `${r * 2 * 1.78}%`,
              borderRadius: "50%",
              background: `radial-gradient(closest-side, ${c}, ${c}00)`,
              transform: `scale(1, 0.56)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Concentric rings bursting out from a point. */
export const Burst: React.FC<{ at: number; x: number; y: number; color?: string; size?: number; rings?: number }> = ({ at, x, y, color = C.amber, size = 260, rings = 3 }) => {
  const f = useCurrentFrame();
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {Array.from({ length: rings }).map((_, i) => {
        const p = Math.max(0, Math.min(1, (f - at - i * 5) / 26));
        if (p <= 0 || p >= 1) return null;
        const e = 1 - Math.pow(1 - p, 3);
        return <circle key={i} cx={x} cy={y} r={20 + e * size} fill="none" stroke={color} strokeWidth={6 * (1 - p) + 1} opacity={1 - p} />;
      })}
    </svg>
  );
};

/** Gentle 3D float: a perspective tilt that breathes. */
export const Float3D: React.FC<{ children: React.ReactNode; rx?: number; ry?: number; amp?: number; at?: number; style?: React.CSSProperties }> = ({ children, rx = 6, ry = -16, amp = 1, at = 0, style }) => {
  const f = useCurrentFrame();
  const s = sp(f, at, { damping: 18, stiffness: 90 });
  const t = f / 30;
  return (
    <div style={{ perspective: 1800, ...style }}>
      <div
        style={{
          transform: `translateY(${(1 - s) * 160 + Math.sin(t * 1.3) * 10 * amp}px) rotateX(${rx + Math.sin(t * 0.9) * 1.5 * amp}deg) rotateY(${ry * (0.6 + 0.4 * s) + Math.cos(t * 0.7) * 2.5 * amp}deg) rotateZ(${(1 - s) * -6}deg)`,
          opacity: Math.min(1, s * 1.5),
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Pill / chip with icon slot. */
export const Chip: React.FC<{ children: React.ReactNode; bg?: string; fg?: string; border?: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  bg = C.card,
  fg = C.forest,
  border = C.line,
  size = 30,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: `${size * 0.42}px ${size * 0.85}px`,
      borderRadius: 999,
      background: bg,
      color: fg,
      border: `2px solid ${border}`,
      fontFamily: SANS,
      fontSize: size,
      fontWeight: 650,
      whiteSpace: "nowrap",
      boxShadow: "0 14px 30px -18px rgb(36 53 47 / .45)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Slow continuous camera drift for a whole shot (Ken Burns with intent). */
export const Cam: React.FC<{ children: React.ReactNode; from?: number; to?: number; dur: number; x?: number; y?: number; origin?: string }> = ({ children, from = 1, to = 1.06, dur, x = 0, y = 0, origin = "50% 50%" }) => {
  const f = useCurrentFrame();
  const p = Math.min(1, f / dur);
  const e = p * p * (3 - 2 * p);
  return <AbsoluteFill style={{ transform: `translate(${x * e}px, ${y * e}px) scale(${from + (to - from) * e})`, transformOrigin: origin }}>{children}</AbsoluteFill>;
};

/** A big full-bleed colour card for ad-style statement beats. */
export const Statement: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center" }}>{children}</AbsoluteFill>
);

/** Floating dust motes in sunlight: deterministic, slow, twinkling. */
export const Dust: React.FC<{ n?: number; color?: string; area?: [number, number, number, number] }> = ({ n = 40, color = "#FFF6DD", area = [900, 80, 1900, 900] }) => {
  const f = useCurrentFrame();
  const [x0, y0, x1, y1] = area;
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: n }).map((_, i) => {
        const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const r2 = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
        const x = x0 + r1 * (x1 - x0) + Math.sin(f / 50 + i) * 14;
        const y = y1 - (((r2 * (y1 - y0) + f * (0.4 + r1 * 0.6)) % (y1 - y0)));
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(f / 22 + i * 1.7));
        return <circle key={i} cx={x} cy={y} r={1.5 + r2 * 3} fill={color} opacity={0.75 * tw} />;
      })}
    </svg>
  );
};

/** Soft animated light shafts from a window. */
export const Rays: React.FC<{ x?: number; y?: number; opacity?: number }> = ({ x = 1450, y = 170, opacity = 1 }) => {
  const f = useCurrentFrame();
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", opacity }}>
      <defs>
        <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF1CC" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FFF1CC" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => {
        const w = 70 + i * 30;
        const sway = Math.sin(f / 60 + i) * 18;
        const ox = x - 220 + i * 150;
        return <path key={i} d={`M${ox} ${y} L${ox + w} ${y} L${ox - 520 + sway + w} 1080 L${ox - 700 + sway} 1080 Z`} fill="url(#ray)" opacity={0.18 + 0.1 * Math.sin(f / 40 + i * 2)} />;
      })}
    </svg>
  );
};
