import React from "react";
import { AbsoluteFill } from "remotion";
import { WispSense } from "../components/WispSense";

/** Reference sheet: WISP Sense at front, three-quarter, side and back angles (not part of the film). */
export const SenseTurntable: React.FC = () => (
  <AbsoluteFill style={{ background: "#F3EEE3", flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" }}>
    {[0, -0.5, -1.2, Math.PI].map((y, i) => (
      <WispSense key={i} id={`t${i}`} yaw={y} height={520} />
    ))}
  </AbsoluteFill>
);
