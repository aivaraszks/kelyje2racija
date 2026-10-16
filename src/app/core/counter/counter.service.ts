import { Service, WritableSignal, signal } from '@angular/core';

export const COUNTER_API = 'https://countapi.mileshilliard.com/api/v1';
export const PLAYS_KEY = 'kelyje2racija-global-plays';
export const SHARES_KEY = 'kelyje2racija-global-shares';
export const COUNTER_TIMEOUT_MS = 5000;

interface CounterResponse {
  value?: string | number;
  error?: string;
}

/** Global play/share counters. A signal value of null means "unavailable"; callers never see errors. */
@Service()
export class CounterService {
  readonly plays = signal<number | null>(null);
  readonly shares = signal<number | null>(null);

  /** Loads both totals. */
  async refresh(): Promise<void> {
    await Promise.all([
      this.call('get', PLAYS_KEY, this.plays),
      this.call('get', SHARES_KEY, this.shares),
    ]);
  }

  recordPlay(): Promise<void> {
    return this.call('hit', PLAYS_KEY, this.plays);
  }

  recordShare(): Promise<void> {
    return this.call('hit', SHARES_KEY, this.shares);
  }

  private async call(
    action: 'get' | 'hit',
    key: string,
    target: WritableSignal<number | null>,
  ): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), COUNTER_TIMEOUT_MS);
    try {
      const response = await fetch(`${COUNTER_API}/${action}/${key}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as CounterResponse;
      const value = Number(data.value);
      if (!data.error && data.value !== undefined && Number.isFinite(value)) {
        target.set(value);
      }
    } catch {
      // Network error, timeout or bad JSON: the counter just stays as it was.
    } finally {
      clearTimeout(timer);
    }
  }
}
