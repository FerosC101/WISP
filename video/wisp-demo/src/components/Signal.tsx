import React from "react";
import { C } from "../theme";
import { ROUTER, SENSE } from "./Rooms";

/**
 * Illustrative Wi-Fi link between the home router and WISP Sense. Fine lines flow toward the sensor
 * and bend where the person moves (`bend`, 0..1). `noise` (0..1) makes them scatter and grey out,
 * as when someone else walks through. Not real data: a picture of the idea.
 */
export const Signal: React.FC<{ f: number; on: number; bend: number; noise?: number; personX?: number }> = ({ f, on, bend, noise = 0, personX = 920 }) => {
  if (on <= 0) return null;
  const lines = [-46, -26, -8, 10, 28, 48];
  return (
    <g opacity={on}>
      {lines.map((o, i) => {
        const jitter = noise * Math.sin(f / 3 + i * 1.7) * 60;
        const lift = bend * (i % 2 ? -1 : 1) * (18 + i * 6) + jitter;
        const midY = (ROUTER.y + SENSE.y) / 2 + o * 2.2 + lift;
        const d = `M ${ROUTER.x - 40} ${ROUTER.y + o * 0.4} C ${ROUTER.x - 300} ${ROUTER.y + o * 1.6}, ${personX + 160} ${midY}, ${personX} ${midY} S ${SENSE.x + 260} ${SENSE.y + o * 1.2}, ${SENSE.x + 70} ${SENSE.y + o * 0.3}`;
        const col = noise > 0.3 ? "#9AA39E" : i % 3 === 0 ? C.teal : C.sage;
        return (
          <path
            key={i}
            d={d}
            stroke={col}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="10 16"
            strokeDashoffset={f * 2.2 + i * 7}
            opacity={0.55 + 0.25 * Math.sin(f / 14 + i)}
          />
        );
      })}
    </g>
  );
};
