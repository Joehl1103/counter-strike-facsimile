import { FIREARMS, WEAPON_ACTION_SOUNDS, type FirearmKind } from './game-rules.ts';
import { createClassicUspSamples } from './classic-usp-audio.ts';
import { getObjectiveActionSoundProfile, type ObjectiveActionCue } from './objective-audio.ts';

/** Original authored synthesis. No recordings or assets from Counter-Strike. */
export type FirearmSampleAction = 'fire' | 'reloadStart' | 'reloadCommit' | 'dryFire';
export type EquipmentSampleKey =
  | 'knife.swing' | 'knife.stab'
  | 'frag.throw' | 'smoke.throw' | 'flash.throw'
  | 'frag.detonate' | 'smoke.detonate' | 'flash.detonate'
  | 'bomb.beep' | 'bomb.detonate' | `bomb.${ObjectiveActionCue}`;
export type InteractionSampleKey = `${FirearmKind}.${FirearmSampleAction}` | EquipmentSampleKey;

const EQUIPMENT_SECONDS: Readonly<Record<EquipmentSampleKey, number>> = {
  'knife.swing': 0.13, 'knife.stab': 0.095,
  'frag.throw': 0.09, 'smoke.throw': 0.09, 'flash.throw': 0.09,
  'frag.detonate': 0.42, 'smoke.detonate': 0.16, 'flash.detonate': 0.18,
  'bomb.beep': 0.085, 'bomb.detonate': 0.42,
  'bomb.plant-start': getObjectiveActionSoundProfile('plant-start').durationSeconds,
  'bomb.plant-complete': getObjectiveActionSoundProfile('plant-complete').durationSeconds,
  'bomb.defuse-start': getObjectiveActionSoundProfile('defuse-start').durationSeconds,
  'bomb.defuse-complete': getObjectiveActionSoundProfile('defuse-complete').durationSeconds,
};

const FIREARM_ACTIONS: readonly FirearmSampleAction[] = ['fire', 'reloadStart', 'reloadCommit', 'dryFire'];
const FIREARM_KINDS = Object.keys(FIREARMS) as FirearmKind[];
export const INTERACTION_SAMPLE_KEYS: readonly InteractionSampleKey[] = Object.freeze([
  ...FIREARM_KINDS.flatMap(weapon => FIREARM_ACTIONS.map(action => `${weapon}.${action}` as const)),
  ...Object.keys(EQUIPMENT_SECONDS) as EquipmentSampleKey[],
]);

export function getInteractionSampleDuration(key: InteractionSampleKey): number {
  if (key in EQUIPMENT_SECONDS) return EQUIPMENT_SECONDS[key as EquipmentSampleKey];
  const [weapon, action] = key.split('.') as [FirearmKind, FirearmSampleAction];
  return action === 'fire' ? FIREARMS[weapon].feedback.sound.duration : WEAPON_ACTION_SOUNDS[weapon][action].duration;
}

function eventSeed(key: string, variant: number): number {
  let seed = 2166136261;
  for (const character of key) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return (seed + Math.trunc(variant) * 7919) >>> 0;
}

export function createClassicInteractionSamples(
  key: InteractionSampleKey,
  sampleRate: number,
  duration = getInteractionSampleDuration(key),
  variant = 0,
): Float32Array {
  if (!INTERACTION_SAMPLE_KEYS.includes(key)) throw new RangeError('Unknown interaction sample');
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000 ||
    !Number.isFinite(duration) || duration <= 0 || duration > 1 || !Number.isFinite(variant)) {
    throw new RangeError('Invalid audio sample dimensions');
  }
  const [instrument, action] = key.split('.');
  const firearm = FIREARM_KINDS.includes(instrument as FirearmKind) ? instrument as FirearmKind : null;
  // The accepted pilot remains byte-identical, including its two fire variants.
  if (firearm === 'usp') {
    return createClassicUspSamples(action as FirearmSampleAction, sampleRate, duration, variant);
  }

  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  let seed = eventSeed(key, variant);
  let lowNoise = 0;
  let previousNoise = 0;
  const lowPassAmount = 1 - Math.exp(-2 * Math.PI * 780 / sampleRate);
  const weaponIndex = firearm ? FIREARM_KINDS.indexOf(firearm) : 0;
  const bodyFrequency = firearm ? FIREARMS[firearm].feedback.sound.bodyFrequency : 90;
  const pitch = variant % 2 === 0 ? 0.985 : 1.025;

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    const time = sampleIndex / sampleRate;
    const progress = sampleIndex / samples.length;
    lowNoise += (noise - lowNoise) * lowPassAmount;
    const highNoise = noise - previousNoise;
    previousNoise = noise;
    let value: number;

    if (firearm && action === 'fire') {
      const crack = highNoise * 0.3 * Math.exp(-time * (100 + weaponIndex * 7));
      const body = Math.sin(2 * Math.PI * bodyFrequency * pitch * time) * 0.36 * Math.exp(-time * 32);
      const receiver = Math.sin(2 * Math.PI * (960 + weaponIndex * 130) * time) * 0.09 * Math.exp(-time * 90);
      value = crack + body + receiver + lowNoise * 0.55 * Math.exp(-time * 24);
    } else if (firearm) {
      const clickTime = action === 'reloadCommit' ? duration * 0.6 : 0;
      const clickAge = time >= clickTime ? time - clickTime : time;
      const metalFrequency = 1080 + weaponIndex * 127 + (action === 'dryFire' ? 580 : 0);
      const metal = Math.sin(2 * Math.PI * metalFrequency * clickAge);
      value = (highNoise * 0.3 + metal * 0.23) * Math.exp(-clickAge * 155);
      if (action === 'reloadStart') value += lowNoise * 0.35 * (1 - progress) ** 2;
    } else if (instrument === 'knife') {
      const sweep = Math.sin(Math.PI * progress) ** (action === 'stab' ? 3 : 1.5);
      value = (noise * 0.42 + lowNoise * 0.6) * sweep;
    } else if (action === 'throw') {
      // Pin/lever click followed by a short fabric and air swish.
      const click = highNoise * 0.24 * Math.exp(-time * 180);
      const swish = lowNoise * 0.7 * Math.sin(Math.PI * progress);
      value = click + swish;
    } else if (action === 'detonate') {
      const blastFrequency = instrument === 'bomb' ? 52 : instrument === 'frag' ? 87 : 310;
      const body = Math.sin(2 * Math.PI * blastFrequency * time) * (instrument === 'bomb' ? 0.42 : 0.24);
      const blast = instrument === 'flash' ? highNoise * 0.35 : noise * 0.35 + lowNoise * 0.5;
      value = (blast + body) * (1 - progress) ** (instrument === 'smoke' ? 1.7 : 2.8);
    } else if (key === 'bomb.beep') {
      value = Math.sign(Math.sin(2 * Math.PI * 880 * time)) * 0.75 * Math.exp(-time * 36);
    } else {
      const profile = getObjectiveActionSoundProfile(action as ObjectiveActionCue);
      const latch = Math.sin(2 * Math.PI * profile.frequencyHz * time);
      value = (highNoise * 0.28 + latch * 0.25 + lowNoise * 0.18) * Math.exp(-time * 45);
    }

    const attack = Math.min(1, time / 0.0006);
    const tail = Math.min(1, (samples.length - 1 - sampleIndex) / (sampleRate * 0.004));
    samples[sampleIndex] = Math.max(-1, Math.min(1, value * attack * tail));
  }
  return samples;
}
