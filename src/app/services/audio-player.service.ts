import { Injectable, signal } from '@angular/core';
import { SoundEntry } from '../models/sound.model';
import { playAudioElement } from '../utils/audio-playback';

@Injectable({ providedIn: 'root' })
export class AudioPlayerService {
  private audio: HTMLAudioElement | null = null;
  private playGeneration = 0;
  readonly playingId = signal<string | null>(null);

  toggle(sound: SoundEntry, url: string): 'playing' | 'stopped' | 'error' {
    if (this.playingId() === sound.id && this.audio) {
      this.stop();
      return 'stopped';
    }

    return this.play(sound, url);
  }

  play(sound: SoundEntry, url: string): 'playing' | 'error' {
    this.stop();
    this.playingId.set(sound.id);
    void this.startPlayback(url, sound.id);
    return 'playing';
  }

  stop(): void {
    this.playGeneration += 1;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.playingId.set(null);
  }

  private async startPlayback(url: string, soundId: string): Promise<void> {
    const generation = this.playGeneration;
    const audio = new Audio(url);
    this.audio = audio;

    audio.addEventListener('ended', () => {
      if (this.playGeneration === generation) {
        this.stop();
      }
    });

    try {
      await playAudioElement(audio);
      if (this.playGeneration !== generation || this.playingId() !== soundId) {
        audio.pause();
      }
    } catch {
      if (this.playGeneration === generation) {
        this.stop();
      }
    }
  }
}
