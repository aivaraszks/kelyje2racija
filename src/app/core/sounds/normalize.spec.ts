import { normalize } from './normalize';

describe('normalize', () => {
  it('strips Lithuanian diacritics and lowercases', () => {
    expect(normalize('Be šansų!')).toBe('be sansu!');
    expect(normalize('ĄČĘĖĮŠŲŪŽ ąčęėįšųūž')).toBe('aceeisuuz aceeisuuz');
  });

  it('makes "sansu" match "Be šansų!"', () => {
    expect(normalize('Be šansų!')).toContain(normalize('sansu'));
    expect(normalize('Be šansų!')).toContain(normalize('ŠANSŲ'));
  });

  it('handles the empty string', () => {
    expect(normalize('')).toBe('');
  });
});
