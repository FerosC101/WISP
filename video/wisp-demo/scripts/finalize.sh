#!/bin/zsh
# out/wisp-demo-video.mp4 (Remotion render) → wisp-demo.mp4 (deliverable):
#   · loudness-normalise the mix to -16 LUFS (linear gain) with a -1.5 dBTP true-peak limiter
#   · bake a settled poster frame into frame 0 (replaces the frame; duration and sync unchanged)
#   · write wisp-demo-poster.jpg and contact-sheet.png (two frames from each of the nine scenes)
set -euo pipefail
cd "${0:A:h}/.."
IN=out/wisp-demo-video.mp4
POSTER_T=18.5   # "I feel weak." / "What should I do next?" with the three destinations, fully settled
mkdir -p work/final

ffmpeg -v error -y -ss $POSTER_T -i $IN -frames:v 1 work/final/poster.png
ffmpeg -v error -y -i work/final/poster.png -q:v 2 wisp-demo-poster.jpg

# Linear gain to -16 LUFS, then an oversampled true-peak limiter at -1.5 dBTP (no dynamic loudnorm,
# which would ride the gain and lift quiet passages).
IN_I=$(ffmpeg -hide_banner -i $IN -vn -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
GAIN=$(python3 -c "print(round(-16 - (${IN_I}), 2))")
echo "input ${IN_I} LUFS → gain ${GAIN} dB"

ffmpeg -v error -y -i $IN -loop 1 -t 0.04 -i work/final/poster.png \
  -filter_complex "[0:v][1:v]overlay=eof_action=pass:enable='eq(n,0)',format=yuv420p[v]" \
  -map "[v]" -map 0:a \
  -af "volume=${GAIN}dB,aresample=192000,alimiter=limit=0.84:attack=1:release=60:level=disabled,aresample=48000" \
  -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.2 -r 30 -c:a aac -b:a 192k -ar 48000 -t 300 -movflags +faststart wisp-demo.mp4

T=(10 18.5 30 44 56 74 88 140 172 194 214 236 248 256 266 276 287 297)
for t in $T; do ffmpeg -v error -y -ss $t -i wisp-demo.mp4 -frames:v 1 -vf scale=640:360 work/final/c_$t.png; done
n=${#T}
ffmpeg -v error -y $(for t in $T; do echo -i work/final/c_$t.png; done) -filter_complex \
  "$(for i in $(seq 0 $((n-1))); do printf "[$i]"; done)xstack=inputs=${n}:grid=6x3" contact-sheet.png

ffprobe -v error -show_entries format=duration:stream=codec_name,profile,width,height,r_frame_rate,nb_frames,sample_rate,channels -of compact wisp-demo.mp4
ffmpeg -hide_banner -i wisp-demo.mp4 -vn -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
