export type ObjectiveActionCue =
  | 'plant-start'
  | 'plant-complete'
  | 'defuse-start'
  | 'defuse-complete';

export const OBJECTIVE_ACTION_HEARING_RADIUS = 20;
export const OBJECTIVE_ACTION_SHARED_COOLDOWN_MS = 550;

export type ObjectiveActionSoundProfile = Readonly<{
  durationSeconds: number;
  frequencyHz: number;
  highpassHz: number;
  lowpassHz: number;
  noiseGain: number;
  toneGain: number;
}>;

const OBJECTIVE_ACTION_SOUND_PROFILES: Record<
  ObjectiveActionCue,
  ObjectiveActionSoundProfile
> = {
  'plant-start': {
    durationSeconds: 0.12,
    frequencyHz: 940,
    highpassHz: 420,
    lowpassHz: 2_200,
    noiseGain: 0.048,
    toneGain: 0.034,
  },
  'plant-complete': {
    durationSeconds: 0.17,
    frequencyHz: 520,
    highpassHz: 210,
    lowpassHz: 1_650,
    noiseGain: 0.068,
    toneGain: 0.046,
  },
  'defuse-start': {
    durationSeconds: 0.12,
    frequencyHz: 720,
    highpassHz: 330,
    lowpassHz: 1_900,
    noiseGain: 0.052,
    toneGain: 0.038,
  },
  'defuse-complete': {
    durationSeconds: 0.17,
    frequencyHz: 390,
    highpassHz: 180,
    lowpassHz: 1_400,
    noiseGain: 0.072,
    toneGain: 0.05,
  },
};

export function getObjectiveActionSoundProfile(cue: ObjectiveActionCue) {
  return OBJECTIVE_ACTION_SOUND_PROFILES[cue];
}

export function didObjectiveActionStart(wasActive: boolean, isActive: boolean) {
  return !wasActive && isActive;
}

export function shouldEmitBotObjectiveCue({
  cue,
  active,
  sourceAlive,
  listenerAlive,
  distance,
  nowMs,
  nextCueAtMs,
}: {
  cue: ObjectiveActionCue;
  active: boolean;
  sourceAlive: boolean;
  listenerAlive: boolean;
  distance: number;
  nowMs: number;
  nextCueAtMs: number;
}) {
  return (
    active &&
    sourceAlive &&
    listenerAlive &&
    Number.isFinite(distance) &&
    distance >= 0 &&
    distance < OBJECTIVE_ACTION_HEARING_RADIUS &&
    Number.isFinite(nowMs) &&
    Number.isFinite(nextCueAtMs) &&
    (cue.endsWith('-complete') || nowMs >= nextCueAtMs)
  );
}
