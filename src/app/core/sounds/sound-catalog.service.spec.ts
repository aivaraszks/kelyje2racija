import { TestBed } from '@angular/core/testing';
import { SoundCatalogService, VOICE_STORAGE_KEY } from './sound-catalog.service';

function create(): SoundCatalogService {
  TestBed.resetTestingModule();
  return TestBed.inject(SoundCatalogService);
}

describe('SoundCatalogService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('defaults to vyras and lists vyras plus nezinoma clips', () => {
    const service = create();
    expect(service.voice()).toBe('vyras');
    const voices = new Set(service.visibleSounds().map((s) => s.voice));
    expect(voices).toEqual(new Set(['vyras', 'nezinoma']));
    expect(service.visibleSounds()).toHaveLength(39);
  });

  it('shows nezinoma clips under both voices', () => {
    const service = create();
    service.setVoice('moteris');
    const ids = service.visibleSounds().map((s) => s.id);
    expect(ids).toContain('tuoj-jau-sustabdysite-automobili-nezinoma');
    expect(ids).toContain('tuoj-jau-sustabdykite-automobili-arba-mes-sausime-nezinoma');
    expect(service.visibleSounds().every((s) => s.voice !== 'vyras')).toBe(true);
  });

  it('filters by query ignoring diacritics and case', () => {
    const service = create();
    service.query.set('sansu');
    expect(service.visibleSounds().map((s) => s.id)).toEqual(['be-sansu-vyras']);
    service.query.set('  ŠANSŲ ');
    expect(service.visibleSounds().map((s) => s.id)).toEqual(['be-sansu-vyras']);
    service.query.set('zzzz');
    expect(service.visibleSounds()).toEqual([]);
  });

  it('searches the numbered label of variants', () => {
    const service = create();
    service.query.set('rinkis (2)');
    expect(service.visibleSounds().map((s) => s.id)).toEqual(['rinkis-vyras-2']);
  });

  it('persists the voice and restores it', () => {
    create().setVoice('moteris');
    expect(localStorage.getItem(VOICE_STORAGE_KEY)).toBe('moteris');
    expect(create().voice()).toBe('moteris');
  });

  it('falls back to vyras on an invalid stored value', () => {
    localStorage.setItem(VOICE_STORAGE_KEY, 'xxx');
    expect(create().voice()).toBe('vyras');
  });

  it('survives unavailable localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const service = create();
    expect(service.voice()).toBe('vyras');
    expect(() => service.setVoice('moteris')).not.toThrow();
    expect(service.voice()).toBe('moteris');
  });

  it('finds the same phrase and variant in the other voice', () => {
    const service = create();
    const sound = service.byId('pamerk-vyras-2')!;
    expect(service.counterpart(sound, 'moteris')?.id).toBe('pamerk-moteris-2');
    const unknown = service.byId('tuoj-jau-sustabdysite-automobili-nezinoma')!;
    expect(service.counterpart(unknown, 'moteris')).toBe(unknown);
  });
});
