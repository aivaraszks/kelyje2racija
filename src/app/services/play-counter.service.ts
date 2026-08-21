import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface CounterResponse {
  key?: string;
  value?: string | number;
  error?: string;
}

class RemoteCounter {
  readonly total = signal<number | null>(null);
  readonly loading = signal(true);

  constructor(
    private readonly http: HttpClient,
    private readonly apiBase: string,
    private readonly counterKey: string,
  ) {}

  async refresh(): Promise<void> {
    this.loading.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<CounterResponse>(`${this.apiBase}/get/${this.counterKey}`),
      );
      this.total.set(this.parseValue(data));
    } catch {
      this.total.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  record(): void {
    void this.incrementRemote();
  }

  private async incrementRemote(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<CounterResponse>(`${this.apiBase}/hit/${this.counterKey}`),
      );
      this.total.set(this.parseValue(data));
    } catch {
      const current = this.total();
      if (current !== null) {
        this.total.set(current + 1);
      }
    }
  }

  private parseValue(data: CounterResponse): number {
    if (data.error || data.value === undefined) {
      return 0;
    }

    const parsed = Number(data.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

/** Globalūs statistikos skaitikliai (bendri visiems vartotojams). */
@Injectable({ providedIn: 'root' })
export class PlayCounterService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'https://countapi.mileshilliard.com/api/v1';

  readonly plays = new RemoteCounter(
    this.http,
    this.apiBase,
    'kelyje2racija-global-plays',
  );

  readonly shares = new RemoteCounter(
    this.http,
    this.apiBase,
    'kelyje2racija-global-shares',
  );

  constructor() {
    void this.plays.refresh();
    void this.shares.refresh();
  }

  recordPlay(): void {
    this.plays.record();
  }

  recordShare(): void {
    this.shares.record();
  }
}
