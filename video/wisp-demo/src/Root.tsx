import React from "react";
import { AbsoluteFill, Composition, continueRender, delayRender } from "remotion";
import { fontsReady } from "./fonts";
import { Paper } from "./components/Paper";
import { Soundtrack } from "./components/Soundtrack";
import { Shots, type Tr } from "./components/Shots";
import { C, FPS, H, W, s } from "./theme";
import { S1 } from "./scenes/S1";
import { S2 } from "./scenes/S2";
import { S3 } from "./scenes/S3";
import { S4 } from "./scenes/S4";
import { S5 } from "./scenes/S5";
import { S6 } from "./scenes/S6";
import { S7 } from "./scenes/S7";
import { S8 } from "./scenes/S8";
import { S9 } from "./scenes/S9";
import { SenseTurntable } from "./scenes/SenseTurntable";

const handle = delayRender("fonts");
fontsReady.then(() => continueRender(handle));

/** Scene timings (seconds) — they sum to exactly 300 s. `t` is the transition into the scene. */
export const SCENES: { id: string; sec: number; C: React.FC; t?: Tr; tf?: number }[] = [
  { id: "S1", sec: 20, C: S1 },
  { id: "S2", sec: 30, C: S2, t: { kind: "zoom" }, tf: 14 },
  { id: "S3", sec: 30, C: S3, t: { kind: "blob", color: C.deep, x: 1920, y: 1080 }, tf: 24 },
  { id: "S4", sec: 85, C: S4, t: { kind: "line", color: C.amber }, tf: 22 },
  { id: "S5", sec: 35, C: S5, t: { kind: "blob", color: C.red, x: 0, y: 0 }, tf: 22 },
  { id: "S6", sec: 40, C: S6, t: { kind: "clock" }, tf: 18 },
  { id: "S7", sec: 20, C: S7, t: { kind: "slide", dir: "from-bottom" }, tf: 16 },
  { id: "S8", sec: 20, C: S8, t: { kind: "wipe", dir: "from-left" }, tf: 16 },
  { id: "S9", sec: 20, C: S9, t: { kind: "line", color: C.sage }, tf: 22 },
];

export const WispDemo: React.FC = () => (
  <Paper>
    <Shots shots={SCENES} />
    <Soundtrack />
  </Paper>
);

export const Root: React.FC = () => (
  <>
    <Composition id="SenseTurntable" component={SenseTurntable} durationInFrames={30} fps={FPS} width={W} height={H} />
    <Composition id="WispDemo" component={WispDemo} durationInFrames={9000} fps={FPS} width={W} height={H} />
    {SCENES.map((sc) => (
      <Composition
        key={sc.id}
        id={sc.id}
        component={() => (
          <AbsoluteFill style={{ background: C.ivory }}>
            <sc.C />
          </AbsoluteFill>
        )}
        durationInFrames={s(sc.sec)}
        fps={FPS}
        width={W}
        height={H}
      />
    ))}
  </>
);
