# Production note: what is real, what is illustrated, what is unvalidated

## Real (taken from the working prototype)

- **App screens.** Every phone screen and the Technical view are real captures of the running WISP app (`apps/web`). They were taken with Playwright against the repo's isolated e2e stack: a freshly seeded API on :8788 and a production build on :3100. The spec is `capture/capture.spec.ts`. The browser clock was pinned to 09:30 SGT so the greeting reads "Good morning". Nothing was edited after capture.
- **Copy.** Disposition headlines, next-step text, safety questions, the agent's sentences and warning signs are quoted from the backend (`schemas.py`, `rules/care_tier.py`, `triage/i18n.py`) or from the captured screens.
- **Behaviour shown.** The behaviour comes from the four demo scenarios in `docs/demo.md` and `apps/web/e2e/scenarios.spec.ts`: T2 via the movement check, T1 with sensing locked, a follow-up overriding yesterday's normal result, and abstention after interference. The rule-range note in Scene 4E (Primary care soon ↔ Same-day, raised to Same-day) matches the Technical view for that check.
- **Architecture and privacy.** These follow `CLAUDE.md`, `docs/architecture.md` and `docs/privacy.md`: a single-use eligibility grant, signed measurements, the agent sees summaries only, raw CSI stays on the machine, the baseline is encrypted, and caregiver sharing needs consent after a preview.
- **WorkBuddy.** The README records a live run with Tencent WorkBuddy AI 5.7.6 on 10 Oct 2026 for scenarios 1 and 2. The phone screens in the film were captured with the **built-in agent**, which uses the same tools. That is why the chat bubble is labelled "WISP agent", not "WorkBuddy".

## Illustrated or simulated (labelled on screen)

- **People and places.** All characters (Mdm Tan, her daughter, Mr Lim, Mdm Siti, the passer-by) and all rooms are original illustrations. The personas are fictional and tagged *Fictional persona*.
- **Sensing scenes (4D, 5C).** These are illustrations, not footage. The signal lines are a picture of the idea, not data. The demo app replays a **recorded, synthetic CSI session**. This is said in the narration ("In this demo, the signal is a recorded, synthetic session"), shown on screen, and visible in the app's own *Recorded session* badge. **No real ESP32 capture has been processed yet** (README status note).
- **Baseline dots (4E).** These are a qualitative illustration (today's rises further apart). They show no timings or scores, matching the patient screens, which never show timings.
- **The "typical symptom checklist" in Scene 2** is an illustration, labelled *not a real product*. It does not depict any existing product.
- **WISP Sense** is a proposed industrial-design concept: an enclosure for the existing ESP32-S3 prototype, drawn from the supplied concept reference as native 2.5D vector art, not the static image. Every appearance carries the tag *design concept (around the ESP32-S3 prototype · not yet fabricated)*. Scene 8 lists building and testing the enclosure under **Next**. Its role matches the prototype: on-demand receiver of the home router's Wi-Fi, connected to the local machine.

## Unvalidated (stated as such)

- 5xSTS timing accuracy on real captures. The pipeline was tuned on synthetic recordings only.
- Automatic passer-by detection. It is experimental, catching about 50 % on synthetic crossings, and is labelled in Scene 5C.
- Clinical validity of the rule thresholds (prototype values), usability with older adults, and the WISP Sense enclosure.
- The film claims no accuracy figures, statistics, vital signs, fall detection, gait analysis, continuous monitoring or through-wall sensing.

## Tools: what was actually used

- **Brag.** `/brag` was invoked. On Opus 5.5 it dispatches to `/brag-slim`, which was read and applied as creative direction: the `polished` tone, showing the real product, readable holds, staggered dips instead of muddy crossfades, music and SFX mixed as one piece, a settled poster baked into frame 0, and stills reviewed before the render. Its 15–25 s length rule and Hyperframes renderer were overridden by the brief (5 minutes, Remotion).
- **Remotion 4.0.535.** All animation, compositing and rendering. Every frame is a pure function of the frame number.
- **ElevenLabs MCP (restricted connector: speech and SFX, no music).** All 15 narration clips were generated with *Jonathan – Warm Executive Narrator* on `eleven_v4` (five were regenerated one at a time on 15 Oct after an account error on 14 Oct). No other TTS was used. The SFX are ElevenLabs generations reused from the earlier WISP promo.
- **Music.** An original score composed in code (`scripts/make_music.py`), because the connector has no music generation and Brag's bundled tracks are upbeat with unverified licensing.

- **HyperFrames 0.8.157.** The brand ident (Scene 3), the safety-principle sequence (Scene 6) and the end card (Scene 9) are HTML/GSAP compositions in `hyperframes/`, each passing `hyperframes check`, rendered locally to `public/hf/*.mp4` and composited in Remotion. Telemetry was opted out per command (`DO_NOT_TRACK=1`). Note: the CLI installed its own skills into `~/.claude/skills` and `~/.agents/skills` during the first render.
