import React from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";

/**
 * A motion-graphic insert built and rendered with HyperFrames (see ../../hyperframes/), composited into the
 * Remotion timeline. Silent: all sound comes from the Remotion soundtrack.
 */
export const Insert: React.FC<{ name: "ident" | "principle" | "endcard"; children?: React.ReactNode }> = ({ name, children }) => (
  <AbsoluteFill>
    <Video src={staticFile(`hf/${name}.mp4`)} muted />
    {children}
  </AbsoluteFill>
);
