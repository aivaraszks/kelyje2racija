import { Service, computed, signal } from '@angular/core';
import { normalize } from './normalize';
import { SOUND_CATALOG, SoundEntry, Voice, soundLabel } from './sound-catalog';

export const VOICE_STORAGE_KEY = 'racija-voice';

@Service()
export class SoundCatalogService {
  readonly voice = signal<Voice>(this.readStoredVoice());
  readonly query = signal('');

  /** Sounds of the current voice (plus `nezinoma`) that match the query, in catalog order. */
  readonly visibleSounds = computed<readonly SoundEntry[]>(() => {
    const voice = this.voice();
    const query = normalize(this.query().trim());
    return SOUND_CATALOG.filter(
      (sound) =>
        (sound.voice === voice || sound.voice === 'nezinoma') &&
        (query === '' || normalize(soundLabel(sound)).includes(query)),
    );
  });

  setVoice(voice: Voice): void {
    this.voice.set(voice);
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, voice);
    } catch {
      // Storage may be unavailable (private mode); the choice then lasts for the session only.
    }
  }

  /** Same phrase and variant in `voice`, or undefined (UX U7). */
  counterpart(sound: SoundEntry, voice: Voice): SoundEntry | undefined {
    if (sound.voice === 'nezinoma') {
      return sound;
    }
    return SOUND_CATALOG.find(
      (s) => s.voice === voice && s.text === sound.text && s.variant === sound.variant,
    );
  }

  byId(id: string): SoundEntry | undefined {
    return SOUND_CATALOG.find((s) => s.id === id);
  }

  private readStoredVoice(): Voice {
    try {
      const stored = localStorage.getItem(VOICE_STORAGE_KEY);
      return stored === 'moteris' ? 'moteris' : 'vyras';
    } catch {
      return 'vyras';
    }
  }
}
