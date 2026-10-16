import { SOUND_CATALOG, soundLabel } from './sound-catalog';

describe('SOUND_CATALOG', () => {
  it('has 76 entries with unique ids and relative file paths', () => {
    expect(SOUND_CATALOG).toHaveLength(76);
    expect(new Set(SOUND_CATALOG.map((s) => s.id)).size).toBe(76);
    for (const s of SOUND_CATALOG) {
      expect(s.file).toBe(`sounds/${s.id}.mp3`);
      expect(s.file.startsWith('/')).toBe(false);
    }
  });

  it('has 37 phrases: 36 per voice, 2 nezinoma', () => {
    expect(SOUND_CATALOG.filter((s) => s.voice === 'vyras')).toHaveLength(37);
    expect(SOUND_CATALOG.filter((s) => s.voice === 'moteris')).toHaveLength(37);
    expect(SOUND_CATALOG.filter((s) => s.voice === 'nezinoma')).toHaveLength(2);
  });

  it('numbers only variants of groups with more than one clip', () => {
    const numbered = SOUND_CATALOG.filter((s) => s.variant !== undefined).map(soundLabel);
    expect(numbered.sort()).toEqual([
      'Pamiršk (1)',
      'Pamiršk (1)',
      'Pamiršk (2)',
      'Pamiršk (2)',
      'Rinkis (1)',
      'Rinkis (1)',
      'Rinkis (2)',
      'Rinkis (2)',
    ]);
    expect(soundLabel({ text: 'Be šansų!' })).toBe('Be šansų!');
  });
});
