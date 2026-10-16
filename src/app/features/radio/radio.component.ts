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
import { LcdScreen, SEARCH_ID } from './lcd-screen.component';
import { RadioButton } from './radio-button.component';
import { RadioCable, RadioGrille, RadioLogo } from './radio-graphics.components';

interface Toast {
  readonly text: string;
  readonly error: boolean;
}

const TOAST_MS = 6000;
const TOAST_ERROR_MS = 10_000;
const SEARCH_ANNOUNCE_MS = 500;
const LOADING_MARKER_MS = 300;
const LIVE_DELAY_MS = 30;

export const MSG = {
  selectFirst: 'Pirmiausia pasirinkite frazę.',
  shared: 'Išsiųsta.',
  downloaded: 'Atsisiųsta – pridėkite failą prie žinutės.',
  shareRetry: 'Bandykite dar kartą.',
  shareError: 'Nepavyko išsiųsti. Bandykite dar kartą.',
  fetchError: 'Nepavyko įkelti garso. Patikrinkite ryšį.',
  playError: 'Nepavyko paleisti garso.',
  stopped: 'Sustabdyta.',
  noResults: 'Nieko nerasta.',
} as const;

/** Number with a non-breaking space as the thousands separator: "1 234". */
export function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** The RACIJA page: radio body, wiring between LCD / keys and the core services, page furniture. */
@Component({
  selector: 'app-radio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcdScreen, RadioButton, RadioLogo, RadioCable, RadioGrille],
  templateUrl: './radio.component.html',
  styleUrl: './radio.component.css',
})
export class Radio {
  private readonly catalog = inject(SoundCatalogService);
  private readonly player = inject(AudioPlayerService);
  private readonly sharer = inject(ShareService);
  private readonly counters = inject(CounterService);
  private readonly injector = inject(Injector);

  private readonly lcd = viewChild.required(LcdScreen);
  private readonly searchButton = viewChild.required('searchButton', {
    read: ElementRef,
  });
  private readonly shareButton = viewChild.required('shareButton', {
    read: ElementRef,
  });

  protected readonly searchId = SEARCH_ID;
  protected readonly sounds = this.catalog.visibleSounds;
  protected readonly voice = this.catalog.voice;
  protected readonly query = this.catalog.query;
  protected readonly playingId = this.player.playingId;

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return id === null ? undefined : this.catalog.byId(id);
  });
  protected readonly searchOpen = signal(false);
  protected readonly sharing = signal(false);
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

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.toastTimer);
      clearTimeout(this.liveTimer);
      clearTimeout(this.searchTimer);
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

  protected onAccept(): void {
    if (this.player.playingId() !== null) {
      this.player.stop();
      this.announce(MSG.stopped);
      return;
    }
    const sound = this.selected();
    if (!sound) {
      this.notify(MSG.selectFirst);
      return;
    }
    this.startPlayback(sound);
    this.announce(`Grojama: ${soundLabel(sound)}`);
  }

  protected toggleSearch(): void {
    if (this.searchOpen()) {
      this.closeSearch();
      return;
    }
    this.searchOpen.set(true);
    afterNextRender(() => this.lcd().focusSearch(), { injector: this.injector });
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    clearTimeout(this.searchTimer);
    this.catalog.query.set('');
    this.syncSelection();
    this.searchButton().nativeElement.focus();
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

  protected onVoice(voice: Voice): void {
    if (voice === this.voice()) return;
    this.player.stop();
    const current = this.selected();
    this.catalog.setVoice(voice);
    const next = current ? this.catalog.counterpart(current, voice) : undefined;
    this.selectedId.set(next?.id ?? null);
    this.syncSelection();
    const kept = this.selected();
    if (kept) void this.sharer.prefetch(kept);
    this.announce(
      `Balsas: ${voice === 'vyras' ? 'Vyras' : 'Moteris'}. Įrašų: ${this.sounds().length}.`,
    );
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
