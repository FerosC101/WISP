import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { map } from "../anim";
import { Tag } from "../components/Card";
import { Icon } from "../components/Icons";
import { Blobs, Burst, Chip, Kinetic, Pop, Slide, sp } from "../components/Motion";
import { Shots } from "../components/Shots";
import { WispSense } from "../components/WispSense";
import { C, SANS, SERIF } from "../theme";

/* a · statement */
const Statement: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.forest, justifyContent: "center", alignItems: "center" }}>
      <Burst at={4} x={960} y={360} color={C.sage} size={380} rings={4} />
      <Pop at={0}>
        <div style={{ width: 170, height: 170, borderRadius: 50, background: "#F4F1E6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
          <Icon name="shield" size={110} color={C.forest} draw={map(f, 4, 24)} />
        </div>
      </Pop>
      <div style={{ marginTop: 44 }}>
        <Kinetic text="Privacy is part of the design." at={6} size={100} color="#F4F1E6" align="center" width={1700} accent={["design"]} accentColor={C.amber} />
      </div>
    </AbsoluteFill>
  );
};

/* b · the home dome: raw CSI stays inside; only conversation crosses to the cloud */
const Dome: React.FC = () => {
  const f = useCurrentFrame();
  const dome = sp(f, 4, { damping: 18, stiffness: 70 });
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={20} colors={[C.paleSage, "#E7EEF5"]} />
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* home */}
        <path d="M 170 820 V 520 L 520 330 L 870 520 V 820 Z" fill={C.card} stroke={C.forest} strokeWidth={5} strokeLinejoin="round" />
        {/* protective dome */}
        <path d={`M 90 830 A 430 ${430 * dome} 0 0 1 950 830`} fill="rgba(167,184,159,0.16)" stroke={C.sage} strokeWidth={5} strokeDasharray="14 10" />
        {/* raw CSI particles bounce inside */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (f / (26 + (i % 5) * 6) + i * 1.3) % (Math.PI * 2);
          const r = 140 + (i % 4) * 50;
          const x = 520 + Math.cos(a) * r;
          const y = 690 - Math.abs(Math.sin(a)) * r * 0.7;
          return <circle key={i} cx={x} cy={y} r={7} fill={C.teal} opacity={0.75 * dome} />;
        })}
        {/* conversation bubbles drift out to the cloud */}
        {[0, 1, 2].map((i) => {
          const t = ((f - 40 - i * 22) / 70) % 1;
          if (f < 40 + i * 22 || t < 0) return null;
          const x = 900 + t * 360;
          const y = 520 - Math.sin(t * Math.PI) * 120 - t * 120;
          return (
            <g key={i} transform={`translate(${x} ${y})`} opacity={1 - Math.max(0, t - 0.8) * 5}>
              <rect x={-30} y={-20} width={60} height={40} rx={14} fill={C.dusty} />
              <path d="M -10 20 L -16 32 L 4 20 Z" fill={C.dusty} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 420, top: 560 }}>
        <WispSense id="s7d" height={200} yaw={-0.35} led={0.9} shadow={false} />
      </div>
      <div style={{ position: "absolute", left: 130, top: 120, width: 820 }}>
        <Kinetic text="Raw sensing data stays at home." at={8} size={66} width={820} accent={["home"]} />
      </div>
      <div style={{ position: "absolute", left: 200, top: 880, display: "flex", gap: 14 }}>
        <Pop at={50}>
          <Chip size={26}>Processed on this machine</Chip>
        </Pop>
        <Pop at={62}>
          <Chip size={26}>Baseline encrypted</Chip>
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 1320, top: 230, width: 520 }}>
        <Slide at={36} dx={120} dy={0}>
          <div style={{ padding: "34px 36px", borderRadius: 36, background: C.dustyBg, border: `3px solid ${C.dusty}` }}>
            <Icon name="cloud" size={80} color="#3D5A78" />
            <div style={{ fontFamily: SERIF, fontSize: 46, color: "#3D5A78", marginTop: 10 }}>Cloud language model</div>
            <div style={{ fontFamily: SANS, fontSize: 28, fontWeight: 500, color: C.ink, marginTop: 10, lineHeight: 1.35 }}>May see the conversation text and a short summary — never raw CSI.</div>
          </div>
        </Slide>
      </div>
      <div style={{ position: "absolute", left: 1320, top: 760 }}>
        <Pop at={90}>
          <Tag tone="illus">WISP Sense shown as a design concept</Tag>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* c · on demand, no camera, consent to share */
const Badges: React.FC = () => {
  const f = useCurrentFrame();
  const toggle = sp(f, 150, { damping: 12, stiffness: 200 });
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={21} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 110, display: "flex", justifyContent: "center", gap: 40 }}>
        {[
          { icon: "pause" as const, t: "User-started", d: "only on demand" },
          { icon: "eye" as const, t: "No camera", d: "Wi-Fi signals only" },
          { icon: "heart" as const, t: "Nothing to wear", d: "no wearables" },
        ].map((b, i) => (
          <Pop key={b.t} at={6 + i * 10}>
            <div style={{ width: 460, padding: "38px 34px", borderRadius: 40, background: C.card, border: `3px solid ${C.sageDeep}`, textAlign: "center", boxShadow: "0 30px 60px -36px rgb(24 60 49 / .45)" }}>
              <div style={{ width: 110, height: 110, borderRadius: 99, background: C.paleSage, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                <Icon name={b.icon} size={64} color={C.forest} draw={map(f, 10 + i * 10, 30 + i * 10)} />
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 46, color: C.forest, marginTop: 18, whiteSpace: "nowrap" }}>{b.t}</div>
              <div style={{ fontFamily: SANS, fontSize: 28, fontWeight: 600, color: C.inkSoft }}>{b.d}</div>
            </div>
          </Pop>
        ))}
      </div>
      <div style={{ position: "absolute", left: 360, top: 620, width: 1200 }}>
        <Slide at={110} dx={0} dy={100}>
          <div style={{ display: "flex", alignItems: "center", gap: 30, padding: "34px 40px", borderRadius: 36, background: C.card, border: `2px solid ${C.line}`, boxShadow: "0 30px 60px -36px rgb(24 60 49 / .45)" }}>
            <Icon name="people" size={76} color={C.forest} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontSize: 36, fontWeight: 800, color: C.forest }}>Share with a caregiver?</div>
              <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 500, color: C.inkSoft, marginTop: 4 }}>Only with her consent, after a preview of the exact text.</div>
            </div>
            <div style={{ width: 130, height: 70, borderRadius: 99, background: toggle > 0.5 ? C.forest : C.sageDeep, position: "relative", flex: "none" }}>
              <div style={{ position: "absolute", top: 7, left: 7 + toggle * 60, width: 56, height: 56, borderRadius: 99, background: "#fff" }} />
            </div>
          </div>
        </Slide>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 880, display: "flex", justifyContent: "center", opacity: map(f, 170, 184) }}>
        <Chip size={24} fg={C.inkSoft}>
          Minimal by default · delivery is simulated in the prototype
        </Chip>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 7 — Privacy and trust (4:00–4:20). */
export const S7: React.FC = () => (
  <Shots
    shots={[
      { sec: 3.5, C: Statement },
      { sec: 7.3, C: Dome, t: { kind: "iris" }, tf: 14 },
      { sec: 9.2, C: Badges, t: { kind: "slide", dir: "from-right" }, tf: 12 },
    ]}
  />
);
