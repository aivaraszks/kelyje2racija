# Component spec: pixel scene (cabin background)

Plan: D13. Frontend task 10: `shared/pixel-scene/pixel-scene.component.*` and `sprites.ts`. Working prototype with all code: `docs/design/preview/racija-preview.html`, section "PIXEL SCENE" (`makeScene`, `render`, the 12 fps controller). Port it to TypeScript; the logic is deliberately dependency-free.

## 1. What it is

A procedural, original pixel-art view from the cab of a parked truck on a lay-by, late afternoon. Drawn to a low-resolution `<canvas>` and enlarged with `image-rendering: pixelated`. No image files. Decorative: `aria-hidden="true"`, `role="presentation"`, not focusable. It sits behind everything (z-order 0), dimmed by an overlay (radio.md section 9).

## 2. Canvas size

- Logical pixel size `p` (CSS px per art pixel): **3** below `sm` (640px), **4.5** from `sm`. Logical size = `ceil(viewportWidth / p) x ceil(viewportHeight / p)`, capped at 320 x 200.
- Examples: 1440x900 gives 320x200 (D13: about 320x180, matched to the 16:10 viewport); 360x740 gives 120x247; 412x915 gives 138x305.
- CSS: `position: fixed; inset: 0; width: 100%; height: 100%; image-rendering: pixelated;` (also `crisp-edges` as a fallback), `filter: saturate(0.9)`.
- Re-create the layers on resize (debounced 150 ms) and on `orientationchange`. Ignore `devicePixelRatio`: the canvas stays low-res on purpose.
- Everything is expressed in fractions of the logical width `W` and height `H`, so any aspect ratio works.

## 3. Palette (a TypeScript constant; the one place hex values are allowed)

| Group | Colours |
| ----- | ------- |
| Sky (top to bottom, ordered-dither between neighbours) | `#27496b` `#3b6a8f` `#5e93af` `#8fb9c4` `#c7d9c9` `#f0dfb4` |
| Sun, halo | `#fff0bd`, `#f8e7b0` |
| Cloud light, shade | `#f6eeda`, `#cbd3cc` |
| Far hills | `#86a3ad` (top 3 rows), `#7c9aa6` |
| Mid hills | `#7a9a96` (top 2 rows), `#5a7c74` |
| Forest (left half, right half, highlight) | `#27413a`, `#2f4f43`, `#3e6350` |
| Meadow (far to near) | `#7d9c5d` `#6c8f4e` `#5d7f43` `#4f6f3a`; flowers `#e8d77a` (1.2% of lower-half pixels) |
| Road | asphalt `#4a4f55` / `#41464c` (20% noise), curb `#b5ae9a`, centre dashes `#e9e3c8` (8 on, 8 off) |
| Lay-by gravel | `#8b8576`, `#7a7466` (20%), `#9a9484` (14%) |
| Near trees | trunk `#4a3526`; needles dark `#1f3a2d`, light `#2e5440`, highlight `#3d6b50` |
| Cabin | `#0f1316` `#161b20` `#1e252b` `#2a323a`, edge light `#4a545e` |
| Gauge dots | amber `#e0a458`, green `#7fd6a0` |
| Air freshener | dark `#2f8a4a`, light `#4fbf6b`, highlight `#8fe0a0`; string `#c8ccd2` |
| Car (red, window, dark) | `#c0463c`, `#9fd0e0`, `#1c1f23` |
| Parking sign (blue, white, post) | `#2b5fa8`, `#f1f3f5`, `#8b929b` |
| Mirror glass | `#7c9aa6` to `#c7d9c9` (dithered) |

Dither: 4x4 Bayer matrix `[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]`; a pixel takes colour B when `bayer[y&3][x&3] < t*16`, else colour A. Noise uses an integer hash of `(x, y)` (deterministic: the scene never changes between frames except where animated).

Text never sits on the scene (chips carry it), so the palette has no contrast requirement. The lightest scene colour `#f0dfb4` is the worst case behind a chip (design-system 2.4).

## 4. Layers (back to front)

Let `hy = 0.47H` (horizon), `my0 = hy + 0.025H`, road `0.60H` to `0.69H`, dashboard top `0.80H`.

| # | Layer | Content | Cached? | Animated |
| - | ----- | ------- | ------- | -------- |
| 1 | Sky | Vertical 6-colour gradient by Bayer dither, sun disc at `(0.30W, hy - 0.035H)` radius `max(4, 0.045 min(W,H))` with a 3x dithered halo | Offscreen canvas | No |
| 2 | Clouds | Three sprites generated from ellipse blobs (26x8, 18x6, 34x7 px; light body, shade on the lower edge) at heights `0.12`, `0.30`, `0.50` of `hy` | No | Drift left to right |
| 3 | Ground | Far hills (sine sum, top edge dithered), mid hills, meadow dithered in 4 bands with flowers, road with curb lines and centre dashes, lay-by gravel with curb, parking sign "P" (7x10 sprite) at `0.8W` | Offscreen canvas | No |
| 4 | Forest line | One small pine per 5 px of `W`, height `(7..15) * H/200`, base at `my0 + 1`, seeded variation | No | Sway |
| 5 | Traffic | One red car sprite (11x5) on the road lane | No | Crosses right to left |
| 6 | Near trees | Two mid trees (`0.22H`, `0.24H`, behind the road) and two tall trees (`0.33H`, `0.36H`, at `0.15W` and `0.87W`, in front) | No | Sway |
| 7 | Cabin frame | Roof header (thicker at the corners), both A-pillars (slanted, with a light inner edge), dashboard with a slightly bowed top, two vents, instrument cluster, rear-view mirror with glass | Offscreen canvas | No |
| 8 | Cabin details | Air freshener hanging from the mirror, two gauge dots | No | Swing, blink |

Sprites are string arrays (`'.'` transparent, one letter per palette colour) drawn as horizontal runs, and `pine()` builds trees row by row (half-width `floor(r*0.42) + (r%4==3 ? 1 : 0)`), which gives the tiered fir silhouette. Cached layers are drawn with one `drawImage` each per frame, so a frame costs about 3 to 4 thousand `fillRect` calls on the largest canvas.

## 5. Motion

| Element | Motion | Timing |
| ------- | ------ | ------ |
| Frame rate | Throttled `requestAnimationFrame`, render when `now - last >= 1000/12 - 2` ms | 12 fps (83 ms) |
| Clouds | Horizontal drift, wrap at `W + width + 12` | 1.6, 2.6 and 4.0 art px per second (a full crossing takes 1.5 to 4 minutes) |
| Tree sway | `offset = round(sin(1.5 t + phase) * amp * k^2)`, `k` = height fraction from the base (0 at the foot, 1 at the tip) | Period about 4.2 s; near trees `amp` 2.2 to 2.4 px, mid trees 1.2, forest 0.8 |
| Car | Crosses the road once every 18 s, visible 7 s, right to left | Never on the first frame |
| Air freshener | Pendulum `round(sin(1.9 t) * 2)` px at the tip, linearly less up the string | Period about 3.3 s |
| Amber gauge dot | On 1 s, off 1 s | 0.5 Hz (well under the 3 Hz limit) |

Nothing flashes; the fastest-changing element moves one art pixel per frame.

## 6. Lifecycle (frontend, plan task 10)

- Start in `afterNextRender`; never run on the server or in tests without a canvas context (guard `getContext` being null).
- Stop and clean up in `DestroyRef.onDestroy`: cancel the frame request, remove listeners.
- **Pause on `visibilitychange`**: cancel the loop when `document.hidden`, restart when visible (reset `last` to avoid a jump).
- **Reduced motion**: read `matchMedia('(prefers-reduced-motion: reduce)')` once and listen for `change`. When it matches, render **one** frame at `t = 0` and run no loop. Listen to the same query so toggling the OS setting takes effect without a reload.
- Run the loop outside change detection (zoneless apps have no zone; just do not write signals every frame).

## 7. Reduced-motion frame

`render(0)`: clouds at their start positions (`0.08W`, `0.55W`, `0.80W`), tree sway offset `sin(phase)` (a slightly different lean per tree, because the phase differs: the scene still looks natural, not rigidly straight), no car (the car is skipped at `t = 0`), the air freshener hangs straight, the amber gauge dot is on. The frame is complete and attractive on its own; it is also the frame used for the OG image.

## 8. Test hooks (for the tester)

- `prefers-reduced-motion: reduce` matches: `requestAnimationFrame` is never called after init.
- `visibilitychange` with `document.hidden = true`: the pending frame is cancelled; visible again: the loop resumes.
- Destroying the component cancels the frame and removes the listeners.
- The canvas has `aria-hidden="true"`.
