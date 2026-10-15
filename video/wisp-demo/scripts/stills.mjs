// Renders review stills of the full film from one bundle.
//   node scripts/stills.mjs 5 12 18.5 …   (seconds)  → work/stills/t_<sec>.png
//   node scripts/stills.mjs --sheet out.png 5 12 …  also tiles them into a contact sheet (4 across)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let args = process.argv.slice(2);
let sheet = null;
if (args[0] === "--sheet") [, sheet, ...args] = args;
const out = path.join(root, "work/stills");
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "WispDemo" });
const files = [];
for (const a of args) {
  const frame = Math.round(parseFloat(a) * 30);
  const file = path.join(out, `t_${a}.png`);
  await renderStill({ serveUrl, composition, frame, output: file });
  files.push(file);
  console.log("✓", a);
}
if (sheet) {
  const n = files.length;
  const cols = 4;
  const inputs = files.flatMap((f) => ["-i", f]);
  const scale = files.map((_, i) => `[${i}]scale=640:360[v${i}]`).join(";");
  const pads = Array.from({ length: (cols - (n % cols)) % cols }, (_, k) => `color=c=white:s=640x360:d=1[p${k}]`);
  const all = [...files.map((_, i) => `[v${i}]`), ...pads.map((_, k) => `[p${k}]`)];
  const layout = all.map((_, i) => `${(i % cols) * 640}_${Math.floor(i / cols) * 360}`).join("|");
  const fc = [scale, ...pads, `${all.join("")}xstack=inputs=${all.length}:layout=${layout}`].filter(Boolean).join(";");
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", fc, "-frames:v", "1", sheet]);
  console.log("sheet →", sheet);
}
