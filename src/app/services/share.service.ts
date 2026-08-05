import { Injectable } from '@angular/core';
import { SoundEntry } from '../models/sound.model';

@Injectable({ providedIn: 'root' })
export class ShareService {
  canShareFiles(): boolean {
    return typeof navigator.canShare === 'function';
  }

  async shareSound(sound: SoundEntry, url: string): Promise<'shared' | 'downloaded'> {
    const filename = sound.file.split('/').pop() ?? `${sound.id}.wav`;
    const mimeType = filename.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Nepavyko gauti garso failo');
    }

    const blob = await response.blob();
    const file = new File([blob], filename, { type: mimeType });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: sound.title,
        text: sound.title,
      });
      return 'shared';
    }

    this.downloadBlob(blob, filename);
    return 'downloaded';
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }
}
