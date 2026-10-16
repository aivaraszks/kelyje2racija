/** Pure audio/text helpers for the TTS engine. No onnxruntime here, so they are cheap to test. */

export const SAMPLE_RATE = 22050;
export const LEAD_IN_SILENCE_MS = 200;
export const BLANK_ID = 3;
export const MAX_FILE_SLUG = 48;

/** Float32 samples (-1..1) to a 16-bit mono PCM WAV. */
export function pcmToWav(pcm: Float32Array, sampleRate: number = SAMPLE_RATE): Blob {
  const headerLength = 44;
  const view = new DataView(new ArrayBuffer(pcm.length * 2 + headerLength));

  view.setUint32(0, 0x46464952, true); // "RIFF"
  view.setUint32(4, view.buffer.byteLength - 8, true);
  view.setUint32(8, 0x45564157, true); // "WAVE"
  view.setUint32(12, 0x20746d66, true); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x61746164, true); // "data"
  view.setUint32(40, pcm.length * 2, true);

  let offset = headerLength;
  for (const value of pcm) {
    const sample = Math.max(-1, Math.min(1, value));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
}

/** Resamples to change pitch (and speed) by `semitones`. Negative lowers and lengthens. */
export function pitchShift(pcm: Float32Array, semitones: number): Float32Array {
  if (semitones === 0 || pcm.length === 0) {
    return pcm;
  }
  const ratio = 2 ** (semitones / 12);
  const newLength = Math.max(1, Math.round(pcm.length / ratio));
  const shifted = new Float32Array(newLength);
  for (let index = 0; index < newLength; index += 1) {
    const source = index * ratio;
    const base = Math.floor(source);
    const fraction = source - base;
    const sample0 = pcm[base] ?? 0;
    const sample1 = pcm[base + 1] ?? sample0;
    shifted[index] = sample0 + fraction * (sample1 - sample0);
  }
  return shifted;
}

export function concatPcm(chunks: readonly Float32Array[]): Float32Array {
  const merged = new Float32Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

export function prependSilence(
  pcm: Float32Array,
  ms: number = LEAD_IN_SILENCE_MS,
  sampleRate: number = SAMPLE_RATE,
): Float32Array {
  const samples = Math.round((sampleRate * ms) / 1000);
  if (samples <= 0) {
    return pcm;
  }
  const padded = new Float32Array(pcm.length + samples);
  padded.set(pcm, samples);
  return padded;
}

export function splitSentences(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }
  const parts = normalized.match(/[^.!?:]+[.!?:]?/g) ?? [normalized];
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** `tokens.txt` lines are "<symbol> <id>". Special tokens are skipped. */
export function parseTokens(text: string): Map<string, number> {
  const tokenToId = new Map<string, number>();
  for (const line of text.split('\n')) {
    const [symbol, idText] = line.trim().split(/\s+/, 2);
    if (!symbol || !idText || ['<PAD>', '<EOS>', '<BOS>', '<BLNK>'].includes(symbol)) {
      continue;
    }
    tokenToId.set(symbol, Number(idText));
  }
  return tokenToId;
}

/** Lowercased characters mapped to ids with a blank id around each one. Unknown characters are dropped. */
export function textToTokenIds(text: string, tokenToId: ReadonlyMap<string, number>): number[] {
  const tokens: number[] = [BLANK_ID];
  for (const char of text.toLowerCase()) {
    const id = tokenToId.get(char);
    if (id !== undefined) {
      tokens.push(id, BLANK_ID);
    }
  }
  return tokens;
}

/** True when the text has at least one letter the Lithuanian voice can pronounce. */
export function hasSpeakableLetters(text: string): boolean {
  return /[a-ząčęėįšųūž]/i.test(text);
}

/** `racija-<slug>.wav`, ASCII-only slug of at most 48 characters. */
export function speechFileName(text: string): string {
  const slug =
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_FILE_SLUG)
      .replace(/-+$/g, '') || 'garsas';
  return `racija-${slug}.wav`;
}

/** The generated speech as a shareable file named `racija-<slug>.wav`. */
export function speechFile(text: string, wav: Blob): File {
  return new File([wav], speechFileName(text), { type: 'audio/wav' });
}
