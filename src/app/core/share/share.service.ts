import { Service } from '@angular/core';

export type ShareOutcome =
  'shared' | 'downloaded' | 'cancelled' | 'not-allowed' | 'fetch-error' | 'error';

export interface ShareableSound {
  readonly id: string;
  readonly file: string;
  /** Title passed to the share sheet. */
  readonly title: string;
}

/**
 * Shares a clip as `racija-<id>.mp3`. The clip is prefetched and cached per id so that
 * `navigator.share()` can run synchronously inside the click (iOS needs transient activation).
 */
@Service()
export class ShareService {
  private readonly blobs = new Map<string, Blob>();
  private readonly pending = new Map<string, Promise<Blob | null>>();

  /** Fetches the clip into the cache. Resolves null when the fetch fails. */
  prefetch(sound: Pick<ShareableSound, 'id' | 'file'>): Promise<Blob | null> {
    const cached = this.blobs.get(sound.id);
    if (cached) {
      return Promise.resolve(cached);
    }
    let request = this.pending.get(sound.id);
    if (!request) {
      request = this.load(sound).finally(() => this.pending.delete(sound.id));
      this.pending.set(sound.id, request);
    }
    return request;
  }

  /** Never rejects. Call it straight from the click handler. */
  async share(sound: ShareableSound): Promise<ShareOutcome> {
    // No await before navigator.share() when the blob is cached, to keep the user gesture.
    const blob = this.blobs.get(sound.id) ?? (await this.prefetch(sound));
    if (!blob) {
      return 'fetch-error';
    }
    return this.shareFile(
      new File([blob], fileName(sound.id), { type: 'audio/mpeg' }),
      sound.title,
    );
  }

  /**
   * Shares any file with the Web Share API, or downloads it when sharing files is unsupported.
   * Never rejects. Nothing is awaited before `navigator.share()`, so call it straight from a tap.
   */
  async shareFile(file: File, title: string): Promise<ShareOutcome> {
    if (this.canShareFile(file)) {
      try {
        await navigator.share({ files: [file], title });
        return 'shared';
      } catch (error) {
        const name = (error as { name?: string } | null)?.name;
        if (name === 'AbortError') {
          return 'cancelled';
        }
        return name === 'NotAllowedError' ? 'not-allowed' : 'error';
      }
    }

    try {
      this.download(file);
      return 'downloaded';
    } catch {
      return 'error';
    }
  }

  private async load(sound: Pick<ShareableSound, 'id' | 'file'>): Promise<Blob | null> {
    try {
      const response = await fetch(sound.file);
      if (!response.ok) {
        return null;
      }
      const blob = await response.blob();
      this.blobs.set(sound.id, blob);
      return blob;
    } catch {
      return null;
    }
  }

  private canShareFile(file: File): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    );
  }

  private download(file: File): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function fileName(id: string): string {
  return `racija-${id}.mp3`;
}
