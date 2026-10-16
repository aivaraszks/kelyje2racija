/** Palette, dither matrix, sprites and tree/cloud generators for the pixel scene (plan D13). */

export const PAL = {
  sky: ['#27496b', '#3b6a8f', '#5e93af', '#8fb9c4', '#c7d9c9', '#f0dfb4'],
  sun: '#fff0bd',
  halo: '#f8e7b0',
  cloudW: '#f6eeda',
  cloudS: '#cbd3cc',
  hillFar: ['#86a3ad', '#7c9aa6'],
  hillMid: ['#7a9a96', '#5a7c74'],
  forest: { d: '#27413a', l: '#2f4f43', h: '#3e6350' },
  meadow: ['#7d9c5d', '#6c8f4e', '#5d7f43', '#4f6f3a'],
  flower: '#e8d77a',
  asphalt: ['#4a4f55', '#41464c'],
  line: '#e9e3c8',
  curb: '#b5ae9a',
  gravel: ['#8b8576', '#7a7466', '#9a9484'],
  trunk: '#4a3526',
  needle: { d: '#1f3a2d', l: '#2e5440', h: '#3d6b50' },
  cab: ['#0f1316', '#161b20', '#1e252b', '#2a323a', '#4a545e'],
  amber: '#e0a458',
  lit: '#7fd6a0',
  fresh: { d: '#2f8a4a', l: '#4fbf6b', h: '#8fe0a0' },
  string: '#c8ccd2',
  car: { r: '#c0463c', b: '#9fd0e0', k: '#1c1f23' },
  sign: { b: '#2b5fa8', w: '#f1f3f5', g: '#8b929b' },
  glassTop: '#7c9aa6',
  glassBot: '#c7d9c9',
} as const;

export const BAYER: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Deterministic integer hash of (a, b) mapped to [0, 1]. */
export function hash(a: number, b: number): number {
  let x = Math.imul((a * 374761393 + b * 668265263) | 0, 1274126177);
  x ^= x >>> 13;
  x = Math.imul(x, 1103515245);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967295;
}

/** Ordered dither: colour `b` when the Bayer threshold at (x, y) is below t, else `a`. */
export function dither(x: number, y: number, a: string, b: string, t: number): string {
  return BAYER[y & 3][x & 3] < t * 16 ? b : a;
}

export interface Sprite {
  /** One string per row; '.' is transparent, other letters key into `map`. */
  rows: readonly string[];
  map: Readonly<Record<string, string>>;
}

export const SPRITES: Record<'car' | 'sign', Sprite> = {
  car: {
    rows: ['...rrrrr...', '..rbbrbbr..', 'rrrrrrrrrrr', 'rkkrrrrrkkr', '.kk.....kk.'],
    map: { r: PAL.car.r, b: PAL.car.b, k: PAL.car.k },
  },
  sign: {
    rows: [
      'bbbbbbb',
      'bwwwwbb',
      'bwbbbwb',
      'bwwwwbb',
      'bwbbbbb',
      'bwbbbbb',
      'bbbbbbb',
      '...g...',
      '...g...',
      '...g...',
    ],
    map: { b: PAL.sign.b, w: PAL.sign.w, g: PAL.sign.g },
  },
};

/** Builds a cloud sprite from ellipse blobs [cx, cy, rx, ry]; the lower edge gets the shade colour. */
export function cloudRows(w: number, h: number, blobs: readonly number[][]): Sprite {
  const inside = (x: number, y: number) =>
    blobs.some(([cx, cy, rx, ry]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1);
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let s = '';
    for (let x = 0; x < w; x++) s += inside(x, y) ? (inside(x, y + 1) ? 'w' : 's') : '.';
    rows.push(s);
  }
  return { rows, map: { w: PAL.cloudW, s: PAL.cloudS } };
}

export interface CloudDef {
  sprite: Sprite;
  /** Start position as a fraction of the width. */
  f0: number;
  /** Height as a fraction of the horizon. */
  fy: number;
  /** Drift speed in art px per second. */
  v: number;
}

export const CLOUDS: readonly CloudDef[] = [
  {
    sprite: cloudRows(26, 8, [
      [8, 5.5, 7, 2.6],
      [14, 4, 6, 3.6],
      [19, 5.5, 6.5, 2.6],
    ]),
    f0: 0.08,
    fy: 0.12,
    v: 1.6,
  },
  {
    sprite: cloudRows(18, 6, [
      [6, 4, 5, 2],
      [11, 3, 5, 2.6],
      [14, 4, 3.6, 1.8],
    ]),
    f0: 0.55,
    fy: 0.3,
    v: 2.6,
  },
  {
    sprite: cloudRows(34, 7, [
      [8, 5, 8, 2],
      [17, 3.5, 8, 3.2],
      [26, 5, 8, 2],
    ]),
    f0: 0.8,
    fy: 0.5,
    v: 4.0,
  },
];

export interface TreePalette {
  d: string;
  l: string;
  h: string;
}

/** Draws a sprite as horizontal runs of fillRect. */
export function drawSprite(c: CanvasRenderingContext2D, s: Sprite, x: number, y: number): void {
  s.rows.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const ch = row[i];
      if (ch === '.') {
        i++;
        continue;
      }
      let k = i;
      while (k < row.length && row[k] === ch) k++;
      c.fillStyle = s.map[ch];
      c.fillRect(x + i, y + j, k - i, 1);
      i = k;
    }
  });
}

/** Tiered fir drawn row by row; the tip sways by sin(t * 1.5 + phase) * amp, weighted by height squared. */
export function drawPine(
  c: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  h: number,
  t: number,
  phase: number,
  amp: number,
  pal: TreePalette,
): void {
  for (let r = 0; r < h; r++) {
    const half = Math.floor(r * 0.42) + (r % 4 === 3 ? 1 : 0);
    const k = (h - 1 - r) / Math.max(1, h - 1);
    const off = amp ? Math.round(Math.sin(t * 1.5 + phase) * amp * k * k) : 0;
    const y = baseY - h + r;
    const x0 = cx + off;
    c.fillStyle = pal.d;
    c.fillRect(x0 - half, y, half + 1, 1);
    c.fillStyle = pal.l;
    c.fillRect(x0 + 1, y, half, 1);
    if (half > 2 && (r * 7 + cx) % 5 === 0) {
      c.fillStyle = pal.h;
      c.fillRect(x0 + half - 1, y, 1, 1);
    }
  }
}
