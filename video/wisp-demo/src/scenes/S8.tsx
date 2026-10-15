import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { inOut, map } from "../anim";
import { Icon } from "../components/Icons";
import { Blobs, Chip, Kinetic, Pop, sp } from "../components/Motion";
import { Shots } from "../components/Shots";
import { Layer, WispLine } from "../components/WispLine";
import { C, SANS, SERIF } from "../theme";

// Checked against README.md (status notes), hardware/esp32/README.md and docs/workbuddy/README.md.
const BUILT: [string, string][] = [
  ["Patient-facing app", "Check-in, safety screen, movement check, care plan"],
  ["Deterministic safety rules", "Named invariants with automated tests"],
  ["WorkBuddy ↔ MCP tools", "Run live for two demo scenarios"],
  ["Signal pipeline + baseline", "Working on recorded synthetic CSI"],
  ["ESP32-S3 firmware", "Builds and flashes · real capture pending"],
  ["Technical + engineering views", "Decision record, audit log, sensor data"],
];

/* a · built today */
const Built: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={22} />
      <div style={{ position: "absolute", left: 120, top: 70 }}>
        <Kinetic text="Built today: a working prototype." at={0} size={76} width={1700} accent={["working"]} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 230, display: "grid", gridTemplateColumns: "repeat(3, 540px)", gap: 30 }}>
        {BUILT.map(([t, d], i) => {
          const k = sp(f, 8 + i * 8);
          const tick = sp(f, 20 + i * 8, { damping: 9, stiffness: 260 });
          return (
            <div key={t} style={{ height: 250, borderRadius: 32, background: C.card, border: `2px solid ${C.line}`, padding: "30px 32px", boxSizing: "border-box", transform: `translateY(${(1 - k) * 80}px) scale(${0.9 + 0.1 * k})`, opacity: Math.min(1, k * 1.5), boxShadow: "0 24px 50px -34px rgb(24 60 49 / .45)", position: "relative" }}>
              <div style={{ position: "absolute", right: 26, top: 26, width: 58, height: 58, borderRadius: 99, background: C.forest, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${tick})` }}>
                <Icon name="check" size={36} color="#fff" width={3.6} />
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 40, color: C.forest, width: 400, lineHeight: 1.1 }}>{t}</div>
              <div style={{ fontFamily: SANS, fontSize: 25, fontWeight: 550, color: C.inkSoft, marginTop: 14 }}>{d}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center" }}>
        <Pop at={100}>
          <Chip size={32} bg={C.slateBg} fg={C.slate} border="#D7D3C7">
            Not a clinically validated medical device
          </Chip>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* b · the road ahead */
const NEXT = [
  { t: "Real 5xSTS captures + timing validation", x: 260, y: 640, up: true },
  { t: "Usability testing with older adults", x: 620, y: 520, up: false },
  { t: "Safety across people, homes, setups", x: 980, y: 600, up: true },
  { t: "Build + test the WISP Sense enclosure", x: 1340, y: 480, up: false },
  { t: "Clinical advisors + pilot partners", x: 1700, y: 540, up: true, hot: true },
];
const ROAD = "M 80 700 C 200 640, 220 640, 260 640 S 520 520, 620 520 S 880 600, 980 600 S 1240 480, 1340 480 S 1600 540, 1700 540 L 1860 520";
const Road: React.FC = () => {
  const f = useCurrentFrame();
  const p = map(f, 10, 300, 0, 1, inOut);
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={23} colors={["#F6E7C8", C.paleSage]} />
      <div style={{ position: "absolute", left: 120, top: 80 }}>
        <Kinetic text="Next: validate before real use." at={0} size={80} width={1700} accent={["validate"]} />
      </div>
      <Layer>
        <WispLine d={ROAD} progress={p} width={7} glow />
      </Layer>
      {NEXT.map((n, i) => {
        const reach = 10 + (n.x / 1860) * 290;
        const k = sp(f, reach, { damping: 10, stiffness: 220 });
        return (
          <React.Fragment key={n.t}>
            <div style={{ position: "absolute", left: n.x - 26, top: n.y - 26, width: 52, height: 52, borderRadius: 99, background: n.hot ? C.amber : C.card, border: `5px solid ${n.hot ? C.amberText : C.forest}`, transform: `scale(${k})` }} />
            <div style={{ position: "absolute", left: n.x - 1.5, top: n.up ? 432 : n.y + 30, width: 3, height: n.up ? n.y - 30 - 432 : 720 - (n.y + 30), background: n.hot ? C.amber : C.sageDeep, opacity: Math.min(1, k * 1.5) }} />
            <div style={{ position: "absolute", left: n.x - 160, top: n.up ? 262 : 726, width: 320, textAlign: "center", opacity: Math.min(1, k * 1.5), transform: `translateY(${(1 - k) * (n.up ? 30 : -30)}px)` }}>
              <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 800, letterSpacing: "0.12em", color: n.hot ? C.amberText : C.tealText }}>STEP {i + 1}</div>
              <div style={{ fontFamily: SERIF, fontSize: 36, color: n.hot ? C.amberText : C.forest, lineHeight: 1.12, marginTop: 6 }}>{n.t}</div>
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 900, display: "flex", justifyContent: "center", opacity: map(f, 330, 344) }}>
        <Chip size={26} fg={C.slate} bg={C.slateBg} border="#D7D3C7">
          Prototype · rule thresholds are prototype values · clinical validation required
        </Chip>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 8 — What exists today, and what comes next (4:20–4:40). */
export const S8: React.FC = () => (
  <Shots
    shots={[
      { sec: 6.2, C: Built },
      { sec: 13.8, C: Road, t: { kind: "wipe", dir: "from-left" }, tf: 14 },
    ]}
  />
);
