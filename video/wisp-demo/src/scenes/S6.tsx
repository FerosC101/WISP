import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { map } from "../anim";
import { Tag } from "../components/Card";
import { Icon, type IconName } from "../components/Icons";
import { Insert } from "../components/Insert";
import { Burst, Cam, Chip, Float3D, Kinetic, Pop, Slide, sp } from "../components/Motion";
import { Shots } from "../components/Shots";
import { WispSense } from "../components/WispSense";
import { C, SANS, s } from "../theme";

const Grid: React.FC = () => (
  <AbsoluteFill style={{ background: C.ivory, backgroundImage: `linear-gradient(${C.line}66 1px, transparent 1px), linear-gradient(90deg, ${C.line}66 1px, transparent 1px)`, backgroundSize: "48px 48px" }} />
);

type N = { label: string; sub: string; icon: IconName; kind: "io" | "ai" | "bridge" | "rules" };
const pal = (k: N["kind"]) =>
  k === "ai" ? { bg: C.dustyBg, bd: C.dusty, fg: "#3D5A78" } : k === "rules" ? { bg: C.forest, bd: C.forest, fg: "#F3F1E8" } : k === "bridge" ? { bg: C.card, bd: C.sageDeep, fg: C.forest } : { bg: C.paleSage, bd: C.sageDeep, fg: C.forest };

/** A row of nodes joined by connectors with data packets travelling along them. */
const Flow: React.FC<{ nodes: N[]; y: number; x0: number; w: number; gap: number; at: number; step: number; h?: number; big?: boolean }> = ({ nodes, y, x0, w, gap, at, step, h = 220, big }) => {
  const f = useCurrentFrame();
  return (
    <>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {nodes.slice(1).map((_, i) => {
          const a = x0 + i * (w + gap) + w;
          const b = a + gap;
          const p = map(f, at + (i + 1) * step - 8, at + (i + 1) * step + 4);
          const live = f > at + (i + 1) * step;
          return (
            <g key={i}>
              <path d={`M ${a + 6} ${y + h / 2} H ${a + 6 + (b - a - 12) * p}`} stroke={C.forest} strokeWidth={4} strokeLinecap="round" />
              {live &&
                [0, 1, 2].map((k) => {
                  const t = ((f - at) / 26 + k / 3) % 1;
                  return <circle key={k} cx={a + 6 + (b - a - 12) * t} cy={y + h / 2} r={7} fill={C.amber} />;
                })}
            </g>
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const P = pal(n.kind);
        const k = sp(f, at + i * step);
        return (
          <div key={n.label} style={{ position: "absolute", left: x0 + i * (w + gap), top: y, width: w, height: h, borderRadius: 30, background: P.bg, border: `3px solid ${P.bd}`, padding: big ? "28px 30px" : "22px 24px", boxSizing: "border-box", transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 1.5), fontFamily: SANS, boxShadow: "0 20px 40px -28px rgb(24 60 49 / .5)" }}>
            <Icon name={n.icon} size={big ? 56 : 46} color={P.fg} draw={map(f, at + i * step + 4, at + i * step + 24)} />
            <div style={{ fontSize: big ? 36 : 30, fontWeight: 800, color: P.fg, marginTop: 10 }}>{n.label}</div>
            <div style={{ fontSize: big ? 24 : 22, fontWeight: 550, color: P.fg, opacity: 0.85, marginTop: 4 }}>{n.sub}</div>
          </div>
        );
      })}
    </>
  );
};

/* a · the agent side */
const AGENT: N[] = [
  { label: "Patient input", sub: "her words + answers", icon: "chat", kind: "io" },
  { label: "WorkBuddy", sub: "AI agent · understands, asks", icon: "spark", kind: "ai" },
  { label: "MCP tools", sub: "validated, token-bound", icon: "plug", kind: "bridge" },
  { label: "Eligibility", sub: "single-use grant", icon: "shield", kind: "bridge" },
];
const Agent: React.FC = () => (
  <AbsoluteFill>
    <Grid />
    <Cam dur={s(8.6)} from={1} to={1.05}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kinetic text="Under the interface: the agent asks." at={2} size={76} width={1700} accent={["asks"]} />
      </div>
      <Flow nodes={AGENT} y={430} x0={120} w={380} gap={60} at={10} step={22} big />
      <div style={{ position: "absolute", left: 120 + 440, top: 690, width: 380, display: "flex", justifyContent: "center" }}>
        <Pop at={60}>
          <Chip size={26} bg={C.dustyBg} fg="#3D5A78" border={C.dusty}>
            Language → structured facts
          </Chip>
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 120, top: 830 }}>
        <Pop at={120}>
          <Chip size={28} fg={C.inkSoft}>
            WorkBuddy was run live with these tools for two demo scenarios
          </Chip>
        </Pop>
      </div>
    </Cam>
  </AbsoluteFill>
);

/* b · the local sensing pipeline */
const PIPE: N[] = [
  { label: "Wi-Fi CSI", sub: "router → sensor", icon: "waves", kind: "bridge" },
  { label: "Signal processing", sub: "no deep learning", icon: "rules", kind: "bridge" },
  { label: "5xSTS timing", sub: "each rise", icon: "chair", kind: "bridge" },
  { label: "Baseline", sub: "her usual", icon: "baseline", kind: "bridge" },
  { label: "Quality check", sub: "usable?", icon: "check", kind: "io" },
];
const Pipeline: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Grid />
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kinetic text="Sensing estimates movement — locally." at={0} size={72} width={1700} accent={["locally"]} />
      </div>
      <div style={{ position: "absolute", left: 60, top: 400, opacity: map(f, 0, 10) }}>
        <WispSense id="s6p" height={260} yaw={-0.4} led={0.9} shadow={false} />
      </div>
      <Flow nodes={PIPE} y={430} x0={290} w={290} gap={36} at={6} step={12} />
      <div style={{ position: "absolute", left: 290, top: 700, display: "flex", gap: 16 }}>
        <Pop at={70}>
          <Chip size={26} fg={C.inkSoft}>
            Hampel → low-pass → normalise → PCA → peaks
          </Chip>
        </Pop>
        <Pop at={90}>
          <Chip size={26} bg={C.forest} fg="#F4F1E6" border={C.forest}>
            The agent gets a signed summary — never raw CSI
          </Chip>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* c · the rules decide */
const Rules: React.FC = () => {
  const f = useCurrentFrame();
  const k = sp(f, 0, { damping: 14, stiffness: 120 });
  return (
    <AbsoluteFill style={{ background: C.forest, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 80 }}>
      <Burst at={4} x={620} y={540} color={C.sage} size={360} rings={3} />
      <div style={{ width: 360, height: 360, borderRadius: 80, background: "#F4F1E6", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.6 + 0.4 * k}) rotate(${(1 - k) * -14}deg)`, flex: "none" }}>
        <Icon name="shield" size={210} color={C.forest} />
      </div>
      <div>
        <Kinetic text="The rules decide." at={6} size={120} color="#F4F1E6" />
        <div style={{ marginTop: 26 }}>
          <Pop at={34}>
            <Chip size={32} bg="rgba(255,255,255,0.08)" fg={C.paleSage} border="rgba(255,255,255,0.2)">
              Deterministic · never the language model alone
            </Chip>
          </Pop>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* d · the principle — built and rendered in HyperFrames */
const Principle: React.FC = () => <Insert name="principle" />;

/* e · three rules + the real Technical view */
const RULES: { icon: IconName; t: string; d: string; red?: boolean }[] = [
  { icon: "lock", t: "Red flags lock out sensing.", d: "A warning sign means emergency care — whatever any measurement says.", red: true },
  { icon: "cross", t: "Unreliable evidence is never used.", d: "It leads to abstention or human care — never to self-care." },
  { icon: "rules", t: "Rules set the care level.", d: "The AI turns words into fields. It can add a flag, never remove one." },
];
const Proof: React.FC = () => (
  <AbsoluteFill>
    <Grid />
    <div style={{ position: "absolute", left: 110, top: 80 }}>
      <Kinetic text="Safety you can audit." at={2} size={84} accent={["audit"]} />
    </div>
    <div style={{ position: "absolute", left: 110, top: 260, width: 860 }}>
      {RULES.map((r, i) => (
        <Slide key={r.t} at={14 + i * 16} dx={-140} dy={0}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", padding: "26px 30px", marginBottom: 22, borderRadius: 30, background: C.card, border: `2px solid ${r.red ? "#E2B3AB" : C.line}` }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: r.red ? C.redBg : C.paleSage, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name={r.icon} size={46} color={r.red ? C.red : C.forest} />
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 34, fontWeight: 800, color: r.red ? C.redDeep : C.forest }}>{r.t}</div>
              <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 500, color: C.inkSoft, marginTop: 6 }}>{r.d}</div>
            </div>
          </div>
        </Slide>
      ))}
    </div>
    <Float3D at={30} ry={-12} rx={4} style={{ position: "absolute", left: 1030, top: 250 }}>
      <div style={{ width: 800, padding: 16, borderRadius: 26, background: "#26302C", boxShadow: "0 50px 90px -40px rgb(24 60 49 / .6)" }}>
        <div style={{ width: 768, height: 480, borderRadius: 12, overflow: "hidden", background: C.ivory }}>
          <Img src={staticFile("screens/tan_11_explain.png")} style={{ width: 1500, marginLeft: -100, marginTop: -40 }} />
        </div>
      </div>
    </Float3D>
    <div style={{ position: "absolute", left: 1070, top: 820 }}>
      <Pop at={60}>
        <Tag tone="real">Real Technical view · the decision record for Mdm Tan’s check</Tag>
      </Pop>
    </div>
  </AbsoluteFill>
);

/** Scene 6 — How the system works (3:20–4:00). The principle beat is a HyperFrames insert. */
export const S6: React.FC = () => (
  <Shots
    shots={[
      { sec: 8.6, C: Agent },
      { sec: 5.7, C: Pipeline, t: { kind: "slide", dir: "from-right" }, tf: 12 },
      { sec: 3.4, C: Rules, t: { kind: "iris" }, tf: 12 },
      { sec: 9.8, C: Principle, t: { kind: "zoom" }, tf: 10 },
      { sec: 12.5, C: Proof, t: { kind: "blob", color: C.ivory, x: 1920, y: 1080 }, tf: 6 },
    ]}
  />
);
