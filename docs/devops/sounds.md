# Sound clips

1. Put source WAVs in `tools/sounds-src/` (gitignored). The file basename is the clip id.
2. Run `pnpm convert:sounds` (uses `ffmpeg-static`, no system ffmpeg needed).
3. Output: `public/sounds/<id>.mp3` (mono, 44.1 kHz, 96 kbps CBR, two-pass loudnorm I=-16 / TP=-1.5 / LRA=11, silence trimmed to <=50 ms).
4. The script prints per-file sizes/durations, warns if a clip shrank by >0.5 s, and exits non-zero on any ffmpeg failure.
5. Commit the generated MP3s; never rename ids without updating the text mapping.
