import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { TtsErrorReason, TtsService, TtsState } from '../../core/tts/tts.service';
import { TtsPanel } from './tts-panel.component';

function createTtsFake() {
  return {
    state: signal<TtsState>('ready'),
    error: signal<TtsErrorReason | null>(null),
    progress: signal({ phase: 'model' as const, loaded: 0, total: 71_032_571 }),
    prepare: vi.fn(() => Promise.resolve()),
  };
}

describe('TtsPanel', () => {
  let tts: ReturnType<typeof createTtsFake>;

  beforeEach(() => {
    tts = createTtsFake();
    TestBed.configureTestingModule({ providers: [{ provide: TtsService, useValue: tts }] });
  });

  function setup(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(TtsPanel);
    document.body.appendChild(fixture.nativeElement);
    const apply = (values: Record<string, unknown>) => {
      for (const [name, value] of Object.entries(values))
        fixture.componentRef.setInput(name, value);
      fixture.detectChanges();
    };
    apply(inputs);
    const root = fixture.nativeElement as HTMLElement;
    const q = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
    const status = () => q('.kp-status')?.textContent?.replace(/\s+/g, ' ').trim();
    return { fixture, root, q, apply, status };
  }

  afterEach(() => document.body.replaceChildren());

  it('has the label, the textarea limits, the counter and the credit', () => {
    const { q, root } = setup({ text: 'Labas' });
    const area = q<HTMLTextAreaElement>('textarea')!;
    expect(q('label')?.textContent).toBe('Jūsų frazė');
    expect(q('label')?.getAttribute('for')).toBe(area.id);
    expect(area.maxLength).toBe(220);
    expect(area.placeholder).toBe('Įveskite frazę…');
    expect(area.getAttribute('aria-describedby')).toBe('tts-count');
    expect(q('.kp-count')?.textContent?.trim()).toBe('5 / 220');
    expect(root.textContent).toContain('Balsas: Coqui TTS (lt/cv/vits)');
  });

  it('emits the typed text', () => {
    const { fixture, q } = setup();
    const seen: string[] = [];
    fixture.componentInstance.text.subscribe((v) => seen.push(v));
    const area = q<HTMLTextAreaElement>('textarea')!;
    area.value = 'Sveiki';
    area.dispatchEvent(new Event('input'));
    expect(seen).toEqual(['Sveiki']);
  });

  it('shows "Pasiekta riba." at 220 characters', () => {
    const { q } = setup({ text: 'a'.repeat(220) });
    expect(q('.kp-count')?.textContent).toContain('220 / 220');
    expect(q('.kp-count')?.textContent).toContain('Pasiekta riba.');
  });

  it('a paste above the limit shows the message once and clears on the next input', () => {
    const { fixture, q, apply } = setup({ text: 'a'.repeat(200) });
    const overflow = vi.fn();
    fixture.componentInstance.overflow.subscribe(overflow);
    const area = q<HTMLTextAreaElement>('textarea')!;
    area.value = 'a'.repeat(200);
    area.setSelectionRange(200, 200);
    const event = new Event('paste') as Event & { clipboardData: unknown };
    event.clipboardData = { getData: () => 'b'.repeat(40) };
    area.dispatchEvent(event);
    apply({});
    expect(overflow).toHaveBeenCalledTimes(1);
    expect(q('#tts-message')?.textContent).toBe('Daugiausia 220 simbolių. Tekstas sutrumpintas.');
    expect(area.getAttribute('aria-describedby')).toBe('tts-count tts-message');
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(q('#tts-message')).toBeNull();
  });

  it('a short paste is not reported', () => {
    const { fixture, q } = setup({ text: 'abc' });
    const overflow = vi.fn();
    fixture.componentInstance.overflow.subscribe(overflow);
    const event = new Event('paste') as Event & { clipboardData: unknown };
    event.clipboardData = { getData: () => 'xyz' };
    q('textarea')!.dispatchEvent(event);
    expect(overflow).not.toHaveBeenCalled();
  });

  it('no Lithuanian characters: aria-invalid and the inline message', () => {
    const { q } = setup({ text: '123', problem: 'no-chars' });
    const area = q<HTMLTextAreaElement>('textarea')!;
    expect(area.getAttribute('aria-invalid')).toBe('true');
    expect(q('#tts-message')?.textContent).toBe('Tekste nėra lietuviškam balsui tinkamų simbolių.');
  });

  describe('PALEISTI', () => {
    it('is aria-disabled until the page says it can act, and still emits (the page explains)', () => {
      const { fixture, q, apply } = setup();
      const play = vi.fn();
      fixture.componentInstance.play.subscribe(play);
      const button = q<HTMLButtonElement>('.play')!;
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.disabled).toBe(false);
      button.click();
      expect(play).toHaveBeenCalledTimes(1);
      apply({ canAct: true });
      expect(button.getAttribute('aria-disabled')).toBe('false');
    });

    it('is busy while generating', () => {
      const { q, apply } = setup({ canAct: true });
      expect(q('.play')?.getAttribute('aria-busy')).toBeNull();
      tts.state.set('generating');
      apply({});
      expect(q('.play')?.getAttribute('aria-busy')).toBe('true');
    });

    it('shows the marker and a hidden "grojama" while playing', () => {
      const { q, status, apply } = setup({ canAct: true, text: 'Labas', playing: true });
      expect(q('.play .marker')).not.toBeNull();
      expect(q('.play .sr-only')?.textContent).toBe(', grojama');
      expect(status()).toBe('Grojama.');
      apply({ playing: false });
      expect(q('.play .marker')).toBeNull();
    });
  });

  describe('status area', () => {
    it('empty text: the hint', () => {
      expect(setup().status()).toBe('Įveskite frazę ir spauskite PALEISTI.');
    });

    it('ready with text: "Balsas paruoštas."', () => {
      expect(setup({ text: 'Labas' }).status()).toBe('Balsas paruoštas.');
    });

    it('downloading: size note, progressbar in MB, numbers as text', () => {
      tts.state.set('downloading');
      tts.progress.set({ phase: 'model', loaded: 23_400_000, total: 71_032_571 });
      const { q, status } = setup();
      expect(status()).toContain('Atsisiunčiamas balsas (apie 71 MB). Tai tik pirmą kartą.');
      expect(status()).toContain('Atsisiunčiama: 23 iš 71 MB');
      const bar = q('[role=progressbar]')!;
      expect(bar.getAttribute('aria-label')).toBe('Balso atsisiuntimas');
      expect(bar.getAttribute('aria-valuemin')).toBe('0');
      expect(bar.getAttribute('aria-valuemax')).toBe('71');
      expect(bar.getAttribute('aria-valuenow')).toBe('23');
      expect(bar.getAttribute('aria-valuetext')).toBe('23 iš 71 MB');
      expect(q<HTMLElement>('.pbar i')?.style.width).toBe('32%');
    });

    it.each(['idle', 'preparing'] as const)('%s: preparing with an indeterminate bar', (state) => {
      tts.state.set(state);
      const { q, status } = setup();
      expect(status()).toContain('Ruošiamas balsas…');
      const bar = q('[role=progressbar]')!;
      expect(bar.classList.contains('ind')).toBe(true);
      expect(bar.hasAttribute('aria-valuenow')).toBe(false);
      expect(bar.getAttribute('aria-label')).toBe('Ruošiamas balsas');
    });

    it('generating: indeterminate bar', () => {
      tts.state.set('generating');
      const { q, status } = setup({ text: 'Labas', canAct: true });
      expect(status()).toContain('Kuriama kalba…');
      expect(q('[role=progressbar]')?.getAttribute('aria-label')).toBe('Kuriama kalba');
    });

    it('"press SIŲSTI again"', () => {
      expect(setup({ text: 'Labas', again: true }).status()).toBe(
        'Paruošta. Spauskite SIŲSTI dar kartą.',
      );
    });

    it('generation error without a retry button', () => {
      const { q, status } = setup({ text: 'Labas', problem: 'generate' });
      expect(status()).toBe('Nepavyko sukurti kalbos. Bandykite dar kartą.');
      expect(q('.retry')).toBeNull();
    });

    it('unsupported: message, icon, no retry, no progress', () => {
      tts.state.set('error');
      tts.error.set('unsupported');
      const { q, status } = setup();
      expect(status()).toBe('Ši naršyklė nepalaiko kalbos kūrimo. Išbandykite naujesnę.');
      expect(q('.kp-status svg[aria-hidden=true]')).not.toBeNull();
      expect(q('.retry')).toBeNull();
      expect(q('[role=progressbar]')).toBeNull();
    });

    it.each([
      ['download', 'Nepavyko atsisiųsti balso. Patikrinkite ryšį.'],
      ['offline', 'Nėra ryšio. Balsui atsisiųsti reikia interneto.'],
      ['create', 'Šiame įrenginyje balso sukurti nepavyko.'],
    ] as const)('%s error: message and "Bandyti dar kartą" retries prepare()', (reason, text) => {
      tts.state.set('error');
      tts.error.set(reason);
      const { q, status } = setup({ text: 'Labas' });
      expect(status()).toContain(text);
      const retry = q<HTMLButtonElement>('.retry')!;
      expect(retry.textContent?.trim()).toBe('Bandyti dar kartą');
      retry.click();
      expect(tts.prepare).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(q('.play'));
    });

    it('the status area is not a live region (the page announces)', () => {
      expect(setup().q('.kp-status')?.getAttribute('aria-live')).toBe('off');
    });
  });

  it('focusText() focuses the textarea', () => {
    const { fixture, q } = setup();
    fixture.componentInstance.focusText();
    expect(document.activeElement).toBe(q('textarea'));
  });

  describe('axe', () => {
    async function violations(root: HTMLElement) {
      const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });
      return results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) }));
    }

    it.each([
      ['empty', 'ready', null, {}],
      ['downloading', 'downloading', null, { text: 'Labas', canAct: false }],
      ['preparing', 'preparing', null, { text: 'Labas' }],
      ['generating', 'generating', null, { text: 'Labas', canAct: true }],
      ['playing', 'ready', null, { text: 'Labas', canAct: true, playing: true }],
      ['again', 'ready', null, { text: 'Labas', canAct: true, again: true }],
      ['no-chars', 'ready', null, { text: '123', canAct: true, problem: 'no-chars' }],
      ['offline', 'error', 'offline', { text: 'Labas' }],
      ['unsupported', 'error', 'unsupported', {}],
    ] as const)('%s has no violations', async (_name, state, error, inputs) => {
      tts.state.set(state as TtsState);
      tts.error.set(error as TtsErrorReason | null);
      tts.progress.set({ phase: 'model', loaded: 23_000_000, total: 71_032_571 });
      const { root } = setup({ ...inputs });
      expect(await violations(root)).toEqual([]);
    });
  });
});
