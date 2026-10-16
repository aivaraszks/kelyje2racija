// Prepares the legacy radio shell: black backdrop -> transparent, drops the
// generator mark, de-halos the edge and writes three WebP slices.
//
//   pnpm prepare:shell [--debug <dir>]
//
// Input : tools/shell-src/walkie-shell.png (gitignored, copy from kelyje)
// Output: public/radio/shell-{top,mid,bottom}.webp
// Debug : <dir>/shell-over-magenta.png and shell-over-sky.png (default: OS temp dir)
import { mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'tools', 'shell-src', 'walkie-shell.png');
const OUT = join(root, 'public', 'radio');

// Cut lines in source pixels (see docs/design/components/radio.md, "Shell geometry").
const CUT_TOP = 272; // top slice: y 0..272
const CUT_BOTTOM = 280; // mid band: y 272..280; bottom slice: y 280..end

// Backdrop = pixels whose brightest channel is <= BG_MAX, reachable from the image edges.
const BG_MAX = 14;
// Edge pixels closer than this to the removed area get their colour re-sampled from the
// interior (they are blended with black); the outermost ERODE pixels are dropped.
const ERODE = 1;
const FEATHER = 3; // distance (px) at which alpha reaches 1

const dbgArg = process.argv.indexOf('--debug');
const DEBUG = dbgArg > 0 ? resolve(process.argv[dbgArg + 1]) : join(tmpdir(), 'racija-shell-debug');

const { data: rgb, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const N = W * H;
const maxCh = (p) => Math.max(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);

function neighbours(p, diag) {
  const x = p % W;
  const out = [];
  if (x < W - 1) out.push(p + 1);
  if (x > 0) out.push(p - 1);
  if (p >= W) out.push(p - W);
  if (p < N - W) out.push(p + W);
  if (diag) {
    if (x < W - 1 && p >= W) out.push(p - W + 1);
    if (x > 0 && p >= W) out.push(p - W - 1);
    if (x < W - 1 && p < N - W) out.push(p + W + 1);
    if (x > 0 && p < N - W) out.push(p + W - 1);
  }
  return out;
}

// 1. Flood fill the backdrop from the four edges.
const bg = new Uint8Array(N);
let stack = [];
const seed = (p) => {
  if (!bg[p] && maxCh(p) <= BG_MAX) {
    bg[p] = 1;
    stack.push(p);
  }
};
for (let x = 0; x < W; x++) {
  seed(x);
  seed((H - 1) * W + x);
}
for (let y = 0; y < H; y++) {
  seed(y * W);
  seed(y * W + W - 1);
}
while (stack.length) {
  const p = stack.pop();
  for (const q of neighbours(p, false)) seed(q);
}

// 2. Keep only the largest connected opaque component (8-connectivity).
const label = new Int32Array(N); // 0 = unlabelled / backdrop
let best = 0;
let bestSize = 0;
let nLabels = 0;
for (let s = 0; s < N; s++) {
  if (bg[s] || label[s]) continue;
  const id = ++nLabels;
  let size = 0;
  label[s] = id;
  stack = [s];
  while (stack.length) {
    const p = stack.pop();
    size++;
    for (const q of neighbours(p, true)) {
      if (!bg[q] && !label[q]) {
        label[q] = id;
        stack.push(q);
      }
    }
  }
  if (size > bestSize) {
    bestSize = size;
    best = id;
  }
}
const solid = new Uint8Array(N);
for (let p = 0; p < N; p++) solid[p] = label[p] === best ? 1 : 0;
console.log(`components: ${nLabels}, kept ${bestSize} px (${((bestSize / N) * 100).toFixed(1)}%), dropped ${nLabels - 1} others`);

// 3. Distance (in px, 8-connected) from each solid pixel to the removed area.
const dist = new Int32Array(N).fill(-1);
let frontier = [];
for (let p = 0; p < N; p++) {
  if (!solid[p]) continue;
  if (neighbours(p, true).some((q) => !solid[q])) {
    dist[p] = 1;
    frontier.push(p);
  }
}
for (let d = 1; frontier.length; d++) {
  const next = [];
  for (const p of frontier)
    for (const q of neighbours(p, true))
      if (solid[q] && dist[q] < 0) {
        dist[q] = d + 1;
        next.push(q);
      }
  frontier = next;
}

// 4. Defringe: re-sample colour of edge pixels from the interior, erode and feather alpha.
const out = Buffer.alloc(N * 4);
const col = new Float32Array(N * 3);
for (let p = 0; p < N * 3; p++) col[p] = rgb[p];
const order = [];
for (let p = 0; p < N; p++) if (solid[p] && dist[p] <= FEATHER) order.push(p);
order.sort((a, b) => dist[b] - dist[a]); // deepest first
for (const p of order) {
  // average the colour of neighbours that lie deeper inside (already final)
  let r = 0, g = 0, b = 0, n = 0;
  for (const q of neighbours(p, true)) {
    if (solid[q] && dist[q] > dist[p]) {
      r += col[q * 3];
      g += col[q * 3 + 1];
      b += col[q * 3 + 2];
      n++;
    }
  }
  if (n) {
    col[p * 3] = r / n;
    col[p * 3 + 1] = g / n;
    col[p * 3 + 2] = b / n;
  }
}
for (let p = 0; p < N; p++) {
  let a = 0;
  if (solid[p]) {
    const d = dist[p];
    a = d <= ERODE ? 0 : d >= FEATHER ? 1 : (d - ERODE) / (FEATHER - ERODE);
  }
  out[p * 4] = Math.round(col[p * 3]);
  out[p * 4 + 1] = Math.round(col[p * 3 + 1]);
  out[p * 4 + 2] = Math.round(col[p * 3 + 2]);
  out[p * 4 + 3] = Math.round(a * 255);
}
const raw = { raw: { width: W, height: H, channels: 4 } };

// 5. Slices.
mkdirSync(OUT, { recursive: true });
const slices = [
  ['top', 0, CUT_TOP],
  ['mid', CUT_TOP, CUT_BOTTOM],
  ['bottom', CUT_BOTTOM, H],
];
let total = 0;
for (const [name, y0, y1] of slices) {
  const file = join(OUT, `shell-${name}.webp`);
  await sharp(out, raw)
    .extract({ left: 0, top: y0, width: W, height: y1 - y0 })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(file);
  const size = statSync(file).size;
  total += size;
  console.log(`shell-${name}.webp  ${W}x${y1 - y0}  ${(size / 1024).toFixed(1)} KB`);
}
console.log(`total ${(total / 1024).toFixed(1)} KB`);

// 6. Debug composites (full size, unsliced).
mkdirSync(DEBUG, { recursive: true });
for (const [name, bgc] of [
  ['magenta', { r: 255, g: 0, b: 255 }],
  ['sky', { r: 168, g: 214, b: 240 }],
]) {
  await sharp(out, raw)
    .flatten({ background: bgc })
    .png()
    .toFile(join(DEBUG, `shell-over-${name}.png`));
}
console.log(`debug images: ${DEBUG}`);
