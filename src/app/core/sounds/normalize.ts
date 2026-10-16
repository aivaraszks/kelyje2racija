/** Lowercases text and strips diacritics, so "sansu" matches "Be šansų!". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
