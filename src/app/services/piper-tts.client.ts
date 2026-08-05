import * as ort from 'onnxruntime-web/wasm';

export type TtsGender = 'moteris' | 'vyras';

const MODEL_BASE =
  'https://huggingface.co/csukuangfj/vits-coqui-lt-cv/resolve/main';
const MODEL_ONNX_URL = `${MODEL_BASE}/model.onnx`;
const TOKENS_URL = `${MODEL_BASE}/tokens.txt`;

const SAMPLE_RATE = 22050;
const LEAD_IN_SILENCE_MS = 200;
const ADD_BLANK = true;
const USE_EOS_BOS = false;
const BLANK_ID = 3;

const GENDER_SCALES: Record<TtsGender, { lengthScale: number; noiseScale: number; noiseW: number }> =
  {
    vyras: { noiseScale: 0.72, lengthScale: 0.86, noiseW: 0.82 },
    moteris: { noiseScale: 0.667, lengthScale: 1.0, noiseW: 0.75 },
  };

// * Model has a single female speaker; male voice uses post-synthesis pitch lowering.
const GENDER_PITCH_SEMITONES: Record<TtsGender, number> = {
  vyras: -5,
  moteris: 0,
};

export type PiperDownloadProgress = {
  phase: 'wasm' | 'model' | 'tokens';
  loaded: number;
  total: number;
};

type PiperSession = {
  session: ort.InferenceSession;
  tokenToId: Map<string, number>;
  inputNames: string[];
};

let cachedSession: PiperSession | null = null;
let initPromise: Promise<PiperSession> | null = null;

function ortWasmBasePath(): string {
  const base = document.querySelector('base')?.href ?? '/';
  return new URL('assets/ort/', base).href;
}

function pcmToWav(pcm: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bufferLength = pcm.length;
  const headerLength = 44;
  const view = new DataView(new ArrayBuffer(bufferLength * 2 + headerLength));

  view.setUint32(0, 0x46464952, true);
  view.setUint32(4, view.buffer.byteLength - 8, true);
  view.setUint32(8, 0x45564157, true);
  view.setUint32(12, 0x20746d66, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x61746164, true);
  view.setUint32(40, bufferLength * 2, true);

  let offset = headerLength;
  for (let index = 0; index < bufferLength; index += 1) {
    const sample = Math.max(-1, Math.min(1, pcm[index] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view.buffer], { type: 'audio/wav' });
}

async function readOpfsBlob(url: string): Promise<Blob | undefined> {
  if (!('storage' in navigator) || !navigator.storage.getDirectory) {
    return undefined;
  }

  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('kelyje-tts', { create: true });
    const filename = url.split('/').at(-1) ?? 'file';
    const file = await dir.getFileHandle(filename);
    return file.getFile();
  } catch {
    return undefined;
  }
}

async function writeOpfsBlob(url: string, blob: Blob): Promise<void> {
  if (!('storage' in navigator) || !navigator.storage.getDirectory) {
    return;
  }

  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('kelyje-tts', { create: true });
    const filename = url.split('/').at(-1) ?? 'file';
    const file = await dir.getFileHandle(filename, { create: true });
    const writable = await file.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch {
    // OPFS is optional; ignore write failures.
  }
}

async function fetchWithProgress(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Blob> {
  const cached = await readOpfsBlob(url);
  if (cached) {
    onProgress?.(cached.size, cached.size);
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nepavyko atsisiųsti: ${url}`);
  }

  const total = Number(response.headers.get('Content-Length') ?? 0);
  const reader = response.body?.getReader();
  if (!reader) {
    const blob = await response.blob();
    await writeOpfsBlob(url, blob);
    onProgress?.(blob.size, blob.size);
    return blob;
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    loaded += value.length;
    onProgress?.(loaded, total || loaded);
  }

  const blob = new Blob(chunks, { type: response.headers.get('Content-Type') ?? undefined });
  await writeOpfsBlob(url, blob);
  return blob;
}

function parseTokens(text: string): Map<string, number> {
  const tokenToId = new Map<string, number>();

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const [symbol, idText] = trimmed.split(/\s+/, 2);
    if (!symbol || !idText) {
      continue;
    }

    if (['<PAD>', '<EOS>', '<BOS>', '<BLNK>'].includes(symbol)) {
      continue;
    }

    tokenToId.set(symbol, Number(idText));
  }

  return tokenToId;
}

function splitSentences(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const parts = normalized.match(/[^.!?:]+[.!?:]?/g) ?? [normalized];
  return parts.map((part) => part.trim()).filter(Boolean);
}

function textToTokenIds(text: string, tokenToId: Map<string, number>): number[] {
  const lowered = text.toLowerCase();
  const tokens: number[] = [];

  if (ADD_BLANK) {
    tokens.push(BLANK_ID);
  }

  for (const char of lowered) {
    const id = tokenToId.get(char);
    if (id === undefined) {
      continue;
    }

    tokens.push(id);
    if (ADD_BLANK) {
      tokens.push(BLANK_ID);
    }
  }

  return tokens;
}

function buildInferenceFeeds(
  inputNames: string[],
  tokenIds: number[],
  gender: TtsGender,
): Record<string, ort.Tensor> {
  const scales = GENDER_SCALES[gender];
  const available: Record<string, ort.Tensor> = {
    input: new ort.Tensor('int64', BigInt64Array.from(tokenIds.map(BigInt)), [
      1,
      tokenIds.length,
    ]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(tokenIds.length)]), [1]),
    scales: new ort.Tensor(
      'float32',
      Float32Array.from([scales.noiseScale, scales.lengthScale, scales.noiseW]),
      [3],
    ),
    sid: new ort.Tensor('int64', BigInt64Array.from([0n]), [1]),
    speaker: new ort.Tensor('int64', BigInt64Array.from([0n]), [1]),
    langid: new ort.Tensor('int64', BigInt64Array.from([0n]), [1]),
    language: new ort.Tensor('int64', BigInt64Array.from([0n]), [1]),
  };

  const feeds: Record<string, ort.Tensor> = {};
  for (const name of inputNames) {
    const tensor = available[name];
    if (!tensor) {
      throw new Error(`Nežinomas ONNX įvesties laukas: ${name}`);
    }
    feeds[name] = tensor;
  }

  return feeds;
}

async function synthesizeSentence(
  inputNames: string[],
  session: ort.InferenceSession,
  tokenIds: number[],
  gender: TtsGender,
): Promise<Float32Array> {
  if (tokenIds.length === 0) {
    return new Float32Array(0);
  }

  const feeds = buildInferenceFeeds(inputNames, tokenIds, gender);
  const result = await session.run(feeds);
  const output = result['output'];
  if (!output) {
    throw new Error('ONNX modelis negrąžino garso');
  }

  return new Float32Array(output.data as ArrayLike<number>);
}

function prependSilence(pcm: Float32Array, sampleRate: number, ms: number): Float32Array {
  const silenceSamples = Math.round((sampleRate * ms) / 1000);
  if (silenceSamples <= 0) {
    return pcm;
  }

  const padded = new Float32Array(pcm.length + silenceSamples);
  padded.set(pcm, silenceSamples);
  return padded;
}

function concatPcm(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function pitchShiftPcm(pcm: Float32Array, semitones: number): Float32Array {
  if (semitones === 0 || pcm.length === 0) {
    return pcm;
  }

  const ratio = 2 ** (semitones / 12);
  const newLength = Math.max(1, Math.round(pcm.length / ratio));
  const shifted = new Float32Array(newLength);

  for (let index = 0; index < newLength; index += 1) {
    const srcIndex = index * ratio;
    const sampleIndex = Math.floor(srcIndex);
    const fraction = srcIndex - sampleIndex;
    const sample0 = pcm[sampleIndex] ?? 0;
    const sample1 = pcm[sampleIndex + 1] ?? sample0;
    shifted[index] = sample0 + fraction * (sample1 - sample0);
  }

  return shifted;
}

function applyGenderPostProcess(pcm: Float32Array, gender: TtsGender): Float32Array {
  return pitchShiftPcm(pcm, GENDER_PITCH_SEMITONES[gender]);
}

async function ensureSession(
  onProgress?: (progress: PiperDownloadProgress) => void,
): Promise<PiperSession> {
  if (cachedSession) {
    return cachedSession;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    ort.env.wasm.wasmPaths = ortWasmBasePath();
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;

    onProgress?.({ phase: 'tokens', loaded: 0, total: 1 });
    const tokensBlob = await fetchWithProgress(TOKENS_URL, (loaded, total) => {
      onProgress?.({ phase: 'tokens', loaded, total });
    });
    const tokenToId = parseTokens(await tokensBlob.text());

    onProgress?.({ phase: 'model', loaded: 0, total: 1 });
    const modelBlob = await fetchWithProgress(MODEL_ONNX_URL, (loaded, total) => {
      onProgress?.({ phase: 'model', loaded, total });
    });

    onProgress?.({ phase: 'wasm', loaded: 0, total: 1 });
    const session = await ort.InferenceSession.create(await modelBlob.arrayBuffer(), {
      executionProviders: ['wasm'],
    });
    onProgress?.({ phase: 'wasm', loaded: 1, total: 1 });

    const piperSession: PiperSession = {
      session,
      tokenToId,
      inputNames: [...session.inputNames],
    };
    cachedSession = piperSession;
    return piperSession;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

export async function preloadPiperWasmModel(
  onProgress?: (progress: PiperDownloadProgress) => void,
): Promise<void> {
  await ensureSession(onProgress);
}

export async function synthesizeWithPiperWasm(
  text: string,
  gender: TtsGender,
  onProgress?: (progress: PiperDownloadProgress) => void,
): Promise<Blob> {
  const { session, tokenToId, inputNames } = await ensureSession(onProgress);
  const sentences = splitSentences(text);
  const pcmChunks: Float32Array[] = [];

  for (const sentence of sentences) {
    const tokenIds = textToTokenIds(sentence, tokenToId);
    if (tokenIds.length === 0) {
      continue;
    }
    pcmChunks.push(await synthesizeSentence(inputNames, session, tokenIds, gender));
  }

  if (pcmChunks.length === 0) {
    throw new Error('Tekste nėra palaikomų simbolių lietuviškam balsui');
  }

  const pcm = applyGenderPostProcess(concatPcm(pcmChunks), gender);
  return pcmToWav(prependSilence(pcm, SAMPLE_RATE, LEAD_IN_SILENCE_MS), SAMPLE_RATE);
}

export function isPiperWasmSupported(): boolean {
  return typeof window !== 'undefined' && typeof WebAssembly !== 'undefined';
}
