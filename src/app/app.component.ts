import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlayerService } from './services/audio-player.service';
import { ShareService } from './services/share.service';
import { SoundCatalogService } from './services/sound-catalog.service';
import { SoundEntry } from './models/sound.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly catalogService = inject(SoundCatalogService);
  readonly audioService = inject(AudioPlayerService);
  private readonly shareService = inject(ShareService);

  readonly sounds = signal<SoundEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly canShare = this.shareService.canShareFiles();

  ngOnInit(): void {
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

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(null), 2600);
  }
}
