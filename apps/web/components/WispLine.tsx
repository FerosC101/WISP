"use client";

import { useEffect, useId, useState } from "react";
import { usePrefs } from "@/lib/prefs";

/**
 * THE WISP LINE — a thin organic line: a breeze, a path, a gentle signal.
 * It stands for understand → check → guide → care. Never a Wi-Fi icon or an ECG.
 */
const PATH = "M4 30 C 56 30, 72 10, 126 12 S 204 40, 262 30 S 340 8, 392 15";
const END = { x: 392, y: 15 };

/** Honours both the OS setting and You → Accessibility → Less motion. */
export function useReducedMotion() {
  const { reduceMotion } = usePrefs();
  const [os, setOs] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOs(m.matches);
    const id = setTimeout(update, 0);
    m.addEventListener("change", update);
    return () => {
      clearTimeout(id);
      m.removeEventListener("change", update);
    };
  }, []);
  return reduceMotion || os;
}

export function WispLine({
  className = "",
  variant = "static",
  color = "currentColor",
  dot = true,
  strokeWidth = 2.6,
}: {
  className?: string;
  /** static · draw (draws itself in) · flow (a dot travels the line) · breathe (slow pulse, for sensing) */
  variant?: "static" | "flow" | "draw" | "breathe";
  color?: string;
  /** The amber point at the end of the line, as in the WISP mark. */
  dot?: boolean;
  strokeWidth?: number;
}) {
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const animate = !reduced;
  const lineCls = !animate ? "" : variant === "draw" ? "wisp-line-draw" : variant === "breathe" ? "wisp-line-breathe" : "";

  return (
    <svg viewBox="0 0 400 44" preserveAspectRatio="xMinYMid meet" aria-hidden className={className} fill="none">
      <path id={`wl-${id}`} d={PATH} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" className={lineCls} vectorEffect="non-scaling-stroke" />
      {variant === "flow" && animate && (
        <circle r="5.5" fill="var(--color-amber-soft)">
          <animateMotion dur="2.8s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1">
            <mpath href={`#wl-${id}`} />
          </animateMotion>
        </circle>
      )}
      {dot && !(variant === "flow" && animate) && <circle cx={END.x} cy={END.y} r="5.5" fill="var(--color-amber-soft)" />}
    </svg>
  );
}

/** The four moments of every WISP check, drawn as one line with points. */
export const JOURNEY = ["Understand", "Check", "Guide", "Care"] as const;

export function WispJourney({ current, className = "" }: { current: number; className?: string }) {
  // Points sit on the line at these positions (matching PATH at x = 20, 140, 260, 380).
  const pts = [
    { x: 20, y: 28.6 },
    { x: 140, y: 14.6 },
    { x: 260, y: 30.2 },
    { x: 380, y: 14.2 },
  ];
  return (
    <figure className={className} aria-label={`Step ${current + 1} of 4: ${JOURNEY[current]}`} role="img">
      <svg viewBox="0 0 400 44" preserveAspectRatio="none" aria-hidden className="block h-7 w-full">
        <path d={PATH} stroke="var(--color-sage-deep)" strokeWidth="2.4" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
        <path
          d={PATH}
          stroke="var(--color-forest)"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
          vectorEffect="non-scaling-stroke"
          pathLength={100}
          strokeDasharray={`${[8, 36, 66, 100][current]} 100`}
          style={{ transition: "stroke-dasharray 0.4s var(--ease-soft)" }}
        />
      </svg>
      <div className="relative -mt-[1.6rem] h-7" aria-hidden>
        {pts.map((p, i) => (
          <span
            key={i}
            className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
              i < current ? "border-forest bg-forest" : i === current ? "border-forest bg-amber-soft" : "border-sage-deep bg-ivory"
            }`}
            style={{ left: `${(p.x / 400) * 100}%`, top: `${(p.y / 44) * 100}%` }}
          />
        ))}
      </div>
      <figcaption className="mt-1 grid grid-cols-4 text-[0.9rem]" aria-hidden>
        {JOURNEY.map((j, i) => (
          <span key={j} className={`${i === 0 ? "text-left" : i === 3 ? "text-right" : "text-center"} ${i === current ? "font-semibold text-forest" : "text-ink-faint"}`}>
            {j}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** WISP wordmark: editorial serif with the line arcing over it and the amber point. */
export function WispLogo({ className = "", size = "md" }: { className?: string; size?: "md" | "lg" | "xl" }) {
  const text = size === "xl" ? "text-[4.2rem]" : size === "lg" ? "text-[2.4rem]" : "text-[1.55rem]";
  return (
    <span className={`inline-flex flex-col leading-none ${text} ${className}`}>
      <svg viewBox="0 0 120 22" aria-hidden className="-mb-[0.12em] block w-[2.7em]">
        <path d="M2 19 C 28 6, 64 1, 104 7" stroke="var(--color-sage-mid)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="110" cy="8" r="4.6" fill="var(--color-amber-soft)" />
      </svg>
      <span className="font-serif font-semibold tracking-[0.05em] text-forest">WISP</span>
    </span>
  );
}
