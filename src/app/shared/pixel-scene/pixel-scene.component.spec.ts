import { TestBed } from '@angular/core/testing';
import { PixelScene } from './pixel-scene.component';
import { carX, cloudX, drawCabin, drawCabinDetails, pixelScale, sceneSize } from './scene';
import { BAYER, PAL, dither, hash } from './sprites';

type MqListener = (e: { matches: boolean }) => void;

describe('PixelScene', () => {
  let reduce: boolean;
  let hidden: boolean;
  let mqListeners: MqListener[];
  let rafSpy: ReturnType<typeof vi.fn>;
  let cancelSpy: ReturnType<typeof vi.fn>;
  let ctx: { fillRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    reduce = false;
    hidden = false;
    mqListeners = [];
    ctx = { fillRect: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ctx as unknown as CanvasRenderingContext2D,
    );
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduce;
      },
      addEventListener: (_: string, l: MqListener) => mqListeners.push(l),
      removeEventListener: (_: string, l: MqListener) => {
        mqListeners = mqListeners.filter((x) => x !== l);
      },
    }));
    let id = 0;
    rafSpy = vi.fn(() => ++id);
    cancelSpy = vi.fn();
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Frame requests made by the scene loop (Angular's own scheduler may also use rAF). */
  const loopCalls = () =>
    rafSpy.mock.calls.filter(([cb]) => (cb as { name: string }).name === 'loop');

  async function create() {
    const fixture = TestBed.createComponent(PixelScene);
    await fixture.whenStable();
    return fixture;
  }

  it('creates a decorative canvas', async () => {
    const fixture = await create();
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a frame and starts the loop', async () => {
    await create();
    expect(loopCalls()).toHaveLength(1);
    (loopCalls()[0][0] as (now: number) => void)(performance.now() + 1000);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('draws one static frame and no loop under reduced motion', async () => {
    reduce = true;
    await create();
    expect(ctx.drawImage).toHaveBeenCalled();
    expect(loopCalls()).toHaveLength(0);
  });

  it('reacts to reduced-motion changes', async () => {
    await create();
    rafSpy.mockClear();
    reduce = true;
    mqListeners.forEach((l) => l({ matches: true }));
    expect(cancelSpy).toHaveBeenCalled();
    expect(loopCalls()).toHaveLength(0);
    mqListeners.forEach((l) => l({ matches: false }));
    expect(loopCalls()).toHaveLength(1);
  });

  it('pauses when hidden and resumes when visible', async () => {
    await create();
    cancelSpy.mockClear();
    rafSpy.mockClear();
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cancelSpy).toHaveBeenCalled();
    expect(loopCalls()).toHaveLength(0);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loopCalls()).toHaveLength(1);
  });

  it('cancels the frame and removes listeners on destroy', async () => {
    const fixture = await create();
    cancelSpy.mockClear();
    fixture.destroy();
    expect(cancelSpy).toHaveBeenCalled();
    expect(mqListeners).toHaveLength(0);
    rafSpy.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loopCalls()).toHaveLength(0);
  });
});

describe('scene helpers', () => {
  it('picks the pixel scale by breakpoint', () => {
    expect(pixelScale(360)).toBe(3);
    expect(pixelScale(1440)).toBe(4.5);
  });

  it('sizes the canvas from the host and caps it', () => {
    expect(sceneSize(1440, 900)).toEqual({ w: 320, h: 200 });
    expect(sceneSize(360, 400)).toEqual({ w: 120, h: 134 });
  });

  it('places clouds at their start and wraps them', () => {
    expect(cloudX(0.08, 1.6, 100, 26, 0)).toBeCloseTo(8 - 26);
    const x = cloudX(0.5, 4, 100, 20, 1000);
    expect(x).toBeGreaterThanOrEqual(-20);
    expect(x).toBeLessThan(112);
  });

  it('never shows the car at t = 0 and only for 7 s of 18', () => {
    expect(carX(320, 0)).toBeNull();
    expect(carX(320, 1)).not.toBeNull();
    expect(carX(320, 10)).toBeNull();
    expect(carX(320, 19)).not.toBeNull();
  });

  it('hashes deterministically in [0, 1] and dithers by the Bayer matrix', () => {
    expect(hash(3, 4)).toBe(hash(3, 4));
    expect(hash(3, 4)).toBeGreaterThanOrEqual(0);
    expect(hash(3, 4)).toBeLessThanOrEqual(1);
    expect(BAYER).toHaveLength(4);
    expect(dither(0, 0, 'a', 'b', 0)).toBe('a');
    expect(dither(0, 0, 'a', 'b', 1)).toBe('b');
  });

  describe('cabin', () => {
    const fakeCtx = () => {
      const fills: { x: number; y: number; w: number; h: number; col: string }[] = [];
      let fillStyle = '';
      const c = {
        set fillStyle(v: string) {
          fillStyle = v;
        },
        get fillStyle() {
          return fillStyle;
        },
        fillRect: (x: number, y: number, w: number, h: number) =>
          fills.push({ x, y, w, h, col: fillStyle }),
      };
      return { c: c as unknown as CanvasRenderingContext2D, fills };
    };

    it('draws the interior and returns anchors inside the canvas', () => {
      const { c, fills } = fakeCtx();
      const m = drawCabin(c, 120, 134);
      expect(fills.length).toBeGreaterThan(1000);
      expect(fills.some((f) => f.col === PAL.chrome)).toBe(true);
      expect(m.fx).toBe(Math.round(120 * 0.64));
      for (const v of [m.fx, m.cx, m.lx]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(120);
      }
      for (const v of [m.fy, m.cy, m.ly]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(134);
      }
    });

    it('is deterministic and survives the largest scene size', () => {
      const a = fakeCtx();
      const b = fakeCtx();
      expect(drawCabin(a.c, 320, 200)).toEqual(drawCabin(b.c, 320, 200));
      expect(a.fills).toEqual(b.fills);
    });

    it('blinks the cluster lamp and the console LED in opposite phase', () => {
      const m = drawCabin(fakeCtx().c, 120, 134);
      const lamp = (t: number) => {
        const { c, fills } = fakeCtx();
        drawCabinDetails(c, 120, 134, t, m);
        const at = (x: number, y: number) => fills.find((f) => f.x === x && f.y === y)?.col;
        return { amber: at(m.cx, m.cy), led: at(m.lx, m.ly) };
      };
      expect(lamp(0)).toEqual({ amber: PAL.amber, led: PAL.cab[2] });
      expect(lamp(1.5)).toEqual({ amber: PAL.cab[2], led: PAL.car.r });
      expect(lamp(2.5).amber).toBe(PAL.amber);
    });
  });
});
