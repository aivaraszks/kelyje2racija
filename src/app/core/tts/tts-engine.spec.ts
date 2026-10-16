import { MODEL_FILE, TOKENS_FILE } from './model-cache';

const ort = vi.hoisted(() => {
  class Tensor {
    constructor(
      readonly type: string,
      readonly data: unknown,
      readonly dims: number[],
    ) {}
  }
  return {
    Tensor,
    env: { wasm: {} as { wasmPaths?: string; numThreads?: number } },
    create: vi.fn(),
    run: vi.fn(),
  };
});

vi.mock('onnxruntime-web/wasm', () => ({
  Tensor: ort.Tensor,
  env: ort.env,
  InferenceSession: { create: ort.create },
}));

const cache = { loadModelFile: vi.fn() };

describe('tts-engine', () => {
  beforeEach(() => {
    vi.resetModules();
    ort.create.mockReset();
    ort.run.mockReset();
    cache.loadModelFile.mockReset();
    cache.loadModelFile.mockImplementation((file: { name: string }, onProgress) => {
      onProgress?.(1, 2);
      return Promise.resolve(
        file.name.startsWith('tokens') ? new Blob(['a 5\nb 6\n']) : new Blob([new Uint8Array(4)]),
      );
    });
    ort.create.mockResolvedValue({
      inputNames: ['input', 'input_lengths', 'scales'],
      run: ort.run,
    });
    ort.run.mockResolvedValue({ output: { data: new Float32Array(1000).fill(0.1) } });
  });

  it('configures single-threaded wasm relative to the base href', async () => {
    const { loadEngine } = await import('./tts-engine');
    await loadEngine(undefined, cache.loadModelFile);
    expect(ort.env.wasm.numThreads).toBe(1);
    expect(ort.env.wasm.wasmPaths).toBe(new URL('ort/', document.baseURI).href);
  });

  it('downloads tokens then the model, reports progress and creates one session', async () => {
    const { loadEngine } = await import('./tts-engine');
    const progress = vi.fn();
    await loadEngine(progress, cache.loadModelFile);
    await loadEngine(undefined, cache.loadModelFile);
    const files = cache.loadModelFile.mock.calls.map((c) => c[0]);
    expect(files).toEqual([TOKENS_FILE, MODEL_FILE]);
    expect(progress.mock.calls.map((c) => c[0].phase)).toEqual(['tokens', 'model', 'wasm', 'wasm']);
    expect(ort.create).toHaveBeenCalledTimes(1);
  });

  it('allows a retry after a failed load', async () => {
    const { loadEngine } = await import('./tts-engine');
    cache.loadModelFile.mockRejectedValueOnce(new Error('network'));
    await expect(loadEngine(undefined, cache.loadModelFile)).rejects.toThrow('network');
    await expect(loadEngine(undefined, cache.loadModelFile)).resolves.toBeDefined();
  });

  it('synthesizes a WAV per voice, lowering the male voice', async () => {
    const { loadEngine } = await import('./tts-engine');
    const engine = await loadEngine(undefined, cache.loadModelFile);
    const woman = await engine.synthesize('ab', 'moteris');
    const man = await engine.synthesize('ab', 'vyras');
    expect(woman.type).toBe('audio/wav');
    expect(woman.size).toBe(44 + (1000 + 4410) * 2);
    expect(man.size).toBeGreaterThan(woman.size);
    const feeds = ort.run.mock.calls[0][0];
    expect(Object.keys(feeds)).toEqual(['input', 'input_lengths', 'scales']);
    expect(feeds.input.dims).toEqual([1, 5]);
    expect([...ort.run.mock.calls[0][0].scales.data]).toEqual([
      Math.fround(0.667),
      1,
      Math.fround(0.75),
    ]);
  });

  it('runs once per sentence', async () => {
    const { loadEngine } = await import('./tts-engine');
    const engine = await loadEngine(undefined, cache.loadModelFile);
    await engine.synthesize('ab. ba', 'moteris');
    expect(ort.run).toHaveBeenCalledTimes(2);
  });

  it('rejects when nothing is speakable', async () => {
    const { loadEngine } = await import('./tts-engine');
    const engine = await loadEngine(undefined, cache.loadModelFile);
    await expect(engine.synthesize('zzz', 'moteris')).rejects.toMatchObject({
      name: 'NoSpeakableCharsError',
    });
    expect(ort.run).not.toHaveBeenCalled();
  });

  it('rejects an unknown model input', async () => {
    ort.create.mockResolvedValue({ inputNames: ['bogus'], run: ort.run });
    const { loadEngine } = await import('./tts-engine');
    const engine = await loadEngine(undefined, cache.loadModelFile);
    await expect(engine.synthesize('ab', 'moteris')).rejects.toThrow(/Unknown ONNX input/);
  });
});
