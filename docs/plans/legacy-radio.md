# Plan: legacy radio (bitmap shell + KURTI text-to-speech)

Status: **approved by the user, 2026-10-16**.

User answers (2026-10-16):

- **Plan:** approved; start building.
- **Q1 licence:** accept the risk; show the small credit in KURTI mode; keep checking the licence.
- **Q2 download:** **start the model download as soon as KURTI opens** (overrides L8's default). Still show the size ("apie 71 MB") and progress while it downloads; leaving KURTI must not cancel a download already in progress.
- **Q3 iOS:** two taps for the first speech share is acceptable.
- **Checkpoint A passed (2026-10-16):** the user approved the preview `docs/design/preview/racija-preview.html` (legacy bitmap shell, Doto LCD, bottom strip, KURTI panel) **and the redrawn pixel cabin**: a truck driver's-seat interior (left A-pillar + two mirrors, visor, dashboard with gauges, steering wheel left of centre, centre console; outside landscape unchanged), spec in `docs/design/components/pixel-scene.md` §4a. On phones the radio hiding the mirrors is accepted.
- **Deploy (2026-10-16):** the user asked to deploy as soon as KURTI was finished, skipping checkpoint B; the user tests on the live site. KURTI was verified in headless Edge under `/kelyje2racija/` (real HF download, ORT wasm, generation, OPFS cache).
- **Checkpoint A feedback:** on desktop (≥ 64rem wide) the radio's stage is capped at **75% of the viewport height**, centred, so more of the pixel scene shows. Phone LCD stays auto up to 1.4×.
Supersedes in `racija-radio.md`: **D4** (CSS/SVG radio body), **D5** (controls mapping), **D16** (KURTI dropped). Confirms **D14** with Doto. Keeps **D13** (pixel scene) unchanged.
Legacy source (read-only): `C:\Users\ZakarauskasA\Documents\code-local\kelyje` (`walkie-talkie.component.*`, `walkie-shell.png`, `tts.service.ts`, `piper-tts.client.ts`, `share.service.ts`).

User decisions (2026-10-16), fixed: legacy look via the legacy PNG plus an HTML overlay; transparent backdrop (which also removes the backdrop mark); same resolution; keep `PixelScene`; pill = **KURTI**, round = **SIŲSTI**, a row tap plays; no PRIIMTI and no PAIEŠKA; a fixed search field at the bottom of the LCD next to Vyras/Moteris; Doto font; the LCD may grow, but only up to a cap; KURTI returns with lazy onnxruntime-web and the HF model, cached in OPFS, with a progress UI.

## Goal

Make the live RACIJA app look and work like the legacy kelyje2racija radio again, on top of the new pixel-art cabin scene. The radio is the legacy `walkie-shell.png`, made transparent around the body and cut into three slices, so that the LCD can grow a little on tall screens. Real HTML controls sit over the bitmap. The LCD shows the phrase list with a fixed search field and the voice toggle at the bottom. The pill (KURTI/GARSAI) switches between the list and a "create your own phrase" mode. In that mode the user types Lithuanian text, hears it with PALEISTI and sends it as a WAV file with the round SIŲSTI key. The text-to-speech engine (onnxruntime-web and the ~71 MB VITS model) loads only when the user asks for speech in KURTI mode. The first page load stays as small as it is today.

## Done means

- At 360×740, 412×915 and 1440×900 the radio is the legacy bitmap over the animated pixel scene. No black box and no ✦ mark are visible, and the edges show no dark fringe at a normal viewing distance.
- The LCD is never shorter than the legacy proportion (1.0×) and never taller than **1.4×** the legacy LCD height (L2). Buttons, grille and cable keep their legacy proportions.
- Phrase mode: tapping a row selects and plays it. The search field at the bottom of the LCD filters without regard to diacritics. Vyras/Moteris works as it does now. SIŲSTI shares the selected clip as `racija-<id>.mp3`, or downloads it.
- KURTI mode: the pill reads GARSAI. The user can type up to 220 characters. Opening KURTI downloads the model the first time, with visible progress; PALEISTI then plays the generated speech. SIŲSTI shares the generated speech as a `.wav` file, or downloads it. On a second visit the model loads from the cache with no network download.
- The initial page load does not request `onnxruntime-web`, any `.wasm` file or any huggingface.co URL. The initial JS transfer size grows by no more than 10 KB gzipped compared with `main` today. A CI check guards this (task 11).
- The counters (same keys), toast, live region, sound hint and footer note work as they do now.
- `pnpm build`, `pnpm test:ci` and `pnpm format:check` pass. axe finds no violations in either mode. Keyboard-only use works. Lighthouse accessibility scores 100.
- The user has approved the visual check (⏸ A and ⏸ B) and has explicitly confirmed the push to `main` (⏸ C).

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| L1 | **The shell is the legacy bitmap, prepared offline.** `tools/prepare-shell.mjs`, using `sharp` as a devDependency, reads `tools/shell-src/walkie-shell.png` (gitignored, copied from kelyje) and does the following:<br>(1) Flood-fills the near-black backdrop from the four image edges with a tight tolerance (start at max channel ≤ 14 and tune it), so the dark cable is not eaten.<br>(2) Keeps only the largest opaque connected component. This removes the ✦ mark and any specks.<br>(3) Cleans the fringe. For edge pixels next to the removed area, it derives alpha from luminance against black and un-premultiplies the colour, which avoids a dark halo.<br>(4) Keeps the **556×1024 canvas** (no crop), so the legacy coordinates stay valid.<br>(5) Writes three slices (L2) as **WebP** (quality about 90, lossless alpha) to `public/radio/shell-{top,mid,bottom}.webp`.<br>Only the outputs are committed. No 2× upscale. | This is the legacy look the user wants. It is reproducible, like `convert:sounds`. All target browsers support WebP. Keeping the canvas size makes positioning simple. |
| L2 | **3-slice stretch, LCD capped at 1.4×.** The cut lines are in source pixels:<br>- **top** is y 0–272 (logo, the top of the bezel, the upper LCD);<br>- **mid** is y 272–280, an 8 px band through the flat LCD, bezel and body sides;<br>- **bottom** is y 280–1024 (lower LCD, keys, grille, cable).<br>(Measured in task 1: the originally proposed 290–298 band was not uniform; 272–280 has a max row-to-row difference of 3 levels. See "Shell geometry" in `docs/design/components/radio.md`.)<br>The designer confirms that the band rows contain only straight vertical edges (task 1). The shell is a flex column: top and bottom are `<img ngSrc>` (`priority` on top), and mid is a `div` with the band as a `background-size: 100% 100%` image. The mid band is `flex: 1` with `min-height: 8u` and `max-height: (8 + 112)u`, where 112 = 0.4 × the legacy LCD height of 281 px. All geometry uses one unit, `--u` = shell width / 556:<br>- the stage is a `container-type: size` box (100dvh minus the furniture);<br>- `--shell-w: clamp(min(100cqw, 300px), min(100cqw, 100cqh * 556 / 1136), 556px)`;<br>- `--u: calc(var(--shell-w) / 556)`;<br>- shell height = `min(100cqh, 1136u)`.<br>So when height is the limit (desktop), the LCD sits at the full 1.4×. When width is the limit (phones), the LCD gets the spare height, up to 1.4×. The shell is never wider than 556 CSS px, so it is never shown above 1:1. It is never narrower than 300 px unless the viewport is: below that the page scrolls. | Only the band inside the LCD stretches, so the logo, keys, grille and cable are never distorted. The single `--u` unit keeps every overlay rectangle in legacy pixel coordinates. The cap is one constant (`0.4`), so it is easy to tune at ⏸ A. |
| L3 | **The overlay is absolutely positioned in `--u` units.** Elements above the band are anchored from the top (`top: calc(var(--u) * y)`). Elements below it are anchored from the bottom (`bottom: calc(var(--u) * (1024 - y))`). The LCD rectangle is anchored at both ends, so it grows with the band automatically. Starting values come from the legacy CSS; the designer re-measures them on the prepared PNG:<br>- screen: x 75–475, y 154–435;<br>- pill: x 92–261, y 442–539;<br>- round key: centre about (382, 554), diameter about 186.<br>**The overlay paints its own LCD surface** (`lcd-bg`, the existing scanline overlay, a radius that matches the bitmap screen corners) and covers the bitmap's grey screen, so text contrast never depends on the bitmap. | Legacy-proven technique. The LCD tokens already pass contrast (9.18:1). The bitmap screen grey with legacy ink is only about 4.6:1. |
| L4 | **Controls.** The bitmap pill is **KURTI** in phrase mode and **GARSAI** in KURTI mode. The bitmap round key is **SIŲSTI**. Both are real `<button>`s with transparent backgrounds over the bitmap faces, HTML labels, a pressed state (`translateY(1px)` plus an inner darkening, not opacity alone), a 3 px `focus` ring and `aria-disabled` / `aria-busy` as today. A row tap selects and plays, and tapping the playing row restarts it (UX U1 is kept). There is no stop control: clips are 1–3 s long. The bitmap's green ring stays static. SIŲSTI shows a pulsing ring overlay only while it is busy. The `h1` "RACIJA" is visually hidden and placed over the bitmap logo. | This matches the legacy layout and the user's mapping. The LED-on-play idea belonged to PRIIMTI, which is gone. |
| L5 | **LCD layout.**<br>**Phrase mode:** the scrolling listbox (as now) on top. Below it, a fixed bottom strip: the search field (`type="search"`, always visible, diacritic-insensitive, with a × clear button, and Esc clears the text) plus the Vyras/Moteris segmented toggle. On narrow screens the strip may use two lines; UX decides. The visible "Įrašų: N" count is dropped because there is no room, but the live region still announces counts.<br>**KURTI mode:** a labelled textarea (maxlength 220, with a character count), the PALEISTI button, a status/progress area and the same voice toggle. The search field is hidden in this mode. The query is kept when the user switches modes. | This is the user's layout, and it fits the small bitmap screen. The listbox, roving focus and normalisation code are reused. |
| L6 | **LCD sizes on a small screen:**<br>- Doto 800 at **1rem** (16 px), the same for rows, textarea and search (16 px also stops iOS from zooming the input);<br>- rows `min-height: 2rem` (32 px);<br>- toggle segments and the × at least 32 px tall, with at least a 24 px hit area as required by WCAG 2.5.8 AA.<br>This **changes UX 9.3 / design 4.2 from 44 px to 32 px** for LCD rows and LCD controls. The keys over the bitmap stay far above 44 px. Text sizes use `rem` (not `cqw`), so browser zoom and text zoom scale them. Key labels use `max(1rem, …cqw)` and must not clip. | At 360×740 the bitmap LCD is only about 225×190–220 CSS px. 44 px rows would show 3 rows. With 32 px rows at least 4 rows plus the bottom strip are visible, and AA is still met. |
| L7 | **TTS engine: a port of legacy `piper-tts.client.ts` as a lazily loaded chunk.**<br>- `core/tts/tts-engine.ts` contains the onnxruntime code and the tokenizer. It has no Angular imports and is only reached through `await import('./tts-engine')` in `TtsService`.<br>- Pure helpers (`pcmToWav`, `pitchShift`, `concatPcm`, `splitSentences`, `textToTokenIds`) go in `core/tts/pcm.ts` so they can be unit-tested without ORT.<br>- `onnxruntime-web` is the current 1.x release, imported from `onnxruntime-web/wasm`, with `numThreads = 1` (GitHub Pages cannot send COOP/COEP headers, so there is no SharedArrayBuffer), main thread.<br>- The ORT `.wasm`/`.mjs` files are copied by an `angular.json` asset glob from `node_modules/onnxruntime-web/dist` to `ort/`, and are **not committed** (legacy committed one by hand). `env.wasm.wasmPaths` is resolved from `document.baseURI`.<br>- The model and `tokens.txt` come from `huggingface.co/csukuangfj/vits-coqui-lt-cv`, **pinned to a commit SHA** instead of `main`.<br>- The synthesis parameters are the same as legacy: scales per voice, add-blank, blank id 3, the Vyras pitch shift of −5 semitones by resampling, and a 200 ms lead-in. | This is the legacy behaviour the user liked. The dynamic import keeps ORT out of the initial bundle. Pinning the SHA stops the model from changing silently. Single-threaded ORT works without special headers. |
| L8 | **Download trigger, cache and progress.** (Changed by the user, 2026-10-16.)<br>- **Opening KURTI starts the download** when the model is not cached, with the size note "apie 71 MB" and progress shown. Leaving KURTI does not cancel it. Right after the download (or a cache hit) the session is prepared, so the first PALEISTI is fast.<br>- `TtsService` (in `core/tts/`, `@Service`) exposes signals: `state` (`idle`, `downloading`, `preparing`, `ready`, `generating`, `error`) and `progress` (`{ phase, loaded, total }`). The UI shows a `role="progressbar"` with MB loaded out of the total. If `Content-Length` is missing, it falls back to the known size. Start and finish are announced in the live region, but not each percent.<br>- Cache: **OPFS** directory `racija-tts`, as in legacy. If `getDirectory` or `createWritable` is missing or throws, the **Cache Storage API** (`caches.open('racija-tts')`) is used instead. If neither works, the model is downloaded again each session.<br>- A failed download shows a retry message and lets the user try again. A half-written file is never used as cached (write the file only after the full download, and check its size). | Mobile data users should not pay 71 MB just for looking at KURTI. The fallback covers iOS versions with partial OPFS support. |
| L9 | **Generated audio format: keep WAV** (PCM 16-bit, mono, 22.05 kHz, as in legacy). The file is `racija-<slug>-<voice>.wav`, type `audio/wav`, with the slug rule from legacy. MP3 encoding is not done. | It needs no encoder dependency and has no extra latency. It is about 44 KB per second, so even 220 characters (about 15 s) is under 1 MB. Web Share accepts `.wav` on Android Chrome and iOS. Legacy shipped it. If the tester finds that Messenger does not play WAV attachments, a lazily loaded MP3 encoder is the fallback (open question). |
| L10 | **User gesture strategy (iOS).**<br>- The generated `Blob` is cached in `TtsService` under the key (trimmed text, voice). **PALEISTI:** `AudioPlayerService.unlock()` runs synchronously in the tap (it plays and pauses the shared element, so iOS allows a later `play()`). The app then generates speech if needed and plays it as an object URL through `AudioPlayerService.play({ id: 'tts', file: url })`. One audio element is shared by clips and speech, so only one sound plays at a time.<br>- **SIŲSTI in KURTI mode:** if the cache already holds this text and voice, the app calls `ShareService.shareFile()` synchronously in the tap. Otherwise it generates the speech and does not share. It shows "Paruošta. Spauskite SIŲSTI dar kartą.", and the next tap shares inside the gesture.<br>- A speech preview counts as a play. A successful share or download of speech counts as a share. | Legacy called share after a multi-second await, which iOS rejects (`NotAllowedError`). Two taps the first time is the only reliable option on iOS. |
| L11 | **Reuse the core services.** `ShareService` gets `shareFile(file: File, title)`, and the existing `share(sound)` becomes a thin wrapper around it, with the same outcomes and download fallback. `CounterService`, `SoundCatalogService`, `normalize`, `sound-catalog.ts`, `PixelScene`, the MP3s and the fonts stay unchanged. | This is the smallest change, and the share outcome handling stays in one place. |
| L12 | **Lazy-load guard.** After `pnpm build`, a CI step (`tools/check-initial-bundle.mjs`) reads the build's `stats.json` or the initial `<script>` tags in `index.html`. It fails if any initial chunk contains `onnxruntime` or `.wasm` references. | It stops a stray static import from adding about 0.5 MB of JS to the first load. |

## Tasks

Owners: `ux`, `designer`, `frontend`, `devops`, `tester` (`backend` has no tasks). **⏸ = stop for user review.** Pass this plan path to every agent.

**Phase 1: shell asset and specs**

1. `designer`: Measure the legacy PNG in source pixels and record the results in `docs/design/components/radio.md` (new "Shell geometry" section):
   - the LCD rectangle and its corner radius;
   - the pill rectangle;
   - the round-key circle;
   - the logo box (for the hidden `h1`);
   - the confirmed L2 cut lines, chosen so that the band rows are uniform.

   These values are the constants for tasks 2 and 6.
2. `devops`: `tools/prepare-shell.mjs` and the `prepare:shell` script (L1), with `sharp` as a devDependency and `tools/shell-src/` added to `.gitignore`.
   - It writes the three WebP slices to `public/radio/` and prints their sizes.
   - It also writes a full-size debug PNG to the scratch dir so that the designer can check the fringe and confirm the ✦ is gone.
   - Document it briefly in `docs/devops/shell.md`.
3. `ux`: Update `docs/ux/racija-radio.md`. Mark the superseded items (U2, U3, U4 for PRIIMTI, U8's "closing search", 5.5's PAIEŠKA flow and the 44 px rows) and add:
   - the new control mapping (L4) and the mode switch (KURTI ↔ GARSAI), with focus moving to the textarea or the listbox;
   - the bottom strip layout and the Esc behaviour;
   - the KURTI flow and its states: empty text, size note, downloading with progress, preparing, generating, ready, playing, the "press SIŲSTI again" step, unsupported browser, download error with retry, "no Lithuanian characters", text too long, offline;
   - all new Lithuanian copy in the "jūs" form. The legacy copy is in the "tu" form ("Įvesk frazę…"), so convert it;
   - the new keyboard order: listbox → search → × → Vyras → Moteris → KURTI → SIŲSTI. In KURTI mode: textarea → PALEISTI → Vyras → Moteris → GARSAI → SIŲSTI;
   - the live region messages for TTS;
   - an updated manual checklist (section 12).
4. `designer`: Rewrite `docs/design/components/radio.md` for the bitmap shell:
   - the slices and `--u` sizing (L2, L3);
   - the overlay LCD surface matched to the bitmap bezel;
   - row and strip sizes (L6);
   - the key overlay states (pressed, focus, `aria-disabled`, busy pulse);
   - the KURTI panel (textarea, PALEISTI, progress bar) and its contrast.

   Also:
   - prune the PRIIMTI, LED, cap, cable and grille tokens from `docs/design/design-system.md` and from `src/styles.css` `@theme`, but only after frontend task 8 removes their usage. Mark them "to delete" until then;
   - update `docs/design/preview/racija-preview.html` so that it shows the prepared slices over the existing scene prototype at 360×740, 412×915 and 1440×900, with mock LCD content in Doto, in phrase mode and KURTI mode, with the LCD at 1.0× and 1.4×.

**⏸ Checkpoint A: user reviews the static preview (look, transparency, fringe, the 1.4× cap) and the UX changes.** The user also answers the open questions (Q1–Q3 below). Tune the cap and cut lines here if needed.

**Phase 2: build**

5. `frontend`: Core TTS (L7, L8, L9).
   - Add the `onnxruntime-web` dependency and the `angular.json` asset glob that copies the ORT `.wasm`/`.mjs` files to `ort/`.
   - Write `core/tts/pcm.ts`, `core/tts/model-cache.ts` (OPFS, then Cache Storage, then none), `core/tts/tts-engine.ts` (ported, with the HF SHA pinned) and `core/tts/tts.service.ts` (signals, lazy `import()`, the blob cache keyed by text and voice, the 220-character limit), each with a spec. The engine is mocked in the service spec.
6. `frontend`: `AudioPlayerService.unlock()` and `ShareService.shareFile()` (L10, L11), with specs. Object URLs for speech are revoked when they are replaced.
7. `frontend`: The radio shell and overlay (L2–L4). Rewrite `radio.component.{html,css,ts}`:
   - the shell slices with `NgOptimizedImage`;
   - the `--u` geometry;
   - the overlay keys as plain `<button>`s;
   - mode state (`'sounds' | 'create'`);
   - SIŲSTI routing by mode.

   Delete `radio-button.component.*` and `radio-graphics.components.*` with their specs. Keep the toast, live region, hint, counters and footer as they are.
8. `frontend`: Update `lcd-screen.component` with the bottom strip (search always visible, × button, Esc clears; remove `searchOpen`, `searchClose`, `SEARCH_ID`/`aria-controls`) and L6 sizes. Add `tts-panel.component` for KURTI mode (textarea, count, PALEISTI, progress, status), shown in the same LCD surface. Specs.
9. `frontend`: Update the docs that frontend owns:
   - Edit the `CLAUDE.md` Tech stack section (proposed text below).
   - Remove the "to delete" tokens from `src/styles.css`.
   - Run `pnpm build`, `pnpm test:ci` and `pnpm format:check`.
10. `tester`: Fill the test gaps:
    - mode switching and focus;
    - SIŲSTI routing in both modes, with the cached and uncached speech paths ("press again");
    - the TTS service states and retry;
    - cache fallback order;
    - `pcmToWav` header and length;
    - the pitch-shift length;
    - Esc clears the search;
    - the voice toggle in both modes;
    - an axe test of `RadioComponent` in phrase mode and in KURTI mode, including the progress state;
    - keyboard order.

    Update or remove the specs for PRIIMTI and PAIEŠKA.
11. `devops`: `tools/check-initial-bundle.mjs` (L12) and a step for it in `.github/workflows/deploy.yml` after the build. Document phone testing over LAN: run `ng serve --host 0.0.0.0 --ssl`, because OPFS, `navigator.share` and Cache Storage need a secure context.

**⏸ Checkpoint B: the user checks the new radio visually and functionally on the dev server**, on a phone over HTTPS LAN and on desktop. This is the required visual check before deploy. Feedback goes to tasks 12 and 13.

**Phase 3: polish and ship**

12. `ux` and `designer`: Review the built UI against the updated specs (blocker, should-fix and nice-to-have items). `frontend` fixes them, then `tester` re-runs the suite.
13. `tester`: Manual device pass per the updated UX checklist:
    - **iOS Safari:** the first KURTI download, then a reload, to confirm the cache hit and see which cache was used. Memory: generate 5 phrases in a row with no tab reload, which crashed with the 71 MB model on older iPhones. Share a WAV to Messenger and check that it plays. Share a clip MP3. Check silent mode.
    - **Android Chrome:** the same checks.
    - **Desktop Chrome, Firefox and Safari:** download fallback, keyboard, 200% zoom, text zoom, reduced motion.
    - **Lighthouse:** run it on the first load, and confirm in the network panel that there is no ORT or HF traffic before KURTI.

**⏸ Checkpoint C: explicit user confirmation before pushing to `main`.** Every push deploys.

14. `devops`: Push, watch the workflow and verify the live site:
    - `/kelyje2racija/radio/*.webp` and `/kelyje2racija/ort/*` load;
    - the HF fetch works from the Pages origin (CORS);
    - the counters continue;
    - KURTI works end to end on the live URL.

## Code: reuse, change, delete

- **Reuse unchanged:**
  - `core/sounds/*` (catalog, service, normalize);
  - `core/counter/counter.service.ts`;
  - `shared/pixel-scene/*`;
  - `public/sounds/*.mp3`;
  - `src/fonts/doto-*`;
  - `app.ts`, `app.routes.ts`, `index.html` (meta tags);
  - the toast, live region, hint, counters and footer markup;
  - `formatCount` and `MSG` (extended).
- **Change:**
  - `core/audio/audio-player.service.ts` (`unlock()`);
  - `core/share/share.service.ts` (`shareFile()`, MIME type and file name passed in);
  - `features/radio/radio.component.*` (shell, overlay, modes);
  - `features/radio/lcd-screen.component.*` (bottom strip, sizes);
  - the specs for all of these: `radio.integration.spec.ts`, `radio.a11y.spec.ts`;
  - `src/styles.css` (prune tokens, maybe add a shell token or two);
  - `angular.json` (ORT asset glob);
  - `package.json` (`onnxruntime-web`, `sharp`, the `prepare:shell` script);
  - `.gitignore`;
  - `.github/workflows/deploy.yml`.
- **Delete:**
  - `features/radio/radio-button.component.{ts,css,spec.ts}`;
  - `features/radio/radio-graphics.components.{ts,spec.ts}` (logo, cable and grille now come from the bitmap);
  - the PRIIMTI and PAIEŠKA logic in `radio.component.ts` (`onAccept`, `toggleSearch`, `closeSearch`, `searchOpen`);
  - the LED, key and cap/grille tokens and animations.
- **New:**
  - `core/tts/{tts.service,tts-engine,pcm,model-cache}.ts` with specs;
  - `features/radio/tts-panel.component.*` with a spec;
  - `public/radio/shell-{top,mid,bottom}.webp`;
  - `tools/prepare-shell.mjs`;
  - `tools/check-initial-bundle.mjs`.

## Files

- Create:
  - `src/app/core/tts/tts.service.ts`, `tts-engine.ts`, `pcm.ts`, `model-cache.ts`, with specs;
  - `src/app/features/radio/tts-panel.component.{ts,html,css,spec.ts}`;
  - `public/radio/shell-top.webp`, `shell-mid.webp`, `shell-bottom.webp`;
  - `tools/prepare-shell.mjs`, `tools/check-initial-bundle.mjs`;
  - `docs/devops/shell.md`.
- Change:
  - `src/app/features/radio/radio.component.{ts,html,css}`, `lcd-screen.component.{ts,html,css}`, with specs, plus `radio.integration.spec.ts` and `radio.a11y.spec.ts`;
  - `src/app/core/audio/audio-player.service.ts`, `src/app/core/share/share.service.ts`, with specs;
  - `src/styles.css`, `angular.json`, `package.json`, `pnpm-lock.yaml`, `.gitignore`, `.github/workflows/deploy.yml`.
- Delete: `src/app/features/radio/radio-button.component.*`, `src/app/features/radio/radio-graphics.components.*`.
- Docs:
  - `docs/ux/racija-radio.md` (ux);
  - `docs/design/components/radio.md`, `docs/design/design-system.md` and `docs/design/preview/racija-preview.html` (designer);
  - `docs/devops/deploy.md` (LAN HTTPS note) (devops);
  - the `CLAUDE.md` Tech stack section (frontend, task 9);
  - `docs/plans/racija-radio.md` (supersede note, already added) and `docs/plans/decisions.md` (entry already appended).
  - `docs/design/components/pixel-scene.md` needs no change.

## Proposed CLAUDE.md Tech stack additions

```md
- Radio shell: the legacy `walkie-shell.png`, made transparent and cut into three WebP slices in `public/radio/` by `pnpm prepare:shell` (sharp) from the gitignored `tools/shell-src/`. Overlay geometry is in source pixels (`--u`); see `docs/design/components/radio.md`.
- KURTI text-to-speech: `onnxruntime-web` (wasm, single thread), loaded only through a dynamic `import()` in `core/tts/tts.service.ts`. The ORT wasm files are copied from `node_modules` to `ort/` by `angular.json`. Model: `csukuangfj/vits-coqui-lt-cv` from Hugging Face (pinned SHA), fetched at runtime and cached in OPFS (falling back to Cache Storage). Never import `onnxruntime-web` statically; CI checks the initial bundle.
```

(Also remove "The text-to-speech feature (KURTI) and the ONNX model are gone" wherever it is still stated.)

## Risks / open questions

- **Q1 Model licence (user decides at ⏸ A).** The HF repo `csukuangfj/vits-coqui-lt-cv` has **no model card and no licence**. It looks like a conversion of Coqui's `tts_models/lt/cv/vits`. Coqui lists the sibling Common Voice VITS models (bg, cs, da, et, ga, …) as **BSD-3-Clause**, and Common Voice data is CC0. The Lithuanian entry was not confirmed. Legacy already used the model publicly. Recommendation: accept the risk, add "Balsas: Coqui TTS (lt/cv/vits)" in small print in KURTI mode, and confirm the entry in Coqui's `.models.json` during task 5.
- **Q2 When the download starts.** Default (L8): on the first PALEISTI/SIŲSTI, with the size shown in advance. The alternative is to start on opening KURTI, which is faster on Wi-Fi but costs 71 MB of mobile data for anyone who only looks. Please confirm the default.
- **Q3 Two taps for the first speech share on iOS (L10).** The first SIŲSTI after new text generates the speech and asks the user to tap again. This is a platform limit. Please confirm it is acceptable.
- **iOS memory.** The fp32 model is 71 MB. While it loads, the network chunks, the Blob, the ArrayBuffer and the copy in the wasm heap together peak at about 250–300 MB. Older iPhones may reload the tab. Mitigations:
  - drop the references right after `InferenceSession.create`;
  - keep one session for the page lifetime;
  - if `create` fails, show "Šiame įrenginyje balso sukurti nepavyko."

  The tester measures this in task 13. A quantised model is out of scope.
- **OPFS on iOS Safari.** `getDirectory` exists from iOS 15.2, but `createWritable` came much later, so older versions fall back to Cache Storage (L8). Safari can also evict script-written storage after about 7 days without a visit, which means a new 71 MB download. This is accepted, and the size note shows again in that case.
- **Main-thread inference.** As in legacy, generating a sentence may freeze the UI for 1–3 s on phones, and the pixel scene stalls. If the tester finds this unacceptable, turn on `ort.env.wasm.proxy = true` (ORT's built-in worker) as a follow-up. It is not the default, because of bundler and worker path risk.
- **Bundling onnxruntime-web with `@angular/build` (esbuild).** The dynamic `.mjs` loading from `wasmPaths` has to work under `/kelyje2racija/`. Prove this early in task 5 with a production build served under the base href.
- **Hugging Face availability and CORS.** The download depends on HF's CDN redirects (CORS `*` today). Pinning the SHA protects the content but not availability. Mirroring the model on GitHub Pages (under the 100 MB file limit) is the fallback if HF breaks it.
- **WAV to Messenger.** Legacy shipped WAV, but whether Messenger plays a WAV attachment inline was never verified. If it does not, add a lazily loaded MP3 encoder later (L9).
- **Bitmap softness and zoom.** The bitmap is 556 px wide, so it is soft on 3× phones and at zoom. This is accepted by the user. At 200% text zoom, key labels may spill past the bitmap pill faces. They must stay readable and unclipped (L6).
- **AI-generated source image.** The ✦ is the generator's visible mark on the black backdrop. The user chose to remove the backdrop, so the mark goes with it. This is noted for the record. Any invisible watermark in the image is not affected.
- **Smaller LCD than the current build.** At 360×740 the list shows about 4–5 rows, compared with 5–6 today, because the user chose the legacy look. The 32 px rows (L6) are the trade-off.
