# WISP · 3:30 competition demo: scene and timeline manifest

Composition `WispCompetition` (`src/competition/Film.tsx`): 1920×1080, 30 fps, **6,300 frames (0–6299) = 210.000 s**.
Scene *i* starts exactly at the sum of the previous durations. The transition into a scene overlaps that scene's first frames, so transitions never add runtime. Narration start times are in `src/competition/script.json` (`at`).

| # | Scene | Time | Frames | Shots (s) | Narration (clip · speech) | Into scene |
|---|---|---|---|---|---|---|
| 1 | The uncertainty | 0:00–0:15 | 0–449 | home 8.0 · question 7.0 | `c01_uncertainty` · 1.6–13.3 | (start) |
| 2 | The care-navigation problem | 0:15–0:35 | 450–1049 | people 4.2 · routes 4.6 · converge 11.2 | `c02_problem` · 16.8–29.5 | WISP Line sweep (forest) |
| 3 | The competition challenge | 0:35–0:55 | 1050–1649 | HyperFrames `challenge` card 5.6 · three concepts 14.4 | `c03_challenge` · 36.2–52.8 | zoom-through |
| 4 | How WISP works | 0:55–1:15 | 1650–2249 | one shot: five stages, Technical view → phone, ends zooming into *Decide* | `c04_how` · 56.0–73.5 | slide up |
| 5 | WorkBuddy: the orchestration layer | 1:15–1:45 | 2250–3149 | hub 10.0 · MCP tools, safety gate, SAFE-1 20.0 | `c05_workbuddy` (atempo 1.04) · 75.4–104.5 | zoom-through |
| 6 | Wi-Fi CSI explained | 1:45–2:15 | 3150–4049 | room (A) 11.8 · CSI heatmap + pipeline (B) 9.2 · baseline comparison (C) 9.0 | `c06_csi` (atempo 1.02) · 105.4–134.0 | deep-green blob |
| 7 | Mdm Tan: from complaint to care | 2:15–2:45 | 4050–4949 | intake + safety screen 7.6 · proposal + gate 6.6 · sensing 4.6 · recommendation 11.2 | `c07_tan` · 135.6–163.2 | WISP Line sweep (amber) |
| 8 | Safety: knowing when not to measure | 2:45–3:05 | 4950–5549 | Mr Lim 6.8 · Mdm Siti 3.8 · unreliable evidence 9.4 | `c08_safety` · 165.6–184.5 | red blob |
| 9 | Feasibility, privacy, responsible AI | 3:05–3:20 | 5550–5999 | one shot: trust-zone architecture + statements | `c09_feasible` (atempo 1.05) · 185.1–199.2 | wipe |
| 10 | The close | 3:20–3:30 | 6000–6299 | care pathway over Mdm Tan 3.0 · HyperFrames `close` lockup 7.0 | `c10_close` (atempo 1.03) · 199.75–208.9 | WISP Line sweep (sage) |

The final lockup (*wisp · Know what to do next. · Intelligent self-triage and care navigation.*) is fully on screen from about 3:26.0. The last word of narration ends at 3:28.9, and the closing D-major chord rings out to 3:30.

## Narration script (as spoken)

1. Sometimes, the hardest part of seeking care is knowing where to begin. You feel weak. Unusually tired. Something feels different. But what should you do next?
2. Vague symptoms are hard to interpret. Should you wait and see, call a doctor, or get urgent help? WISP is designed to make that next decision clearer, without pretending to replace a healthcare professional.
3. Built for the Intelligent Self-Triage and Care Navigation challenge, WISP brings together conversational AI, structured assessment tools, and safety-governed decisions. Its goal is not to diagnose a disease. It's to help find the right next step in care.
4. WISP listens, then screens for warning signs first. If any are present, urgent care comes first. Otherwise, it decides whether a short movement check would add useful evidence, and guides the person to a clear recommendation, or an honest decision not to guess.
5. WorkBuddy is the AI orchestration layer. It interprets a vague complaint, spots what's missing, and judges whether more evidence could change the answer. Through MCP (defined tool interfaces, rather than chat alone) it calls WISP's screening and assessment tools. But WorkBuddy proposes; it doesn't decide. A deterministic safety engine authorises each check, applies the care rules, and never lets a reassuring measurement override concerning symptoms.
6. WISP explores Wi-Fi Channel State Information, or CSI, as a way to sense movement without a camera or a wearable. As a person moves, the wireless channel changes. An ESP32 receiver can capture CSI, and signal processing looks for the pattern of a defined task: five sit-to-stands. The timing is compared with the person's own baseline, when one exists. CSI adds functional evidence, not a diagnosis.
7. Consider Mdm Tan. She reports new weakness. WISP screens her first: no warning signs reported. WorkBuddy proposes a movement check, and the safety engine allows it. Mdm Tan starts it herself. In this demo, the signal is a recorded, synthetic session. Her chair rises are clearly slower than her usual, so WISP recommends being seen today, and explains why. A clear next step, not a diagnosis.
8. Safety comes first. Emergency warning signs take priority: no movement test. New symptoms override an earlier reassuring result. And if a measurement is unreliable, WISP abstains rather than offer false reassurance. It knows when it doesn't have enough evidence.
9. WISP pairs a wireless-sensing prototype with a modular AI workflow and explicit safety rules. Raw CSI stays local; the conversation may reach the AI service. Real-world and clinical validation come next.
10. WISP turns uncertainty into a clear next step, helping people navigate care, not replace it. WISP. Know what to do next.

The brief's draft narration was shortened to fit each scene at a measured pace (about 2.4 words/s). Every required explanation was kept: the challenge, WorkBuddy, MCP, CSI, the safety engine and abstention.
