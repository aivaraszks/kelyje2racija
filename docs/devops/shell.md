# Radio shell asset

The radio body is the legacy `walkie-shell.png` (556x1024, black backdrop), made transparent and cut into three WebP slices that the app stretches in the middle (see `docs/plans/legacy-radio.md` L1, L2 and `docs/design/components/radio.md`, "Shell geometry").

Only the output is committed. The source image is gitignored.

## Regenerate

```sh
mkdir -p tools/shell-src
cp <kelyje>/src/assets/walkie-shell.png tools/shell-src/walkie-shell.png
pnpm prepare:shell                    # writes public/radio/shell-{top,mid,bottom}.webp
pnpm prepare:shell --debug <dir>      # also choose where the debug PNGs go (default: OS temp dir)
```

Needs `sharp` (devDependency; prebuilt binaries, no `allowBuilds` entry needed with pnpm 11).

## What the script does (`tools/prepare-shell.mjs`)

1. Flood-fills the backdrop from the four image edges: pixels whose brightest channel is <= 14 (`BG_MAX`). The dark cable is lighter than that and survives; the black inside the cable hook is enclosed, so it is kept.
2. Keeps only the largest connected component (the body and cable). This removes the bottom-right mark and one stray speck.
3. De-halos the edge: the outermost pixel (`ERODE`) is dropped, alpha ramps to 1 over the next 2 pixels (`FEATHER`), and the colour of the edge pixels is re-sampled from the pixels just inside, so there is no dark fringe over light backgrounds.
4. Keeps the 556x1024 canvas and writes the slices (WebP quality 90, alpha quality 100): top y 0-272, mid y 272-280, bottom y 280-1024. The cut lines are the constants `CUT_TOP` and `CUT_BOTTOM`; change them only together with the design doc.
5. Writes two full-size debug PNGs (`shell-over-magenta.png`, `shell-over-sky.png`) so that fringe and mark removal can be inspected.

## Output sizes

| File | Size |
| --- | --- |
| `public/radio/shell-top.webp` (556x272) | 10.2 KB |
| `public/radio/shell-mid.webp` (556x8) | 0.3 KB |
| `public/radio/shell-bottom.webp` (556x744) | 35.3 KB |

Total about 46 KB.
