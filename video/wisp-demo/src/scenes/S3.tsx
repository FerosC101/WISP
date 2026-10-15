import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { inOut, map } from "../anim";
import { Icon, type IconName } from "../components/Icons";
import { Insert } from "../components/Insert";
import { Blobs, Burst, Chip, Kinetic, Pop, sp } from "../components/Motion";
import { Shots } from "../components/Shots";
import { Layer, WispLine } from "../components/WispLine";
import { SenseTag, WispSense } from "../components/WispSense";
import { C, SANS, SERIF, s } from "../theme";

/* a · brand ident — built and rendered in HyperFrames */
const Ident: React.FC = () => <Insert name="ident" />;

/* b · five stages; Screen comes first */
const STAGES: { n: string; label: string; icon: IconName }[] = [
  { n: "01", label: "Understand", icon: "chat" },
  { n: "02", label: "Screen", icon: "shield" },
  { n: "03", label: "Assess if useful", icon: "chair" },
  { n: "04", label: "Guide", icon: "guide" },
  { n: "05", label: "Reassess", icon: "reassess" },
];
const Stages: React.FC = () => {
  const f = useCurrentFrame();
  const pan = map(f, 0, s(2.2), 0, -260, inOut);
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={4} />
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${pan}px)` }}>
        <Layer>
          <WispLine d="M 60 455 C 400 425, 700 485, 1100 455 S 1800 425, 2200 455" progress={map(f, 0, 40)} width={5} dot={false} />
        </Layer>
        {STAGES.map((st, i) => {
          const hot = i === 1;
          const k = sp(f, 2 + i * 4);
          return (
            <div key={st.n} style={{ position: "absolute", left: 140 + i * 400, top: 380, width: 320, textAlign: "center", transform: `scale(${(0.6 + 0.4 * k) * (hot ? 1.12 : 1)})`, opacity: Math.min(1, k * 1.5) * (hot ? 1 : 0.55) }}>
              <div style={{ width: 150, height: 150, margin: "0 auto", borderRadius: 99, background: hot ? C.forest : C.card, border: `4px solid ${C.forest}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={st.icon} size={80} color={hot ? "#F4F1E6" : C.forest} />
              </div>
              <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 800, color: C.amberText, marginTop: 20, letterSpacing: "0.1em" }}>{st.n}</div>
              <div style={{ fontFamily: SERIF, fontSize: 44, color: C.forest }}>{st.label}</div>
            </div>
          );
        })}
      </div>
      <Burst at={14} x={540 + pan} y={455} color={C.amber} size={110} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 120 }}>
        <Kinetic text="It starts with safety screening." at={2} size={76} align="center" width={1920} accent={["safety"]} />
      </div>
    </AbsoluteFill>
  );
};

/* c · WISP Sense product hero, with callouts */
const CALLOUTS = [
  { t: "On-demand Wi-Fi sensing", x: 140, y: 270, at: 40, side: "l" },
  { t: "Times a five-times sit-to-stand", x: 140, y: 520, at: 70, side: "l" },
  { t: "Compared with your usual", x: 1250, y: 300, at: 110, side: "r" },
  { t: "No camera · nothing to wear", x: 1250, y: 560, at: 150, side: "r" },
] as const;
const Sense: React.FC = () => {
  const f = useCurrentFrame();
  const rise = sp(f, 2, { damping: 16, stiffness: 70 });
  const yaw = map(f, 0, s(8.4), -2.6, -0.3, inOut);
  return (
    <AbsoluteFill style={{ background: "#F1ECE1" }}>
      <AbsoluteFill style={{ background: "radial-gradient(42% 60% at 50% 52%, #FFFDF6 0%, rgba(241,236,225,0) 70%)" }} />
      <div style={{ position: "absolute", left: 960 - 260, top: 840, width: 520, height: 70, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(43,34,22,.28), rgba(43,34,22,0))", opacity: rise }} />
      <div style={{ position: "absolute", left: 960 - 177, top: 230, transform: `translateY(${(1 - rise) * 500}px)` }}>
        <WispSense id="s3hero" height={620} yaw={yaw} led={map(f, 60, 80) * (0.75 + 0.25 * Math.sin(f / 8))} shadow={false} />
      </div>
      <Burst at={64} x={960} y={760} color="#7FD87B" size={200} />
      <Layer>
        {CALLOUTS.map((c) => {
          const p = map(f, c.at - 6, c.at + 10);
          const x0 = c.side === "l" ? c.x + 530 : c.x - 10;
          const x1 = c.side === "l" ? 820 : 1100;
          return <path key={c.t} d={`M ${x0} ${c.y + 36} L ${x0 + (x1 - x0) * p} ${c.y + 36}`} stroke={C.sage} strokeWidth={3} strokeDasharray="6 8" />;
        })}
      </Layer>
      {CALLOUTS.map((c) => (
        <div key={c.t} style={{ position: "absolute", left: c.x, top: c.y, width: 530, display: "flex", justifyContent: c.side === "l" ? "flex-end" : "flex-start" }}>
          <Pop at={c.at}>
            <Chip size={30}>{c.t}</Chip>
          </Pop>
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center" }}>
        <Kinetic text="WISP Sense" at={6} size={96} align="center" width={1920} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 960, display: "flex", justifyContent: "center", opacity: map(f, 30, 44) }}>
        <SenseTag />
      </div>
    </AbsoluteFill>
  );
};

/* d · five possible outcomes — dealt like cards */
export const TIERS = [
  { code: "T1", name: "Emergency", head: "This needs help now", next: "Call 995 or go to A&E", fg: C.redDeep, bg: C.redBg, border: "#E2B3AB" },
  { code: "T2", name: "Same day", head: "Please be seen today", next: "GP or polyclinic today", fg: C.amberText, bg: C.amberBg, border: "#EBCF95" },
  { code: "T3", name: "Primary care soon", head: "Book your doctor in the next few days", next: "GP or polyclinic", fg: C.forest, bg: C.paleSage, border: C.sageDeep },
  { code: "T4", name: "Home care", head: "You can continue monitoring at home for now", next: "Self-care, then re-check", fg: C.tealText, bg: "#E3ECE9", border: "#C4D6D2" },
  { code: "—", name: "Abstain", head: "I can't safely judge this from here", next: "Speak to a doctor or nurse", fg: C.slate, bg: C.slateBg, border: "#D7D3C7" },
];
const Outcomes: React.FC = () => {
  const f = useCurrentFrame();
  const spread = sp(f, 50, { damping: 18, stiffness: 80 });
  const lift = sp(f, s(6.2), { damping: 16 });
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={6} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 80 }}>
        <Kinetic text="Then a clear next step." at={4} size={84} align="center" width={1920} accent={["next", "step"]} />
      </div>
      {TIERS.map((t, i) => {
        const deal = sp(f, 8 + i * 6, { damping: 16 });
        const fanX = 960 - 165 + (i - 2) * 60;
        const rowX = 82 + i * 356;
        const x = fanX + (rowX - fanX) * spread;
        const rot = (i - 2) * 7 * (1 - spread);
        const isAbstain = i === 4;
        return (
          <div
            key={t.name}
            style={{
              position: "absolute",
              left: x,
              top: 330 + (1 - deal) * 700 - (isAbstain ? lift * 26 : 0),
              width: 330,
              height: 400,
              borderRadius: 30,
              background: t.bg,
              border: `3px solid ${isAbstain && lift > 0.1 ? C.slate : t.border}`,
              padding: 30,
              boxSizing: "border-box",
              transform: `rotate(${rot}deg) scale(${isAbstain ? 1 + lift * 0.05 : 1})`,
              transformOrigin: "50% 120%",
              fontFamily: SANS,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 30px 60px -36px rgb(24 60 49 / .5)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: t.fg }}>
              {t.code !== "—" ? `${t.code} · ` : ""}
              {t.name}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1.15, color: t.fg, marginTop: 18 }}>{t.head}</div>
            <div style={{ marginTop: "auto", fontSize: 23, fontWeight: 650, color: C.inkSoft }}>{t.next}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 800, display: "flex", justifyContent: "center" }}>
        <Pop at={s(6.6)}>
          <Chip size={34} fg={C.slate} bg={C.slateBg} border="#D7D3C7">
            When the evidence isn’t enough, WISP says so.
          </Chip>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 3 — Introducing WISP (0:50–1:20). The ident is a HyperFrames insert. */
export const S3: React.FC = () => (
  <Shots
    shots={[
      { sec: 4.7, C: Ident },
      { sec: 2.2, C: Stages, t: { kind: "blob", color: C.ivory, x: 1920, y: 0 }, tf: 8 },
      { sec: 8.4, C: Sense, t: { kind: "zoom" }, tf: 12 },
      { sec: 14.7, C: Outcomes, t: { kind: "slide", dir: "from-bottom" }, tf: 14 },
    ]}
  />
);
