import { Component, inject, OnInit, signal } from '@angular/core';
import { AudioPlayerService } from './services/audio-player.service';
import { SoundCatalogService } from './services/sound-catalog.service';
import { TtsService } from './services/tts.service';
import { SoundEntry } from './models/sound.model';
import { WalkieTalkieComponent } from './components/walkie-talkie/walkie-talkie.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WalkieTalkieComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly catalogService = inject(SoundCatalogService);
  private readonly ttsService = inject(TtsService);

  readonly sounds = signal<SoundEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);

  ngOnInit(): void {
    if (this.ttsService.isSpeechSupported()) {
      void this.ttsService.prepareModel(() => {}).catch(() => {});
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

  showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(null), 2600);
  }
}
