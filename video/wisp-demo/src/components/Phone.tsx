import React from "react";
import { Img, staticFile } from "remotion";
import { C } from "../theme";

// Real WISP screens captured at 390×844 CSS px, 3× DPR (see capture/capture.spec.ts).
const CSS_W = 390;
const CSS_H = 844;

export type Shot = { src: string; scroll?: number; opacity?: number };

/**
 * A phone showing real app screenshots. Several shots can crossfade (each with its own opacity);
 * `scroll` is in CSS px of the captured page and is used with full-page captures.
 */
export const Phone: React.FC<{ shots: Shot[]; width?: number; tap?: { x: number; y: number; t: number } | null; style?: React.CSSProperties }> = ({
  shots,
  width = 430,
  tap,
  style,
}) => {
  const k = width / CSS_W;
  const h = CSS_H * k;
  const bez = 16;
  return (
    <div
      style={{
        width: width + bez * 2,
        height: h + bez * 2,
        borderRadius: 70,
        background: "linear-gradient(160deg, #3a4a43, #1d2924)",
        padding: bez,
        boxShadow: "0 4px 10px rgb(24 60 49 / 0.18), 0 50px 80px -40px rgb(24 60 49 / 0.55)",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ width, height: h, borderRadius: 56, overflow: "hidden", position: "relative", background: C.ivory }}>
        {shots.map((sh, i) => (
          <Img
            key={sh.src + i}
            src={staticFile(`screens/${sh.src}.png`)}
            style={{ position: "absolute", left: 0, top: -(sh.scroll ?? 0) * k, width, opacity: sh.opacity ?? 1 }}
          />
        ))}
        {tap && tap.t > 0 && tap.t < 1 && (
          <div
            style={{
              position: "absolute",
              left: tap.x * k - 40,
              top: tap.y * k - 40,
              width: 80,
              height: 80,
              borderRadius: 99,
              background: C.amber,
              opacity: 0.45 * (1 - tap.t),
              transform: `scale(${0.4 + tap.t * 0.9})`,
            }}
          />
        )}
      </div>
      <div style={{ position: "absolute", top: bez + 12, left: "50%", marginLeft: -55, width: 110, height: 30, borderRadius: 20, background: "#141c19" }} />
    </div>
  );
};
