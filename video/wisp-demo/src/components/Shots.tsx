import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { TransitionSeries, linearTiming, type TransitionPresentation, type TransitionPresentationComponentProps } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { iris } from "@remotion/transitions/iris";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { getLength } from "@remotion/paths";
import { inOut } from "../anim";
import { C, H, W } from "../theme";

/* ---------- brand presentations ---------- */

type BlobProps = { color: string; fromX: number; fromY: number };
/** A brand-colour blob grows from a corner to cover the frame, then pulls away to reveal the next shot. */
const BlobWipe: React.FC<TransitionPresentationComponentProps<BlobProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = inOut(presentationProgress);
  const R = Math.hypot(W, H) * 1.05;
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const covering = p < 0.5;
  const k = covering ? p / 0.5 : (p - 0.5) / 0.5;
  const cx = covering ? passedProps.fromX : W - passedProps.fromX;
  const cy = covering ? passedProps.fromY : H - passedProps.fromY;
  const r = covering ? k * R : (1 - k) * R;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: covering ? 0 : 1 }}>{children}</AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill={passedProps.color} />
        <circle cx={cx} cy={cy} r={Math.max(0, r - 26)} fill="none" stroke={C.amber} strokeOpacity={0.35} strokeWidth={4} />
      </svg>
    </AbsoluteFill>
  );
};
export const blobWipe = (props: BlobProps): TransitionPresentation<BlobProps> => ({ component: BlobWipe, props });

type ZoomProps = Record<string, never>;
/** Zoom-through: the outgoing shot rushes toward the camera as the next settles in from slightly behind. */
const ZoomThrough: React.FC<TransitionPresentationComponentProps<ZoomProps>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = inOut(presentationProgress);
  const style: React.CSSProperties =
    presentationDirection === "exiting"
      ? { transform: `scale(${1 + p * 0.35})`, opacity: 1 - p, filter: `blur(${p * 6}px)` }
      : { transform: `scale(${0.88 + p * 0.12})`, opacity: p };
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};
export const zoomThrough = (): TransitionPresentation<ZoomProps> => ({ component: ZoomThrough, props: {} as ZoomProps });

const SWEEP = "M -160 620 C 300 520, 640 700, 980 580 S 1640 460, 2100 560";
const SWEEP_LEN = getLength(SWEEP);
type LineProps = { color: string };
/** The WISP Line sweeps across while the picture dips through ivory. */
const LineSweep: React.FC<TransitionPresentationComponentProps<LineProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") return <AbsoluteFill style={{ opacity: interpolate(p, [0, 0.5], [1, 0], { extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>;
  const head = interpolate(p, [0, 0.65], [0, 1], { extrapolateRight: "clamp", easing: inOut });
  const tail = interpolate(p, [0.35, 1], [0, 1], { extrapolateLeft: "clamp", easing: inOut });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: C.ivory, opacity: interpolate(p, [0.3, 0.5, 0.7], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      <AbsoluteFill style={{ opacity: interpolate(p, [0.5, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={SWEEP} stroke={passedProps.color} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${Math.max(0.01, (head - tail) * SWEEP_LEN)} ${SWEEP_LEN * 2}`} strokeDashoffset={-tail * SWEEP_LEN} />
      </svg>
    </AbsoluteFill>
  );
};
export const lineSweep = (color: string = C.sage): TransitionPresentation<LineProps> => ({ component: LineSweep, props: { color } });

/* ---------- shot list ---------- */

export type Tr =
  | { kind: "slide"; dir?: "from-left" | "from-right" | "from-top" | "from-bottom" }
  | { kind: "wipe"; dir?: "from-left" | "from-right" | "from-top-left" | "from-bottom-right" }
  | { kind: "iris" }
  | { kind: "clock" }
  | { kind: "blob"; color: string; x?: number; y?: number }
  | { kind: "zoom" }
  | { kind: "line"; color?: string };

const present = (t: Tr): TransitionPresentation<any> => {
  switch (t.kind) {
    case "slide":
      return slide({ direction: t.dir ?? "from-right" });
    case "wipe":
      return wipe({ direction: t.dir ?? "from-left" });
    case "iris":
      return iris({ width: W, height: H });
    case "clock":
      return clockWipe({ width: W, height: H });
    case "blob":
      return blobWipe({ color: t.color, fromX: t.x ?? 0, fromY: t.y ?? H });
    case "zoom":
      return zoomThrough();
    case "line":
      return lineSweep(t.color);
  }
};

export type Shot = { sec: number; C: React.FC; t?: Tr; tf?: number };

/**
 * A run of shots. Shot i starts exactly at the sum of the previous `sec` values (so narration stays in sync);
 * the transition that follows a shot overlaps the start of the next one by `tf` frames.
 */
export const Shots: React.FC<{ shots: Shot[] }> = ({ shots }) => (
  <TransitionSeries>
    {shots.flatMap((sh, i) => {
      const nominal = Math.round(sh.sec * 30);
      const next = shots[i + 1];
      // The last shot runs 1 s long so an enclosing transition never overlaps an empty frame (the parent trims it).
      const tf = next ? (next.t ? next.tf ?? 18 : 0) : 30;
      const items = [];
      if (i > 0 && sh.t) items.push(<TransitionSeries.Transition key={`t${i}`} presentation={present(sh.t)} timing={linearTiming({ durationInFrames: sh.tf ?? 18 })} />);
      items.push(
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={nominal + tf}>
          <sh.C />
        </TransitionSeries.Sequence>,
      );
      return items;
    })}
  </TransitionSeries>
);
