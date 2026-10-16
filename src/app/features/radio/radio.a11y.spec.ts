import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { AudioPlayerService, PlayerStatus } from '../../core/audio/audio-player.service';
import { CounterService } from '../../core/counter/counter.service';
import { ShareService } from '../../core/share/share.service';
import { TtsErrorReason, TtsService, TtsState } from '../../core/tts/tts.service';
import { Radio } from './radio.component';

/**
 * axe-core over the rendered Radio. The `color-contrast` rule is disabled ONLY because jsdom
 * cannot compute styles/colours; contrast is covered by docs/design/design-system.md and the
 * Lighthouse run in the manual pass (plan task 15). Every other rule stays on.
 */
async function violations(root: HTMLElement) {
  const results = await axe.run(root, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.html.slice(0, 120)),
  }));
}

describe('Radio accessibility (axe-core)', () => {
  const playingId = signal<string | null>(null);
  const status = signal<PlayerStatus>('idle');
  const ttsState = signal<TtsState>('ready');
  const ttsError = signal<TtsErrorReason | null>(null);
  const ttsProgress = signal({ phase: 'model' as const, loaded: 0, total: 71_032_571 });

  beforeEach(() => {
    ttsState.set('ready');
    ttsError.set(null);
    ttsProgress.set({ phase: 'model', loaded: 0, total: 71_032_571 });
    playingId.set(null);
    status.set('idle');
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AudioPlayerService,
          useValue: {
            playingId,
            status,
            play: (s: { id: string }) => {
              playingId.set(s.id);
              status.set('playing');
              return Promise.resolve(true);
            },
            stop: () => {
              playingId.set(null);
              status.set('idle');
            },
            unlock: () => undefined,
            playBlob: (id: string) => {
              playingId.set(id);
              status.set('playing');
              return Promise.resolve(true);
            },
          },
        },
        {
          provide: TtsService,
          useValue: {
            state: ttsState,
            error: ttsError,
            progress: ttsProgress,
            prepare: () => Promise.resolve(),
            peek: () => null,
            synthesize: () => Promise.resolve(new Blob(['wav'])),
          },
        },
        {
          provide: ShareService,
          useValue: {
            prefetch: () => Promise.resolve(null),
            share: () => Promise.resolve('shared'),
            shareFile: () => Promise.resolve('shared'),
          },
        },
        {
          provide: CounterService,
          useValue: {
            plays: signal<number | null>(1234),
            shares: signal<number | null>(56),
            refresh: () => Promise.resolve(),
            recordPlay: () => Promise.resolve(),
            recordShare: () => Promise.resolve(),
          },
        },
      ],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(Radio);
    // axe needs the element in the document (landmarks, visibility, ids).
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('sanity: the harness detects a real violation (guards against a silent no-op)', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<main><img src="x.png"><button></button></main>';
    document.body.appendChild(host);
    const ids = (await violations(host)).map((v) => v.id);
    expect(ids).toContain('image-alt');
    expect(ids).toContain('button-name');
  });

  it('list state has no violations', async () => {
    const fixture = await render();
    expect(await violations(fixture.nativeElement)).toEqual([]);
  });

  it('selected + playing state has no violations', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLElement>('[role=option]')[3].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('[role=option][aria-selected=true]')).not.toBeNull();
    expect(playingId()).not.toBeNull();
    expect(await violations(root)).toEqual([]);
  });

  it('search with "Nieko nerasta" has no violations', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('input')!;
    input.value = 'qqqq';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelector('.empty')?.textContent).toContain('Nieko nerasta');
    expect(await violations(root)).toEqual([]);
  });

  it('search with results and a toast have no violations', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('input')!;
    input.value = 'sansu';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const [, share] = Array.from(root.querySelectorAll<HTMLButtonElement>('.skey'));
    share.click(); // nothing selected -> toast
    fixture.detectChanges();
    expect(root.querySelector('.toast')).not.toBeNull();
    expect(await violations(root)).toEqual([]);
  });

  describe('KURTI (create) mode', () => {
    async function openCreate() {
      const fixture = await render();
      const root = fixture.nativeElement as HTMLElement;
      const [pill] = Array.from(root.querySelectorAll<HTMLButtonElement>('.skey'));
      pill.click();
      fixture.detectChanges();
      expect(pill.textContent?.trim()).toBe('GARSAI');
      expect(root.querySelector('[role=listbox]')).toBeNull();
      const type = (value: string) => {
        const area = root.querySelector<HTMLTextAreaElement>('textarea')!;
        area.value = value;
        area.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      };
      return { fixture, root, type };
    }

    it('empty text, voice ready: no violations', async () => {
      const { root } = await openCreate();
      expect(await violations(root)).toEqual([]);
    });

    it('typed text and ready: no violations', async () => {
      const { root, type } = await openCreate();
      type('Labas, kaip sekasi?');
      expect(await violations(root)).toEqual([]);
    });

    it('downloading with a progress bar: no violations', async () => {
      ttsState.set('downloading');
      ttsProgress.set({ phase: 'model', loaded: 23_000_000, total: 71_032_571 });
      const { root, type, fixture } = await openCreate();
      type('Labas');
      fixture.detectChanges();
      expect(root.querySelector('[role=progressbar][aria-valuenow="23"]')).not.toBeNull();
      expect(await violations(root)).toEqual([]);
    });

    it('preparing and generating (indeterminate bars): no violations', async () => {
      const { root, type, fixture } = await openCreate();
      type('Labas');
      for (const state of ['preparing', 'generating'] as const) {
        ttsState.set(state);
        fixture.detectChanges();
        expect(root.querySelector('[role=progressbar]')).not.toBeNull();
        expect(await violations(root)).toEqual([]);
      }
    });

    it.each(['download', 'offline', 'create', 'unsupported'] as const)(
      '%s error with the alert icon (and retry): no violations',
      async (reason) => {
        ttsState.set('error');
        ttsError.set(reason);
        const { root, type } = await openCreate();
        type('Labas');
        expect(root.querySelector('.kp-status .alert')).not.toBeNull();
        expect(await violations(root)).toEqual([]);
      },
    );

    it('"press SIŲSTI again" (steady ring) and a toast: no violations', async () => {
      const { root, type, fixture } = await openCreate();
      type('Labas');
      const [, share] = Array.from(root.querySelectorAll<HTMLButtonElement>('.skey'));
      share.click();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      expect(share.hasAttribute('data-steady')).toBe(true);
      expect(root.querySelector('.toast')).not.toBeNull();
      expect(await violations(root)).toEqual([]);
    });
  });
});
