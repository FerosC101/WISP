import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { map } from "../anim";
import { Tag } from "../components/Card";
import { TanSide, Walker } from "../components/Characters";
import { Icon } from "../components/Icons";
import { Blobs, Burst, Chip, Float3D, Kinetic, Pop, Slide, sp } from "../components/Motion";
import { Phone } from "../components/Phone";
import { SensingRoom, SideChair } from "../components/Rooms";
import { Shots } from "../components/Shots";
import { Signal } from "../components/Signal";
import { C, SANS, SERIF, s } from "../theme";
import { FaceCircle } from "./S1";

const EmergencyCard: React.FC<{ at: number; width?: number }> = ({ at, width = 760 }) => (
  <Slide at={at} dx={0} dy={120}>
    <div style={{ width, padding: "40px 44px", borderRadius: 38, background: C.redBg, border: "3px solid #E2B3AB", boxShadow: "0 30px 60px -34px rgb(143 47 36 / .5)" }}>
      <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 800, letterSpacing: "0.14em", color: C.redDeep }}>YOUR NEXT STEP</div>
      <div style={{ fontFamily: SERIF, fontSize: 72, color: C.redDeep, marginTop: 8, lineHeight: 1.05 }}>This needs help now.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 22 }}>
        <div style={{ padding: "14px 26px", borderRadius: 99, background: C.red, color: "#fff", fontFamily: SANS, fontSize: 30, fontWeight: 800 }}>Call 995</div>
        <div style={{ fontFamily: SANS, fontSize: 28, fontWeight: 650, color: C.ink }}>or go to the nearest A&amp;E</div>
      </div>
    </div>
  </Slide>
);

/* A1 · Mr Lim — the movement check is locked before it starts */
const LimIntro: React.FC = () => {
  const f = useCurrentFrame();
  const slam = sp(f, 100, { damping: 8, stiffness: 260 });
  const shake = f > 100 && f < 116 ? Math.sin(f * 2.4) * (116 - f) * 0.9 : 0;
  return (
    <AbsoluteFill style={{ background: "#F7E9E3" }}>
      <Blobs colors={["#F3D9D2", "#F6E7C8"]} seed={17} />
      <div style={{ position: "absolute", left: 110, top: 200 }}>
        <FaceCircle who="lim" size={620} bg="#EFD3CB" expr="worried" pose="temple" tilt={-6} look={0.2} f0={100} />
      </div>
      <div style={{ position: "absolute", left: 130, top: 860 }}>
        <Pop at={10}>
          <Chip size={30} fg={C.inkSoft}>
            Mr Lim, 72 · fictional persona
          </Chip>
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 830, top: 130, width: 960 }}>
        <Slide at={6} dx={80} dy={0}>
          <div style={{ padding: "28px 34px", borderRadius: 34, borderBottomLeftRadius: 8, background: C.card, border: `2px solid ${C.line}`, fontFamily: SANS, fontSize: 40, lineHeight: 1.3, fontWeight: 500, color: C.ink, boxShadow: "0 20px 40px -24px rgb(36 53 47 / .5)" }}>
            “This morning I suddenly felt dizzy, and my left hand feels clumsy.”
          </div>
        </Slide>
      </div>
      <div style={{ position: "absolute", left: 830, top: 470, width: 960, transform: `translateX(${shake}px)` }}>
        <Pop at={60}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "28px 34px", borderRadius: 30, background: C.card, border: `3px dashed ${slam > 0.5 ? "#D9A39A" : C.sageDeep}`, opacity: 1 - slam * 0.25 }}>
            <Icon name="chair" size={60} color={C.inkFaint} />
            <Icon name="waves" size={60} color={C.inkFaint} />
            <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 650, color: C.inkSoft, textDecoration: slam > 0.5 ? "line-through" : "none" }}>Movement check</div>
          </div>
        </Pop>
      </div>
      <div style={{ position: "absolute", left: 1590, top: 430, transform: `scale(${slam * 1.0}) rotate(${(1 - slam) * -40}deg)`, opacity: Math.min(1, slam * 2) }}>
        <div style={{ width: 170, height: 170, borderRadius: 99, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 40px -16px rgb(143 47 36 / .6)" }}>
          <Icon name="lock" size={100} color="#fff" />
        </div>
      </div>
      <Burst at={100} x={1675} y={515} color={C.red} size={130} />
      <div style={{ position: "absolute", left: 830, top: 680 }}>
        <Kinetic text="Sensing locked. Emergency care comes first." at={112} size={58} color={C.redDeep} width={980} accent={["first"]} accentColor={C.redDeep} marker="#E2B3AB" />
      </div>
    </AbsoluteFill>
  );
};

/* A2 · the emergency recommendation */
const LimCard: React.FC = () => (
  <AbsoluteFill style={{ background: "#F7E9E3" }}>
    <Blobs colors={["#F3D9D2", "#FBEDE9"]} seed={18} />
    <div style={{ position: "absolute", left: 140, top: 250 }}>
      <EmergencyCard at={2} width={880} />
      <div style={{ marginTop: 26 }}>
        <Pop at={30}>
          <Chip size={28} fg={C.redDeep} border="#E2B3AB">
            No chair. No sensing. Straight to help.
          </Chip>
        </Pop>
      </div>
    </div>
    <Float3D at={4} ry={-14} style={{ position: "absolute", left: 1290, top: 90 }}>
      <Phone width={400} shots={[{ src: "lim_02_complete" }]} />
    </Float3D>
    <div style={{ position: "absolute", left: 1350, top: 990 }}>
      <Tag tone="real">Real app screen</Tag>
    </div>
  </AbsoluteFill>
);

/* B · Mdm Siti — yesterday's normal result is pushed aside by today's warning sign */
const Siti: React.FC = () => {
  const f = useCurrentFrame();
  const push = sp(f, 70, { damping: 16 });
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Blobs seed={19} colors={[C.paleSage, C.redBg]} />
      <div style={{ position: "absolute", left: 120, top: 70 }}>
        <Pop at={2}>
          <Chip size={28} fg={C.inkSoft}>
            Mdm Siti, 80 · fictional persona
          </Chip>
        </Pop>
      </div>
      {/* yesterday */}
      <div style={{ position: "absolute", left: 120 - push * 60, top: 180, width: 760, transform: `scale(${1 - push * 0.16}) rotate(${-push * 4}deg)`, transformOrigin: "0 50%", opacity: 1 - push * 0.55, filter: `saturate(${1 - push * 0.7}) blur(${push * 2}px)` }}>
        <Slide at={4} dx={-120} dy={0}>
          <div style={{ display: "flex", gap: 26, alignItems: "center", padding: 34, borderRadius: 36, background: C.card, border: `2px solid ${C.line}` }}>
            <FaceCircle who="siti" size={230} expr="calm" pose="lap" f0={50} tilt={0} look={0} />
            <div>
              <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 800, letterSpacing: "0.14em", color: C.inkFaint }}>YESTERDAY</div>
              <div style={{ fontFamily: SERIF, fontSize: 44, color: C.forest, marginTop: 8, lineHeight: 1.1 }}>Movement within her usual range</div>
              <div style={{ fontFamily: SANS, fontSize: 26, color: C.inkSoft, marginTop: 8 }}>Home monitoring · re-check tomorrow</div>
            </div>
          </div>
        </Slide>
      </div>
      {/* today slams over it */}
      <div style={{ position: "absolute", left: 760, top: 300, width: 1040 }}>
        <Slide at={60} dx={700} dy={0} rot={6}>
          <div style={{ display: "flex", gap: 26, alignItems: "center", padding: 34, borderRadius: 36, background: C.card, border: "3px solid #E2B3AB", boxShadow: "0 40px 80px -40px rgb(143 47 36 / .45)" }}>
            <FaceCircle who="siti" size={250} expr="puzzled" pose="cheek" bg="#F3E5DE" f0={120} tilt={5} look={-0.6} />
            <div>
              <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 800, letterSpacing: "0.14em", color: C.redDeep }}>TODAY</div>
              <div style={{ fontFamily: SERIF, fontSize: 44, color: C.ink, marginTop: 8, lineHeight: 1.2 }}>“My daughter said I seemed confused last night.”</div>
            </div>
          </div>
        </Slide>
      </div>
      <div style={{ position: "absolute", left: 1220, top: 690 }}>
        <Pop at={110}>
          <div style={{ padding: "18px 30px", borderRadius: 99, background: C.red, color: "#fff", fontFamily: SANS, fontSize: 34, fontWeight: 800, transform: "rotate(-3deg)" }}>This needs help now.</div>
        </Pop>
      </div>
      <Burst at={112} x={1440} y={730} color={C.red} size={150} />
      <div style={{ position: "absolute", left: 120, top: 840 }}>
        <Kinetic text="A previous normal result can’t override new warning signs." at={150} size={58} width={1700} accent={["new", "warning", "signs"]} accentColor={C.redDeep} marker="#E2B3AB" />
      </div>
    </AbsoluteFill>
  );
};

/* C · someone walks through — the reading is discarded, WISP abstains */
const Unreliable: React.FC = () => {
  const f = useCurrentFrame();
  const walk = map(f, s(1.0), s(5.6), 0, 1);
  const noise = map(f, s(1.8), s(2.6)) * (1 - map(f, s(5.6), s(6.4)));
  const discard = sp(f, s(5.2), { damping: 9, stiffness: 240 });
  const p = 0.5 - 0.5 * Math.cos(Math.max(0, f - 10) / 22);
  const card = sp(f, s(6.6), { damping: 16 });
  return (
    <AbsoluteFill>
      <SensingRoom senseLed={0.8} over={<Signal f={f} on={1 - Math.min(1, discard) * 0.85} bend={p} noise={noise} personX={880} />}>
        <SideChair />
        <TanSide p={p * (1 - Math.min(1, discard))} f={f} seed={3} />
        {walk > 0 && walk < 1 && (
          <g transform={`translate(${520 - walk * 1000} 40) scale(0.98)`} opacity={0.92}>
            <Walker phase={f / 4.2} />
          </g>
        )}
      </SensingRoom>
      <div style={{ position: "absolute", left: 90, top: 70 }}>
        <Kinetic text="Someone else moves through the room." at={4} size={58} width={1500} />
      </div>
      <div style={{ position: "absolute", left: 1000, top: 290, transform: `scale(${discard}) rotate(${-6 + (1 - discard) * 20}deg)`, opacity: Math.min(1, discard * 2) }}>
        <div style={{ padding: "18px 30px", borderRadius: 18, border: `5px solid ${C.slate}`, color: C.slate, fontFamily: SANS, fontSize: 40, fontWeight: 900, letterSpacing: "0.08em", background: "rgba(238,236,228,0.92)" }}>READING DISCARDED</div>
      </div>
      <div style={{ position: "absolute", left: 980, top: 400, width: 840, transform: `translateY(${(1 - card) * 500}px)`, opacity: Math.min(1, card * 1.5) }}>
        <div style={{ padding: "40px 44px", borderRadius: 38, background: C.slateBg, border: "3px solid #D7D3C7", boxShadow: "0 30px 60px -34px rgb(24 60 49 / .5)" }}>
          <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 800, letterSpacing: "0.14em", color: C.slate }}>YOUR NEXT STEP</div>
          <div style={{ fontFamily: SERIF, fontSize: 62, color: C.slate, marginTop: 8, lineHeight: 1.05 }}>I can’t safely judge this from here.</div>
          <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.ink, marginTop: 16, lineHeight: 1.35 }}>Please speak with your family doctor or a nurse today.</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 60, bottom: 30, opacity: map(f, 20, 34) }}>
        <Tag tone="synthetic">Illustration · automatic passer-by detection is experimental</Tag>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 5 — When WISP must not rely on sensing (2:45–3:20). */
export const S5: React.FC = () => (
  <Shots
    shots={[
      { sec: 7.4, C: LimIntro },
      { sec: 5.1, C: LimCard, t: { kind: "slide", dir: "from-bottom" }, tf: 12 },
      { sec: 10.0, C: Siti, t: { kind: "wipe", dir: "from-right" }, tf: 14 },
      { sec: 12.5, C: Unreliable, t: { kind: "iris" }, tf: 16 },
    ]}
  />
);
