import React from "react";
import { C, SANS } from "../theme";

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; tone?: string; border?: string; pad?: number }> = ({
  children,
  style,
  tone = C.card,
  border,
  pad = 32,
}) => (
  <div
    style={{
      background: tone,
      borderRadius: 28,
      padding: pad,
      boxShadow: "0 2px 4px rgb(36 53 47 / 0.05), 0 22px 44px -22px rgb(36 53 47 / 0.30)",
      border: border ? `2px solid ${border}` : `1px solid ${C.line}`,
      fontFamily: SANS,
      color: C.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Small honesty label: what is real, illustrative, simulated or synthetic. */
export const Tag: React.FC<{ children: React.ReactNode; tone?: "real" | "illus" | "synthetic" | "plain" | "dark"; style?: React.CSSProperties }> = ({
  children,
  tone = "plain",
  style,
}) => {
  const t = {
    real: { bg: C.paleSage, fg: C.forest, dot: C.forest },
    illus: { bg: C.sandSoft, fg: C.inkSoft, dot: C.sage },
    synthetic: { bg: C.amberBg, fg: C.amberText, dot: C.amber },
    plain: { bg: "rgba(255,253,248,0.9)", fg: C.inkSoft, dot: C.sage },
    dark: { bg: "rgba(255,255,255,0.08)", fg: C.paleSage, dot: C.amber },
  }[tone];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 20px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontFamily: SANS,
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "0.02em",
        border: `1px solid ${tone === "dark" ? "rgba(255,255,255,0.14)" : C.line}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: t.dot }} />
      {children}
    </div>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.tealText, style }) => (
  <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color, ...style }}>{children}</div>
);
