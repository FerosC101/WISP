import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { HIP_SIT } from "./Characters";
import { WispSense } from "./WispSense";

/*
 * Illustrated environments. Everything is drawn in 1920×1080 space and split into depth layers
 * so the camera can drift with gentle 2.5D parallax.
 */

const Layer: React.FC<{ depth: number; cam: { x: number; y: number; z: number }; children: React.ReactNode }> = ({ depth, cam, children }) => {
  const k = 1 + (cam.z - 1) * depth;
  return (
    <AbsoluteFill style={{ transform: `translate(${-cam.x * depth}px, ${-cam.y * depth}px) scale(${k})`, transformOrigin: "50% 55%" }}>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ overflow: "visible" }}>
        {children}
      </svg>
    </AbsoluteFill>
  );
};

const HtmlLayer: React.FC<{ depth: number; cam: { x: number; y: number; z: number }; children: React.ReactNode }> = ({ depth, cam, children }) => {
  const k = 1 + (cam.z - 1) * depth;
  return (
    <AbsoluteFill style={{ transform: `translate(${-cam.x * depth}px, ${-cam.y * depth}px) scale(${k})`, transformOrigin: "50% 55%" }}>
      {children}
    </AbsoluteFill>
  );
};

/** Distant HDB blocks + trees seen through the window. */
const Outside: React.FC<{ warm: number }> = ({ warm }) => (
  <g>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#D8E6EC" />
        <stop offset="1" stopColor={warm > 0.5 ? "#F8EED8" : "#EEF1E8"} />
      </linearGradient>
    </defs>
    <rect x={1180} y={170} width={520} height={520} fill="url(#sky)" />
    <circle cx={1600} cy={260} r={46} fill="#F6DFA6" opacity={0.55 * warm} />
    {[
      [1200, 330, 120, "#D3DBD3"],
      [1330, 280, 100, "#CBD5CD"],
      [1450, 360, 140, "#D6DDD5"],
      [1600, 300, 90, "#CDD6CF"],
    ].map(([x, y, w, c], i) => (
      <g key={i}>
        <rect x={x as number} y={y as number} width={w as number} height={420} fill={c as string} />
        {Array.from({ length: 8 }).map((_, r) =>
          Array.from({ length: 3 }).map((__, q) => (
            <rect key={`${r}-${q}`} x={(x as number) + 14 + q * ((w as number) / 3.2)} y={(y as number) + 18 + r * 36} width={16} height={10} fill="#FFFFFF" opacity={0.5} />
          )),
        )}
      </g>
    ))}
    <g fill="#B9C8AE">
      <ellipse cx={1240} cy={650} rx={110} ry={70} />
      <ellipse cx={1380} cy={680} rx={130} ry={64} />
      <ellipse cx={1560} cy={660} rx={120} ry={76} />
      <ellipse cx={1690} cy={690} rx={90} ry={60} />
    </g>
    <g fill="#A3B798">
      <ellipse cx={1300} cy={690} rx={90} ry={44} />
      <ellipse cx={1500} cy={700} rx={110} ry={40} />
    </g>
  </g>
);

export const LivingRoom: React.FC<{
  cam?: { x: number; y: number; z: number };
  warm?: number;
  seat?: "chair" | "sofa";
  children?: React.ReactNode;
  front?: React.ReactNode;
  dim?: number;
  cx?: number;
}> = ({ cam = { x: 0, y: 0, z: 1 }, warm = 1, seat = "chair", children, front, dim = 0, cx: cxIn }) => {
  const cx = cxIn ?? (seat === "sofa" ? 900 : 860);
  const half = seat === "sofa" ? 330 : 210;
  return (
    <AbsoluteFill style={{ background: C.ivory, overflow: "hidden" }}>
      {/* back wall, window, frames */}
      <Layer depth={0.35} cam={cam}>
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F4EAD7" />
            <stop offset="1" stopColor="#ECDDC2" />
          </linearGradient>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF4D8" stopOpacity="0.85" />
            <stop offset="1" stopColor="#FFF4D8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={-200} y={-200} width={2320} height={1100} fill="url(#wall)" />
        <Outside warm={warm} />
        {/* window frame + grille */}
        <g stroke="#FBF8F0" fill="none">
          <rect x={1180} y={170} width={520} height={520} strokeWidth={22} />
          <path d="M1440 170 V690 M1180 430 H1700" strokeWidth={14} />
          <path d="M1310 170 V690 M1570 170 V690" strokeWidth={4} opacity={0.8} />
        </g>
        <rect x={1160} y={688} width={560} height={22} rx={6} fill="#E7D6B8" />
        {/* curtain */}
        <path d="M1110 150 C1130 300 1100 520 1130 720 L1180 720 L1180 150 Z" fill="#DCE3D2" />
        <path d="M1720 150 L1720 720 L1776 720 C1800 520 1770 300 1790 150 Z" fill="#DCE3D2" />
        {/* frames on the wall */}
        <g>
          <rect x={290} y={250} width={190} height={150} rx={8} fill="#FBF8F0" stroke="#C9B48F" strokeWidth={8} />
          <path d="M306 380 C340 330 370 340 400 310 C420 330 440 336 464 330 V384 H306 Z" fill="#B9C8AE" />
          <circle cx={430} cy={292} r={14} fill="#E3B567" opacity={0.7} />
          <rect x={520} y={300} width={120} height={150} rx={8} fill="#FBF8F0" stroke="#C9B48F" strokeWidth={8} />
          <circle cx={580} cy={362} r={24} fill="#D9C2A8" />
          <path d="M546 434 C552 404 608 404 614 434 Z" fill="#A7B89F" />
        </g>
        {/* shelf */}
        <rect x={250} y={560} width={300} height={14} rx={4} fill="#C9A87E" />
        <rect x={270} y={500} width={22} height={60} fill="#8EA9C7" />
        <rect x={296} y={510} width={18} height={50} fill="#E3B567" opacity={0.8} />
        <rect x={318} y={496} width={24} height={64} fill="#A7B89F" />
        <path d="M470 560 C460 520 500 510 496 480 C520 500 530 530 510 560 Z" fill="#8FAA86" />
        <rect x={470} y={540} width={44} height={22} rx={6} fill="#D9C2A8" />
        {/* sunlight falling across the room */}
        <path d="M1180 690 L1700 690 L1520 1080 L640 1080 Z" fill="url(#sun)" opacity={0.55 * warm} />
      </Layer>

      {/* floor + furniture */}
      <Layer depth={0.6} cam={cam}>
        <rect x={-200} y={820} width={2320} height={400} fill="#DBC6A4" />
        <rect x={-200} y={808} width={2320} height={16} fill="#E9DCC3" />
        <g stroke="#C9B08A" strokeWidth={2} opacity={0.6}>
          {[880, 950, 1030].map((y) => (
            <path key={y} d={`M-200 ${y} H2120`} />
          ))}
        </g>
        <ellipse cx={cx} cy={930} rx={half + 300} ry={90} fill="#DCE3D2" />
        <ellipse cx={cx} cy={930} rx={half + 260} ry={72} fill="none" stroke="#C9D4BF" strokeWidth={4} />
        {/* floor lamp */}
        <path d="M430 900 V430" stroke="#9C8462" strokeWidth={8} />
        <path d="M370 430 L490 430 L462 350 L398 350 Z" fill="#F3E3C1" />
        <ellipse cx={430} cy={900} rx={46} ry={10} fill="#9C8462" />
        {/* side table with tea */}
        <g transform={`translate(${cx + half + 120} 0)`}>
          <rect x={-70} y={690} width={140} height={16} rx={6} fill="#B88A62" />
          <path d="M-56 706 L-50 880 M56 706 L50 880" stroke="#8E6648" strokeWidth={9} />
          <path d="M-24 650 H14 V676 C14 690 -24 690 -24 676 Z" fill="#FBF8F0" stroke="#C9B48F" strokeWidth={3} />
          <path d="M14 658 C28 658 28 674 14 674" stroke="#C9B48F" strokeWidth={3} fill="none" />
          <ellipse cx={-4} cy={690} rx={30} ry={5} fill="#E7D6B8" />
          <path d="M36 690 C30 650 60 640 54 610 C74 636 78 664 60 690 Z" fill="#8FAA86" />
        </g>
        {/* chair / sofa back */}
        <rect x={cx - half - 10} y={seat === "sofa" ? 480 : 466} width={(half + 10) * 2} height={330} rx={70} fill="#E6D9C1" />
        <rect x={cx - half + 20} y={seat === "sofa" ? 500 : 488} width={(half - 20) * 2} height={290} rx={56} fill="#EDE2CD" />
        <rect x={cx - half - 60} y={610} width={110} height={250} rx={46} fill="#E2D4B9" />
        <rect x={cx + half - 50} y={610} width={110} height={250} rx={46} fill="#E2D4B9" />
        <rect x={cx - half} y={690} width={half * 2} height={110} rx={36} fill="#E9DEC9" />
        <rect x={cx - half - 50} y={790} width={(half + 50) * 2} height={70} rx={24} fill="#DCCDB0" />
        <path d={`M${cx - half - 30} 860 v34 M${cx + half + 30} 860 v34`} stroke="#8E6648" strokeWidth={12} strokeLinecap="round" />
      </Layer>

      {/* people sit between the chair and the foreground */}
      <HtmlLayer depth={0.62} cam={cam}>
        {children}
      </HtmlLayer>

      {/* foreground plant */}
      <Layer depth={1} cam={cam}>
        <g transform="translate(110 1080)">
          <path d="M-30 0 L-14 -120 H96 L112 0 Z" fill="#C9A87E" />
          {[
            [-40, -150, -40],
            [30, -260, -10],
            [110, -190, 30],
            [60, -330, 5],
            [-20, -280, -25],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path d="M0 0 C-60 -30 -50 -120 0 -150 C50 -120 60 -30 0 0 Z" fill={i % 2 ? "#7F9C78" : "#8FAA86"} />
              <path d="M0 -6 V-140" stroke="#A9BFA1" strokeWidth={3} />
            </g>
          ))}
        </g>
        {front}
      </Layer>
      {dim > 0 && <AbsoluteFill style={{ background: C.ivory, opacity: dim }} />}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------ */

export const ANKLE = { x: 960, y: 860, k: 1.25 };
/** Where the Wi-Fi link starts (router) and ends (WISP Sense) in screen space. */
export const ROUTER = { x: 1420, y: 590 };
export const SENSE = { x: 476, y: 560 };
/** Seat surface in rig units (the TanSide hip sits just above it). */
const SEAT_Y = HIP_SIT[1] + 18;

/** A side-view chair matched to the TanSide rig (same coordinate space: ankle at 0,0). */
export const SideChair: React.FC = () => (
  <g>
    <path d={`M${HIP_SIT[0] - 50} ${SEAT_Y} H${HIP_SIT[0] + 74}`} stroke="#9C7452" strokeWidth={16} strokeLinecap="round" />
    <path d={`M${HIP_SIT[0] - 44} ${SEAT_Y} V0 M${HIP_SIT[0] + 66} ${SEAT_Y} V0`} stroke="#8E6648" strokeWidth={11} strokeLinecap="round" />
    <path d={`M${HIP_SIT[0] - 50} ${SEAT_Y} L${HIP_SIT[0] - 64} ${SEAT_Y - 190}`} stroke="#8E6648" strokeWidth={12} strokeLinecap="round" />
    <path d={`M${HIP_SIT[0] - 56} ${SEAT_Y - 120} L${HIP_SIT[0] - 62} ${SEAT_Y - 176}`} stroke="#B88A62" strokeWidth={26} strokeLinecap="round" />
  </g>
);

/** The ESP32-S3 board on a small stand, USB to a laptop (the local machine). */
export const Esp32: React.FC<{ x: number; y: number; glow?: number }> = ({ x, y, glow = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-60} y={0} width={120} height={14} rx={4} fill="#B88A62" />
    <rect x={-34} y={-58} width={68} height={56} rx={6} fill="#2E4A3E" />
    <rect x={-20} y={-46} width={32} height={26} rx={3} fill="#C9CEC8" />
    <rect x={-26} y={-14} width={10} height={8} fill="#E3B567" />
    {[-30, -20, -10, 0, 10, 20].map((dx) => (
      <rect key={dx} x={dx + 2} y={-62} width={4} height={6} fill="#D6C9A8" />
    ))}
    <circle cx={22} cy={-12} r={4} fill={glow > 0 ? "#9FE0A0" : "#4E6B5E"} opacity={0.4 + glow * 0.6} />
    <path d="M34 -30 C70 -30 70 30 120 34" stroke="#55625C" strokeWidth={5} fill="none" />
  </g>
);

export const Laptop: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M-80 0 H80 L92 14 H-92 Z" fill="#8E9A94" />
    <rect x={-70} y={-96} width={140} height={96} rx={6} fill="#3A4A43" />
    <rect x={-62} y={-88} width={124} height={80} rx={3} fill="#E9EFE6" />
    <path d="M-54 -40 C-40 -60 -26 -20 -12 -44 S14 -30 22 -50 S44 -28 54 -40" stroke="#6E8F8F" strokeWidth={3} fill="none" />
  </g>
);

export const Router: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-70} y={0} width={140} height={14} rx={4} fill="#B88A62" />
    <rect x={-58} y={-40} width={116} height={40} rx={10} fill="#EFEBE2" stroke="#C9C2B4" strokeWidth={3} />
    <path d="M-40 -40 L-50 -100 M40 -40 L50 -100" stroke="#C9C2B4" strokeWidth={8} strokeLinecap="round" />
    {[-30, -16, -2].map((dx) => (
      <circle key={dx} cx={dx} cy={-20} r={3.5} fill="#A7B89F" />
    ))}
  </g>
);

/** Side-view room for the movement check. Children are drawn in rig space (ankle at 0,0). */
export const SensingRoom: React.FC<{ cam?: { x: number; y: number; z: number }; children?: React.ReactNode; over?: React.ReactNode; tone?: string; senseLed?: number }> = ({
  cam = { x: 0, y: 0, z: 1 },
  children,
  over,
  tone = "#F2E8D5",
  senseLed = 0.4,
}) => (
  <AbsoluteFill style={{ background: C.ivory, overflow: "hidden" }}>
    <Layer depth={0.4} cam={cam}>
      <rect x={-200} y={-200} width={2320} height={1080} fill={tone} />
      <rect x={140} y={170} width={300} height={360} rx={10} fill="#FBF8F0" stroke="#E7D6B8" strokeWidth={10} />
      <path d="M150 470 C220 420 300 440 430 400 V520 H150 Z" fill="#DCE3D2" />
      <rect x={1560} y={210} width={170} height={130} rx={8} fill="#FBF8F0" stroke="#C9B48F" strokeWidth={8} />
      <path d="M1574 324 C1610 286 1640 300 1716 270 V330 H1574 Z" fill="#B9C8AE" />
    </Layer>
    <Layer depth={0.7} cam={cam}>
      <rect x={-200} y={860} width={2320} height={400} fill="#DBC6A4" />
      <rect x={-200} y={848} width={2320} height={14} fill="#E9DCC3" />
      <ellipse cx={960} cy={900} rx={520} ry={40} fill="#DCE3D2" />
      {/* low cabinet: the local machine (laptop) and WISP Sense near the chair; the home router on the right */}
      <rect x={180} y={660} width={380} height={200} rx={14} fill="#CDB38D" />
      <rect x={196} y={676} width={166} height={168} rx={8} fill="#D9C2A0" />
      <rect x={378} y={676} width={166} height={168} rx={8} fill="#D9C2A0" />
      <Laptop x={290} y={646} />
      <path d="M372 632 C400 636 420 650 446 646" stroke="#55625C" strokeWidth={5} fill="none" />
      <g transform={`translate(${SENSE.x - 66} ${660 - 176})`}>
        <WispSense id="room" height={192} yaw={-0.45} led={senseLed} shadow={false} />
      </g>
      <rect x={1300} y={650} width={240} height={16} rx={6} fill="#B88A62" />
      <path d="M1320 666 L1330 860 M1520 666 L1510 860" stroke="#8E6648" strokeWidth={10} />
      <Router x={ROUTER.x} y={636} />
      <g transform={`translate(${ANKLE.x} ${ANKLE.y}) scale(${ANKLE.k})`}>{children}</g>
      {over}
    </Layer>
  </AbsoluteFill>
);
