import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SoundEntry } from '../../models/sound.model';
import { AudioPlayerService } from '../../services/audio-player.service';
import { ShareService } from '../../services/share.service';

/** Racijos fono paveikslėlio matmenys – fiksuotas aspect ratio. */
const SHELL_WIDTH = 556;
const SHELL_HEIGHT = 1024;

type SpeakerGender = 'vyras' | 'moteris';
type SoundGender = SpeakerGender | 'nezinoma';

@Component({
  selector: 'app-walkie-talkie',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './walkie-talkie.component.html',
  styleUrl: './walkie-talkie.component.css',
})
export class WalkieTalkieComponent {
  readonly shellWidth = SHELL_WIDTH;
  readonly shellHeight = SHELL_HEIGHT;

  readonly sounds = input<SoundEntry[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly toast = output<string>();

  readonly audioService = inject(AudioPlayerService);
  private readonly shareService = inject(ShareService);

  readonly selectedId = signal<string | null>(null);
  readonly speakerGender = signal<SpeakerGender>('vyras');

  readonly filteredSounds = computed(() =>
    this.sounds().filter((sound) => this.matchesSpeakerGender(sound, this.speakerGender())),
  );

  isPlaying(id: string): boolean {
    return this.audioService.playingId() === id;
  }

  onSoundClick(sound: SoundEntry): void {
    this.selectedId.set(sound.id);
    const result = this.audioService.play(sound, this.soundUrl(sound));
    if (result === 'error') {
      this.emitToast('Nepavyko paleisti garso');
    }
  }

  setSpeakerGender(gender: SpeakerGender): void {
    this.speakerGender.set(gender);

    const selectedId = this.selectedId();
    if (!selectedId) {
      return;
    }

    const stillVisible = this.filteredSounds().some((sound) => sound.id === selectedId);
    if (!stillVisible) {
      this.selectedId.set(null);
      this.audioService.stop();
    }
  }

  onGroti(): void {
    const sound = this.selectedSound();
    if (!sound) {
      this.emitToast('Pasirink garsą iš sąrašo');
      return;
    }

    const result = this.audioService.play(sound, this.soundUrl(sound));
    if (result === 'error') {
      this.emitToast('Nepavyko paleisti garso');
    }
  }

  async onDalintis(): Promise<void> {
    const sound = this.selectedSound();
    if (!sound) {
      this.emitToast('Pasirink garsą iš sąrašo');
      return;
    }

    try {
      const result = await this.shareService.shareSound(sound, this.soundUrl(sound));
      if (result === 'downloaded') {
        this.emitToast('Atsisiųsta – gali pridėti prie žinutės');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      this.emitToast('Dalinimasis nepavyko – bandyk mobiliajame naršyklėje');
    }
  }

  private selectedSound(): SoundEntry | null {
    const id = this.selectedId();
    if (!id) {
      return null;
    }
    return this.filteredSounds().find((s) => s.id === id)
      ?? this.sounds().find((s) => s.id === id)
      ?? null;
  }

  private matchesSpeakerGender(sound: SoundEntry, gender: SpeakerGender): boolean {
    const soundGender = this.resolveSoundGender(sound);
    return soundGender === gender || soundGender === 'nezinoma';
  }

  private resolveSoundGender(sound: SoundEntry): SoundGender {
    if (sound.id.endsWith('-vyras')) {
      return 'vyras';
    }
    if (sound.id.endsWith('-moteris')) {
      return 'moteris';
    }
    if (sound.id.endsWith('-nezinoma')) {
      return 'nezinoma';
    }

    const title = sound.title.toLowerCase();
    if (title.includes('(vyras)')) {
      return 'vyras';
    }
    if (title.includes('(moteris)')) {
      return 'moteris';
    }
    if (title.includes('(nezinoma)')) {
      return 'nezinoma';
    }

    return 'nezinoma';
  }

  private soundUrl(sound: SoundEntry): string {
    return `assets/${sound.file.replace(/^\//, '')}`;
  }

  private emitToast(message: string): void {
    this.toast.emit(message);
  }
}
