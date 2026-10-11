// Renders the composition frame by frame. Every frame is render(t), a pure function of time.
//   node render.mjs stills 0 3 6 …      → work/stills/t_<t>.png
//   node render.mjs frames              → work/frames/f_00000.png … (600 frames @ 30 fps)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, "../../../apps/web/package.json"));
const { chromium } = require("playwright");

const FPS = 30, DUR = 20;
const [mode, ...rest] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "composition/index.html")).href);
await page.evaluate(() => window.ready);

async function shot(t, file) {
  await page.evaluate((t) => window.render(t), t);
  await page.screenshot({ path: file, type: "png" });
}

if (mode === "stills") {
  const dir = path.join(here, "stills"); mkdirSync(dir, { recursive: true });
  for (const s of rest) await shot(parseFloat(s), path.join(dir, `t_${s}.png`));
} else {
  const dir = path.join(here, "frames"); mkdirSync(dir, { recursive: true });
  const n = FPS * DUR;
  const t0 = Date.now();
  const [a = 0, b = n] = rest.map(Number);
  for (let i = a; i < b; i++) {
    await shot(i / FPS, path.join(dir, `f_${String(i).padStart(5, "0")}.png`));
    if (i % 60 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
await browser.close();
