import { TestBed } from '@angular/core/testing';
import {
  COUNTER_API,
  COUNTER_TIMEOUT_MS,
  CounterService,
  PLAYS_KEY,
  SHARES_KEY,
} from './counter.service';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('CounterService', () => {
  let service: CounterService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    service = TestBed.inject(CounterService);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts unavailable (null)', () => {
    expect(service.plays()).toBeNull();
    expect(service.shares()).toBeNull();
  });

  it('refresh() reads both totals with the legacy keys', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(json({ value: url.endsWith(PLAYS_KEY) ? 1234 : '56' })),
    );
    await service.refresh();
    expect(fetchMock).toHaveBeenCalledWith(`${COUNTER_API}/get/${PLAYS_KEY}`, expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(`${COUNTER_API}/get/${SHARES_KEY}`, expect.anything());
    expect(service.plays()).toBe(1234);
    expect(service.shares()).toBe(56);
  });

  it('uses the expected keys', () => {
    expect(PLAYS_KEY).toBe('kelyje2racija-global-plays');
    expect(SHARES_KEY).toBe('kelyje2racija-global-shares');
  });

  it('recordPlay() and recordShare() hit and store the new total', async () => {
    fetchMock.mockResolvedValueOnce(json({ value: 10 }));
    await service.recordPlay();
    expect(fetchMock.mock.calls[0][0]).toBe(`${COUNTER_API}/hit/${PLAYS_KEY}`);
    expect(service.plays()).toBe(10);

    fetchMock.mockResolvedValueOnce(json({ value: 3 }));
    await service.recordShare();
    expect(fetchMock.mock.calls[1][0]).toBe(`${COUNTER_API}/hit/${SHARES_KEY}`);
    expect(service.shares()).toBe(3);
  });

  it('never throws and leaves the value on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(service.refresh()).resolves.toBeUndefined();
    await expect(service.recordPlay()).resolves.toBeUndefined();
    expect(service.plays()).toBeNull();
  });

  it('keeps the previous value when a hit fails', async () => {
    fetchMock.mockResolvedValueOnce(json({ value: 7 }));
    await service.recordPlay();
    fetchMock.mockRejectedValueOnce(new Error('x'));
    await service.recordPlay();
    expect(service.plays()).toBe(7);
  });

  it('ignores HTTP errors, API errors and bad JSON', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 500));
    await service.recordPlay();
    fetchMock.mockResolvedValueOnce(json({ error: 'nope' }));
    await service.recordPlay();
    fetchMock.mockResolvedValueOnce(json({ value: 'abc' }));
    await service.recordPlay();
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    await service.recordPlay();
    expect(service.plays()).toBeNull();
  });

  it('aborts after the 5 s timeout', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')));
        }),
    );
    const done = service.recordPlay();
    await vi.advanceTimersByTimeAsync(COUNTER_TIMEOUT_MS - 1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(done).resolves.toBeUndefined();
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal!.aborted).toBe(true);
    expect(service.plays()).toBeNull();
  });
});
