"use client";

import { useId } from "react";

/**
 * Soft editorial illustrations, drawn as SVG with a watercolour treatment:
 * irregular edges (turbulence + displacement), gentle washes, paper grain.
 * Muted palette, rounded human proportions, multigenerational people.
 * Used sparingly, where a picture explains something.
 */

export type Scene = "rise" | "room" | "calm" | "share" | "healthy" | "rest";

const SKIN = { light: "#ecc9ad", mid: "#d4a07e", deep: "#9a6a4f" };
const C = {
  ivory: "#faf7ee",
  sand: "#efe4cf",
  sandDeep: "#e2cfac",
  sandSoft: "#f5eddd",
  sage: "#a7b89f",
  sageSoft: "#d7e1cf",
  forest: "#2f4f3e",
  teal: "#6e8f8f",
  dusty: "#8ea9c7",
  dustySoft: "#cfdbe8",
  amber: "#e3b567",
  wood: "#b88a62",
  woodDark: "#8e6648",
  hairGrey: "#cfcac2",
  hairDark: "#4a3d36",
  trouser: "#8d8a7c",
  trouserDark: "#5f6670",
};

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`wc-${id}`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="5" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation="0.5" />
      </filter>
      <filter id={`wash-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="9" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="22" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation="3" />
      </filter>
      <filter id={`grain-${id}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" />
        <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.09 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      <clipPath id={`frame-${id}`}>
        <rect x="0" y="0" width="360" height="260" rx="22" />
      </clipPath>
    </defs>
  );
}

/** Background: soft colour washes, a window or sky, and the floor. */
function Room({ id, wall = C.sandSoft, window: win = true }: { id: string; wall?: string; window?: boolean }) {
  return (
    <g>
      <rect width="360" height="260" fill={wall} />
      <g filter={`url(#wash-${id})`} opacity="0.75">
        <ellipse cx="250" cy="70" rx="120" ry="70" fill={C.sageSoft} />
        <ellipse cx="80" cy="150" rx="110" ry="80" fill={C.ivory} />
      </g>
      {win && (
        <g filter={`url(#wc-${id})`}>
          <rect x="34" y="34" width="86" height="104" rx="8" fill={C.dustySoft} />
          <path d="M34 112c18-14 34-16 52-8s24 6 34-2v32H34z" fill={C.sageSoft} />
          <circle cx="98" cy="62" r="10" fill={C.amber} opacity="0.75" />
          <path d="M77 34v104M34 86h86" stroke={C.ivory} strokeWidth="5" />
          <rect x="34" y="34" width="86" height="104" rx="8" fill="none" stroke={C.ivory} strokeWidth="6" />
        </g>
      )}
      <path d="M0 214h360v46H0z" fill={C.sand} />
      <ellipse cx="190" cy="226" rx="132" ry="15" fill={C.sandDeep} opacity="0.55" filter={`url(#wc-${id})`} />
    </g>
  );
}

function Plant({ x, y, s = 1, id }: { x: number; y: number; s?: number; id: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter={`url(#wc-${id})`}>
      <path d="M0-4c-6-26-22-38-36-44 4 18 14 34 36 44z" fill={C.sage} />
      <path d="M2-6c4-30 18-46 34-52-2 22-14 40-34 52z" fill="#8fa587" />
      <path d="M0-6c-2-24 4-46 10-60 6 22 2 42-10 60z" fill={C.sage} />
      <path d="M-14-2h30l-4 28h-22z" fill={C.amber} opacity="0.85" />
    </g>
  );
}

function Chair({ x, y, id, facing = 1 }: { x: number; y: number; id: string; facing?: 1 | -1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${facing} 1)`} filter={`url(#wc-${id})`}>
      <path d="M2-104c-3 30-4 62-4 104" stroke={C.woodDark} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M-2-104c10-4 16-2 16 6v44" stroke={C.wood} strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="-4" y="-56" width="74" height="11" rx="5" fill={C.wood} />
      <rect x="-2" y="-62" width="70" height="9" rx="4.5" fill={C.sage} />
      <path d="M64-46v46M6-46v46" stroke={C.woodDark} strokeWidth="6" strokeLinecap="round" />
    </g>
  );
}

function Grain({ id }: { id: string }) {
  return <rect width="360" height="260" fill="#fff" filter={`url(#grain-${id})`} opacity="0.9" />;
}

/* ── People ─────────────────────────────────────────────────────────────── */

/** Older woman rising from a chair, arms crossed, facing right. */
function Riser({ id }: { id: string }) {
  return (
    <g filter={`url(#wc-${id})`}>
      {/* back leg */}
      <path d="M176 150 L207 166 L203 211" stroke={C.trouserDark} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* front leg */}
      <path d="M180 152 L216 164 L214 211" stroke={C.trouser} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="221" cy="214" rx="13" ry="5" fill={C.forest} />
      <ellipse cx="208" cy="214" rx="11" ry="4.5" fill={C.forest} opacity="0.85" />
      {/* torso: cardigan leaning forward */}
      <path d="M166 152c-4-22 6-42 26-50 10-4 20-2 24 6 6 12 0 34-8 48-12 6-30 6-42-4z" fill={C.sage} />
      <path d="M200 102c4 12 2 32-6 50" stroke="#8fa587" strokeWidth="3" fill="none" opacity="0.7" />
      {/* arms crossed over chest */}
      <path d="M196 112c-8 8-10 18-4 24 8 4 18 0 24-6" stroke="#96ab8e" strokeWidth="12" strokeLinecap="round" fill="none" />
      <circle cx="220" cy="128" r="5.5" fill={SKIN.light} />
      {/* scarf */}
      <path d="M200 98c6 4 14 4 20-2" stroke={C.teal} strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* head */}
      <circle cx="214" cy="84" r="14" fill={SKIN.light} />
      <path d="M201 84c-2-14 8-24 20-22 8 2 12 8 11 14-6-6-16-6-22-2-3 2-6 6-9 10z" fill={C.hairGrey} />
      <circle cx="203" cy="72" r="6.5" fill={C.hairGrey} />
      <path d="M222 86c2 1 4 1 5 0" stroke={SKIN.deep} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
    </g>
  );
}

/** Seated person, hand resting on chest, calm. */
function Calm({ id }: { id: string }) {
  return (
    <g filter={`url(#wc-${id})`}>
      <path d="M150 160 L196 162 L194 210" stroke={C.trouserDark} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M152 156 L204 158 L206 210" stroke={C.trouser} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="212" cy="213" rx="13" ry="5" fill={C.forest} />
      <path d="M132 160c-6-26 0-58 18-68 12-6 26-4 32 6 8 14 6 42-2 62-14 8-34 8-48 0z" fill={C.dusty} />
      <path d="M150 104c6 10 10 24 8 40" stroke={C.dustySoft} strokeWidth="5" fill="none" opacity="0.8" />
      <path d="M176 104c6 8 6 18 0 26-4 4-10 6-16 4" stroke="#7e98b6" strokeWidth="12" strokeLinecap="round" fill="none" />
      <ellipse cx="158" cy="128" rx="7" ry="5.5" fill={SKIN.light} />
      <circle cx="164" cy="78" r="15" fill={SKIN.light} />
      <path d="M149 80c-4-16 6-28 20-26 10 2 16 10 14 20-4-8-14-10-22-6-6 2-10 8-12 12z" fill={C.hairGrey} />
      <path d="M150 82c-4 6-4 14 0 18" stroke={C.hairGrey} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M170 74c2-1 4-1 5 0M170 86c2 1 4 1 6 0" stroke={SKIN.deep} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
    </g>
  );
}

/** Older man and his adult daughter looking at a phone together. */
function Sharers({ id }: { id: string }) {
  return (
    <g filter={`url(#wc-${id})`}>
      {/* sofa */}
      <rect x="60" y="150" width="240" height="64" rx="22" fill={C.sandDeep} />
      <rect x="66" y="120" width="228" height="46" rx="20" fill="#d9c49d" />
      {/* older man, left */}
      <path d="M100 210c-4-30 0-60 18-74 14-10 34-8 42 4 10 16 8 46 2 70z" fill={C.teal} />
      <circle cx="140" cy="112" r="17" fill={SKIN.mid} />
      <path d="M124 110c0-14 10-22 22-20 8 2 12 8 12 14-8-6-20-4-26 0-4 2-6 4-8 6z" fill="#e6e1d8" />
      <path d="M128 120c4 10 20 12 26 2" stroke="#e6e1d8" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* younger woman, right */}
      <path d="M190 212c-6-34 0-62 16-74 14-10 34-8 42 6 8 16 6 46 0 68z" fill={C.amber} opacity="0.9" />
      <circle cx="222" cy="112" r="16" fill={SKIN.deep} />
      <path d="M204 114c-4-18 8-30 22-28 12 2 18 12 16 24-2 10-2 22 2 30-10 0-18-6-20-14 0-6-2-10-6-12-4 0-8 0-14 0z" fill={C.hairDark} />
      {/* phone between them */}
      <path d="M150 150c10-6 24-6 34 2" stroke={SKIN.mid} strokeWidth="9" strokeLinecap="round" fill="none" />
      <rect x="168" y="132" width="20" height="30" rx="4" fill={C.forest} transform="rotate(-8 178 147)" />
      <rect x="171" y="136" width="14" height="20" rx="2" fill={C.dustySoft} transform="rotate(-8 178 147)" />
      <path d="M232 150c-10-4-22-4-34 2" stroke={SKIN.deep} strokeWidth="9" strokeLinecap="round" fill="none" />
    </g>
  );
}

/** A person walking outdoors on a gentle path. */
function Walker({ id }: { id: string }) {
  return (
    <g filter={`url(#wc-${id})`}>
      <path d="M176 152 L162 182 L150 210" stroke={C.trouserDark} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M180 152 L196 180 L206 210" stroke={C.trouser} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="146" cy="213" rx="11" ry="4.5" fill={C.forest} opacity="0.85" />
      <ellipse cx="212" cy="213" rx="11" ry="4.5" fill={C.forest} />
      <path d="M162 156c-4-26 2-50 16-58 12-6 24-2 28 8 6 14 2 36-4 50-12 6-28 6-40 0z" fill={C.dusty} />
      <path d="M172 108c-10 14-14 28-12 40" stroke="#7e98b6" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M196 110c10 10 14 22 14 34" stroke="#7e98b6" strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="210" cy="146" r="5" fill={SKIN.mid} />
      <circle cx="160" cy="150" r="5" fill={SKIN.mid} />
      <circle cx="186" cy="80" r="15" fill={SKIN.mid} />
      <path d="M172 80c-2-14 8-24 20-22 10 2 14 10 12 18-6-6-16-8-24-4-4 2-6 6-8 8z" fill={C.hairGrey} />
    </g>
  );
}

/** A person resting in an armchair with a warm cup, by the window. */
function Rester({ id }: { id: string }) {
  return (
    <g filter={`url(#wc-${id})`}>
      <path d="M150 214v-60c0-18 14-30 32-30h40c18 0 30 12 30 30v60z" fill={C.sage} />
      <rect x="140" y="160" width="128" height="40" rx="18" fill="#93a98b" />
      <path d="M188 174 L232 176 L234 212" stroke={C.trouser} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="240" cy="214" rx="12" ry="5" fill={C.forest} />
      <path d="M172 176c-4-26 0-50 14-60 12-8 28-6 34 4 8 12 4 38-2 56-14 6-32 6-46 0z" fill={C.ivory} />
      <path d="M180 120c-4 14-2 30 4 44" stroke={C.sand} strokeWidth="4" fill="none" />
      <path d="M210 128c4 10 2 20-6 24" stroke="#ece4d2" strokeWidth="11" strokeLinecap="round" fill="none" />
      <rect x="196" y="140" width="16" height="18" rx="4" fill={C.amber} />
      <path d="M212 145c5 0 6 8 0 8" stroke={C.amber} strokeWidth="3" fill="none" />
      <path d="M200 136c0-4 3-4 3-8M206 136c0-4 3-4 3-8" stroke="#c9bfae" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="196" cy="98" r="15" fill={SKIN.deep} />
      <path d="M181 100c-2-16 10-26 22-24 10 2 16 10 14 22-8-8-18-8-26-4-4 2-8 4-10 6z" fill={C.hairGrey} />
      <path d="M184 104c-2 8 0 16 4 20" stroke={C.hairGrey} strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Outdoors({ id }: { id: string }) {
  return (
    <g>
      <rect width="360" height="260" fill="#eef2ea" />
      <g filter={`url(#wash-${id})`} opacity="0.9">
        <ellipse cx="270" cy="60" rx="140" ry="60" fill={C.dustySoft} />
        <ellipse cx="80" cy="180" rx="160" ry="70" fill={C.sageSoft} />
      </g>
      <circle cx="292" cy="58" r="16" fill={C.amber} opacity="0.7" filter={`url(#wc-${id})`} />
      <path d="M0 170c60-26 120-30 180-14s120 14 180-6v110H0z" fill="#cbd8c1" filter={`url(#wc-${id})`} />
      <path d="M120 260c20-30 50-48 90-52s80-6 110-20" stroke={C.sand} strokeWidth="26" strokeLinecap="round" fill="none" filter={`url(#wc-${id})`} />
      <g filter={`url(#wc-${id})`}>
        <path d="M62 196v-46" stroke={C.woodDark} strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="62" cy="132" rx="28" ry="32" fill={C.sage} />
        <ellipse cx="50" cy="122" rx="16" ry="18" fill="#93a98b" />
      </g>
    </g>
  );
}

const SCENES: Record<Scene, { title: string; body: (id: string) => React.ReactNode }> = {
  rise: {
    title: "A person standing up from a chair",
    body: (id) => (
      <>
        <Room id={id} />
        <Plant x={316} y={214} s={1.05} id={id} />
        <Chair x={118} y={214} id={id} />
        <Riser id={id} />
      </>
    ),
  },
  room: {
    title: "A sturdy chair against a wall, with clear space around it",
    body: (id) => (
      <>
        <Room id={id} />
        <rect x="132" y="40" width="6" height="176" fill={C.sandDeep} opacity="0.7" />
        <Chair x={146} y={214} id={id} />
        <Plant x={300} y={214} s={0.95} id={id} />
      </>
    ),
  },
  calm: {
    title: "A person sitting calmly, hand resting on their chest",
    body: (id) => (
      <>
        <Room id={id} wall="#f1ece0" />
        <Chair x={124} y={214} id={id} />
        <Calm id={id} />
        <Plant x={300} y={214} s={0.9} id={id} />
      </>
    ),
  },
  share: {
    title: "An older man and his daughter looking at a phone together",
    body: (id) => (
      <>
        <Room id={id} window={false} />
        <Plant x={326} y={214} s={0.85} id={id} />
        <Sharers id={id} />
      </>
    ),
  },
  healthy: {
    title: "A person walking outdoors on a calm day",
    body: (id) => (
      <>
        <Outdoors id={id} />
        <Walker id={id} />
      </>
    ),
  },
  rest: {
    title: "A person resting in an armchair with a warm drink",
    body: (id) => (
      <>
        <Room id={id} />
        <Rester id={id} />
        <Plant x={96} y={214} s={0.9} id={id} />
      </>
    ),
  },
};

export function Illustration({
  scene,
  className = "",
  decorative = false,
}: {
  scene: Scene;
  className?: string;
  /** Decorative pictures are hidden from screen readers. */
  decorative?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const s = SCENES[scene];
  return (
    <svg
      viewBox="0 0 360 260"
      className={`block h-auto w-full ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : s.title}
    >
      <Defs id={id} />
      <g clipPath={`url(#frame-${id})`}>
        {s.body(id)}
        <Grain id={id} />
      </g>
    </svg>
  );
}
