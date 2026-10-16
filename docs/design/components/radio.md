# Component spec: radio (bitmap shell)

Plan: `docs/plans/legacy-radio.md` (L1-L6, L10; approved 2026-10-16; supersedes D4, D5 of `racija-radio.md`). Behaviour and copy: `docs/ux/racija-radio.md` (U11-U15, 5.11-5.13). Tokens: `docs/design/design-system.md` (names below are the `@theme` names). Working reference: `docs/design/preview/racija-preview.html` (its "product" CSS is the visual source; copy values, not structure). The old CSS/SVG radio (cap, cable, grille, PRIIMTI, LED, screws, brushed body) is gone: the body is the legacy bitmap.

Angular mapping (plan tasks 7-8): `radio.component` (shell slices, hidden `h1`, the two key buttons, page furniture), `lcd-screen.component` (phrase list, bottom strip), `tts-panel.component` (KURTI panel). `radio-button.component` and the SVG graphics are deleted.

Units: **`u` is `--u` = shell width / 556** (one source pixel of the bitmap). Every overlay rectangle below is in source pixels, written `N u` = `calc(var(--u) * N)`.

## 1. Anatomy

One positioned box (the "shell") with the bitmap in three slices and four overlays on top.

| Layer | What | Notes |
| ----- | ---- | ----- |
| 1 | `shell-top.webp` (556 x 272) | Logo, top of the bezel, the upper 114 px of the LCD opening. `<img ngSrc priority>` |
| 1 | `shell-mid.webp` (556 x 8), stretched | The stretch band. A `div` with `background-size: 100% 100%`. Only straight vertical edges and the flat LCD, so stretching is invisible |
| 1 | `shell-bottom.webp` (556 x 744) | Lower LCD, pill face, round key, grille, cable. `<img ngSrc>` |
| 2 | `h1` "RACIJA" | Visually hidden text placed over the bitmap logo (x 136, y 66, 263 x 51). Not `display: none` |
| 3 | **LCD surface** | Opaque HTML surface over the bitmap's grey screen (section 4) |
| 4 | **Pill key** (KURTI / GARSAI) | `<button>` over the blank pill (section 7) |
| 4 | **Round key** (SIŲSTI) | `<button>` over the blank ellipse key (section 7) |

The bitmap carries no text on the keys: the labels are HTML. The green ring around the round key is part of the bitmap and stays static. The shell has **no `overflow: hidden`**, so focus rings are never clipped.

## 2. Slices and sizing (L2)

The shell is a flex column: top, mid (`flex: 1`), bottom. Slice cut lines in source px: top y 0-272, mid y 272-280, bottom y 280-1024 (see "L2 cut lines" below).

```css
@property --shell-w { syntax: '<length>'; inherits: true; initial-value: 300px; }
@property --u       { syntax: '<length>'; inherits: true; initial-value: 0.54px; }

.shell-stage {                    /* the box between the top of the page and the page furniture */
  flex: 1 1 0; min-height: 0; width: 100%;
  container-type: size;
  display: flex; justify-content: center; align-items: center;
}
.shell {
  --H: 1136;                      /* 1024 + 112: height of the tallest shell in u */
  --shell-w: clamp(min(100cqw, var(--shell-w-min)), min(100cqw, 100cqh * 556 / var(--H)), var(--shell-w-max));
  --u: calc(var(--shell-w) / 556);
  position: relative; display: flex; flex-direction: column; flex: none;
  width: var(--shell-w);
  height: clamp(calc(1024 * var(--u)), 100cqh, calc(1136 * var(--u)));
}
.shell .slice        { display: block; width: 100%; flex: none; pointer-events: none; user-select: none; }
.shell .slice-top    { aspect-ratio: 556 / 272; height: auto; }
.shell .slice-mid    { flex: 1 1 0; min-height: calc(8 * var(--u)); max-height: calc(120 * var(--u));
                       margin-block: -0.5px; background: center / 100% 100% no-repeat; }
.shell .slice-bottom { aspect-ratio: 556 / 744; height: auto; }
```

- **Register `--u` and `--shell-w` with `@property`.** `.lcd` is itself a size container; without registration a descendant that reads `var(--u)` would re-resolve `cqw` against the LCD. Registered properties are computed once, on the `.shell`, so every descendant sees the same px length. (Supported in all current browsers.)
- `--shell-w-min: 300px` and `--shell-w-max: 556px` are tokens in `src/styles.css`. The shell is never wider than 556 CSS px (never shown above 1:1) and never narrower than 300 px unless the viewport is: below that the page scrolls.
- **Height is the limit (desktop, tall phones):** `100cqh * 556 / 1136` wins, the shell fills the stage and the mid band sits at its maximum, so the LCD is at **1.4x**. **Width is the limit (narrow phones):** the shell is `100cqw` wide and the spare height goes to the band, between 1.0x and 1.4x.
- `margin-block: -0.5px` on the mid band overlaps the neighbours by half a pixel so no hairline shows at fractional heights. The slices are near-identical at the seam.
- **LCD height** = `286u` at 1.0x (mid = 8u) to `398u` at 1.4x (mid = 120u). Factor = LCD height / 286u. The cap is the single constant `120` (= 8 + 112, 112 = 0.4 x the legacy 281 px LCD); tune it at checkpoint A.
- Slices are static assets in `public/radio/`; no `srcset`, no 2x. `image-rendering: auto` (smooth). The bitmap is soft on 3x phones; accepted by the user.

### Sizes at the three review viewports (computed, +/- 2 px; furniture height assumed 96 px with the hint, 62 px without)

| Viewport | Stage (cqw x cqh) | Shell width / `u` | Shell height | Mid band | LCD (w x h) | List area (LCD - 78 px strip) |
| -------- | ----------------- | ----------------- | ------------ | -------- | ----------- | ----------------------------- |
| 360 x 740 | 336 x 612 | 300 px (min clamp) / 0.540 | 612 | 64 px = 118u | 208 x 214 px, **1.38x** | 136 px = 4.2 rows of 32 px |
| 412 x 915 | 388 x 787 | 385 px / 0.693 | 787 | 83 px = 120u (max) | 268 x 276 px, **1.39x** | 198 px = 6.2 rows |
| 1440 x 900 | 1416 x 804 | 394 px / 0.708 | 804 | 85 px = 120u (max) | 273 x 282 px, **1.39x** | 204 px = 6.4 rows |

At 1440 x 900 the shell is height-limited to about 394 px wide, so it is smaller than the old 480 px CSS radio. This follows from the plan's rule (never above 1:1 and the whole radio plus furniture inside `100dvh`), not from a bug.

## 3. Overlay anchors (L3)

Source px on the 556 x 1024 canvas, from "Shell geometry" below. Elements above the band are anchored from the top; elements below it from the **bottom** edge of the shell (`bottom: (1024 - y_exclusive) u`), which is exact for any stretch because the bottom slice starts at y 280.

| Overlay | left | width | height | anchor |
| ------- | ---- | ----- | ------ | ------ |
| `h1` over the logo | 136 u | 263 u | 51 u | `top: 66u` |
| LCD surface | 77 u | 386 u | grows (286u to 398u) | `top: 148u; bottom: 590u` (y 148-433 inclusive covers the whole opening incl. its inner shadow) |
| Pill button (rim box) | 79 u | 198 u | 66 u | `bottom: 501u` (rim y 457-522) |
| Pill face (pseudo) | 10 u in | 177 u | 46 u | `top: 10u` inside the button, full radius |
| Round button (ring bbox) | 298 u | 163 u | 153 u | `bottom: 391u` (ring y 480-632), `border-radius: 50%` (an ellipse) |
| Round face (pseudo) | 10 u in | 145 u | 133 u | `top: 9u` inside the button, `border-radius: 50%` |

The button boxes are the rim and the green ring (the hit areas, about 107 x 36 px and 88 x 83 px at the 300 px shell). The "face" pseudo-elements draw the press feedback exactly over the bitmap faces.

## 4. LCD surface (L3)

The bitmap's grey screen (`rgb(125 135 124)`, about 4.5:1 with dark ink) is covered by an **opaque** HTML surface, so text contrast never depends on the bitmap.

- Rectangle: x 77-462, y 148-433 (section 3), `border-radius: 4u` (measured corner radius of the flat area is about 4 px). It covers the dark inner shadow of the bezel opening and 0-2 px of the bezel edge, so there is no grey seam.
- Surface: `bg-lcd-bg`, `text-lcd-ink`, `font-lcd` 800, `tracking-lcd`, `overflow: hidden`, `container: lcd / size` (for the strip and textarea container queries).
- `::after` overlay (`pointer-events: none`, above content, `z-index: 5`): scanlines 5% ink every 3 px vertically and 4% every 3 px horizontally (unchanged), plus two inset shadows: `inset 0 0 14px rgb(22 32 15 / 16%)` (the vignette, unchanged: worst case about `#93A084`, still at least 5.5:1) and the **recess** `inset 0 calc(2 * var(--u)) calc(3 * var(--u)) rgb(0 0 0 / 25%)`, which blends the top edge into the bitmap's own inner shadow. The recess reaches about 3u (1.6 px at the 300 px shell); no text sits closer than 4 px to the edge (content padding is at least 4 px), so it does not touch contrast.
- No LCD bezel, no `shadow-lcd`: the bitmap draws the bezel.

## 5. LCD content sizes (L6, U15)

Doto 800, **1rem (`text-lcd-meta`, line-height 1.25)** for rows, textarea, search field, toggle, buttons, status and counter. Never below 1rem (dot-matrix legibility). 16 px also stops iOS from zooming the inputs. `--size-lcd-row: 2rem` (32 px) is the minimum height of every LCD row and control. Text uses `rem`, not `cqw`, so browser zoom and text zoom scale it.

### 5.1 Phrase rows

Row: `min-height: var(--size-lcd-row)`, padding `0.375rem 0.5rem 0.375rem 1.75rem` (one line of 20 px + 12 px = 32 px; the left 1.75rem holds the marker), `overflow-wrap: anywhere` (long text wraps to as many lines as needed, never truncates), 1px bottom divider `rgb(22 32 15 / 14%)` (decorative). Scrollbar `scrollbar-width: thin; scrollbar-color: lcd-ink lcd-bg-lo`, `overscroll-behavior: contain`.

| State | Visual | Contrast | Not colour alone because |
| ----- | ------ | -------- | ------------------------ |
| Default | `lcd-ink` on `lcd-bg` | 9.18:1 | - |
| Hover (pointer only) | bg `lcd-bg-hi`, 120 ms linear | 10.45:1 | Never the only cue |
| Focus-visible | `outline: 3px solid lcd-ink; outline-offset: -3px` | 9.18:1 | Outline vs the fill of "selected" |
| Selected | bg `lcd-ink`, text `lcd-bg`, full row width | 9.18:1 | Inversion is a lightness change |
| Selected + focus-visible | outline `lcd-bg` | 9.18:1 vs fill | - |
| Playing | Selected + marker: three bars in a 12 x 12 px box (2 px gaps) at `left: 0.5rem`, `lcd-bg`, `animate-marker`; reduced motion shows full-height bars | - | The marker shape |
| Loading (> 300 ms) | Marker replaced by three dots, `animate-dots` | - | Shape |

Empty result: the list is replaced by a centred "Nieko nerasta" in a 2px dashed `lcd-ink` box (`radius-sm`, padding 8 x 16).

### 5.2 Bottom strip (UX 5.11)

Fixed under the list/panel, never scrolls. `bg-lcd-bg-lo`, top border 2px `lcd-ink`, padding 4px, gap 4px.

| LCD container width | Layout | Height |
| ------------------- | ------ | ------ |
| < 340 px (every phone, and desktop below a 490 px shell) | Two lines: search field (+ x), then the toggle | 2 + 4 + 32 + 4 + 32 + 4 = **78 px** |
| >= 340 px (`@container lcd (min-width: 340px)`) | One line: search (flex, `minmax(0, 1fr)`) + toggle (auto) | 2 + 4 + 32 + 4 = 42 px |
| KURTI mode | Toggle only (no search) | 42 px |

- **Search field**: `radius-sm`, height 2rem, 2px `lcd-ink` border, bg `lcd-bg`, text `text-lcd-meta` (Doto), caret `lcd-ink`, placeholder `lcd-ink-soft` (6.38:1). Right padding 2rem so text never runs under the x. Focus: `outline: 3px solid lcd-ink; outline-offset: 1px` (inside the strip padding).
- **x (clear)**: a 2rem x 2rem transparent button at the field's right edge (hit area 32 x 32, above the 24 px AA minimum), 7 x 7 pixel icon at 14 px in `lcd-ink` (9.18:1 on `lcd-bg`), hover bg `lcd-bg-hi`, focus outline as the field's, inset. Visible only when the field has text. The native search cancel button is hidden.
- **Voice toggle**: two equal segments (`grid-template-columns: 1fr 1fr`), each 2rem tall with its own 2px `lcd-ink` border (the second overlaps the first by 2px so the divider is 2px), `radius-sm` on the outer corners. Inactive: `lcd-bg-lo` bg / `lcd-ink` text (7.49:1), hover `lcd-bg-hi` (10.45:1). Active (`aria-pressed="true"`): `lcd-ink` bg / `lcd-bg` text (9.18:1), so the active segment is inverted, never colour alone. Focus: inset `outline: 3px solid lcd-ink; outline-offset: -5px` (`lcd-bg` on the active segment). Hit height 32 px, width at least 80 px at the smallest LCD.

## 6. Page furniture, toast, scene dimming

Unchanged from the previous version (the preview shows them).

- Chips: `bg-chip-bg text-chip-fg text-chip rounded-lg shadow-chip px-3 py-1.5`, centred, `gap-1.5`, under the shell. Order: hint (touch only, hidden after the first play), counters, footer note. Counter numbers in `chip-accent`, `tabular-nums`, non-breaking thousands separator. Worst-case contrast 12.45:1.
- Toast: bottom-centre, 14px above the bottom (plus `env(safe-area-inset-bottom)`), `max-width: calc(100% - 32px)`, `rounded-xl`, 1px `rgb(255 255 255 / 14%)` border, `bg-chip-bg text-chip-fg`, `text-chip` weight 600, `shadow-toast`, `animate-toast-in`. Error: `bg-error-bg`, `error-line` border, `text-white` (13.4:1). Never takes focus, `aria-hidden`.
- Scene dimming: `filter: saturate(0.9)` on the canvas plus an overlay `radial-gradient(120% 90% at 50% 45%, transparent 40%, rgb(8 12 16 / 45%) 100%)` and a flat `rgb(8 12 16 / 22%)`. The overlay never sits above the shell or the chips.
- **Transparent backdrop (L1)**: the scene shows around the body. There is no black box. The prepared slices have no dark fringe; if one shows at checkpoint A, tune the fringe step in `tools/prepare-shell.mjs`, never add a CSS outline.

## 7. Keys (L4)

Two real `<button type="button">`: the **pill** (text KURTI in phrase mode, GARSAI in KURTI mode) and the **round key** (text SIŲSTI, both modes). Transparent background, no border, the bitmap face shows through. The label is HTML text, drawn over the **blank** face in the legacy style.

### 7.1 Label

| Property | Value |
| -------- | ----- |
| Font | `--font-key`: `'Arial Narrow', 'Roboto Condensed', 'Helvetica Neue', Arial, sans-serif`, `font-stretch: condensed`, weight 900 (legacy: Arial Narrow 900) |
| Colour | `--color-key-ink` `#444444` (the legacy dark grey) |
| Size | `font-size: max(1rem, calc(var(--u) * 28))`: 16 px at the 300 px shell (`u` = 0.54, 15.1 px, so the 1rem floor applies), 19.4 px at `u` = 0.693, 28 px at full size |
| Tracking | `0.05em` (legacy 0.03 to 0.05em), line-height 1, `white-space: nowrap`, no `text-transform` (the text is already upper case) |
| Position | Centred on the face. The round key gets `padding-bottom: 3u` so its optical centre is on the ellipse centre (380, 555) rather than the ring centre (379.5, 556.5) |

Fit check: the pill face is 177u x 46u (95 x 25 px at the smallest shell); "GARSAI" at 16 px in Arial Narrow 900 is about 58 px wide, in plain Arial Bold (no condensed face installed) about 70 px. The ellipse face is 145u x 133u (78 x 72 px); "SIŲSTI" at 16 px is about 52 to 62 px. Both fit with room, so nothing clips at 1x. At 200% text zoom the 1rem floor doubles to 32 px: the labels may then overflow the faces onto the rim and bezel but stay fully readable (UX 5.2); the `nowrap` keeps them on one line.

Face colour is the bitmap's `#DDDDDD` (pill face measured `rgb(221 221 221)`; the round-key face is the same or lighter, so `#DDDDDD` is the lower bound used below).

### 7.2 States, pill (KURTI / GARSAI) and round key (SIŲSTI)

The press and busy feedback is drawn by a `::before` pseudo-element that sits exactly on the bitmap face (`z-index: -1` inside an `isolation: isolate` button, so it is under the label): pill face = 177u x 46u, full radius, at (10u, 10u) inside the button; round face = 145u x 133u, `border-radius: 50%`, at (10u, 9u). Transitions: `transform` and `background-color`, `--duration-fast`, `--ease-out`.

| State | Visual | Label contrast (`key-ink` on the face) |
| ----- | ------ | -------------------------------------- |
| Default | Bitmap only; pseudo is transparent | **7.17:1** on `#DDDDDD` (9.74:1 on white) |
| Hover (pointer only) | Face overlay `rgb(255 255 255 / 25%)`, so the face is about `#E9E9E9` | 8.02:1 |
| Pressed (`:active`) | Button `translateY(1px)`; face overlay `rgb(0 0 0 / 12%)` (face about `#C2C2C2`) plus `inset 0 3u 4u rgb(0 0 0 / 28%)` (a sunk top edge that stays above the label: the label starts 13u below the face top) | **5.50:1** (worst case) |
| Focus-visible | Two-tone ring on the button box: `box-shadow: var(--shadow-focus-key)` (2px white) then `outline: 3px solid var(--color-focus); outline-offset: 2px`. Follows the rim (pill) and the ellipse | See below |
| `aria-disabled="true"` (SIŲSTI with nothing to send) | Face overlay unchanged, plus a 2px dashed `key-ink` outline on the face pseudo, `outline-offset: -6u`. Label unchanged. Still focusable; activation shows the toast | 7.17:1, dashed outline 7.17:1 |
| `aria-busy="true"` (sharing, generating) | Pressed position; the pseudo shows an inset ring in `key-ink` that pulses 2px to 4px (`animate-key-busy`, 1 s). The label is **never faded**. Reduced motion: static 3px ring (the animation is simply removed, the base ring stays) | 5.50:1; ring `key-ink` vs the pressed face 5.50:1 |
| Steady ring (SIŲSTI after "Paruošta. Spauskite SIŲSTI dar kartą.", `data-steady`) | The same 3px inset ring, **not pulsing**, until the next tap or until the text or voice changes. Distinguished from busy by not moving and by the status text | 5.50:1 |

The round key's green ring is part of the bitmap and never changes.

**Why a two-tone focus ring.** The single `focus` blue (`#0A3FA8`, L 0.0645) reaches 3:1 only against backgrounds with luminance above 0.29, but the bitmap around the keys includes the near-black rim and a dark metal groove (the ring would be about 1.2:1 there). White reaches 3:1 against luminance up to 0.30. The two thresholds overlap (0.29 and 0.30), so **at least one of the two rings meets 3:1 against any background**, and white against blue is 9.17:1 so the ring is one visible shape. This keeps the 3 px requirement of UX 9.3 (the outer blue ring is 3 px) and the ring is never clipped (no ancestor clips the shell).

## 8. KURTI panel (L5, UX 5.13)

Replaces the list and the search field in the LCD surface; the strip stays (toggle only). The panel is a scroll container (`flex: 1; min-height: 0; overflow-y: auto; padding: 4px 6px 6px; gap: 4px`), the strip never scrolls, and the credit is the first thing to scroll away.

Order and sizes (Doto 1rem unless stated):

| # | Part | Size / visual | Tokens |
| - | ---- | ------------- | ------ |
| 1 | **Label row**: "Jūsų frazė" (left) and the counter "n / 220" (right) | One line, 20 px. At 220 the counter reads "220 / 220 Pasiekta riba." (wraps to 2 lines) | `lcd-ink` 9.18:1 |
| 2 | **Textarea** (a real `<label for>`, UX 5.13) | 3 rows = `calc(3 * 1.25rem + 0.5rem + 4px)` = **72 px**; **2 rows = 52 px** when the LCD container is shorter than 260 px (`@container lcd (max-height: 260px)`). `resize: none`, 2px `lcd-ink` border, `radius-sm`, bg `lcd-bg`, padding `0.25rem 0.5rem`, scrolls inside. Placeholder `lcd-ink-soft` (6.38:1). Focus: `outline: 3px solid lcd-ink; outline-offset: 1px`. `aria-invalid="true"`: border becomes 3px dashed `lcd-ink` (shape, not colour) plus the message below | `lcd-ink` / `lcd-bg` 9.18:1 |
| 3 | **PALEISTI** | Full LCD width, 2rem tall, uppercase text, 2px `lcd-ink` border, `radius-sm`. Default `lcd-bg-lo` bg / `lcd-ink` text (7.49:1). Hover `lcd-bg-hi` (10.45:1). Pressed: inverted, `lcd-ink` bg / `lcd-bg` text (9.18:1). `aria-disabled`: dashed 2px border, text unchanged (7.49:1), no hover change. `aria-busy`: pulsing inset ring (`animate-key-busy`), label unchanged. Playing: the 12 px marker bars before the label. Focus: `outline: 3px solid lcd-ink; outline-offset: 1px` | as listed |
| 4 | **Status area** (`min-height: 2.5rem`, `aria-live="off"`) | One state at a time (table below) | `lcd-ink` 9.18:1 |
| 5 | **Credit** "Balsas: Coqui TTS (lt/cv/vits)" | Doto 1rem (the "never below 1rem" rule wins over the 12 px UX floor; Doto at 12 px turns to mush), colour `lcd-ink-soft` on `lcd-bg` (**6.38:1**), wraps to 2 lines at 208 px, last in the scroll area so it scrolls away first | `lcd-ink-soft` |

At 360 x 740 the LCD is about 214 px tall and the panel area 172 px (214 - 42 strip): label (20) + textarea (52) + PALEISTI (32) + gaps (12) = 116 px, so the first lines of the status area are visible and the rest scrolls. Plan ahead for this: the status area is the second item that matters (progress), so it is placed before the credit.

### 8.1 Status area states

| State | Content | Visual |
| ----- | ------- | ------ |
| Download (size note + progress) | "Atsisiunčiamas balsas (apie 71 MB). Tai tik pirmą kartą." then the progress bar, then "Atsisiunčiama: {a} iš {b} MB" | Text `lcd-ink`. Bar below |
| Preparing | "Ruošiamas balsas…" and an indeterminate bar | |
| Voice ready | "Balsas paruoštas." (replaced by the idle hint after 3 s, text stays in the DOM) | |
| Idle, empty text | "Įveskite frazę ir spauskite PALEISTI." | |
| Generating | "Kuriama kalba…" and an indeterminate bar | |
| Playing | "Grojama." | |
| Press SIŲSTI again | "Paruošta. Spauskite SIŲSTI dar kartą." | SIŲSTI shows the steady ring |
| Errors (download, create-voice, offline, unsupported, generation) | Alert icon (7 x 7 pixel triangle with "!", 14 px, `lcd-ink`, `aria-hidden`) before the message; the retry states add a **"Bandyti dar kartą"** button (same style as PALEISTI, sentence case, 2rem tall, auto width) | Error is never colour alone: icon + text + (retry) button |

### 8.2 Progress bar

- Height 12 px, 2px `lcd-ink` border, track `lcd-bg`, fill `lcd-ink` (fill vs track **9.18:1**, border vs surroundings 9.18:1; both far above the 3:1 UI minimum). No rounded corners (pixel look), `radius-xs` at most.
- Determinate: fill width = loaded / total, `role="progressbar"` per UX 5.13. Updates at most 4 times per second. The numbers are also written as text next to it ("Atsisiunčiama: 23 iš 71 MB"), so the state is never colour or width alone.
- Indeterminate (preparing, generating): the fill is full width with a stripe pattern `repeating-linear-gradient(90deg, lcd-ink 0 4px, transparent 4px 8px)`, `background-size: 16px 100%`, animated by `animate-bar` (stepped, 0.8 s). **Reduced motion: the stripes stay but do not move**, and the text beside it carries the state.

## 9. Narrow, short and zoomed

- **Below 300 px wide** the shell stays at 300 px and the page scrolls sideways only if the viewport itself is narrower. The shell height never goes below 1024u (the lower bound of the clamp), so the LCD never drops under the 1.0x proportion; the page scrolls vertically instead. The frontend gives the page a `min-height: min-content` for this.
- **Short** (viewport height so small that 1024u does not fit, e.g. landscape phone): the shell keeps 1.0x and the page scrolls; the LCD list keeps at least 2 rows. The old `short` variant (hide cap and grille) no longer applies because those parts are the bitmap.
- **200% text zoom**: rows, strip, textarea and buttons grow with `rem` (rows may exceed 32 px, never shrink), the list scrolls, labels may overflow their faces (section 7.1). The 24 px hit-area rule is always met.
- **Safe area**: the page padding uses `max(0.75rem, env(safe-area-inset-*))`.

## 10. Deviations from the UX spec / notes for the frontend

- **Counter position (UX 5.13 says under the textarea).** The preview and this spec put it on the label row, right-aligned, to save a 20 px line on the 214 px LCD. DOM order stays label, textarea, counter (`aria-describedby` unchanged); only the visual order differs, via a grid. If the ux-expert prefers it under the textarea, it costs 20 px.
- **Credit set in Doto 1rem**, not 12 px UI font (design-system rule: LCD text is always Doto, never below 1rem). It wraps to two lines at the smallest LCD.
- **Two-tone focus ring on the keys** (white then `focus` blue) instead of a single 3 px `focus` ring, for the reason in section 7.2.
- **Textarea is 2 rows (not 3) when the LCD is under 260 px tall** (360 x 740 only). UX says 3 visible rows; the panel scrolls anyway, and the progress area must stay reachable.
- **List rows at 360 x 740 show 4.2 rows** (4 full rows plus the strip), which just meets "at least 4" with nothing to spare. Any added line in the strip or padding drops it below 4.
- axe cannot read the bitmap colour behind the key labels and reports `color-contrast` as "needs review". The ratios above are the proof; the tester verifies by eye and with a contrast checker on the face colour `#DDDDDD`.
- `aria-disabled` keys keep full-contrast labels (they are focusable and explain on tap).
- The toast uses `chip-bg` (see design-system 2.4).

## Shell geometry (legacy `walkie-shell.png`, measured 2026-10-16)

All values are in **source pixels** of the 556x1024 canvas (origin top-left, x/y inclusive, so width = x1 - x0 + 1). Measured by script (sharp raw RGB, flood fills and ray scans on the original, before the backdrop is removed). The prepared slices keep this canvas, so the numbers apply to `public/radio/shell-*.webp` unchanged (the slices are only cut at the lines below).

| Part | Measurement |
| --- | --- |
| Canvas | 556 x 1024 |
| Body extent | x 26-504 at every row y 150-430 (straight vertical sides); the rest is black backdrop |
| LCD, flat area | x 81-457, y 158-431 = **377 x 274**. Colour `rgb(125 135 124)`, noise <= 2 levels. Found by flood fill (tolerance 2-4) from (275, 300) |
| LCD, whole opening (flat area plus its inner shadow) | x 77-462, y 148-432 = about 386 x 285. Dark inner shadow: top y 148-157, left x 77-80, right x 458-462; the bottom edge is a 1-2 px step (y 432-433) into the bezel |
| LCD corner radius | about **4 px** (the flat area is nearly square: the corner inset is 3-4 px for the first rows, then constant) |
| Pill, dark rim | x 79-276, y 457-522 = 198 x 66 (full-round ends) |
| Pill, light face | x 89-265, y 467-512 = 177 x 46. Face colour `rgb(221 221 221)`; the lower 5 rows shade down into the rim |
| Round key, white face | ellipse, x 308-452, y 489-621 = 145 x 133, **centre (380, 555)**, semi-axes about 73 x 67 (flood fill tolerance 12; ray scan from the centre agrees: 67-74 px) |
| Round key, green ring | ellipse, outer bbox x 298-460, y 480-632 = 163 x 153, **centre (379, 556)**, ring about 4-5 px thick (outer semi-axes about 81 x 76, inner about 76 x 71). Pixels where G exceeds R and B by more than 18 |
| Logo "RACIJA" | x 136-398, y 66-116 = about 263 x 51. Dark letters; the right-hand letters fade to mid grey, so the right end is read from the picture (+/- 2 px), the left, top and bottom from the pixel scan |

Notes:

- The key is an ellipse (about 8% wider than tall), not a circle: the legacy overlay used a circle of about 186 px with extra padding, which is why legacy percentages are larger than the face. Use the face ellipse for the visual press state and keep the larger hit area.
- Legacy overlay boxes for reference (source px at 556 x 1024): screen x 75-475, y 154-435 (13.5 %, 15 %, 72 %, 27.5 %); it deliberately covers the bezel's inner shadow and a few px of the right bezel (the flat grey stops at x 457, the bezel highlight runs to about x 475).
- The pill and key are plain bitmap faces (no text); the LCD overlay paints its own surface (L3), so its radius should be about 4 px and it should cover x 77-462, y 148-433.

### L2 cut lines

The plan proposed y 290-298. Measured on the original, **290-298 is not uniform**: the maximum difference between consecutive rows is 11 levels (at x 52, y 295), and 15 against the first row. It is the brushed-metal bezel texture, not a structural edge, but it is the worst nearby choice.

Method: for every 8-row band starting at y 150-425, the maximum per-channel absolute difference between consecutive rows over the full width 0-555 (7 row pairs x 556 px x 3 channels).

- Most uniform bands: start y 176, 184, 192, 208, 248, 256, 272 all give max 3 (264 gives 4). They are all inside the flat LCD.
- The band closest to the plan's position is **272-280**: max consecutive difference **3** levels, max difference against the first row of the band 12 (a slow vertical gradient in the bezel texture, invisible when stretched; the sides at x 26 and 504 are straight at every row of the band, and the LCD columns differ by at most 1).

**Confirmed cut lines (source px): top = y 0-272, mid band = y 272-280 (8 rows), bottom = y 280-1024.**

Consequences for L2/L3:

- The top slice is 272 high, the bottom slice 744 high (plan: 290 and 726). The LCD flat area spans y 158-431, so the band sits 114 px below its top and 151 px above its bottom edge: of the legacy 274 px LCD height, 114 px are above the band and 152 px below.
- Overlay anchors: elements above the band use `top: y u`, below the band use `bottom: (1024 - y) u`. With the band at 272-280, the stretched height replaces the 8 rows, so the bottom-anchored items (pill, key, grille, cable) keep their legacy y relative to the bottom edge of the shell.
- The 1.4x cap: the legacy LCD height is 274 px (flat) or 281 px (legacy overlay); 0.4 x 281 = 112 px extra, as in the plan.


## Desktop size (user feedback, checkpoint A, 2026-10-16)

From `min-width: 64rem` the shell stage is capped at 75% of the viewport height (`flex: 0 1 75%; max-height: 75%`) and centred vertically, so more of the pixel scene shows around the radio. The `--shell-w` clamp is unchanged; it simply resolves against the smaller container.
