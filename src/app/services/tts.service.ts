import { Injectable } from '@angular/core';
import { playAudioElement } from '../utils/audio-playback';
import {
  isPiperWasmSupported,
  PiperDownloadProgress,
  preloadPiperWasmModel,
  synthesizeWithPiperWasm,
  TtsGender,
} from './piper-tts.client';

export type { TtsGender };

const MAX_TEXT_LENGTH = 220;

@Injectable({ providedIn: 'root' })
export class TtsService {
  private previewAudio: HTMLAudioElement | null = null;
  private previewObjectUrl: string | null = null;
  private modelReady = false;
  private modelInitPromise: Promise<void> | null = null;
  private downloadProgress: PiperDownloadProgress | null = null;

  isSpeechSupported(): boolean {
    return isPiperWasmSupported();
  }

  getDownloadProgress(): PiperDownloadProgress | null {
    return this.downloadProgress;
  }

  isModelReady(): boolean {
    return this.modelReady;
  }

  async prepareModel(onProgress?: (progress: PiperDownloadProgress) => void): Promise<void> {
    if (this.modelReady) {
      return;
    }

    if (this.modelInitPromise) {
      await this.modelInitPromise;
      return;
    }

    this.modelInitPromise = preloadPiperWasmModel((progress) => {
      this.downloadProgress = progress;
      onProgress?.(progress);
    })
      .then(() => {
        this.modelReady = true;
        this.downloadProgress = null;
      })
      .finally(() => {
        this.modelInitPromise = null;
      });

    await this.modelInitPromise;
  }

  async synthesize(text: string, gender: TtsGender): Promise<Blob> {
    const normalized = this.validateText(text);
    await this.prepareModel();
    return synthesizeWithPiperWasm(normalized, gender);
  }

  async speak(text: string, gender: TtsGender): Promise<void> {
    const normalized = this.validateText(text);
    this.stopSpeaking();

    const blob = await this.synthesize(normalized, gender);
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    this.previewAudio = audio;
    this.previewObjectUrl = objectUrl;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        this.clearPreview();
        resolve();
      };
      audio.onerror = () => {
        this.clearPreview();
        reject(new Error('Nepavyko paleisti lietuviško garso'));
      };
      void playAudioElement(audio).catch(reject);
    });
  }

  stopSpeaking(): void {
    if (this.previewAudio) {
      this.previewAudio.pause();
      this.previewAudio.currentTime = 0;
    }
    this.clearPreview();
  }

  private validateText(text: string): string {
    const normalized = text.trim();
    if (!normalized) {
      throw new Error('Įvesk tekstą');
    }
    if (normalized.length > MAX_TEXT_LENGTH) {
      throw new Error(`Tekstas per ilgas (max ${MAX_TEXT_LENGTH} simbolių)`);
    }
    return normalized;
  }

  private clearPreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewAudio = null;
  }
}
