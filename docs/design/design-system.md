# Design system: RACIJA

Plan: `docs/plans/racija-radio.md` (D3, D4, D5, D13, D14). UX: `docs/ux/racija-radio.md`.
Visual preview (the thing to approve): `docs/design/preview/racija-preview.html` (open it in a browser, no build).
Component specs: `docs/design/components/radio.md`, `docs/design/components/pixel-scene.md`.
Assets: `public/favicon.svg` (app icon), `docs/design/assets/og.svg` (Open Graph image, 1200x630; export to `public/og.png` at build time).

Status: for review at checkpoint A. The tokens in section 10 are applied in `src/styles.css` (identical values; if you change one, change both). The LCD font file is **not yet downloaded** (section 3.1, "Enabling the font").

## 1. Principles

1. **A radio, not a web page.** The product is one physical object (a brushed-silver CB handset radio) sitting on a view from a truck cabin. Everything else (chips, toast) is quiet, dark and flat so the radio stays the hero.
2. **Tokens only.** Components use the tokens in section 10 (through Tailwind utilities or `var(--...)`). No hex values in component CSS. The single exception is the pixel scene, whose palette is a TypeScript constant (documented in `pixel-scene.md`).
3. **Small system.** 11 metal steps, 5 LCD colours, 5 LED/green colours, 6 chip/toast/focus colours. Nothing else.
4. **Never colour alone.** Selected = inverted bar, playing = animated marker, LED lit = also a stop icon (UX section 4).
5. **Sharp at any size.** CSS gradients and SVG only. No bitmap shell.
6. **One theme.** The radio is a physical object with a fixed look; there is **no dark theme** and no theme toggle. `color-scheme: light` is set on `html`. The page furniture (chips, toast) is already dark and sits on the animated scene, so it needs no variant. `theme-color` meta = `--color-metal-950` (#11161B).

## 2. Colour

All text pairs must reach WCAG AA (4.5:1 normal text). Ratios below were computed with the WCAG 2.x relative luminance formula (sRGB, 2.4 gamma) from the hex values and rounded to 2 decimals; they were recomputed independently for this revision (all matched). The frontend/tester should re-check with axe. Non-text UI pairs use the 3:1 rule.

### 2.1 Metal (the radio body)

| Token               | Hex       | Use                                             |
| ------------------- | --------- | ----------------------------------------------- |
| `--color-metal-50`  | `#F7F8FA` | Specular highlight line on keys and body edge   |
| `--color-metal-100` | `#EEF0F3` | Key face top, hover face                        |
| `--color-metal-200` | `#DDE1E6` | Body top, key face, logo letters                |
| `--color-metal-300` | `#C8CCD2` | Body mid, pressed key face                      |
| `--color-metal-400` | `#AEB4BC` | Body bottom, `aria-disabled` key face           |
| `--color-metal-500` | `#8B929B` | Groove lines                                    |
| `--color-metal-600` | `#646B74` | Key side (3D edge), grille dots, muted lines    |
| `--color-metal-700` | `#454B53` | LCD bezel line, key shadow edge                 |
| `--color-metal-800` | `#2A2F36` | Cable, logo plate gradient end                  |
| `--color-metal-900` | `#1B1F24` | **Ink on metal** (all button labels), logo plate |
| `--color-metal-950` | `#11161B` | LED bezel, chips, toast, theme-color            |

Body gradient (top to bottom): `metal-200` 0% - `metal-300` 45% - `metal-400` 100%, with a horizontal "brushed" streak texture of at most 6% white / 3% black (decorative, never under text). Key face: `metal-100` to `metal-300`.

### 2.2 LCD (green-grey, game style)

| Token                  | Hex       | Use                                                              |
| ---------------------- | --------- | ---------------------------------------------------------------- |
| `--color-lcd-bg`       | `#B7C4A5` | LCD background, search field fill, text on the inverted row      |
| `--color-lcd-bg-hi`    | `#C4D0B4` | Row hover tint                                                   |
| `--color-lcd-bg-lo`    | `#A3B292` | Search strip, LCD footer strip, inactive voice segment           |
| `--color-lcd-ink`      | `#16200F` | LCD text, selected-row background, borders, focus ring on LCD    |
| `--color-lcd-ink-soft` | `#2E3C28` | Search placeholder only                                          |

LCD overlay (pixel grid + edge vignette): scanlines at most 5% + 4% ink and an inset edge shadow at most 16% ink. Worst case (inside the vignette corner, plus scanlines) the LCD background composites to about `#93A084`, which still gives **>= 5.5:1** with `lcd-ink` (6.1:1 before scanlines). The overlay is `pointer-events: none` and sits above the text.

### 2.3 PRIIMTI green and LED

| Token              | Hex                     | Use                                                          |
| ------------------ | ----------------------- | ------------------------------------------------------------ |
| `--color-go-400`   | `#5CCB7B`               | PRIIMTI face, top of gradient                                |
| `--color-go-600`   | `#3FA75E`               | PRIIMTI face, bottom of gradient (worst case for the label)  |
| `--color-led-on`   | `#4DF07F`               | LED ring, lit (while a clip plays)                           |
| `--color-led-off`  | `#24512F`               | LED ring, unlit                                              |
| `--color-led-glow` | `rgb(77 240 127 / 55%)` | Glow around the lit ring (`--shadow-led-on`)                 |

The LED ring sits in a `metal-950` bezel, which is what gives the lit state its contrast (12.2:1). Unlit is intentionally low contrast (it is "off"); the state is also shown by the stop/play icon inside the button.

### 2.4 Page furniture (over the animated scene)

| Token                 | Value                 | Use                                                                     |
| --------------------- | --------------------- | ----------------------------------------------------------------------- |
| `--color-chip-bg`     | `rgb(17 22 27 / 90%)` | Chip behind the sound hint, counters and footer note; the toast         |
| `--color-chip-fg`     | `#F1F3F5`             | Text on chips                                                           |
| `--color-chip-accent` | `#B7C4A5`             | Numbers in the counters line, hint icon (same as `lcd-bg`)              |
| `--color-error-bg`    | `#5C1414`             | Error toast                                                             |
| `--color-error-line`  | `#FF8A80`             | Error toast border                                                      |
| `--color-focus`       | `#0A3FA8`             | Focus ring on the radio body and keys                                   |
| `--color-white`       | `#FFFFFF`             | Text on the error toast                                                 |

Naming note: the chip background is `chip-bg` (not `chip`) so that Tailwind's `text-chip` stays unambiguous: it is the font-size utility from `--text-chip`.

The chip is 90% opaque so the scene shows through faintly but never changes the contrast materially. Worst case is a white scene pixel behind it: the chip then composites to about `#292D32`. The scene's lightest colour is `#F0DFB4`, so the real worst case is slightly better than the figures below.

### 2.5 Contrast table (text and UI pairs)

| Foreground                            | Background                                      | Ratio                  | Requirement | Result        |
| ------------------------------------- | ----------------------------------------------- | ---------------------- | ----------- | ------------- |
| `lcd-ink` #16200F                     | `lcd-bg` #B7C4A5 (row text)                     | **9.18:1**             | 4.5         | AA, AAA       |
| `lcd-bg` #B7C4A5                      | `lcd-ink` #16200F (selected row)                | **9.18:1**             | 4.5         | AA, AAA       |
| `lcd-ink`                             | `lcd-bg-hi` #C4D0B4 (hover row)                 | 10.45:1                | 4.5         | AA, AAA       |
| `lcd-ink`                             | `lcd-bg-lo` #A3B292 (footer, inactive segment)  | 7.49:1                 | 4.5         | AA, AAA       |
| `lcd-ink-soft` #2E3C28                | `lcd-bg` (placeholder in the search field)      | 6.38:1                 | 4.5         | AA            |
| `lcd-ink-soft`                        | `lcd-bg-lo`                                     | 5.21:1                 | 4.5         | AA (spare)    |
| `lcd-ink` on the vignette corner      | composited `#93A084`                            | >= 5.5:1               | 4.5         | AA            |
| `metal-900` #1B1F24                   | `metal-300` #C8CCD2 (key label, pressed face)   | 10.27:1                | 4.5         | AA, AAA       |
| `metal-900`                           | #BFC4CB (darkest point of a key face under its inset shadow) | 9.44:1    | 4.5         | AA, AAA       |
| `metal-900`                           | `metal-400` #AEB4BC (`aria-disabled` key)       | 7.93:1                 | 4.5         | AA, AAA       |
| `metal-900`                           | `go-600` #3FA75E (PRIIMTI, darkest point)       | 5.44:1                 | 4.5         | AA            |
| `chip-fg` #F1F3F5                     | `chip-bg` on a white scene pixel (worst case)   | **12.45:1**            | 4.5         | AA, AAA       |
| `chip-accent` #B7C4A5                 | `chip-bg`, worst case                           | 7.55:1                 | 4.5         | AA, AAA       |
| `white` #FFFFFF                       | `error-bg` #5C1414                              | 13.4:1                 | 4.5         | AA, AAA       |
| `metal-200` #DDE1E6 (logo)            | `metal-900` plate                               | 12.6:1                 | n/a (logo)  | informational |
| `led-on` #4DF07F                      | `metal-950` bezel                               | 12.2:1                 | 3 (UI)      | pass          |
| `focus` #0A3FA8                       | `metal-300` body / `metal-400` body             | 5.69:1 / 4.39:1        | 3 (UI)      | pass          |
| `lcd-ink` (LCD focus ring)            | `lcd-bg`                                        | 9.18:1                 | 3 (UI)      | pass          |
| `lcd-bg` (focus ring on selected row) | `lcd-ink` (selected fill)                       | 9.18:1                 | 3 (UI)      | pass          |
| `metal-700` (LCD bezel)               | `metal-300` body                                | 5.46:1                 | 3 (UI)      | pass          |

Notes:

- The pressed key face is flat `metal-300`; the inset shadow darkens only the top 5 px, far from the label. "#BFC4CB" is the worst composite in that shadow, so the ratio holds in every state.
- The `aria-disabled` key keeps full-contrast text (7.93:1) on purpose: the key is focusable and explains why it does nothing; it is not a "disabled" control in the WCAG exemption sense. It looks inactive through a flat, un-highlighted face and a dashed outline, not through faded text.
- `lcd-ink-soft` is used only for the search placeholder; the "Įrašų: N" meta text is plain `lcd-ink`. Nothing on the LCD goes below 5.2:1.
- The busy state of SIŲSTI pulses an inner ring, never the label opacity, so label contrast stays 10.27:1 while sharing.
- The hint, counters and footer note each sit in their own `chip-bg` pill (12.45:1 worst case), which satisfies the UX requirement of 4.5:1 over the animated scene at every frame.

## 3. Typography

### 3.1 LCD font (D14): decision

**Chosen: Doto** (Google Fonts, designer Óliver Lalan, dot-matrix, variable `wght` 100-900 and `ROND`, **SIL Open Font License 1.1**: self-hosting and redistribution are allowed with the licence text kept in the repo). One weight is used: **800** (anything thin breaks into unreadable dots).

**Lithuanian coverage** (letters `ą č ę ė į š ų ū ž Ą Č Ę Ė Į Š Ų Ū Ž` = U+0105 U+010D U+0119 U+0117 U+012F U+0161 U+0173 U+016B U+017E and U+0104 U+010C U+0118 U+0116 U+012E U+0160 U+0172 U+016A U+017D, all inside the `latin-ext` range U+0100-02BA):

| Font              | Subsets published              | Lithuanian in the published language coverage | Licence | Result                                                                     |
| ----------------- | ------------------------------ | --------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| **Doto**          | latin, **latin-ext**           | **Yes** (fontsource language list, 383 languages) | OFL-1.1 | **Chosen.**                                                                |
| Pixelify Sans     | cyrillic, latin, **latin-ext** | **Yes** (427 languages)                       | OFL-1.1 | Covers Lithuanian. Runner-up: more readable when small, less LCD-like. The preview has a switch to compare. |
| Silkscreen        | latin, latin-ext               | **No** (337 languages, Lithuanian absent)     | OFL-1.1 | **Rejected.**                                                              |

Verified 2026-10-16: the glyph tables (`cmap`) of the `@fontsource/doto` 5.3.0 woff2 files were read with fontTools; together the `latin` and `latin-ext` subsets contain all 18 Lithuanian letters plus `– · … „ “`.

**Self-hosting.** The two weight-800 woff2 files (`latin`, `latin-ext`) and the licence (`OFL-Doto.txt`) live in `src/fonts/`, taken from the `@fontsource/doto` 5.3.0 npm package. The `@font-face` rules at the top of `src/styles.css` reference them with `url('./fonts/...')`, so the Angular build bundles them with hashed names and they load correctly under the `/kelyje2racija/` base href. `font-display: swap` shows the monospace fallback first; the LCD is flexible, so the swap shifts nothing important. The licence file must stay next to the fonts.

Legibility rule for a dot-matrix font: never below `1rem`, always weight 800, `letter-spacing: 0.02em`.

### 3.2 UI font

`--font-ui`: system stack `ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. No web font: zero extra requests, full Lithuanian coverage on every OS. Used for button labels (engraved look: bold, uppercase, tracked), chips and the toast. The search field text is the LCD font.

### 3.3 Scale (rem; 1rem = 16px, respects user zoom)

| Token             | Size               | Line height | Weight | Font | Use                                                    |
| ----------------- | ------------------ | ----------- | ------ | ---- | ------------------------------------------------------ |
| `--text-lcd`      | `1.125rem` (18px)  | 1.3         | 800    | LCD  | LCD rows, search input (>= 16px, no iOS zoom)          |
| `--text-lcd-meta` | `1rem` (16px)      | 1.25        | 800    | LCD  | LCD footer (voice toggle, "Įrašų: N"), "Nieko nerasta" |
| `--text-key`      | `0.8125rem` (13px) | 1.1         | 800    | UI   | PAIEŠKA, PRIIMTI, SIŲSTI (uppercase, `tracking-key`)   |
| `--text-chip`     | `0.875rem` (14px)  | 1.4         | 500    | UI   | Hint, counters, footer note, toast                     |

The three key labels are engraved caps at 13px/800: bold, uppercase and 4.5:1+, and the button is 44px tall, so this is legible and passes AA; at 200% text zoom they grow to 26px and the pills may wrap (see radio.md "Narrow").
Tracking: `--tracking-key: 0.04em`, `--tracking-lcd: 0.02em`.

## 4. Spacing

Tailwind 4 base unit: `--spacing: 0.25rem` (4px). Used steps: 1 (4), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24), 8 (32). Rules:

- Page margin around the radio: `3` (12px) + safe-area inset (UX: width `min(100% - 24px, 480px)`).
- Radio inner padding: `3` (12px) on phones, `4` (16px) from `sm`. Gap between button-row items: `2`-`3`. Gap between radio sections: `3`.
- Chips: `px-3 py-1.5` (12 / 6). Gap between page furniture items: `1.5`-`2`.
- Minimum hit area: `--size-hit: 2.75rem` (44px) for rows, keys, voice segments and the search clear button.

## 5. Radii

| Token          | Value      | Use                                           |
| -------------- | ---------- | --------------------------------------------- |
| `--radius-xs`  | `0.125rem` | Pixel-style small corners (marker, LED notch) |
| `--radius-sm`  | `0.25rem`  | LCD rows, scrollbar thumb                     |
| `--radius-md`  | `0.5rem`   | Search field, voice segments                  |
| `--radius-lg`  | `0.75rem`  | LCD screen, chips, logo plate                 |
| `--radius-xl`  | `1.25rem`  | LCD bezel, toast                              |
| `--radius-2xl` | `1.75rem`  | Radio body                                    |
| `rounded-full` | built in   | Pills, round PRIIMTI, LED ring                |

## 6. Elevation (shadows)

| Token               | Use                                                            |
| ------------------- | -------------------------------------------------------------- |
| `--shadow-radio`    | Radio body: top highlight, bottom edge, soft drop on the scene |
| `--shadow-lcd`      | LCD bezel: recessed (inset) with a light lower lip             |
| `--shadow-key`      | Key resting: highlight, 3px side edge, soft drop               |
| `--shadow-key-down` | Key pressed / PAIEŠKA open: inset, edge collapsed              |
| `--shadow-led-on`   | Glow of the lit LED ring                                       |
| `--shadow-chip`     | Chips                                                          |
| `--shadow-toast`    | Toast                                                          |

Values are in section 10.

## 7. Breakpoints and layout

The layout is fluid: one column, radio width `min(100% - 24px, var(--container-radio))` with `--container-radio: 30rem` (480px). Breakpoints are few because only the scene and the radio's maximum size change.

| Name     | Value                       | What changes                                                                                  |
| -------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| (base)   | 320px+                      | Phone portrait. Radio fills the width minus 24px. Layout verified at 320, 360, 412.           |
| `xs`     | `22.5rem` (360px)           | Key labels get `tracking-key`; grille at full height.                                         |
| `sm`     | `40rem` (640px)             | Radio is capped at 480px and centred; radio padding rises to 16px; the scene is visible at the sides. |
| `lg`     | `64rem` (1024px)            | Radio height is `min(100dvh - 110px, 820px)` instead of filling the page; chips use larger side margins. |
| `short`  | `max-height: 36rem` (576px) | Landscape phone / keyboard open: cap, cable, grille collapse; LCD keeps 4 rows; page may scroll. |
| `coarse` | `pointer: coarse`           | Shows "Įjunkite garsą"; hit areas are unchanged (already 44px).                               |

Tailwind's defaults for `md` (768) and `xl` (1280) stay available but are not used. `short` and `coarse` are custom variants (section 10).

Layers (z-order, back to front): scene canvas (0), dim/vignette overlay (1), page stage with radio and chips (10), toast (50).

## 8. Motion

| Token                | Value                                 | Use                                                                    |
| -------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `--duration-fast`    | `120ms`                               | Key press, hover, row tint                                             |
| `--duration-base`    | `200ms`                               | Toast in/out, search row open                                          |
| `--duration-slow`    | `400ms`                               | Reserved (smooth scroll of the selected row)                           |
| `--ease-out`         | `cubic-bezier(0.22, 0.8, 0.3, 1)`     | Everything that moves in                                               |
| `--animate-marker`   | `marker 0.7s steps(4, end) infinite`  | Playing marker bars (pixel-stepped; three bars, 0.1s stagger)          |
| `--animate-led`      | `led 1.6s ease-in-out infinite`       | LED glow breathing while playing (0.6 Hz, far below the 3 Hz flash limit) |
| `--animate-busy`     | `busy 1s ease-in-out infinite`        | SIŲSTI inner ring pulse while sharing (the label is never faded)       |
| `--animate-toast-in` | `toast-in 200ms var(--ease-out) both` | Toast appears (translateY 8px to 0, fade)                              |
| `--animate-dots`     | `dots 0.9s steps(3, end) infinite`    | "Loading" dots on a row                                                |

Scene: about 12 fps (frame interval 83.3 ms), see `pixel-scene.md`.

**Reduced motion** (`prefers-reduced-motion: reduce`): no marker animation (static bars at full height), no LED breathing (static glow), no busy pulse (static ring, `aria-busy` still set), no toast animation (appears and disappears instantly), scrolling is instant, the pixel scene is one static frame and no `requestAnimationFrame` loop runs. Implemented by one global rule in `src/styles.css` (`@layer base`):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
```

Nothing flashes more than 3 times a second.

## 9. Iconography

Only 4 inline SVG icons, all `aria-hidden`, drawn on a pixel grid with square caps to fit the look: play (stepped triangle), stop (square), speaker (hint), "x" (search clear). The playing marker is three vertical bars. The SVG "RACIJA" logo is a 5x7 pixel-letter wordmark (path data in `components/radio.md`), so it needs no font. Paths are in `radio.md` section 7.

## 10. Tokens as code (Tailwind v4 `@theme`)

This is the exact content of `src/styles.css` (after `@import 'tailwindcss';` and the commented `@font-face` block). `@theme static` is used (instead of plain `@theme`) because Tailwind drops unused theme variables from the output, and our component `.css` files read the variables directly with `var(--...)`. `--color-*: initial;` removes Tailwind's default palette so only the tokens exist.

```css
@custom-variant short (@media (max-height: 36rem));
@custom-variant coarse (@media (pointer: coarse));

@theme static {
  --color-*: initial;
  --color-white: #ffffff;

  /* metal (radio body) */
  --color-metal-50: #f7f8fa;
  --color-metal-100: #eef0f3;
  --color-metal-200: #dde1e6;
  --color-metal-300: #c8ccd2;
  --color-metal-400: #aeb4bc;
  --color-metal-500: #8b929b;
  --color-metal-600: #646b74;
  --color-metal-700: #454b53;
  --color-metal-800: #2a2f36;
  --color-metal-900: #1b1f24;
  --color-metal-950: #11161b;

  /* LCD */
  --color-lcd-bg: #b7c4a5;
  --color-lcd-bg-hi: #c4d0b4;
  --color-lcd-bg-lo: #a3b292;
  --color-lcd-ink: #16200f;
  --color-lcd-ink-soft: #2e3c28;

  /* PRIIMTI green and LED */
  --color-go-400: #5ccb7b;
  --color-go-600: #3fa75e;
  --color-led-on: #4df07f;
  --color-led-off: #24512f;
  --color-led-glow: rgb(77 240 127 / 55%);

  /* page furniture over the scene */
  --color-chip-bg: rgb(17 22 27 / 90%);
  --color-chip-fg: #f1f3f5;
  --color-chip-accent: #b7c4a5;
  --color-error-bg: #5c1414;
  --color-error-line: #ff8a80;
  --color-focus: #0a3fa8;

  /* typography */
  --font-lcd: 'Doto', ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Menlo, Consolas, monospace;
  --font-ui: ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --text-lcd: 1.125rem;       --text-lcd--line-height: 1.3;
  --text-lcd-meta: 1rem;      --text-lcd-meta--line-height: 1.25;
  --text-key: 0.8125rem;      --text-key--line-height: 1.1;
  --text-chip: 0.875rem;      --text-chip--line-height: 1.4;
  --tracking-key: 0.04em;
  --tracking-lcd: 0.02em;

  /* spacing, size, breakpoints */
  --spacing: 0.25rem;
  --size-hit: 2.75rem;
  --container-radio: 30rem;
  --breakpoint-xs: 22.5rem;

  /* radii */
  --radius-xs: 0.125rem;  --radius-sm: 0.25rem;  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;   --radius-xl: 1.25rem;  --radius-2xl: 1.75rem;

  /* shadows */
  --shadow-radio: inset 0 1px 0 rgb(255 255 255 / 70%), inset 0 -2px 0 rgb(0 0 0 / 25%), 0 18px 40px -8px rgb(5 10 15 / 55%), 0 4px 10px rgb(5 10 15 / 35%);
  --shadow-lcd: inset 0 2px 6px rgb(0 0 0 / 45%), 0 0 0 2px var(--color-metal-700), 0 3px 0 2px rgb(255 255 255 / 45%);
  --shadow-key: inset 0 1px 0 rgb(255 255 255 / 85%), inset 0 -2px 0 rgb(0 0 0 / 18%), 0 3px 0 var(--color-metal-600), 0 6px 8px rgb(5 10 15 / 35%);
  --shadow-key-down: inset 0 2px 5px rgb(0 0 0 / 40%), 0 1px 0 var(--color-metal-600);
  --shadow-led-on: 0 0 10px 2px var(--color-led-glow);
  --shadow-chip: 0 2px 8px rgb(5 10 15 / 35%);
  --shadow-toast: 0 6px 18px rgb(5 10 15 / 50%);

  /* motion */
  --duration-fast: 120ms;  --duration-base: 200ms;  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.22, 0.8, 0.3, 1);
  --animate-marker: marker 0.7s steps(4, end) infinite;
  --animate-led: led 1.6s ease-in-out infinite;
  --animate-busy: busy 1s ease-in-out infinite;
  --animate-toast-in: toast-in 200ms var(--ease-out) both;
  --animate-dots: dots 0.9s steps(3, end) infinite;

  @keyframes marker { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
  @keyframes led { 0%, 100% { box-shadow: 0 0 6px 1px var(--color-led-glow); } 50% { box-shadow: 0 0 14px 4px var(--color-led-glow); } }
  @keyframes busy {
    0%, 100% { box-shadow: inset 0 0 0 0 var(--color-metal-700), var(--shadow-key-down); }
    50% { box-shadow: inset 0 0 0 3px var(--color-metal-700), var(--shadow-key-down); }
  }
  @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes dots { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
}
```

(`src/styles.css` additionally has an `@layer base` with `color-scheme: light`, the default `:focus-visible` ring and the reduced-motion rule.)

Utilities this generates, for the frontend: `bg-metal-300`, `text-lcd-ink`, `bg-lcd-bg`, `bg-chip-bg`, `text-chip-fg`, `font-lcd`, `font-ui`, `text-lcd`, `text-lcd-meta`, `text-key`, `text-chip`, `tracking-key`, `rounded-2xl`, `shadow-radio`, `shadow-key`, `max-w-radio`, `animate-marker`, `short:hidden`, `coarse:block`, `xs:...`.

## 11. Rules for implementers

- Focus ring: on the radio body and keys `outline: 3px solid var(--color-focus); outline-offset: 3px;` (never clipped: the radio body has no `overflow: hidden`; only the LCD scroll area clips). Inside the LCD: `outline: 3px solid var(--color-lcd-ink); outline-offset: -3px;` on rows, and on the **selected** row `var(--color-lcd-bg)` (ink fill needs a light ring).
- Do not set `opacity` on text to "mute" it; use `lcd-ink-soft`.
- Do not put text directly on the scene. Hint, counters and footer note live in a chip (`bg-chip-bg text-chip-fg text-chip rounded-lg shadow-chip px-3 py-1.5`).
- Any new colour must be added to section 2 with its contrast ratio before use.
- LCD text is always `font-lcd`, weight 800. If the font is not loaded yet the monospace fallback applies; never switch to the UI font on the LCD.
