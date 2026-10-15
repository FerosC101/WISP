import React from "react";
import { C, SANS, SERIF } from "../theme";

export const Headline: React.FC<{ children: React.ReactNode; size?: number; color?: string; italic?: boolean; style?: React.CSSProperties }> = ({
  children,
  size = 96,
  color = C.forest,
  italic,
  style,
}) => (
  <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: size, lineHeight: 1.08, color, fontStyle: italic ? "italic" : "normal", letterSpacing: "-0.005em", ...style }}>
    {children}
  </div>
);

export const Body: React.FC<{ children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties }> = ({
  children,
  size = 34,
  color = C.ink,
  weight = 500,
  style,
}) => <div style={{ fontFamily: SANS, fontSize: size, lineHeight: 1.4, color, fontWeight: weight, ...style }}>{children}</div>;
