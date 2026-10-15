import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { inOut, map } from "../anim";
import { Seated, type Expr, type Pose } from "../components/Characters";
import { Icon, type IconName } from "../components/Icons";
import { Blobs, Burst, Cam, Chip, Dust, Kinetic, Pop, Rays, Slide, sp } from "../components/Motion";
import { LivingRoom } from "../components/Rooms";
import { Shots } from "../components/Shots";
import { Layer, WispLine } from "../components/WispLine";
import { C, SANS, s } from "../theme";

/** Mdm Tan's face in a springy circle — the ad's recurring close-up. */
export const FaceCircle: React.FC<{ at?: number; size?: number; bg?: string; expr?: Expr; f0?: number; pose?: Pose; who?: "tan" | "lim" | "siti" | "daughter"; tilt?: number; look?: number }> = ({
  at = 0,
  size = 640,
  bg = C.paleSage,
  expr = "concern",
  f0 = 0,
  pose = "chin",
  who = "tan",
  tilt = -3,
  look = -0.3,
}) => {
  const f = useCurrentFrame();
  const k = sp(f, at, { damping: 15, stiffness: 120 });
  const w = size * 1.75;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: bg, transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 1.5), boxShadow: "0 40px 80px -40px rgb(24 60 49 / .45)" }}>
      <div style={{ marginLeft: size / 2 - (200 * w) / 400, marginTop: size * 0.5 - (124 * w) / 400 + size * 0.12 }}>
        <Seated who={who} f={f + f0} expr={expr} pose={pose} legs={false} width={w} tilt={tilt} look={look} seed={1} />
      </div>
    </div>
  );
};

/* a · the room, a cinematic open */
const Open: React.FC = () => {
  const f = useCurrentFrame();
  const lean = map(f, 70, 116, 0, 1, inOut) * (1 - map(f, 150, 196, 0, 1, inOut));
  const bars = 1 - sp(f, 10, { damping: 26, stiffness: 28, mass: 1 });
  return (
    <AbsoluteFill>
      <Cam dur={s(7)} from={1.0} to={1.12} x={-40} origin="62% 45%">
        <LivingRoom cx={1180} cam={{ x: -200, y: 60, z: 1.5 }}>
          <div style={{ position: "absolute", left: 980, top: 300 }}>
            <Seated who="tan" f={f} expr="concern" pose={lean > 0.01 ? "knees" : "lap"} lean={lean} tilt={-3} look={-0.4} seed={1} />
          </div>
        </LivingRoom>
        <Rays />
        <Dust />
      </Cam>
      {/* letterbox opens like a film */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 540 * bars, background: C.deep }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 540 * bars, background: C.deep }} />
      <div style={{ position: "absolute", left: 96, top: 96 }}>
        <Slide at={30} dx={-40} dy={0}>
          <Chip size={26} fg={C.inkSoft}>A weekday morning, at home</Chip>
        </Slide>
      </div>
    </AbsoluteFill>
  );
};

/* b · "I feel weak." */
const Weak: React.FC = () => (
  <AbsoluteFill style={{ background: C.ivory }}>
    <Blobs />
    <div style={{ position: "absolute", right: 120, top: 220 }}>
      <FaceCircle at={0} f0={210} />
    </div>
    <div style={{ position: "absolute", left: 130, top: 330 }}>
      <Kinetic text="“I feel weak.”" at={2} size={176} accent={["weak"]} />
    </div>
  </AbsoluteFill>
);

/* c · "Something feels different." */
const Different: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#F6EBD5" }}>
      <Layer>
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M -50 ${380 + i * 80} C 400 ${300 + i * 80 + Math.sin(f / 7 + i) * 40}, 900 ${460 + i * 80 - Math.sin(f / 9 + i) * 50}, 1970 ${360 + i * 80}`}
            stroke={i === 2 ? C.amber : C.sage}
            strokeWidth={i === 2 ? 6 : 3}
            fill="none"
            opacity={0.55}
          />
        ))}
      </Layer>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Kinetic text="Something feels different." at={1} size={140} align="center" width={1600} accent={["different"]} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* d · "…but you can't quite explain why." */
const Why: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.deep }}>
      <Layer>
        <path
          d="M 300 760 C 500 600, 640 900, 820 700 S 1100 560, 980 760 S 1300 900, 1460 640 S 1640 760, 1700 700"
          stroke={C.sage}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - Math.min(1, f / 50)}
          opacity={0.6}
        />
      </Layer>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}>
        <Kinetic text="But you can’t quite explain why." at={1} size={118} align="center" width={1700} color="#F4F1E6" accent={["why"]} accentColor={C.amber} marker={C.amber} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 1680, top: 600 }}>
        <Pop at={34}>
          <div style={{ width: 120, height: 120, borderRadius: 99, background: C.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="question" size={76} color={C.deep} width={3.4} />
          </div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* e · three destinations, no answer yet */
const DEST: { icon: IconName; label: string; sub: string; at: number; color: string; x: number; rot: number }[] = [
  { icon: "home", label: "Wait at home?", sub: "Rest and see", at: 26, color: C.forest, x: 170, rot: -8 },
  { icon: "clinic", label: "See a doctor?", sub: "GP or polyclinic", at: 56, color: C.forest, x: 730, rot: 2 },
  { icon: "emergency", label: "Urgent help?", sub: "A&E or 995", at: 92, color: C.red, x: 1290, rot: 7 },
];
const Choices: React.FC = () => {
  const f = useCurrentFrame();
  const sway = map(f, s(4.4), s(5.2));
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={2} />
      <Cam dur={s(7.5)} from={1} to={1.07}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 110 }}>
          <Kinetic text="What should I do next?" at={4} size={92} align="center" width={1920} italic />
        </div>
        <Layer>
          {DEST.map((d) => (
            <WispLine key={d.label} d={`M 960 330 C 960 400, ${d.x + 230} 380, ${d.x + 230} 470`} progress={Math.min(1, Math.max(0, (f - d.at + 10) / 18))} width={4} dot={false} color={d.color === C.red ? "#D49A90" : C.sage} />
          ))}
        </Layer>
        <div style={{ position: "absolute", left: 960 - 46, top: 284 }}>
          <Pop at={14}>
            <div style={{ width: 92, height: 92, borderRadius: 99, background: C.amberBg, border: `3px solid ${C.amber}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.06 * Math.sin(f / 6)})` }}>
              <Icon name="question" size={56} color={C.amberText} />
            </div>
          </Pop>
        </div>
        {DEST.map((d, i) => {
          const k = sp(f, d.at);
          const wob = sway * Math.sin(f / 7 + i * 2) * 4;
          return (
            <div
              key={d.label}
              style={{
                position: "absolute",
                left: d.x,
                top: 470,
                width: 460,
                padding: "40px 36px",
                borderRadius: 34,
                background: C.card,
                border: `3px solid ${d.color === C.red ? "#E2B3AB" : C.sageDeep}`,
                boxShadow: "0 40px 70px -40px rgb(24 60 49 / .55)",
                transform: `translateY(${(1 - k) * 220}px) rotate(${d.rot * (1 - k) + wob}deg) scale(${0.8 + 0.2 * k})`,
                opacity: Math.min(1, k * 1.6),
                fontFamily: SANS,
              }}
            >
              <div style={{ width: 96, height: 96, borderRadius: 28, background: d.color === C.red ? C.redBg : C.paleSage, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={d.icon} size={60} color={d.color} draw={Math.min(1, (f - d.at) / 24)} />
              </div>
              <div style={{ fontFamily: "Lora, serif", fontSize: 46, fontWeight: 500, whiteSpace: "nowrap", color: d.color === C.red ? C.redDeep : C.forest, marginTop: 26 }}>{d.label}</div>
              <div style={{ fontSize: 28, color: C.inkSoft, fontWeight: 600, marginTop: 6 }}>{d.sub}</div>
            </div>
          );
        })}
        {DEST.map((d) => (
          <Burst key={d.label} at={d.at + 4} x={d.x + 230} y={600} color={d.color === C.red ? "#E2B3AB" : C.sage} size={240} />
        ))}
      </Cam>
    </AbsoluteFill>
  );
};

/** Scene 1 — The uncertain moment (0:00–0:20). */
export const S1: React.FC = () => (
  <Shots
    shots={[
      { sec: 7.0, C: Open },
      { sec: 1.4, C: Weak, t: { kind: "zoom" }, tf: 12 },
      { sec: 1.9, C: Different, t: { kind: "slide", dir: "from-right" }, tf: 10 },
      { sec: 2.2, C: Why, t: { kind: "wipe", dir: "from-bottom-right" }, tf: 10 },
      { sec: 7.5, C: Choices, t: { kind: "iris" }, tf: 16 },
    ]}
  />
);
