import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import vo from "../data/vo.json";
import { FPS } from "../theme";

/** Cuts that get a soft whoosh (seconds): scene, part and shot boundaries. */
const CUTS = [
  7.0, 8.4, 10.3, 12.5, 20, 24.7, 29.4, 31.6, 35.8, 50, 54.7, 56.9, 65.3, 80, 83.3, 88.5, 95, 103.5, 109.5, 115, 121.6, 130, 133.2, 147.5, 150,
  153.5, 158.7, 165, 172.4, 177.5, 187.5, 200, 208.6, 214.3, 217.7, 227.5, 240, 243.5, 250.8, 260, 266.2, 280, 286.3, 291,
];

/** Sound effects. ElevenLabs SFX from the earlier promo (line, sense, logo) plus UI sounds composed in scripts/make_music.py. */
export const SFX: { file: string; at: number; vol: number }[] = [
  ...CUTS.map((t) => ({ file: "sfx/whoosh.wav", at: t - 0.28, vol: 0.13 })),
  // Scene 1 · the three destination cards
  ...[13.37, 14.37, 15.57].map((t) => ({ file: "sfx/pop.wav", at: t, vol: 0.2 })),
  { file: "sfx/logo.wav", at: 50.8, vol: 0.3 }, // ident lands
  { file: "sfx/sense.wav", at: 57.0, vol: 0.22 }, // WISP Sense rises
  { file: "sfx/chime.wav", at: 109.8, vol: 0.32 }, // safety screening completed
  ...[0, 1, 2].map((i) => ({ file: "sfx/pop.wav", at: 121.6 + (40 + i * 30) / 30, vol: 0.18 })), // gates unlock (shot starts 121.6 s)
  { file: "sfx/sense.wav", at: 131.4, vol: 0.24 }, // sensing becomes active
  ...[0, 1, 2, 3, 4].map((k) => ({ file: "sfx/pop.wav", at: 133.2 + 2.0 + k * 2.35, vol: 0.2 })), // rep counter
  { file: "sfx/settle.wav", at: 156.2, vol: 0.34 }, // recommendation settles
  { file: "sfx/low.wav", at: 168.3, vol: 0.34 }, // sensing locked (restrained, no alarm)
  { file: "sfx/low.wav", at: 181.2, vol: 0.28 }, // new warning sign
  { file: "sfx/soft.wav", at: 192.7, vol: 0.3 }, // reading discarded
  { file: "sfx/chime.wav", at: 214.5, vol: 0.24 }, // the rules decide
  ...[260, 620, 980, 1340, 1700].map((x) => ({ file: "sfx/pop.wav", at: 266.2 + (10 + (x / 1860) * 290) / 30, vol: 0.16 })), // roadmap milestones
  { file: "sfx/logo.wav", at: 291.5, vol: 0.34 }, // end card
];

const CLIPS = vo.clips.filter((c) => c.available);

/**
 * Music volume, measured against the clips: between lines the bed sits ~3 dB under the voice, and under
 * narration it ducks a further ~7 dB (≈10 dB under the voice), with short ramps so the groove keeps moving.
 */
const musicVolume = (f: number) => {
  const t = f / FPS;
  let duck = 0;
  for (const c of CLIPS) {
    const a = c.at - 0.3;
    const b = c.at + c.dur + 0.2;
    const d = t < a ? (t - (a - 0.4)) / 0.4 : t > b ? 1 - (t - b) / 0.5 : 1;
    duck = Math.max(duck, Math.max(0, Math.min(1, d)));
  }
  return 0.42 * (1 - duck * 0.55);
};

export const Soundtrack: React.FC = () => (
  <>
    <Audio src={staticFile("audio/music.wav")} volume={musicVolume} />
    {CLIPS.map((c) => (
      <Sequence key={c.id} from={Math.round(c.at * FPS)} durationInFrames={Math.ceil((c.dur + 0.2) * FPS)} layout="none">
        <Audio src={staticFile(`audio/vo/${c.id}.mp3`)} volume={1} />
      </Sequence>
    ))}
    {SFX.map((s, i) => (
      <Sequence key={i} from={Math.max(0, Math.round(s.at * FPS))} durationInFrames={FPS * 3} layout="none">
        <Audio src={staticFile(`audio/${s.file}`)} volume={s.vol} />
      </Sequence>
    ))}
  </>
);
