import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { SoundEntry, Voice, soundLabel } from '../../core/sounds/sound-catalog';

export type RadioMode = 'sounds' | 'create';

/**
 * The LCD: phrase listbox (roving focus) or the KURTI slot on top, and the fixed bottom strip
 * (search + clear in phrase mode, always the Vyras / Moteris toggle).
 */
@Component({
  selector: 'app-lcd-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lcd-screen.component.html',
  styleUrl: './lcd-screen.component.css',
})
export class LcdScreen {
  readonly sounds = input.required<readonly SoundEntry[]>();
  readonly selectedId = input<string | null>(null);
  readonly playingId = input<string | null>(null);
  /** Clip that has been loading for a while (blinking dots instead of the marker). */
  readonly loadingId = input<string | null>(null);
  readonly voice = input.required<Voice>();
  readonly query = input('');
  readonly mode = input<RadioMode>('sounds');

  /** A row was activated (tap, Enter or Space). */
  readonly soundSelect = output<SoundEntry>();
  readonly voiceChange = output<Voice>();
  readonly queryChange = output<string>();

  protected readonly label = soundLabel;

  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchField');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly rows = viewChildren<ElementRef<HTMLElement>>('row');
  private readonly focusedId = signal<string | null>(null);

  /** The one row with tabindex 0: last focused, else selected, else the first row. */
  protected readonly tabId = computed(() => {
    const sounds = this.sounds();
    const has = (id: string | null) => id !== null && sounds.some((s) => s.id === id);
    const focused = this.focusedId();
    if (has(focused)) return focused;
    const selected = this.selectedId();
    return has(selected) ? selected : (sounds[0]?.id ?? null);
  });

  constructor() {
    // New selection (voice switch, back from KURTI): keep the selected row in view.
    afterRenderEffect(() => {
      this.selectedId();
      this.voice();
      this.mode();
      const row = this.rows().find((r) => r.nativeElement.getAttribute('aria-selected') === 'true');
      row?.nativeElement.scrollIntoView?.({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });
  }

  focusSearch(): void {
    this.searchField()?.nativeElement.focus();
  }

  focusFirstRow(): void {
    this.rows()[0]?.nativeElement.focus();
  }

  /** The listbox's current tab stop; the search field when the list is empty (UX 5.12). */
  focusList(): void {
    const stop = this.rows().find((r) => r.nativeElement.tabIndex === 0);
    if (stop) stop.nativeElement.focus();
    else this.focusSearch();
  }

  protected onFocusRow(id: string): void {
    this.focusedId.set(id);
  }

  protected onInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
    const list = this.list()?.nativeElement;
    if (list) list.scrollTop = 0;
  }

  protected onClear(): void {
    this.queryChange.emit('');
    this.focusSearch();
  }

  /** Esc clears the text and keeps focus in the field; with an empty field it does nothing. */
  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.query()) {
        event.preventDefault();
        this.queryChange.emit('');
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.focusFirstRow();
    }
  }

  protected onClearKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClear();
    }
  }

  protected onListKeydown(event: KeyboardEvent): void {
    const rows = this.rows().map((r) => r.nativeElement);
    const target = event.target as Node;
    const index = rows.findIndex((r) => r === target || r.contains(target));
    if (index < 0) return;

    const page = this.pageSize(rows[index]);
    const move: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: rows.length - 1,
      PageDown: index + page,
      PageUp: index - page,
    };
    if (event.key in move) {
      event.preventDefault();
      rows[Math.max(0, Math.min(rows.length - 1, move[event.key]))].focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Space must not scroll the page
      if (!event.repeat) this.soundSelect.emit(this.sounds()[index]);
    }
  }

  private pageSize(row: HTMLElement): number {
    const height = this.list()?.nativeElement.clientHeight ?? 0;
    const rows = Math.floor(height / (row.offsetHeight || 1));
    return Number.isFinite(rows) && rows > 1 ? rows - 1 : 5;
  }
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
