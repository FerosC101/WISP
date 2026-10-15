import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { map } from "../anim";
import { Tag } from "../components/Card";
import { Icon } from "../components/Icons";
import { Blobs, Burst, Cam, Chip, Kinetic, Pop, Slide, sp } from "../components/Motion";
import { Shots } from "../components/Shots";
import { Body } from "../components/Type";
import { Layer, WispLine } from "../components/WispLine";
import { C, SANS, SERIF, s } from "../theme";
import { FaceCircle } from "./S1";

/* a · vague words orbit her */
const WORDS = ["weak", "tired", "not myself", "a bit off", "slower", "no energy"];
const Vague: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={1} />
      <div style={{ position: "absolute", left: 960 - 230, top: 360 }}>
        <FaceCircle size={460} f0={400} />
      </div>
      {WORDS.map((w, i) => {
        const a = (i / WORDS.length) * Math.PI * 2 + f / 90;
        const x = 960 + Math.cos(a) * 620 - 110;
        const y = 600 + Math.sin(a) * 330 - 30;
        return (
          <div key={w} style={{ position: "absolute", left: x, top: y }}>
            <Pop at={8 + i * 7}>
              <Chip size={32} fg={i % 2 ? C.tealText : C.forest} bg={i % 3 === 0 ? C.amberBg : C.card}>
                “{w}”
              </Chip>
            </Pop>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 90 }}>
        <Kinetic text="Hard to put into words." at={6} size={92} align="center" width={1920} accent={["words"]} />
      </div>
    </AbsoluteFill>
  );
};

/* b · mild · unfamiliar · hard to describe */
const PANELS = [
  { t: "Mild.", bg: C.paleSage, fg: C.forest, at: 4 },
  { t: "Unfamiliar.", bg: "#F6E7C8", fg: C.amberText, at: 46 },
  { t: "Hard to describe.", bg: "#DCE8E6", fg: C.tealText, at: 92 },
];
const Three: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ivory, flexDirection: "row" }}>
      {PANELS.map((p) => {
        const k = sp(f, p.at, { damping: 18 });
        return (
          <div key={p.t} style={{ flex: 1, background: p.bg, transform: `translateY(${(1 - k) * 1080}px)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
            <div style={{ fontFamily: SERIF, fontSize: 92, color: p.fg, textAlign: "center", lineHeight: 1.05, opacity: Math.min(1, k * 1.4) }}>{p.t}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* c · asking the right questions */
const QS = ["How long have you felt this way?", "Any other symptoms?", "Any medical history?", "Did it start suddenly?"];
const Questions: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.forest }}>
      <div style={{ position: "absolute", left: 140, top: 200 }}>
        <Kinetic text="Asking the right questions matters." at={0} size={84} color="#F4F1E6" width={760} accent={["right"]} accentColor={C.amber} />
      </div>
      <div style={{ position: "absolute", left: 1000, top: 170, width: 760 }}>
        {QS.map((q, i) => {
          const k = sp(f, 4 + i * 9);
          const done = sp(f, 16 + i * 9);
          return (
            <div key={q} style={{ display: "flex", alignItems: "center", gap: 20, padding: "24px 30px", marginBottom: 18, borderRadius: 24, background: C.card, transform: `translateX(${(1 - k) * 300}px)`, opacity: Math.min(1, k * 1.5), fontFamily: SANS }}>
              <div style={{ width: 40, height: 40, borderRadius: 99, background: done > 0.5 ? C.paleSage : "transparent", border: `3px solid ${C.sageDeep}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <Icon name="check" size={26} draw={done} width={3.6} />
              </div>
              <div style={{ fontSize: 32, fontWeight: 600, color: C.ink }}>{q}</div>
            </div>
          );
        })}
        <Tag tone="dark" style={{ marginTop: 6 }}>Illustration · a typical symptom checklist</Tag>
      </div>
    </AbsoluteFill>
  );
};

/* d · symptoms alone leave uncertainty */
const DEST = [
  { y: 260, label: "Self-care", color: C.tealText },
  { y: 540, label: "Primary care", color: C.forest },
  { y: 820, label: "Urgent care", color: C.redDeep },
];
const Tangle: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs colors={["#F6E7C8", C.paleSage]} seed={3} />
      <div style={{ position: "absolute", left: 120, top: 470 }}>
        <Pop at={0}>
          <Chip size={40} bg={C.forest} fg="#F4F1E6" border={C.forest}>
            <Icon name="chat" size={44} color="#F4F1E6" /> Symptoms only
          </Chip>
        </Pop>
      </div>
      <Layer>
        {DEST.flatMap((d, i) =>
          [0, 1, 2].map((k) => {
            const wob = Math.sin(f / (8 + k * 3) + i * 2 + k) * 90;
            const y2 = DEST[(i + k) % 3].y;
            return (
              <WispLine
                key={`${i}${k}`}
                d={`M 560 540 C 800 ${300 + wob + k * 120}, 1060 ${800 - wob - i * 120}, 1360 ${y2}`}
                progress={map(f, 6 + i * 5 + k * 4, 30 + i * 5 + k * 4)}
                width={k === 0 ? 4 : 2.6}
                dot={false}
                color={k === 0 ? C.sage : C.amber}
                opacity={k === 0 ? 1 : 0.6}
              />
            );
          }),
        )}
      </Layer>
      {DEST.map((d, i) => (
        <div key={d.label} style={{ position: "absolute", left: 1370, top: d.y - 40 }}>
          <Slide at={10 + i * 6} dx={120} dy={0}>
            <Chip size={36} fg={d.color}>
              {d.label}
            </Chip>
          </Slide>
        </div>
      ))}
      {[
        [860, 330],
        [1000, 700],
        [1180, 460],
      ].map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y }}>
          <Pop at={40 + i * 10}>
            <div style={{ width: 70, height: 70, borderRadius: 99, background: C.amberBg, border: `3px solid ${C.amber}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${Math.sin(f / 5 + i) * 10}deg)` }}>
              <Icon name="question" size={42} color={C.amberText} />
            </div>
          </Pop>
        </div>
      ))}
      <div style={{ position: "absolute", left: 120, top: 120 }}>
        <Kinetic text="Symptoms alone can leave uncertainty." at={4} size={70} width={1500} accent={["uncertainty"]} />
      </div>
    </AbsoluteFill>
  );
};

/* e · more evidence, only when it could change the next step */
const Bridge: React.FC = () => {
  const f = useCurrentFrame();
  const L = sp(f, 18, { damping: 18 });
  const R = sp(f, 70, { damping: 18 });
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={5} />
      <Cam dur={s(14)} from={1} to={1.04}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 84 }}>
          <Kinetic text="Symptoms matter." at={2} size={84} align="center" width={1920} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 184 }}>
          <Kinetic text="But sometimes, more evidence helps." at={26} size={84} align="center" width={1920} italic color={C.tealText} accent={["evidence"]} />
        </div>
        <div style={{ position: "absolute", left: 150, top: 380, width: 640, height: 400, borderRadius: 40, background: C.forest, transform: `translateX(${(1 - L) * -900}px)`, padding: 48, boxSizing: "border-box", color: "#F4F1E6" }}>
          <Icon name="chat" size={72} color="#F4F1E6" draw={map(f, 30, 60)} />
          <div style={{ fontFamily: SERIF, fontSize: 64, marginTop: 20 }}>What you feel</div>
          <Body size={30} color="#CFE0CC" style={{ marginTop: 12 }}>
            Symptoms and warning signs, asked one at a time.
          </Body>
        </div>
        <div style={{ position: "absolute", left: 1130, top: 380, width: 640, height: 400, borderRadius: 40, background: C.paleSage, border: `3px solid ${C.sageDeep}`, transform: `translateX(${(1 - R) * 900}px)`, padding: 48, boxSizing: "border-box" }}>
          <Icon name="chair" size={72} color={C.forest} draw={map(f, 80, 110)} />
          <div style={{ fontFamily: SERIF, fontSize: 64, marginTop: 20, color: C.forest }}>How you move</div>
          <Body size={30} color={C.inkSoft} style={{ marginTop: 12 }}>
            A change in physical function, against your own usual.
          </Body>
        </div>
        <Layer>
          <WispLine d="M 790 580 C 900 510, 1020 650, 1130 580" progress={map(f, 120, 160)} width={7} glow />
        </Layer>
        <Burst at={160} x={1130} y={580} color={C.amber} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 850, display: "flex", justifyContent: "center" }}>
          <Pop at={200}>
            <Chip size={34} bg={C.amberBg} fg={C.amberText} border="#EBCF95">
              Only when it could change the next step
            </Chip>
          </Pop>
        </div>
      </Cam>
    </AbsoluteFill>
  );
};

/** Scene 2 — The care-navigation problem (0:20–0:50). */
export const S2: React.FC = () => (
  <Shots
    shots={[
      { sec: 4.7, C: Vague },
      { sec: 4.7, C: Three, t: { kind: "slide", dir: "from-bottom" }, tf: 12 },
      { sec: 2.2, C: Questions, t: { kind: "wipe", dir: "from-right" }, tf: 10 },
      { sec: 4.2, C: Tangle, t: { kind: "slide", dir: "from-right" }, tf: 12 },
      { sec: 14.2, C: Bridge, t: { kind: "iris" }, tf: 18 },
    ]}
  />
);
