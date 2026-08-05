import { Injectable, signal } from '@angular/core';
import { SoundEntry } from '../models/sound.model';

@Injectable({ providedIn: 'root' })
export class AudioPlayerService {
  private audio: HTMLAudioElement | null = null;
  readonly playingId = signal<string | null>(null);

  toggle(sound: SoundEntry, url: string): 'playing' | 'stopped' | 'error' {
    if (this.playingId() === sound.id && this.audio) {
      this.stop();
      return 'stopped';
    }

    this.stop();
    this.audio = new Audio(url);
    this.playingId.set(sound.id);

    this.audio.addEventListener('ended', () => this.stop());

    void this.audio.play().catch(() => {
      this.stop();
    });

    return this.playingId() === sound.id ? 'playing' : 'error';
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.playingId.set(null);
  }
}
