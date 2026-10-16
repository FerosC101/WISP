# Verification report · `WISP_Competition_Demo_3m30.mp4`

Measured on the final exported file with `scripts/verify-35.sh` (ffprobe/ffmpeg), 15 Oct 2026.

## Measured

| Check | Result |
|---|---|
| Duration (container / video / audio) | **210.000 s / 210.000 s / 210.000 s** (3:30.000) |
| Video frames (counted by decoding) | **6,300** (frames 0–6299) |
| Frame rate | 30/1 (constant; r_frame_rate = avg_frame_rate) |
| Resolution | 1920×1080, 16:9 |
| Video codec | H.264 High, level 4.2, yuv420p, limited range |
| Colour | BT.709 primaries, transfer and matrix (rendered by Remotion with `--color-space=bt709`, tagged in the master) |
| Audio | AAC-LC, 48 kHz, stereo, 9,844 AAC frames (= 210.0 s) |
| File size / bitrate | 53.4 MB / 2.03 Mb/s |
| Full decode | No errors (`ffmpeg -v error -f null`) |
| Integrated loudness | −16.1 LUFS (LRA 4.9 LU) |
| True peak | −1.4 dBTP (limiter target −1.5; 0.1 dB over target, still below 0 dBFS) |
| Narration present in every clip window | Yes. Mean −17.8 to −20.3 dB in all 10 windows; music-only gaps measure −22.6 to −24.0 dB |
| Narration timing | All 10 clips play inside their scene windows (start ≥ scene start; the speech ends before the next scene). The only deliberate exception: `c10_close` starts 0.25 s before Scene 10, in the musical tail after `c09` |
| Final narration word ("next.") | ends ≈ 208.9 s; the lockup is fully on screen from ≈ 206.0 s and holds to 210.0 s |
| HyperFrames inserts | `challenge.mp4` (9.0 s) and `close.mp4` (7.0 s), both 1920×1080 at 30 fps, both pass `hyperframes check` |

## Checks performed

- **Visual review.** Two passes of stills from every scene (34, then 10 targeted), then a dense scan of the rendered file every 2 s (105 frames) looking for overlaps, clipped text, blank frames and broken transitions. Fixed as a result:
  - the question text brushing Mdm Tan's portrait
  - the WISP Line crossing the question mark
  - the phone covering the stage labels
  - wrapped tool-field chips
  - a caption colliding with the router label
  - the rep counter sitting on a picture frame
  - the stamp touching the abstain card
  - a near-blank frame at the 1:15 cut
  - static holds in Scenes 2 and 5
  - the sRGB transfer tag
- **Honesty labels.** Present where real and illustrated material meet: fictional personas, *Illustrative scenario*, *signal lines are not data*, *recorded, synthetic CSI session*, *real pipeline output on synthetic sessions*, *passer-by detection is experimental*, *not a validated clinical measurement*, *Real app screen(s)*, *Architecture view*, *working prototype · real-world and clinical validation come next*.
- **Copy accuracy.**
  - The recommendation, abstain and emergency copy matches the real app captures.
  - Tool and field names match `mcp/server.py`.
  - The SAFE-1 formula matches `docs/safety.md`.
  - Mdm Tan's disposition (Same-day care, raised from the Primary care soon ↔ Same-day range by a slower-than-usual movement check) matches the configured rules and the Technical view.
  - No accuracy figures, timings, percentages, risk scores or statistics are shown.
- **Branding.** No Tencent or Tencent Cloud logos. The event name is plain text, and the film makes no claim that a Tencent Cloud service powers WISP.

## Not verified (stated plainly)

- **Pronunciation by ear.** The audio wasn't listened to here. ElevenLabs Scribe aligned all eight transcribed clips to the script, but it returned the prompt text verbatim, so it is not independent evidence. Before submitting, listen to: "Wisp" (0:23.7), "WorkBuddy" (1:15.4), "MCP" (1:25.2), "Wi-Fi Channel State Information … C.S.I." (1:46.4–1:48.8), "E.S.P. thirty-two" (1:57.2) and "Madam Tan" (2:16.2).
- **Playback on a judge's machine.** The file decodes cleanly with ffmpeg; it hasn't been played in QuickTime, VLC or a browser here.
- **DaVinci Resolve QC.** Not performed. No Resolve MCP is connected, and the installed free Resolve 21.1.1 refuses external scripting (a Studio feature).
