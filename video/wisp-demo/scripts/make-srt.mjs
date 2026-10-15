// Writes wisp-demo.srt (sidecar subtitles for the narration) from src/data/vo.json.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { clips } = JSON.parse(readFileSync(path.join(root, "src/data/vo.json"), "utf8"));
const ts = (t) => {
  const ms = Math.round(t * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, "0")}`;
};
const lines = clips.filter((c) => c.available).flatMap((c) => c.lines);
const end = (i) => Math.min(lines[i].to + 0.25, i + 1 < lines.length ? lines[i + 1].from - 0.04 : Infinity);
const srt = lines.map((l, i) => `${i + 1}\n${ts(l.from)} --> ${ts(end(i))}\n${l.text}\n`).join("\n");
writeFileSync(path.join(root, "wisp-demo.srt"), srt);
console.log(`${lines.length} cues → wisp-demo.srt`);
