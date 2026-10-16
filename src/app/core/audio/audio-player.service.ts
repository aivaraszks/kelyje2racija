import { Service, signal } from '@angular/core';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface PlayableSound {
  readonly id: string;
  readonly file: string;
}

/** 1-sample silent WAV, used only to unlock the shared element inside a tap (iOS). */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQIAAAAAAA==';

/** One shared HTMLAudioElement. `play()` must be called synchronously from a user gesture. */
@Service()
export class AudioPlayerService {
  readonly playingId = signal<string | null>(null);
  readonly status = signal<PlayerStatus>('idle');

  private audio: HTMLAudioElement | null = null;
  private unlocked = false;
  private objectUrl: string | null = null;

  /**
   * Call synchronously inside a user gesture before async work (such as generating speech), so
   * that a later `play()` outside the gesture is allowed on iOS. Does nothing once unlocked or
   * while a clip is playing.
   */
  unlock(): void {
    if (this.unlocked || this.playingId() !== null) {
      return;
    }
    const audio = this.element();
    audio.src = SILENT_WAV;
    try {
      const result: Promise<void> | undefined = audio.play();
      void Promise.resolve(result).then(
        () => (this.unlocked = true),
        () => undefined,
      );
    } catch {
      return;
    }
    audio.pause();
  }

  /** Plays generated speech from a Blob. Like `play()`, call it synchronously from a tap. */
  playBlob(id: string, blob: Blob): Promise<boolean> {
    const url = URL.createObjectURL(blob);
    const result = this.play({ id, file: url });
    this.objectUrl = url;
    return result;
  }

  /** Starts the clip, replacing any current one. Resolves true once playback has started. */
  play(sound: PlayableSound): Promise<boolean> {
    const audio = this.element();
    audio.pause();
    this.playingId.set(sound.id);
    this.status.set('loading');
    audio.src = sound.file;
    audio.currentTime = 0;
    this.releaseObjectUrl(sound.file);

    let result: Promise<void> | undefined;
    try {
      result = audio.play();
    } catch {
      this.fail(sound.id);
      return Promise.resolve(false);
    }
    return Promise.resolve(result).then(
      () => this.playingId() === sound.id,
      () => {
        this.fail(sound.id);
        return false;
      },
    );
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.playingId.set(null);
    this.status.set('idle');
  }

  /** Revokes the speech URL unless it is the one now loaded. */
  private releaseObjectUrl(keep: string): void {
    if (this.objectUrl && this.objectUrl !== keep) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private fail(id: string): void {
    // A newer clip may already have replaced this one (play() interrupted by a new load).
    if (this.playingId() === id) {
      this.status.set('error');
      this.playingId.set(null);
    }
  }

  private element(): HTMLAudioElement {
    if (!this.audio) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.addEventListener('playing', () => {
        if (this.playingId() !== null) {
          this.status.set('playing');
        }
      });
      audio.addEventListener('waiting', () => {
        if (this.playingId() !== null) {
          this.status.set('loading');
        }
      });
      audio.addEventListener('ended', () => {
        if (this.playingId() !== null) {
          this.stop();
        }
      });
      audio.addEventListener('error', () => {
        const id = this.playingId();
        if (id !== null) {
          this.fail(id);
        }
      });
      this.audio = audio;
    }
    return this.audio;
  }
}
