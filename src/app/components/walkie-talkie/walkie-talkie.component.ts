import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SoundEntry } from '../../models/sound.model';
import { AudioPlayerService } from '../../services/audio-player.service';
import { PlayCounterService } from '../../services/play-counter.service';
import { ShareService } from '../../services/share.service';
import { TtsGender, TtsService } from '../../services/tts.service';

/** Racijos fono paveikslėlio matmenys – fiksuotas aspect ratio. */
const SHELL_WIDTH = 556;
const SHELL_HEIGHT = 1024;

type SpeakerGender = TtsGender;
type SoundGender = SpeakerGender | 'nezinoma';
type WalkieMode = 'sounds' | 'create';

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
  readonly playCounter = inject(PlayCounterService);
  private readonly shareService = inject(ShareService);
  private readonly ttsService = inject(TtsService);

  readonly mode = signal<WalkieMode>('sounds');
  readonly selectedId = signal<string | null>(null);
  readonly speakerGender = signal<SpeakerGender>('vyras');
  readonly customText = signal('');
  readonly ttsBusy = signal(false);

  readonly filteredSounds = computed(() =>
    this.sounds().filter((sound) => this.matchesSpeakerGender(sound, this.speakerGender())),
  );

  readonly leftButtonLabel = computed(() =>
    this.mode() === 'sounds' ? 'KURTI' : 'GARSAI',
  );

  isPlaying(id: string): boolean {
    return this.audioService.playingId() === id;
  }

  onSoundClick(sound: SoundEntry): void {
    this.ttsService.stopSpeaking();
    this.selectedId.set(sound.id);
    const result = this.audioService.play(sound, this.soundUrl(sound));
    if (result === 'error') {
      this.emitToast('Nepavyko paleisti garso');
      return;
    }

    this.playCounter.recordPlay();
  }

  setSpeakerGender(gender: SpeakerGender): void {
    this.speakerGender.set(gender);

    if (this.mode() !== 'sounds') {
      return;
    }

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

  onLeftButton(): void {
    if (this.mode() === 'sounds') {
      this.enterCreateMode();
      return;
    }

    this.enterSoundsMode();
  }

  async onPreviewTts(): Promise<void> {
    const text = this.customText().trim();
    if (!text) {
      this.emitToast('Įvesk tekstą');
      return;
    }

    if (!this.ttsService.isSpeechSupported()) {
      this.emitToast('TTS nepalaikoma šioje naršyklėje');
      return;
    }

    this.audioService.stop();
    this.ttsBusy.set(true);

    try {
      await this.ttsService.speak(text, this.speakerGender());
      this.playCounter.recordPlay();
    } catch (error) {
      this.emitToast(error instanceof Error ? error.message : 'Nepavyko paleisti');
    } finally {
      this.ttsBusy.set(false);
    }
  }

  async onSiusti(): Promise<void> {
    if (this.mode() === 'create') {
      await this.shareCustomPhrase();
      return;
    }

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

  private enterCreateMode(): void {
    this.audioService.stop();
    this.mode.set('create');
  }

  private enterSoundsMode(): void {
    this.ttsService.stopSpeaking();
    this.mode.set('sounds');
  }

  private async shareCustomPhrase(): Promise<void> {
    const text = this.customText().trim();
    if (!text) {
      this.emitToast('Įvesk tekstą');
      return;
    }

    if (!this.ttsService.isSpeechSupported()) {
      this.emitToast('TTS nepalaikoma šioje naršyklėje');
      return;
    }

    this.ttsBusy.set(true);
    this.audioService.stop();
    this.ttsService.stopSpeaking();

    try {
      const blob = await this.ttsService.synthesize(text, this.speakerGender());
      const filename = `${this.slugify(text)}-${this.speakerGender()}.${this.fileExtension(blob.type)}`;
      const title = `${text} (${this.speakerGender()})`;
      const result = await this.shareService.shareBlob(blob, filename, title);
      if (result === 'downloaded') {
        this.emitToast('Atsisiųsta – gali pridėti prie žinutės');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      this.emitToast(
        error instanceof Error ? error.message : 'Nepavyko sugeneruoti garso',
      );
    } finally {
      this.ttsBusy.set(false);
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

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'garsas';
  }

  private fileExtension(mimeType: string): string {
    if (mimeType.includes('wav')) {
      return 'wav';
    }
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
      return 'mp3';
    }
    if (mimeType.includes('webm')) {
      return 'webm';
    }
    return 'audio';
  }

  private emitToast(message: string): void {
    this.toast.emit(message);
  }
}
