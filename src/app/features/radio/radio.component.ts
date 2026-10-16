import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { AudioPlayerService } from '../../core/audio/audio-player.service';
import { CounterService } from '../../core/counter/counter.service';
import { ShareOutcome, ShareService } from '../../core/share/share.service';
import { SoundCatalogService } from '../../core/sounds/sound-catalog.service';
import { SoundEntry, Voice, soundLabel } from '../../core/sounds/sound-catalog';
import { TtsError, TtsErrorReason, TtsService } from '../../core/tts/tts.service';
import { speechFile } from '../../core/tts/pcm';
import { NgOptimizedImage } from '@angular/common';
import { LcdScreen, RadioMode } from './lcd-screen.component';
import { TTS_COPY, TtsPanel, TtsProblem } from './tts-panel.component';

interface Toast {
  readonly text: string;
  readonly error: boolean;
}

const TOAST_MS = 6000;
const TOAST_ERROR_MS = 10_000;
const SEARCH_ANNOUNCE_MS = 500;
const LOADING_MARKER_MS = 300;
const LIVE_DELAY_MS = 30;
const GENERATING_ANNOUNCE_MS = 400;
const OPEN_ANNOUNCE_MS = 400;
const TITLE_MAX = 60;
const SPEECH_ID = 'tts';

export const MSG = {
  selectFirst: 'Pirmiausia pasirinkite frazę.',
  shared: 'Išsiųsta.',
  downloaded: 'Atsisiųsta – pridėkite failą prie žinutės.',
  shareRetry: 'Bandykite dar kartą.',
  shareError: 'Nepavyko išsiųsti. Bandykite dar kartą.',
  fetchError: 'Nepavyko įkelti garso. Patikrinkite ryšį.',
  playError: 'Nepavyko paleisti garso.',
  noResults: 'Nieko nerasta.',
  enterText: 'Įveskite tekstą.',
  modeCreate: 'Kūrimo režimas.',
  ttsDownloading: 'Pradedamas balso atsisiuntimas, apie 71 MB.',
  ttsReady: 'Balsas paruoštas.',
  ttsGenerating: 'Kuriama kalba.',
  ttsDownloadWait: 'Balsas dar atsisiunčiamas. Palaukite.',
  ttsPreparingWait: 'Balsas dar ruošiamas. Palaukite.',
  ttsAgain: 'Paruošta. Spauskite SIŲSTI dar kartą.',
  ttsTooLong: 'Daugiausia 220 simbolių.',
  ttsUnsupported: 'Ši naršyklė nepalaiko kalbos kūrimo.',
} as const;

const TTS_ERROR_TEXT: Record<TtsErrorReason, string> = {
  unsupported: MSG.ttsUnsupported,
  offline: TTS_COPY.offline,
  download: TTS_COPY.downloadError,
  create: TTS_COPY.createError,
  generate: TTS_COPY.generateError,
  empty: MSG.enterText,
  'too-long': TTS_COPY.tooLong,
  'no-chars': TTS_COPY.noChars,
};

/** Number with a non-breaking space as the thousands separator: "1 234". */
export function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** The RACIJA page: radio body, wiring between LCD / keys and the core services, page furniture. */
@Component({
  selector: 'app-radio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcdScreen, TtsPanel, NgOptimizedImage],
  templateUrl: './radio.component.html',
  styleUrl: './radio.component.css',
})
export class Radio {
  private readonly catalog = inject(SoundCatalogService);
  private readonly player = inject(AudioPlayerService);
  private readonly sharer = inject(ShareService);
  private readonly counters = inject(CounterService);
  private readonly tts = inject(TtsService);
  private readonly injector = inject(Injector);

  private readonly lcd = viewChild.required(LcdScreen);
  private readonly panel = viewChild(TtsPanel);
  private readonly shareButton = viewChild.required('shareButton', {
    read: ElementRef,
  });

  protected readonly sounds = this.catalog.visibleSounds;
  protected readonly voice = this.catalog.voice;
  protected readonly query = this.catalog.query;
  protected readonly playingId = this.player.playingId;

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return id === null ? undefined : this.catalog.byId(id);
  });
  protected readonly mode = signal<RadioMode>('sounds');
  protected readonly sharing = signal(false);

  // KURTI mode
  protected readonly text = signal('');
  /** Speech for the current text and voice is generated; the next SIŲSTI tap shares it. */
  protected readonly again = signal(false);
  protected readonly problem = signal<TtsProblem | null>(null);
  protected readonly generating = computed(() => this.tts.state() === 'generating');
  protected readonly speaking = computed(() => this.playingId() === SPEECH_ID);
  protected readonly canAct = computed(() => {
    const state = this.tts.state();
    return this.text().trim() !== '' && (state === 'ready' || state === 'generating');
  });
  protected readonly played = signal(false);
  protected readonly toast = signal<Toast | null>(null);
  protected readonly live = signal('');

  private readonly slowLoading = signal(false);
  protected readonly loadingId = computed(() =>
    this.slowLoading() ? this.player.playingId() : null,
  );

  private readonly countersLoaded = signal(false);
  protected readonly playsText = computed(() =>
    this.counterText(this.counters.plays(), this.countersLoaded()),
  );
  protected readonly sharesText = computed(() =>
    this.counterText(this.counters.shares(), this.countersLoaded()),
  );

  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private liveTimer: ReturnType<typeof setTimeout> | undefined;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  /** Bumped by every new intent (tap, edit, voice, mode); a late result for an old one is dropped. */
  private intent = 0;
  private openPending = false;
  private ttsOpened = false;
  private previousTts: string = this.tts.state();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.toastTimer);
      clearTimeout(this.liveTimer);
      clearTimeout(this.searchTimer);
      clearTimeout(this.openTimer);
    });

    void this.counters.refresh().then(() => this.countersLoaded.set(true));

    // Blinking dots on the row when the clip is not ready after 300 ms.
    effect((onCleanup) => {
      this.player.playingId();
      if (this.player.status() === 'loading') {
        const timer = setTimeout(() => this.slowLoading.set(true), LOADING_MARKER_MS);
        onCleanup(() => {
          clearTimeout(timer);
          this.slowLoading.set(false);
        });
      }
    });

    // Voice progress is announced once per step, never per percent.
    effect(() => {
      const state = this.tts.state();
      const error = this.tts.error();
      untracked(() => this.onTtsChange(state, error));
    });

    // Playback failures (play() rejected or a media error).
    effect(() => {
      if (this.player.status() === 'error') {
        untracked(() => this.notify(MSG.playError, true));
      }
    });
  }

  // ---------- rows ----------

  /** One tap selects and plays (UX U1). Called straight from the tap so iOS keeps the gesture. */
  protected onRow(sound: SoundEntry): void {
    this.selectedId.set(sound.id);
    this.startPlayback(sound);
    void this.sharer.prefetch(sound);
  }

  // ---------- keys ----------

  /**
   * Pill: KURTI <-> GARSAI (UX 5.12). Keyboard / screen-reader activation (`detail === 0`) moves
   * focus into the new content; pointer and touch keep it on the pill (no surprise keyboard).
   */
  protected onMode(event: MouseEvent): void {
    const viaKeyboard = event.detail === 0;
    this.player.stop();
    this.intent++;
    if (this.mode() === 'sounds') {
      this.mode.set('create');
      this.openCreate();
      if (viaKeyboard) {
        afterNextRender(() => this.focusCreateTarget(), { injector: this.injector });
      }
    } else {
      this.mode.set('sounds');
      this.openPending = false;
      clearTimeout(this.openTimer);
      this.announce(`Frazių sąrašas. Įrašų: ${this.sounds().length}.`);
      if (viaKeyboard) {
        afterNextRender(() => this.lcd().focusList(), { injector: this.injector });
      }
    }
  }

  /** SIŲSTI: shares the selected clip, or (KURTI mode) the generated speech. */
  protected onSend(): void {
    if (this.mode() === 'sounds') {
      void this.onShare();
      return;
    }
    if (this.sharing() || this.generating()) return;
    if (!this.canAct()) {
      this.notifyBlocked();
      return;
    }
    const text = this.text();
    const voice = this.voice();
    // Cached speech: share right here, inside the tap (iOS needs the gesture).
    const blob = this.tts.peek(text, voice);
    if (blob) {
      void this.shareSpeech(blob, text);
      return;
    }
    const intent = ++this.intent;
    void this.generate(text, voice, intent).then((made) => {
      if (made && this.isCurrent(intent)) {
        this.again.set(true);
        this.notify(MSG.ttsAgain);
      }
    });
  }

  /** PALEISTI: unlocks the audio element in the tap, then plays (generating first if needed). */
  protected onPlayText(): void {
    if (this.generating()) return;
    if (!this.canAct()) {
      this.notifyBlocked();
      return;
    }
    this.player.unlock();
    const text = this.text();
    const voice = this.voice();
    const intent = ++this.intent;
    const cached = this.tts.peek(text, voice);
    if (cached) {
      this.playSpeech(cached);
      return;
    }
    void this.generate(text, voice, intent).then((made) => {
      if (made && this.isCurrent(intent)) this.playSpeech(made);
    });
  }

  /** Called inside the tap, so the cached blob lets `navigator.share()` run in the gesture. */
  protected async onShare(): Promise<void> {
    if (this.sharing()) return;
    const sound = this.selected();
    if (!sound) {
      this.notify(MSG.selectFirst);
      return;
    }
    this.sharing.set(true);
    let outcome: ShareOutcome;
    try {
      outcome = await this.sharer.share({
        id: sound.id,
        file: sound.file,
        title: soundLabel(sound),
      });
    } finally {
      this.sharing.set(false);
    }
    this.handleShareOutcome(outcome);
  }

  // ---------- LCD events ----------

  protected onText(text: string): void {
    this.text.set(text);
    this.resetSpeech();
  }

  protected onTextOverflow(): void {
    this.announce(MSG.ttsTooLong);
  }

  protected onVoice(voice: Voice): void {
    if (voice === this.voice()) return;
    this.player.stop();
    this.resetSpeech();
    const current = this.selected();
    this.catalog.setVoice(voice);
    const next = current ? this.catalog.counterpart(current, voice) : undefined;
    this.selectedId.set(next?.id ?? null);
    this.syncSelection();
    const kept = this.selected();
    if (kept) void this.sharer.prefetch(kept);
    const name = `Balsas: ${voice === 'vyras' ? 'Vyras' : 'Moteris'}.`;
    this.announce(this.mode() === 'create' ? name : `${name} Įrašų: ${this.sounds().length}.`);
  }

  protected onQuery(query: string): void {
    this.catalog.query.set(query);
    this.syncSelection();
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      const count = this.sounds().length;
      this.announce(count ? `Įrašų: ${count}` : MSG.noResults);
    }, SEARCH_ANNOUNCE_MS);
  }

  // ---------- helpers ----------

  /** Keyboard users entering KURTI land in the textarea of the TTS panel. */
  private focusCreateTarget(): void {
    this.panel()?.focusText();
  }

  // ---------- KURTI helpers ----------

  /** Entering KURTI: start (or join) the voice download and announce the mode with its size note. */
  private openCreate(): void {
    this.ttsOpened = true;
    void this.tts.prepare();
    clearTimeout(this.openTimer);
    const state = this.tts.state();
    // idle / error: the answer (download, cached, failure) arrives a moment later.
    this.openPending = state === 'idle' || state === 'error';
    if (this.openPending) {
      this.openTimer = setTimeout(() => this.say(''), OPEN_ANNOUNCE_MS);
    } else {
      this.announce(MSG.modeCreate);
    }
  }

  /** Announces `text`, prefixed with the mode message when the open announcement is still due. */
  private say(text: string): void {
    const prefix = this.openPending ? MSG.modeCreate : '';
    this.openPending = false;
    clearTimeout(this.openTimer);
    this.announce([prefix, text].filter(Boolean).join(' '));
  }

  private onTtsChange(state: string, error: TtsErrorReason | null): void {
    const previous = this.previousTts;
    this.previousTts = state;
    if (!this.ttsOpened) return;
    if (state === 'downloading' && previous !== 'downloading') {
      this.say(MSG.ttsDownloading);
    } else if (state === 'ready' && previous !== 'ready' && previous !== 'generating') {
      this.say(MSG.ttsReady);
    } else if (state === 'error' && error) {
      this.say(TTS_ERROR_TEXT[error]);
    }
  }

  /** Text, voice or mode changed: speech made for the old values is no longer "ready to send". */
  private resetSpeech(): void {
    this.intent++;
    this.again.set(false);
    this.problem.set(null);
  }

  private isCurrent(intent: number): boolean {
    return this.mode() === 'create' && this.intent === intent;
  }

  /** Never rejects. Resolves null after reporting the reason. */
  private async generate(text: string, voice: Voice, intent: number): Promise<Blob | null> {
    this.problem.set(null);
    const slow = setTimeout(() => {
      if (this.isCurrent(intent)) this.announce(MSG.ttsGenerating);
    }, GENERATING_ANNOUNCE_MS);
    try {
      return await this.tts.synthesize(text, voice);
    } catch (error) {
      if (this.isCurrent(intent)) this.reportSynthError(error);
      return null;
    } finally {
      clearTimeout(slow);
    }
  }

  private reportSynthError(error: unknown): void {
    const reason = error instanceof TtsError ? error.reason : 'generate';
    if (reason === 'no-chars' || reason === 'generate') this.problem.set(reason);
    this.notify(TTS_ERROR_TEXT[reason], reason !== 'empty');
  }

  /** A tap on a disabled PALEISTI / SIŲSTI says why (UX 5.13). */
  private notifyBlocked(): void {
    if (!this.text().trim()) {
      this.notify(MSG.enterText);
      return;
    }
    switch (this.tts.state()) {
      case 'downloading':
        this.notify(MSG.ttsDownloadWait);
        break;
      case 'error':
        this.notify(TTS_ERROR_TEXT[this.tts.error() ?? 'download'], true);
        break;
      default:
        this.notify(MSG.ttsPreparingWait);
    }
  }

  private playSpeech(blob: Blob): void {
    void this.player.playBlob(SPEECH_ID, blob).then((started) => {
      if (started) {
        this.played.set(true);
        void this.counters.recordPlay();
      }
    });
  }

  private async shareSpeech(blob: Blob, text: string): Promise<void> {
    this.sharing.set(true);
    let outcome: ShareOutcome;
    try {
      const title = text.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX);
      outcome = await this.sharer.shareFile(speechFile(text, blob), title);
    } finally {
      this.sharing.set(false);
    }
    if (outcome === 'shared' || outcome === 'downloaded') this.again.set(false);
    this.handleShareOutcome(outcome);
  }

  private startPlayback(sound: SoundEntry): void {
    void this.player.play(sound).then((started) => {
      if (started) {
        this.played.set(true);
        void this.counters.recordPlay();
      }
    });
  }

  private handleShareOutcome(outcome: ShareOutcome): void {
    switch (outcome) {
      case 'shared':
        void this.counters.recordShare();
        this.notify(MSG.shared);
        this.shareButton().nativeElement.focus();
        break;
      case 'downloaded':
        void this.counters.recordShare();
        this.notify(MSG.downloaded);
        break;
      case 'cancelled':
        this.shareButton().nativeElement.focus();
        break;
      case 'not-allowed':
        this.notify(MSG.shareRetry, true);
        break;
      case 'fetch-error':
        this.notify(MSG.fetchError, true);
        break;
      default:
        this.notify(MSG.shareError, true);
    }
  }

  /** The visible list is what the keys act on: drop a selection the filter hides (UX U8). */
  private syncSelection(): void {
    const id = this.selectedId();
    if (id !== null && !this.sounds().some((s) => s.id === id)) {
      this.selectedId.set(null);
    }
  }

  private notify(text: string, error = false): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, error });
    this.toastTimer = setTimeout(() => this.toast.set(null), error ? TOAST_ERROR_MS : TOAST_MS);
    this.announce(text);
  }

  /** Clear first, then set on a later tick, so a repeated message is announced again. */
  private announce(text: string): void {
    clearTimeout(this.liveTimer);
    this.live.set('');
    this.liveTimer = setTimeout(() => this.live.set(text), LIVE_DELAY_MS);
  }

  private counterText(value: number | null, loaded: boolean): string {
    if (value !== null) return formatCount(value);
    return loaded ? '—' : '…';
  }
}
