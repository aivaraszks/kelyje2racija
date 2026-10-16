import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AudioPlayerService, PlayerStatus } from '../../core/audio/audio-player.service';
import { CounterService } from '../../core/counter/counter.service';
import { ShareOutcome, ShareService } from '../../core/share/share.service';
import { SOUND_CATALOG } from '../../core/sounds/sound-catalog';
import { SoundCatalogService } from '../../core/sounds/sound-catalog.service';
import { TtsError, TtsErrorReason, TtsService, TtsState } from '../../core/tts/tts.service';
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
    unlock: vi.fn(),
    playBlob: vi.fn((id: string, _blob: Blob) => {
      playingId.set(id);
      status.set('playing');
      return Promise.resolve(true);
    }),
  };
  const sharer = {
    prefetch: vi.fn(() => Promise.resolve(new Blob())),
    share: vi.fn((): Promise<ShareOutcome> => Promise.resolve('shared')),
    shareFile: vi.fn((_file: File, _title: string): Promise<ShareOutcome> =>
      Promise.resolve('shared'),
    ),
  };
  const counters = {
    plays: signal<number | null>(1234),
    shares: signal<number | null>(56),
    refresh: vi.fn(() => Promise.resolve()),
    recordPlay: vi.fn(() => Promise.resolve()),
    recordShare: vi.fn(() => Promise.resolve()),
  };
  const tts = {
    state: signal<TtsState>('ready'),
    error: signal<TtsErrorReason | null>(null),
    progress: signal({ phase: 'model' as const, loaded: 0, total: 71_032_571 }),
    prepare: vi.fn(() => Promise.resolve()),
    synthesize: vi.fn((_text: string, _voice: string): Promise<Blob> =>
      Promise.resolve(new Blob(['wav'], { type: 'audio/wav' })),
    ),
    peek: vi.fn((): Blob | null => null),
  };
  return { player, sharer, counters, tts };
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
        { provide: TtsService, useValue: fakes.tts },
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
      const [pill, share] = Array.from(root.querySelectorAll<HTMLButtonElement>('.skey'));
      return { pill, share };
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
    expect(buttons().pill.textContent?.trim()).toBe('KURTI');
    expect(buttons().share.textContent?.trim()).toBe('SIŲSTI');
    expect(root.textContent).not.toContain('PRIIMTI');
    expect(root.textContent).not.toContain('PAIEŠKA');
    expect(root.querySelectorAll('img[alt=""]')).toHaveLength(2);
    expect(root.querySelector('[role=status]')?.getAttribute('aria-live')).toBe('polite');
  });

  it('starts with nothing selected, nothing playing and the Vyras list', async () => {
    const { rows, buttons, root } = await setup();
    const vyras = SOUND_CATALOG.filter((s) => s.voice !== 'moteris');
    expect(rows().length).toBe(vyras.length);
    expect(rows().every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true);
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
    expect(buttons().share.getAttribute('aria-disabled')).toBe('false');
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

  it('SIŲSTI with nothing selected only shows the message', async () => {
    const { buttons, settle, toast, live } = await setup();
    buttons().share.click();
    await settle(50);
    expect(toast()).toBe('Pirmiausia pasirinkite frazę.');
    expect(live()).toBe('Pirmiausia pasirinkite frazę.');
    expect(fakes.player.play).not.toHaveBeenCalled();
    expect(fakes.sharer.share).not.toHaveBeenCalled();
  });

  it('tapping the playing row plays it again and counts again (no stop key)', async () => {
    const { rows, settle } = await setup();
    rows()[0].click();
    await settle();
    rows()[0].click();
    await settle();
    expect(fakes.player.play).toHaveBeenCalledTimes(2);
    expect(fakes.counters.recordPlay).toHaveBeenCalledTimes(2);
    expect(fakes.player.stop).not.toHaveBeenCalled();
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
      buttons().share.click();
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

  describe('search (bottom strip)', () => {
    const typeQuery = async (ctx: Awaited<ReturnType<typeof setup>>, value: string) => {
      const input = ctx.root.querySelector('input')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await ctx.settle();
      return input;
    };

    it('is always visible, with no PAIEŠKA key, no aria-controls and no count', async () => {
      const { root } = await setup();
      expect(root.querySelector('input[type=search]')).not.toBeNull();
      expect(root.querySelector('[aria-controls]')).toBeNull();
      expect(root.querySelector('.count')).toBeNull();
    });

    it('filters ignoring diacritics, announces once after typing stops', async () => {
      const ctx = await setup();
      await typeQuery(ctx, 'sansu');
      await ctx.settle(100);
      expect(ctx.rows().map((r) => r.textContent?.trim())).toContain('Be šansų!');
      expect(ctx.live()).toBe('');
      await ctx.settle(500);
      expect(ctx.live()).toBe(`Įrašų: ${ctx.rows().length}`);
    });

    it('shows "Nieko nerasta" and announces it', async () => {
      const ctx = await setup();
      await typeQuery(ctx, 'zzzz');
      await ctx.settle(600);
      expect(ctx.root.querySelector('.empty')?.textContent).toContain('Nieko nerasta');
      expect(ctx.live()).toBe('Nieko nerasta.');
    });

    it('drops a selection the filter hides without stopping the playing clip', async () => {
      const ctx = await setup();
      ctx.rows()[0].click();
      await ctx.settle();
      await typeQuery(ctx, 'zzzz');
      expect(fakes.player.stop).not.toHaveBeenCalled();
      expect(ctx.buttons().share.getAttribute('aria-disabled')).toBe('true');
    });

    it('Esc clears the query and keeps focus in the field', async () => {
      const ctx = await setup();
      const input = await typeQuery(ctx, 'kit');
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await ctx.settle();
      expect(ctx.catalog.query()).toBe('');
      expect(document.activeElement).toBe(input);
    });
  });

  describe('mode switch (KURTI <-> GARSAI)', () => {
    const click = (el: HTMLElement, detail: number) =>
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));

    it('toggles the label and the LCD content, and keeps the query', async () => {
      const ctx = await setup();
      ctx.catalog.query.set('sansu');
      ctx.fixture.detectChanges();
      click(ctx.buttons().pill, 1);
      await ctx.settle(50);
      expect(ctx.buttons().pill.textContent?.trim()).toBe('GARSAI');
      expect(ctx.root.querySelector('[role=listbox]')).toBeNull();
      expect(ctx.root.querySelector('input[type=search]')).toBeNull();
      expect(ctx.root.querySelector('.seg')).not.toBeNull();
      expect(ctx.live()).toBe('Kūrimo režimas.');
      click(ctx.buttons().pill, 1);
      await ctx.settle(50);
      expect(ctx.buttons().pill.textContent?.trim()).toBe('KURTI');
      expect(ctx.root.querySelector<HTMLInputElement>('input[type=search]')?.value).toBe('sansu');
      expect(ctx.live()).toMatch(/^Frazių sąrašas\. Įrašų: \d+\.$/);
    });

    it('stops a playing clip', async () => {
      const ctx = await setup();
      ctx.rows()[0].click();
      await ctx.settle();
      click(ctx.buttons().pill, 1);
      await ctx.settle();
      expect(fakes.player.stop).toHaveBeenCalledTimes(1);
    });

    it('touch / pointer activation keeps focus on the pill', async () => {
      const ctx = await setup();
      ctx.buttons().pill.focus();
      click(ctx.buttons().pill, 1);
      await ctx.settle();
      click(ctx.buttons().pill, 1);
      await ctx.settle();
      expect(document.activeElement).toBe(ctx.buttons().pill);
    });

    it('keyboard activation back to GARSAI moves focus to the listbox tab stop', async () => {
      const ctx = await setup();
      click(ctx.buttons().pill, 0);
      await ctx.settle();
      click(ctx.buttons().pill, 0);
      await ctx.settle();
      expect(document.activeElement).toBe(ctx.rows().find((r) => r.tabIndex === 0));
    });

    it('entering KURTI starts the voice (prepare) and announces the mode', async () => {
      const ctx = await setup();
      click(ctx.buttons().pill, 1);
      await ctx.settle(50);
      expect(fakes.tts.prepare).toHaveBeenCalledTimes(1);
      expect(ctx.live()).toBe('Kūrimo režimas.');
    });

    it('announces the size note when the download starts after opening', async () => {
      fakes.tts.state.set('idle');
      const ctx = await setup();
      click(ctx.buttons().pill, 1);
      await ctx.settle(50);
      expect(ctx.live()).toBe('');
      fakes.tts.state.set('downloading');
      await ctx.settle(50);
      expect(ctx.live()).toBe('Kūrimo režimas. Pradedamas balso atsisiuntimas, apie 71 MB.');
      fakes.tts.state.set('preparing');
      await ctx.settle(50);
      fakes.tts.state.set('ready');
      await ctx.settle(50);
      expect(ctx.live()).toBe('Balsas paruoštas.');
    });

    it('falls back to the plain mode message when the voice state is slow to answer', async () => {
      fakes.tts.state.set('idle');
      const ctx = await setup();
      click(ctx.buttons().pill, 1);
      await ctx.settle(500);
      expect(ctx.live()).toBe('Kūrimo režimas.');
    });

    it('a failed voice is announced with the mode message', async () => {
      fakes.tts.state.set('idle');
      const ctx = await setup();
      click(ctx.buttons().pill, 1);
      fakes.tts.error.set('offline');
      fakes.tts.state.set('error');
      await ctx.settle(50);
      expect(ctx.live()).toBe('Kūrimo režimas. Nėra ryšio. Balsui atsisiųsti reikia interneto.');
    });

    it('leaving KURTI does not touch the voice download', async () => {
      const ctx = await setup();
      click(ctx.buttons().pill, 1);
      click(ctx.buttons().pill, 1);
      await ctx.settle();
      expect(fakes.tts.prepare).toHaveBeenCalledTimes(1);
    });

    it('keyboard activation into KURTI focuses the textarea; touch does not', async () => {
      const ctx = await setup();
      click(ctx.buttons().pill, 1);
      await ctx.settle();
      expect(document.activeElement).not.toBe(ctx.root.querySelector('textarea'));
      click(ctx.buttons().pill, 0);
      await ctx.settle();
      expect(document.activeElement).toBe(ctx.rows().find((r) => r.tabIndex === 0));
      click(ctx.buttons().pill, 0);
      await ctx.settle();
      expect(document.activeElement).toBe(ctx.root.querySelector('textarea'));
    });
  });

  describe('KURTI mode (speech)', () => {
    const click = (el: HTMLElement) =>
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));

    async function create() {
      const ctx = await setup();
      click(ctx.buttons().pill);
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

    it('SIŲSTI and PALEISTI are aria-disabled without text and tapping says why', async () => {
      const ctx = await create();
      expect(ctx.buttons().share.getAttribute('aria-disabled')).toBe('true');
      expect(ctx.play.getAttribute('aria-disabled')).toBe('true');
      ctx.buttons().share.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBe('Įveskite tekstą.');
      ctx.play.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBe('Įveskite tekstą.');
      expect(fakes.tts.synthesize).not.toHaveBeenCalled();
      expect(fakes.sharer.shareFile).not.toHaveBeenCalled();
    });

    it.each([
      ['downloading', 'Balsas dar atsisiunčiamas. Palaukite.'],
      ['preparing', 'Balsas dar ruošiamas. Palaukite.'],
    ] as const)('voice %s: tapping explains and does not generate', async (state, message) => {
      fakes.tts.state.set(state);
      const ctx = await create();
      await ctx.type('Labas');
      expect(ctx.play.getAttribute('aria-disabled')).toBe('true');
      ctx.play.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBe(message);
      expect(fakes.tts.synthesize).not.toHaveBeenCalled();
    });

    it('an unsupported browser gives the message in a toast', async () => {
      fakes.tts.state.set('error');
      fakes.tts.error.set('unsupported');
      const ctx = await create();
      await ctx.type('Labas');
      ctx.buttons().share.click();
      await ctx.settle(50);
      expect(ctx.toast()).toBe('Ši naršyklė nepalaiko kalbos kūrimo.');
    });

    it('typing enables both keys', async () => {
      const ctx = await create();
      await ctx.type('Labas');
      expect(ctx.play.getAttribute('aria-disabled')).toBe('false');
      expect(ctx.buttons().share.getAttribute('aria-disabled')).toBe('false');
    });

    it('PALEISTI unlocks audio synchronously, generates, plays as "tts", counts one play', async () => {
      const ctx = await create();
      await ctx.type('Labas, kaip sekasi?');
      ctx.play.click();
      expect(fakes.player.unlock).toHaveBeenCalledTimes(1);
      expect(fakes.tts.synthesize).toHaveBeenCalledWith('Labas, kaip sekasi?', 'vyras');
      await ctx.settle();
      expect(fakes.player.playBlob).toHaveBeenCalledTimes(1);
      expect(fakes.player.playBlob.mock.calls[0][0]).toBe('tts');
      expect(fakes.counters.recordPlay).toHaveBeenCalledTimes(1);
      expect(ctx.root.querySelector('.hint')).toBeNull();
      expect(ctx.root.querySelector('.kp-status')?.textContent).toContain('Grojama.');
    });

    it('PALEISTI with cached speech plays it right away without generating', async () => {
      const blob = new Blob(['cached']);
      fakes.tts.peek.mockReturnValue(blob);
      const ctx = await create();
      await ctx.type('Labas');
      ctx.play.click();
      expect(fakes.player.playBlob).toHaveBeenCalledWith('tts', blob);
      expect(fakes.tts.synthesize).not.toHaveBeenCalled();
    });

    it('the voice toggle applies to speech', async () => {
      const ctx = await create();
      await ctx.type('Labas');
      ctx.root.querySelectorAll<HTMLButtonElement>('.seg button')[1].click();
      await ctx.settle(50);
      expect(ctx.live()).toBe('Balsas: Moteris.');
      ctx.play.click();
      expect(fakes.tts.synthesize).toHaveBeenCalledWith('Labas', 'moteris');
    });

    it('both keys are busy while generating and repeat taps are ignored', async () => {
      let finish!: (blob: Blob) => void;
      fakes.tts.synthesize.mockReturnValueOnce(new Promise<Blob>((r) => (finish = r)));
      const ctx = await create();
      await ctx.type('Labas');
      ctx.play.click();
      fakes.tts.state.set('generating');
      ctx.fixture.detectChanges();
      expect(ctx.play.getAttribute('aria-busy')).toBe('true');
      expect(ctx.buttons().share.getAttribute('aria-busy')).toBe('true');
      ctx.play.click();
      ctx.buttons().share.click();
      expect(fakes.tts.synthesize).toHaveBeenCalledTimes(1);
      fakes.tts.state.set('ready');
      finish(new Blob(['x']));
      await ctx.settle();
      expect(fakes.player.playBlob).toHaveBeenCalledTimes(1);
    });

    it('announces "Kuriama kalba." only when generation takes longer than 400 ms', async () => {
      let finish!: (blob: Blob) => void;
      fakes.tts.synthesize.mockReturnValueOnce(new Promise<Blob>((r) => (finish = r)));
      const ctx = await create();
      await ctx.type('Labas');
      ctx.play.click();
      await ctx.settle(350);
      expect(ctx.live()).not.toBe('Kuriama kalba.');
      await ctx.settle(100);
      expect(ctx.live()).toBe('Kuriama kalba.');
      finish(new Blob(['x']));
      await ctx.settle();
    });

    describe('SIŲSTI', () => {
      const lastShare = () => fakes.sharer.shareFile.mock.calls[0] as unknown as [File, string];

      it('with cached speech shares a .wav File synchronously inside the tap', async () => {
        fakes.tts.peek.mockReturnValue(new Blob(['wav'], { type: 'audio/wav' }));
        const ctx = await create();
        await ctx.type('Labas, kaip sekasi?');
        ctx.buttons().share.click();
        expect(fakes.sharer.shareFile).toHaveBeenCalledTimes(1);
        const [file, title] = lastShare();
        expect(file.type).toBe('audio/wav');
        expect(file.name).toMatch(/\.wav$/);
        expect(title).toBe('Labas, kaip sekasi?');
        expect(fakes.tts.synthesize).not.toHaveBeenCalled();
        await ctx.settle();
        expect(fakes.counters.recordShare).toHaveBeenCalledTimes(1);
        expect(ctx.toast()).toBe('Išsiųsta.');
        expect(document.activeElement).toBe(ctx.buttons().share);
      });

      it('cuts a long title to 60 characters', async () => {
        fakes.tts.peek.mockReturnValue(new Blob(['wav']));
        const ctx = await create();
        await ctx.type('a'.repeat(100));
        ctx.buttons().share.click();
        expect(lastShare()[1]).toHaveLength(60);
      });

      it('without cached speech generates, says "press again", marks the key steady, does not share', async () => {
        const ctx = await create();
        await ctx.type('Labas');
        ctx.buttons().share.click();
        await ctx.settle(50);
        expect(fakes.tts.synthesize).toHaveBeenCalledTimes(1);
        expect(fakes.sharer.shareFile).not.toHaveBeenCalled();
        expect(fakes.player.playBlob).not.toHaveBeenCalled();
        expect(ctx.toast()).toBe('Paruošta. Spauskite SIŲSTI dar kartą.');
        expect(ctx.buttons().share.hasAttribute('data-steady')).toBe(true);
        expect(ctx.root.querySelector('.kp-status')?.textContent).toContain(
          'Paruošta. Spauskite SIŲSTI dar kartą.',
        );
      });

      it('the second tap shares and clears the steady ring', async () => {
        const ctx = await create();
        await ctx.type('Labas');
        ctx.buttons().share.click();
        await ctx.settle(50);
        fakes.tts.peek.mockReturnValue(new Blob(['wav']));
        ctx.buttons().share.click();
        await ctx.settle();
        expect(fakes.sharer.shareFile).toHaveBeenCalledTimes(1);
        expect(ctx.buttons().share.hasAttribute('data-steady')).toBe(false);
      });

      it('editing the text or switching voice clears the steady ring', async () => {
        const ctx = await create();
        await ctx.type('Labas');
        ctx.buttons().share.click();
        await ctx.settle(50);
        await ctx.type('Labas rytas');
        expect(ctx.buttons().share.hasAttribute('data-steady')).toBe(false);
        ctx.buttons().share.click();
        await ctx.settle(50);
        expect(ctx.buttons().share.hasAttribute('data-steady')).toBe(true);
        ctx.root.querySelectorAll<HTMLButtonElement>('.seg button')[1].click();
        await ctx.settle();
        expect(ctx.buttons().share.hasAttribute('data-steady')).toBe(false);
      });

      it('downloaded counts as a share and explains', async () => {
        fakes.tts.peek.mockReturnValue(new Blob(['wav']));
        fakes.sharer.shareFile.mockResolvedValueOnce('downloaded');
        const ctx = await create();
        await ctx.type('Labas');
        ctx.buttons().share.click();
        await ctx.settle();
        expect(fakes.counters.recordShare).toHaveBeenCalledTimes(1);
        expect(ctx.toast()).toBe('Atsisiųsta – pridėkite failą prie žinutės.');
      });

      it.each([
        ['not-allowed', 'Bandykite dar kartą.'],
        ['error', 'Nepavyko išsiųsti. Bandykite dar kartą.'],
      ] as const)('%s: message, no count', async (outcome, text) => {
        fakes.tts.peek.mockReturnValue(new Blob(['wav']));
        fakes.sharer.shareFile.mockResolvedValueOnce(outcome);
        const ctx = await create();
        await ctx.type('Labas');
        ctx.buttons().share.click();
        await ctx.settle();
        expect(ctx.toast()).toBe(text);
        expect(fakes.counters.recordShare).not.toHaveBeenCalled();
      });
    });

    describe('errors and races', () => {
      it('generation failed: toast, inline status, can try again', async () => {
        fakes.tts.synthesize.mockRejectedValueOnce(new TtsError('generate'));
        const ctx = await create();
        await ctx.type('Labas');
        ctx.play.click();
        await ctx.settle(50);
        expect(ctx.toast()).toBe('Nepavyko sukurti kalbos. Bandykite dar kartą.');
        expect(ctx.root.querySelector('.kp-status')?.textContent).toContain(
          'Nepavyko sukurti kalbos.',
        );
        expect(fakes.player.playBlob).not.toHaveBeenCalled();
        ctx.play.click();
        await ctx.settle();
        expect(fakes.player.playBlob).toHaveBeenCalledTimes(1);
      });

      it('no speakable characters: invalid textarea, inline message, clears on edit', async () => {
        fakes.tts.synthesize.mockRejectedValueOnce(new TtsError('no-chars'));
        const ctx = await create();
        await ctx.type('123');
        ctx.play.click();
        await ctx.settle(50);
        expect(ctx.area.getAttribute('aria-invalid')).toBe('true');
        expect(ctx.root.querySelector('#tts-message')?.textContent).toBe(
          'Tekste nėra lietuviškam balsui tinkamų simbolių.',
        );
        expect(ctx.toast()).toBe('Tekste nėra lietuviškam balsui tinkamų simbolių.');
        await ctx.type('1234');
        expect(ctx.area.getAttribute('aria-invalid')).toBeNull();
      });

      it('leaving KURTI mid-generation does not play, flag or toast the late result', async () => {
        let finish!: (blob: Blob) => void;
        fakes.tts.synthesize.mockReturnValueOnce(new Promise<Blob>((r) => (finish = r)));
        const ctx = await create();
        await ctx.type('Labas');
        ctx.buttons().share.click();
        click(ctx.buttons().pill);
        await ctx.settle();
        finish(new Blob(['x']));
        await ctx.settle(50);
        expect(fakes.player.playBlob).not.toHaveBeenCalled();
        expect(ctx.toast()).toBeUndefined();
      });

      it('editing the text mid-generation drops the late result', async () => {
        let finish!: (blob: Blob) => void;
        fakes.tts.synthesize.mockReturnValueOnce(new Promise<Blob>((r) => (finish = r)));
        const ctx = await create();
        await ctx.type('Labas');
        ctx.play.click();
        await ctx.type('Labas rytas');
        finish(new Blob(['x']));
        await ctx.settle();
        expect(fakes.player.playBlob).not.toHaveBeenCalled();
      });

      it('switching mode stops the speech', async () => {
        const ctx = await create();
        await ctx.type('Labas');
        ctx.play.click();
        await ctx.settle();
        fakes.player.stop.mockClear();
        click(ctx.buttons().pill);
        expect(fakes.player.stop).toHaveBeenCalledTimes(1);
      });

      it('a paste cut at 220 characters is announced', async () => {
        const ctx = await create();
        ctx.area.value = 'a'.repeat(210);
        ctx.area.setSelectionRange(210, 210);
        const event = new Event('paste') as Event & { clipboardData: unknown };
        event.clipboardData = { getData: () => 'b'.repeat(30) };
        ctx.area.dispatchEvent(event);
        await ctx.settle(50);
        expect(ctx.live()).toBe('Daugiausia 220 simbolių.');
      });
    });

    it('keeps the typed text across a round trip to the list', async () => {
      const ctx = await create();
      await ctx.type('Labas');
      click(ctx.buttons().pill);
      await ctx.settle();
      click(ctx.buttons().pill);
      await ctx.settle();
      expect(ctx.root.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Labas');
    });
  });

  describe('counters', () => {
    it('formats numbers with a non-breaking thousands separator', async () => {
      const { root } = await setup();
      const text = root.querySelector('.counters')?.textContent ?? '';
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
