# WISP · 3:30 competition demo

Tencent Cloud AI CAN DO IT Hackathon Singapore 2026, Healthcare Case Study 1: Intelligent Self-Triage and Care Navigation.

| Deliverable | File |
|---|---|
| Final video (1920×1080, 30 fps, 6,300 frames = 3:30.000, H.264 + AAC) | `WISP_Competition_Demo_3m30.mp4` |
| Remotion source (composition `WispCompetition`) | `../src/competition/` (timeline in `Film.tsx`) |
| HyperFrames source (2 inserts used) | `../hyperframes/challenge/`, `../hyperframes/close/` |
| Final narration clips (as placed in the film) | `../public/audio/vo35/*.mp3` |
| ElevenLabs originals, word timings, narration stem | `narration/raw/*.mp3`, `narration/words_raw.json`, `narration/WISP_narration_stem_3m30.wav` |
| Scene and timeline manifest, narration script | `TIMELINE.md` |
| Sidecar subtitles | `WISP_Competition_Demo_3m30.srt` |
| Assets and their sources, render settings, verification report, illustrative vs implemented | below |
| Poster, contact sheet, 720p preview (10.6 MB) | `poster.jpg`, `contact-sheet.png`, `WISP_Competition_Demo_3m30_preview-720p.mp4` |

## Reproduce

Run from `video/wisp-demo` (Node 20+, ffmpeg; the CSI and music scripts use the repo's `services/.venv`).

```bash
npm install
../../services/.venv/bin/python -I scripts/export_csi.py     # real pipeline output on the synthetic recordings → src/competition/csi.json
../../services/.venv/bin/python -I scripts/make_music_35.py   # original score → public/audio/music35.wav
npm run prepare-audio-35                                     # narration (tempo, timings) → public/audio/vo35, src/competition/vo.json
./hyperframes/sync-and-render.sh challenge close             # HyperFrames inserts → public/hf/{challenge,close}.mp4
npm run render-35                                            # Remotion → out/wisp-competition-video.mp4
./scripts/finalize-35.sh                                     # loudness, encode, poster, sheet, stem, SRT → competition/
COMP=WispCompetition node scripts/stills.mjs 46 99 154       # review stills
```

Every frame is a pure function of the frame number. Nothing is random, so the same sources render the same film.

## How each tool was used

- **Remotion 4.0.535**: the primary composition and renderer. It holds a central 10-scene timeline (`Film.tsx`) and reusable components. Those are new in `kit.tsx` (stage row, safety gate, MCP tool card, CSI heatmap, posture trace, recommendation card) or carried over from the 5-minute film (WISP Line, characters, rooms, phone frame, Wi-Fi signal, brand transitions, kinetic type).
- **HyperFrames 0.8.157**: two motion-graphic inserts, built as HTML/GSAP and rendered locally. The first is the competition title card (Scene 3). The second is the closing wordmark lockup (Scene 10). Both pass `hyperframes check`; the linter caught a letter-spacing tween, an overflow and a low-contrast dash, and all three were fixed. Both are composited through `Insert.tsx`.
- **ElevenLabs (connected MCP, restricted connector: speech and transcription only)**: all 10 narration clips use the voice *Kopi O – Clear Singaporean Ad Voice* (`HxkJ72rJ50z9kcGPPnG7`) on `eleven_v4`, chosen from the 13 Singaporean-English voices the connector listed. Clips were generated one at a time. The account intermittently returned "Free Tier access disabled" and rate-limit errors, and those clips were retried. Pronunciations were steered in the prompt ("Wisp", "Work Buddy", "M.C.P.", "C.S.I.", "E.S.P. thirty-two", "Madam Tan"). ElevenLabs Scribe supplied word timings for 8 clips, which were used to sync the animation. Scribe returned the prompt text verbatim, so it was probably aligning to the prompt rather than transcribing blind, and it is **not** independent proof of pronunciation. The connector cannot generate music.
- **Music**: an original score composed in code (`scripts/make_music_35.py`, 96 BPM, so every scene boundary falls on a bar line). It starts with felt piano and pad, builds through the workflow and sensing scenes, drops to a drum-free break for the safety cases, and resolves to D major on the wordmark. Sound effects reuse the earlier ElevenLabs SFX and the UI tones from the 5-minute film.
- **DaVinci Resolve: not used.** No Resolve MCP server is connected in this session. Resolve 21.1.1 (free edition) is installed, but its scripting API refused an external connection, because external scripting is a Studio-only preference. No Resolve edit, grade or export took place. The final loudness pass, encode and QC were done with ffmpeg (`scripts/finalize-35.sh`). The narration stem and SRT are included in case a Resolve finishing pass is wanted later.
- **Brag**: its guidance from the earlier film was reapplied: show the real product, readable holds, staggered reveals instead of muddy crossfades, and music and SFX mixed as one piece. Its length rule did not apply.

## Assets used and their sources

| Asset | Source | Real or illustrative |
|---|---|---|
| Phone screens (`tan_02_start_typed`, `tan_03_safety_1`, `tan_05_decision`, `tan_07_movement_ready`, `tan_10_complete`, `tan_10_complete_full`) | Playwright captures of the running WISP app (`capture/capture.spec.ts`, isolated e2e stack), unedited | Real |
| Technical view (`tan_11_explain.png`) | Same capture run: the real decision record for Mdm Tan's check | Real |
| Recommendation card copy ("Please be seen today", "See your GP or a polyclinic today", reasons, "call 995") | Quoted from the real `tan_10_complete_full` screen | Real copy, re-typeset |
| "I can't safely judge this from here … speak with your family doctor or a nurse today" | Quoted from the real `int_02_abstain` screen | Real copy, re-typeset |
| MCP tool names (`record_case_facts`, `screen_red_flags`, `check_assessment_eligibility`, `run_functional_assessment`, `compare_to_baseline`, `decide_care_tier`) and field names (`complaint_summary`, `onset`, `duration_days`) | `services/src/wisp/mcp/server.py` | Real names, diagram layout |
| `final tier = more_urgent(symptom floor, movement result)` | Safety invariant SAFE-1 (`CLAUDE.md`, `docs/safety.md`) | Real rule |
| "Care range: Primary care soon ↔ Same-day care" | Technical view for Mdm Tan's check (floor T3, ceiling T2) | Real |
| CSI heatmap, posture traces, stand peaks, "more than one person detected" | `scripts/export_csi.py` runs the repo's unchanged `sensing/pipeline.py` on `data/recorded_csi/{tan_today,tan_baseline_1,tan_interference}.npz` | Real pipeline output on **synthetic** recordings |
| Characters (Mdm Tan, Mr Lim, Mdm Siti, passer-by), rooms, Wi-Fi signal lines, ESP32 board drawing | Original vector illustration from the 5-minute film (`components/Characters.tsx`, `Rooms.tsx`, `Signal.tsx`) | Illustrative |
| Fonts | Inter, Lora (bundled variable fonts, `public/fonts`) | n/a |
| Narration | ElevenLabs, as above | Synthetic voice |
| Music | `scripts/make_music_35.py` | Original |
| SFX | ElevenLabs generations (line, sense, logo) and code-composed UI tones (`scripts/make_music.py`) | Original |

No Tencent or Tencent Cloud logos or brand assets appear in the film. The event and case-study names appear as plain text only, and the film doesn't claim that any Tencent Cloud service powers WISP.

## Render and export settings

- Composition: 1920×1080, 30 fps, 6,300 frames. Remotion `--codec h264 --crf 18 --audio-codec aac --audio-bitrate 320k`.
- Master (`finalize-35.sh`):
  - loudness: linear gain to −16 LUFS integrated, then an oversampled true-peak limiter (target −1.5 dBTP)
  - video: libx264 `-preset slow -crf 18`, High profile, level 4.2, yuv420p, BT.709 primaries/transfer/matrix tagged, limited range, exactly 6,300 frames
  - audio: AAC-LC 256 kb/s, 48 kHz stereo, trimmed to 210 s, `+faststart`
- Mix: narration at full level. Music sits about 3 dB under the voice between lines and ducks a further ~7 dB under narration, with 0.4–0.6 s ramps. Whoosh and pop SFX are kept at −18 to −10 dB relative.

## Verification report

See `VERIFICATION.md`. The measured values are written there after the final render.

## Represented as illustrative, not implemented or not validated

- **Every person and place.** Mdm Tan, Mr Lim, Mdm Siti, her daughter and the passer-by are fictional, and labelled on screen. The Mdm Tan walkthrough is labelled *Illustrative scenario*.
- **Sensing scenes.** The room, the Wi-Fi lines and Tan's chair rises are illustrations, labelled *the signal lines are a picture of the idea, not data*. The demo app replays a **recorded, synthetic CSI session**; the narration says so ("In this demo, the signal is a recorded, synthetic session") and so does an on-screen tag. **No real ESP32 capture has been processed yet** (README status).
- **CSI charts.** These are real WISP pipeline output, but from **synthetic** recordings, and labelled so. No timings, percentages or scores are shown, matching the patient app.
- **WorkBuddy.** The orchestration is shown as an **architecture diagram** built from real tool and field names, not as a live tool-call recording. WorkBuddy AI 5.7.6 was run live for demo scenarios 1 and 2 on 10 Oct 2026 (README). The phone screens were captured with WISP's built-in agent, which calls the same tools.
- **Passer-by rejection.** This is experimental (about 50% on synthetic crossings, per the README). The rejection shown is real pipeline output on the synthetic interference recording, labelled *passer-by detection is experimental*.
- **Clinical value.** Rule thresholds are prototype values. Timing accuracy on real captures, usability with older adults and clinical usefulness are unvalidated. The film says "real-world and clinical validation come next" and labels the movement check *not a validated clinical measurement*.
- **WISP Sense enclosure.** It doesn't appear. The film shows the bare ESP32 board, which is the hardware the prototype targets.
- **Privacy.** Only the implemented claim is made: raw CSI stays on the local machine and the agent receives summaries. The film states that the conversation may reach the AI service. "Everything stays local" is not claimed.
