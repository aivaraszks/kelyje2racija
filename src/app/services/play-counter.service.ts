import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface CounterResponse {
  key?: string;
  value?: string | number;
  error?: string;
}

/** Globalus paleistų įrašų skaitiklis (bendras visiems vartotojams). */
@Injectable({ providedIn: 'root' })
export class PlayCounterService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'https://countapi.mileshilliard.com/api/v1';
  private readonly counterKey = 'kelyje2racija-global-plays';

  readonly totalPlays = signal<number | null>(null);
  readonly loading = signal(true);

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<CounterResponse>(`${this.apiBase}/get/${this.counterKey}`),
      );
      this.totalPlays.set(this.parseValue(data));
    } catch {
      this.totalPlays.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  recordPlay(): void {
    void this.incrementRemote();
  }

  private async incrementRemote(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<CounterResponse>(`${this.apiBase}/hit/${this.counterKey}`),
      );
      this.totalPlays.set(this.parseValue(data));
    } catch {
      const current = this.totalPlays();
      if (current !== null) {
        this.totalPlays.set(current + 1);
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
