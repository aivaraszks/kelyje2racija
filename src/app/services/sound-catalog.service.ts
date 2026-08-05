import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SoundEntry } from '../models/sound.model';

@Injectable({ providedIn: 'root' })
export class SoundCatalogService {
  private readonly http = inject(HttpClient);

  loadCatalog(): Observable<SoundEntry[]> {
    return this.http.get<SoundEntry[]>('assets/sounds.json');
  }
}
