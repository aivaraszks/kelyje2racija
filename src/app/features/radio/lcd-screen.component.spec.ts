import { TestBed } from '@angular/core/testing';
import { SoundEntry } from '../../core/sounds/sound-catalog';
import { LcdScreen } from './lcd-screen.component';

const sound = (id: string, text: string, variant?: number): SoundEntry => ({
  id,
  text,
  voice: 'vyras',
  file: `sounds/${id}.mp3`,
  variant,
});
const SOUNDS = [
  sound('a', 'Be šansų!'),
  sound('b', 'Pamiršk.', 1),
  sound('c', 'Pamiršk.', 2),
  sound('d', 'Iki kito karto.'),
];

describe('LcdScreen', () => {
  function setup(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(LcdScreen);
    fixture.componentRef.setInput('sounds', SOUNDS);
    fixture.componentRef.setInput('voice', 'vyras');
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    const emitted = {
      select: [] as SoundEntry[],
      voice: [] as string[],
      query: [] as string[],
    };
    component.soundSelect.subscribe((s) => emitted.select.push(s));
    component.voiceChange.subscribe((v) => emitted.voice.push(v));
    component.queryChange.subscribe((q) => emitted.query.push(q));
    const rows = () => Array.from(root.querySelectorAll<HTMLElement>('[role=option]'));
    const key = (el: Element, k: string, init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', {
        key: k,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      el.dispatchEvent(event);
      return event;
    };
    return { fixture, root, emitted, rows, key };
  }

  it('renders a labelled listbox with numbered variants and no visible count', () => {
    const { root, rows } = setup();
    expect(root.querySelector('[role=listbox]')?.getAttribute('aria-label')).toBe('Frazių sąrašas');
    expect(rows().map((r) => r.textContent?.trim())).toEqual([
      'Be šansų!',
      'Pamiršk (1)',
      'Pamiršk (2)',
      'Iki kito karto.',
    ]);
    expect(root.querySelector('.count')).toBeNull();
  });

  it('marks selected and playing rows and gives the playing one a hidden name suffix', () => {
    const { rows } = setup({ selectedId: 'b', playingId: 'b' });
    expect(rows().map((r) => r.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
    expect(rows()[1].classList.contains('playing')).toBe(true);
    expect(rows()[1].querySelector('.sr-only')?.textContent).toBe(', grojama');
    expect(rows()[0].querySelector('.sr-only')).toBeNull();
  });

  it('shows blinking dots and aria-busy on a loading row', () => {
    const { rows } = setup({ playingId: 'c', loadingId: 'c' });
    expect(rows()[2].getAttribute('aria-busy')).toBe('true');
    expect(rows()[2].querySelector('.dots')).not.toBeNull();
    expect(rows()[2].querySelector('.marker')).toBeNull();
  });

  it('uses roving tabindex: selected row, else the first row', () => {
    const first = setup();
    expect(first.rows().map((r) => r.tabIndex)).toEqual([0, -1, -1, -1]);
    const withSelection = setup({ selectedId: 'c' });
    expect(withSelection.rows().map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it('emits the sound on click, Enter and Space, ignoring key repeat', () => {
    const { rows, emitted, key } = setup();
    rows()[1].click();
    key(rows()[2], 'Enter');
    const space = key(rows()[3], ' ');
    key(rows()[0], 'Enter', { repeat: true });
    expect(emitted.select.map((s) => s.id)).toEqual(['b', 'c', 'd']);
    expect(space.defaultPrevented).toBe(true);
  });

  it('moves focus with arrows, Home and End without selecting', () => {
    const { fixture, rows, emitted, key } = setup();
    rows()[0].focus();
    key(rows()[0], 'ArrowDown');
    expect(document.activeElement).toBe(rows()[1]);
    key(rows()[1], 'End');
    expect(document.activeElement).toBe(rows()[3]);
    key(rows()[3], 'ArrowDown');
    expect(document.activeElement).toBe(rows()[3]);
    key(rows()[3], 'Home');
    expect(document.activeElement).toBe(rows()[0]);
    key(rows()[0], 'ArrowUp');
    expect(document.activeElement).toBe(rows()[0]);
    fixture.detectChanges();
    expect(rows()[0].tabIndex).toBe(0);
    expect(emitted.select).toEqual([]);
  });

  it('shows "Nieko nerasta" and no listbox for an empty list', () => {
    const { root } = setup({ sounds: [] });
    expect(root.querySelector('[role=listbox]')).toBeNull();
    expect(root.querySelector('.empty')?.textContent).toContain('Nieko nerasta');
  });

  it('reflects the voice in aria-pressed and emits a change', () => {
    const { root, emitted } = setup({ voice: 'moteris' });
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.seg button'));
    expect(root.querySelector('.seg')?.getAttribute('aria-label')).toBe('Balsas');
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    buttons[0].click();
    expect(emitted.voice).toEqual(['vyras']);
  });

  describe('bottom strip', () => {
    it('shows a labelled search field and the voice toggle at all times', () => {
      const { root } = setup();
      const input = root.querySelector('input')!;
      expect(input.getAttribute('type')).toBe('search');
      expect(input.getAttribute('aria-label')).toBe('Ieškoti įrašų');
      expect(input.getAttribute('autocomplete')).toBe('off');
      expect(root.querySelector('.strip .seg')).not.toBeNull();
      expect(root.querySelector('[aria-controls]')).toBeNull();
    });

    it('emits the query on input and shows the clear button only with text', () => {
      const { root, fixture, emitted } = setup();
      const input = root.querySelector('input')!;
      expect(root.querySelector('.clear')).toBeNull();
      input.value = 'sansu';
      input.dispatchEvent(new Event('input'));
      expect(emitted.query).toEqual(['sansu']);
      fixture.componentRef.setInput('query', 'sansu');
      fixture.detectChanges();
      const clear = root.querySelector<HTMLButtonElement>('.clear')!;
      expect(clear.getAttribute('aria-label')).toBe('Išvalyti paiešką');
      clear.click();
      expect(emitted.query).toEqual(['sansu', '']);
      expect(document.activeElement).toBe(input);
    });

    it('Esc clears the text and keeps focus; with an empty field it does nothing', () => {
      const { root, fixture, emitted, key } = setup({ query: 'kit' });
      const input = root.querySelector('input')!;
      input.focus();
      const esc = key(input, 'Escape');
      expect(esc.defaultPrevented).toBe(true);
      expect(emitted.query).toEqual(['']);
      expect(document.activeElement).toBe(input);
      fixture.componentRef.setInput('query', '');
      fixture.detectChanges();
      key(input, 'Escape');
      expect(emitted.query).toEqual(['']);
    });

    it('Esc on the clear button clears and returns focus to the field', () => {
      const { root, emitted, key } = setup({ query: 'kit' });
      const clear = root.querySelector<HTMLButtonElement>('.clear')!;
      clear.focus();
      key(clear, 'Escape');
      expect(emitted.query).toEqual(['']);
      expect(document.activeElement).toBe(root.querySelector('input'));
    });

    it('Enter focuses the first row without selecting', () => {
      const { root, rows, emitted, key } = setup();
      key(root.querySelector('input')!, 'Enter');
      expect(document.activeElement).toBe(rows()[0]);
      expect(emitted.select).toEqual([]);
    });

    it('focusSearch puts focus in the field; focusList goes to the tab stop or the field', () => {
      const { fixture, root, rows } = setup({ selectedId: 'c' });
      fixture.componentInstance.focusSearch();
      expect(document.activeElement).toBe(root.querySelector('input'));
      fixture.componentInstance.focusList();
      expect(document.activeElement).toBe(rows()[2]);
      fixture.componentRef.setInput('sounds', []);
      fixture.detectChanges();
      fixture.componentInstance.focusList();
      expect(document.activeElement).toBe(root.querySelector('input'));
    });
  });

  describe('create mode', () => {
    it('replaces the list and the search with the projected slot and keeps the toggle', () => {
      const { root } = setup({ mode: 'create' });
      expect(root.querySelector('[role=listbox]')).toBeNull();
      expect(root.querySelector('.empty')).toBeNull();
      expect(root.querySelector('input')).toBeNull();
      expect(root.querySelector('.kurti-slot')).not.toBeNull();
      expect(root.querySelectorAll('.seg button')).toHaveLength(2);
    });

    it('restores the list and the query field when returning', () => {
      const { fixture, root } = setup({ mode: 'create', query: 'kit' });
      fixture.componentRef.setInput('mode', 'sounds');
      fixture.detectChanges();
      expect(root.querySelector('[role=listbox]')).not.toBeNull();
      expect(root.querySelector('input')?.value).toBe('kit');
    });
  });
});
