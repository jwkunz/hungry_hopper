#!/usr/bin/env bash
# Convert the original WAVs (web/src/assets/audio_source) into small MP3s
# (web/src/assets/audio) that the game imports. Needs ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/../web/src/assets"
mkdir -p audio
for f in audio_source/sounds/*.wav; do
  ffmpeg -v error -y -i "$f" -ac 1 -b:a 64k "audio/$(basename "${f%.wav}").mp3"
done
for f in audio_source/music/*.wav; do
  ffmpeg -v error -y -i "$f" -b:a 96k "audio/music_$(basename "${f%.wav}").mp3"
done
ls -la audio
