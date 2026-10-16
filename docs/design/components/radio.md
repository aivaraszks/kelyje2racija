# Component spec: radio

Tokens: `docs/design/design-system.md` (names below are the `@theme` names; Tailwind utilities in brackets). Behaviour and copy: `docs/ux/racija-radio.md`. Plan: D4, D5. Working reference: `docs/design/preview/racija-preview.html` (its CSS under "product" is the visual source; copy values, not structure).

Angular mapping (plan task 9): `radio.component` (body, cap, button row, grille), `lcd-screen.component` (search row, list, footer), `radio-button.component` (variants `pill` and `round`), SVG partials for logo, grille and cable.

## 1. Anatomy

A flexible CSS body with vector details. Top to bottom, in one flex column (`display:flex; flex-direction:column`):

| # | Part | Height | Notes |
| - | ---- | ------ | ----- |
| 1 | **Cap** | `3.25rem` fixed | Logo plate (left), coiled cable (flex 1), jack (right). Decorative except the `h1` name. Hidden below `short`. |
| 2 | **LCD bezel + screen** | `flex: 1 1 auto`, min `15rem`, max `70dvh` | The only part that grows. Contains search row, list, footer. |
| 3 | **Button row** | auto (about 6.5rem, set by the 5.75rem round key) | PAIEŠKA, PRIIMTI, SIŲSTI. Fixed. |
| 4 | **Speaker grille** | `2.75rem` (`3.25rem` on desktop) | SVG dot pattern, decorative. Hidden below `short`. |

Radio body: `rounded-2xl`, `shadow-radio`, padding `3` (12px) / `4` (16px) from `sm`, gap `3`. Background: brushed streaks (`repeating-linear-gradient(0deg, white 6% 1px, black 3% 1px)`) over the vertical gradient `metal-200 0%, metal-300 45%, metal-400 100%`. Four screws (10px circles, `metal-50` to `metal-500` radial, a slot line in `metal-600`) sit in the corners, 9px from the edges, each at a different rotation. **The body has no `overflow: hidden`** so focus rings are never clipped.

Width: `min(100% - 24px, var(--container-radio))` (`max-w-radio`), centred, plus `env(safe-area-inset-*)`.

## 2. How the LCD grows (D4)

The page is a flex column of `100dvh`: the radio, then the page furniture (hint, counters, footer note), then nothing else.

```
page            height: 100dvh; display:flex; flex-direction:column; align-items:center; gap: 2 (8px); padding: 3 + safe-area
 radio          flex: 1 1 0; min-height: 0         (phones: fills what the furniture leaves)
   cap          flex: none
   lcd bezel    flex: 1 1 auto; min-height: 15rem; max-height: 70dvh
   buttons      flex: none
   grille       flex: none
 furniture      flex: none
```

- **Phones (< `lg`)**: the radio takes the full remaining height, so the LCD gets everything left after cap + buttons + grille (about 320px = 5 to 6 rows at 360x740; about 495px = 10 rows at 412x915).
- **Desktop (`lg` and up)**: the radio is `flex: none; height: min(100dvh - 110px, 820px)` and the stage is vertically centred. At 1440x900 the radio is about 480x756 and the LCD about 450px tall (9 to 10 rows).
- **Minimum**: 4 rows plus footer = `15rem` (240px). If cap + buttons + grille + 240px do not fit (landscape phone, keyboard open), `short` hides cap and grille first; if it still does not fit, the page scrolls (`min-height: min-content` on the page) and the LCD stays at its minimum. The LCD never drops under 4 rows and never overlaps the buttons.
- **Maximum**: `70dvh`, so on very tall windows the buttons stay close under the screen.
- **Search open**: the search row takes `3.75rem` from the list area, not from the radio, so nothing else moves. With the on-screen keyboard (`interactive-widget=resizes-content`) `short` collapses cap and grille so at least 3 rows and the field stay visible.
- Because it is CSS and SVG only, nothing blurs at any size or zoom.

## 3. Cap

- **Logo plate**: `rounded-lg`, gradient `metal-800` to `metal-900`, inset highlight `rgb(255 255 255 / 18%)`, 1px lower lip `rgb(255 255 255 / 60%)`. Wordmark: SVG `viewBox="0 0 35 7"`, drawn at `1.75rem` tall (exactly 4px per unit, `shape-rendering: crispEdges`), `fill: metal-200` (12.6:1 on the plate). Path (copy as is):

  `M0 0h1v7h-1z M1 0h3v1h-3z M4 1h1v2h-1z M1 3h3v1h-3z M2 4h1v1h-1z M3 5h1v1h-1z M4 6h1v1h-1z M6 1h1v6h-1z M10 1h1v6h-1z M7 0h3v1h-3z M7 3h3v1h-3z M12 1h1v5h-1z M13 0h3v1h-3z M13 6h3v1h-3z M16 1h1v1h-1z M16 5h1v1h-1z M18 0h5v1h-5z M20 1h1v5h-1z M18 6h5v1h-5z M26 0h3v1h-3z M28 1h1v5h-1z M24 5h1v1h-1z M25 6h3v1h-3z M30 1h1v6h-1z M34 1h1v6h-1z M31 0h3v1h-3z M31 3h3v1h-3z`

  (R, A, C, I, J, A on a 5x7 grid, 1 unit gap.) The SVG is `aria-hidden`; the accessible name "RACIJA" is on the parent `h1`.
- **Cable**: `viewBox="0 0 160 32"`, `preserveAspectRatio="none"`, 9 coils: a polyline of `x = t*160 + 5*cos(a)`, `y = 16 + 10*sin(a)` with `a = t * 9 * 2pi`, 216 steps. Two strokes with `vector-effect: non-scaling-stroke`: `metal-900` 4px, then `metal-500` 1.2px shifted up 1px as a highlight. Reference generator: `cablePath()` in the preview. Decorative, `aria-hidden`.
- **Jack**: `1.75rem` circle, 3px `metal-800` border, radial gradient `metal-100` to `metal-500` to `metal-700`, dark `metal-950` hole in the middle.

## 4. LCD

### 4.1 Bezel and screen

- **Bezel**: padding 6px, `rounded-xl`, gradient `metal-800` to `metal-900`, `shadow-lcd` (recessed, light lower lip).
- **Screen**: `rounded-lg`, `bg-lcd-bg`, `text-lcd-ink`, `font-lcd` weight 800, `tracking-lcd`, `overflow: hidden`. Overlay (`::after`, `pointer-events:none`, above the text): scanlines 5% ink every 3px vertically, 4% ink every 3px horizontally, inset edge shadow `0 0 14px` at 16% ink. Contrast stays at least 5.5:1 (design-system 2.2).

### 4.2 Rows

Row: `min-height: var(--size-hit)`, padding `0.5rem 0.75rem 0.5rem 2.25rem` (the left 2.25rem holds the marker), `text-lcd`, line-height 1.3, `overflow-wrap: anywhere` (long text wraps up to 3 lines, never truncates), 1px bottom divider `rgb(22 32 15 / 14%)` (decorative).

| State | Visual | Contrast | Not colour alone because |
| ----- | ------ | -------- | ------------------------ |
| Default | `lcd-ink` on `lcd-bg` | 9.18:1 | - |
| Hover (pointer only) | bg `lcd-bg-hi`, 120ms linear | 10.45:1 | Hover is never the only cue |
| Focus-visible | `outline: 3px solid lcd-ink; outline-offset: -3px` (inside the row) | 9.18:1 vs LCD | Outline shape differs from the fill of "selected" |
| Selected | bg `lcd-ink`, text `lcd-bg` (inverted bar, full row width) | 9.18:1 | Inversion is a shape/lightness change |
| Selected + focus-visible | outline colour becomes `lcd-bg` | 9.18:1 vs fill | - |
| Playing | Selected + marker: three bars (a 14x14px box, 2px gaps), `lcd-bg`, at `left: 0.8rem`, animation `marker` (0.7s, `steps(4)`, 0.1s stagger, `transform-origin: bottom`) | - | The marker shape is the cue; reduced motion shows the bars at full height |
| Loading (> 300ms) | Marker replaced by three dots, `animate-dots` | - | Shape |
| Error | Back to "selected" | - | Toast explains |

Scrollbar: `scrollbar-width: thin; scrollbar-color: lcd-ink lcd-bg-lo`. `overscroll-behavior: contain`.

### 4.3 Search row

Strip: padding 8px, bg `lcd-bg-lo`, bottom border 2px `lcd-ink`. Field: height `--size-hit`, 2px `lcd-ink` border, `rounded-md`, bg `lcd-bg`, text `text-lcd` (18px, so no iOS zoom), caret `lcd-ink`, placeholder `lcd-ink-soft` (6.38:1). Focus: `outline: 3px solid lcd-ink; outline-offset: 2px`. Clear button: 44x44, 2px `lcd-ink` border, bg `lcd-bg-lo`, 7x7 pixel "x" icon in `lcd-ink` (hover bg `lcd-bg-hi`), visible only when the field has text.

### 4.4 Empty state

The list is replaced by a centred block: "Nieko nerasta" in `text-lcd-meta`, inside a 2px dashed `lcd-ink` rounded box (`rounded-md`), padding 8 x 16. The footer still shows "Įrašų: 0".

### 4.5 Footer strip

Bg `lcd-bg-lo`, top border 2px `lcd-ink`, padding 6px 8px, `text-lcd-meta`, `flex-wrap` (the count wraps under the toggle on very narrow widths). Left: **voice toggle**, a two-segment control with a 2px `lcd-ink` border, `rounded-md`, a 2px divider; each segment 40px tall + border = 44px, min width 44px, padding 0 0.625rem. Inactive: `lcd-bg-lo` bg / `lcd-ink` text (7.49:1), hover `lcd-bg-hi`. Active (`aria-pressed="true"`): `lcd-ink` bg / `lcd-bg` text (9.18:1), so the active one is inverted, never colour alone. Focus: inset 3px outline (`outline-offset: -5px`) in `lcd-ink` (`lcd-bg` on the active segment). Right: "Įrašų: N", `white-space: nowrap`.

## 5. Keys

All three: `font-ui` 800 `text-key` (13px), uppercase, `tracking-key`, `text-metal-900`, height/hit area at least 44px. Transitions: `transform` and `box-shadow`, `--duration-fast`, `--ease-out`. Focus-visible on all: `outline: 3px solid var(--color-focus); outline-offset: 3px`.

### 5.1 Pill (PAIEŠKA, SIŲSTI)

`rounded-full`, height `--size-hit`, padding-inline `0.5rem` (so "PAIEŠKA" fits 78px at 320px wide), face gradient `metal-100` to `metal-300`, `shadow-key`.

| State | Visual |
| ----- | ------ |
| Default | As above |
| Hover | Face gradient `metal-50` to `metal-200` (label 12+:1) |
| Active / pressed | `translateY(3px)`, `shadow-key-down`, flat `metal-300` face (10.27:1) |
| PAIEŠKA open (`aria-expanded="true"`) | Stays in the pressed state (it is a latching key) |
| `aria-disabled="true"` (SIŲSTI, nothing selected) | Flat `metal-400` face, no top highlight, `inset 0 1px 3px rgb(0 0 0 / 22%)` shadow, 2px dashed `metal-600` outline inset 5px. Label unchanged (7.93:1). Still focusable; activation shows the toast. |
| `aria-busy="true"` (sharing) | Pressed position, `animate-busy`: an inner 3px `metal-700` ring pulses 1s. The label is **never faded**. |
| Focus-visible | Outer ring `focus` colour (5.69:1 on `metal-300` body) |

### 5.2 Round (PRIIMTI)

Diameter `5.75rem` (92px). Layers, outside in:

1. **Bezel**: the button itself, bg `metal-950`, `0 3px 0 metal-700` edge + drop shadow.
2. **LED ring**: inset 5px, 4px border. Off: `led-off`. On (a clip is playing): `led-on` + `shadow-led-on`, animation `animate-led` (1.6s breathing). 12.2:1 against the bezel.
3. **Face**: inset 9px, `go-400` to `go-600` vertical gradient, `inset 0 2px 0 rgb(255 255 255 / 45%)` highlight, `inset 0 -3px 0 rgb(0 0 0 / 18%)` shade. Content centred: icon (`0.75rem`) over the label "PRIIMTI" in `metal-900` (5.44:1 at the darkest point, higher in the middle).

Icon: play (idle) = stepped triangle `viewBox 0 0 8 10`, `M1 0h2v2h2v2h2v2H5v2H3v2H1z`; stop (playing) = square `viewBox 0 0 10 10`, `M1 1h8v8H1z`. Both `fill: metal-900`, `crispEdges`, `aria-hidden`.

| State | Visual |
| ----- | ------ |
| Default (idle, row selected) | LED off, play icon |
| Hover | Face gradient lightens by 6% (use `filter: brightness(1.06)` on the face only) |
| Pressed | `translateY(3px)`, edge shadow collapses, inset shadow |
| Playing | LED on and breathing, stop icon, accessible name suffix ", sustabdyti" |
| `aria-disabled="true"` (nothing selected) | Face keeps colour and label; 2px dashed `metal-900` outline inset 6px on the face; LED off |
| Focus-visible | Outer ring `focus` colour, offset 3px |

Reduced motion: LED stays lit with the glow `shadow-led-on`, no breathing.

## 6. Grille

`rounded-lg`, bg gradient `metal-400` to `metal-300`, `inset 0 2px 5px rgb(0 0 0 / 30%)`, 1px light lower lip. SVG `<pattern>` tile 7x7 userSpace: a `metal-600` dot r 1.7 plus a white 55% dot offset 0.6px down as a lower highlight. It tiles to any size. `aria-hidden`.

## 7. Page furniture and toast

Chips: `bg-chip-bg text-chip-fg text-chip rounded-lg shadow-chip px-3 py-1.5`, centred, `gap-1.5`. Order under the radio: hint (touch only), counters, footer note.

- **Hint**: `coarse:inline-flex`; 12x10 speaker icon in `chip-accent` + "Įjunkite garsą". Hidden after the first play.
- **Counters**: "Paleista: **N** · Išsiųsta: **N**"; numbers in `chip-accent`, weight 600, `tabular-nums`, non-breaking thousands separator.
- **Footer note**: `<footer>` chip, text per UX 5.9.
- **Toast**: bottom-centre of the page, 14px above the bottom (plus `env(safe-area-inset-bottom)`), `max-width: calc(100% - 32px)`, padding `0.625rem 1rem`, `rounded-xl`, 1px `rgb(255 255 255 / 14%)` border, `bg-chip-bg text-chip-fg`, `text-chip` weight 600, `shadow-toast`, `animate-toast-in`. Centre it with a fixed full-width flex wrapper (so `toast-in` only moves it vertically; the preview centres with `translateX(-50%)` and so adjusts the keyframe). Error: `bg-error-bg`, 1px `error-line` border, `text-white` (13.4:1). Never takes focus, `aria-hidden`.

## 8. Narrow, short and zoomed

- **320px**: radio padding 12px; the button row grid is `minmax(0,1fr) auto minmax(0,1fr)` with gap 10px, so each pill is about 78px. Labels stay on one line (`white-space: nowrap`), padding-inline shrinks to `0.375rem` below `xs` if needed.
- **200% text zoom / 180-360 CSS px**: the pills would clip. Use `@container`/`flex-wrap` so PRIIMTI moves to its own line above the two pills (UX 5.2). Rows wrap text; the footer wraps the count under the toggle.
- **`short` (height <= 576px)**: cap and grille hidden, radio gap `2`, LCD minimum 4 rows, page scrolls vertically.
- **Safe area**: page padding uses `max(0.75rem, env(safe-area-inset-*))`.

## 9. Scene dimming

The pixel canvas is dimmed so the radio reads as the hero: `filter: saturate(0.9)` on the canvas, then an overlay `radial-gradient(120% 90% at 50% 45%, transparent 40%, rgb(8 12 16 / 45%) 100%)` plus a flat `rgb(8 12 16 / 22%)`. The overlay never sits above the radio or chips.

## 10. Deviations from the UX spec / notes for the frontend

- Nothing deviates in behaviour. Visual choices the UX spec left open: pressed look for the latching PAIEŠKA, dashed outline for `aria-disabled`, playing marker = three bars, selected row has no extra glyph.
- UX 5.4 says "Pamerk (1)"; the new phrase list (`docs/ux/phrases.md`) reads "Pamiršk", so the preview shows "Pamiršk (1)".
- The toast uses `chip-bg` (renamed from `chip`, see design-system 2.4).
