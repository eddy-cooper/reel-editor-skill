#!/usr/bin/env bash
# Render this reel, then two-pass loudnorm to -14 LUFS / -1.5 dBTP (video stream copied).
# Writes out/<folder name>.mp4, e.g. out/reel-03.mp4.
set -e
cd "$(dirname "$0")"
N=$(basename "$PWD")
mkdir -p out
npx remotion render src/index.ts Reel "out/$N-raw.mp4" --codec h264 --crf 17 --audio-codec aac --audio-bitrate 256k --log=error
J=$(ffmpeg -hide_banner -nostats -i "out/$N-raw.mp4" -af loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
# node, not python3: on Windows `python3` is often the Microsoft Store stub
g() { echo "$J" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)['$1']))"; }
ffmpeg -v error -y -i "out/$N-raw.mp4" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=9:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a aac -b:a 256k -movflags +faststart "out/$N.mp4"
ffmpeg -hide_banner -nostats -i "out/$N.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
