import { Service, signal } from '@angular/core';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface PlayableSound {
  readonly id: string;
  readonly file: string;
}

/** One shared HTMLAudioElement. `play()` must be called synchronously from a user gesture. */
@Service()
export class AudioPlayerService {
  readonly playingId = signal<string | null>(null);
  readonly status = signal<PlayerStatus>('idle');

  private audio: HTMLAudioElement | null = null;

  /** Starts the clip, replacing any current one. Resolves true once playback has started. */
  play(sound: PlayableSound): Promise<boolean> {
    const audio = this.element();
    audio.pause();
    this.playingId.set(sound.id);
    this.status.set('loading');
    audio.src = sound.file;
    audio.currentTime = 0;

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
      audio.addEventListener('playing', () => this.status.set('playing'));
      audio.addEventListener('waiting', () => {
        if (this.playingId() !== null) {
          this.status.set('loading');
        }
      });
      audio.addEventListener('ended', () => this.stop());
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
