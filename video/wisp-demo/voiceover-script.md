# WISP demo film: voiceover script

**Voice:** ElevenLabs, *Jonathan – Warm Executive Narrator* (`eocOcfJL8piTXLNNpSCR`), model `eleven_v4`, one take per clip, no time-stretching.
**Pace:** the clips run at roughly 120–135 words per minute, with each line placed inside its scene slot.
**Source of truth:** `src/data/script.json`. Clip files are `public/audio/vo/<id>.mp3`. After adding or replacing a clip, run `npm run prepare-audio`. That probes durations, aligns captions to pauses and writes `src/data/vo.json`.

> **Status: all 15 clips generated** (clips 01, 03, 05, 14 and 15 were regenerated on 15 Oct after an ElevenLabs account error was cleared).

The brief's script was tightened in places so that each clip fits its slot at a natural pace. Every change is noted.

| # | Clip | In film | Slot | Status | Narration |
|---|---|---|---|---|---|
| 1 | `vo01_s1` | 0:02.6 | Scene 1 · 0:00–0:20 | ✓ | Sometimes, the hardest part of getting help is knowing where to start. You feel weak. Something feels different. But you can't quite explain why. Should you wait… see a doctor… or seek urgent help? |
| 2 | `vo02_s2` | 0:21.4 – 0:41.8 | Scene 2 · 0:20–0:50 | ✓ 20.4 s | Nonspecific complaints are difficult to navigate. A symptom may be mild, unfamiliar, or hard to describe. Asking the right questions is essential. But in some cases, symptoms alone leave important uncertainty. The challenge is knowing when additional evidence could genuinely change the next step. |
| 3 | `vo03_s3` | 0:51.2 | Scene 3 · 0:50–1:20 | ✓ | WISP is an AI-assisted self-triage and care-navigation prototype. It begins with safety screening. When appropriate, it can request an on-demand movement check, and compare the result with a person's usual baseline. It then explains the next step… or abstains, when the evidence is not enough. |
| 4 | `vo04_s4a` | 1:21.2 – 1:33.2 | 4A · 1:20–1:35 | ✓ 12.0 s | Madam Tan is seventy-eight. For two days, she has felt unusually weak, and she isn't sure why. WISP starts with her own words, then asks focused questions. *(Shortened from the brief's 36 words to fit 15 s.)* |
| 5 | `vo05_s4b` | 1:36.0 | 4B · 1:35–1:55 | ✓ | Before any movement check, WISP screens for warning signs, and decides whether this kind of check is appropriate. If an emergency warning sign appears, urgent care comes first, and sensing is skipped. |
| 6 | `vo06_s4c` | 1:56.4 – 2:07.8 | 4C · 1:55–2:10 | ✓ 11.4 s | Here, a movement check could show whether Madam Tan's function has changed from usual. WISP explains why it's asking, and offers the check only when the rules allow it. *(Shortened to fit 15 s.)* |
| 7 | `vo07_s4d` | 2:11.4 – 2:27.6 | 4D · 2:10–2:30 | ✓ 16.2 s | When she presses start, WISP uses Wi-Fi channel-state information to time five sit-to-stands. The pipeline estimates each rise, so today can be compared with her healthy-day baseline. In this demo, the signal is a recorded, synthetic session. *(The last sentence was added: no real ESP32 capture has been processed yet.)* |
| 8 | `vo08_s4e` | 2:31.0 – 2:43.9 | 4E · 2:30–2:45 | ✓ 12.9 s | Her movement is slower than usual. Together with what she reported, the rules recommend same-day care. And WISP explains why, and which warning signs need urgent help. *(Shortened from 44 words to fit 15 s.)* |
| 9 | `vo09_s5a` | 2:46.0 – 2:55.0 | 5A · 2:45–2:57 | ✓ 9.0 s | When warning signs suggest an emergency, WISP does not ask for a movement test. It directs the person to emergency help. |
| 10 | `vo10_s5b` | 2:58.2 – 3:05.9 | 5B · 2:57–3:07 | ✓ 7.7 s | And a normal result yesterday can't reassure us about new symptoms today. New warning signs always take priority. |
| 11 | `vo11_s5c` | 3:08.4 – 3:18.3 | 5C · 3:07–3:20 | ✓ 9.9 s | If the reading is unreliable, or the evidence isn't enough, WISP doesn't invent certainty. It abstains, and points the person to human support. *(Shortened to fit 13 s.)* |
| 12 | `vo12_s6` | 3:22.0 – 3:47.7 | Scene 6 · 3:20–4:00 | ✓ 25.7 s | Under the interface, WorkBuddy interprets the conversation, spots missing information, and calls WISP's tools. The sensing pipeline estimates movement, and checks whether the evidence is usable. Deterministic safety rules decide the care level. The key principle is asymmetric: additional evidence may increase urgency… but it must never lower urgency below the symptom-based safety floor. |
| 13 | `vo13_s7` | 4:01.2 – 4:15.4 | Scene 7 · 4:00–4:20 | ✓ 14.2 s | Privacy is part of the design. Raw Wi-Fi sensing data stays on the local machine, while conversation text may go to a cloud language model. Checks are user-started, and sharing with a caregiver needs consent. *("Stays on the local machine" is implemented in the prototype: see `docs/privacy.md`.)* |
| 14 | `vo14_s8` | 4:21.4 | Scene 8 · 4:20–4:40 | ✓ | WISP is a working prototype, not a clinically validated medical device. Next comes real measurement validation, usability testing with older adults, and review with clinical advisors, before any real-world use. |
| 15 | `vo15_s9` | 4:41.0 | Scene 9 · 4:40–5:00 | ✓ | WISP brings conversation, functional evidence, and safety-governed care navigation into one experience. Because when someone says, "I feel weak," the question isn't just what they feel. It's knowing what to do next. |

Pronunciation notes for the prompts: "Mdm" is written as **Madam**, and "5xSTS" as **five sit-to-stands**. The TTS prompts carry no audio direction tags.

## Replacing a clip

1. Generate the line with the same voice and model, using the text above verbatim.
2. Save it as `public/audio/vo/<id>.mp3`.
3. Run `npm run prepare-audio` (it warns if a clip runs past its slot), then `npm run srt`.
4. Run `npm run render`, then `./scripts/finalize.sh`.

Subtitles for the whole narration are in `wisp-demo.srt` (sidecar file; the film itself has no burned-in captions).
