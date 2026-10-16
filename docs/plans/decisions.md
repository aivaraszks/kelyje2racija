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

## 2026-10-16: Legacy radio look and KURTI return (plan: `legacy-radio.md`, pending approval)

User decision after reviewing the live site. It supersedes the "Radio rendering" and "Removed" entries above.

- **Radio rendering:** the legacy `walkie-shell.png` bitmap with an absolutely positioned HTML overlay.
  - The PNG is prepared offline by `tools/prepare-shell.mjs` (sharp): the black backdrop becomes transparent, which also removes the backdrop mark; the 556×1024 canvas is kept.
  - It is cut into three WebP slices. Only an 8 px band inside the LCD stretches, so the LCD height can grow from 1.0× to at most **1.4×** the legacy height.
  - All overlay geometry is in source pixels, multiplied by `--u` (shell width / 556).
  - The overlay paints its own LCD surface, so contrast does not depend on the bitmap.
- **Controls:** pill = KURTI/GARSAI (mode switch), round key = SIŲSTI, a row tap plays. PRIIMTI and PAIEŠKA are removed. Search is always visible at the bottom of the LCD. LCD rows are 32 px (WCAG 2.5.8 AA) instead of 44 px.
- **Pixel scene and Doto font:** both kept.
- **KURTI is back:**
  - `onnxruntime-web` (wasm, single thread, no COOP/COEP) runs in a chunk loaded only through dynamic `import()`. The ORT wasm files are copied from `node_modules` by `angular.json`, not committed.
  - The VITS model `csukuangfj/vits-coqui-lt-cv` (about 71 MB) is fetched from Hugging Face at a pinned SHA. It is downloaded on the first PALEISTI/SIŲSTI and cached in OPFS, with Cache Storage as the fallback.
  - The generated audio stays **WAV** (16-bit mono 22.05 kHz), so no encoder dependency is needed.
  - On iOS, a speech share runs inside the gesture only when the speech is already generated and cached; otherwise the user taps SIŲSTI again.
  - CI fails if `onnxruntime` reaches the initial bundle.
