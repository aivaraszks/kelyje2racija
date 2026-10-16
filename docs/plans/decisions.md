# Architecture decisions

## 2026-10-16: RACIJA radio rebuild (plan: `racija-radio.md`)

- **No backend.** The site is static on GitHub Pages. The only remote dependency is the free counter API `countapi.mileshilliard.com`. It keeps the keys `kelyje2racija-global-plays` and `kelyje2racija-global-shares`, so the totals carry over.
- **Stack:** Angular 22 (standalone, signals, zoneless, Vitest), Tailwind CSS v4 through PostCSS, **plain CSS instead of SCSS** (Tailwind v4 does not support Sass), pnpm, Node 26.
- **Structure:** one lazy feature `features/radio`; services in `core/` (sounds, audio, share, counter); the pixel background in `shared/pixel-scene`.
- **Radio rendering:** a flexible CSS body with SVG parts (logo, grille pattern, cable). The LCD is an HTML region that grows with the viewport. No bitmap shell. `walkie-shell.png` is dropped because of its watermark.
- **Background:** a procedural low-resolution `<canvas>` upscaled with `image-rendering: pixelated`, running at about 12 fps. It pauses when hidden and shows a static frame under `prefers-reduced-motion`. No image assets.
- **Audio:** the WAVs are converted once to MP3 (mono, about 96 kbps, loudness normalized) with `ffmpeg-static` through `tools/convert-sounds.mjs`. ffmpeg is not installed on the dev machine. Only the MP3s are committed.
- **Catalog:** a typed TS module with the corrected phrase texts and a `voice` field (`vyras`, `moteris`, `nezinoma`). No gender suffix in the titles.
- **Share:** Web Share API Level 2 with a prefetched MP3 `File`, so the user gesture is kept. Falls back to a download. A Messenger voice note is not possible from the web.
- **Removed:** the KURTI text-to-speech feature and onnxruntime-web along with its 68 MB model.
- **Deploy:** GitHub Actions to GitHub Pages, replacing `aivaraszks.github.io/kelyje2racija/` (base href `/kelyje2racija/`). Every push or deploy requires explicit user confirmation.
- **Process:** user review checkpoints at (A) phrase list + UX spec + static design preview, (B) first working UI, and (C) before deploy.
