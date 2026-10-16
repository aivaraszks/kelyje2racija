import { TestBed } from '@angular/core/testing';
import { PixelScene } from './pixel-scene.component';
import { carX, cloudX, pixelScale, sceneSize } from './scene';
import { BAYER, dither, hash } from './sprites';

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
});
