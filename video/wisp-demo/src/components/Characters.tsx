import React from "react";
import { blink, breathe, lerp } from "../anim";

/*
 * One illustration system for every person in the film: soft vector shapes, restrained faces,
 * adult proportions. All characters are fictional.
 *
 *  Seated (front view): Mdm Tan (78) · Mr Lim (72) · Mdm Siti (80) · Mdm Tan's daughter
 *  SideRig (side view, jointed): Mdm Tan doing the five-times sit-to-stand, and a passer-by walking.
 */

const SKIN = { tan: "#E9C6A6", lim: "#D9AE88", siti: "#C99572", daughter: "#E6BE9C" };

export type Expr = "concern" | "neutral" | "calm" | "smile" | "worried" | "puzzled";
export type Pose = "lap" | "knees" | "phone" | "chin" | "temple" | "cheek";
type Hair = "bob" | "bun" | "male" | "tudung";

type Look = {
  skin: string;
  skinShade: string;
  hair: Hair;
  hairColor: string;
  hairLight: string;
  top: string;
  topShade: string;
  inner: string; // blouse / collar / pattern colour
  lower: string;
  shoe: string;
  glasses?: boolean;
  age: number; // 0..1 how many soft age lines
};

export const LOOKS: Record<"tan" | "lim" | "siti" | "daughter", Look> = {
  // Short silver-grey hair, sage-green cardigan, warm neutral blouse.
  tan: { skin: SKIN.tan, skinShade: "#D7AA87", hair: "bob", hairColor: "#C9C5BE", hairLight: "#E6E2DB", top: "#9DB496", topShade: "#839F7C", inner: "#EADCC6", lower: "#6F6A66", shoe: "#5B4636", age: 1 },
  lim: { skin: SKIN.lim, skinShade: "#C4946D", hair: "male", hairColor: "#57534F", hairLight: "#8D8881", top: "#8EA9C7", topShade: "#7591B0", inner: "#DCE5EF", lower: "#5F6670", shoe: "#3F3530", glasses: true, age: 0.8 },
  siti: { skin: SKIN.siti, skinShade: "#B07E5C", hair: "tudung", hairColor: "#B89AA8", hairLight: "#D3BCC6", top: "#E8DCC4", topShade: "#D3C3A5", inner: "#C7A86E", lower: "#8C7F72", shoe: "#5B4636", age: 1 },
  daughter: { skin: SKIN.daughter, skinShade: "#CFA27F", hair: "bun", hairColor: "#3B302B", hairLight: "#5A4A42", top: "#8EA9C7", topShade: "#7591B0", inner: "#E7EEF5", lower: "#4F5A63", shoe: "#3F3530", age: 0 },
};

const ARMS: Record<Pose, { l: [number, number, number, number]; r: [number, number, number, number] }> = {
  // [elbowX, elbowY, handX, handY] for viewer-left (l) and viewer-right (r) arms
  lap: { l: [112, 330, 170, 392], r: [288, 330, 230, 392] },
  knees: { l: [108, 336, 150, 428], r: [292, 336, 250, 428] },
  phone: { l: [114, 334, 184, 304], r: [286, 334, 218, 304] },
  chin: { l: [112, 330, 170, 392], r: [292, 322, 230, 188] },
  temple: { l: [112, 330, 170, 392], r: [312, 270, 252, 112] },
  cheek: { l: [112, 330, 170, 392], r: [296, 318, 240, 172] },
};

function Face({ L, expr, f, seed, look }: { L: Look; expr: Expr; f: number; seed: number; look: number }) {
  const closed = blink(f, seed);
  const eyeY = 124;
  const dx = look * 3.5;
  const brow = {
    concern: ["M166 106 Q178 100 190 101", "M210 101 Q222 100 234 106"],
    worried: ["M166 108 Q178 98 190 97", "M210 97 Q222 98 234 108"],
    neutral: ["M166 104 Q178 99 190 102", "M210 102 Q222 99 234 104"],
    calm: ["M166 104 Q178 98 190 101", "M210 101 Q222 98 234 104"],
    smile: ["M166 103 Q178 97 190 100", "M210 100 Q222 97 234 103"],
    puzzled: ["M166 102 Q178 94 190 99", "M210 104 Q222 103 234 106"],
  }[expr];
  const mouth = {
    concern: "M189 160 Q200 156 211 160",
    worried: "M190 161 Q200 155 210 161",
    neutral: "M189 158 Q200 160 211 158",
    calm: "M188 157 Q200 162 212 157",
    smile: "M186 155 Q200 166 214 155",
    puzzled: "M192 159 Q201 156 209 160",
  }[expr];
  return (
    <g>
      {/* cheeks */}
      <ellipse cx={172} cy={145} rx={13} ry={8} fill="#E39E8A" opacity={0.28} />
      <ellipse cx={228} cy={145} rx={13} ry={8} fill="#E39E8A" opacity={0.28} />
      {/* eyes */}
      {closed ? (
        <g stroke="#3B2F2A" strokeWidth={2.4} strokeLinecap="round" fill="none">
          <path d={`M171 ${eyeY + 1} Q178 ${eyeY + 5} 185 ${eyeY + 1}`} />
          <path d={`M215 ${eyeY + 1} Q222 ${eyeY + 5} 229 ${eyeY + 1}`} />
        </g>
      ) : (
        <g>
          <ellipse cx={178 + dx} cy={eyeY} rx={4.6} ry={expr === "worried" ? 6 : 5.4} fill="#3B2F2A" />
          <ellipse cx={222 + dx} cy={eyeY} rx={4.6} ry={expr === "worried" ? 6 : 5.4} fill="#3B2F2A" />
          <circle cx={179.5 + dx} cy={eyeY - 2} r={1.3} fill="#fff" opacity={0.8} />
          <circle cx={223.5 + dx} cy={eyeY - 2} r={1.3} fill="#fff" opacity={0.8} />
          {/* upper lids */}
          <path d={`M170 ${eyeY - 4} Q178 ${eyeY - 9} 186 ${eyeY - 4}`} stroke="#3B2F2A" strokeWidth={1.6} fill="none" opacity={0.55} />
          <path d={`M214 ${eyeY - 4} Q222 ${eyeY - 9} 230 ${eyeY - 4}`} stroke="#3B2F2A" strokeWidth={1.6} fill="none" opacity={0.55} />
        </g>
      )}
      {/* age lines: soft, few */}
      {L.age > 0 && (
        <g stroke={L.skinShade} strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.5 * L.age}>
          <path d="M166 131 Q171 134 176 133" />
          <path d="M224 133 Q229 134 234 131" />
          <path d="M183 150 Q181 156 184 162" />
          <path d="M217 150 Q219 156 216 162" />
          <path d="M184 92 Q200 89 216 92" />
        </g>
      )}
      <g stroke={L.hair === "male" ? "#4A403A" : "#6E5A4E"} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.85}>
        <path d={brow[0]} />
        <path d={brow[1]} />
      </g>
      {/* nose */}
      <path d="M201 128 Q197 140 196 143 Q200 146 205 143" stroke={L.skinShade} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <path d={mouth} stroke="#9A5C4E" strokeWidth={3} strokeLinecap="round" fill="none" />
      {L.glasses && (
        <g stroke="#3D3A36" strokeWidth={2.4} fill="rgba(255,255,255,0.08)">
          <rect x={163} y={112} width={30} height={23} rx={9} />
          <rect x={207} y={112} width={30} height={23} rx={9} />
          <path d="M193 121 Q200 117 207 121" fill="none" />
        </g>
      )}
    </g>
  );
}

function HairBack({ L }: { L: Look }) {
  switch (L.hair) {
    case "bob":
      return (
        <g>
          <path d="M132 166 C120 98 144 40 200 38 C256 40 280 98 268 166 C264 182 244 184 240 168 L160 168 C156 184 136 182 132 166 Z" fill="#ABA69F" />
          <path d="M136 156 C126 96 148 44 200 42 C252 44 274 96 264 156 C258 168 246 168 242 158 L158 158 C154 168 142 168 136 156 Z" fill={L.hairColor} />
        </g>
      );
    case "bun":
      return (
        <g fill={L.hairColor}>
          <circle cx={200} cy={52} r={26} />
          <path d="M146 140 C138 92 158 58 200 56 C242 58 262 92 254 140 Z" />
        </g>
      );
    case "male":
      return null;
    case "tudung":
      return (
        <path
          d="M128 170 C116 92 146 40 200 38 C254 40 284 92 272 170 C290 200 316 222 320 262 L80 262 C84 222 110 200 128 170 Z"
          fill={L.hairColor}
        />
      );
  }
}

function HairFront({ L }: { L: Look }) {
  switch (L.hair) {
    case "bob":
      return (
        <g>
          <path d="M148 122 C144 80 174 56 210 58 C240 60 258 84 254 124 C246 98 232 86 216 82 C198 96 176 104 148 122 Z" fill={L.hairColor} />
          <path d="M162 98 C176 80 196 70 216 70" stroke={L.hairLight} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.9} />
          <path d="M226 74 C240 82 248 96 250 112" stroke={L.hairLight} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.7} />
        </g>
      );
    case "bun":
      return <path d="M150 116 C148 78 176 62 202 62 C232 62 254 80 252 116 C238 96 222 86 200 84 C182 86 164 96 150 116 Z" fill={L.hairColor} />;
    case "male":
      return (
        <g>
          <path d="M150 112 C146 70 172 56 202 56 C232 56 256 72 252 112 C246 92 236 84 222 82 C208 86 186 84 170 88 C160 94 154 102 150 112 Z" fill={L.hairColor} />
          <path d="M172 72 C188 64 214 64 232 70" stroke={L.hairLight} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />
        </g>
      );
    case "tudung":
      return (
        <g>
          {/* fabric framing the face */}
          <path d="M146 128 C142 78 172 56 200 56 C228 56 258 78 254 128 C250 98 230 80 200 80 C170 80 150 98 146 128 Z" fill={L.hairColor} />
          <path d="M150 152 C156 190 180 204 200 204 C220 204 244 190 250 152 C254 176 252 196 238 212 C224 226 176 226 162 212 C148 196 146 176 150 152 Z" fill={L.hairColor} />
          <path d="M160 84 C176 70 222 70 240 84" stroke={L.hairLight} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />
        </g>
      );
  }
}

/**
 * A seated person, front view, in a 400×600 box (hips at y≈400). Animate with f (frame) for breath and blinks.
 */
export const Seated: React.FC<{
  who: keyof typeof LOOKS;
  f: number;
  expr?: Expr;
  pose?: Pose;
  look?: number;
  tilt?: number;
  lean?: number;
  seed?: number;
  legs?: boolean;
  width?: number;
  phoneGlow?: number;
  /** Blend the arms toward a second pose (0→1) so gestures move instead of cutting. */
  pose2?: Pose;
  mix?: number;
}> = ({ who, f, expr = "neutral", pose = "lap", look = 0, tilt = 0, lean = 0, seed = 0, legs = true, width = 400, phoneGlow = 1, pose2, mix = 0 }) => {
  const L = LOOKS[who];
  const b = breathe(f + seed * 11, 1.6, 140);
  const m = pose2 ? Math.max(0, Math.min(1, mix)) : 0;
  const blendArm = (a: number[], c: number[]) => a.map((v, i) => lerp(v, c[i], m)) as [number, number, number, number];
  const arms = pose2 ? { l: blendArm(ARMS[pose].l, ARMS[pose2].l), r: blendArm(ARMS[pose].r, ARMS[pose2].r) } : ARMS[pose];
  const shownPose = m > 0.5 && pose2 ? pose2 : pose;
  const id = `${who}${seed}`;
  const topY = 400;
  const arm = (side: "l" | "r") => {
    const [ex, ey, hx, hy] = arms[side];
    const sx = side === "l" ? 126 : 274;
    return (
      <g key={side}>
        <path d={`M${sx} 246 Q${ex} ${ey - 40} ${ex} ${ey} Q${(ex + hx) / 2} ${(ey + hy) / 2 + 8} ${hx} ${hy}`} stroke={L.top} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={`M${sx} 246 Q${ex} ${ey - 40} ${ex} ${ey}`} stroke={L.topShade} strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.35} transform={`translate(${side === "l" ? -12 : 12} 0)`} />
        <ellipse cx={hx} cy={hy} rx={15} ry={13} fill={L.skin} />
        <ellipse cx={hx} cy={hy - 9} rx={17} ry={5} fill={L.inner} opacity={0.9} />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 400 600" width={width} height={width * 1.5} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`top-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={L.topShade} />
          <stop offset="0.35" stopColor={L.top} />
          <stop offset="1" stopColor={L.top} />
        </linearGradient>
      </defs>
      {/* legs */}
      {legs && (
        <g>
          <path d="M120 386 H280 C292 386 296 398 294 412 L286 446 H114 L106 412 C104 398 108 386 120 386 Z" fill={L.lower} />
          <rect x={128} y={432} width={60} height={124} rx={22} fill={L.lower} />
          <rect x={212} y={432} width={60} height={124} rx={22} fill={L.lower} />
          <path d="M150 450 V552 M250 450 V552" stroke="#000" strokeOpacity={0.08} strokeWidth={3} />
          <ellipse cx={158} cy={438} rx={38} ry={22} fill={L.lower} />
          <ellipse cx={242} cy={438} rx={38} ry={22} fill={L.lower} />
          <path d="M126 400 Q200 392 274 400" stroke="#fff" strokeOpacity={0.08} strokeWidth={10} fill="none" />
          <ellipse cx={156} cy={560} rx={36} ry={14} fill={L.shoe} />
          <ellipse cx={244} cy={560} rx={36} ry={14} fill={L.shoe} />
        </g>
      )}
      <g transform={`translate(0 ${lean * 10}) rotate(${lean * 2} 200 ${topY}) translate(200 ${topY}) scale(${1 + lean * 0.03}) translate(-200 -${topY})`}>
        <g transform={`translate(0 ${b * 0.4})`}>
          <HairBack L={L} />
          {/* torso */}
          <path d={`M120 252 C122 216 154 203 186 199 L214 199 C246 203 278 216 280 252 L292 ${topY + 8} L108 ${topY + 8} Z`} fill={`url(#top-${id})`} />
          {L.hair === "tudung" ? (
            <g fill={L.inner} opacity={0.75}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <circle key={i} cx={130 + ((i * 47) % 150)} cy={290 + ((i * 31) % 90)} r={4} />
              ))}
            </g>
          ) : L.hair === "male" ? (
            <path d="M172 198 L200 236 L228 198 L214 196 L200 214 L186 196 Z" fill={L.inner} />
          ) : (
            <g>
              <path d={`M180 198 L220 198 L214 ${topY + 8} L186 ${topY + 8} Z`} fill={L.inner} />
              <path d={`M182 198 L190 ${topY + 8} M218 198 L210 ${topY + 8}`} stroke={L.topShade} strokeWidth={4} />
              {L.hair === "bob" && [270, 316, 362].map((y) => <circle key={y} cx={190} cy={y} r={4} fill="#EFE6D6" />)}
            </g>
          )}
          {/* neck */}
          <path d="M184 168 V202 Q200 212 216 202 V168 Z" fill={L.skin} />
          <path d="M184 186 Q200 196 216 186 V178 H184 Z" fill={L.skinShade} opacity={0.45} />
        </g>
        {arm("l")}
        {shownPose !== "phone" && arm("r")}
        {shownPose === "phone" && (
          <g>
            <g transform="rotate(-8 200 282)">
              <rect x={176} y={238} width={50} height={86} rx={9} fill="#26302C" />
              <rect x={180} y={243} width={42} height={76} rx={6} fill="#F4F0E4" opacity={phoneGlow} />
              <path d="M186 262 C196 256 206 266 216 258" stroke="#A7B89F" strokeWidth={2.4} fill="none" opacity={phoneGlow} />
              <rect x={186} y={278} width={30} height={5} rx={2} fill="#2F4F3E" opacity={0.6 * phoneGlow} />
              <rect x={186} y={290} width={22} height={5} rx={2} fill="#A7B89F" opacity={phoneGlow} />
            </g>
            {arm("r")}
          </g>
        )}
        {/* head */}
        <g transform={`translate(0 ${b * 0.6}) rotate(${tilt} 200 170)`}>
          {L.hair === "male" && (
            <g fill={L.skin}>
              <ellipse cx={149} cy={128} rx={9} ry={14} />
              <ellipse cx={251} cy={128} rx={9} ry={14} />
            </g>
          )}
          <path d="M150 112 C150 66 250 66 250 112 C250 160 228 188 200 188 C172 188 150 160 150 112 Z" fill={L.skin} />
          <path d="M236 92 C252 118 248 160 214 184 C232 160 240 128 236 92 Z" fill={L.skinShade} opacity={0.35} />
          <Face L={L} expr={expr} f={f} seed={seed} look={look} />
          <HairFront L={L} />
        </g>
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------------------------------ */
/* Side-view rig: ankle at (0,0), y up is negative. p: 0 = seated, 1 = standing.              */
/* ------------------------------------------------------------------------------------------ */

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (o: [number, number], len: number, deg: number): [number, number] => [o[0] + len * Math.cos(rad(deg)), o[1] - len * Math.sin(rad(deg))];
const smooth = (t: number) => t * t * (3 - 2 * t);

export const SHIN = 120;
export const THIGH = 118;
export const TRUNK = 150;
/** Hip position when seated — use it to place the chair. */
export const HIP_SIT = (() => {
  const k = pt([0, 0], SHIN, 96);
  return pt(k, THIGH, 180);
})();

/** Mdm Tan in side view. `arms`: "crossed" (standard 5xSTS) or "push" (pushing up with her hands). */
export const TanSide: React.FC<{ p: number; f: number; arms?: "crossed" | "push"; seed?: number; ghost?: number }> = ({ p, f, arms = "crossed", seed = 0, ghost = 0 }) => {
  const L = LOOKS.tan;
  const e = smooth(Math.max(0, Math.min(1, p)));
  const shinA = lerp(96, 92, e);
  const thighA = lerp(180, 92, e);
  const trunkA = lerp(98, 90, e) - 44 * Math.sin(Math.PI * Math.min(1, e * 1.12));
  const K = pt([0, 0], SHIN, shinA);
  const Hp = pt(K, THIGH, thighA);
  const S = pt(Hp, TRUNK, trunkA);
  const headTilt = (90 - trunkA) * 0.55;
  const N = pt(S, 30, trunkA - headTilt * 0.4);
  const fw = (o: [number, number], along: number, fwd: number): [number, number] => {
    const a = pt(o, along, trunkA);
    return [a[0] + fwd * Math.cos(rad(trunkA - 90)), a[1] - fwd * Math.sin(rad(trunkA - 90))];
  };
  let elbow: [number, number], hand: [number, number];
  if (arms === "push") {
    hand = [K[0] - 18 + (Hp[0] - K[0]) * 0.25, K[1] - 14 + (Hp[1] - K[1]) * 0.25];
    elbow = [(S[0] + hand[0]) / 2 - 14, (S[1] + hand[1]) / 2];
  } else {
    elbow = fw(Hp, TRUNK * 0.48, 36);
    hand = fw(Hp, TRUNK * 0.74, 30);
  }
  const blinkNow = blink(f, seed + 3);
  const leg = (dx: number, col: string) => (
    <g transform={`translate(${dx} 0)`}>
      <path d={`M${Hp[0]} ${Hp[1]} L${K[0]} ${K[1]} L0 -6`} stroke={col} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M-14 0 L40 0 C42 -12 30 -18 16 -18 L-12 -18 Z" fill={L.shoe} />
    </g>
  );
  return (
    <g opacity={1 - ghost * 0.65}>
      {leg(-8, "#5E5A56")}
      {/* far arm */}
      <path d={`M${S[0]} ${S[1] + 8} L${elbow[0] - 6} ${elbow[1]} L${hand[0] - 8} ${hand[1]}`} stroke={L.topShade} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={Hp[0]} cy={Hp[1]} r={30} fill={L.lower} />
      <path d={`M${Hp[0]} ${Hp[1]} L${S[0]} ${S[1]}`} stroke={L.top} strokeWidth={64} strokeLinecap="round" fill="none" />
      <path d={`M${fw(Hp, 10, 26)[0]} ${fw(Hp, 10, 26)[1]} L${fw(Hp, TRUNK - 18, 26)[0]} ${fw(Hp, TRUNK - 18, 26)[1]}`} stroke={L.inner} strokeWidth={10} strokeLinecap="round" />
      {leg(0, L.lower)}
      {/* neck + head */}
      <path d={`M${S[0]} ${S[1]} L${N[0]} ${N[1]}`} stroke={L.skin} strokeWidth={22} strokeLinecap="round" />
      <g transform={`translate(${N[0] + 4} ${N[1] - 30}) rotate(${headTilt})`}>
        <circle r={36} fill={L.skin} />
        <path d="M33 -4 Q42 4 34 10" fill={L.skin} />
        <path d="M-40 8 C-44 -32 -12 -48 14 -40 C32 -34 40 -22 36 -12 C22 -24 4 -24 -4 -12 C-8 -2 -8 12 -18 26 C-32 28 -40 20 -40 8 Z" fill={L.hairColor} />
        <path d="M-26 -20 C-14 -34 6 -38 20 -34" stroke={L.hairLight} strokeWidth={3} fill="none" strokeLinecap="round" />
        <ellipse cx={-2} cy={4} rx={6} ry={9} fill={L.skinShade} />
        {blinkNow ? <path d="M14 -4 Q19 -1 24 -4" stroke="#3B2F2A" strokeWidth={2.2} fill="none" /> : <ellipse cx={19} cy={-5} rx={3.6} ry={4.4} fill="#3B2F2A" />}
        <path d="M12 -15 Q19 -18 26 -15" stroke="#6E5A4E" strokeWidth={2.6} fill="none" strokeLinecap="round" />
        <path d="M22 18 Q28 19 32 16" stroke="#9A5C4E" strokeWidth={2.6} fill="none" strokeLinecap="round" />
        <ellipse cx={22} cy={8} rx={7} ry={4.5} fill="#E39E8A" opacity={0.3} />
      </g>
      {/* near arm */}
      <path d={`M${S[0]} ${S[1] + 10} L${elbow[0]} ${elbow[1]} L${hand[0]} ${hand[1]}`} stroke={L.top} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={hand[0]} cy={hand[1]} r={12} fill={L.skin} />
    </g>
  );
};

/** A simple person walking (side view) — used for "someone walks through". `phase` advances the stride. */
export const Walker: React.FC<{ phase: number; color?: string }> = ({ phase, color = "#7F9C9C" }) => {
  const sw = Math.sin(phase) * 24;
  const Hp: [number, number] = [0, -236];
  const leg = (a: number, col: string) => {
    const K = pt(Hp, 118, 270 + a);
    const A = pt(K, 120, 270 + a * 0.4 - Math.max(0, -a) * 0.6);
    return (
      <g>
        <path d={`M${Hp[0]} ${Hp[1]} L${K[0]} ${K[1]} L${A[0]} ${A[1]}`} stroke={col} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={`M${A[0] - 12} ${A[1] + 4} h46 c2 -10 -8 -16 -20 -16 h-24 z`} fill="#3F3530" />
      </g>
    );
  };
  const S: [number, number] = [6, -390];
  return (
    <g>
      {leg(-sw, "#4E555C")}
      <path d={`M${S[0]} ${S[1] + 10} L${S[0] - sw * 0.9} ${S[1] + 80} L${S[0] - sw * 1.1 + 6} ${S[1] + 140}`} stroke="#6A8585" strokeWidth={24} strokeLinecap="round" fill="none" />
      <path d={`M${Hp[0]} ${Hp[1]} L${S[0]} ${S[1]}`} stroke={color} strokeWidth={62} strokeLinecap="round" />
      {leg(sw, "#5F6670")}
      <circle cx={S[0] + 8} cy={S[1] - 50} r={34} fill="#D9AE88" />
      <path d="M-26 -446 C-28 -480 30 -486 42 -456 C30 -466 0 -466 -26 -446 Z" fill="#3B302B" />
      <path d={`M${S[0]} ${S[1] + 10} L${S[0] + sw * 0.9} ${S[1] + 80} L${S[0] + sw * 1.1 + 6} ${S[1] + 140}`} stroke={color} strokeWidth={24} strokeLinecap="round" fill="none" />
    </g>
  );
};
