import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createClassicUspSamples, CLASSIC_USP_EVENT_SECONDS, type ClassicUspEvent } from '../app/classic-usp-audio.ts';

const directory = resolve(process.argv[2] ?? 'outputs/cs16/p5a/audio-review');
mkdirSync(directory, { recursive: true });
const sampleRate = 48000;
const manifest: Record<string, unknown> = {};
for (const event of Object.keys(CLASSIC_USP_EVENT_SECONDS) as ClassicUspEvent[]) {
  const samples = createClassicUspSamples(event, sampleRate);
  const wave = Buffer.alloc(44 + samples.length * 2);
  wave.write('RIFF',0); wave.writeUInt32LE(wave.length - 8,4); wave.write('WAVEfmt ',8);
  wave.writeUInt32LE(16,16); wave.writeUInt16LE(1,20); wave.writeUInt16LE(1,22);
  wave.writeUInt32LE(sampleRate,24); wave.writeUInt32LE(sampleRate*2,28);
  wave.writeUInt16LE(2,32); wave.writeUInt16LE(16,34); wave.write('data',36); wave.writeUInt32LE(samples.length*2,40);
  for (let i=0;i<samples.length;i++) wave.writeInt16LE(Math.round(samples[i]*32767),44+i*2);
  writeFileSync(join(directory, `${event}.wav`),wave,{flag:'wx'});
  manifest[event] = { seconds:samples.length/sampleRate, sha256:createHash('sha256').update(wave).digest('hex') };
}
writeFileSync(join(directory,'manifest.json'),JSON.stringify({source:'Original procedural synthesis in app/classic-usp-audio.ts; no extracted audio',sampleRate,events:manifest},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(manifest,null,2));
