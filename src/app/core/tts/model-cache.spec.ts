import { loadModelFile, ModelFile, readStored, writeStored } from './model-cache';

const RealResponse = Response;

const file: ModelFile = { name: 'm-test.bin', url: 'https://example.test/m.bin', size: 6 };

class FakeOpfs {
  files = new Map<string, Blob>();
  failWrite = false;
  getDirectory = () =>
    Promise.resolve({
      getDirectoryHandle: () =>
        Promise.resolve({
          getFileHandle: (name: string, opts?: { create?: boolean }) => {
            if (!this.files.has(name) && !opts?.create) {
              return Promise.reject(new DOMException('missing', 'NotFoundError'));
            }
            return Promise.resolve({
              getFile: () => Promise.resolve(this.files.get(name) ?? new Blob()),
              createWritable: () => {
                if (this.failWrite) {
                  return Promise.reject(new Error('no createWritable'));
                }
                let data = new Blob();
                return Promise.resolve({
                  write: (b: Blob) => ((data = b), Promise.resolve()),
                  close: () => (this.files.set(name, data), Promise.resolve()),
                });
              },
            });
          },
          removeEntry: (name: string) => (this.files.delete(name), Promise.resolve()),
        }),
    });
}

class FakeCaches {
  store = new Map<string, Blob>();
  open = () =>
    Promise.resolve({
      match: (req: Request) => {
        const blob = this.store.get(req.url);
        return Promise.resolve(blob ? new Response(blob) : undefined);
      },
      put: (req: Request, res: Response) => res.blob().then((b) => void this.store.set(req.url, b)),
      delete: (req: Request) => Promise.resolve(this.store.delete(req.url)),
    });
}

/** Node's Response does not accept jsdom Blobs, so the cache tests use a minimal stand-in. */
class FakeResponse {
  constructor(private readonly body: Blob) {}
  blob(): Promise<Blob> {
    return Promise.resolve(this.body);
  }
}

function setStorage(opfs?: FakeOpfs, caches?: FakeCaches): void {
  vi.stubGlobal('navigator', { storage: opfs ? { getDirectory: opfs.getDirectory } : {} });
  vi.stubGlobal('caches', caches);
  vi.stubGlobal('Response', FakeResponse);
}

function stream(parts: string[], length?: number): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((p) => controller.enqueue(encoder.encode(p)));
      controller.close();
    },
  });
  const headers: Record<string, string> =
    length === undefined ? {} : { 'Content-Length': String(length) };
  return new RealResponse(body, { status: 200, headers });
}

describe('model-cache', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('stores in OPFS and reads it back', async () => {
    const opfs = new FakeOpfs();
    setStorage(opfs, new FakeCaches());
    await writeStored(file, new Blob(['abcdef']));
    expect(opfs.files.has(file.name)).toBe(true);
    expect((await readStored(file))?.size).toBe(6);
  });

  it('falls back to Cache Storage when OPFS has no createWritable', async () => {
    const opfs = new FakeOpfs();
    opfs.failWrite = true;
    const caches = new FakeCaches();
    setStorage(opfs, caches);
    await writeStored(file, new Blob(['abcdef']));
    expect(opfs.files.size).toBe(0);
    expect(caches.store.size).toBe(1);
    expect((await readStored(file))?.size).toBe(6);
  });

  it('falls back to Cache Storage when OPFS is missing', async () => {
    const caches = new FakeCaches();
    setStorage(undefined, caches);
    await writeStored(file, new Blob(['abcdef']));
    expect(caches.store.size).toBe(1);
  });

  it('does nothing when neither store exists', async () => {
    setStorage(undefined, undefined);
    await expect(writeStored(file, new Blob(['abcdef']))).resolves.toBeUndefined();
    await expect(readStored(file)).resolves.toBeUndefined();
  });

  it('ignores a stored file with the wrong size and refuses to write one', async () => {
    const opfs = new FakeOpfs();
    opfs.files.set(file.name, new Blob(['abc']));
    setStorage(opfs, new FakeCaches());
    await expect(readStored(file)).resolves.toBeUndefined();
    await writeStored(file, new Blob(['abc']));
    expect(opfs.files.get(file.name)?.size).toBe(3);
  });

  it('downloads with progress, checks the size, then caches', async () => {
    const opfs = new FakeOpfs();
    setStorage(opfs, new FakeCaches());
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(stream(['abc', 'def'], 6))),
    );
    const progress = vi.fn();
    const blob = await loadModelFile(file, progress);
    expect(blob.size).toBe(6);
    expect(progress).toHaveBeenLastCalledWith(6, 6);
    expect(opfs.files.get(file.name)?.size).toBe(6);
  });

  it('uses the known size when Content-Length is missing', async () => {
    setStorage(new FakeOpfs(), new FakeCaches());
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(stream(['abcdef']))),
    );
    const progress = vi.fn();
    await loadModelFile(file, progress);
    expect(progress).toHaveBeenCalledWith(6, 6);
  });

  it('rejects and writes nothing when the downloaded size is wrong', async () => {
    const opfs = new FakeOpfs();
    const caches = new FakeCaches();
    setStorage(opfs, caches);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(stream(['abc'], 6))),
    );
    await expect(loadModelFile(file)).rejects.toThrow(/size/);
    expect(opfs.files.size).toBe(0);
    expect(caches.store.size).toBe(0);
  });

  it('rejects on an HTTP error', async () => {
    setStorage(undefined, undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new RealResponse('', { status: 404 }))),
    );
    await expect(loadModelFile(file)).rejects.toThrow();
  });

  it('does not fetch on a cache hit', async () => {
    const opfs = new FakeOpfs();
    opfs.files.set(file.name, new Blob(['abcdef']));
    setStorage(opfs, undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const progress = vi.fn();
    await loadModelFile(file, progress);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(progress).toHaveBeenCalledWith(6, 6);
  });
});
