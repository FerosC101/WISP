import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { inOut, map } from "../anim";
import { Seated } from "../components/Characters";
import { Insert } from "../components/Insert";
import { Blobs, Cam, Chip, Dust, Kinetic, Pop, Rays, sp } from "../components/Motion";
import { LivingRoom } from "../components/Rooms";
import { Shots } from "../components/Shots";
import { SenseTag, WispSense } from "../components/WispSense";
import { C, s } from "../theme";

/* a · home: Mdm Tan and her daughter look at the next step together */
const Home: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Cam dur={s(6.3)} from={1} to={1.08} origin="45% 50%">
        <LivingRoom seat="sofa" cx={900} cam={{ x: -40, y: 40, z: 1.22 }}>
          <div style={{ position: "absolute", left: 560, top: 300 }}>
            <Seated who="tan" f={f + 300} expr="calm" pose="phone" look={0.5} tilt={6} seed={9} />
          </div>
          <div style={{ position: "absolute", left: 870, top: 296 }}>
            <Seated who="daughter" f={f} expr="smile" pose="lap" look={-0.7} tilt={-8} seed={10} />
          </div>
          <div style={{ position: "absolute", left: 1352, top: 506 }}>
            <WispSense id="s9room" height={150} yaw={-0.6} led={0.5} shadow={false} />
          </div>
        </LivingRoom>
        <Rays />
        <Dust />
      </Cam>
      <div style={{ position: "absolute", left: 110, top: 100 }}>
        <Pop at={30}>
          <Chip size={30} bg={C.amberBg} fg={C.amberText} border="#EBCF95">
            Next step: see a GP or polyclinic today
          </Chip>
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 110, top: 190 }}>
        <Pop at={60}>
          <Chip size={26} fg={C.inkSoft}>
            Shared with her daughter — with her consent
          </Chip>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* b · the line */
const Line: React.FC = () => (
  <AbsoluteFill style={{ background: C.ivory }}>
    <Blobs seed={24} />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 20 }}>
      <Kinetic text="When someone says “I feel weak,”" at={2} size={100} align="center" width={1700} accent={["weak"]} />
      <Kinetic text="the question isn’t just what they feel." at={50} size={84} align="center" width={1700} italic color={C.tealText} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/* c · end card (HyperFrames) with the WISP Sense hero composited on the right */
const End: React.FC = () => {
  const f = useCurrentFrame();
  const k = sp(f, 12, { damping: 16, stiffness: 60 });
  return (
    <Insert name="endcard">
      <div style={{ position: "absolute", left: 1300, top: 230, transform: `translateY(${(1 - k) * 120}px)`, opacity: Math.min(1, k * 1.4) }}>
        <WispSense id="s9hero" height={560} yaw={map(f, 0, s(9), -1.1, -0.2, inOut)} led={0.6 + 0.4 * Math.sin(f / 12)} shadow={false} />
      </div>
      <div style={{ position: "absolute", left: 1340, top: 880, opacity: map(f, 40, 54) }}>
        <SenseTag dark short />
      </div>
    </Insert>
  );
};

/** Scene 9 — Closing (4:40–5:00). The end card is a HyperFrames insert. */
export const S9: React.FC = () => (
  <Shots
    shots={[
      { sec: 6.3, C: Home },
      { sec: 4.7, C: Line, t: { kind: "zoom" }, tf: 12 },
      { sec: 9.0, C: End, t: { kind: "blob", color: C.deep, x: 1920, y: 1080 }, tf: 18 },
    ]}
  />
);
