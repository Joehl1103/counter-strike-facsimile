import type { HitConfirmation } from './game-rules';

export type PlayerImpactCue =
  | 'body-impact'
  | 'head-impact'
  | 'kill-impact'
  | 'headshot-kill-impact';

export type CombatFeedbackSoundProfile = Readonly<{
  durationSeconds: number;
  highpassHz: number;
  lowpassHz: number;
  noiseGain: number;
  toneStartHz: number;
  toneEndHz: number;
  toneGain: number;
}>;

export const BODY_IMPACT_COOLDOWN_MS = 110;
export const DECISIVE_IMPACT_BODY_GATE_MS = 70;
export const BOT_DEATH_THUD_COOLDOWN_MS = 90;
export const BOT_DEATH_HEARING_RADIUS = 26;

const CUE_BY_CONFIRMATION: Readonly<Record<HitConfirmation, PlayerImpactCue>> =
  {
    body: 'body-impact',
    headshot: 'head-impact',
    kill: 'kill-impact',
    'headshot-kill': 'headshot-kill-impact',
  };

const SOUND_PROFILES: Readonly<
  Record<PlayerImpactCue, CombatFeedbackSoundProfile>
> = {
  'body-impact': {
    durationSeconds: 0.045,
    highpassHz: 280,
    lowpassHz: 1450,
    noiseGain: 0.045,
    toneStartHz: 0,
    toneEndHz: 0,
    toneGain: 0,
  },
  'head-impact': {
    durationSeconds: 0.055,
    highpassHz: 1100,
    lowpassHz: 4600,
    noiseGain: 0.06,
    toneStartHz: 2350,
    toneEndHz: 1750,
    toneGain: 0.014,
  },
  'kill-impact': {
    durationSeconds: 0.105,
    highpassHz: 120,
    lowpassHz: 900,
    noiseGain: 0.07,
    toneStartHz: 170,
    toneEndHz: 82,
    toneGain: 0.022,
  },
  'headshot-kill-impact': {
    durationSeconds: 0.115,
    highpassHz: 700,
    lowpassHz: 3100,
    noiseGain: 0.075,
    toneStartHz: 2100,
    toneEndHz: 120,
    toneGain: 0.02,
  },
};

export function getCombatFeedbackSoundProfile(cue: PlayerImpactCue) {
  return SOUND_PROFILES[cue];
}

export function selectPlayerImpactCue({
  confirmation,
  nowMs,
  nextBodyImpactAtMs,
}: Readonly<{
  confirmation: HitConfirmation | null;
  nowMs: number;
  nextBodyImpactAtMs: number;
}>): Readonly<{
  cue: PlayerImpactCue | null;
  nextBodyImpactAtMs: number;
}> {
  const safeNextAt =
    Number.isFinite(nextBodyImpactAtMs) && nextBodyImpactAtMs >= 0
      ? nextBodyImpactAtMs
      : 0;
  if (!confirmation || !Number.isFinite(nowMs) || nowMs < 0)
    return { cue: null, nextBodyImpactAtMs: safeNextAt };

  if (confirmation === 'body') {
    if (nowMs < safeNextAt)
      return { cue: null, nextBodyImpactAtMs: safeNextAt };
    return {
      cue: CUE_BY_CONFIRMATION.body,
      nextBodyImpactAtMs: nowMs + BODY_IMPACT_COOLDOWN_MS,
    };
  }

  return {
    cue: CUE_BY_CONFIRMATION[confirmation],
    nextBodyImpactAtMs: Math.max(
      safeNextAt,
      nowMs + DECISIVE_IMPACT_BODY_GATE_MS,
    ),
  };
}

export function shouldEmitBotDeathThud({
  active,
  listenerAlive,
  audible,
  nowMs,
  nextDeathThudAtMs,
}: Readonly<{
  active: boolean;
  listenerAlive: boolean;
  audible: boolean;
  nowMs: number;
  nextDeathThudAtMs: number;
}>) {
  return (
    active &&
    listenerAlive &&
    audible &&
    Number.isFinite(nowMs) &&
    nowMs >= 0 &&
    Number.isFinite(nextDeathThudAtMs) &&
    nextDeathThudAtMs >= 0 &&
    nowMs >= nextDeathThudAtMs
  );
}
