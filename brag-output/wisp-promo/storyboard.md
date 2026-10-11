# WISP — "When Something Feels Different"

20-second vertical launch film · 1080×1920 · 30 fps · H.264 + AAC

**Angle.** One human sentence, "I feel weak", followed all the way to a clear next step. The **WISP Line** (the organic line from the app's own logo and `WispLine` component) carries the viewer through
UNCERTAINTY → SAFETY → PHYSICAL EVIDENCE → DECISION → CARE.

**Hook (0–2 s).** A warm, quiet room from WISP's own watercolour illustration set (`components/Illustration.tsx`), a line drawing itself through it, and the words *"I feel weak."*

**Tone.** `polished`. Serious, editorial and restrained, with long holds and soft, staggered transitions.

**Visual identity.** Taken from `apps/web/app/globals.css`: ivory `#FAF7EE`, forest `#2F4F3E` / `#183C31`, sage `#A7B89F` / `#E4EBDD`, muted teal `#6E8F8F`, amber `#E3B567`, warm red `#B94335` (used only in the safety scene), Lora 500/600 and Inter, a paper-grain overlay, and the watercolour displacement filter from the illustrations.

## Narration (ElevenLabs)

- Voice: *Jonathan – Warm Executive Narrator* (`eocOcfJL8piTXLNNpSCR`), model `eleven_v4`, take 1 of 2. It runs 17.44 s at natural speed with no time-stretching. Placed at +0.10 s, it ends at 17.24 s, before the end card settles.
- Script, used verbatim:

> When someone says, "I feel weak," the next step isn't always clear. WISP screens for danger first. If a movement check could help, Wi-Fi sensing compares today's movement with a personal baseline. Then WISP explains what to do, where to go, and when.

Phrase timings in the film come from silence detection on the generated take:

| Phrase | In film |
|---|---|
| When someone says, "I feel weak," | 0.23 – 2.64 |
| the next step isn't always clear. | 3.11 – 4.96 |
| WISP screens for danger first. | 5.50 – 7.51 |
| If a movement check could help, | 7.97 – 9.37 |
| Wi-Fi sensing compares today's movement with a personal baseline. | 9.58 – 13.18 |
| Then WISP explains what to do, | 13.57 – 15.63 |
| where to go, and when. | 15.82 – 17.24 |

## Storyboard

The brief's timings moved by up to about 2 s so that every cut lands on the narration phrase it illustrates. The order and the 20.0 s total are unchanged.

| # | Time | Beat | On screen | Audio |
|---|---|---|---|---|
| 1 | 0.00 – 5.25 | **The problem** | The ivory frame opens onto WISP's watercolour room, with an older woman seated calmly in her chair. The WISP Line draws itself through the room. Text: **"I feel weak."** (from 1.4 s), then *What should I do next?* (from 3.1 s). | Line-reveal SFX at 0.1 s. Pad on a B-minor colour (uncertain). |
| 2 | 5.25 – 7.85 | **Safety first** | The line becomes the top edge of a card built from the real safety-check screen: "Safety check · Question 3 of 11", the real question **"Any chest pain or tightness?"**, and the real Yes / No / Not sure answer buttons. "No" is tapped at 7.0 s. A warm-red pill reads *Checked before any sensing*. Headline: **First, check for danger.** ("danger" in warm red). | The pad moves to G. |
| 3 | 7.85 – 11.00 | **Evidence when it matters** | A simplified room: the home router (the transmitter in WISP's single-board setup) on the left, an ESP32-S3 sensor on the right and a chair in the middle. A pill reads *Starts only when you press start*. Fine signal lines travel router → sensor and bend as the person does five sit-to-stands, shown in time-lapse. Below, an *illustrative* motion trace builds, and each rep drops an amber marker (1–5). Headline: **Physical evidence, only when useful.** Label: `Wi-Fi CSI · 5× Sit-to-Stand`. | Sensing-transition SFX at 7.7 s. A soft pulse enters. |
| 4 | 11.00 – 13.50 | **Personal baseline** | The trace lifts into two timelines, `YOUR USUAL` and `TODAY`, each with five markers. Today's markers are spaced a little wider, and a soft bracket marks the difference with no numbers. Headline: **Compared with your usual.** | The pad moves to an A suspension. |
| 5 | 13.50 – 16.88 | **The decision** | The real T2 recommendation card, styled after `Recommendation.tsx`. It uses the backend's own strings: *Your next step*, **Please be seen today**, *See your GP or a polyclinic today.*, *When: Today*, and the reason *Today's movement check was slower than your usual pattern.* (rule FN-3b). Chips light up in turn: Clear next step · Time frame · Reasons. Then the pipeline: `WORKBUDDY → MCP → CSI → BASELINE → CARE TIER`, with *Agent requests* bracketed under the first three and *Rules decide* under the last two. | Resolves to D major. |
| 6 | 16.80 – 20.00 | **Brand** | Overlapping the card's exit, the line sweeps up and settles into the arc of the WISP wordmark, with its amber point. **WISP**, then *Know what to do next.*, then `Agentic AI · Wi-Fi Sensing · Self-Triage & Care Navigation`, then `Healthcare prototype · Not a diagnosis`. It holds for about 2 s. | Logo accent SFX (retuned to A4) at 17.47 s. The final chord rings out to silence by 20.0 s. |

## Accuracy guardrails applied

- The red-flag screen is shown **before** any sensing, and sensing is shown as starting only on the patient's own start press (`patient_ready`). Nothing is shown running continuously.
- The hardware shown matches `hardware/esp32/README.md`: one ESP32-S3 plus the home 2.4 GHz router as transmitter. It is a conceptual animation, and the trace is captioned *Illustrative signal*, because real-capture validation is still pending.
- No numbers, accuracy figures, vital signs, fall detection or diagnosis claims appear anywhere.
- The care tier is attributed to the rules ("Rules decide"), never to the AI.
- No "everything stays local" claim is made (`docs/privacy.md` explicitly does not make it).
- No MIT affiliation is claimed. The person shown is an illustration from WISP's own art set, not a real person.

## Music

The connected ElevenLabs connector is the **restricted** one: it offers speech and SFX only, with no music generation. Brag's bundled tracks are all upbeat "Happy Beats / Business Moves" pieces with unverified licensing, so they don't fit this film. The bed is therefore an **original instrumental composed in code** for this film (`work/make_music.py`): a soft pad, a gentle felt-mallet pulse during sensing, and a final D-major resolution. Its chords change on the scene cuts.

## Verification log

- **Narration check (ElevenLabs Scribe).** Scribe ran on the TTS node and returned the script word for word, with per-word timings. Two caveats: it transcribed take 2, not take 1, and its output included the `[warmly]` direction tag. That suggests the transcript was aligned to the prompt text rather than independently heard, so treat it as a timing check, not proof of pronunciation. Take 1's phrase boundaries come from silence detection, and they agree with those timings.
- **Final file.** H.264 High, 1080×1920, 30 fps, 600 frames, AAC-LC 48 kHz stereo, 20.000 s. The audio is -14.4 LUFS integrated with a true peak of -1.7 dBTP and no clipped samples. Under speech the voice sits about 12 dB above the music bed.
- **Review.** Frames were checked at 0, 3, 4.5, 6, 8.6, 10, 11.8, 13, 15.6, 17, 19 and 19.9 s (see `wisp-promo-contact-sheet.png`). The t=0 tile shows the baked-in poster frame.
- **Refinements after the first full render:** fixed broken web-font paths (the stills had fallen back to Georgia and the system sans); moved the pipeline labels above the line; enlarged the small labels; fixed collisions in the baseline rows; rebalanced the music, which had been only 1.4 dB under the voice; made the opening start mid-reveal instead of on blank ivory; and removed an empty line-only beat at 17 s.

## Rebuild

```bash
cd brag-output/wisp-promo/work
node render.mjs frames                                   # 600 PNG frames (~4 min)
../../../services/.venv/bin/python -I make_music.py      # music bed + mix
ffmpeg -i audio/mix.wav -af "volume=4.6dB,alimiter=limit=0.79:attack=3:release=60:level=disabled,aresample=192000,alimiter=limit=0.82:attack=1:release=40:level=disabled,aresample=48000" audio/mix_norm.wav
./finalize.sh
```
