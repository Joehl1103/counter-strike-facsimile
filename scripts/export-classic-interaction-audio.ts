import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { createClassicInteractionSamples, INTERACTION_SAMPLE_KEYS } from '../app/classic-interaction-audio.ts';

const directory = resolve(process.argv[2] ?? 'outputs/cs16/interaction-audio-review');
const sampleRate = 48000;
mkdirSync(directory, { recursive: true });
const events: Record<string, { seconds: number; sha256: string }> = {};

for (const key of INTERACTION_SAMPLE_KEYS) {
  const samples = createClassicInteractionSamples(key, sampleRate);
  const wave = Buffer.alloc(44 + samples.length * 2);
  wave.write('RIFF', 0);
  wave.writeUInt32LE(wave.length - 8, 4);
  wave.write('WAVEfmt ', 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20); // PCM
  wave.writeUInt16LE(1, 22); // mono
  wave.writeUInt32LE(sampleRate, 24);
  wave.writeUInt32LE(sampleRate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36);
  wave.writeUInt32LE(samples.length * 2, 40);
  for (const [sampleIndex, sample] of samples.entries()) {
    wave.writeInt16LE(Math.round(sample * 32767), 44 + sampleIndex * 2);
  }
  writeFileSync(join(directory, `${key}.wav`), wave, { flag: 'wx' });
  events[key] = {
    seconds: samples.length / sampleRate,
    sha256: createHash('sha256').update(wave).digest('hex'),
  };
}

writeFileSync(join(directory, 'manifest.json'), JSON.stringify({
  source: 'Original procedural synthesis in app/classic-interaction-audio.ts; USP pilot preserved. No extracted game audio.',
  scope: 'Source samples at runtime durations, before playback filters, gains and supplementary tones. Engineering review, not listening approval.',
  sampleRate,
  events,
}, null, 2) + '\n', { flag: 'wx' });
console.log(`Exported ${Object.keys(events).length} original source samples to ${directory}`);
