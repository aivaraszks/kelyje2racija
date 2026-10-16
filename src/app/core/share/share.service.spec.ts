import { TestBed } from '@angular/core/testing';
import { ShareService, ShareableSound } from './share.service';

const sound: ShareableSound = {
  id: 'be-sansu-vyras',
  file: 'sounds/be-sansu-vyras.mp3',
  title: 'Be šansų!',
};

function okResponse(): Response {
  return new Response(new Blob(['abc'], { type: 'audio/mpeg' }), { status: 200 });
}

function setNavigator(share?: unknown, canShare?: unknown): void {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
  Object.defineProperty(navigator, 'canShare', {
    value: canShare,
    configurable: true,
    writable: true,
  });
}

describe('ShareService', () => {
  let service: ShareService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(okResponse()));
    vi.stubGlobal('fetch', fetchMock);
    service = TestBed.inject(ShareService);
  });
  afterEach(() => {
    setNavigator(undefined, undefined);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shares an audio/mpeg file named racija-<id>.mp3', async () => {
    const share = vi.fn(() => Promise.resolve());
    setNavigator(share, () => true);
    await service.prefetch(sound);
    await expect(service.share(sound)).resolves.toBe('shared');
    const data = (share.mock.calls[0] as unknown as [ShareData])[0];
    expect(data.title).toBe('Be šansų!');
    expect(data.files).toHaveLength(1);
    expect(data.files![0].name).toBe('racija-be-sansu-vyras.mp3');
    expect(data.files![0].type).toBe('audio/mpeg');
  });

  it('calls navigator.share synchronously when the clip is prefetched', async () => {
    const share = vi.fn(() => Promise.resolve());
    setNavigator(share, () => true);
    await service.prefetch(sound);
    const promise = service.share(sound);
    expect(share).toHaveBeenCalledTimes(1);
    await promise;
  });

  it('prefetches once per id (cache and in-flight dedupe)', async () => {
    await Promise.all([service.prefetch(sound), service.prefetch(sound)]);
    await service.prefetch(sound);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('sounds/be-sansu-vyras.mp3');
  });

  it('waits for an unfinished prefetch before sharing', async () => {
    const share = vi.fn(() => Promise.resolve());
    setNavigator(share, () => true);
    const first = service.prefetch(sound);
    await expect(service.share(sound)).resolves.toBe('shared');
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('downloads when navigator.share is missing', async () => {
    setNavigator(undefined, undefined);
    const createUrl = vi.fn(() => 'blob:x');
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    await expect(service.share(sound)).resolves.toBe('downloaded');
    expect(createUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('downloads when canShare rejects files', async () => {
    const share = vi.fn();
    setNavigator(share, () => false);
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await expect(service.share(sound)).resolves.toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
  });

  it.each([
    ['AbortError', 'cancelled'],
    ['NotAllowedError', 'not-allowed'],
    ['DataError', 'error'],
  ])('maps %s to %s', async (name, outcome) => {
    setNavigator(
      () => Promise.reject(new DOMException('x', name)),
      () => true,
    );
    await expect(service.share(sound)).resolves.toBe(outcome);
  });

  it('returns fetch-error when the clip cannot be fetched', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(service.share(sound)).resolves.toBe('fetch-error');
  });

  it('returns fetch-error on a non-OK response and retries on the next call', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(service.share(sound)).resolves.toBe('fetch-error');
    setNavigator(
      () => Promise.resolve(),
      () => true,
    );
    await expect(service.share(sound)).resolves.toBe('shared');
  });
});
