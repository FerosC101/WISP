// WISP brand system (matches apps/web/app/globals.css and the brief).
export const C = {
  ivory: "#FAF7EE",
  card: "#FFFDF8",
  forest: "#2F4F3E",
  deep: "#183C31",
  sage: "#A7B89F",
  paleSage: "#E4EBDD",
  sageDeep: "#CDD8C4",
  teal: "#6E8F8F",
  tealText: "#4E7070",
  amber: "#E3B567",
  amberText: "#8A5A12",
  amberBg: "#FBF0D9",
  red: "#B94335",
  redDeep: "#8F2F24",
  redBg: "#F8E0DB",
  ink: "#24352F",
  inkSoft: "#5C6A64",
  inkFaint: "#6B7771",
  line: "#DEDCD2",
  sand: "#EFE4CF",
  sandSoft: "#F5EDDD",
  dusty: "#8EA9C7",
  dustyBg: "#E7EEF5",
  slate: "#55625C",
  slateBg: "#EEECE4",
} as const;

export const SERIF = "Lora, Georgia, serif";
export const SANS = "Inter, system-ui, sans-serif";
export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const s = (sec: number) => Math.round(sec * FPS);
