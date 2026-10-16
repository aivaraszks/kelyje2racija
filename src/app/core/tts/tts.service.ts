import { InjectionToken, Service, inject, signal } from '@angular/core';
import type { Voice } from '../sounds/sound-catalog';
import { isStored, MODEL_FILE, TOKENS_FILE } from './model-cache';
import { hasSpeakableLetters } from './pcm';
import type { EngineProgress, TtsEngine } from './tts-engine';

export type TtsState = 'idle' | 'downloading' | 'preparing' | 'ready' | 'generating' | 'error';

/**
 * Why speech is not available or failed.
 * - `unsupported`, `offline`, `download`, `create` are set on `TtsService.error` and block the voice.
 * - `empty`, `too-long`, `no-chars`, `generate` are only thrown by `synthesize()`.
 */
export type TtsErrorReason =
  | 'unsupported'
  | 'offline'
  | 'download'
  | 'create'
  | 'generate'
  | 'empty'
  | 'too-long'
  | 'no-chars';

export class TtsError extends Error {
  constructor(readonly reason: TtsErrorReason) {
    super(reason);
    this.name = 'TtsError';
  }
}

export interface TtsProgress {
  readonly phase: 'model' | 'wasm';
  readonly loaded: number;
  readonly total: number;
}

export const TTS_MAX_LENGTH = 220;
/** Download size of the voice model in bytes (shown as "apie 71 MB"). */
export const TTS_MODEL_BYTES = MODEL_FILE.size;

/**
 * Loads the engine module. The only place that reaches `tts-engine.ts`, and only through a
 * dynamic `import()`, so onnxruntime-web stays out of the initial bundle. Overridable in tests.
 */
export const TTS_ENGINE_LOADER = new InjectionToken<
  () => Promise<{ loadEngine(onProgress?: (p: EngineProgress) => void): Promise<TtsEngine> }>
>('TTS_ENGINE_LOADER', { factory: () => () => import('./tts-engine') });

/** True when the model files are already stored (no download needed). Overridable in tests. */
export const TTS_MODEL_PROBE = new InjectionToken<() => Promise<boolean>>('TTS_MODEL_PROBE', {
  factory: () => async () => (await isStored(TOKENS_FILE)) && (await isStored(MODEL_FILE)),
});

const PROGRESS_INTERVAL_MS = 250;
const MAX_CACHED_CLIPS = 20;

/**
 * Lithuanian text-to-speech. onnxruntime-web and the ~71 MB model are loaded lazily:
 * `prepare()` (called when KURTI opens) downloads the model if it is not cached, then creates
 * the ONNX session. Leaving KURTI never cancels it. Generated clips are cached by text + voice.
 */
@Service()
export class TtsService {
  readonly state = signal<TtsState>('idle');
  readonly progress = signal<TtsProgress>({ phase: 'model', loaded: 0, total: TTS_MODEL_BYTES });
  /** Set while `state` is `error`: unsupported, offline, download or create. */
  readonly error = signal<TtsErrorReason | null>(null);

  private readonly loadEngineModule = inject(TTS_ENGINE_LOADER);
  private readonly isModelStored = inject(TTS_MODEL_PROBE);
  private engine: TtsEngine | null = null;
  private preparing: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly clips = new Map<string, Blob>();
  private readonly inFlight = new Map<string, Promise<Blob>>();
  private lastProgressAt = 0;

  isSupported(): boolean {
    return (
      typeof WebAssembly !== 'undefined' &&
      typeof fetch === 'function' &&
      typeof Blob !== 'undefined'
    );
  }

  /**
   * Downloads the model when needed and prepares the session. Safe to call repeatedly: it
   * joins a run in progress, does nothing once ready and retries after an error. Never rejects;
   * read `state` and `error`.
   */
  prepare(): Promise<void> {
    if (this.engine) {
      return Promise.resolve();
    }
    this.preparing ??= this.run().finally(() => (this.preparing = null));
    return this.preparing;
  }

  /**
   * Returns the speech for this text and voice. Prepares the model first when needed.
   * Rejects with a `TtsError`.
   */
  synthesize(text: string, voice: Voice): Promise<Blob> {
    let clean: string;
    try {
      clean = this.validate(text);
    } catch (error) {
      return Promise.reject(error);
    }
    const key = clipKey(clean, voice);
    const cached = this.clips.get(key);
    if (cached) {
      return Promise.resolve(cached);
    }
    let request = this.inFlight.get(key);
    if (!request) {
      request = this.enqueue(() => this.generate(clean, voice, key)).finally(() =>
        this.inFlight.delete(key),
      );
      this.inFlight.set(key, request);
    }
    return request;
  }

  /** The already generated speech, if any. Lets the caller share synchronously inside a tap. */
  peek(text: string, voice: Voice): Blob | null {
    const clean = text.replace(/\s+/g, ' ').trim();
    return this.clips.get(clipKey(clean, voice)) ?? null;
  }

  private async run(): Promise<void> {
    this.error.set(null);
    if (!this.isSupported()) {
      return this.fail('unsupported');
    }
    const cached = await this.isModelStored();
    if (!cached && typeof navigator !== 'undefined' && navigator.onLine === false) {
      window.addEventListener('online', () => void this.prepare(), { once: true });
      return this.fail('offline');
    }

    this.progress.set({ phase: 'model', loaded: 0, total: TTS_MODEL_BYTES });
    this.state.set(cached ? 'preparing' : 'downloading');
    try {
      const { loadEngine } = await this.loadEngineModule();
      this.engine = await loadEngine((p) => this.onProgress(p));
      this.state.set('ready');
    } catch {
      const downloading = this.state() === 'downloading';
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      this.fail(downloading ? (offline ? 'offline' : 'download') : 'create');
    }
  }

  private onProgress(p: {
    phase: 'tokens' | 'model' | 'wasm';
    loaded: number;
    total: number;
  }): void {
    if (p.phase === 'wasm') {
      this.state.set('preparing');
      return;
    }
    if (p.phase !== 'model') {
      return;
    }
    const now = Date.now();
    if (p.loaded >= p.total || now - this.lastProgressAt >= PROGRESS_INTERVAL_MS) {
      this.lastProgressAt = now;
      this.progress.set({ phase: 'model', loaded: p.loaded, total: p.total });
    }
  }

  private async generate(text: string, voice: Voice, key: string): Promise<Blob> {
    if (!this.engine) {
      await this.prepare();
    }
    const engine = this.engine;
    if (!engine) {
      throw new TtsError(this.error() ?? 'create');
    }
    this.state.set('generating');
    try {
      const blob = await engine.synthesize(text, voice);
      this.remember(key, blob);
      return blob;
    } catch (error) {
      throw new TtsError(
        (error as Error | null)?.name === 'NoSpeakableCharsError' ? 'no-chars' : 'generate',
      );
    } finally {
      this.state.set('ready');
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private validate(text: string): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) {
      throw new TtsError('empty');
    }
    if (clean.length > TTS_MAX_LENGTH) {
      throw new TtsError('too-long');
    }
    if (!hasSpeakableLetters(clean)) {
      throw new TtsError('no-chars');
    }
    return clean;
  }

  private remember(key: string, blob: Blob): void {
    this.clips.delete(key);
    this.clips.set(key, blob);
    if (this.clips.size > MAX_CACHED_CLIPS) {
      this.clips.delete(this.clips.keys().next().value as string);
    }
  }

  private fail(reason: TtsErrorReason): void {
    this.error.set(reason);
    this.state.set('error');
  }
}

function clipKey(text: string, voice: Voice): string {
  return `${voice}|${text}`;
}
