import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { AudioPlayerService, PlayerStatus } from '../../core/audio/audio-player.service';
import { CounterService } from '../../core/counter/counter.service';
import { ShareService } from '../../core/share/share.service';
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

  beforeEach(() => {
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
          },
        },
        {
          provide: ShareService,
          useValue: {
            prefetch: () => Promise.resolve(null),
            share: () => Promise.resolve('shared'),
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

  it('search open with "Nieko nerasta" has no violations', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.keys button')!.click();
    fixture.detectChanges();
    const input = root.querySelector('input')!;
    input.value = 'qqqq';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelector('.empty')?.textContent).toContain('Nieko nerasta');
    expect(await violations(root)).toEqual([]);
  });

  it('search open with results, and a toast, have no violations', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    const [search, accept] = Array.from(root.querySelectorAll<HTMLButtonElement>('.keys button'));
    search.click();
    fixture.detectChanges();
    accept.click(); // nothing selected -> toast
    fixture.detectChanges();
    expect(root.querySelector('.toast')).not.toBeNull();
    expect(await violations(root)).toEqual([]);
  });
});
