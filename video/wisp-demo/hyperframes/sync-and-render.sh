#!/bin/zsh
# Copies the shared brand CSS + fonts into each insert project, runs `hyperframes check`, and renders each insert
# to ../public/hf/<name>.mp4 for compositing in Remotion. Local only; telemetry and skill installs are opted out.
set -euo pipefail
cd "${0:A:h}"
export DO_NOT_TRACK=1 HYPERFRAMES_SKIP_SKILLS=1
HF=(npx -y hyperframes@0.8.157)
mkdir -p ../public/hf
names=("$@")
(( ${#names} )) || names=(ident principle endcard)
for n in $names; do
  mkdir -p $n/assets/fonts
  cp shared/brand.css $n/brand.css
  cp assets/fonts/*.woff2 $n/assets/fonts/
  if [[ "${SKIP_CHECK:-0}" != 1 ]]; then "${HF[@]}" check $n; fi
  "${HF[@]}" render $n -o ../public/hf/$n.mp4 --quality delivery --fps 30
done
