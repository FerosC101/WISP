// Probes every narration clip in public/audio/vo and writes src/data/vo.json:
// duration, whether the file exists, and per-sentence caption timings aligned to the clip's pauses.
// Missing clips get estimated timings (2.35 words/s) so captions still play; `available: false` keeps them silent.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = JSON.parse(readFileSync(path.join(root, "src/data/script.json"), "utf8"));
const words = (t) => t.split(/\s+/).filter(Boolean).length;

function silences(file) {
  const out = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=-38dB:d=0.18 -f null - 2>&1 || true`]).toString();
  const starts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...out.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  return starts.map((s, i) => ({ s, e: ends[i] ?? s }));
}

const clips = script.clips.map((c) => {
  const file = path.join(root, "public/audio/vo", `${c.id}.mp3`);
  const available = existsSync(file);
  const total = c.text.reduce((n, t) => n + words(t), 0);
  let dur, speechStart, speechEnd, gaps = [];
  if (available) {
    dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
    const sil = silences(file);
    speechStart = sil.length && sil[0].s < 0.05 ? sil[0].e : 0;
    const last = sil.at(-1);
    speechEnd = last && last.e >= dur - 0.05 ? last.s : dur;
    gaps = sil.filter((g) => g.s > speechStart + 0.1 && g.e < speechEnd - 0.1).map((g) => (g.s + g.e) / 2);
  } else {
    dur = total / 2.35 + 0.4;
    speechStart = 0.2;
    speechEnd = dur - 0.2;
  }
  // Sentence boundaries: proportional by word count, snapped to the nearest pause within 0.7 s.
  let acc = 0;
  const bounds = [speechStart];
  c.text.forEach((t, i) => {
    acc += words(t);
    if (i === c.text.length - 1) return bounds.push(speechEnd);
    const guess = speechStart + (speechEnd - speechStart) * (acc / total);
    const near = gaps.reduce((b, g) => (Math.abs(g - guess) < Math.abs(b - guess) ? g : b), Infinity);
    bounds.push(Math.abs(near - guess) < 0.7 ? near : guess);
  });
  const lines = c.text.map((t, i) => ({ text: t, from: +(c.at + bounds[i]).toFixed(2), to: +(c.at + bounds[i + 1]).toFixed(2) }));
  const end = c.at + dur;
  if (end > c.slot[1] + 0.01) console.warn(`! ${c.id} ends at ${end.toFixed(2)} s, after its slot (${c.slot[1]} s)`);
  console.log(`${available ? "✓" : "·"} ${c.id.padEnd(9)} ${dur.toFixed(2).padStart(6)} s  ${c.at.toFixed(1)}→${end.toFixed(1)}  slot ${c.slot.join("–")}`);
  return { id: c.id, scene: c.scene, at: c.at, dur: +dur.toFixed(3), available, lines };
});
writeFileSync(path.join(root, "src/data/vo.json"), JSON.stringify({ clips }, null, 2));
console.log(`${clips.filter((c) => c.available).length}/${clips.length} clips available → src/data/vo.json`);
