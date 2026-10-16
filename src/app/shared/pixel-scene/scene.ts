import { BAYER, CLOUDS, PAL, SPRITES, dither, drawPine, drawSprite, hash } from './sprites';

type Ctx = CanvasRenderingContext2D;

export interface Scene {
  W: number;
  H: number;
  /** Draws one frame at time t (seconds). t = 0 is the static, reduced-motion frame. */
  render(t: number): void;
}

/** Logical pixel size (CSS px per art pixel): 3 below the sm breakpoint, 4.5 from it. */
export function pixelScale(viewportWidth: number): number {
  return viewportWidth < 640 ? 3 : 4.5;
}

/** Logical canvas size for a host size, capped at 320 x 200. */
export function sceneSize(width: number, height: number): { w: number; h: number } {
  const p = pixelScale(width);
  return {
    w: Math.min(320, Math.max(1, Math.ceil(width / p))),
    h: Math.min(200, Math.max(1, Math.ceil(height / p))),
  };
}

interface Geometry {
  W: number;
  H: number;
  hy: number;
  my0: number;
  rTop: number;
  rBot: number;
  dTop: number;
  /** Roof header thickness at column x. */
  headerAt(x: number): number;
}

function geometry(W: number, H: number): Geometry {
  const hy = Math.round(H * 0.47);
  return {
    W,
    H,
    hy,
    my0: hy + Math.round(H * 0.025),
    rTop: Math.round(H * 0.6),
    rBot: Math.round(H * 0.69),
    dTop: Math.round(H * 0.8),
    headerAt: (x) => Math.round(H * 0.04 + H * 0.06 * Math.pow(Math.abs(x - W / 2) / (W / 2), 3)),
  };
}

const px = (c: Ctx, x: number, y: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, 1, 1);
};

export function drawSky(c: Ctx, g: Geometry): void {
  const { W, H, hy } = g;
  const S = PAL.sky;
  const sx = Math.round(W * 0.3);
  const sy = hy - Math.round(H * 0.035);
  const sr = Math.max(4, Math.round(Math.min(W, H) * 0.045));
  const hr = sr * 3;
  for (let y = 0; y < hy + 4; y++) {
    const u = (Math.min(y, hy) / hy) * (S.length - 1);
    const i = Math.min(S.length - 2, Math.floor(u));
    const f = u - i;
    for (let x = 0; x < W; x++) {
      let col = dither(x, y, S[i], S[i + 1], f);
      const d = Math.hypot(x - sx, y - sy);
      if (d <= sr) col = PAL.sun;
      else if (d < hr && BAYER[y & 3][x & 3] < (1 - (d - sr) / (hr - sr)) * 0.6 * 16)
        col = PAL.halo;
      px(c, x, y, col);
    }
  }
}

export function drawGround(c: Ctx, g: Geometry): void {
  const { W, H, hy, my0, rTop, rBot, dTop } = g;
  for (let x = 0; x < W; x++) {
    const top =
      hy -
      Math.round(
        H * 0.075 + H * 0.035 * Math.sin(x * 0.045 + 1.2) + H * 0.02 * Math.sin(x * 0.11 + 0.4),
      );
    for (let y = top; y <= my0 + 2; y++) {
      if (y === top && x & 1) continue;
      px(c, x, y, PAL.hillFar[y - top < 3 ? 0 : 1]);
    }
  }
  for (let x = 0; x < W; x++) {
    const top =
      hy -
      Math.round(H * 0.03 + H * 0.025 * Math.sin(x * 0.07 + 3) + H * 0.012 * Math.sin(x * 0.19));
    for (let y = top; y <= my0 + 2; y++) {
      if (y === top && !(x & 1)) continue;
      px(c, x, y, PAL.hillMid[y - top < 2 ? 0 : 1]);
    }
  }
  for (let y = my0; y < rTop; y++) {
    const f = ((y - my0) / (rTop - my0)) * (PAL.meadow.length - 1);
    const i = Math.min(PAL.meadow.length - 2, Math.floor(f));
    for (let x = 0; x < W; x++) {
      px(c, x, y, dither(x, y, PAL.meadow[i], PAL.meadow[i + 1], f - i));
      if (y > (my0 + rTop) / 2 && hash(x, y) < 0.012) px(c, x, y, PAL.flower);
    }
  }
  const mid = Math.round((rTop + rBot) / 2);
  for (let y = rTop; y <= rBot; y++) {
    for (let x = 0; x < W; x++) {
      let col: string = hash(x, y) < 0.2 ? PAL.asphalt[1] : PAL.asphalt[0];
      if (y === rTop || y === rBot) col = PAL.curb;
      else if (y === mid && ((x >> 3) & 1) === 0) col = PAL.line;
      px(c, x, y, col);
    }
  }
  for (let y = rBot + 1; y < dTop + 4; y++) {
    for (let x = 0; x < W; x++) {
      const r = hash(x, y + 7);
      const col =
        y === rBot + 1
          ? PAL.curb
          : r < 0.2
            ? PAL.gravel[1]
            : r > 0.86
              ? PAL.gravel[2]
              : PAL.gravel[0];
      px(c, x, y, col);
    }
  }
  drawSprite(c, SPRITES.sign, Math.round(W * 0.8), rBot + Math.round((dTop - rBot) * 0.6) - 10);
}

export interface CabinAnchors {
  /** Air freshener string anchor under the mirror. */
  fx: number;
  fy: number;
  /** Gauge dots origin. */
  cx: number;
  cy: number;
}

export function drawCabin(c: Ctx, g: Geometry): CabinAnchors {
  const { W, H, dTop, headerAt } = g;
  const C = PAL.cab;
  for (let x = 0; x < W; x++) {
    const t = headerAt(x);
    for (let y = 0; y < t; y++) px(c, x, y, dither(x, y, C[0], C[1], 0.3));
    px(c, x, t, C[3]);
    px(c, x, t + 1, C[2]);
  }
  for (let y = 0; y < dTop + 6; y++) {
    const pl = Math.round(W * (0.105 - 0.06 * Math.min(1, y / dTop)));
    for (let x = 0; x < pl; x++) {
      const col = x === pl - 1 ? C[4] : x === pl - 2 ? C[3] : dither(x, y, C[0], C[1], x / pl);
      px(c, x, y, col);
      px(c, W - 1 - x, y, col);
    }
  }
  for (let x = 0; x < W; x++) {
    const top = Math.round(dTop - H * 0.012 * Math.sin((Math.PI * x) / W));
    for (let y = top; y < H; y++) {
      const d = y - top;
      const t = d / Math.max(1, H - top);
      const col =
        d === 0
          ? C[4]
          : d <= 2
            ? C[3]
            : t < 0.35
              ? dither(x, y, C[2], C[1], t / 0.35)
              : dither(x, y, C[1], C[0], (t - 0.35) / 0.65);
      px(c, x, y, col);
    }
  }
  // instrument cluster and vents
  const cx0 = Math.round(W * 0.1);
  const cy0 = dTop + 3;
  c.fillStyle = C[0];
  c.fillRect(cx0, cy0, 16, 6);
  c.fillStyle = C[3];
  c.fillRect(cx0, cy0, 16, 1);
  for (const f of [0.22, 0.78]) {
    const vx = Math.round(W * f);
    for (let k = 0; k < 3; k++) {
      c.fillStyle = C[0];
      c.fillRect(vx, dTop + 4 + k * 2, 9, 1);
    }
  }
  // rear-view mirror
  const mw = Math.max(18, Math.round(W * 0.09));
  const mh = Math.round(mw * 0.36) + 2;
  const mx = Math.round(W * 0.6);
  const my = headerAt(mx) + 3;
  c.fillStyle = C[0];
  c.fillRect(mx + (mw >> 1) - 1, headerAt(mx) - 1, 2, 5);
  c.fillRect(mx + 1, my, mw - 2, mh);
  c.fillRect(mx, my + 1, mw, mh - 2);
  for (let y = my + 1; y < my + mh - 1; y++) {
    for (let x = mx + 1; x < mx + mw - 1; x++) {
      px(c, x, y, dither(x, y, PAL.glassTop, PAL.glassBot, (y - my) / mh));
    }
  }
  c.fillStyle = C[4];
  c.fillRect(mx + 2, my + 1, 3, 1);
  return { fx: mx + 3, fy: my + mh, cx: cx0 + 3, cy: cy0 + 3 };
}

/** Animated air freshener and gauge dots, drawn over the cabin layer. */
export function drawCabinDetails(c: Ctx, m: CabinAnchors, t: number): void {
  const sw = Math.round(Math.sin(t * 1.9) * 2);
  const len = 9;
  c.fillStyle = PAL.string;
  for (let i = 0; i < len; i++) c.fillRect(m.fx + Math.round((sw * i) / len), m.fy + i, 1, 1);
  drawPine(c, m.fx + sw, m.fy + len + 8, 8, 0, 0, 0, PAL.fresh);
  c.fillStyle = t === 0 || Math.floor(t) % 2 === 0 ? PAL.amber : PAL.cab[2];
  c.fillRect(m.cx, m.cy, 2, 2);
  c.fillStyle = PAL.lit;
  c.fillRect(m.cx + 5, m.cy, 2, 2);
}

/** Left edge of a cloud at time t, wrapping around the screen. */
export function cloudX(f0: number, v: number, W: number, w: number, t: number): number {
  const span = W + w + 12;
  return ((((f0 * W + v * t) % span) + span) % span) - w;
}

/** The car crosses right to left for 7 s every 18 s, never at t = 0; null when off-screen. */
export function carX(W: number, t: number): number | null {
  const tc = t % 18;
  return t > 0 && tc < 7 ? Math.round(W + 14 - (tc * (W + 28)) / 7) : null;
}

/** Builds the cached layers for a host size; null when the canvas has no 2D context. */
export function createScene(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Scene | null {
  const { w: W, h: H } = sceneSize(width, height);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const layer = (): { el: HTMLCanvasElement; c: Ctx } | null => {
    const el = document.createElement('canvas');
    el.width = W;
    el.height = H;
    const c = el.getContext('2d');
    return c ? { el, c } : null;
  };
  const sky = layer();
  const ground = layer();
  const cabin = layer();
  if (!sky || !ground || !cabin) return null;

  const g = geometry(W, H);
  const hs = Math.max(1, H / 200);
  drawSky(sky.c, g);
  drawGround(ground.c, g);
  const anchors = drawCabin(cabin.c, g);

  const lane = g.rBot - 6;
  const forestN = Math.ceil(W / 5);
  const nearTrees = [
    { x: 0.27, h: 0.24, base: g.rTop + 1, ph: 1.1, amp: 1.2 },
    { x: 0.72, h: 0.22, base: g.rTop + 1, ph: 2.4, amp: 1.2 },
    { x: 0.15, h: 0.36, base: g.rBot + 4, ph: 0, amp: 2.4 },
    { x: 0.87, h: 0.33, base: g.rBot + 5, ph: 2, amp: 2.2 },
  ];

  const render = (t: number): void => {
    ctx.drawImage(sky.el, 0, 0);
    for (const cl of CLOUDS) {
      const cw = cl.sprite.rows[0].length;
      drawSprite(
        ctx,
        cl.sprite,
        Math.round(cloudX(cl.f0, cl.v, W, cw, t)),
        Math.round(g.hy * cl.fy),
      );
    }
    ctx.drawImage(ground.el, 0, 0);
    for (let i = 0; i < forestN; i++) {
      const x = i * 5 + Math.floor(hash(i, 1) * 3);
      const h = Math.round((7 + hash(i, 2) * 8) * hs);
      drawPine(ctx, x, g.my0 + 1, h, t, hash(i, 3) * 6, 0.8, PAL.forest);
    }
    const cx = carX(W, t);
    if (cx !== null) drawSprite(ctx, SPRITES.car, cx, lane);
    for (const n of nearTrees) {
      const h = Math.round(n.h * H);
      const x = Math.round(n.x * W);
      ctx.fillStyle = PAL.trunk;
      ctx.fillRect(x, n.base - 3, 2, 3);
      drawPine(ctx, x, n.base - 3, h, t, n.ph, n.amp, PAL.needle);
    }
    ctx.drawImage(cabin.el, 0, 0);
    drawCabinDetails(ctx, anchors, t);
  };

  return { W, H, render };
}
