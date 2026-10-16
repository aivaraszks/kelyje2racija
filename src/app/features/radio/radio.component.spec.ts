import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AudioPlayerService, PlayerStatus } from '../../core/audio/audio-player.service';
import { CounterService } from '../../core/counter/counter.service';
import { ShareOutcome, ShareService } from '../../core/share/share.service';
import { SOUND_CATALOG } from '../../core/sounds/sound-catalog';
import { SoundCatalogService } from '../../core/sounds/sound-catalog.service';
import { Radio, formatCount } from './radio.component';

function createFakes() {
  const playingId = signal<string | null>(null);
  const status = signal<PlayerStatus>('idle');
  const player = {
    playingId,
    status,
    play: vi.fn((s: { id: string; text?: string }) => {
      playingId.set(s.id);
      status.set('playing');
      return Promise.resolve(true);
    }),
    stop: vi.fn(() => {
      playingId.set(null);
      status.set('idle');
    }),
  };
  const sharer = {
    prefetch: vi.fn(() => Promise.resolve(new Blob())),
    share: vi.fn((): Promise<ShareOutcome> => Promise.resolve('shared')),
  };
  const counters = {
    plays: signal<number | null>(1234),
    shares: signal<number | null>(56),
    refresh: vi.fn(() => Promise.resolve()),
    recordPlay: vi.fn(() => Promise.resolve()),
    recordShare: vi.fn(() => Promise.resolve()),
  };
  return { player, sharer, counters };
}

describe('Radio', () => {
  let fakes: ReturnType<typeof createFakes>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    fakes = createFakes();
    TestBed.configureTestingModule({
      providers: [
        { provide: AudioPlayerService, useValue: fakes.player },
        { provide: ShareService, useValue: fakes.sharer },
        { provide: CounterService, useValue: fakes.counters },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function setup() {
    const fixture = TestBed.createComponent(Radio);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(root.querySelectorAll<HTMLElement>('[role=option]'));
    const buttons = () => {
      const [search, accept, share] = Array.from(
        root.querySelectorAll<HTMLButtonElement>('.keys button'),
      );
      return { search, accept, share };
    };
    const settle = async (ms = 0) => {
      await vi.advanceTimersByTimeAsync(ms);
      fixture.detectChanges();
    };
    const live = () => root.querySelector('[role=status]')?.textContent?.trim();
    const toast = () => root.querySelector('.toast')?.textContent?.trim();
    const catalog = TestBed.inject(SoundCatalogService);
    return { fixture, root, rows, buttons, settle, live, toast, catalog };
  }

  it('renders the radio with an h1, a labelled group, and the page landmarks', async () => {
    const { root, buttons } = await setup();
    expect(root.querySelector('h1')?.textContent).toContain('RACIJA');
    expect(root.querySelector('section')?.getAttribute('aria-label')).toBe('Racija');
    expect(root.querySelector('main')).not.toBeNull();
    expect(root.querySelector('footer')?.textContent).toContain(
      'Fanų projektas, nesusijęs su žaidimo kūrėjais',
    );
    expect(buttons().search.textContent).toContain('PAIEŠKA');
    expect(buttons().accept.textContent).toContain('PRIIMTI');
    expect(buttons().accept.textContent).toContain(', groti');
    expect(buttons().share.textContent).toContain('SIŲSTI');
    expect(root.querySelector('[role=status]')?.getAttribute('aria-live')).toBe('polite');
  });

  it('starts with nothing selected, nothing playing and the Vyras list', async () => {
    const { rows, buttons, root } = await setup();
    const vyras = SOUND_CATALOG.filter((s) => s.voice !== 'moteris');
    expect(rows().length).toBe(vyras.length);
    expect(rows().every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true);
    expect(buttons().accept.getAttribute('aria-disabled')).toBe('true');
    expect(buttons().share.getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelector('.hint')).not.toBeNull();
    expect(fakes.player.play).not.toHaveBeenCalled();
  });

  it('a row tap selects and plays, counts one play, prefetches and hides the hint', async () => {
    const { rows, buttons, root, settle } = await setup();
    rows()[2].click();
    await settle();
    expect(fakes.player.play).toHaveBeenCalledTimes(1);
    expect(fakes.player.play.mock.calls[0][0].id).toBe(
      SOUND_CATALOG.filter((s) => s.voice !== 'moteris')[2].id,
    );
    expect(fakes.sharer.prefetch).toHaveBeenCalledTimes(1);
    expect(fakes.counters.recordPlay).toHaveBeenCalledTimes(1);
    expect(rows()[2].getAttribute('aria-selected')).toBe('true');
    expect(buttons().accept.classList.contains('lit')).toBe(true);
    expect(buttons().accept.textContent).toContain(', sustabdyti');
    expect(root.querySelector('.hint')).toBeNull();
  });

  it('does not count a play that failed to start', async () => {
    fakes.player.play.mockResolvedValueOnce(false);
    const { rows, settle } = await setup();
    rows()[0].click();
    await settle();
    expect(fakes.counters.recordPlay).not.toHaveBeenCalled();
  });

  it('toasts and announces a playback error', async () => {
    const { settle, toast, live } = await setup();
    fakes.player.status.set('error');
    await settle(50);
    expect(toast()).toBe('Nepavyko paleisti garso.');
    expect(live()).toBe('Nepavyko paleisti garso.');
  });

  it('PRIIMTI and SIŲSTI with nothing selected only show the message', async () => {
    const { buttons, settle, toast, live } = await setup();
    buttons().accept.click();
    await settle(50);
    expect(toast()).toBe('Pirmiausia pasirinkite frazę.');
    expect(live()).toBe('Pirmiausia pasirinkite frazę.');
    buttons().share.click();
    await settle();
    expect(fakes.player.play).not.toHaveBeenCalled();
    expect(fakes.sharer.share).not.toHaveBeenCalled();
  });

  it('PRIIMTI stops while playing, then replays the selection and counts again', async () => {
    const { rows, buttons, settle, live } = await setup();
    rows()[0].click();
    await settle();
    buttons().accept.click();
    await settle(50);
    expect(fakes.player.stop).toHaveBeenCalledTimes(1);
    expect(live()).toBe('Sustabdyta.');
    buttons().accept.click();
    await settle(50);
    expect(fakes.player.play).toHaveBeenCalledTimes(2);
    expect(fakes.counters.recordPlay).toHaveBeenCalledTimes(2);
    expect(live()).toMatch(/^Grojama: /);
  });

  it('tapping another row plays it through the player (which stops the old one)', async () => {
    const { rows, settle } = await setup();
    rows()[0].click();
    rows()[1].click();
    await settle();
    expect(fakes.player.play).toHaveBeenCalledTimes(2);
    expect(rows()[0].getAttribute('aria-selected')).toBe('false');
    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
  });

  describe('share', () => {
    async function selected() {
      const ctx = await setup();
      ctx.rows()[0].click();
      await ctx.settle();
      return ctx;
    }

    it('shared: counts, toasts, refocuses SIŲSTI', async () => {
      const ctx = await selected();
      ctx.buttons().share.click();
      await ctx.settle();
      expect(fakes.sharer.share).toHaveBeenCalledTimes(1);
      expect(fakes.counters.recordShare).toHaveBeenCalledTimes(1);
      expect(ctx.toast()).toBe('Išsiųsta.');
      expect(document.activeElement).toBe(ctx.buttons().share);
    });

    it('downloaded: counts and explains', async () => {
      fakes.sharer.share.mockResolvedValueOnce('downloaded');
      const ctx = await selected();
      ctx.buttons().share.click();
      await ctx.settle();
      expect(fakes.counters.recordShare).toHaveBeenCalledTimes(1);
      expect(ctx.toast()).toBe('Atsisiųsta – pridėkite failą prie žinutės.');
    });

    it.each([
      ['not-allowed', 'Bandykite dar kartą.'],
      ['error', 'Nepavyko išsiųsti. Bandykite dar kartą.'],
      ['fetch-error', 'Nepavyko įkelti garso. Patikrinkite ryšį.'],
    ] as const)('%s: message, no count', async (outcome, text) => {
      fakes.sharer.share.mockResolvedValueOnce(outcome);
      const ctx = await selected();
      ctx.buttons().share.click();
      await ctx.settle();
      expect(ctx.toast()).toBe(text);
      expect(fakes.counters.recordShare).not.toHaveBeenCalled();
    });

    it('cancelled: silent, no count', async () => {
      fakes.sharer.share.mockResolvedValueOnce('cancelled');
      const ctx = await selected();
      ctx.buttons().share.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBeUndefined();
      expect(ctx.live()).toBe('');
      expect(fakes.counters.recordShare).not.toHaveBeenCalled();
    });

    it('is busy during the share and ignores repeat taps', async () => {
      let finish!: (o: ShareOutcome) => void;
      fakes.sharer.share.mockReturnValueOnce(new Promise((r) => (finish = r)));
      const ctx = await selected();
      ctx.buttons().share.click();
      ctx.fixture.detectChanges();
      expect(ctx.buttons().share.getAttribute('aria-busy')).toBe('true');
      ctx.buttons().share.click();
      expect(fakes.sharer.share).toHaveBeenCalledTimes(1);
      finish('cancelled');
      await ctx.settle();
      expect(ctx.buttons().share.getAttribute('aria-busy')).toBeNull();
    });
  });

  describe('toast timing', () => {
    it('hides after 6 s, errors after 10 s', async () => {
      const { buttons, settle, toast } = await setup();
      buttons().accept.click();
      await settle(5900);
      expect(toast()).toBeDefined();
      await settle(200);
      expect(toast()).toBeUndefined();
    });
  });

  describe('voice', () => {
    it('keeps the counterpart selected, stops playback, saves the choice, announces', async () => {
      const { rows, root, settle, live, catalog } = await setup();
      rows()[0].click();
      await settle();
      const before = fakes.player.play.mock.calls[0][0] as { text: string } | undefined;
      root.querySelectorAll<HTMLButtonElement>('.seg button')[1].click();
      await settle(50);
      expect(fakes.player.stop).toHaveBeenCalled();
      expect(catalog.voice()).toBe('moteris');
      expect(localStorage.getItem('racija-voice')).toBe('moteris');
      const sel = rows().find((r) => r.getAttribute('aria-selected') === 'true');
      expect(sel?.textContent?.trim()).toBe(before?.text);
      expect(fakes.player.play).toHaveBeenCalledTimes(1);
      expect(live()).toMatch(/^Balsas: Moteris\. Įrašų: \d+\.$/);
    });

    it('clears the selection when there is none to keep', async () => {
      const { rows, root, settle } = await setup();
      root.querySelectorAll<HTMLButtonElement>('.seg button')[1].click();
      await settle();
      expect(rows().every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true);
    });
  });

  describe('search', () => {
    it('PAIEŠKA opens the strip (aria-expanded) and focuses the field', async () => {
      const { buttons, root, settle } = await setup();
      buttons().search.click();
      await settle();
      expect(buttons().search.getAttribute('aria-expanded')).toBe('true');
      expect(buttons().search.getAttribute('aria-controls')).toBe('radio-search');
      expect(root.querySelector<HTMLElement>('#radio-search')?.hidden).toBe(false);
      expect(document.activeElement).toBe(root.querySelector('input'));
    });

    it('filters ignoring diacritics, announces once after typing stops', async () => {
      const { buttons, root, rows, settle, live } = await setup();
      buttons().search.click();
      await settle();
      const input = root.querySelector('input')!;
      input.value = 'sansu';
      input.dispatchEvent(new Event('input'));
      await settle(100);
      expect(rows().map((r) => r.textContent?.trim())).toContain('Be šansų!');
      expect(live()).toBe('');
      await settle(500);
      expect(live()).toBe(`Įrašų: ${rows().length}`);
      expect(root.querySelector('.count')?.textContent).toBe(`Įrašų: ${rows().length}`);
    });

    it('shows "Nieko nerasta" and announces it', async () => {
      const { buttons, root, settle, live } = await setup();
      buttons().search.click();
      await settle();
      const input = root.querySelector('input')!;
      input.value = 'zzzz';
      input.dispatchEvent(new Event('input'));
      await settle(600);
      expect(root.querySelector('.empty')?.textContent).toContain('Nieko nerasta');
      expect(live()).toBe('Nieko nerasta.');
    });

    it('clears a selection the filter hides, but lets the playing clip finish', async () => {
      const { buttons, root, rows, settle } = await setup();
      rows()[0].click();
      await settle();
      buttons().search.click();
      await settle();
      const input = root.querySelector('input')!;
      input.value = 'zzzz';
      input.dispatchEvent(new Event('input'));
      await settle();
      expect(fakes.player.stop).not.toHaveBeenCalled();
      expect(buttons().accept.getAttribute('aria-disabled')).toBe('false'); // still playing
      buttons().accept.click();
      await settle();
      expect(fakes.player.stop).toHaveBeenCalledTimes(1);
      expect(buttons().accept.getAttribute('aria-disabled')).toBe('true');
    });

    it('Esc closes, clears the query and returns focus to PAIEŠKA', async () => {
      const { buttons, root, settle, catalog } = await setup();
      buttons().search.click();
      await settle();
      const input = root.querySelector('input')!;
      input.value = 'kit';
      input.dispatchEvent(new Event('input'));
      await settle();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();
      expect(catalog.query()).toBe('');
      expect(buttons().search.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(buttons().search);
    });

    it('PAIEŠKA again closes it', async () => {
      const { buttons, settle, root } = await setup();
      buttons().search.click();
      await settle();
      buttons().search.click();
      await settle();
      expect(root.querySelector<HTMLElement>('#radio-search')?.hidden).toBe(true);
    });
  });

  describe('counters', () => {
    it('formats numbers with a non-breaking thousands separator', async () => {
      const { root } = await setup();
      const text = root.querySelector('.furniture .chip:last-child')?.textContent ?? '';
      expect(text.replace(/[ \n]+/g, ' ')).toContain('Paleista: 1 234 · Išsiųsta: 56');
      expect(formatCount(1234567)).toBe('1 234 567');
      expect(formatCount(12)).toBe('12');
    });

    it('shows "…" while loading and "—" when unavailable', async () => {
      let done!: () => void;
      fakes.counters.refresh.mockReturnValueOnce(new Promise<void>((r) => (done = r)));
      fakes.counters.plays.set(null);
      fakes.counters.shares.set(null);
      const { root, fixture } = await setup();
      const nums = () => Array.from(root.querySelectorAll('.num')).map((n) => n.textContent);
      expect(nums()).toEqual(['…', '…']);
      done();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
      expect(nums()).toEqual(['—', '—']);
    });

    it('is not inside a live region', async () => {
      const { root } = await setup();
      expect(root.querySelector('[aria-live] .num')).toBeNull();
    });
  });

  it('shows the loading marker only after 300 ms of loading', async () => {
    const { rows, settle } = await setup();
    rows()[0].click();
    await settle();
    fakes.player.status.set('loading');
    await settle(100);
    expect(rows()[0].getAttribute('aria-busy')).toBeNull();
    await settle(250);
    expect(rows()[0].getAttribute('aria-busy')).toBe('true');
  });
});
