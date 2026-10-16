import { TestBed } from '@angular/core/testing';
import {
  TTS_ENGINE_LOADER,
  TTS_MAX_LENGTH,
  TTS_MODEL_PROBE,
  TtsError,
  TtsService,
} from './tts.service';

const mocks = { loadEngine: vi.fn(), isStored: vi.fn() };

function setOnline(online: boolean): void {
  vi.stubGlobal('navigator', { onLine: online });
}

describe('TtsService', () => {
  let service: TtsService;
  let synthesize: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setOnline(true);
    synthesize = vi.fn(() => Promise.resolve(new Blob(['wav'], { type: 'audio/wav' })));
    mocks.isStored.mockResolvedValue(false);
    mocks.loadEngine.mockImplementation(
      (onProgress: (p: { phase: string; loaded: number; total: number }) => void) => {
        onProgress({ phase: 'model', loaded: 100, total: 200 });
        onProgress({ phase: 'model', loaded: 200, total: 200 });
        onProgress({ phase: 'wasm', loaded: 0, total: 1 });
        return Promise.resolve({ synthesize });
      },
    );
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TTS_ENGINE_LOADER,
          useValue: () => Promise.resolve({ loadEngine: mocks.loadEngine }),
        },
        { provide: TTS_MODEL_PROBE, useValue: mocks.isStored },
      ],
    });
    service = TestBed.inject(TtsService);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('starts idle with no error', () => {
    expect(service.state()).toBe('idle');
    expect(service.error()).toBeNull();
  });

  it('downloads, then prepares, then is ready', async () => {
    const states: string[] = [];
    mocks.loadEngine.mockImplementationOnce(
      (onProgress: (p: { phase: string; loaded: number; total: number }) => void) => {
        states.push(service.state());
        onProgress({ phase: 'model', loaded: 200, total: 200 });
        onProgress({ phase: 'wasm', loaded: 0, total: 1 });
        states.push(service.state());
        return Promise.resolve({ synthesize });
      },
    );
    await service.prepare();
    expect(states).toEqual(['downloading', 'preparing']);
    expect(service.state()).toBe('ready');
    expect(service.progress()).toEqual({ phase: 'model', loaded: 200, total: 200 });
  });

  it('skips the downloading state when the model is cached', async () => {
    mocks.isStored.mockResolvedValue(true);
    const seen: string[] = [];
    mocks.loadEngine.mockImplementationOnce(() => {
      seen.push(service.state());
      return Promise.resolve({ synthesize });
    });
    await service.prepare();
    expect(seen).toEqual(['preparing']);
    expect(service.state()).toBe('ready');
  });

  it('joins a run in progress and does nothing once ready', async () => {
    const first = service.prepare();
    const second = service.prepare();
    await Promise.all([first, second]);
    await service.prepare();
    expect(mocks.loadEngine).toHaveBeenCalledTimes(1);
  });

  it('reports a download error and retries from prepare()', async () => {
    mocks.loadEngine.mockRejectedValueOnce(new Error('network'));
    await service.prepare();
    expect(service.state()).toBe('error');
    expect(service.error()).toBe('download');
    await service.prepare();
    expect(service.state()).toBe('ready');
    expect(service.error()).toBeNull();
  });

  it('reports a create error when the session fails after the download', async () => {
    mocks.isStored.mockResolvedValue(true);
    mocks.loadEngine.mockRejectedValueOnce(new Error('out of memory'));
    await service.prepare();
    expect(service.error()).toBe('create');
  });

  it('reports offline without downloading and restarts when back online', async () => {
    setOnline(false);
    const listeners: (() => void)[] = [];
    vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, fn: () => void) => {
      if (type === 'online') listeners.push(fn);
    }) as typeof window.addEventListener);
    await service.prepare();
    expect(service.error()).toBe('offline');
    expect(mocks.loadEngine).not.toHaveBeenCalled();

    setOnline(true);
    listeners.forEach((fn) => fn());
    await vi.waitFor(() => expect(service.state()).toBe('ready'));
    vi.restoreAllMocks();
  });

  it('works offline when the model is cached', async () => {
    setOnline(false);
    mocks.isStored.mockResolvedValue(true);
    await service.prepare();
    expect(service.state()).toBe('ready');
  });

  it('reports unsupported without WebAssembly', async () => {
    vi.stubGlobal('WebAssembly', undefined);
    await service.prepare();
    expect(service.error()).toBe('unsupported');
    expect(mocks.loadEngine).not.toHaveBeenCalled();
  });

  it('prepares on demand in synthesize() and returns to ready', async () => {
    const blob = await service.synthesize('Labas', 'vyras');
    expect(blob.type).toBe('audio/wav');
    expect(synthesize).toHaveBeenCalledWith('Labas', 'vyras');
    expect(service.state()).toBe('ready');
  });

  it('is in the generating state while synthesizing', async () => {
    await service.prepare();
    let during = '';
    synthesize.mockImplementationOnce(() => {
      during = service.state();
      return Promise.resolve(new Blob(['x']));
    });
    await service.synthesize('Labas', 'vyras');
    expect(during).toBe('generating');
  });

  it('caches by text and voice and exposes peek()', async () => {
    expect(service.peek('Labas', 'vyras')).toBeNull();
    const first = await service.synthesize('Labas', 'vyras');
    await service.synthesize('  Labas ', 'vyras');
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(service.peek('Labas', 'vyras')).toBe(first);
    expect(service.peek('Labas', 'moteris')).toBeNull();
    await service.synthesize('Labas', 'moteris');
    expect(synthesize).toHaveBeenCalledTimes(2);
  });

  it('shares one generation between identical concurrent requests', async () => {
    await Promise.all([service.synthesize('Labas', 'vyras'), service.synthesize('Labas', 'vyras')]);
    expect(synthesize).toHaveBeenCalledTimes(1);
  });

  it('rejects empty text, text over the limit and text with no letters', async () => {
    await expect(service.synthesize('   ', 'vyras')).rejects.toMatchObject({ reason: 'empty' });
    await expect(service.synthesize('a'.repeat(TTS_MAX_LENGTH + 1), 'vyras')).rejects.toMatchObject(
      { reason: 'too-long' },
    );
    await expect(service.synthesize('123 😀', 'vyras')).rejects.toMatchObject({
      reason: 'no-chars',
    });
    await expect(service.synthesize('a'.repeat(TTS_MAX_LENGTH), 'vyras')).resolves.toBeInstanceOf(
      Blob,
    );
    expect(mocks.loadEngine).toHaveBeenCalledTimes(1);
  });

  it('maps engine failures to generate and no-chars errors', async () => {
    synthesize.mockRejectedValueOnce(new Error('boom'));
    await expect(service.synthesize('Labas', 'vyras')).rejects.toBeInstanceOf(TtsError);
    expect(service.state()).toBe('ready');
    const noChars = new Error('x');
    noChars.name = 'NoSpeakableCharsError';
    synthesize.mockRejectedValueOnce(noChars);
    await expect(service.synthesize('Labas', 'moteris')).rejects.toMatchObject({
      reason: 'no-chars',
    });
  });

  it('rejects synthesize() with the blocking reason when the voice cannot load', async () => {
    mocks.loadEngine.mockRejectedValueOnce(new Error('network'));
    await expect(service.synthesize('Labas', 'vyras')).rejects.toMatchObject({
      reason: 'download',
    });
  });
});
