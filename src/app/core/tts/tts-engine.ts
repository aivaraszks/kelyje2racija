/**
 * VITS (Coqui, Lithuanian) on onnxruntime-web, single-threaded wasm, main thread.
 * Port of the legacy `piper-tts.client.ts`.
 *
 * Never import this file statically: it must only be reached through `await import('./tts-engine')`
 * (see `TtsService`), so that onnxruntime-web stays out of the initial bundle.
 */
import * as ort from 'onnxruntime-web/wasm';
import type { Voice } from '../sounds/sound-catalog';
import { loadModelFile, MODEL_FILE, TOKENS_FILE } from './model-cache';
import {
  concatPcm,
  LEAD_IN_SILENCE_MS,
  parseTokens,
  pcmToWav,
  pitchShift,
  prependSilence,
  SAMPLE_RATE,
  splitSentences,
  textToTokenIds,
} from './pcm';

export interface EngineProgress {
  readonly phase: 'tokens' | 'model' | 'wasm';
  readonly loaded: number;
  readonly total: number;
}

export interface TtsEngine {
  /** Resolves a 16-bit mono 22.05 kHz WAV. Rejects with `no-chars` when nothing is speakable. */
  synthesize(text: string, voice: Voice): Promise<Blob>;
}

const SCALES: Record<Voice, { noiseScale: number; lengthScale: number; noiseW: number }> = {
  vyras: { noiseScale: 0.72, lengthScale: 0.86, noiseW: 0.82 },
  moteris: { noiseScale: 0.667, lengthScale: 1.0, noiseW: 0.75 },
};

// The model has a single female speaker; the male voice is the same speaker pitched down.
const PITCH_SEMITONES: Record<Voice, number> = { vyras: -5, moteris: 0 };

function wasmPaths(): string {
  return new URL('ort/', document.baseURI).href;
}

function feeds(
  inputNames: readonly string[],
  tokenIds: number[],
  voice: Voice,
): Record<string, ort.Tensor> {
  const scales = SCALES[voice];
  const zero = () => new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const available: Record<string, () => ort.Tensor> = {
    input: () =>
      new ort.Tensor('int64', BigInt64Array.from(tokenIds.map(BigInt)), [1, tokenIds.length]),
    input_lengths: () =>
      new ort.Tensor('int64', BigInt64Array.from([BigInt(tokenIds.length)]), [1]),
    scales: () =>
      new ort.Tensor(
        'float32',
        Float32Array.from([scales.noiseScale, scales.lengthScale, scales.noiseW]),
        [3],
      ),
    sid: zero,
    speaker: zero,
    langid: zero,
    language: zero,
  };
  const result: Record<string, ort.Tensor> = {};
  for (const name of inputNames) {
    const make = available[name];
    if (!make) {
      throw new Error(`Unknown ONNX input: ${name}`);
    }
    result[name] = make();
  }
  return result;
}

let engine: Promise<TtsEngine> | null = null;

/** Loads (downloads if needed) the model and creates the session. One session per page. */
export function loadEngine(
  onProgress?: (progress: EngineProgress) => void,
  loadFile: typeof loadModelFile = loadModelFile,
): Promise<TtsEngine> {
  engine ??= create(onProgress, loadFile).catch((error: unknown) => {
    engine = null;
    throw error;
  });
  return engine;
}

async function create(
  onProgress: ((progress: EngineProgress) => void) | undefined,
  loadFile: typeof loadModelFile,
): Promise<TtsEngine> {
  ort.env.wasm.wasmPaths = wasmPaths();
  ort.env.wasm.numThreads = 1;

  const tokensBlob = await loadFile(TOKENS_FILE, (loaded, total) =>
    onProgress?.({ phase: 'tokens', loaded, total }),
  );
  const tokenToId = parseTokens(await tokensBlob.text());

  let modelBlob: Blob | null = await loadFile(MODEL_FILE, (loaded, total) =>
    onProgress?.({ phase: 'model', loaded, total }),
  );
  onProgress?.({ phase: 'wasm', loaded: 0, total: 1 });
  // Keep the peak memory low: hand the bytes to ORT, then drop every reference to them.
  const session = await ort.InferenceSession.create(await modelBlob.arrayBuffer(), {
    executionProviders: ['wasm'],
  });
  modelBlob = null;
  onProgress?.({ phase: 'wasm', loaded: 1, total: 1 });

  const inputNames = [...session.inputNames];

  async function sentence(tokenIds: number[], voice: Voice): Promise<Float32Array> {
    const output = (await session.run(feeds(inputNames, tokenIds, voice)))['output'];
    if (!output) {
      throw new Error('The model returned no audio');
    }
    return new Float32Array(output.data as ArrayLike<number>);
  }

  return {
    async synthesize(text, voice) {
      const chunks: Float32Array[] = [];
      for (const part of splitSentences(text)) {
        const tokenIds = textToTokenIds(part, tokenToId);
        // Only the leading blank means nothing in this sentence is speakable.
        if (tokenIds.length > 1) {
          chunks.push(await sentence(tokenIds, voice));
        }
      }
      if (chunks.length === 0) {
        throw new NoSpeakableCharsError();
      }
      const pcm = pitchShift(concatPcm(chunks), PITCH_SEMITONES[voice]);
      return pcmToWav(prependSilence(pcm, LEAD_IN_SILENCE_MS, SAMPLE_RATE), SAMPLE_RATE);
    },
  };
}

export class NoSpeakableCharsError extends Error {
  constructor() {
    super('No speakable characters');
    this.name = 'NoSpeakableCharsError';
  }
}
