import { TestBed } from '@angular/core/testing';
import { SOUND_CATALOG, soundLabel } from '../../core/sounds/sound-catalog';
import { SoundCatalogService } from '../../core/sounds/sound-catalog.service';
import { COUNTER_TIMEOUT_MS } from '../../core/counter/counter.service';
import { TTS_ENGINE_LOADER, TTS_MODEL_PROBE } from '../../core/tts/tts.service';
import { Radio } from './radio.component';

/**
 * Radio wired to the REAL AudioPlayerService, ShareService, CounterService and catalog.
 * Only the browser edges are faked: Audio, fetch, navigator.share/canShare, URL.createObjectURL.
 */

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = '';
  currentTime = 0;
  preload = '';
  private listeners = new Map<string, (() => void)[]>();
  constructor() {
    FakeAudio.instances.push(this);
  }
  addEventListener(type: string, fn: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  emit(type: string): void {
    this.listeners.get(type)?.forEach((fn) => fn());
  }
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
}

type CounterMode = 'ok' | 'http-error' | 'network-error' | 'hang';

describe('Radio (real services, faked browser edges)', () => {
  let counterMode: CounterMode;
  let soundFetchOk: boolean;
  let fetchCalls: string[];
  let shareImpl: ReturnType<typeof vi.fn>;
  let canShareImpl: ReturnType<typeof vi.fn> | undefined;
  let clickedDownloads: string[];
  let engine: { synthesize: ReturnType<typeof vi.fn> };
  const nav = navigator as unknown as Record<string, unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    FakeAudio.instances = [];
    counterMode = 'ok';
    soundFetchOk = true;
    fetchCalls = [];
    clickedDownloads = [];
    shareImpl = vi.fn(() => Promise.resolve());
    canShareImpl = vi.fn(() => true);

    engine = {
      synthesize: vi.fn(() => Promise.resolve(new Blob(['RIFFwav'], { type: 'audio/wav' }))),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TTS_ENGINE_LOADER,
          useValue: () =>
            Promise.resolve({
              loadEngine: (onProgress?: (p: unknown) => void) => {
                onProgress?.({ phase: 'model', loaded: 71_032_571, total: 71_032_571 });
                return Promise.resolve(engine);
              },
            }),
        },
        { provide: TTS_MODEL_PROBE, useValue: () => Promise.resolve(false) },
      ],
    });

    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: { signal?: AbortSignal }) => {
        fetchCalls.push(url);
        if (url.includes('countapi')) {
          if (counterMode === 'network-error') return Promise.reject(new TypeError('offline'));
          if (counterMode === 'hang') {
            return new Promise((_, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('aborted', 'AbortError')),
              );
            });
          }
          if (counterMode === 'http-error') {
            return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
          }
          const value = url.includes('plays') ? '100' : '7';
          const bump = url.includes('/hit/') ? 1 : 0;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ value: String(Number(value) + bump) }),
          });
        }
        if (!soundFetchOk) return Promise.reject(new TypeError('offline'));
        return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
      }),
    );
    Object.defineProperty(nav, 'share', { value: shareImpl, configurable: true });
    Object.defineProperty(nav, 'canShare', { value: canShareImpl, configurable: true });
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedDownloads.push(this.download);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete nav['share'];
    delete nav['canShare'];
  });

  async function setup() {
    const fixture = TestBed.createComponent(Radio);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(root.querySelectorAll<HTMLElement>('[role=option]'));
    const rowTexts = () => rows().map((r) => r.textContent?.trim());
    const [pill, share] = Array.from(root.querySelectorAll<HTMLButtonElement>('.skey'));
    const settle = async (ms = 0) => {
      await vi.advanceTimersByTimeAsync(ms);
      fixture.detectChanges();
    };
    const live = () => root.querySelector('[role=status]')?.textContent?.trim();
    const toast = () => root.querySelector('.toast')?.textContent?.trim();
    const nums = () => Array.from(root.querySelectorAll('.num')).map((n) => n.textContent);
    const segment = (i: number) => root.querySelectorAll<HTMLButtonElement>('.seg button')[i];
    const type = async (value: string) => {
      const input = root.querySelector('input')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await settle();
    };
    const catalog = TestBed.inject(SoundCatalogService);
    return {
      fixture,
      root,
      rows,
      rowTexts,
      pill,
      share,
      settle,
      live,
      toast,
      nums,
      segment,
      type,
      catalog,
    };
  }

  const nezinoma = SOUND_CATALOG.filter((s) => s.voice === 'nezinoma').map((s) => soundLabel(s));

  describe('voice filter', () => {
    it('lists nezinoma clips under both voices, and each voice only its own', async () => {
      const ctx = await setup();
      const vyras = SOUND_CATALOG.filter((s) => s.voice !== 'moteris').map((s) => soundLabel(s));
      const moteris = SOUND_CATALOG.filter((s) => s.voice !== 'vyras').map((s) => soundLabel(s));
      expect(nezinoma.length).toBeGreaterThan(0);
      expect(ctx.rowTexts()).toEqual(vyras);
      ctx.segment(1).click();
      await ctx.settle();
      expect(ctx.rowTexts()).toEqual(moteris);
      for (const label of nezinoma) {
        expect(ctx.rowTexts()).toContain(label);
      }
      ctx.segment(0).click();
      await ctx.settle();
      expect(ctx.rowTexts()).toEqual(vyras);
    });

    it('a selected nezinoma clip stays selected across a voice switch, without playing', async () => {
      const ctx = await setup();
      const index = ctx.rowTexts().indexOf(nezinoma[0]);
      ctx.rows()[index].click();
      await ctx.settle();
      FakeAudio.instances[0].play.mockClear();
      ctx.segment(1).click();
      await ctx.settle();
      const sel = ctx.rows().filter((r) => r.getAttribute('aria-selected') === 'true');
      expect(sel.map((r) => r.textContent?.trim())).toEqual([nezinoma[0]]);
      expect(FakeAudio.instances[0].play).not.toHaveBeenCalled();
    });

    it('switching voice keeps the male/female counterpart selected, stops, and does not play', async () => {
      const ctx = await setup();
      const pair = SOUND_CATALOG.find((s) => s.voice === 'vyras' && s.variant === undefined)!;
      const idx = ctx.rowTexts().indexOf(soundLabel(pair));
      ctx.rows()[idx].click();
      await ctx.settle();
      const audio = FakeAudio.instances[0];
      expect(audio.src).toBe(pair.file);
      audio.play.mockClear();
      ctx.segment(1).click();
      await ctx.settle();
      expect(audio.pause).toHaveBeenCalled();
      expect(audio.play).not.toHaveBeenCalled();
      const sel = ctx.rows().filter((r) => r.getAttribute('aria-selected') === 'true');
      expect(sel).toHaveLength(1);
      expect(sel[0].textContent?.trim()).toBe(soundLabel(pair));
      expect(ctx.share.getAttribute('aria-disabled')).toBe('false');
    });
  });

  describe('search', () => {
    it('"sansu" finds "Be šansų!" and combines with the voice filter', async () => {
      const ctx = await setup();
      await ctx.type('sansu');
      expect(ctx.rowTexts()).toContain('Be šansų!');
      expect(ctx.rowTexts().length).toBeLessThan(10);
      ctx.segment(1).click();
      await ctx.settle();
      expect(ctx.rowTexts().every((t) => t !== undefined)).toBe(true);
      for (const t of ctx.rowTexts()) {
        expect(t!.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')).toContain('sansu');
      }
    });

    it('is case-insensitive and ignores surrounding spaces', async () => {
      const ctx = await setup();
      await ctx.type('  SANSU ');
      expect(ctx.rowTexts()).toContain('Be šansų!');
    });

    it('"Nieko nerasta" empty state, then clearing restores the full list', async () => {
      const ctx = await setup();
      const full = ctx.rows().length;
      await ctx.type('qqqq');
      expect(ctx.rows()).toHaveLength(0);
      expect(ctx.root.querySelector('.empty')?.textContent).toContain('Nieko nerasta');
      await ctx.type('');
      expect(ctx.rows()).toHaveLength(full);
    });

    it('Esc clears the query, restores the list and keeps focus in the field', async () => {
      const ctx = await setup();
      const full = ctx.rows().length;
      await ctx.type('sansu');
      const input = ctx.root.querySelector('input')!;
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await ctx.settle();
      expect(document.activeElement).toBe(input);
      expect(ctx.rows()).toHaveLength(full);
    });
  });

  describe('playback', () => {
    it('a row tap plays it; a second row stops the previous clip first (one shared element)', async () => {
      const ctx = await setup();
      ctx.rows()[0].click();
      await ctx.settle();
      const audio = FakeAudio.instances[0];
      audio.emit('playing');
      await ctx.settle();
      expect(FakeAudio.instances).toHaveLength(1);
      const first = audio.src;
      const pausesBefore = audio.pause.mock.calls.length;

      ctx.rows()[1].click();
      await ctx.settle();
      expect(audio.pause.mock.calls.length).toBeGreaterThan(pausesBefore);
      expect(audio.src).not.toBe(first);
      expect(audio.play).toHaveBeenCalledTimes(2);
      expect(ctx.rows()[1].getAttribute('aria-selected')).toBe('true');
      expect(ctx.rows()[0].getAttribute('aria-selected')).toBe('false');
    });

    it('SIŲSTI with nothing selected: toast, no audio created', async () => {
      const ctx = await setup();
      ctx.share.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBe('Pirmiausia pasirinkite frazę.');
      expect(FakeAudio.instances).toHaveLength(0);
    });

    it('the clip ending leaves the row selected and not playing', async () => {
      const ctx = await setup();
      ctx.rows()[0].click();
      await ctx.settle();
      FakeAudio.instances[0].emit('playing');
      await ctx.settle();
      expect(ctx.rows()[0].classList.contains('playing')).toBe(true);
      FakeAudio.instances[0].emit('ended');
      await ctx.settle();
      expect(ctx.rows()[0].classList.contains('playing')).toBe(false);
      expect(ctx.rows()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('a rejected play() shows the playback error and does not count a play', async () => {
      const ctx = await setup();
      const hitsBefore = fetchCalls.filter((u) => u.includes('/hit/')).length;
      // The element is created lazily on the first play, so make every new one reject.
      vi.stubGlobal(
        'Audio',
        class extends FakeAudio {
          override play = vi.fn(() => Promise.reject(new DOMException('x', 'NotAllowedError')));
        },
      );
      ctx.rows()[0].click();
      await ctx.settle(50);
      expect(ctx.toast()).toBe('Nepavyko paleisti garso.');
      expect(fetchCalls.filter((u) => u.includes('/hit/')).length).toBe(hitsBefore);
    });
  });

  describe('share outcomes (real ShareService)', () => {
    async function selectedCtx() {
      const ctx = await setup();
      ctx.rows()[0].click();
      await ctx.settle();
      // Count only calls after selection (the play hit is expected).
      fetchCalls.length = 0;
      return ctx;
    }
    const shareHits = () => fetchCalls.filter((u) => u.includes('/hit/') && u.includes('shares'));

    it('shared: native share with an audio/mpeg File, counter hit, toast, SIŲSTI refocused', async () => {
      const ctx = await selectedCtx();
      ctx.share.click();
      await ctx.settle();
      expect(shareImpl).toHaveBeenCalledTimes(1);
      const arg = shareImpl.mock.calls[0][0] as { files: File[] };
      expect(arg.files[0].type).toBe('audio/mpeg');
      expect(arg.files[0].name).toMatch(/^racija-.+\.mp3$/);
      expect(shareHits()).toHaveLength(1);
      expect(ctx.toast()).toBe('Išsiųsta.');
      expect(ctx.nums()[1]).toBe('8');
      expect(document.activeElement).toBe(ctx.share);
    });

    it('shares synchronously inside the tap once the clip is prefetched (keeps the gesture)', async () => {
      const ctx = await selectedCtx();
      ctx.share.click();
      expect(shareImpl).toHaveBeenCalledTimes(1);
    });

    it('downloaded (no canShare): anchor download, counter hit, explanatory toast', async () => {
      canShareImpl!.mockReturnValue(false);
      const ctx = await selectedCtx();
      ctx.share.click();
      await ctx.settle();
      expect(shareImpl).not.toHaveBeenCalled();
      expect(clickedDownloads).toHaveLength(1);
      expect(clickedDownloads[0]).toMatch(/^racija-.+\.mp3$/);
      expect(shareHits()).toHaveLength(1);
      expect(ctx.toast()).toBe('Atsisiųsta – pridėkite failą prie žinutės.');
    });

    it('cancelled (AbortError): silent, no counter hit, nothing announced', async () => {
      shareImpl.mockRejectedValue(new DOMException('cancel', 'AbortError'));
      const ctx = await selectedCtx();
      ctx.share.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBeUndefined();
      expect(ctx.live()).toBe('');
      expect(shareHits()).toHaveLength(0);
    });

    it('not-allowed: retry toast, no counter hit', async () => {
      shareImpl.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
      const ctx = await selectedCtx();
      ctx.share.click();
      await ctx.settle();
      expect(ctx.toast()).toBe('Bandykite dar kartą.');
      expect(shareHits()).toHaveLength(0);
    });

    it('other share error: error toast, no counter hit', async () => {
      shareImpl.mockRejectedValue(new Error('boom'));
      const ctx = await selectedCtx();
      ctx.share.click();
      await ctx.settle();
      expect(ctx.toast()).toBe('Nepavyko išsiųsti. Bandykite dar kartą.');
      expect(shareHits()).toHaveLength(0);
    });

    it('fetch-error: the clip cannot be loaded, so connection toast and no counter hit', async () => {
      soundFetchOk = false;
      const ctx = await selectedCtx();
      ctx.share.click();
      await ctx.settle();
      expect(shareImpl).not.toHaveBeenCalled();
      expect(ctx.toast()).toBe('Nepavyko įkelti garso. Patikrinkite ryšį.');
      expect(shareHits()).toHaveLength(0);
    });

    it('SIŲSTI with nothing selected (share suite): toast and no share', async () => {
      const ctx = await setup();
      ctx.share.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBe('Pirmiausia pasirinkite frazę.');
      expect(shareImpl).not.toHaveBeenCalled();
    });
  });

  describe('counters (real CounterService)', () => {
    it('shows the loaded totals with a thousands separator', async () => {
      const ctx = await setup();
      expect(ctx.nums()).toEqual(['100', '7']);
    });

    it('shows "—" for both when the network fails', async () => {
      counterMode = 'network-error';
      const ctx = await setup();
      expect(ctx.nums()).toEqual(['—', '—']);
    });

    it('shows "—" for both on an HTTP error', async () => {
      counterMode = 'http-error';
      const ctx = await setup();
      expect(ctx.nums()).toEqual(['—', '—']);
    });

    it('shows "…" while pending and "—" once the 5 s timeout aborts the request', async () => {
      counterMode = 'hang';
      const ctx = await setup();
      expect(ctx.nums()).toEqual(['…', '…']);
      await ctx.settle(COUNTER_TIMEOUT_MS - 100);
      expect(ctx.nums()).toEqual(['…', '…']);
      await ctx.settle(200);
      expect(ctx.nums()).toEqual(['—', '—']);
    });

    it('a failing counter never blocks playback or share', async () => {
      counterMode = 'network-error';
      const ctx = await setup();
      ctx.rows()[0].click();
      await ctx.settle();
      FakeAudio.instances[0].emit('playing');
      ctx.share.click();
      await ctx.settle();
      expect(ctx.toast()).toBe('Išsiųsta.');
      expect(ctx.rows()[0].classList.contains('playing')).toBe(true);
      expect(ctx.nums()).toEqual(['—', '—']);
    });

    it('a play bumps the plays counter once, a share bumps only the shares counter', async () => {
      const ctx = await setup();
      ctx.rows()[0].click();
      await ctx.settle();
      expect(ctx.nums()).toEqual(['101', '7']);
      ctx.share.click();
      await ctx.settle();
      expect(ctx.nums()).toEqual(['101', '8']);
    });
  });

  describe('KURTI (real TtsService, fake engine)', () => {
    async function create() {
      const ctx = await setup();
      ctx.pill.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      await ctx.settle(50);
      const area = ctx.root.querySelector<HTMLTextAreaElement>('textarea')!;
      const play = ctx.root.querySelector<HTMLButtonElement>('.play')!;
      const type = async (value: string) => {
        area.value = value;
        area.dispatchEvent(new Event('input'));
        await ctx.settle();
      };
      return { ...ctx, area, play, type };
    }
    const shareHits = () => fetchCalls.filter((u) => u.includes('/hit/') && u.includes('shares'));

    it('opening KURTI downloads and prepares the voice; keys unlock when it is ready', async () => {
      const ctx = await create();
      await ctx.type('Labas');
      expect(ctx.play.getAttribute('aria-disabled')).toBe('false');
      expect(ctx.root.querySelector('.kp-status')?.textContent).toContain('Balsas paruoštas.');
      await ctx.settle(50);
      expect(ctx.live()).toBe('Kūrimo režimas. Balsas paruoštas.');
    });

    it('PALEISTI generates a wav, plays it through the shared audio element and counts a play', async () => {
      const ctx = await create();
      await ctx.type('Labas, kaip sekasi?');
      ctx.play.click();
      await ctx.settle();
      expect(engine.synthesize).toHaveBeenCalledWith('Labas, kaip sekasi?', 'vyras');
      expect(FakeAudio.instances).toHaveLength(1);
      expect(FakeAudio.instances[0].src).toBe('blob:fake');
      expect(FakeAudio.instances[0].play).toHaveBeenCalled();
      expect(fetchCalls.filter((u) => u.includes('/hit/') && u.includes('plays'))).toHaveLength(1);
    });

    it('SIŲSTI: first tap generates ("press again"), second tap shares a .wav inside the tap', async () => {
      const ctx = await create();
      await ctx.type('Labas, kaip sekasi?');
      ctx.share.click();
      await ctx.settle(50);
      expect(shareImpl).not.toHaveBeenCalled();
      expect(ctx.toast()).toBe('Paruošta. Spauskite SIŲSTI dar kartą.');
      ctx.share.click();
      expect(shareImpl).toHaveBeenCalledTimes(1);
      const arg = shareImpl.mock.calls[0][0] as { files: File[]; title: string };
      expect(arg.files[0].type).toBe('audio/wav');
      expect(arg.files[0].name).toMatch(/^racija-.+\.wav$/);
      await ctx.settle();
      expect(engine.synthesize).toHaveBeenCalledTimes(1);
      expect(shareHits()).toHaveLength(1);
      expect(ctx.toast()).toBe('Išsiųsta.');
    });

    it('PALEISTI then SIŲSTI reuses the generated speech: a single tap shares', async () => {
      const ctx = await create();
      await ctx.type('Labas');
      ctx.play.click();
      await ctx.settle();
      ctx.share.click();
      expect(shareImpl).toHaveBeenCalledTimes(1);
      await ctx.settle();
      expect(engine.synthesize).toHaveBeenCalledTimes(1);
    });

    it('without canShare the wav is downloaded', async () => {
      canShareImpl!.mockReturnValue(false);
      const ctx = await create();
      await ctx.type('Labas');
      ctx.play.click();
      await ctx.settle();
      ctx.share.click();
      await ctx.settle();
      expect(clickedDownloads).toHaveLength(1);
      expect(clickedDownloads[0]).toMatch(/\.wav$/);
      expect(ctx.toast()).toBe('Atsisiųsta – pridėkite failą prie žinutės.');
    });

    it('a failing engine shows the generation error and PALEISTI works again afterwards', async () => {
      engine.synthesize.mockRejectedValueOnce(new Error('boom'));
      const ctx = await create();
      await ctx.type('Labas');
      ctx.play.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBe('Nepavyko sukurti kalbos. Bandykite dar kartą.');
      ctx.play.click();
      await ctx.settle();
      expect(FakeAudio.instances[0].play).toHaveBeenCalled();
    });

    it('text with no Lithuanian letters is rejected before the engine runs', async () => {
      const ctx = await create();
      await ctx.type('1234 !!!');
      ctx.play.click();
      await ctx.settle(50);
      expect(engine.synthesize).not.toHaveBeenCalled();
      expect(ctx.toast()).toBe('Tekste nėra lietuviškam balsui tinkamų simbolių.');
    });
  });
});
