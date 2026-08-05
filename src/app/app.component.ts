import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioPlayerService } from './services/audio-player.service';
import { ShareService } from './services/share.service';
import { SoundCatalogService } from './services/sound-catalog.service';
import { TtsGender, TtsService } from './services/tts.service';
import { SoundEntry } from './models/sound.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly catalogService = inject(SoundCatalogService);
  readonly audioService = inject(AudioPlayerService);
  private readonly shareService = inject(ShareService);
  private readonly ttsService = inject(TtsService);

  readonly sounds = signal<SoundEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly canShare = this.shareService.canShareFiles();
  readonly customText = signal('');
  readonly customGender = signal<TtsGender>('vyras');
  readonly ttsBusy = signal(false);
  readonly ttsSupported = this.ttsService.isSpeechSupported();
  readonly ttsModelLoading = signal<string | null>(null);

  ngOnInit(): void {
    if (this.ttsSupported) {
      void this.ttsService.prepareModel((progress) => {
        const percent =
          progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
        const label =
          progress.phase === 'model'
            ? 'Balso modelis'
            : progress.phase === 'tokens'
              ? 'Simboliai'
              : 'WASM';
        this.ttsModelLoading.set(`Ruošiamas ${label}… ${percent}%`);
      }).then(() => {
        this.ttsModelLoading.set(null);
      }).catch(() => {
        this.ttsModelLoading.set(null);
      });
    }

    this.catalogService.loadCatalog().subscribe({
      next: (sounds) => {
        this.sounds.set(sounds);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nepavyko įkelti garsų katalogo');
        this.loading.set(false);
      },
    });
  }

  isPlaying(id: string): boolean {
    return this.audioService.playingId() === id;
  }

  playLabel(id: string): string {
    return this.isPlaying(id) ? '⏸ Sustabdyti' : '▶ Grok';
  }

  onPlay(sound: SoundEntry): void {
    const result = this.audioService.toggle(sound, this.soundUrl(sound));
    if (result === 'error') {
      this.showToast('Nepavyko paleisti garso');
    }
  }

  async onShare(sound: SoundEntry): Promise<void> {
    try {
      const result = await this.shareService.shareSound(sound, this.soundUrl(sound));
      if (result === 'downloaded') {
        this.showToast('Atsisiųsta – gali pridėti prie žinutės');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      this.showToast('Dalinimasis nepavyko – bandyk mobiliajame naršyklėje');
    }
  }

  private soundUrl(sound: SoundEntry): string {
    return `assets/${sound.file.replace(/^\//, '')}`;
  }

  async onCustomShare(): Promise<void> {
    const text = this.customText().trim();
    if (!text) {
      this.showToast('Įvesk tekstą');
      return;
    }

    this.ttsBusy.set(true);
    this.audioService.stop();
    this.ttsService.stopSpeaking();

    try {
      const blob = await this.ttsService.synthesize(text, this.customGender());
      const filename = `${this.slugify(text)}-${this.customGender()}.${this.fileExtension(blob.type)}`;
      const title = `${text} (${this.customGender()})`;
      const result = await this.shareService.shareBlob(blob, filename, title);
      if (result === 'downloaded') {
        this.showToast('Atsisiųsta – gali pridėti prie žinutės');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      this.showToast(
        error instanceof Error ? error.message : 'Nepavyko sugeneruoti garso',
      );
    } finally {
      this.ttsBusy.set(false);
    }
  }

  async onCustomPreview(): Promise<void> {
    const text = this.customText().trim();
    if (!text) {
      this.showToast('Įvesk tekstą');
      return;
    }

    this.audioService.stop();
    this.ttsBusy.set(true);

    try {
      await this.ttsService.speak(text, this.customGender());
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Nepavyko paleisti');
    } finally {
      this.ttsBusy.set(false);
    }
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

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(null), 2600);
  }
}
