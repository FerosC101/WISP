import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Variable fonts bundled locally (copied from brag-output/wisp-promo/work/fonts).
export const fontsReady = Promise.all([
  loadFont({ family: "Inter", url: staticFile("fonts/Inter.woff2"), weight: "100 900" }),
  loadFont({ family: "Lora", url: staticFile("fonts/Lora.woff2"), weight: "400 700" }),
  loadFont({ family: "Lora", url: staticFile("fonts/Lora-Italic.woff2"), weight: "400 700", style: "italic" }),
]);
