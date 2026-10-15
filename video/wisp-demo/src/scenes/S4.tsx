import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { inOut, map } from "../anim";
import { Tag } from "../components/Card";
import { TanSide } from "../components/Characters";
import { Icon, type IconName } from "../components/Icons";
import { Blobs, Burst, Cam, Chip, Float3D, Kinetic, Pop, Slide, sp } from "../components/Motion";
import { Phone } from "../components/Phone";
import { SensingRoom, SideChair } from "../components/Rooms";
import { Shots, type Shot } from "../components/Shots";
import { Signal } from "../components/Signal";
import { Body } from "../components/Type";
import { Layer, WispLine } from "../components/WispLine";
import { SenseTag, WispSense } from "../components/WispSense";
import { C, SANS, SERIF, s } from "../theme";
import { FaceCircle } from "./S1";

/** Real screens that swipe in one after another. */
const swipe = (f: number, list: [string, number][]) =>
  list.map(([src, at], i) => ({ src, opacity: i === 0 ? 1 : Math.min(1, Math.max(0, (f - s(at)) / 8)) }));

const Bubble: React.FC<{ who: "her" | "wisp"; children: React.ReactNode; at: number }> = ({ who, children, at }) => (
  <Slide at={at} dx={who === "her" ? 80 : -80} dy={10}>
    <div
      style={{
        maxWidth: 620,
        padding: "26px 32px",
        borderRadius: 34,
        borderBottomRightRadius: who === "her" ? 8 : 34,
        borderBottomLeftRadius: who === "wisp" ? 8 : 34,
        background: who === "her" ? C.forest : C.card,
        color: who === "her" ? "#F6F3EA" : C.ink,
        border: who === "wisp" ? `2px solid ${C.line}` : "none",
        fontFamily: SANS,
        fontSize: 36,
        lineHeight: 1.35,
        fontWeight: 500,
        boxShadow: "0 20px 40px -24px rgb(36 53 47 / .55)",
      }}
    >
      {children}
    </div>
  </Slide>
);

/* ───────────── 4A · a vague complaint ───────────── */
const A1: React.FC = () => (
  <AbsoluteFill style={{ background: C.paleSage }}>
    <Blobs colors={["#F3E3C4", "#D6E3CF"]} seed={7} />
    <div style={{ position: "absolute", left: 1040, top: 190 }}>
      <FaceCircle size={700} bg={C.ivory} f0={800} pose="lap" />
    </div>
    <div style={{ position: "absolute", left: 140, top: 330 }}>
      <Kinetic text="Mdm Tan, 78." at={4} size={150} />
      <div style={{ marginTop: 30 }}>
        <Pop at={22}>
          <Tag tone="illus">Fictional persona</Tag>
        </Pop>
      </div>
    </div>
  </AbsoluteFill>
);
const A2: React.FC = () => (
  <AbsoluteFill style={{ background: C.ivory }}>
    <Blobs seed={8} />
    <div style={{ position: "absolute", left: 120, top: 150 }}>
      <Kinetic text="Weak for two days." at={2} size={104} accent={["two", "days"]} />
    </div>
    <div style={{ position: "absolute", left: 120, top: 320 }}>
      <Kinetic text="She isn’t sure why." at={40} size={104} italic color={C.tealText} />
    </div>
    <div style={{ position: "absolute", left: 130, top: 560, display: "flex", gap: 18 }}>
      <Pop at={70}>
        <Chip size={30}>Not a fall</Chip>
      </Pop>
      <Pop at={80}>
        <Chip size={30}>Not sudden</Chip>
      </Pop>
      <Pop at={90}>
        <Chip size={30} bg={C.amberBg} fg={C.amberText} border="#EBCF95">
          Just… weaker
        </Chip>
      </Pop>
    </div>
    <Float3D at={10} style={{ position: "absolute", left: 1280, top: 90 }}>
      <Phone width={400} shots={[{ src: "tan_01_today" }]} />
    </Float3D>
  </AbsoluteFill>
);
const A3: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={9} colors={[C.paleSage, "#E7EEF5"]} />
      <Float3D at={0} ry={14} style={{ position: "absolute", left: 160, top: 90 }}>
        <Phone width={400} shots={swipe(f, [["tan_02_start_typed", 0], ["tan_03_safety_0_msg", 2.6]])} tap={{ x: 195, y: 738, t: map(f, 52, 72) }} />
      </Float3D>
      <div style={{ position: "absolute", left: 780, top: 200, display: "flex", flexDirection: "column", alignItems: "flex-end", width: 1000 }}>
        <Bubble who="her" at={8}>
          I’ve been feeling weak for two days.
        </Bubble>
      </div>
      <div style={{ position: "absolute", left: 780, top: 420, width: 1000 }}>
        <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 800, letterSpacing: "0.16em", color: C.tealText, marginBottom: 12, opacity: map(f, 80, 92) }}>WISP AGENT</div>
        <Bubble who="wisp" at={84}>
          You said you’ve been feeling weaker than usual for 2 days. I need to check for a few warning signs first.
        </Bubble>
      </div>
      <div style={{ position: "absolute", left: 180, top: 990 }}>
        <Tag tone="real">Real WISP patient app</Tag>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────── 4B · safety first ───────────── */
const SAFETY: [string, string][] = [
  ["Did it start suddenly, or gradually?", "Gradually"],
  ["Any chest pain or tightness?", "No"],
  ["So short of breath it’s hard to talk or walk?", "No"],
  ["Weakness or numbness on one side?", "No"],
  ["Slurred speech, or hard to find words?", "No"],
  ["Confused or unusually drowsy?", "No"],
  ["Fainted or blacked out?", "No"],
  ["A fall today or yesterday?", "No"],
  ["Eating and drinking as usual?", "Less than usual"],
];
const B1: React.FC = () => {
  const f = useCurrentFrame();
  const per = 26;
  const idx = Math.min(SAFETY.length - 1, Math.max(0, Math.floor((f - 10) / per)));
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={10} />
      <div style={{ position: "absolute", left: 130, top: 90 }}>
        <Kinetic text="Safety first." at={0} size={120} accent={["Safety"]} />
      </div>
      <div style={{ position: "absolute", left: 140, top: 270 }}>
        <Body size={32} color={C.inkSoft} weight={600}>
          Warning signs are checked before any movement check.
        </Body>
      </div>
      <div style={{ position: "absolute", left: 140, top: 360, width: 1020, height: 380, overflow: "hidden" }}>
      {SAFETY.map(([q, a], i) => {
        const local = f - 10 - i * per;
        if (local < -2 || i < idx - 1) return null;
        const inK = sp(f, 10 + i * per, { damping: 16 });
        const outK = i < idx ? sp(f, 10 + (i + 1) * per, { damping: 20 }) : 0;
        const stamp = sp(f, 10 + i * per + 12, { damping: 10, stiffness: 220 });
        const flagged = a === "Less than usual";
        return (
          <div
            key={q}
            style={{
              position: "absolute",
              left: 0,
              top: 20,
              width: 980,
              height: 330,
              borderRadius: 36,
              background: C.card,
              border: `2px solid ${C.line}`,
              boxShadow: "0 30px 60px -36px rgb(24 60 49 / .5)",
              padding: "46px 50px",
              boxSizing: "border-box",
              transform: `translateY(${(1 - inK) * 380}px) translateX(${-outK * 1100}px) rotate(${(1 - inK) * 4 - outK * 6}deg)`,
              opacity: 1 - outK,
            }}
          >
            <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 800, letterSpacing: "0.14em", color: C.inkFaint }}>SAFETY CHECK</div>
            <div style={{ fontFamily: SERIF, fontSize: 54, color: C.forest, marginTop: 14, lineHeight: 1.15, width: 860 }}>{q}</div>
            <div style={{ position: "absolute", right: 46, bottom: 40, transform: `scale(${0.4 + 0.6 * stamp}) rotate(${-8 + stamp * 4}deg)`, opacity: Math.min(1, stamp * 2) }}>
              <Chip size={34} bg={flagged ? C.amberBg : C.paleSage} fg={flagged ? C.amberText : C.forest} border={flagged ? C.amber : C.sageDeep}>
                <Icon name="check" size={32} color={flagged ? C.amberText : C.forest} width={3.6} /> {a}
              </Chip>
            </div>
          </div>
        );
      })}
      </div>
      <div style={{ position: "absolute", left: 140, top: 760, display: "flex", gap: 12 }}>
        {SAFETY.map((_, i) => (
          <div key={i} style={{ width: 64, height: 10, borderRadius: 99, background: i <= idx ? C.forest : C.sageDeep }} />
        ))}
      </div>
      <Float3D at={6} style={{ position: "absolute", left: 1380, top: 110 }}>
        <Phone width={360} shots={swipe(f, [["tan_03_safety_1", 0], ["tan_03_safety_2", 2], ["tan_03_safety_3", 4], ["tan_03_safety_4", 6], ["tan_03_safety_5", 7.4]])} />
      </Float3D>
      <div style={{ position: "absolute", left: 1440, top: 940 }}>
        <Tag tone="real">Real app screens</Tag>
      </div>
    </AbsoluteFill>
  );
};
const B2: React.FC = () => {
  const f = useCurrentFrame();
  const travel = map(f, 96, 150, 0, 1, inOut);
  const x = 500 + 500 * travel;
  const y = 560 + 200 * (travel * travel * (3 - 2 * travel));
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={11} colors={[C.paleSage, C.redBg]} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 80 }}>
        <Kinetic text="A warning sign changes everything." at={2} size={76} align="center" width={1920} accent={["warning"]} accentColor={C.redDeep} marker="#E2B3AB" />
      </div>
      <Layer>
        <WispLine d="M 560 560 C 760 560, 780 360, 1000 360" progress={map(f, 20, 44)} width={6} dot={false} color="#D49A90" />
        <WispLine d="M 560 560 C 760 560, 780 760, 1000 760" progress={map(f, 30, 54)} width={6} dot={false} color={C.sage} />
        {travel > 0 && travel < 1 && <circle cx={Math.max(560, x)} cy={y} r={16} fill={C.amber} />}
      </Layer>
      <div style={{ position: "absolute", left: 130, top: 500 }}>
        <Pop at={8}>
          <Chip size={36} bg={C.forest} fg="#F4F1E6" border={C.forest}>
            <Icon name="shield" size={40} color="#F4F1E6" /> Any warning sign?
          </Chip>
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 1010, top: 290, width: 780 }}>
        <Slide at={40} dx={120} dy={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "26px 32px", borderRadius: 30, background: C.redBg, border: "3px solid #E2B3AB" }}>
            <div style={{ width: 82, height: 82, borderRadius: 99, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", transform: `scale(${0.7 + 0.3 * sp(f, 60, { damping: 9, stiffness: 240 })})` }}>
              <Icon name="lock" size={48} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 800, color: C.redDeep }}>Yes → urgent care first</div>
              <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600, color: C.ink }}>The movement check is locked</div>
            </div>
          </div>
        </Slide>
      </div>
      <div style={{ position: "absolute", left: 1010, top: 690, width: 780 }}>
        <Slide at={52} dx={120} dy={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "26px 32px", borderRadius: 30, background: C.paleSage, border: `3px solid ${C.sageDeep}` }}>
            <div style={{ width: 82, height: 82, borderRadius: 99, background: C.forest, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="check" size={48} color="#fff" width={3.4} />
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 800, color: C.forest }}>No → keep going</div>
              <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600, color: C.ink }}>Mdm Tan reported none</div>
            </div>
          </div>
        </Slide>
      </div>
      <Burst at={150} x={1000} y={760} color={C.forest} size={70} />
    </AbsoluteFill>
  );
};
const B3: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.forest, justifyContent: "center", alignItems: "center" }}>
      <Burst at={6} x={960} y={330} color={C.sage} size={420} rings={4} />
      <Pop at={2}>
        <div style={{ width: 200, height: 200, borderRadius: 99, background: "#F4F1E6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
          <Icon name="check" size={120} color={C.forest} width={3.4} draw={map(f, 8, 26)} />
        </div>
      </Pop>
      <div style={{ marginTop: 50 }}>
        <Kinetic text="Safety screening completed." at={10} size={86} color="#F4F1E6" align="center" width={1700} />
      </div>
      <div style={{ marginTop: 34 }}>
        <Pop at={50}>
          <Chip size={34} bg="rgba(255,255,255,0.08)" fg={C.amber} border="rgba(255,255,255,0.2)">
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: C.amber, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(f / 6 - i * 0.9)) }} />
            ))}
            Assessment eligibility: checking
          </Chip>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────── 4C · why measure? ───────────── */
const REASONS: { icon: IconName; t: string; slate?: boolean }[] = [
  { icon: "chair", t: "It may show a change in physical function." },
  { icon: "baseline", t: "It’s compared with her own healthy-day baseline." },
  { icon: "question", t: "It does not diagnose the cause.", slate: true },
];
const C1: React.FC = () => (
  <AbsoluteFill style={{ background: C.ivory }}>
    <Blobs seed={12} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 110 }}>
      <Kinetic text="Could a movement check help?" at={2} size={112} align="center" width={1920} accent={["movement", "check"]} />
    </div>
    <div style={{ position: "absolute", left: 260, top: 400, width: 1400 }}>
      {REASONS.map((r, i) => (
        <Slide key={r.t} at={50 + i * 22} dx={-160} dy={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 28, padding: "24px 32px", borderRadius: 30, background: r.slate ? C.slateBg : C.card, border: `2px solid ${r.slate ? "#D7D3C7" : C.line}` }}>
            <div style={{ width: 90, height: 90, borderRadius: 26, background: r.slate ? "#E2DFD6" : C.paleSage, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name={r.icon} size={54} color={r.slate ? C.slate : C.forest} />
            </div>
            <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: r.slate ? 700 : 600, color: r.slate ? C.slate : C.ink }}>{r.t}</div>
          </div>
        </Slide>
      ))}
    </div>
  </AbsoluteFill>
);
const GATES = ["No warning signs reported", "Safety rules allow it", "She chooses to do it"];
const C2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={13} colors={[C.paleSage, "#F3E3C4"]} />
      <Float3D at={0} ry={14} style={{ position: "absolute", left: 170, top: 90 }}>
        <Phone width={400} shots={[{ src: "tan_05_decision" }]} tap={{ x: 195, y: 520, t: map(f, s(6.4), s(7.1)) }} />
      </Float3D>
      <div style={{ position: "absolute", left: 230, top: 990 }}>
        <Tag tone="real">Real app screen</Tag>
      </div>
      <div style={{ position: "absolute", left: 800, top: 120 }}>
        <Kinetic text="Offered only when the rules allow." at={4} size={70} width={1020} accent={["rules"]} />
      </div>
      <div style={{ position: "absolute", left: 800, top: 380, width: 960 }}>
        {GATES.map((g, i) => {
          const on = sp(f, 40 + i * 30, { damping: 11, stiffness: 200 });
          return (
            <div key={g} style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 26, padding: "24px 30px", borderRadius: 28, background: on > 0.5 ? C.paleSage : C.card, border: `3px solid ${on > 0.5 ? C.forest : C.line}`, opacity: map(f, 30 + i * 30, 38 + i * 30) }}>
              <div style={{ width: 70, height: 70, borderRadius: 99, background: on > 0.5 ? C.forest : C.slateBg, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.7 + 0.3 * on})` }}>
                <Icon name="check" size={42} color="#fff" width={3.6} draw={on} />
              </div>
              <div style={{ fontFamily: SANS, fontSize: 38, fontWeight: 650, color: C.forest }}>{g}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 800, top: 820 }}>
        <Pop at={140}>
          <Chip size={32} bg={C.forest} fg="#F4F1E6" border={C.forest}>
            Offered — she taps “Do the check”
          </Chip>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────── 4D · the Wi-Fi movement check ───────────── */
const D1: React.FC = () => {
  const f = useCurrentFrame();
  const led = map(f, 40, 52);
  return (
    <AbsoluteFill style={{ background: C.ivory, flexDirection: "row" }}>
      <div style={{ flex: 1, background: C.paleSage, position: "relative" }}>
        <Float3D at={0} ry={10} style={{ position: "absolute", left: 230, top: 80 }}>
          <Phone width={400} shots={[{ src: "tan_07_movement_ready" }]} tap={{ x: 195, y: 640, t: map(f, 30, 48) }} />
        </Float3D>
      </div>
      <div style={{ flex: 1, background: "#F1ECE1", position: "relative" }}>
        <AbsoluteFill style={{ background: "radial-gradient(45% 55% at 50% 55%, #FFFDF6 0%, rgba(241,236,225,0) 70%)" }} />
        <div style={{ position: "absolute", left: 960 / 2 - 170, top: 260 }}>
          <WispSense id="d1" height={500} yaw={-0.35} led={led * (0.8 + 0.2 * Math.sin(f / 5))} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", justifyContent: "center" }}>
          <Pop at={44}>
            <Chip size={34} bg={C.forest} fg="#F4F1E6" border={C.forest}>
              Physical sensing ACTIVE
            </Chip>
          </Pop>
        </div>
      </div>
      <Burst at={44} x={960 + 480} y={260 + 430} color="#7FD87B" size={220} />
    </AbsoluteFill>
  );
};
const PERIOD = 2.35;
const REP0 = 1.0;
const rise = (t: number) => {
  const k = (t - REP0) / PERIOD;
  if (k < 0 || k >= 5) return { p: 0, rep: k < 0 ? -1 : 5 };
  const u = (k % 1) * PERIOD;
  const p = u < 1.0 ? u : u < 1.3 ? 1 : u < 2.15 ? 1 - (u - 1.3) / 0.85 : 0;
  return { p: inOut(Math.max(0, Math.min(1, p))), rep: Math.floor(k) };
};
const D2: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const { p, rep } = rise(t);
  const counted = t < REP0 + 1.0 ? 0 : Math.min(5, Math.floor((t - REP0 - 1.0) / PERIOD) + 1);
  const arms = rep >= 3 && rep < 5 ? "push" : "crossed";
  const pts: string[] = [];
  for (let i = 0; i <= Math.min(f, s(13.5)); i += 2) {
    const r = rise(i / 30).p;
    pts.push(`${20 + (i / s(13.5)) * 520},${150 - r * 110 - Math.sin(i / 3) * 3}`);
  }
  return (
    <AbsoluteFill>
      <Cam dur={s(14.3)} from={1.0} to={1.06} origin="50% 70%">
        <SensingRoom senseLed={0.95} over={<Signal f={f} on={1} bend={p} personX={880} />}>
          <SideChair />
          <TanSide p={p} f={f} arms={arms} seed={2} />
        </SensingRoom>
      </Cam>
      <div style={{ position: "absolute", left: 1080, top: 70, display: "flex", gap: 16 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = counted >= n;
          const at = s(REP0 + 1.0 + (n - 1) * PERIOD);
          const pop = on ? sp(f, at, { damping: 9, stiffness: 260 }) : 0;
          return (
            <div key={n} style={{ width: 92, height: 92, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontSize: 46, fontWeight: 800, background: on ? C.amber : "rgba(255,253,248,0.92)", color: on ? "#3a2a0c" : C.inkFaint, border: `3px solid ${on ? C.amber : C.line}`, transform: `scale(${on ? 0.8 + 0.2 * pop : 1})` }}>
              {n}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 80, top: 60, width: 600, padding: "20px 24px", borderRadius: 26, background: "rgba(255,253,248,0.94)", border: `2px solid ${C.line}`, boxShadow: "0 20px 40px -26px rgb(24 60 49 / .5)", opacity: map(f, 6, 16) }}>
        <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 800, letterSpacing: "0.12em", color: C.tealText }}>WI-FI CSI · FIVE-TIMES SIT-TO-STAND</div>
        <svg viewBox="0 0 560 170" width={552} height={150}>
          <path d="M20 150 H540" stroke={C.line} strokeWidth={2} />
          <polyline points={pts.join(" ")} fill="none" stroke={C.teal} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 600, color: C.inkFaint }}>Illustrative trace · each peak is one rise</div>
      </div>
      {arms === "push" && (
        <div style={{ position: "absolute", left: 1080, top: 190 }}>
          <Pop at={s(REP0 + PERIOD * 3)}>
            <Chip size={28} bg={C.amberBg} fg={C.amberText} border="#EBCF95">
              Pushing up with her arms
            </Chip>
          </Pop>
        </div>
      )}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 30, display: "flex", justifyContent: "space-between", opacity: map(f, 20, 34) }}>
        <SenseTag />
        <Tag tone="synthetic">Illustration · the demo replays a recorded, synthetic CSI session</Tag>
      </div>
    </AbsoluteFill>
  );
};
const D3: React.FC = () => (
  <AbsoluteFill style={{ background: C.forest, justifyContent: "center", alignItems: "center" }}>
    <Burst at={4} x={960} y={540} color={C.amber} size={500} rings={4} />
    <Kinetic text="Check complete." at={2} size={130} color="#F4F1E6" align="center" width={1600} />
    <div style={{ marginTop: 30 }}>
      <Pop at={16}>
        <Chip size={34} bg="rgba(255,255,255,0.08)" fg={C.paleSage} border="rgba(255,255,255,0.2)">
          Sensing off · nothing keeps running
        </Chip>
      </Pop>
    </div>
  </AbsoluteFill>
);

/* ───────────── 4E · evidence → recommendation ───────────── */
const Lane: React.FC<{ label: string; color: string; gap: number; f: number; y: number; arms?: boolean }> = ({ label, color, gap, f, y, arms }) => (
  <div style={{ position: "absolute", left: 140, top: y, width: 1640 }}>
    <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 800, color, marginBottom: 14 }}>{label}</div>
    <div style={{ position: "relative", height: 80 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 36, height: 8, borderRadius: 99, background: C.line }} />
      {[0, 1, 2, 3, 4].map((i) => {
        const k = sp(f, 6 + i * gap, { damping: 10, stiffness: 240 });
        return (
          <div key={i} style={{ position: "absolute", left: 40 + i * gap * 11, top: 10, width: 60, height: 60, borderRadius: 99, background: color, transform: `scale(${k})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {arms && i >= 3 && <Icon name="arrow" size={30} color="#fff" style={{ transform: "rotate(-90deg)" }} />}
          </div>
        );
      })}
    </div>
  </div>
);
const E1: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={14} />
      <div style={{ position: "absolute", left: 140, top: 90 }}>
        <Kinetic text="Slower than her usual." at={0} size={104} accent={["usual"]} />
      </div>
      <Lane label="HER USUAL (HEALTHY-DAY BASELINE)" color={C.forest} gap={11} f={f} y={340} />
      <Lane label="TODAY" color={C.amber} gap={15} f={f} y={600} arms />
      <div style={{ position: "absolute", left: 140, top: 880 }}>
        <Pop at={70}>
          <Chip size={26} fg={C.inkSoft}>
            No timings shown to the patient · synthetic demo data
          </Chip>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};
const EVIDENCE: { t: string; src: string; x: number; y: number }[] = [
  { t: "Slower than usual", src: "measured", x: 120, y: 250 },
  { t: "Pushed up with her arms", src: "she reported", x: 120, y: 470 },
  { t: "Eating less", src: "she reported", x: 120, y: 690 },
];
const E2: React.FC = () => {
  const f = useCurrentFrame();
  const out = sp(f, 82, { damping: 14 });
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={15} colors={["#F6E7C8", C.paleSage]} />
      {EVIDENCE.map((e, i) => {
        const fly = map(f, 30 + i * 8, 56 + i * 8, 0, 1, inOut);
        const x = e.x + (840 - e.x) * fly;
        const y = e.y + (500 - e.y) * fly;
        return (
          <div key={e.t} style={{ position: "absolute", left: x, top: y, transform: `scale(${1 - fly * 0.6})`, opacity: 1 - fly }}>
            <Pop at={2 + i * 5}>
              <Chip size={32} fg={C.amberText} bg={C.card}>
                {e.t} <span style={{ fontSize: 20, color: C.inkFaint, letterSpacing: "0.1em" }}>{e.src.toUpperCase()}</span>
              </Chip>
            </Pop>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 790, top: 360, width: 340, height: 340, borderRadius: 60, background: C.forest, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${1 + (f > 40 && f < 80 ? 0.05 * Math.sin((f - 40) / 3) : 0)})` }}>
        <Icon name="shield" size={120} color="#F4F1E6" />
        <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 800, color: "#F4F1E6", marginTop: 16 }}>Safety rules</div>
        <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 600, color: C.paleSage }}>deterministic</div>
      </div>
      <Layer>
        <WispLine d="M 1135 530 C 1200 530, 1230 530, 1285 530" progress={map(f, 80, 92)} width={6} dot={false} color={C.amber} />
      </Layer>
      <div style={{ position: "absolute", left: 1290, top: 300, width: 540, perspective: 1600 }}>
        <div style={{ transform: `translateX(${(1 - out) * 200}px) rotateY(${(1 - out) * 70}deg)`, opacity: Math.min(1, out * 1.5), transformOrigin: "0 50%" }}>
          <div style={{ padding: 40, borderRadius: 36, background: C.amberBg, border: "3px solid #EBCF95", boxShadow: "0 30px 60px -36px rgb(24 60 49 / .5)" }}>
            <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 800, letterSpacing: "0.14em", color: C.amberText }}>YOUR NEXT STEP</div>
            <div style={{ fontFamily: SERIF, fontSize: 64, color: C.amberText, marginTop: 10, lineHeight: 1.05 }}>Please be seen today.</div>
            <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 650, color: C.ink, marginTop: 18 }}>See your GP or a polyclinic today.</div>
          </div>
          <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 600, color: C.inkSoft, marginTop: 18, opacity: map(f, 110, 124) }}>
            Symptom range: primary care soon ↔ same day. The evidence raised it — it could never lower it.
          </div>
        </div>
      </div>
      <Burst at={86} x={1560} y={440} color={C.amber} size={320} />
    </AbsoluteFill>
  );
};
const E3: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={16} />
      <Float3D at={0} ry={-14} style={{ position: "absolute", left: 1300, top: 90 }}>
        <Phone width={400} shots={swipe(f, [["tan_10_complete", 0], ["tan_10_complete_why", 2.6], ["tan_10_complete_watch", 4.4]])} />
      </Float3D>
      <div style={{ position: "absolute", left: 1330, top: 990 }}>
        <Tag tone="real">Real recommendation screens</Tag>
      </div>
      <div style={{ position: "absolute", left: 140, top: 140 }}>
        <Kinetic text="It explains why —" at={2} size={100} />
      </div>
      <div style={{ position: "absolute", left: 140, top: 270 }}>
        <Kinetic text="and when to get help fast." at={24} size={88} italic color={C.redDeep} accent={["fast"]} accentColor={C.redDeep} marker="#E2B3AB" width={1120} />
      </div>
      <div style={{ position: "absolute", left: 140, top: 520, width: 1000 }}>
        <Slide at={60} dx={-120} dy={0}>
          <div style={{ padding: "30px 36px", borderRadius: 32, background: "#FCF3F1", border: "3px solid #E8C3BC" }}>
            <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 800, color: C.redDeep }}>Watch for — then call 995</div>
            <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 500, color: C.ink, marginTop: 10, lineHeight: 1.4 }}>
              Sudden one-sided weakness · new confusion · chest pain · severe breathlessness · fainting
            </div>
          </div>
        </Slide>
      </div>
    </AbsoluteFill>
  );
};

const part = (shots: Shot[]): React.FC => () => <Shots shots={shots} />;
const PartA = part([{ sec: 3.3, C: A1 }, { sec: 5.2, C: A2, t: { kind: "slide", dir: "from-right" }, tf: 12 }, { sec: 6.5, C: A3, t: { kind: "zoom" }, tf: 12 }]);
const PartB = part([{ sec: 8.5, C: B1 }, { sec: 6.0, C: B2, t: { kind: "wipe", dir: "from-left" }, tf: 12 }, { sec: 5.5, C: B3, t: { kind: "iris" }, tf: 14 }]);
const PartC = part([{ sec: 6.6, C: C1 }, { sec: 8.4, C: C2, t: { kind: "slide", dir: "from-bottom" }, tf: 12 }]);
const PartD = part([{ sec: 3.2, C: D1 }, { sec: 14.3, C: D2, t: { kind: "zoom" }, tf: 12 }, { sec: 2.5, C: D3, t: { kind: "iris" }, tf: 12 }]);
const PartE = part([{ sec: 3.5, C: E1 }, { sec: 5.2, C: E2, t: { kind: "slide", dir: "from-right" }, tf: 12 }, { sec: 6.3, C: E3, t: { kind: "wipe", dir: "from-bottom-right" }, tf: 12 }]);

/** Scene 4 — Mdm Tan's WISP journey (1:20–2:45): five parts, each a run of short shots. */
export const S4: React.FC = () => (
  <Shots
    shots={[
      { sec: 15, C: PartA },
      { sec: 20, C: PartB, t: { kind: "slide", dir: "from-right" }, tf: 14 },
      { sec: 15, C: PartC, t: { kind: "blob", color: C.paleSage, x: 0, y: 1080 }, tf: 18 },
      { sec: 20, C: PartD, t: { kind: "zoom" }, tf: 14 },
      { sec: 15, C: PartE, t: { kind: "blob", color: C.amber, x: 1920, y: 0 }, tf: 18 },
    ]}
  />
);
