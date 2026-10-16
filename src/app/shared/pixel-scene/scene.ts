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

export interface CabinMetrics {
  /** Air freshener string anchor, hanging from the visor. */
  fx: number;
  fy: number;
  /** Cluster warning lights origin. */
  cx: number;
  cy: number;
  /** Console LED origin. */
  lx: number;
  ly: number;
}

/**
 * Truck cabin interior, driver's seat, left-hand drive (docs/design/components/pixel-scene.md 4a).
 * Static layer, drawn once; sized from H (pillar, mirrors, visor, dashboard) or min(W, H) (wheel, dials).
 */
export function drawCabin(c: Ctx, W: number, H: number): CabinMetrics {
  const C = PAL.cab;
  const U = Math.min(W, H);
  const rect = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  const dth = dither;
  const line = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      rect(
        Math.round(x0 + ((x1 - x0) * i) / n - w / 2),
        Math.round(y0 + ((y1 - y0) * i) / n - w / 2),
        w,
        w,
        col,
      );
    }
  };
  const dashTop = Math.round(H * 0.77);
  const visor = (x: number) => Math.round(H * 0.05 + H * 0.015 * Math.sin((Math.PI * x) / W));
  const pw0 = Math.max(8, Math.round(Math.min(H * 0.09, W * 0.16)));
  const pwL = (y: number) => Math.max(4, Math.round(pw0 * (1 - 0.45 * Math.min(1, y / dashTop))));
  const pwR = (y: number) => Math.max(3, Math.round(pwL(y) * 0.55));

  // 1. sun-visor / roof band
  for (let x = 0; x < W; x++) {
    const v = visor(x);
    for (let y = 0; y < v; y++) px(c, x, y, dth(x, y, C[0], C[1], 0.3));
    px(c, x, v, C[3]);
    px(c, x, v + 1, C[2]);
  }
  rect(Math.round(W * 0.5) - 5, 2, 10, 2, C[3]);

  // 2. A-pillars (slanted, lit inner edge)
  for (let y = 0; y < dashTop + 6; y++) {
    const pl = pwL(y);
    const pr = pwR(y);
    for (let x = 0; x < pl; x++) {
      px(c, x, y, x === pl - 1 ? C[4] : x === pl - 2 ? C[3] : dth(x, y, C[0], C[1], x / pl));
    }
    for (let x = 0; x < pr; x++) {
      px(
        c,
        W - 1 - x,
        y,
        x === pr - 1 ? C[4] : x === pr - 2 ? C[3] : dth(x, y, C[0], C[1], x / pr),
      );
    }
  }

  // 3. side mirrors on arms, with a dithered sky + road reflection
  const mirror = (x: number, y: number, w: number, h: number, hz: number) => {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        if ((xx === 0 || xx === w - 1) && (yy === 0 || yy === h - 1)) continue;
        px(c, x + xx, y + yy, yy === 0 ? C[3] : xx === 0 ? C[2] : C[0]);
      }
    }
    const gw = w - 2;
    const gh = h - 2;
    const roadTop = Math.round(gh * (hz + 0.2));
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        if ((gx === 0 || gx === gw - 1) && (gy === 0 || gy === gh - 1)) continue;
        const X = x + 1 + gx;
        const Y = y + 1 + gy;
        const f = gy / gh;
        let col: string;
        if (f < hz) col = dth(X, Y, PAL.sky[2], PAL.sky[4], f / hz);
        else if (f < hz + 0.06) col = PAL.hillMid[1];
        else if (f < hz + 0.2)
          col = dth(X, Y, PAL.meadow[2], PAL.meadow[3], (f - hz - 0.06) / 0.14);
        else {
          const rr = gy - roadTop;
          col =
            gy === roadTop
              ? PAL.curb
              : ((rr >> 1) & 1) === 0 && gx === Math.round(gw * 0.3 + rr * 0.4)
                ? PAL.line
                : hash(X, Y) < 0.2
                  ? PAL.asphalt[1]
                  : PAL.asphalt[0];
        }
        px(c, X, Y, col);
      }
    }
  };
  const mh1 = Math.min(Math.round(H * 0.17), Math.round(W * 0.35));
  const mw = Math.round(mh1 * 0.46);
  const my1 = Math.round(H * 0.1);
  const mh2 = Math.round(mh1 * 0.5);
  const my2 = my1 + mh1 + 3;
  const mx = pwL(my1 + (mh1 >> 1)) + 3;
  [my1 + 4, my1 + mh1 - 6, my2 + 3, my2 + mh2 - 5].forEach((ay) => {
    const x0 = pwL(ay) - 1;
    rect(x0, ay, mx + 1 - x0, 2, C[0]);
    px(c, x0, ay, C[3]);
  });
  mirror(mx, my1, mw, mh1, 0.5);
  mirror(mx, my2, mw, mh2, 0.42);

  // 4. dashboard: bowed top, shaded downwards
  for (let x = 0; x < W; x++) {
    const top = Math.round(dashTop - H * 0.012 * Math.sin((Math.PI * x) / W));
    for (let y = top; y < H; y++) {
      const d = y - top;
      const t = d / Math.max(1, H - top);
      px(
        c,
        x,
        y,
        d === 0
          ? C[4]
          : d <= 2
            ? C[3]
            : t < 0.35
              ? dth(x, y, C[2], C[1], t / 0.35)
              : dth(x, y, C[1], C[0], (t - 0.35) / 0.65),
      );
    }
  }

  // 5. gauge cluster (hood, two dials, small display), left of centre
  const R = Math.round(U * 0.27);
  const ry = Math.round(R * 0.78);
  const wx = Math.round(W * 0.3);
  const wy = dashTop + Math.round(ry * 0.62);
  const gr = Math.max(5, Math.round(R * 0.22));
  const dist = Math.round(R * 0.45);
  const dcy = dashTop + 4 + gr;
  const hw = dist + gr + 4;
  const hTop = dashTop - 3;
  const hBot = dcy + gr + 3;
  for (let y = hTop; y <= hBot; y++) {
    const r = y - hTop;
    const inset = r === 0 ? 3 : r === 1 ? 1 : 0;
    for (let x = wx - hw + inset; x <= wx + hw - inset; x++) {
      px(c, x, y, r === 0 ? C[3] : x < wx - hw + 2 || x > wx + hw - 2 ? C[1] : C[0]);
    }
  }
  const dial = (cx: number, cy: number, f: number, ncol: string) => {
    for (let dy = -gr; dy <= gr; dy++) {
      for (let dx = -gr; dx <= gr; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= gr + 0.3) {
          px(c, cx + dx, cy + dy, d > gr - 1.1 ? C[3] : dth(cx + dx, cy + dy, C[1], C[2], 0.25));
        }
      }
    }
    for (let k = 0; k <= 8; k++) {
      const a = ((135 + (270 * k) / 8) * Math.PI) / 180;
      px(
        c,
        Math.round(cx + Math.cos(a) * (gr - 2)),
        Math.round(cy + Math.sin(a) * (gr - 2)),
        k >= 7 ? PAL.car.r : C[4],
      );
    }
    const a = ((135 + 270 * f) * Math.PI) / 180;
    for (let s = 1; s <= gr - 2; s++) {
      px(c, Math.round(cx + Math.cos(a) * s), Math.round(cy + Math.sin(a) * s), ncol);
    }
    px(c, cx, cy, C[4]);
  };
  dial(wx - dist, dcy, 0.45, PAL.line);
  dial(wx + dist, dcy, 0.6, PAL.amber);
  const dw = Math.min(14, Math.max(6, 2 * (dist - gr) - 5));
  const dx0 = wx - (dw >> 1);
  const dy0 = dcy - 3;
  rect(dx0, dy0, dw, 5, C[3]);
  rect(dx0 + 1, dy0 + 1, dw - 2, 3, C[0]);
  for (let i = 0; i < dw - 3; i++) if (i % 3 !== 2) px(c, dx0 + 2 + i, dy0 + 2, PAL.lit);

  // 6. steering wheel (rim, three spokes, hub with badge), in front of the gauges
  const rt = Math.max(3, Math.round(R * 0.12));
  const rin = R - rt;
  const ryin = ry - rt;
  for (let y = wy - ry; y <= Math.min(H - 1, wy + ry); y++) {
    for (let x = wx - R; x <= wx + R; x++) {
      const ux = x + 0.5 - wx;
      const uy = y + 0.5 - wy;
      const o = (ux / R) ** 2 + (uy / ry) ** 2;
      const i = (ux / rin) ** 2 + (uy / ryin) ** 2;
      if (o > 1 || i < 1) continue;
      const lit = ux + uy < 0;
      px(
        c,
        x,
        y,
        o > (1 - 1.5 / R) ** 2
          ? lit
            ? C[4]
            : C[2]
          : i < (1 + 1.6 / rin) ** 2
            ? C[2]
            : dth(x, y, C[0], C[1], lit ? 0.55 : 0.15),
      );
    }
  }
  const sw = Math.max(3, Math.round(R * 0.1));
  const sy = wy + Math.round(ry * 0.22);
  const spokes: readonly (readonly [number, number])[] = [
    [wx - rin + 1, sy],
    [wx + rin - 1, sy],
    [wx, wy + ryin],
  ];
  for (const [ex, ey] of spokes) {
    line(wx, wy - 1, ex, ey - 1, sw, C[3]);
    line(wx, wy, ex, ey, sw, C[1]);
  }
  const hr = Math.max(5, Math.round(R * 0.24));
  for (let dy = -hr; dy <= hr; dy++) {
    for (let dx = -hr; dx <= hr; dx++) {
      const d = Math.hypot(dx, dy);
      if (d <= hr + 0.3) {
        px(
          c,
          wx + dx,
          wy + dy,
          d > hr - 1.2 ? (dx + dy < 0 ? C[4] : C[2]) : dth(wx + dx, wy + dy, C[1], C[2], 0.4),
        );
      }
    }
  }
  const bs = hr >= 12 ? 5 : 3;
  rect(wx - (bs >> 1), wy - 1, bs, 3, PAL.chrome);
  px(c, wx, wy, C[2]);

  // 7. centre console, bottom right: display, LEDs, buttons, knobs, vent slots
  const cw = Math.min(60, Math.max(26, Math.round(W * 0.24)));
  const ch = 26;
  const cxs = W - cw - Math.max(6, Math.round(W * 0.05));
  const cys = dashTop + Math.round((H - dashTop) * 0.3);
  rect(cxs, cys, cw, ch, C[0]);
  rect(cxs, cys, cw, 1, C[3]);
  rect(cxs, cys + 1, 1, ch - 1, C[1]);
  rect(cxs + cw - 1, cys + 1, 1, ch - 1, C[1]);
  rect(cxs + 2, cys + 2, cw - 4, 4, C[3]);
  rect(cxs + 3, cys + 3, cw - 6, 2, C[1]);
  for (let i = 0; i < cw - 9; i++) if (i % 4 !== 3) px(c, cxs + 4 + i, cys + 3, PAL.amber);
  rect(cxs + 3, cys + 6, 2, 2, PAL.lit);
  rect(cxs + cw - 5, cys + 6, 2, 2, C[2]);
  const bw = Math.min(6, Math.floor((cw - 9) / 4));
  const bx0 = cxs + ((cw - (4 * bw + 3)) >> 1);
  for (let k = 0; k < 4; k++) {
    rect(bx0 + k * (bw + 1), cys + 10, bw, 3, C[2]);
    rect(bx0 + k * (bw + 1), cys + 10, bw, 1, C[4]);
  }
  for (const f of [0.28, 0.72]) {
    const kx = cxs + Math.round(cw * f);
    const ky = cys + 18;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= 3.2) px(c, kx + dx, ky + dy, d > 2.1 ? C[3] : C[1]);
      }
    }
    px(c, kx, ky - 2, C[4]);
  }
  rect(cxs + 4, cys + 23, cw - 8, 1, C[1]);
  rect(cxs + 4, cys + 25, cw - 8, 1, C[1]);

  const fx = Math.round(W * 0.64);
  return { fx, fy: visor(fx) + 2, cx: wx - 3, cy: dy0 - 4, lx: cxs + cw - 5, ly: cys + 6 };
}

/** Animated air freshener, cluster warning lights and console LED, drawn over the cabin layer. */
export function drawCabinDetails(c: Ctx, W: number, H: number, t: number, m: CabinMetrics): void {
  void W;
  void H;
  const C = PAL.cab;
  const sw = Math.round(Math.sin(t * 1.9) * 2);
  const len = 9;
  c.fillStyle = PAL.string;
  for (let i = 0; i < len; i++) c.fillRect(m.fx + Math.round((sw * i) / len), m.fy + i, 1, 1);
  drawPine(c, m.fx + sw, m.fy + len + 8, 8, 0, 0, 0, PAL.fresh);
  // amber blinks 1 s on / 1 s off (on in the static frame), green steady
  c.fillStyle = t === 0 || Math.floor(t) % 2 === 0 ? PAL.amber : C[2];
  c.fillRect(m.cx, m.cy, 2, 2);
  c.fillStyle = PAL.lit;
  c.fillRect(m.cx + 5, m.cy, 2, 2);
  // console LED, opposite phase (off in the static frame)
  c.fillStyle = t > 0 && Math.floor(t) % 2 === 1 ? PAL.car.r : C[2];
  c.fillRect(m.lx, m.ly, 2, 2);
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
  const anchors = drawCabin(cabin.c, W, H);

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
    drawCabinDetails(ctx, W, H, t, anchors);
  };

  return { W, H, render };
}
