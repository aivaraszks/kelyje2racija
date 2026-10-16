import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TTS_MAX_LENGTH, TtsService } from '../../core/tts/tts.service';

/** What went wrong with the last PALEISTI / SIŲSTI, shown inside the panel. */
export type TtsProblem = 'no-chars' | 'generate';

export const TTS_COPY = {
  empty: 'Įveskite frazę ir spauskite PALEISTI.',
  download: 'Atsisiunčiamas balsas (apie 71 MB). Tai tik pirmą kartą.',
  preparing: 'Ruošiamas balsas…',
  generating: 'Kuriama kalba…',
  playing: 'Grojama.',
  again: 'Paruošta. Spauskite SIŲSTI dar kartą.',
  ready: 'Balsas paruoštas.',
  unsupported: 'Ši naršyklė nepalaiko kalbos kūrimo. Išbandykite naujesnę.',
  downloadError: 'Nepavyko atsisiųsti balso. Patikrinkite ryšį.',
  offline: 'Nėra ryšio. Balsui atsisiųsti reikia interneto.',
  createError: 'Šiame įrenginyje balso sukurti nepavyko.',
  generateError: 'Nepavyko sukurti kalbos. Bandykite dar kartą.',
  noChars: 'Tekste nėra lietuviškam balsui tinkamų simbolių.',
  tooLong: 'Daugiausia 220 simbolių. Tekstas sutrumpintas.',
} as const;

type StatusKind =
  | 'unsupported'
  | 'offline'
  | 'download-error'
  | 'create-error'
  | 'downloading'
  | 'preparing'
  | 'generating'
  | 'playing'
  | 'again'
  | 'generate-error'
  | 'ready'
  | 'empty';

const BYTES_PER_MB = 1_000_000;

/** KURTI mode: type a line, hear it, send it (UX 5.13). Reads the voice state from TtsService. */
@Component({
  selector: 'app-tts-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tts-panel.component.html',
  styleUrl: './tts-panel.component.css',
})
export class TtsPanel {
  private readonly tts = inject(TtsService);

  readonly text = model('');
  /** Text is not empty and the voice is ready: PALEISTI is enabled. */
  readonly canAct = input(false);
  readonly playing = input(false);
  /** Speech for this text and voice is generated; SIŲSTI shares on the next tap. */
  readonly again = input(false);
  readonly problem = input<TtsProblem | null>(null);

  readonly play = output<void>();
  /** A paste was cut at the limit (announced by the page). */
  readonly overflow = output<void>();

  protected readonly max = TTS_MAX_LENGTH;
  protected readonly copy = TTS_COPY;
  protected readonly cut = signal(false);

  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');
  private readonly playButton = viewChild.required<ElementRef<HTMLButtonElement>>('playButton');

  protected readonly generating = computed(() => this.tts.state() === 'generating');
  protected readonly atLimit = computed(() => this.text().length >= TTS_MAX_LENGTH);

  protected readonly kind = computed<StatusKind>(() => {
    const state = this.tts.state();
    if (state === 'error') {
      switch (this.tts.error()) {
        case 'unsupported':
          return 'unsupported';
        case 'offline':
          return 'offline';
        case 'create':
          return 'create-error';
        default:
          return 'download-error';
      }
    }
    if (state === 'downloading') return 'downloading';
    if (state === 'idle' || state === 'preparing') return 'preparing';
    if (state === 'generating') return 'generating';
    if (this.playing()) return 'playing';
    if (this.again()) return 'again';
    if (this.problem() === 'generate') return 'generate-error';
    return this.text().trim() ? 'ready' : 'empty';
  });

  protected readonly canRetry = computed(() => {
    const kind = this.kind();
    return kind === 'offline' || kind === 'download-error' || kind === 'create-error';
  });
  protected readonly errorText = computed(() => {
    switch (this.kind()) {
      case 'unsupported':
        return TTS_COPY.unsupported;
      case 'offline':
        return TTS_COPY.offline;
      case 'create-error':
        return TTS_COPY.createError;
      case 'generate-error':
        return TTS_COPY.generateError;
      default:
        return TTS_COPY.downloadError;
    }
  });

  protected readonly megabytes = computed(() => {
    const { loaded, total } = this.tts.progress();
    const totalMb = Math.max(1, Math.round(total / BYTES_PER_MB));
    const loadedMb = Math.min(totalMb, Math.floor(loaded / BYTES_PER_MB));
    return { loaded: loadedMb, total: totalMb, percent: Math.round((loadedMb / totalMb) * 100) };
  });

  /** Inline message under the counter (not-Lithuanian text, pasted text cut). */
  protected readonly message = computed(() => {
    if (this.problem() === 'no-chars') return TTS_COPY.noChars;
    return this.cut() ? TTS_COPY.tooLong : null;
  });
  protected readonly describedBy = computed(() =>
    this.message() ? 'tts-count tts-message' : 'tts-count',
  );

  focusText(): void {
    this.field().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    this.cut.set(false);
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  /** The browser cuts a paste at maxlength without a sign; say so once. */
  protected onPaste(event: ClipboardEvent): void {
    const field = this.field().nativeElement;
    const incoming = event.clipboardData?.getData('text') ?? '';
    const kept = field.value.length - (field.selectionEnd - field.selectionStart);
    if (kept + incoming.length > TTS_MAX_LENGTH) {
      this.cut.set(true);
      this.overflow.emit();
    }
  }

  protected onRetry(): void {
    void this.tts.prepare();
    this.playButton().nativeElement.focus();
  }
}
