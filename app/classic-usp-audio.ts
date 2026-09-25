/** Original procedural pistol samples. No game recordings or extracted assets. */
export type ClassicUspEvent = 'fire' | 'dryFire' | 'reloadStart' | 'reloadCommit' | 'bodyImpact';
export const CLASSIC_USP_EVENT_SECONDS: Readonly<Record<ClassicUspEvent, number>> = Object.freeze({
  fire: 0.085, dryFire: 0.027, reloadStart: 0.07, reloadCommit: 0.052, bodyImpact: 0.045,
});
const EVENT_SEEDS: Readonly<Record<ClassicUspEvent, number>> = {
  fire: 16061, dryFire: 16062, reloadStart: 16063, reloadCommit: 16064, bodyImpact: 16065,
};

export function createClassicUspSamples(event: ClassicUspEvent, sampleRate: number,
  duration = CLASSIC_USP_EVENT_SECONDS[event], variant = 0): Float32Array {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000 ||
      !Number.isFinite(duration) || duration <= 0 || duration > 1) throw new RangeError('Invalid audio sample dimensions');
  const data = new Float32Array(Math.ceil(sampleRate * duration));
  let seed = (EVENT_SEEDS[event] + (Number.isFinite(variant) ? Math.trunc(variant) : 0) * 7919) >>> 0;
  let low = 0, previousNoise = 0;
  const tail = Math.max(1, Math.floor(sampleRate * 0.004));
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    const t = i / sampleRate;
    const attack = Math.min(1, i / Math.max(1, sampleRate * 0.0006));
    const end = Math.min(1, (data.length - 1 - i) / tail);
    low += (noise - low) * (1 - Math.exp(-Math.PI * 2 * 850 / sampleRate));
    const high = noise - previousNoise;
    previousNoise = noise;
    let value: number;
    if (event === 'fire') {
      const crack = high * 0.38 * Math.exp(-t * 145);
      const body = Math.sin(2 * Math.PI * (155 * t - 180 * t * t)) * 0.46 * Math.exp(-t * 34);
      value = crack + body + low * 0.8 * Math.exp(-t * 26);
    } else if (event === 'bodyImpact') {
      value = (low * 1.1 + Math.sin(t * 2 * Math.PI * 115) * 0.26) * Math.exp(-t * 48);
    } else {
      const secondClick = event === 'reloadCommit' ? 0.044 : event === 'reloadStart' ? 0.085 : 2;
      const clickAge = t >= secondClick ? t - secondClick : t;
      const metallic = Math.sin(clickAge * 2 * Math.PI * (event === 'dryFire' ? 1840 : 1150));
      value = (high * 0.3 + metallic * 0.22) * Math.exp(-clickAge * 135);
      if (event === 'reloadStart') value += low * 0.3 * Math.exp(-t * 22);
    }
    data[i] = Math.max(-1, Math.min(1, value * attack * end));
  }
  return data;
}
