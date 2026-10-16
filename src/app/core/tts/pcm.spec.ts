import {
  concatPcm,
  hasSpeakableLetters,
  parseTokens,
  pcmToWav,
  pitchShift,
  prependSilence,
  speechFile,
  speechFileName,
  splitSentences,
  textToTokenIds,
} from './pcm';

function bytes(blob: Blob): Promise<DataView> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new DataView(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('pcmToWav', () => {
  it('writes a 44-byte PCM header for 16-bit mono 22.05 kHz', async () => {
    const wav = pcmToWav(new Float32Array([0, 1, -1, 0.5]));
    expect(wav.type).toBe('audio/wav');
    expect(wav.size).toBe(44 + 4 * 2);
    const view = await bytes(wav);
    expect(view.getUint32(0, true)).toBe(0x46464952);
    expect(view.getUint32(4, true)).toBe(wav.size - 8);
    expect(view.getUint32(8, true)).toBe(0x45564157);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getUint32(28, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(8);
  });

  it('converts and clamps samples', async () => {
    const view = await bytes(pcmToWav(new Float32Array([0, 1, -1, 2, -2])));
    const samples = [0, 1, 2, 3, 4].map((i) => view.getInt16(44 + i * 2, true));
    expect(samples).toEqual([0, 32767, -32768, 32767, -32768]);
  });
});

describe('pitchShift', () => {
  const pcm = new Float32Array(2205).map((_, i) => Math.sin(i / 10));

  it('returns the input for 0 semitones or empty input', () => {
    expect(pitchShift(pcm, 0)).toBe(pcm);
    const empty = new Float32Array(0);
    expect(pitchShift(empty, -5)).toBe(empty);
  });

  it('lengthens the audio when lowering by 5 semitones', () => {
    expect(pitchShift(pcm, -5).length).toBe(Math.round(pcm.length / 2 ** (-5 / 12)));
    expect(pitchShift(pcm, -5).length).toBeGreaterThan(pcm.length);
  });

  it('shortens the audio when raising', () => {
    expect(pitchShift(pcm, 12).length).toBe(Math.round(pcm.length / 2));
  });
});

describe('pcm helpers', () => {
  it('concatenates chunks', () => {
    const merged = concatPcm([new Float32Array([1, 2]), new Float32Array([3])]);
    expect([...merged]).toEqual([1, 2, 3]);
  });

  it('prepends 200 ms of silence at 22.05 kHz', () => {
    const padded = prependSilence(new Float32Array([1]));
    expect(padded.length).toBe(4411);
    expect(padded[0]).toBe(0);
    expect(padded[4410]).toBe(1);
  });

  it('splits sentences on . ! ? :', () => {
    expect(splitSentences('  Labas. Kaip sekasi? Gerai  ')).toEqual([
      'Labas.',
      'Kaip sekasi?',
      'Gerai',
    ]);
    expect(splitSentences('   ')).toEqual([]);
  });

  it('parses tokens and skips special ones', () => {
    const map = parseTokens('<PAD> 0\n<EOS> 1\na 5\nš 6\n\n');
    expect([...map]).toEqual([
      ['a', 5],
      ['š', 6],
    ]);
  });

  it('maps text to ids with blanks around known characters only', () => {
    const map = new Map([
      ['a', 5],
      ['š', 6],
    ]);
    expect(textToTokenIds('AŠ?', map)).toEqual([3, 5, 3, 6, 3]);
    expect(textToTokenIds('???', map)).toEqual([3]);
  });

  it('detects speakable letters', () => {
    expect(hasSpeakableLetters('Ąžuolas')).toBe(true);
    expect(hasSpeakableLetters('123 !?😀')).toBe(false);
  });
});

describe('speech file name', () => {
  it('builds racija-<slug>.wav without diacritics', () => {
    expect(speechFileName('Labas, kaip sekasi?')).toBe('racija-labas-kaip-sekasi.wav');
    expect(speechFileName('Šaunuolis!')).toBe('racija-saunuolis.wav');
  });

  it('limits the slug to 48 characters and falls back to garsas', () => {
    const name = speechFileName('a'.repeat(100));
    expect(name).toBe(`racija-${'a'.repeat(48)}.wav`);
    expect(speechFileName('😀')).toBe('racija-garsas.wav');
  });

  it('wraps the blob in an audio/wav file', () => {
    const file = speechFile('Labas', new Blob(['x']));
    expect(file.name).toBe('racija-labas.wav');
    expect(file.type).toBe('audio/wav');
  });
});
