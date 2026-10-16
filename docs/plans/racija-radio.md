# Plan: RACIJA radio (rebuild of kelyje2racija)

Status: **approved by the user, 2026-10-16**

> **Partly superseded (2026-10-16) by `legacy-radio.md`:** D4 (CSS/SVG body → legacy bitmap shell), D5 (controls → KURTI/GARSAI pill, SIŲSTI round key, no PRIIMTI/PAIEŠKA) and D16 (KURTI returns with lazy onnxruntime-web). D14 is settled as Doto. Everything else still applies.

User answers (2026-10-16):

- **Q1:** option (a). Tag the old `main` as `legacy-v1`, then force-push the new history to `main` (still only after explicit confirmation at checkpoint C).
- **Copyright:** risk accepted; show the footer note "Fanų projektas, nesusijęs su žaidimo kūrėjais".
- **iOS silent mode:** show the hint "Įjunkite garsą".
- **Branch:** renamed `master` → `main` locally (done).
- **Phrase texts:** do not rely on the user listening. Re-transcribe all clips with faster-whisper **large-v3** (`tools/transcribe-phrases.py` → `tools/transcripts/large-v3.json`) and derive the texts from it, cross-checking the male/female pair of each phrase against the old `small`-model titles. Only phrases where the sources still disagree are flagged for the user.

**Checkpoint A passed (2026-10-16):** the user approved the phrase list (`docs/ux/phrases.md`), the UX spec and the visual design preview as is. Row tap: **one tap selects and plays** (UX spec U1 supersedes D5's "second tap plays"). Fonts are self-hosted in `src/fonts/` (bundled by the build), not `public/fonts/`.
Source app: `C:\Users\ZakarauskasA\Documents\code-local\kelyje` (Angular 19, live at https://aivaraszks.github.io/kelyje2racija/)

## Goal

A Lithuanian-language, phone-first web app that recreates the "RACIJA" voice radio from the game _Kelyje 2_. The radio is drawn in SVG/CSS (no bitmap shell), sits on top of an animated pixel-art view from a parked truck cabin, lists the 76 game voice clips on its LCD and lets the user play them, search them (PAIEŠKA), switch the voice (Vyras/Moteris) and share a clip as an audio file (for example to Messenger). Global play and share counters carry over from the old site. The app replaces the old site at the same URL.

**Done means:**

- Every requirement below works on Android Chrome, iOS Safari and desktop Chrome/Firefox/Safari, from 320 px wide phones up to desktop.
- The LCD grows with the viewport, and the radio stays sharp at any size.
- Sounds play only when the user taps. Sharing opens the share sheet with an `.mp3` file on mobile and downloads the file on desktop.
- The counters use the same keys as before, and totals continue from the old site.
- The text-to-speech feature (KURTI) and the ONNX model are gone.
- The user has approved the phrase texts and the designs at checkpoints A and B.
- `pnpm build` and `pnpm test:ci` pass, axe reports no violations, and Lighthouse accessibility scores 100.
- The site is deployed by GitHub Actions to `aivaraszks.github.io/kelyje2racija/`, after the user explicitly confirms.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Why                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **No backend.** The app is static and hosted on GitHub Pages. The only remote call goes to the free counter API. `backend` has no tasks.                                                                                                                                                                                                                                                                                                                                                                        | Nothing needs server state beyond the two counters.                                                                                                                            |
| D2  | **Single page and one lazy feature:** `features/radio/` is loaded from `app.routes.ts` at `''`, with a wildcard redirect to `''`. Services go in `core/`. The pixel background goes in `shared/pixel-scene/`.                                                                                                                                                                                                                                                                                                  | Follows the CLAUDE.md conventions, and the app has one screen.                                                                                                                 |
| D3  | **Plain CSS, not SCSS.** Tailwind v4 is set up through `@tailwindcss/postcss` and `.postcssrc.json`. `src/styles.css` holds `@import "tailwindcss"` plus the design tokens in `@theme`. Component styles are `.css` files. Scaffold with `--style=css`.                                                                                                                                                                                                                                                        | Tailwind v4 does not support Sass preprocessors. CLAUDE.md's "SCSS" must change.                                                                                               |
| D4  | **Radio = a flexible CSS body plus SVG details**, not one fixed-aspect SVG. The body is a CSS flex column (silver gradients, radii, inset shadows). Its parts: the top cap with an SVG "RACIJA" logo; the **LCD**, a real HTML region with `flex: 1` that grows with the viewport height (min about 4 rows, max about 70 dvh); a button row (PAIEŠKA pill and PRIIMTI round button, both real `<button>`s); and an SVG speaker grille (dot `<pattern>`, which tiles to any size). The coiled cable is an SVG. | A fixed-aspect SVG cannot let the LCD grow on its own. CSS plus vector parts stays sharp and lets the screen take up the available space.                                       |
| D5  | **Controls mapping** (UX confirms): a tap on an LCD row selects it. **PRIIMTI** plays or stops the selected clip, and a second tap on a row also plays it. **PAIEŠKA** opens or closes a search field on the LCD. **SIŲSTI** (share) is a new button styled like the radio, for example a second pill or a side key. The **Vyras/Moteris** toggle sits in the LCD footer row as a two-state segmented control (`aria-pressed`). The game used the green PRIIMTI ring as an LED: it lights while a clip plays.  | Keeps the game's look and adds only the controls the app needs.                                                                                                                |
| D6  | **Sound catalog = a typed TS module** (`core/sounds/sound-catalog.ts`). Each entry is `{ id, text, voice: 'vyras' \| 'moteris' \| 'nezinoma', file, variant? }`. Each `text` is the corrected phrase with no gender suffix. `nezinoma` clips appear under both voices. Variants (`pamerk-2`, `rinkis-2`) are shown as "Pamerk (2)" (UX confirms).                                                                                                                                                             | 76 entries are small, so this avoids an HTTP request and is type-safe and easy to test.                                                                                        |
| D7  | **Audio format: MP3, mono, 44.1 kHz, about 96 kbps, with loudness normalized** (ffmpeg `loudnorm`). The MP3s are generated once by `tools/convert-sounds.mjs` and committed to `public/sounds/<id>.mp3`. The WAV originals are not committed (gitignored `tools/sounds-src/`, copied from the kelyje repo).                                                                                                                                                                                                    | MP3 is the format that every share target accepts (Messenger and iOS/Android share sheets). The total drops from 9.3 MB to about 1 MB.                                         |
| D8  | **ffmpeg is NOT installed** (checked: `ffmpeg: command not found`). The script uses the `ffmpeg-static` devDependency, so no system install is needed, and it runs with `pnpm convert:sounds`.                                                                                                                                                                                                                                                                                                                | It can be reproduced on any machine and in CI.                                                                                                                                 |
| D9  | **Playback:** one `HTMLAudioElement` in `AudioPlayerService`, with `play()` called synchronously inside the click handler, so iOS keeps the user gesture. Drop the old 200 ms lead-in plus `canplaythrough` wait. State is held in signals: `playingId` and `status` (`idle`, `loading`, `playing`, `error`). Starting a new clip stops the current one. Nothing autoplays.                                                                                                                                    | Avoids losing the gesture after the `await` that the old code did.                                                                                                             |
| D10 | **Share:** `ShareService` prefetches the selected clip's `Blob` and caches it per id, so `navigator.share({ files: [File(..., 'racija-<id>.mp3', 'audio/mpeg')] })` runs inside the click gesture. If `canShare` is false or the share is unsupported, it downloads the file. `AbortError` (user cancelled) is not counted and shows no error. `NotAllowedError` makes the app show "Bandykite dar kartą".                                                                                                       | iOS Safari needs transient user activation. A true Messenger "voice message" cannot be sent from the web, so the target is an audio attachment.                                |
| D11 | **Counters:** `CounterService` uses plain `fetch` against `https://countapi.mileshilliard.com/api/v1/{get,hit}/<key>` with the same keys `kelyje2racija-global-plays` and `kelyje2racija-global-shares`, a 5 s timeout and signals. A play is counted once when it starts. A share is counted after a successful share or download. If a call fails it does nothing visible, the counter shows "—", and the UI is never blocked.                                                                              | The totals carry over, and the counter is not needed for the app to work.                                                                                                      |
| D12 | **Search:** filter as the user types (no debounce needed for 76 items), ignoring diacritics and case. Text is normalized with `NFD`, combining marks are removed, then lowercased, so "sansu" matches "šansų". The search combines with the voice filter. The result count is announced through `aria-live`.                                                                                                                                                                                                  | Users type without Lithuanian letters on phones.                                                                                                                               |
| D13 | **Background = procedural `<canvas>`** at low resolution (about 320×180, matched to the viewport aspect), upscaled with CSS `image-rendering: pixelated`. Layers: dithered sky, clouds drifting, distant hills/forest, trees swaying (sprite frames or a sine offset per column), a parked roadside/lay-by, and a static cabin frame overlay (dashboard, A-pillars, mirror) drawn from small pixel arrays in TS. No image files. Animation runs at about 12 fps through `requestAnimationFrame` throttling. It pauses on `visibilitychange`. With `prefers-reduced-motion` it shows one static frame. It is decorative (`aria-hidden`) and dimmed or desaturated behind the radio. | Pixel-art look in a few KB. Animation is cheap, and the art is original rather than copied from the game.                                                                      |
| D14 | **LCD typography:** a self-hosted, OFL-licensed dot-matrix or pixel font. Candidates are _Doto_, _Pixelify Sans_ and _Silkscreen_. The designer must verify that it covers `ąčęėįšųūž ĄČĘĖĮŠŲŪŽ`. The fallback is a monospace font. Dark text on the green-grey LCD must have a contrast ratio of at least 4.5:1.                                                                                                                                                                                              | The game look depends on the font, and Lithuanian letters are required.                                                                                                        |
| D15 | **Deploy:** GitHub Actions to GitHub Pages in repo `aivaraszks/kelyje2racija`. Build with `pnpm build --base-href /kelyje2racija/`, upload `dist/racija/browser`, and copy `index.html` to `404.html`. Use Node 26 and pinned versions of `pnpm/action-setup`, `actions/*`. The old site is replaced. Any push or deploy needs explicit user confirmation.                                                                                                                                                      | Keeps the URL people already know.                                                                                                                                             |
| D16 | **Dropped:** KURTI (text-to-speech), `onnxruntime-web`, the 68 MB model, `walkie-shell.png` (watermarked) and `walkie-reference.png`. The reference image is used for design only and is not shipped.                                                                                                                                                                                                                                                                                                         | Required by the user.                                                                                                                                                          |

## Tasks

Owners: `ux`, `designer`, `frontend`, `backend` (none), `devops`, `tester`. **⏸ = stop for user review.**

**Phase 0: setup**

1. `frontend`: Scaffold into the existing repo.
   - Back up `CLAUDE.md` and `.gitignore` first.
   - Run `npx @angular/cli@22 new racija --directory . --package-manager=pnpm --ssr=false --style=css --ai-config=claude-code`. Check the flag values with `ng new --help`. `ng new` may write `CLAUDE.md` or `.claude/CLAUDE.md`.
   - Merge the generated AI rules into our `CLAUDE.md`. Keep our Commands, Workflow and Accessibility sections, and replace "SCSS" with the new Tech stack section (below).
   - Add Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`, `.postcssrc.json`), Prettier with `format` and `format:check` scripts, and a `test:ci` script.
   - Check that `pnpm build` and `pnpm test:ci` pass.
2. `devops`: Write `tools/convert-sounds.mjs` using `ffmpeg-static`, plus a `convert:sounds` script.
   - It reads `tools/sounds-src/*.wav` (gitignored; copy them from `kelyje/src/assets/sounds`) and writes `public/sounds/<id>.mp3` (mono, 96 kbps, loudnorm, silence trimmed to 50 ms or less).
   - It prints the total size.
   - Commit only the MP3s.
3. `ux`: Corrected phrase list in `docs/ux/phrases.md`, for user review.
   - Write a table with the columns: id, file, old title, new text, voice, confidence.
   - Remove the "(vyras)/(moteris)/(nezinoma)" suffixes. Fix spelling, diacritics and punctuation, and make punctuation match between the two voices of the same phrase.
   - The old titles came from automatic speech recognition (`kelyje/tools/transcribe_sounds.py`), so some may be mishearings, for example "Bandėtai, lipant…", "Įmušyta", "Korekė", "Pamerk", "Tuoj jau sustabdysite automobilį?" and "prispaus". Flag these as **needs listening** so the user can confirm them by ear.
4. `ux`: UX spec in `docs/ux/racija-radio.md`. It covers:
   - the flow (open, browse/search, select, play, share);
   - the control mapping (D5);
   - the LCD layout and rows (selected, playing, scroll, empty search result "Nieko nerasta");
   - the voice toggle;
   - the share outcomes (shared, downloaded, cancelled, error);
   - the counter display ("Paleista: N · Išsiųsta: N", "—" when unavailable);
   - phone and desktop wireframes;
   - all Lithuanian copy;
   - keyboard order, focus and ARIA: the LCD list is a `listbox` or a list of buttons, PAIEŠKA moves focus into the search field, Esc closes it and returns focus, and the live region covers playing, search and share status.
5. `designer`: `docs/design/design-system.md` and the tokens in `src/styles.css` (`@theme`). It covers the silver/metal palette, LCD green-grey and ink (contrast ratios stated), the PRIIMTI green, typography including the font from D14, sizes, radii, shadows, breakpoints and motion.
6. `designer`: Visual specs, plus a **self-contained static preview** at `docs/design/preview/racija-preview.html` (inline CSS, SVG and JS, no build).
   - Specs: `docs/design/components/radio.md` (anatomy, states, how the LCD grows) and `docs/design/components/pixel-scene.md` (palette, layers, motion timings, reduced-motion frame).
   - The preview shows the radio at 360×740, 412×915 and 1440×900, with LCD states (list, selected, playing, search open, empty). It includes a working prototype of the canvas cabin background.
   - Also design a new favicon/app icon (SVG) and the OG image.

**⏸ Checkpoint A: user reviews the phrase list (task 3), the UX spec (4) and the visual design (5–6).** The main session publishes the preview HTML for the user. Nothing in Phase 2 starts until the user approves. Update the docs from the feedback.

**Phase 2: build**

7. `frontend`: `core/sounds/sound-catalog.ts` from the approved phrase list, plus a `SoundCatalogService` with signals: `voice`, `query`, and a `computed` `visibleSounds`. Put the normalize helper in `core/sounds/normalize.ts`. Specs.
8. `frontend`: `core/audio/audio-player.service.ts` (D9), `core/share/share.service.ts` (D10) and `core/counter/counter.service.ts` (D11), each with a spec. Mock `Audio`, `navigator.share`/`canShare` and `fetch`.
9. `frontend`: Radio UI in `features/radio/`:
   - `radio.component` (body layout, wiring);
   - `lcd-screen.component` (list, search field, voice toggle, status line);
   - `radio-button.component` (pill and round variants);
   - SVG partials: logo, grille, cable.
   - Use the tokens and Tailwind utilities. The LCD grows according to D4. Specs.
10. `frontend`: `shared/pixel-scene/pixel-scene.component` (canvas, D13). Start in `afterNextRender`, stop in `DestroyRef`, and test the reduced-motion and visibility pause. Spec.
11. `frontend`: App shell:
    - `index.html` has `lang="lt"`, the title "Racija – Kelyje 2", a description, OG tags, the favicon, `theme-color` and `viewport-fit=cover`;
    - safe-area insets and `100dvh`;
    - lazy route.
    - Run `pnpm build` and `pnpm test:ci`.
12. `tester`: Fill test gaps. Cover the search normalization, the voice filter with `nezinoma`, a play stopping the previous clip, the share fallback/abort/error paths, and counter failure and timeout. Add an axe check (`axe-core` in a Vitest DOM test of `RadioComponent`).

**⏸ Checkpoint B: user reviews the first working UI** (`pnpm start`, ideally on their phone over LAN with `ng serve --host 0.0.0.0`). Collect the feedback.

**Phase 3: polish and ship**

13. `ux` and `designer`: Review the built UI against the specs. Report blocker, should-fix and nice-to-have items. `frontend` fixes them.
14. `devops`: `.github/workflows/deploy.yml`:
    - runs on push to `main` and `workflow_dispatch`;
    - pnpm and Node 26, with `pnpm install --frozen-lockfile`;
    - `format:check`, `test:ci`, then build with `--base-href /kelyje2racija/`;
    - copies `404.html`, then runs `upload-pages-artifact` and `deploy-pages`.
    - Also write `docs/devops/deploy.md` covering how to deploy, roll back (re-run the previous workflow, or revert) and switch remotes.
    - Note: the local branch is `master` but the main branch is `main`. Align them.
15. `tester`: Manual pass on real devices, per the checklist in `docs/ux/racija-radio.md`:
    - iOS Safari: play, then share to Messenger as an `.mp3` attachment;
    - Android Chrome: share sheet, then Messenger;
    - desktop: download;
    - reduced motion, 200% zoom, keyboard only, screen reader (VoiceOver/TalkBack);
    - Lighthouse (performance and accessibility).

**⏸ Checkpoint C: explicit user confirmation before any push or deploy.** The user also chooses how to replace the repo (see open question Q1).

16. `devops`: Push, run the deploy and check the live URL. Confirm that sounds load under `/kelyje2racija/` and that the counters show totals that continue from the old site.

## Files

- **Create:** Angular scaffold (`angular.json`, `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `src/main.ts`, `src/index.html`, `src/styles.css`, `src/app/app.{ts,html,config.ts,routes.ts}`), `.postcssrc.json`, `.prettierrc`
- `src/app/core/sounds/{sound-catalog.ts,sound-catalog.service.ts,normalize.ts}` (+ specs)
- `src/app/core/audio/audio-player.service.ts`, `src/app/core/share/share.service.ts`, `src/app/core/counter/counter.service.ts` (+ specs)
- `src/app/features/radio/{radio,lcd-screen,radio-button}.component.*` (+ specs), with SVG partials in the same folder
- `src/app/shared/pixel-scene/pixel-scene.component.*` (+ spec), `src/app/shared/pixel-scene/sprites.ts`
- `public/sounds/*.mp3` (76), `public/fonts/<lcd-font>.woff2`, `public/favicon.svg`, `public/og.png`
- `tools/convert-sounds.mjs`, `.gitignore` (add `tools/sounds-src/`)
- `.github/workflows/deploy.yml`
- Docs: `docs/ux/phrases.md`, `docs/ux/racija-radio.md`, `docs/design/design-system.md`, `docs/design/components/{radio,pixel-scene}.md`, `docs/design/preview/racija-preview.html`, `docs/devops/deploy.md`
- **Change:** `CLAUDE.md` (merge scaffold output and the Tech stack section)

## Proposed CLAUDE.md "Tech stack" section

```md
## Tech stack

- Angular 22: standalone components, signals, zoneless, Vitest. One lazy feature (`features/radio`).
- Tailwind CSS v4 via `@tailwindcss/postcss`. Plain CSS (no SCSS). Design tokens live in `src/styles.css` under `@theme`; see `docs/design/design-system.md`.
- Static site with **no backend**. Global play/share counters use the free API `https://countapi.mileshilliard.com/api/v1` (keys `kelyje2racija-global-plays`, `kelyje2racija-global-shares`; never rename them).
- Audio: MP3 clips in `public/sounds/`, generated by `pnpm convert:sounds` (ffmpeg-static) from WAVs in the gitignored `tools/sounds-src/`. The phrase catalog is `src/app/core/sounds/sound-catalog.ts`.
- Node 26, pnpm. Deployed by GitHub Actions to GitHub Pages at https://aivaraszks.github.io/kelyje2racija/ (base href `/kelyje2racija/`). Never push or deploy without explicit user confirmation.
- UI language: Lithuanian (`lang="lt"`). All user-facing copy is in Lithuanian.
```

## Risks / open questions

- **Q1 Repo replacement (needs the user's answer before checkpoint C).** This repo (`racija`, no remote) has to become the source for `github.com/aivaraszks/kelyje2racija`. Options:
  - (a) Tag the old `main` as `legacy-v1`, then force-push the new history to `main` (recommended: clean history, old code kept under the tag);
  - (b) Commit the new tree on top of the old history;
  - (c) Create a new repo and change the Pages URL. Not recommended, because the URL changes.
- **Phrase accuracy.** The texts come from speech recognition, and some can only be confirmed by listening. The user does this at checkpoint A.
- **Counter API.** It is a free third-party service with no SLA. Its CORS works today, since the old site uses it from the browser. It could disappear or reset. The app degrades to "—". The source of the old counter values cannot be migrated. Abuse (inflated hits) is accepted.
- **iOS Safari file share.** It needs iOS 15 or later and transient activation. Prefetching the blob (D10) is essential. Messenger receives an audio file, not a voice note. Some apps may not appear in the share sheet for `audio/mpeg`. The tester verifies on a device.
- **Desktop share.** Chrome on Windows and macOS supports `navigator.share` with files. The fallback is a download. Both are acceptable.
- **Autoplay.** No autoplay anywhere. The first play must come from a tap. iOS silent mode mutes web audio played through `<audio>`, so consider a hint ("Įjunkite garsą").
- **Copyright.** The voice clips, the name "RACIJA" and the radio look come from _Kelyje 2_ (a commercial game). The old site already publishes the clips. The new art is redrawn from scratch, and no game bitmaps are shipped. Add a small footer credit or disclaimer ("Fanų projektas, nesusijęs su žaidimo kūrėjais"). The user accepts the residual risk.
- **Font coverage.** The dot-matrix font must cover the Lithuanian letters, otherwise a pixel font is used (D14).
- **Scaffold into a non-empty directory.** `ng new` may stop on or overwrite `CLAUDE.md` and `.gitignore`. Back them up first and merge them after. The `--ai-config` value must be checked against `ng new --help`.
- **Performance.** The canvas runs at about 12 fps and low resolution, and it pauses when the tab is hidden. Target: Lighthouse performance of 90 or more on mobile, and an initial JS bundle under 150 KB gzipped.
