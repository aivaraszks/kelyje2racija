/**
 * Persistent storage for the TTS model files: OPFS directory `racija-tts`, then Cache Storage
 * `racija-tts`, then nothing (downloaded again each session). A file is only written after it
 * was downloaded completely and its size matches, so a half-written file is never used.
 */

const STORE = 'racija-tts';
const CACHE_ORIGIN = 'https://racija-tts.invalid/';

/** Pinned Hugging Face revision of csukuangfj/vits-coqui-lt-cv (never `main`). */
export const MODEL_REVISION = '9479978f2889ca29fdada1b309a007f322ae63d6';
const MODEL_BASE = `https://huggingface.co/csukuangfj/vits-coqui-lt-cv/resolve/${MODEL_REVISION}`;

export interface ModelFile {
  /** Cache key; includes the revision so that a new pin invalidates the old file. */
  readonly name: string;
  readonly url: string;
  /** Exact size in bytes at the pinned revision. */
  readonly size: number;
}

export const MODEL_FILE: ModelFile = {
  name: `model-${MODEL_REVISION.slice(0, 7)}.onnx`,
  url: `${MODEL_BASE}/model.onnx`,
  size: 71_032_571,
};

export const TOKENS_FILE: ModelFile = {
  name: `tokens-${MODEL_REVISION.slice(0, 7)}.txt`,
  url: `${MODEL_BASE}/tokens.txt`,
  size: 1564,
};

export type ProgressFn = (loaded: number, total: number) => void;

async function opfsDir(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.storage?.getDirectory !== 'function') {
      return undefined;
    }
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(STORE, { create: true });
  } catch {
    return undefined;
  }
}

async function cacheStore(): Promise<Cache | undefined> {
  try {
    return typeof caches === 'undefined' ? undefined : await caches.open(STORE);
  } catch {
    return undefined;
  }
}

function cacheRequest(file: ModelFile): Request {
  return new Request(new URL(file.name, CACHE_ORIGIN).href);
}

/** Returns the stored blob only when its size is exactly the expected one. */
export async function readStored(file: ModelFile): Promise<Blob | undefined> {
  const dir = await opfsDir();
  if (dir) {
    try {
      const stored = await (await dir.getFileHandle(file.name)).getFile();
      if (stored.size === file.size) {
        return stored;
      }
    } catch {
      // Not in OPFS; try Cache Storage.
    }
  }
  const store = await cacheStore();
  if (store) {
    try {
      const response = await store.match(cacheRequest(file));
      const blob = await response?.blob();
      if (blob && blob.size === file.size) {
        return blob;
      }
    } catch {
      // Treat as a miss.
    }
  }
  return undefined;
}

export async function isStored(file: ModelFile): Promise<boolean> {
  return (await readStored(file)) !== undefined;
}

/** Best effort. Never throws. OPFS first, Cache Storage when OPFS is missing or fails. */
export async function writeStored(file: ModelFile, blob: Blob): Promise<void> {
  if (blob.size !== file.size) {
    return;
  }
  const dir = await opfsDir();
  if (dir) {
    try {
      const handle = await dir.getFileHandle(file.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      if ((await handle.getFile()).size === file.size) {
        return;
      }
      await dir.removeEntry(file.name).catch(() => undefined);
    } catch {
      await dir.removeEntry(file.name).catch(() => undefined);
    }
  }
  const store = await cacheStore();
  if (store) {
    try {
      await store.put(cacheRequest(file), new Response(blob));
    } catch {
      await store.delete(cacheRequest(file)).catch(() => undefined);
    }
  }
}

/** Reads the file from storage, or downloads it (with progress) and stores it. Throws on a bad download. */
export async function loadModelFile(file: ModelFile, onProgress?: ProgressFn): Promise<Blob> {
  const stored = await readStored(file);
  if (stored) {
    onProgress?.(stored.size, stored.size);
    return stored;
  }

  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const total = Number(response.headers.get('Content-Length')) || file.size;
  const reader = response.body?.getReader();
  let blob: Blob;
  if (reader) {
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value as Uint8Array<ArrayBuffer>);
      loaded += value.length;
      onProgress?.(loaded, total);
    }
    blob = new Blob(chunks);
  } else {
    blob = await response.blob();
    onProgress?.(blob.size, total);
  }

  if (blob.size !== file.size) {
    throw new Error(`Unexpected size ${blob.size}, expected ${file.size}`);
  }
  await writeStored(file, blob);
  return blob;
}
