// Converts tools/sounds-src/*.wav -> public/sounds/<id>.mp3
// mono, 44.1 kHz, 96 kbps CBR, trimmed silence (<=50 ms), two-pass loudnorm.
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'tools', 'sounds-src');
const outDir = join(root, 'public', 'sounds');
const CONCURRENCY = 4;
const LN = 'I=-16:TP=-1.5:LRA=11';
const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05';
const TRIM = `${trim},areverse,${trim},areverse`;

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ['-hide_banner', '-nostdin', ...args], { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve(err) : reject(new Error(`ffmpeg exited ${code}\n${err.slice(-800)}`)),
    );
  });
}

// Duration in seconds from `ffmpeg -i` output.
async function duration(file) {
  const err = await run(['-i', file, '-f', 'null', '-']);
  const m = [...err.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : NaN;
}

async function convert(file) {
  const id = basename(file, '.wav');
  const src = join(srcDir, file);
  const dst = join(outDir, `${id}.mp3`);
  const first = await run(['-i', src, '-af', `${TRIM},loudnorm=${LN}:print_format=json`, '-f', 'null', '-']);
  const json = first.slice(first.lastIndexOf('{'), first.lastIndexOf('}') + 1);
  const m = JSON.parse(json);
  const af =
    `${TRIM},loudnorm=${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}` +
    `:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await run(['-y', '-i', src, '-af', af, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', '-write_xing', '0', dst]);
  const [inSize, outSize, inDur, outDur] = await Promise.all([
    stat(src).then((s) => s.size),
    stat(dst).then((s) => s.size),
    duration(src),
    duration(dst),
  ]);
  console.log(`${id}.mp3  ${(inSize / 1024).toFixed(0)} KB -> ${(outSize / 1024).toFixed(0)} KB  ${inDur.toFixed(2)}s -> ${outDur.toFixed(2)}s`);
  return { id, inSize, outSize, inDur, outDur };
}

const files = (await readdir(srcDir)).filter((f) => f.toLowerCase().endsWith('.wav')).sort();
if (!files.length) {
  console.error(`No WAV files in ${srcDir}`);
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const results = [];
let failed = 0;
const queue = [...files];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const f = queue.shift();
      try {
        results.push(await convert(f));
      } catch (e) {
        failed++;
        console.error(`FAILED ${f}: ${e.message}`);
      }
    }
  }),
);

const sum = (k) => results.reduce((a, r) => a + r[k], 0);
console.log(`\n${results.length}/${files.length} converted. Input ${(sum('inSize') / 1048576).toFixed(2)} MB -> output ${(sum('outSize') / 1048576).toFixed(2)} MB`);
const shrunk = results.filter((r) => r.inDur - r.outDur > 0.5);
if (shrunk.length) {
  console.warn('Duration shrank by >0.5 s:');
  for (const r of shrunk) console.warn(`  ${r.id}: ${r.inDur.toFixed(2)}s -> ${r.outDur.toFixed(2)}s`);
}
process.exit(failed ? 1 : 0);
