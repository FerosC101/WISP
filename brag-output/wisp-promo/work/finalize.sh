#!/bin/zsh
# Encode the final deliverables from work/frames + work/audio/mix_norm.wav.
set -euo pipefail
cd "${0:A:h}"
OUT=..
POSTER_FRAME=135   # t = 4.5 s: room, the WISP Line, "I feel weak." and "What should I do next?" all settled

# poster → frame 0 (replace, never insert, so duration and sync stay identical)
cp frames/f_$(printf %05d $POSTER_FRAME).png poster.png
cp frames/f_00000.png f_00000_original.png
cp poster.png frames/f_00000.png
ffmpeg -v error -y -i poster.png -q:v 2 $OUT/wisp-promo-poster.jpg

ffmpeg -v error -y -framerate 30 -i frames/f_%05d.png -i audio/mix_norm.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.2 -r 30 \
  -c:a aac -b:a 192k -ar 48000 -t 20 -movflags +faststart $OUT/wisp-promo.mp4
cp f_00000_original.png frames/f_00000.png

# deliverable audio stems
ffmpeg -v error -y -i audio/vo_take1.mp3 -c copy $OUT/wisp-promo-voiceover-elevenlabs.mp3
ffmpeg -v error -y -i audio/music.wav -c:a libmp3lame -q:a 2 $OUT/wisp-promo-music-original.mp3

# contact sheet at the review timestamps
mkdir -p check
T=(0 3 6 10 13 17 19 4.5 8.6 11.8 15.6 19.9)
for s in $T; do ffmpeg -v error -y -ss $s -i $OUT/wisp-promo.mp4 -frames:v 1 check/final_$s.png; done
ffmpeg -v error -y $(for s in $T; do echo -i check/final_$s.png; done) -filter_complex \
  "$(i=0; for s in $T; do printf "[$i]scale=360:640[v$i];"; i=$((i+1)); done)$(for i in $(seq 0 11); do printf "[v$i]"; done)xstack=inputs=12:grid=6x2" \
  $OUT/wisp-promo-contact-sheet.png
ffprobe -v error -show_entries format=duration:stream=codec_name,profile,width,height,r_frame_rate,nb_frames,sample_rate,channels -of compact $OUT/wisp-promo.mp4
