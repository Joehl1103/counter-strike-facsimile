import { DUST2_MAP, mapRoute } from './dust2-map.ts';
import { GOLDSRC_UNITS_PER_SCENE_UNIT } from './player-collision.ts';
export type BombsiteName = 'A' | 'B';
export type FirearmKind =
  | 'rifle'
  | 'carbine'
  | 'smg'
  | 'shotgun'
  | 'sniper'
  | 'glock18'
  | 'usp'
  | 'p228'
  | 'deagle'
  | 'elite'
  | 'fiveseven';
export type SecondaryWeaponKind =
  | 'glock18'
  | 'usp'
  | 'p228'
  | 'deagle'
  | 'elite'
  | 'fiveseven';
export type PrimaryWeaponKind = Exclude<FirearmKind, SecondaryWeaponKind>;
export const SECONDARY_WEAPON_KINDS = [
  'glock18',
  'usp',
  'p228',
  'deagle',
  'elite',
  'fiveseven',
] as const satisfies readonly SecondaryWeaponKind[];
export type WeaponKind =
  | FirearmKind
  | 'knife'
  | 'grenade'
  | 'smoke'
  | 'flash'
  | 'bomb';
export type PlayerKillWeaponKind = FirearmKind | 'knife' | 'grenade';
export type HitConfirmation = 'body' | 'headshot' | 'kill' | 'headshot-kill';
export type HitGroup = 'head' | 'torso' | 'stomach' | 'leg';
export type HitscanImpact = 'target' | 'world' | 'none';
export type WeaponHandling = Readonly<{
  runSpeed: number;
  equipMs: number;
  scopedSpeedMultiplier?: number;
}>;
export type HorizontalVelocity = Readonly<{ x: number; z: number }>;
export type JumpButtonState = Readonly<{
  jumpReady: boolean;
  shouldJump: boolean;
}>;
export type InputLatches = Readonly<{
  keys: ReadonlySet<string>;
  firing: boolean;
  triggerReady: boolean;
  dropRequested: boolean;
  touchLookPointer: number | null;
}>;
export type DamageDirection = 'front' | 'right' | 'back' | 'left';
export type Side = 'ct' | 't';
export type BotDifficulty = 'recruit' | 'standard' | 'veteran';
export type MatchTeam = 'player' | 'opponent';
export type BotTeam = 'ally' | 'enemy';
export type TeamScores = Record<MatchTeam, number>;
export type TeamLossStreaks = Record<MatchTeam, number>;
export type MatchWinner = MatchTeam | null;
export type MatchTransition =
  | 'none'
  | 'halftime'
  | 'overtime'
  | 'overtime-halftime'
  | 'overtime-restart';
export type MatchRoundPhase = Readonly<{
  kind: 'regulation' | 'overtime';
  label: string;
  roundNumber: number;
  roundLimit: number;
  targetScore: number;
  overtimeNumber: number | null;
}>;
export type MatchState = {
  startingPlayerSide: Side;
  playerSide: Side;
  scores: TeamScores;
  lossStreaks: TeamLossStreaks;
};
export type RoundTransitionBrief = Readonly<{
  event: RoundEndEvent;
  winnerSide: Side;
  playerWon: boolean;
  score: Readonly<Record<Side, number>>;
  earned: number;
  bankAfter: number;
  terminal: boolean;
  next: Readonly<{
    playerSide: Side;
    transition: MatchTransition;
    economyReset: boolean;
    faction: 'CT' | 'T';
    objective: string;
    targetSite: BombsiteName;
    approach: RoundPlan['approach'];
    startingBank: number;
    phase: MatchRoundPhase;
  }> | null;
}>;
export type BombState =
  | 'carried'
  | 'dropped'
  | 'planting'
  | 'planted'
  | 'defused'
  | 'detonated';
export type RoundEndEvent =
  | 'ct-eliminated'
  | 't-eliminated'
  | 'time-expired'
  | 'bomb-defused'
  | 'bomb-detonated';

export const REGULATION_HALF_ROUNDS = 15;
export const REGULATION_ROUNDS = REGULATION_HALF_ROUNDS * 2;
export const MATCH_WIN_SCORE = REGULATION_HALF_ROUNDS + 1;
export const HALFTIME_AFTER_ROUNDS = REGULATION_HALF_ROUNDS;
export const OVERTIME_HALF_ROUNDS = 3;
export const OVERTIME_ROUNDS = OVERTIME_HALF_ROUNDS * 2;
export const OVERTIME_START_MONEY = 10_000;
export const ROUND_DURATION_SECONDS = 105;
export const BUY_DURATION_SECONDS = 15;
export const BUY_CUTOFF_SECONDS = ROUND_DURATION_SECONDS - BUY_DURATION_SECONDS;
export const MAX_MONEY = 16000;
export const BUY_ZONE_RADIUS = 3;
export const BOMB_PICKUP_RADIUS = 1.35;
export const FIREARM_PICKUP_RADIUS = 1.35;
export const PLAYER_CROUCH_OFFSET = 0.55;
export const PLAYER_STANDING_EYE_HEIGHT = 1.68;
export const PLAYER_LANDING_RECOVERY_SECONDS = 0.2;
export const PLAYER_GROUND_ACCELERATION = 10;
export const PLAYER_GROUND_FRICTION = 4;
export const PLAYER_AIR_ACCELERATION = 10;
export const PLAYER_BUNNY_SPEED_RATIO = 1.7;
export const PLAYER_BUNNY_SPEED_CROP = 0.65;
export const PLAYER_MOVEMENT_MAX_STEP_SECONDS = 0.05;
export const PLAYER_SPAWNS: Readonly<Record<Side, readonly [number, number]>> =
  {
    ct: DUST2_MAP.spawns.ct,
    t: DUST2_MAP.spawns.t,
  };

export const WEAPON_HANDLING: Readonly<Record<WeaponKind, WeaponHandling>> = {
  knife: { runSpeed: 5.45, equipMs: 240 },
  glock18: { runSpeed: 4.95, equipMs: 320 },
  usp: { runSpeed: 4.95, equipMs: 320 },
  p228: { runSpeed: 4.95, equipMs: 320 },
  deagle: { runSpeed: 4.95, equipMs: 320 },
  elite: { runSpeed: 4.95, equipMs: 320 },
  fiveseven: { runSpeed: 4.95, equipMs: 320 },
  smg: { runSpeed: 4.85, equipMs: 420 },
  rifle: { runSpeed: 4.55, equipMs: 520 },
  carbine: { runSpeed: 4.55, equipMs: 520 },
  shotgun: { runSpeed: 4.35, equipMs: 560 },
  sniper: { runSpeed: 3.75, equipMs: 760, scopedSpeedMultiplier: 0.58 },
  grenade: { runSpeed: 4.75, equipMs: 400 },
  smoke: { runSpeed: 4.75, equipMs: 400 },
  flash: { runSpeed: 4.75, equipMs: 400 },
  bomb: { runSpeed: 4.75, equipMs: 400 },
};

export const PLAYER_MOVEMENT_REFERENCE_SPEED = WEAPON_HANDLING.rifle.runSpeed;
export const PLAYER_GROUND_STOP_SPEED =
  PLAYER_MOVEMENT_REFERENCE_SPEED * (100 / 250);
export const PLAYER_AIR_WISH_SPEED =
  PLAYER_MOVEMENT_REFERENCE_SPEED * (30 / 250);

export type BuyBlockReason =
  | 'round-inactive'
  | 'player-dead'
  | 'buy-period-ended'
  | 'outside-buy-zone';

export type FirearmDefinition = {
  label: string;
  slot: 'primary' | 'secondary';
  price: number;
  ammoPrice: number;
  ammoPurchaseAmount: number;
  magazineSize: number;
  purchaseReserve: number;
  maxReserve: number;
  trigger: 'automatic' | 'semi';
  reloadMode: 'magazine' | 'shell';
  reloadMs: number;
  fireIntervalMs: number;
  pellets: number;
  bodyDamage: number;
  headMultiplier: number;
  rangeModifier: number;
  maximumRange: number;
  noiseRadius: number;
  noiseMemory: number;
  recoil: {
    spreadKick: number;
    maxPenalty: number;
  };
  scope?: {
    fov: number;
    sensitivityMultiplier: number;
  };
  feedback: {
    sound: {
      duration: number;
      highpass: number;
      lowpass: number;
      gain: number;
      bodyFrequency: number;
    };
    viewKick: {
      back: number;
      up: number;
      roll: number;
      recovery: number;
    };
  };
};

export type FirearmAmmo = { magazine: number; reserve: number };

export type WeaponActionSound = Readonly<{
  duration: number;
  highpass: number;
  lowpass: number;
  gain: number;
  toneFrequency: number;
}>;

export type WeaponActionSoundSet = Readonly<{
  reloadStart: WeaponActionSound;
  reloadCommit: WeaponActionSound;
  dryFire: WeaponActionSound;
}>;

export const FIREARMS: Record<FirearmKind, FirearmDefinition> = {
  rifle: {
    label: 'AK-47',
    slot: 'primary',
    price: 2500,
    ammoPrice: 80,
    ammoPurchaseAmount: 30,
    magazineSize: 30,
    purchaseReserve: 0,
    maxReserve: 90,
    trigger: 'automatic',
    reloadMode: 'magazine',
    reloadMs: 2450,
    fireIntervalMs: 95.5,
    pellets: 1,
    bodyDamage: 36,
    headMultiplier: 4,
    rangeModifier: 0.98,
    maximumRange: 8192 / 40,
    noiseRadius: 48,
    noiseMemory: 4.5,
    recoil: {
      spreadKick: 0.035,
      maxPenalty: 0.14,
    },
    feedback: {
      sound: {
        duration: 0.12,
        highpass: 90,
        lowpass: 1850,
        gain: 0.48,
        bodyFrequency: 108,
      },
      viewKick: { back: 0.075, up: 0.016, roll: 0.022, recovery: 19 },
    },
  },
  carbine: {
    label: 'M4A1',
    slot: 'primary',
    price: 3100,
    ammoPrice: 60,
    ammoPurchaseAmount: 30,
    magazineSize: 30,
    purchaseReserve: 0,
    maxReserve: 90,
    trigger: 'automatic',
    reloadMode: 'magazine',
    reloadMs: 3050,
    fireIntervalMs: 87.5,
    pellets: 1,
    bodyDamage: 32,
    headMultiplier: 4,
    rangeModifier: 0.97,
    maximumRange: 8192 / 40,
    noiseRadius: 46,
    noiseMemory: 4.3,
    recoil: {
      spreadKick: 0.028,
      maxPenalty: 0.115,
    },
    feedback: {
      sound: {
        duration: 0.105,
        highpass: 115,
        lowpass: 2150,
        gain: 0.43,
        bodyFrequency: 126,
      },
      viewKick: { back: 0.062, up: 0.013, roll: 0.017, recovery: 21 },
    },
  },
  smg: {
    label: 'MP5',
    slot: 'primary',
    price: 1500,
    ammoPrice: 20,
    ammoPurchaseAmount: 30,
    magazineSize: 30,
    purchaseReserve: 0,
    maxReserve: 120,
    trigger: 'automatic',
    reloadMode: 'magazine',
    reloadMs: 2630,
    fireIntervalMs: 75,
    pellets: 1,
    bodyDamage: 26,
    headMultiplier: 4,
    rangeModifier: 0.84,
    maximumRange: 8192 / 40,
    noiseRadius: 42,
    noiseMemory: 4,
    recoil: {
      spreadKick: 0.026,
      maxPenalty: 0.12,
    },
    feedback: {
      sound: {
        duration: 0.075,
        highpass: 180,
        lowpass: 2700,
        gain: 0.34,
        bodyFrequency: 158,
      },
      viewKick: { back: 0.045, up: 0.009, roll: 0.014, recovery: 25 },
    },
  },
  shotgun: {
    label: 'M3',
    slot: 'primary',
    price: 1700,
    ammoPrice: 65,
    ammoPurchaseAmount: 8,
    magazineSize: 8,
    purchaseReserve: 0,
    maxReserve: 32,
    trigger: 'semi',
    reloadMode: 'shell',
    reloadMs: 450,
    fireIntervalMs: 875,
    pellets: 9,
    bodyDamage: 20,
    headMultiplier: 4,
    rangeModifier: 1,
    maximumRange: 3000 / 40,
    noiseRadius: 52,
    noiseMemory: 5,
    recoil: {
      spreadKick: 0.052,
      maxPenalty: 0.16,
    },
    feedback: {
      sound: {
        duration: 0.18,
        highpass: 55,
        lowpass: 1200,
        gain: 0.62,
        bodyFrequency: 72,
      },
      viewKick: { back: 0.13, up: 0.028, roll: 0.032, recovery: 13 },
    },
  },
  sniper: {
    label: 'AWP',
    slot: 'primary',
    price: 4750,
    ammoPrice: 125,
    ammoPurchaseAmount: 10,
    magazineSize: 10,
    purchaseReserve: 0,
    maxReserve: 30,
    trigger: 'semi',
    reloadMode: 'magazine',
    reloadMs: 2500,
    fireIntervalMs: 1450,
    pellets: 1,
    bodyDamage: 115,
    headMultiplier: 4,
    rangeModifier: 0.99,
    maximumRange: 8192 / 40,
    noiseRadius: 60,
    noiseMemory: 5.5,
    recoil: {
      spreadKick: 0.095,
      maxPenalty: 0.22,
    },
    scope: {
      fov: 40,
      sensitivityMultiplier: 0.46,
        },
    feedback: {
      sound: {
        duration: 0.2,
        highpass: 48,
        lowpass: 1300,
        gain: 0.68,
        bodyFrequency: 64,
      },
      viewKick: { back: 0.18, up: 0.04, roll: 0.026, recovery: 10 },
    },
  },
  glock18: {
    label: 'Glock 18',
    slot: 'secondary',
    price: 400,
    ammoPrice: 20,
    ammoPurchaseAmount: 30,
    magazineSize: 20,
    purchaseReserve: 0,
    maxReserve: 120,
    trigger: 'semi',
    reloadMode: 'magazine',
    reloadMs: 2200,
    fireIntervalMs: 150,
    pellets: 1,
    bodyDamage: 25,
    headMultiplier: 4,
    rangeModifier: 0.75,
    maximumRange: 8192 / 40,
    noiseRadius: 38,
    noiseMemory: 3.6,
    recoil: {
      spreadKick: 0.025,
      maxPenalty: 0.11,
    },
    feedback: {
      sound: {
        duration: 0.09,
        highpass: 240,
        lowpass: 3300,
        gain: 0.38,
        bodyFrequency: 215,
      },
      viewKick: { back: 0.055, up: 0.012, roll: 0.018, recovery: 21 },
    },
  },
  usp: {
    label: 'USP',
    slot: 'secondary',
    price: 500,
    ammoPrice: 25,
    ammoPurchaseAmount: 12,
    magazineSize: 12,
    purchaseReserve: 0,
    maxReserve: 100,
    trigger: 'semi',
    reloadMode: 'magazine',
    reloadMs: 2700,
    fireIntervalMs: 150,
    pellets: 1,
    bodyDamage: 34,
    headMultiplier: 4,
    rangeModifier: 0.79,
    maximumRange: 4096 / 40,
    noiseRadius: 35,
    noiseMemory: 3.4,
    recoil: { spreadKick: 0.024, maxPenalty: 0.1 },
    feedback: {
      sound: {
        duration: 0.085,
        highpass: 260,
        lowpass: 3200,
        gain: 0.34,
        bodyFrequency: 225,
      },
      viewKick: { back: 0.05, up: 0.011, roll: 0.017, recovery: 22 },
    },
  },
  p228: {
    label: 'P228',
    slot: 'secondary',
    price: 600,
    ammoPrice: 50,
    ammoPurchaseAmount: 13,
    magazineSize: 13,
    purchaseReserve: 0,
    maxReserve: 52,
    trigger: 'semi',
    reloadMode: 'magazine',
    reloadMs: 2700,
    fireIntervalMs: 200,
    pellets: 1,
    bodyDamage: 32,
    headMultiplier: 4,
    rangeModifier: 0.8,
    maximumRange: 4096 / 40,
    noiseRadius: 39,
    noiseMemory: 3.8,
    recoil: { spreadKick: 0.025, maxPenalty: 0.11 },
    feedback: {
      sound: {
        duration: 0.095,
        highpass: 220,
        lowpass: 3100,
        gain: 0.4,
        bodyFrequency: 205,
      },
      viewKick: { back: 0.056, up: 0.012, roll: 0.019, recovery: 20 },
    },
  },
  deagle: {
    label: 'Desert Eagle',
    slot: 'secondary',
    price: 650,
    ammoPrice: 40,
    ammoPurchaseAmount: 7,
    magazineSize: 7,
    purchaseReserve: 0,
    maxReserve: 35,
    trigger: 'semi',
    reloadMode: 'magazine',
    reloadMs: 2200,
    fireIntervalMs: 300,
    pellets: 1,
    bodyDamage: 54,
    headMultiplier: 4,
    rangeModifier: 0.81,
    maximumRange: 4096 / 40,
    noiseRadius: 48,
    noiseMemory: 4.5,
    recoil: { spreadKick: 0.04, maxPenalty: 0.15 },
    feedback: {
      sound: {
        duration: 0.12,
        highpass: 80,
        lowpass: 2000,
        gain: 0.56,
        bodyFrequency: 102,
      },
      viewKick: { back: 0.09, up: 0.02, roll: 0.025, recovery: 15 },
    },
  },
  elite: {
    label: 'Dual Elites',
    slot: 'secondary',
    price: 800,
    ammoPrice: 20,
    ammoPurchaseAmount: 30,
    magazineSize: 30,
    purchaseReserve: 0,
    maxReserve: 120,
    trigger: 'semi',
    reloadMode: 'magazine',
    reloadMs: 4500,
    fireIntervalMs: 75,
    pellets: 1,
    bodyDamage: 36,
    headMultiplier: 4,
    rangeModifier: 0.75,
    maximumRange: 8192 / 40,
    noiseRadius: 44,
    noiseMemory: 4.1,
    recoil: { spreadKick: 0.03, maxPenalty: 0.12 },
    feedback: {
      sound: {
        duration: 0.105,
        highpass: 140,
        lowpass: 2700,
        gain: 0.48,
        bodyFrequency: 145,
      },
      viewKick: { back: 0.07, up: 0.015, roll: 0.022, recovery: 18 },
    },
  },
  fiveseven: {
    label: 'Five-Seven',
    slot: 'secondary',
    price: 750,
    ammoPrice: 50,
    ammoPurchaseAmount: 50,
    magazineSize: 20,
    purchaseReserve: 0,
    maxReserve: 100,
    trigger: 'semi',
    reloadMode: 'magazine',
    reloadMs: 2700,
    fireIntervalMs: 200,
    pellets: 1,
    bodyDamage: 20,
    headMultiplier: 4,
    rangeModifier: 0.885,
    maximumRange: 4096 / 40,
    noiseRadius: 36,
    noiseMemory: 3.5,
    recoil: { spreadKick: 0.023, maxPenalty: 0.1 },
    feedback: {
      sound: {
        duration: 0.09,
        highpass: 240,
        lowpass: 3300,
        gain: 0.37,
        bodyFrequency: 215,
      },
      viewKick: { back: 0.052, up: 0.011, roll: 0.017, recovery: 21 },
    },
  },
};

export const WEAPON_ACTION_SOUNDS: Readonly<
  Record<FirearmKind, WeaponActionSoundSet>
> = {
  rifle: {
    reloadStart: {
      duration: 0.11,
      highpass: 180,
      lowpass: 2100,
      gain: 0.11,
      toneFrequency: 165,
    },
    reloadCommit: {
      duration: 0.09,
      highpass: 260,
      lowpass: 2900,
      gain: 0.13,
      toneFrequency: 235,
    },
    dryFire: {
      duration: 0.035,
      highpass: 900,
      lowpass: 4200,
      gain: 0.08,
      toneFrequency: 680,
    },
  },
  carbine: {
    reloadStart: {
      duration: 0.095,
      highpass: 230,
      lowpass: 2500,
      gain: 0.1,
      toneFrequency: 195,
    },
    reloadCommit: {
      duration: 0.075,
      highpass: 340,
      lowpass: 3200,
      gain: 0.12,
      toneFrequency: 275,
    },
    dryFire: {
      duration: 0.032,
      highpass: 1050,
      lowpass: 4500,
      gain: 0.075,
      toneFrequency: 735,
    },
  },
  smg: {
    reloadStart: {
      duration: 0.085,
      highpass: 300,
      lowpass: 2800,
      gain: 0.09,
      toneFrequency: 230,
    },
    reloadCommit: {
      duration: 0.065,
      highpass: 420,
      lowpass: 3600,
      gain: 0.11,
      toneFrequency: 320,
    },
    dryFire: {
      duration: 0.03,
      highpass: 1100,
      lowpass: 4700,
      gain: 0.07,
      toneFrequency: 760,
    },
  },
  shotgun: {
    reloadStart: {
      duration: 0.13,
      highpass: 120,
      lowpass: 1700,
      gain: 0.12,
      toneFrequency: 120,
    },
    reloadCommit: {
      duration: 0.105,
      highpass: 190,
      lowpass: 2300,
      gain: 0.14,
      toneFrequency: 185,
    },
    dryFire: {
      duration: 0.045,
      highpass: 620,
      lowpass: 3300,
      gain: 0.09,
      toneFrequency: 510,
    },
  },
  sniper: {
    reloadStart: {
      duration: 0.15,
      highpass: 90,
      lowpass: 1550,
      gain: 0.13,
      toneFrequency: 105,
    },
    reloadCommit: {
      duration: 0.12,
      highpass: 145,
      lowpass: 2200,
      gain: 0.15,
      toneFrequency: 150,
    },
    dryFire: {
      duration: 0.05,
      highpass: 500,
      lowpass: 3000,
      gain: 0.1,
      toneFrequency: 430,
    },
  },
  glock18: {
    reloadStart: {
      duration: 0.075,
      highpass: 420,
      lowpass: 3400,
      gain: 0.085,
      toneFrequency: 310,
    },
    reloadCommit: {
      duration: 0.055,
      highpass: 620,
      lowpass: 4300,
      gain: 0.1,
      toneFrequency: 410,
    },
    dryFire: {
      duration: 0.028,
      highpass: 1400,
      lowpass: 5200,
      gain: 0.065,
      toneFrequency: 880,
    },
  },
  usp: {
    reloadStart: {
      duration: 0.07,
      highpass: 430,
      lowpass: 3350,
      gain: 0.08,
      toneFrequency: 300,
    },
    reloadCommit: {
      duration: 0.052,
      highpass: 640,
      lowpass: 4350,
      gain: 0.095,
      toneFrequency: 400,
    },
    dryFire: {
      duration: 0.027,
      highpass: 1450,
      lowpass: 5250,
      gain: 0.06,
      toneFrequency: 860,
    },
  },
  p228: {
    reloadStart: {
      duration: 0.078,
      highpass: 410,
      lowpass: 3350,
      gain: 0.087,
      toneFrequency: 315,
    },
    reloadCommit: {
      duration: 0.056,
      highpass: 610,
      lowpass: 4280,
      gain: 0.102,
      toneFrequency: 415,
    },
    dryFire: {
      duration: 0.029,
      highpass: 1380,
      lowpass: 5180,
      gain: 0.066,
      toneFrequency: 890,
    },
  },
  deagle: {
    reloadStart: {
      duration: 0.09,
      highpass: 300,
      lowpass: 2900,
      gain: 0.105,
      toneFrequency: 260,
    },
    reloadCommit: {
      duration: 0.065,
      highpass: 500,
      lowpass: 3800,
      gain: 0.125,
      toneFrequency: 350,
    },
    dryFire: {
      duration: 0.032,
      highpass: 1150,
      lowpass: 4800,
      gain: 0.074,
      toneFrequency: 760,
    },
  },
  elite: {
    reloadStart: {
      duration: 0.1,
      highpass: 260,
      lowpass: 2850,
      gain: 0.11,
      toneFrequency: 240,
    },
    reloadCommit: {
      duration: 0.075,
      highpass: 460,
      lowpass: 3720,
      gain: 0.13,
      toneFrequency: 330,
    },
    dryFire: {
      duration: 0.034,
      highpass: 1080,
      lowpass: 4750,
      gain: 0.078,
      toneFrequency: 740,
    },
  },
  fiveseven: {
    reloadStart: {
      duration: 0.073,
      highpass: 445,
      lowpass: 3420,
      gain: 0.082,
      toneFrequency: 325,
    },
    reloadCommit: {
      duration: 0.054,
      highpass: 655,
      lowpass: 4400,
      gain: 0.098,
      toneFrequency: 425,
    },
    dryFire: {
      duration: 0.026,
      highpass: 1480,
      lowpass: 5300,
      gain: 0.062,
      toneFrequency: 900,
    },
  },
};

export function decayShotPulse(
  currentPulse: number,
  frameSeconds: number,
  recovery: number,
) {
  if (currentPulse <= 0) return 0;
  return (
    currentPulse * Math.exp(-Math.max(0, frameSeconds) * Math.max(0, recovery))
  );
}

export function isInsideBuyZone(side: Side, x: number, z: number) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const [spawnX, spawnZ] = PLAYER_SPAWNS[side];
  return Math.hypot(x - spawnX, z - spawnZ) <= BUY_ZONE_RADIUS;
}

export function getBuyBlockReason({
  side,
  x,
  z,
  roundSeconds,
  active,
  alive,
}: {
  side: Side;
  x: number;
  z: number;
  roundSeconds: number;
  active: boolean;
  alive: boolean;
}): BuyBlockReason | null {
  if (!active) return 'round-inactive';
  if (!alive) return 'player-dead';
  if (roundSeconds <= BUY_CUTOFF_SECONDS) return 'buy-period-ended';
  return isInsideBuyZone(side, x, z) ? null : 'outside-buy-zone';
}

export function isFirearmKind(weapon: WeaponKind): weapon is FirearmKind {
  return weapon in FIREARMS;
}

export function isSecondaryWeaponKind(
  weapon: WeaponKind,
): weapon is SecondaryWeaponKind {
  return isFirearmKind(weapon) && FIREARMS[weapon].slot === 'secondary';
}

export function isPrimaryWeaponKind(
  weapon: WeaponKind,
): weapon is PrimaryWeaponKind {
  return isFirearmKind(weapon) && FIREARMS[weapon].slot === 'primary';
}

export function getStarterSecondaryForSide(side: Side): SecondaryWeaponKind {
  return side === 'ct' ? 'usp' : 'glock18';
}

export function createStarterSecondaryAmmo(side: Side): FirearmAmmo {
  const kind = getStarterSecondaryForSide(side);
  return {
    magazine: FIREARMS[kind].magazineSize,
    reserve: side === 'ct' ? 24 : 40,
  };
}

export function getPistolBuyOption(
  side: Side,
  slot: number,
): SecondaryWeaponKind | null {
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) return null;
  if (slot === 1) return 'glock18';
  if (slot === 2) return 'usp';
  if (slot === 3) return 'p228';
  if (slot === 4) return 'deagle';
  return side === 'ct' ? 'fiveseven' : 'elite';
}

export type AmmoPurchaseReason =
  | 'purchased'
  | 'already-full'
  | 'insufficient-funds'
  | 'invalid-purchase';

export function resolveAmmoPurchase({
  kind,
  money,
  reserve,
}: Readonly<{
  kind: FirearmKind;
  money: number;
  reserve: number;
}>) {
  const validMoney = Number.isFinite(money) && money >= 0;
  const validReserve = Number.isFinite(reserve) && reserve >= 0;
  const definition = isFirearmKind(kind) ? FIREARMS[kind] : null;
  const safeMoney = validMoney ? Math.floor(money) : 0;
  const safeReserve = validReserve
    ? Math.min(definition?.maxReserve ?? 0, Math.floor(reserve))
    : 0;
  const unchanged = (reason: AmmoPurchaseReason) => ({
    purchased: false,
    reason,
    cost: 0,
    amount: 0,
    money: safeMoney,
    reserve: safeReserve,
  });
  if (!validMoney || !validReserve || !definition)
    return unchanged('invalid-purchase');
  if (safeReserve >= definition.maxReserve) return unchanged('already-full');
  if (safeMoney < definition.ammoPrice) return unchanged('insufficient-funds');
  const amount = Math.min(
    definition.ammoPurchaseAmount,
    definition.maxReserve - safeReserve,
  );
  return {
    purchased: true,
    reason: 'purchased' as const,
    cost: definition.ammoPrice,
    amount,
    money: safeMoney - definition.ammoPrice,
    reserve: safeReserve + amount,
  };
}

export type EnemyCombatProfile = {
  reactionTime: number;
  aimSkill: number;
  aggression: number;
  preferredRange: number;
  memorySeconds: number;
};

export type EnemyCombatMovement =
  | 'hold'
  | 'advance'
  | 'retreat'
  | 'left'
  | 'right';

export type EnemyRole = 'carrier' | 'escort' | 'defender' | 'hunter';

export const ENEMY_PRIMARY_ROSTER = [
  'rifle',
  'smg',
  'shotgun',
  'sniper',
] as const satisfies readonly PrimaryWeaponKind[];

export function getServiceRifleForSide(side: Side): 'rifle' | 'carbine' {
  return side === 'ct' ? 'carbine' : 'rifle';
}

export const ENEMY_MAX_ACTIVE_BURSTS = 2;

export type BotDifficultyTuning = Readonly<{
  reactionTimeScale: number;
  activeBurstLimit: number;
}>;

export const BOT_DIFFICULTY_TUNING: Readonly<
  Record<BotDifficulty, BotDifficultyTuning>
> = {
  recruit: {
    reactionTimeScale: 1.35,
    activeBurstLimit: 2,
  },
  standard: {
    reactionTimeScale: 1.1,
    activeBurstLimit: 2,
  },
  veteran: {
    reactionTimeScale: 1,
    activeBurstLimit: 3,
  },
} as const;

export function getNextBotDifficulty(difficulty: BotDifficulty): BotDifficulty {
  if (difficulty === 'recruit') return 'standard';
  if (difficulty === 'standard') return 'veteran';
  return 'recruit';
}

export function normalizeBotDifficulty(value: unknown): BotDifficulty {
  return value === 'standard' || value === 'veteran' ? value : 'recruit';
}

export function getBotReactionTime(
  kind: FirearmKind,
  profileReactionTime: number,
  difficulty: BotDifficulty,
) {
  return (
    getEnemyReactionTime(kind, profileReactionTime) *
    BOT_DIFFICULTY_TUNING[difficulty].reactionTimeScale
  );
}

export function getBotActiveBurstLimit(difficulty: BotDifficulty) {
  return BOT_DIFFICULTY_TUNING[difficulty].activeBurstLimit;
}

export type BotBuyTier = 'eco' | 'full';

export type ArmorPurchaseKind = 'kevlar' | 'assault-suit';
export type ArmorPurchaseReason =
  | 'purchased'
  | 'already-equipped'
  | 'insufficient-funds'
  | 'invalid-purchase';
export type DefuseKitPurchaseReason =
  | 'purchased'
  | 'wrong-side'
  | 'already-equipped'
  | 'insufficient-funds'
  | 'invalid-purchase';

export const ENEMY_COMBAT_PROFILES: readonly EnemyCombatProfile[] = [
  {
    reactionTime: 0.2,
    aimSkill: 0.99,
    aggression: 1.08,
    preferredRange: 11,
    memorySeconds: 7.5,
  },
  {
    reactionTime: 0.26,
    aimSkill: 0.93,
    aggression: 1.2,
    preferredRange: 8,
    memorySeconds: 6.8,
  },
  {
    reactionTime: 0.17,
    aimSkill: 1.04,
    aggression: 0.96,
    preferredRange: 15,
    memorySeconds: 8.2,
  },
  {
    reactionTime: 0.23,
    aimSkill: 0.96,
    aggression: 1.04,
    preferredRange: 12,
    memorySeconds: 7.2,
  },
  {
    reactionTime: 0.22,
    aimSkill: 0.97,
    aggression: 1.02,
    preferredRange: 13,
    memorySeconds: 7.4,
  },
] as const;

export const EQUIPMENT_PRICES = {
  kevlar: 650,
  helmet: 350,
  assaultSuit: 1000,
  defuseKit: 200,
  grenade: 300,
  smoke: 300,
  flash: 200,
} as const;

export const FIREARM_ARMOR_RATIO_MULTIPLIERS: Readonly<
  Record<FirearmKind, number>
> = {
  rifle: 1.55,
  carbine: 1.4,
  smg: 1,
  shotgun: 1,
  sniper: 1.95,
  glock18: 1.05,
  usp: 1,
  p228: 1.25,
  deagle: 1.5,
  elite: 1.05,
  fiveseven: 1.5,
};

export function resolveArmorPurchase({
  money,
  armor,
  helmet,
  kind,
}: Readonly<{
  money: number;
  armor: number;
  helmet: boolean;
  kind: ArmorPurchaseKind;
}>) {
  const validMoney = Number.isFinite(money) && money >= 0;
  const safeMoney = validMoney ? Math.floor(money) : 0;
  const safeArmor = Number.isFinite(armor)
    ? Math.min(100, Math.max(0, armor))
    : 0;
  const safeHelmet = Boolean(helmet) && safeArmor > 0;
  const unchanged = (reason: ArmorPurchaseReason) => ({
    purchased: false,
    reason,
    cost: 0,
    money: safeMoney,
    armor: safeArmor,
    helmet: safeHelmet,
  });
  if (!validMoney || (kind !== 'kevlar' && kind !== 'assault-suit'))
    return unchanged('invalid-purchase');

  let cost: number;
  let nextHelmet = safeHelmet;
  if (kind === 'kevlar') {
    if (safeArmor >= 100) return unchanged('already-equipped');
    cost = EQUIPMENT_PRICES.kevlar;
  } else if (safeArmor >= 100) {
    if (safeHelmet) return unchanged('already-equipped');
    cost = EQUIPMENT_PRICES.helmet;
    nextHelmet = true;
  } else if (safeHelmet) {
    cost = EQUIPMENT_PRICES.kevlar;
  } else {
    cost = EQUIPMENT_PRICES.assaultSuit;
    nextHelmet = true;
  }

  if (safeMoney < cost) return unchanged('insufficient-funds');
  return {
    purchased: true,
    reason: 'purchased' as const,
    cost,
    money: safeMoney - cost,
    armor: 100,
    helmet: nextHelmet,
  };
}

export function resolveDefuseKitPurchase({
  side,
  money,
  hasDefuseKit,
}: Readonly<{
  side: Side;
  money: number;
  hasDefuseKit: boolean;
}>) {
  const validMoney = Number.isFinite(money) && money >= 0;
  const safeMoney = validMoney ? Math.floor(money) : 0;
  const unchanged = (reason: DefuseKitPurchaseReason) => ({
    purchased: false,
    reason,
    cost: 0,
    money: safeMoney,
    hasDefuseKit: Boolean(hasDefuseKit),
  });
  if (!validMoney || (side !== 'ct' && side !== 't'))
    return unchanged('invalid-purchase');
  if (side !== 'ct') return unchanged('wrong-side');
  if (hasDefuseKit) return unchanged('already-equipped');
  if (safeMoney < EQUIPMENT_PRICES.defuseKit)
    return unchanged('insufficient-funds');
  return {
    purchased: true,
    reason: 'purchased' as const,
    cost: EQUIPMENT_PRICES.defuseKit,
    money: safeMoney - EQUIPMENT_PRICES.defuseKit,
    hasDefuseKit: true,
  };
}

export const BOMBSITES: Record<BombsiteName, [number, number]> = {
  A: [...DUST2_MAP.sites.A],
  B: [...DUST2_MAP.sites.B],
};

export type RoutePoint = readonly [number, number];
export type AttackApproach = 'direct' | 'split';
export type RoundPlanRole = 'carrier' | 'entry' | 'support';

export const ATTACK_ROUTES: Readonly<
  Record<BombsiteName, readonly (readonly RoutePoint[])[]>
> = {
  A: [mapRoute('t', 'longDoors', 'outsideLong', 'long', 'longRamp', 'a'),
    mapRoute('t', 'topMid', 'mid', 'catEntry', 'catwalk', 'short', 'a')],
  B: [mapRoute('t', 'tunnelEntry', 'tunnelApproach', 'upper', 'bTunnel', 'b'),
    mapRoute('t', 'topMid', 'mid', 'midDoors', 'ct', 'bDoors', 'b')],
};

export type RoundPlanAssignment = Readonly<{
  botId: number;
  role: RoundPlanRole;
  routeVariant: 0 | 1;
  route: readonly RoutePoint[];
}>;

export type RoundPlan = Readonly<{
  roundIndex: number;
  targetSite: BombsiteName;
  approach: AttackApproach;
  carrier:
    | Readonly<{ kind: 'player' }>
    | Readonly<{ kind: 'bot'; botId: number }>;
  assignments: readonly RoundPlanAssignment[];
}>;

export function getRoundPlan(roundIndex: number, playerSide: Side): RoundPlan {
  const normalizedRound = Number.isFinite(roundIndex)
    ? Math.max(0, Math.floor(roundIndex))
    : 0;
  const targetSite = getBombsiteForRound(normalizedRound);
  const approach: AttackApproach =
    Math.floor(normalizedRound / 2) % 2 === 0 ? 'direct' : 'split';
  // Four allied attackers when the human is T; five opponents when CT.
  const attackingBotCount = playerSide === 't' ? 4 : 5;
  const carrierBotId = normalizedRound % attackingBotCount;
  const playerCarries = playerSide === 't' && normalizedRound % 2 === 0;
  const entryBotId = (carrierBotId + 1) % attackingBotCount;
  const assignments = Array.from({ length: 5 }, (_, botId) => {
    const role: RoundPlanRole =
      !playerCarries && botId === carrierBotId
        ? 'carrier'
        : botId === entryBotId
          ? 'entry'
          : 'support';
    const routeVariant: 0 | 1 =
      approach === 'split' && (normalizedRound + botId) % 2 === 1 ? 1 : 0;
    return {
      botId,
      role,
      routeVariant,
      route: ATTACK_ROUTES[targetSite][routeVariant],
    };
  });
  return {
    roundIndex: normalizedRound,
    targetSite,
    approach,
    carrier: playerCarries
      ? { kind: 'player' }
      : { kind: 'bot', botId: carrierBotId },
    assignments,
  };
}

export type NavigationDirection = Readonly<{ x: number; z: number }>;

export function getBotMovementDirections({
  deltaX,
  deltaZ,
  blockedSeconds,
  botId,
  waypointIndex,
}: {
  deltaX: number;
  deltaZ: number;
  blockedSeconds: number;
  botId: number;
  waypointIndex: number;
}): readonly NavigationDirection[] {
  const length = Math.hypot(deltaX, deltaZ);
  if (!Number.isFinite(length) || length < 0.0001) return [];
  const forward = { x: deltaX / length, z: deltaZ / length };
  if (Math.max(0, blockedSeconds) < 0.35) return [forward];
  const recoveryPhase = Math.floor((Math.max(0, blockedSeconds) - 0.35) / 0.45);
  const firstSide = (botId + waypointIndex + recoveryPhase) % 2 === 0 ? 1 : -1;
  const createRecovery = (side: number) => {
    const x = forward.x * 0.38 - forward.z * 0.92 * side;
    const z = forward.z * 0.38 + forward.x * 0.92 * side;
    const recoveryLength = Math.hypot(x, z);
    return { x: x / recoveryLength, z: z / recoveryLength };
  };
  return [forward, createRecovery(firstSide), createRecovery(-firstSide)];
}

export function advanceBotBlockedSeconds(
  previousSeconds: number,
  movedDistance: number,
  frameSeconds: number,
) {
  if (Math.max(0, movedDistance) >= 0.015) return 0;
  return Math.min(
    1.25,
    Math.max(0, previousSeconds) + Math.max(0, frameSeconds),
  );
}

export function isAtBotWaypoint(
  position: Readonly<{ x: number; z: number }>,
  waypoint: Readonly<{ x: number; z: number }>,
  arrivalRadius: number,
) {
  return (
    Math.hypot(position.x - waypoint.x, position.z - waypoint.z) <=
    Math.max(0, arrivalRadius)
  );
}

export function getNearestRouteWaypointIndex(
  route: readonly RoutePoint[],
  position: Readonly<{ x: number; z: number }>,
) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  route.forEach(([x, z], index) => {
    const distance = Math.hypot(position.x - x, position.z - z);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

export const CT_RETAKE_ROUTES: Record<
  `${BombsiteName}-${BombsiteName}`,
  Array<[number, number]>
> = {
  'A-A': mapRoute('a'), 'B-B': mapRoute('b'),
  'A-B': mapRoute('a', 'ctRamp', 'ct', 'bDoors', 'b'),
  'B-A': mapRoute('b', 'bDoors', 'ct', 'ctRamp', 'a'),
};

export function getBombsiteForRound(completedRounds: number): BombsiteName {
  return completedRounds % 2 === 0 ? 'A' : 'B';
}

export function createMatchState(startingPlayerSide: Side = 'ct'): MatchState {
  return {
    startingPlayerSide,
    playerSide: startingPlayerSide,
    scores: { player: 0, opponent: 0 },
    lossStreaks: { player: 0, opponent: 0 },
  };
}

export function getOppositeSide(side: Side): Side {
  return side === 'ct' ? 't' : 'ct';
}

export function getBotSide(playerSide: Side, team: BotTeam): Side {
  return team === 'ally' ? playerSide : getOppositeSide(playerSide);
}

export function getTeamEliminationEvent(
  playerSide: Side,
  friendlyAliveCount: number,
  enemyAliveCount: number,
): RoundEndEvent | null {
  if (
    Math.max(0, friendlyAliveCount) === 0 &&
    Math.max(0, enemyAliveCount) === 0
  )
    return 't-eliminated';
  if (Math.max(0, enemyAliveCount) === 0)
    return getOppositeSide(playerSide) === 'ct'
      ? 'ct-eliminated'
      : 't-eliminated';
  if (Math.max(0, friendlyAliveCount) === 0)
    return playerSide === 'ct' ? 'ct-eliminated' : 't-eliminated';
  return null;
}

export type SpectatorCandidate = Readonly<{
  id: string;
  team: BotTeam;
  alive: boolean;
}>;

export function chooseSpectatorTarget({
  playerAlive,
  currentTargetId,
  allies,
  enemies,
  killerId,
}: {
  playerAlive: boolean;
  currentTargetId: string | null;
  allies: readonly SpectatorCandidate[];
  enemies: readonly SpectatorCandidate[];
  killerId: string | null;
}): string | null {
  if (playerAlive) return null;
  const livingAllies = allies.filter((candidate) => candidate.alive);
  const currentAlly = livingAllies.find(
    (candidate) => candidate.id === currentTargetId,
  );
  if (currentAlly) return currentAlly.id;
  if (livingAllies[0]) return livingAllies[0].id;
  const livingEnemies = enemies.filter((candidate) => candidate.alive);
  const currentEnemy = livingEnemies.find(
    (candidate) => candidate.id === currentTargetId,
  );
  if (currentEnemy) return currentEnemy.id;
  const killer = livingEnemies.find((candidate) => candidate.id === killerId);
  return killer?.id ?? livingEnemies[0]?.id ?? null;
}

export function getNextFriendlySpectatorTarget({
  currentTargetId,
  allies,
}: {
  currentTargetId: string | null;
  allies: readonly SpectatorCandidate[];
}): string | null {
  const livingAllies = allies.filter(
    (candidate) => candidate.team === 'ally' && candidate.alive,
  );
  if (livingAllies.length < 2) return null;
  const currentIndex = livingAllies.findIndex(
    (candidate) => candidate.id === currentTargetId,
  );
  return livingAllies[(currentIndex + 1) % livingAllies.length]?.id ?? null;
}

export function canCycleFriendlySpectator({
  active,
  playerAlive,
  deathCameraComplete,
  interactionActive,
  roundResultPending,
  livingAllyCount,
}: {
  active: boolean;
  playerAlive: boolean;
  deathCameraComplete: boolean;
  interactionActive: boolean;
  roundResultPending: boolean;
  livingAllyCount: number;
}): boolean {
  return (
    active &&
    !playerAlive &&
    deathCameraComplete &&
    interactionActive &&
    !roundResultPending &&
    Number.isFinite(livingAllyCount) &&
    livingAllyCount >= 2
  );
}

export function getCompletedRounds(scores: TeamScores) {
  const safeScore = (score: number) =>
    Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  return safeScore(scores.player) + safeScore(scores.opponent);
}

export function getTeamForSide(playerSide: Side, side: Side): MatchTeam {
  return playerSide === side ? 'player' : 'opponent';
}

export function getSideScores(
  scores: TeamScores,
  playerSide: Side,
): Record<Side, number> {
  return playerSide === 'ct'
    ? { ct: scores.player, t: scores.opponent }
    : { ct: scores.opponent, t: scores.player };
}

export function recordRoundWinner(
  match: MatchState,
  winner: MatchTeam,
): MatchState {
  const loser: MatchTeam = winner === 'player' ? 'opponent' : 'player';
  return {
    ...match,
    scores: { ...match.scores, [winner]: match.scores[winner] + 1 },
    lossStreaks: {
      ...match.lossStreaks,
      [winner]: 0,
      [loser]: match.lossStreaks[loser] + 1,
    },
  };
}

export function prepareNextRound(match: MatchState) {
  const completedRounds = getCompletedRounds(match.scores);
  const nextPlayerSide = getPlayerSideForRound(
    match.startingPlayerSide,
    completedRounds,
  );
  const transition = getMatchTransition(completedRounds);
  const economyReset = transition !== 'none';
  return {
    transition,
    economyReset,
    startingMoney:
      transition === 'halftime'
        ? 800
        : economyReset
          ? OVERTIME_START_MONEY
          : null,
    match:
      economyReset || nextPlayerSide !== match.playerSide
        ? {
            ...match,
            playerSide: nextPlayerSide,
            lossStreaks: economyReset
              ? { player: 0, opponent: 0 }
              : match.lossStreaks,
          }
        : match,
  };
}

export function getPlayerSideForRound(
  startingPlayerSide: Side,
  completedRounds: number,
): Side {
  const safeCompletedRounds = Number.isFinite(completedRounds)
    ? Math.max(0, Math.floor(completedRounds))
    : 0;
  if (safeCompletedRounds < REGULATION_HALF_ROUNDS) return startingPlayerSide;
  if (safeCompletedRounds < REGULATION_ROUNDS)
    return getOppositeSide(startingPlayerSide);

  const overtimeRound = safeCompletedRounds - REGULATION_ROUNDS;
  const overtimeNumber = Math.floor(overtimeRound / OVERTIME_ROUNDS);
  const roundWithinOvertime = overtimeRound % OVERTIME_ROUNDS;
  const overtimeStartingSide =
    overtimeNumber % 2 === 0
      ? getOppositeSide(startingPlayerSide)
      : startingPlayerSide;
  return roundWithinOvertime < OVERTIME_HALF_ROUNDS
    ? overtimeStartingSide
    : getOppositeSide(overtimeStartingSide);
}

export function getMatchTransition(completedRounds: number): MatchTransition {
  const safeCompletedRounds = Number.isFinite(completedRounds)
    ? Math.max(0, Math.floor(completedRounds))
    : 0;
  if (safeCompletedRounds === REGULATION_HALF_ROUNDS) return 'halftime';
  if (safeCompletedRounds < REGULATION_ROUNDS) return 'none';

  const overtimeRound = safeCompletedRounds - REGULATION_ROUNDS;
  if (overtimeRound % OVERTIME_ROUNDS === 0)
    return overtimeRound === 0 ? 'overtime' : 'overtime-restart';
  if (overtimeRound % OVERTIME_ROUNDS === OVERTIME_HALF_ROUNDS)
    return 'overtime-halftime';
  return 'none';
}

export function getMatchWinner(scores: TeamScores): MatchWinner {
  const playerScore = Number.isFinite(scores.player)
    ? Math.max(0, Math.floor(scores.player))
    : 0;
  const opponentScore = Number.isFinite(scores.opponent)
    ? Math.max(0, Math.floor(scores.opponent))
    : 0;
  if (playerScore >= MATCH_WIN_SCORE && opponentScore < REGULATION_HALF_ROUNDS)
    return 'player';
  if (opponentScore >= MATCH_WIN_SCORE && playerScore < REGULATION_HALF_ROUNDS)
    return 'opponent';
  if (
    playerScore < REGULATION_HALF_ROUNDS ||
    opponentScore < REGULATION_HALF_ROUNDS
  )
    return null;

  const overtimeTarget =
    MATCH_WIN_SCORE +
    OVERTIME_HALF_ROUNDS +
    OVERTIME_HALF_ROUNDS *
      Math.floor(
        (Math.min(playerScore, opponentScore) - REGULATION_HALF_ROUNDS) /
          OVERTIME_HALF_ROUNDS,
      );
  if (playerScore >= overtimeTarget) return 'player';
  if (opponentScore >= overtimeTarget) return 'opponent';
  return null;
}

export function getMatchRoundPhase(
  scores: TeamScores,
  roundInProgress: boolean,
): MatchRoundPhase {
  const completedRounds = getCompletedRounds(scores);
  const roundIndex = Math.max(0, completedRounds - (roundInProgress ? 0 : 1));
  if (roundIndex < REGULATION_ROUNDS) {
    return {
      kind: 'regulation',
      label: 'REGULATION',
      roundNumber: roundIndex + 1,
      roundLimit: REGULATION_ROUNDS,
      targetScore: MATCH_WIN_SCORE,
      overtimeNumber: null,
    };
  }

  const overtimeRoundIndex = roundIndex - REGULATION_ROUNDS;
  const overtimeNumber = Math.floor(overtimeRoundIndex / OVERTIME_ROUNDS) + 1;
  return {
    kind: 'overtime',
    label: `OVERTIME ${overtimeNumber}`,
    roundNumber: (overtimeRoundIndex % OVERTIME_ROUNDS) + 1,
    roundLimit: OVERTIME_ROUNDS,
    targetScore: MATCH_WIN_SCORE + OVERTIME_HALF_ROUNDS * overtimeNumber,
    overtimeNumber,
  };
}

export function getRoundTransitionBrief({
  matchAfterResult,
  winnerSide,
  event,
  bankBefore,
  bankAfter,
}: {
  matchAfterResult: MatchState;
  winnerSide: Side;
  event: RoundEndEvent;
  bankBefore: number;
  bankAfter: number;
}): RoundTransitionBrief {
  const playerWon =
    getTeamForSide(matchAfterResult.playerSide, winnerSide) === 'player';
  const score = getSideScores(
    matchAfterResult.scores,
    matchAfterResult.playerSide,
  );
  const terminal = getMatchWinner(matchAfterResult.scores) !== null;
  if (terminal) {
    return {
      event,
      winnerSide,
      playerWon,
      score,
      earned: Math.max(0, bankAfter - bankBefore),
      bankAfter,
      terminal,
      next: null,
    };
  }
  const prepared = prepareNextRound(matchAfterResult);
  const plan = getRoundPlan(
    getCompletedRounds(prepared.match.scores),
    prepared.match.playerSide,
  );
  const onboarding = getSideOnboarding(prepared.match.playerSide);
  return {
    event,
    winnerSide,
    playerWon,
    score,
    earned: Math.max(0, bankAfter - bankBefore),
    bankAfter,
    terminal,
    next: {
      playerSide: prepared.match.playerSide,
      transition: prepared.transition,
      economyReset: prepared.economyReset,
      faction: onboarding.faction,
      objective: onboarding.objective,
      targetSite: plan.targetSite,
      approach: plan.approach,
      startingBank: prepared.startingMoney ?? bankAfter,
      phase: getMatchRoundPhase(matchAfterResult.scores, true),
    },
  };
}

export function getRoundWinningSide(
  event: RoundEndEvent,
  bombState: BombState,
): Side | null {
  if (event === 'ct-eliminated') return 't';
  if (event === 't-eliminated') return bombState === 'planted' ? null : 'ct';
  if (event === 'time-expired') return bombState === 'planted' ? null : 'ct';
  if (event === 'bomb-defused') return 'ct';
  return 't';
}

export function getBombsiteAtPosition(
  x: number,
  z: number,
  radius = 3.1,
): BombsiteName | null {
  for (const site of ['A', 'B'] as const) {
    const [siteX, siteZ] = BOMBSITES[site];
    if (Math.hypot(x - siteX, z - siteZ) <= Math.max(0, radius)) return site;
  }
  return null;
}

export function advanceObjectiveProgress(
  current: number,
  frameSeconds: number,
  durationSeconds: number,
  active: boolean,
) {
  if (!active || durationSeconds <= 0) return 0;
  return Math.min(
    1,
    Math.max(0, current) + Math.max(0, frameSeconds) / durationSeconds,
  );
}

export function canPlayerPlant({
  active,
  alive,
  playerSide,
  bombState,
  playerHasBomb,
  bombsite,
  activeWeapon,
  primaryFireHeld,
  freezeSeconds,
  buyOpen,
  weaponReady,
  stationary,
  grounded,
  reloading,
}: {
  active: boolean;
  alive: boolean;
  playerSide: Side;
  bombState: BombState;
  playerHasBomb: boolean;
  bombsite: BombsiteName | null;
  activeWeapon: WeaponKind;
  primaryFireHeld: boolean;
  freezeSeconds: number;
  buyOpen: boolean;
  weaponReady: boolean;
  stationary: boolean;
  grounded: boolean;
  reloading: boolean;
}) {
  return (
    active &&
    alive &&
    playerSide === 't' &&
    (bombState === 'carried' || bombState === 'planting') &&
    playerHasBomb &&
    bombsite !== null &&
    activeWeapon === 'bomb' &&
    primaryFireHeld &&
    Number.isFinite(freezeSeconds) &&
    freezeSeconds === 0 &&
    !buyOpen &&
    weaponReady &&
    stationary &&
    grounded &&
    !reloading
  );
}

export function canPlayerDefuse(
  playerSide: Side,
  bombState: BombState,
  inRange: boolean,
  interacting: boolean,
) {
  return (
    playerSide === 'ct' && bombState === 'planted' && inRange && interacting
  );
}

export function getDisplayedRoundNumber(
  ctScore: number,
  tScore: number,
  roundInProgress: boolean,
) {
  const completedRounds = Math.max(0, ctScore) + Math.max(0, tScore);
  return Math.max(1, completedRounds + (roundInProgress ? 1 : 0));
}

export function getLossBonus(consecutiveLosses: number) {
  const losses = Math.max(1, Math.floor(consecutiveLosses));
  return Math.min(3400, 1400 + (losses - 1) * 500);
}

export const OBJECTIVE_REWARDS = {
  plant: 300,
  defuse: 300,
} as const;

export const PLAYER_KILL_REWARDS: Readonly<
  Record<PlayerKillWeaponKind, number>
> = {
  rifle: 300,
  carbine: 300,
  smg: 600,
  shotgun: 900,
  sniper: 100,
  glock18: 300,
  usp: 300,
  p228: 300,
  deagle: 300,
  elite: 300,
  fiveseven: 300,
  knife: 1500,
  grenade: 300,
};

export function getPlayerKillReward(weapon: PlayerKillWeaponKind) {
  return PLAYER_KILL_REWARDS[weapon];
}

export function getRoundWinReward(event: RoundEndEvent) {
  return event === 'bomb-detonated' ? 3500 : 3250;
}

export function addMoney(currentMoney: number, reward: number) {
  return Math.min(MAX_MONEY, Math.max(0, currentMoney + reward));
}

export function settlePlayerRoundMoney({
  currentMoney,
  playerWon,
  event,
  lossStreak,
}: {
  currentMoney: number;
  playerWon: boolean;
  event: RoundEndEvent;
  lossStreak: number;
}) {
  return addMoney(
    currentMoney,
    playerWon ? getRoundWinReward(event) : getLossBonus(lossStreak),
  );
}

export function advanceSimulationTime(
  currentMs: number,
  frameSeconds: number,
  active: boolean,
) {
  return currentMs + (active ? Math.max(0, frameSeconds) * 1000 : 0);
}

export function formatRoundTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function getDefuseDuration(hasDefuseKit: boolean) {
  return hasDefuseKit ? 5 : 10;
}

export function shouldRetainLoadout(playerSurvived: boolean) {
  return playerSurvived;
}

export function shouldAutoPrepareNextRound(matchWinner: MatchWinner) {
  return matchWinner === null;
}

export function clearInputLatches(_input: InputLatches): InputLatches {
  return {
    keys: new Set<string>(),
    firing: false,
    triggerReady: true,
    dropRequested: false,
    touchLookPointer: null,
  };
}

export function getSideOnboarding(side: Side) {
  return side === 'ct'
    ? {
        faction: 'CT' as const,
        objective:
          'Buy at spawn, defend Sites A and B, and hold E near a planted device to defuse it.',
      }
    : {
        faction: 'T' as const,
        objective:
          'Buy at spawn, carry the C4 to Site A or B, press 5 to equip it, then stand still and hold primary fire to plant.',
      };
}

export function getWeaponMoveSpeed({
  weapon,
  walking,
  crouching,
  scoped,
}: {
  weapon: WeaponKind;
  walking: boolean;
  crouching: boolean;
  scoped: boolean;
}) {
  const stanceMultiplier = crouching ? 0.36 : walking ? 0.5 : 1;
  return getWeaponBunnyHopSpeed(weapon, scoped) * stanceMultiplier;
}

export function getWeaponBunnyHopSpeed(weapon: WeaponKind, scoped: boolean) {
  const handling = WEAPON_HANDLING[weapon];
  const scopeMultiplier = scoped ? (handling.scopedSpeedMultiplier ?? 1) : 1;
  return handling.runSpeed * scopeMultiplier;
}

export function advanceLandingRecovery(
  remainingSeconds: number,
  frameSeconds: number,
  wasGrounded: boolean,
  grounded: boolean,
  durationSeconds = PLAYER_LANDING_RECOVERY_SECONDS,
) {
  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds)
    : PLAYER_LANDING_RECOVERY_SECONDS;
  const safeRemaining = Number.isFinite(remainingSeconds)
    ? Math.min(safeDuration, Math.max(0, remainingSeconds))
    : 0;
  if (!grounded) return 0;
  if (!wasGrounded) return safeDuration;
  const safeFrameSeconds = Number.isFinite(frameSeconds)
    ? Math.max(0, frameSeconds)
    : 0;
  return Math.max(0, safeRemaining - safeFrameSeconds);
}

export type LandingViewPose = {
  positionY: number;
  rotationX: number;
};

export function didPlayerLand(wasGrounded: boolean, grounded: boolean) {
  return !wasGrounded && grounded;
}

export function writeLandingViewPose(
  remainingSeconds: number,
  target: LandingViewPose,
  durationSeconds = PLAYER_LANDING_RECOVERY_SECONDS,
) {
  target.positionY = 0;
  target.rotationX = 0;
  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds)
    : PLAYER_LANDING_RECOVERY_SECONDS;
  if (safeDuration <= 0) return target;
  const safeRemaining = Number.isFinite(remainingSeconds)
    ? Math.min(safeDuration, Math.max(0, remainingSeconds))
    : 0;
  if (safeRemaining <= 0) return target;
  const progress = safeRemaining / safeDuration;
  const eased = progress * progress;
  target.positionY = -0.018 * eased;
  target.rotationX = 0.022 * eased;
  return target;
}

export function getPlayerStanceEyeHeight(
  standingHeight: number,
  crouchOffset: number,
) {
  const safeStandingHeight =
    Number.isFinite(standingHeight) && standingHeight >= 0
      ? standingHeight
      : PLAYER_STANDING_EYE_HEIGHT;
  const safeCrouchOffset = Number.isFinite(crouchOffset)
    ? Math.min(
        PLAYER_CROUCH_OFFSET,
        Math.max(0, crouchOffset),
        safeStandingHeight,
      )
    : 0;
  return safeStandingHeight - safeCrouchOffset;
}

export function getWeaponEquipDelay(weapon: WeaponKind) {
  return WEAPON_HANDLING[weapon].equipMs;
}

export function isWeaponReady(nowMs: number, equipReadyAtMs: number) {
  return nowMs >= equipReadyAtMs;
}

export function updateJumpButton(
  jumpReady: boolean,
  pressed: boolean,
  repeat = false,
): JumpButtonState {
  if (!pressed) return { jumpReady: true, shouldJump: false };
  return {
    jumpReady: false,
    shouldJump: jumpReady && !repeat,
  };
}

export function stepHorizontalVelocity({
  velocity,
  wishDirection,
  maxSpeed,
  dtSeconds,
  grounded,
}: {
  velocity: HorizontalVelocity;
  wishDirection: HorizontalVelocity;
  maxSpeed: number;
  dtSeconds: number;
  grounded: boolean;
}): HorizontalVelocity {
  let currentX = Number.isFinite(velocity.x) ? velocity.x : 0;
  let currentZ = Number.isFinite(velocity.z) ? velocity.z : 0;
  if (!Number.isFinite(Math.hypot(currentX, currentZ))) {
    currentX = 0;
    currentZ = 0;
  }
  const dt = Number.isFinite(dtSeconds)
    ? Math.min(PLAYER_MOVEMENT_MAX_STEP_SECONDS, Math.max(0, dtSeconds))
    : 0;
  if (dt === 0) return { x: currentX, z: currentZ };

  const safeMaxSpeed = Number.isFinite(maxSpeed) ? Math.max(0, maxSpeed) : 0;
  const safeWishX = Number.isFinite(wishDirection.x) ? wishDirection.x : 0;
  const safeWishZ = Number.isFinite(wishDirection.z) ? wishDirection.z : 0;
  const wishLength = Math.hypot(safeWishX, safeWishZ);
  const wishX = wishLength > 0 ? safeWishX / wishLength : 0;
  const wishZ = wishLength > 0 ? safeWishZ / wishLength : 0;
  let nextX = currentX;
  let nextZ = currentZ;

  if (grounded) {
    const speed = Math.hypot(nextX, nextZ);
    if (speed > 0) {
      const control = Math.max(speed, PLAYER_GROUND_STOP_SPEED);
      const nextSpeed = Math.max(
        0,
        speed - control * PLAYER_GROUND_FRICTION * dt,
      );
      const scale = nextSpeed / speed;
      nextX *= scale;
      nextZ *= scale;
    }

    if (wishLength === 0 || safeMaxSpeed === 0) return { x: nextX, z: nextZ };

    const currentSpeed = nextX * wishX + nextZ * wishZ;
    const addSpeed = safeMaxSpeed - currentSpeed;
    if (addSpeed <= 0) return { x: nextX, z: nextZ };
    const accelerationSpeed = Math.min(
      addSpeed,
      PLAYER_GROUND_ACCELERATION * safeMaxSpeed * dt,
    );
    return {
      x: nextX + accelerationSpeed * wishX,
      z: nextZ + accelerationSpeed * wishZ,
    };
  }

  if (wishLength === 0 || safeMaxSpeed === 0) return { x: nextX, z: nextZ };

  const airWishSpeed = Math.min(safeMaxSpeed, PLAYER_AIR_WISH_SPEED);
  const currentSpeed = nextX * wishX + nextZ * wishZ;
  const addSpeed = airWishSpeed - currentSpeed;
  if (addSpeed <= 0) return { x: nextX, z: nextZ };
  const accelerationSpeed = Math.min(
    addSpeed,
    PLAYER_AIR_ACCELERATION * airWishSpeed * dt,
  );
  return {
    x: nextX + accelerationSpeed * wishX,
    z: nextZ + accelerationSpeed * wishZ,
  };
}

export function limitBunnyHopVelocity(
  velocity: HorizontalVelocity,
  maxSpeed: number,
): HorizontalVelocity {
  let currentX = Number.isFinite(velocity.x) ? velocity.x : 0;
  let currentZ = Number.isFinite(velocity.z) ? velocity.z : 0;
  if (!Number.isFinite(Math.hypot(currentX, currentZ))) {
    currentX = 0;
    currentZ = 0;
  }
  const safeMaxSpeed = Number.isFinite(maxSpeed) ? Math.max(0, maxSpeed) : 0;
  const speed = Math.hypot(currentX, currentZ);
  const speedLimit = safeMaxSpeed * PLAYER_BUNNY_SPEED_RATIO;
  if (speed === 0 || speed <= speedLimit) return { x: currentX, z: currentZ };
  const scale = (speedLimit / speed) * PLAYER_BUNNY_SPEED_CROP;
  return { x: currentX * scale, z: currentZ * scale };
}

export function canScopeWeapon(weapon: WeaponKind | null) {
  return (
    weapon !== null && isFirearmKind(weapon) && Boolean(FIREARMS[weapon].scope)
  );
}

export function getWeaponFieldOfView(
  weapon: WeaponKind | null,
  scoped: boolean,
  defaultFov = 74,
) {
  if (!scoped || weapon === null || !isFirearmKind(weapon)) return defaultFov;
  return FIREARMS[weapon].scope?.fov ?? defaultFov;
}

export function getWeaponSensitivityMultiplier(
  weapon: WeaponKind | null,
  scoped: boolean,
) {
  if (!scoped || weapon === null || !isFirearmKind(weapon)) return 1;
  return FIREARMS[weapon].scope?.sensitivityMultiplier ?? 1;
}

export const BODY_HITGROUP_DAMAGE_MULTIPLIERS = {
  torso: 1,
  stomach: 1.25,
  leg: 0.75,
} as const satisfies Readonly<Record<Exclude<HitGroup, 'head'>, number>>;

export function getFirearmHitGroupMultiplier(
  weapon: FirearmKind,
  hitGroup: HitGroup,
) {
  return hitGroup === 'head'
    ? FIREARMS[weapon].headMultiplier
    : BODY_HITGROUP_DAMAGE_MULTIPLIERS[hitGroup];
}

export function getFirearmDamage(
  weapon: FirearmKind,
  distance: number,
  hitGroup: HitGroup,
  silenced = false,
) {
  const definition = FIREARMS[weapon];
  if (!Number.isFinite(distance) || distance > definition.maximumRange) return 0;
  const sourceDistance = Math.max(0, distance) * 40;
  // ReGameDLL's direct trace truncates damage before TraceAttack hitgroups.
  const base = silenced && weapon === 'usp' ? 30
    : silenced && weapon === 'carbine' ? 33 : definition.bodyDamage;
  const modifier = silenced && weapon === 'carbine' ? 0.95 : definition.rangeModifier;
  const damage = weapon === 'shotgun'
    ? Math.floor(base * Math.max(0, 1 - sourceDistance / 3000))
    : Math.floor(base * Math.pow(modifier, sourceDistance / 500));
  return damage * getFirearmHitGroupMultiplier(weapon, hitGroup);
}

type VectorComponents = Readonly<{ x: number; y: number; z: number }>;

export function getAxisAlignedBoxExitDistance(
  origin: VectorComponents,
  direction: VectorComponents,
  minimum: VectorComponents,
  maximum: VectorComponents,
) {
  const values = [
    origin.x,
    origin.y,
    origin.z,
    direction.x,
    direction.y,
    direction.z,
    minimum.x,
    minimum.y,
    minimum.z,
    maximum.x,
    maximum.y,
    maximum.z,
  ];
  if (!values.every(Number.isFinite)) return null;
  if (minimum.x > maximum.x || minimum.y > maximum.y || minimum.z > maximum.z)
    return null;

  const directionLength = Math.hypot(direction.x, direction.y, direction.z);
  if (directionLength <= 1e-9) return null;

  let entryDistance = Number.NEGATIVE_INFINITY;
  let exitDistance = Number.POSITIVE_INFINITY;
  for (const axis of ['x', 'y', 'z'] as const) {
    const axisDirection = direction[axis] / directionLength;
    if (Math.abs(axisDirection) <= 1e-9) {
      if (origin[axis] < minimum[axis] || origin[axis] > maximum[axis])
        return null;
      continue;
    }
    const firstDistance = (minimum[axis] - origin[axis]) / axisDirection;
    const secondDistance = (maximum[axis] - origin[axis]) / axisDirection;
    entryDistance = Math.max(
      entryDistance,
      Math.min(firstDistance, secondDistance),
    );
    exitDistance = Math.min(
      exitDistance,
      Math.max(firstDistance, secondDistance),
    );
    if (exitDistance < entryDistance) return null;
  }

  return exitDistance >= Math.max(0, entryDistance) ? exitDistance : null;
}

export function resolveHitscanImpact({
  targetDistance,
  worldDistance,
  maximumDistance,
}: Readonly<{
  targetDistance: number | null;
  worldDistance: number | null;
  maximumDistance?: number;
}>): HitscanImpact {
  const limit =
    maximumDistance === undefined
      ? Number.POSITIVE_INFINITY
      : Number.isFinite(maximumDistance) && maximumDistance >= 0
        ? maximumDistance
        : -1;
  const isEligible = (distance: number | null) =>
    distance !== null &&
    Number.isFinite(distance) &&
    distance >= 0 &&
    distance <= limit;
  const targetEligible = isEligible(targetDistance);
  const worldEligible = isEligible(worldDistance);

  if (worldEligible && (!targetEligible || worldDistance! <= targetDistance!))
    return 'world';
  if (targetEligible) return 'target';
  return 'none';
}

export function getHitConfirmation(
  headshot: boolean,
  killed: boolean,
): HitConfirmation {
  if (headshot && killed) return 'headshot-kill';
  if (killed) return 'kill';
  return headshot ? 'headshot' : 'body';
}

const HIT_CONFIRMATION_PRIORITY: Readonly<Record<HitConfirmation, number>> = {
  body: 0,
  headshot: 1,
  kill: 2,
  'headshot-kill': 3,
};

export function chooseHitConfirmation(
  confirmations: readonly HitConfirmation[],
): HitConfirmation | null {
  let selected: HitConfirmation | null = null;
  for (const confirmation of confirmations) {
    if (
      selected === null ||
      HIT_CONFIRMATION_PRIORITY[confirmation] >
        HIT_CONFIRMATION_PRIORITY[selected]
    )
      selected = confirmation;
  }
  return selected;
}

export function getReloadProgress(
  startedAtMs: number,
  completesAtMs: number,
  nowMs: number,
) {
  if (
    !Number.isFinite(startedAtMs) ||
    !Number.isFinite(completesAtMs) ||
    !Number.isFinite(nowMs)
  )
    return 0;
  if (completesAtMs <= startedAtMs) return nowMs >= completesAtMs ? 1 : 0;
  return Math.min(
    1,
    Math.max(0, (nowMs - startedAtMs) / (completesAtMs - startedAtMs)),
  );
}

export type WeaponReloadPose = {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
};

export const S90_BOLT_CYCLE_DURATION_MS = 900;

export type SniperBoltCyclePose = {
  positionZ: number;
  rotationZ: number;
};

function smoothStep01(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

export function writeSniperBoltCyclePose(
  elapsedMs: number,
  target: SniperBoltCyclePose,
) {
  target.positionZ = 0;
  target.rotationZ = 0;
  if (
    !Number.isFinite(elapsedMs) ||
    elapsedMs <= 0 ||
    elapsedMs >= S90_BOLT_CYCLE_DURATION_MS
  )
    return target;

  const progress = elapsedMs / S90_BOLT_CYCLE_DURATION_MS;
  if (progress < 0.15) {
    target.rotationZ = -0.55 * smoothStep01(progress / 0.15);
  } else if (progress < 0.48) {
    target.rotationZ = -0.55;
    target.positionZ = 0.15 * smoothStep01((progress - 0.15) / 0.33);
  } else if (progress < 0.8) {
    target.rotationZ = -0.55;
    target.positionZ = 0.15 * (1 - smoothStep01((progress - 0.48) / 0.32));
  } else {
    target.rotationZ = -0.55 * (1 - smoothStep01((progress - 0.8) / 0.2));
  }
  return target;
}

export function isSniperBoltCycling(
  weapon: WeaponKind,
  nowMs: number,
  lastShotAtMs: number,
) {
  if (
    weapon !== 'sniper' ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(lastShotAtMs) ||
    nowMs < 0 ||
    lastShotAtMs < 0
  )
    return false;
  const elapsedMs = nowMs - lastShotAtMs;
  return elapsedMs >= 0 && elapsedMs < S90_BOLT_CYCLE_DURATION_MS;
}

export function shouldAutoUnscopeAfterCommittedShot(
  weapon: WeaponKind,
  scoped: boolean,
  committed: boolean,
) {
  return weapon === 'sniper' && scoped && committed;
}

const WEAPON_RELOAD_POSE_PROFILES: Readonly<
  Record<FirearmKind, Readonly<WeaponReloadPose>>
> = {
  rifle: {
    positionX: -0.045,
    positionY: -0.18,
    positionZ: 0.11,
    rotationX: -0.1,
    rotationY: 0.22,
    rotationZ: 0.2,
  },
  carbine: {
    positionX: -0.05,
    positionY: -0.17,
    positionZ: 0.1,
    rotationX: -0.08,
    rotationY: 0.2,
    rotationZ: 0.18,
  },
  smg: {
    positionX: -0.06,
    positionY: -0.15,
    positionZ: 0.1,
    rotationX: -0.08,
    rotationY: 0.18,
    rotationZ: 0.24,
  },
  shotgun: {
    positionX: -0.08,
    positionY: -0.13,
    positionZ: 0.08,
    rotationX: -0.04,
    rotationY: 0.14,
    rotationZ: -0.32,
  },
  sniper: {
    positionX: -0.1,
    positionY: -0.22,
    positionZ: 0.15,
    rotationX: -0.12,
    rotationY: 0.28,
    rotationZ: 0.18,
  },
  glock18: {
    positionX: -0.036,
    positionY: 0.2,
    positionZ: -0.012,
    rotationX: 0.04,
    rotationY: 0.16,
    rotationZ: -0.15,
  },
  usp: {
    positionX: -0.035,
    positionY: 0.2,
    positionZ: -0.015,
    rotationX: 0.035,
    rotationY: 0.16,
    rotationZ: -0.14,
  },
  p228: {
    positionX: -0.038,
    positionY: 0.2,
    positionZ: -0.015,
    rotationX: 0.04,
    rotationY: 0.17,
    rotationZ: -0.15,
  },
  deagle: {
    positionX: -0.045,
    positionY: 0.2,
    positionZ: -0.02,
    rotationX: 0.05,
    rotationY: 0.19,
    rotationZ: -0.18,
  },
  elite: {
    positionX: -0.05,
    positionY: 0.2,
    positionZ: -0.015,
    rotationX: 0.05,
    rotationY: 0.2,
    rotationZ: -0.2,
  },
  fiveseven: {
    positionX: -0.036,
    positionY: 0.2,
    positionZ: -0.015,
    rotationX: 0.035,
    rotationY: 0.165,
    rotationZ: -0.145,
  },
};

export function writeWeaponReloadPose(
  weapon: FirearmKind | null,
  progress: number,
  target: WeaponReloadPose,
) {
  const safeProgress = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  const profile = weapon ? WEAPON_RELOAD_POSE_PROFILES[weapon] : null;
  const sine = Math.sin(Math.PI * safeProgress);
  const envelope = safeProgress <= 0 || safeProgress >= 1 ? 0 : sine * sine;
  if (!profile || envelope === 0) {
    target.positionX = 0;
    target.positionY = 0;
    target.positionZ = 0;
    target.rotationX = 0;
    target.rotationY = 0;
    target.rotationZ = 0;
    return target;
  }
  const handoff = Math.sin(Math.PI * 2 * safeProgress) * envelope;
  target.positionX = profile.positionX * envelope;
  target.positionY = profile.positionY * envelope;
  target.positionZ = profile.positionZ * envelope;
  target.rotationX = profile.rotationX * envelope;
  target.rotationY = profile.rotationY * envelope + handoff * 0.035;
  target.rotationZ = profile.rotationZ * envelope + handoff * 0.05;
  return target;
}

export function canStartPlayerReload({
  active,
  alive,
  buyOpen,
  weaponReady,
  reloading,
  ammo,
  magazineSize,
}: {
  active: boolean;
  alive: boolean;
  buyOpen: boolean;
  weaponReady: boolean;
  reloading: boolean;
  ammo: FirearmAmmo;
  magazineSize: number;
}) {
  return (
    active &&
    alive &&
    !buyOpen &&
    weaponReady &&
    !reloading &&
    ammo.magazine < Math.max(0, magazineSize) &&
    ammo.reserve > 0
  );
}

export function reloadMagazine(
  ammo: FirearmAmmo,
  magazineSize: number,
): FirearmAmmo {
  const loaded = Math.min(
    Math.max(0, magazineSize - ammo.magazine),
    ammo.reserve,
  );
  return {
    magazine: ammo.magazine + loaded,
    reserve: ammo.reserve - loaded,
  };
}

export function reloadSingleShell(
  ammo: FirearmAmmo,
  magazineSize: number,
): FirearmAmmo {
  if (ammo.magazine >= magazineSize || ammo.reserve <= 0) return { ...ammo };
  return { magazine: ammo.magazine + 1, reserve: ammo.reserve - 1 };
}

export function shouldRepeatFire(weapon: WeaponKind, triggerHeld: boolean) {
  return (
    triggerHeld &&
    weapon !== 'knife' &&
    weapon !== 'grenade' &&
    weapon !== 'smoke' &&
    weapon !== 'flash' &&
    weapon !== 'bomb' &&
    FIREARMS[weapon].trigger === 'automatic'
  );
}

export function getCrosshairGap(spread: number) {
  return Math.min(22, Math.max(5, 5 + Math.max(0, spread) * 260));
}

export function getDamageDirection(
  sourceX: number,
  sourceZ: number,
  playerX: number,
  playerZ: number,
  playerYaw: number,
): DamageDirection {
  const deltaX = sourceX - playerX;
  const deltaZ = sourceZ - playerZ;
  const distance = Math.hypot(deltaX, deltaZ) || 1;
  const directionX = deltaX / distance;
  const directionZ = deltaZ / distance;
  const forwardDot =
    directionX * -Math.sin(playerYaw) + directionZ * -Math.cos(playerYaw);
  const rightDot =
    directionX * Math.cos(playerYaw) + directionZ * -Math.sin(playerYaw);

  if (Math.abs(forwardDot) >= Math.abs(rightDot))
    return forwardDot >= 0 ? 'front' : 'back';
  return rightDot >= 0 ? 'right' : 'left';
}

export const BOT_FOOTSTEP_HEARING_RADIUS = 18;
export const BOT_FOOTSTEP_SHARED_COOLDOWN_MS = 120;

export type PositionalAudioCue = Readonly<{ pan: number; gain: number }>;

export function getPositionalAudioCue(
  sourceX: number,
  sourceZ: number,
  listenerX: number,
  listenerZ: number,
  listenerYaw: number,
  hearingRadius: number,
): PositionalAudioCue | null {
  if (
    ![sourceX, sourceZ, listenerX, listenerZ, listenerYaw, hearingRadius].every(
      Number.isFinite,
    ) ||
    hearingRadius <= 0
  )
    return null;
  const deltaX = sourceX - listenerX;
  const deltaZ = sourceZ - listenerZ;
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance >= hearingRadius) return null;
  const normalizedDistance = distance / hearingRadius;
  const directionX = distance > 0.0001 ? deltaX / distance : 0;
  const directionZ = distance > 0.0001 ? deltaZ / distance : 0;
  const rightX = Math.cos(listenerYaw);
  const rightZ = -Math.sin(listenerYaw);
  return {
    pan: Math.min(1, Math.max(-1, directionX * rightX + directionZ * rightZ)),
    gain: Math.min(1, Math.max(0, (1 - normalizedDistance) ** 1.35)),
  };
}

export function getBotFootstepCadenceMs(speed: number) {
  const safeSpeed = Number.isFinite(speed) ? speed : 0;
  const normalizedSpeed =
    (Math.min(3.5, Math.max(0.7, safeSpeed)) - 0.7) / (3.5 - 0.7);
  return Math.round(620 - normalizedSpeed * 200);
}

export function shouldEmitBotFootstep({
  sourceAlive,
  listenerAlive,
  speed,
  distance,
  nowMs,
  botNextAtMs,
  sharedNextAtMs,
  hearingRadius = BOT_FOOTSTEP_HEARING_RADIUS,
}: {
  sourceAlive: boolean;
  listenerAlive: boolean;
  speed: number;
  distance: number;
  nowMs: number;
  botNextAtMs: number;
  sharedNextAtMs: number;
  hearingRadius?: number;
}) {
  return (
    sourceAlive &&
    listenerAlive &&
    Number.isFinite(speed) &&
    speed >= 0.7 &&
    Number.isFinite(distance) &&
    distance >= 0 &&
    distance < Math.max(0, hearingRadius) &&
    Number.isFinite(nowMs) &&
    Number.isFinite(botNextAtMs) &&
    Number.isFinite(sharedNextAtMs) &&
    nowMs >= botNextAtMs &&
    nowMs >= sharedNextAtMs
  );
}

export function getExplosionDamage(
  distance: number,
  radius = 9,
  maximumDamage = 115,
) {
  if (radius <= 0 || maximumDamage <= 0) return 0;
  const normalizedDistance = Math.min(1, Math.max(0, distance) / radius);
  return Math.max(0, maximumDamage * (1 - normalizedDistance) ** 1.35);
}

export function advanceGrenadeFuse(
  remainingSeconds: number,
  simulatedSeconds: number,
) {
  return Math.max(0, remainingSeconds - Math.max(0, simulatedSeconds));
}

export type FlashExposure = Readonly<{
  distance: number;
  viewDot: number;
  hasLineOfSight: boolean;
}>;

export function getFlashBlindDuration(
  exposure: FlashExposure,
  radius = 24,
  maximumSeconds = 3.2,
) {
  if (
    !exposure.hasLineOfSight ||
    !Number.isFinite(exposure.distance) ||
    !Number.isFinite(radius) ||
    !Number.isFinite(maximumSeconds) ||
    radius <= 0 ||
    maximumSeconds <= 0 ||
    exposure.distance >= radius
  )
    return 0;
  const distance = Math.max(0, exposure.distance);
  const viewDot = Number.isFinite(exposure.viewDot) ? exposure.viewDot : -1;
  const distanceFactor = (1 - Math.min(1, distance / radius)) ** 1.15;
  const facingFactor =
    0.25 + 0.75 * Math.min(1, Math.max(0, (viewDot + 1) / 2));
  return Math.min(
    maximumSeconds,
    Math.max(0, maximumSeconds * distanceFactor * facingFactor),
  );
}

export function getFlashOverlayOpacity(
  remainingSeconds: number,
  totalSeconds: number,
) {
  if (
    !Number.isFinite(remainingSeconds) ||
    !Number.isFinite(totalSeconds) ||
    remainingSeconds <= 0 ||
    totalSeconds <= 0
  )
    return 0;
  const progress = Math.min(1, remainingSeconds / totalSeconds);
  return Math.min(1, Math.max(0, progress ** 0.55));
}

export function canPlayerPickupBomb({
  active,
  alive,
  playerSide,
  bombState,
  playerHasBomb,
  distance,
}: {
  active: boolean;
  alive: boolean;
  playerSide: Side;
  bombState: BombState;
  playerHasBomb: boolean;
  distance: number;
}) {
  return (
    active &&
    alive &&
    playerSide === 't' &&
    bombState === 'dropped' &&
    !playerHasBomb &&
    Number.isFinite(distance) &&
    distance >= 0 &&
    distance <= BOMB_PICKUP_RADIUS
  );
}

export function canPlayerDropBomb({
  active,
  alive,
  playerSide,
  bombState,
  playerHasBomb,
  buyOpen,
}: {
  active: boolean;
  alive: boolean;
  playerSide: Side;
  bombState: BombState;
  playerHasBomb: boolean;
  buyOpen: boolean;
}) {
  return (
    active &&
    alive &&
    playerSide === 't' &&
    bombState === 'carried' &&
    playerHasBomb &&
    !buyOpen
  );
}

export function getPlayerDropTarget({
  activeWeapon,
  canDropBomb,
  canDropFirearm,
}: {
  activeWeapon: WeaponKind;
  canDropBomb: boolean;
  canDropFirearm: boolean;
}) {
  if (activeWeapon === 'bomb' && canDropBomb) return 'bomb' as const;
  if (isFirearmKind(activeWeapon) && canDropFirearm) return 'firearm' as const;
  return null;
}

export function canPickupFirearm({
  active,
  alive,
  freezeSeconds,
  currentPrimary,
  currentSecondary,
  candidate,
  distance,
  objectiveInteractionAvailable,
}: {
  active: boolean;
  alive: boolean;
  freezeSeconds: number;
  currentPrimary: PrimaryWeaponKind | null;
  currentSecondary: SecondaryWeaponKind | null;
  candidate: WeaponKind | null;
  distance: number;
  objectiveInteractionAvailable: boolean;
}) {
  const candidateIsAvailable =
    candidate !== null &&
    (isPrimaryWeaponKind(candidate)
      ? currentPrimary === null
      : isSecondaryWeaponKind(candidate)
        ? currentSecondary === null
        : false);
  return (
    active &&
    alive &&
    freezeSeconds <= 0 &&
    candidate !== null &&
    candidateIsAvailable &&
    !objectiveInteractionAvailable &&
    Number.isFinite(distance) &&
    distance >= 0 &&
    distance <= FIREARM_PICKUP_RADIUS
  );
}

export function canDropFirearm({
  active,
  alive,
  activeWeapon,
  currentPrimary,
  currentSecondary,
  reloading,
  buyOpen,
}: {
  active: boolean;
  alive: boolean;
  activeWeapon: WeaponKind;
  currentPrimary: PrimaryWeaponKind | null;
  currentSecondary: SecondaryWeaponKind | null;
  reloading: boolean;
  buyOpen: boolean;
}) {
  const activeFirearm = isFirearmKind(activeWeapon) ? activeWeapon : null;
  return (
    active &&
    alive &&
    activeFirearm !== null &&
    ((isPrimaryWeaponKind(activeFirearm) && currentPrimary === activeFirearm) ||
      (isSecondaryWeaponKind(activeFirearm) &&
        currentSecondary === activeFirearm)) &&
    !reloading &&
    !buyOpen
  );
}

export function isFirearmDropAvailable(
  pickupAvailableAtMs: number,
  simulationNowMs: number,
) {
  return (
    Number.isFinite(pickupAvailableAtMs) &&
    Number.isFinite(simulationNowMs) &&
    simulationNowMs >= pickupAvailableAtMs
  );
}

export type DroppedFirearmPickupCandidate = Readonly<{
  id: number;
  kind: FirearmKind;
  pickupAvailableAtMs: number;
  distance: number;
}>;

/** Selects the nearest available in-range drop whose matching weapon slot is empty. */
export function getEligibleDroppedFirearm({
  drops,
  currentPrimary,
  currentSecondary,
  simulationNowMs,
  maximumDistance = FIREARM_PICKUP_RADIUS,
}: {
  drops: readonly DroppedFirearmPickupCandidate[];
  currentPrimary: PrimaryWeaponKind | null;
  currentSecondary: SecondaryWeaponKind | null;
  simulationNowMs: number;
  maximumDistance?: number;
}): DroppedFirearmPickupCandidate | null {
  const eligibleDrops = drops.filter((drop) => {
    const hasAvailablePickup = isFirearmDropAvailable(
      drop.pickupAvailableAtMs,
      simulationNowMs,
    );
    const isWithinPickupRadius =
      Number.isFinite(drop.distance) &&
      drop.distance >= 0 &&
      drop.distance <= maximumDistance;
    const hasEmptyWeaponSlot = isPrimaryWeaponKind(drop.kind)
      ? currentPrimary === null
      : currentSecondary === null;

    return hasAvailablePickup && isWithinPickupRadius && hasEmptyWeaponSlot;
  });

  return (
    eligibleDrops.sort(
      (left, right) => left.distance - right.distance || left.id - right.id,
    )[0] ?? null
  );
}

export function sanitizeDroppedFirearmAmmo(
  kind: FirearmKind,
  ammo: FirearmAmmo,
): FirearmAmmo {
  const definition = FIREARMS[kind];
  const magazine = Number.isFinite(ammo.magazine) ? ammo.magazine : 0;
  const reserve = Number.isFinite(ammo.reserve) ? ammo.reserve : 0;
  return {
    magazine: Math.min(
      definition.magazineSize,
      Math.max(0, Math.floor(magazine)),
    ),
    reserve: Math.min(definition.maxReserve, Math.max(0, Math.floor(reserve))),
  };
}

export function getSmokeCloudOpacity(ageSeconds: number, lifetimeSeconds = 13) {
  if (ageSeconds < 0 || lifetimeSeconds <= 0 || ageSeconds >= lifetimeSeconds)
    return 0;
  const bloom = Math.min(1, ageSeconds / 0.65);
  const fade = Math.min(1, (lifetimeSeconds - ageSeconds) / 1.5);
  return Math.max(0, Math.min(bloom, fade));
}

export function segmentIntersectsSmoke(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
  center: readonly [number, number, number],
  radius: number,
) {
  if (radius <= 0) return false;
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const segmentZ = end[2] - start[2];
  const segmentLengthSquared =
    segmentX * segmentX + segmentY * segmentY + segmentZ * segmentZ;
  const centerX = center[0] - start[0];
  const centerY = center[1] - start[1];
  const centerZ = center[2] - start[2];
  const projection =
    segmentLengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            (centerX * segmentX + centerY * segmentY + centerZ * segmentZ) /
              segmentLengthSquared,
          ),
        );
  const closestX = start[0] + segmentX * projection;
  const closestY = start[1] + segmentY * projection;
  const closestZ = start[2] + segmentZ * projection;
  return (
    Math.hypot(
      center[0] - closestX,
      center[1] - closestY,
      center[2] - closestZ,
    ) <= radius
  );
}

export function shouldInterruptPlant(
  isBombCarrier: boolean,
  isPlanting: boolean,
  shouldEngage: boolean,
  shouldInvestigate: boolean,
) {
  return isBombCarrier && isPlanting && (shouldEngage || shouldInvestigate);
}

export function getEnemyPrimaryWeapon(
  roundIndex: number,
  enemyId: number,
  side: Side,
): PrimaryWeaponKind {
  const rosterIndex =
    (Math.max(0, Math.floor(roundIndex)) + Math.max(0, Math.floor(enemyId))) %
    ENEMY_PRIMARY_ROSTER.length;
  const rosterWeapon = ENEMY_PRIMARY_ROSTER[rosterIndex];
  return rosterWeapon === 'rifle' ? getServiceRifleForSide(side) : rosterWeapon;
}

export function getBotBuyTier(lossStreak: number): BotBuyTier {
  const losses = Number.isFinite(lossStreak)
    ? Math.max(0, Math.floor(lossStreak))
    : 0;
  return losses === 1 ? 'eco' : 'full';
}

export function shouldIssueBotDefuseKit({
  side,
  assignedKit,
  matchRoundIndex,
  lossStreak,
}: Readonly<{
  side: Side;
  assignedKit: boolean;
  matchRoundIndex: number;
  lossStreak: number;
}>) {
  return (
    side === 'ct' &&
    assignedKit &&
    Number.isInteger(matchRoundIndex) &&
    matchRoundIndex >= 0 &&
    !isOpeningPistolRound(matchRoundIndex) &&
    Number.isInteger(lossStreak) &&
    lossStreak >= 0 &&
    getBotBuyTier(lossStreak) === 'full'
  );
}

export function getBotRoundPrimaryWeapon(
  roundIndex: number,
  botId: number,
  lossStreak: number,
  side: Side,
): PrimaryWeaponKind {
  const safeRound = Number.isFinite(roundIndex)
    ? Math.max(0, Math.floor(roundIndex))
    : 0;
  const safeBotId = Number.isFinite(botId) ? Math.max(0, Math.floor(botId)) : 0;
  if (getBotBuyTier(lossStreak) === 'full')
    return getEnemyPrimaryWeapon(safeRound, safeBotId, side);
  return (safeRound + safeBotId) % 2 === 0 ? 'smg' : 'shotgun';
}

export function isOpeningPistolRound(roundIndex: number) {
  if (!Number.isInteger(roundIndex) || roundIndex < 0) return false;
  return roundIndex === 0 || roundIndex === HALFTIME_AFTER_ROUNDS;
}

export function getBotRoundFirearm({
  matchRoundIndex,
  rosterRoundIndex,
  botId,
  lossStreak,
  side,
}: Readonly<{
  matchRoundIndex: number;
  rosterRoundIndex: number;
  botId: number;
  lossStreak: number;
  side: Side;
}>): FirearmKind {
  if (isOpeningPistolRound(matchRoundIndex))
    return getStarterSecondaryForSide(side);
  return getBotRoundPrimaryWeapon(rosterRoundIndex, botId, lossStreak, side);
}

export function getBotFirearmDropKind(kind: FirearmKind): FirearmKind {
  return kind;
}

export function createEnemyPrimaryAmmo(kind: FirearmKind): FirearmAmmo {
  const definition = FIREARMS[kind];
  return {
    magazine: definition.magazineSize,
    reserve: definition.maxReserve,
  };
}

export function getEnemyFireCooldown(kind: FirearmKind, randomUnit: number) {
  const definition = FIREARMS[kind];
  const random = Math.min(1, Math.max(0, randomUnit));
  const shotInterval = definition.fireIntervalMs / 1000;
  if (definition.trigger === 'semi')
    return shotInterval * (0.96 + random * 0.12);
  return Math.max(0.3, shotInterval * 3.2) * (0.9 + random * 0.3);
}

export function getEnemyBurstSize(
  kind: FirearmKind,
  randomUnit: number,
  distance: number,
) {
  if (FIREARMS[kind].trigger === 'semi') return 1;
  const randomShots = Math.floor(Math.min(1, Math.max(0, randomUnit)) * 2.999);
  const baseShots =
    kind === 'smg' ? (distance < 16 ? 4 : 3) : distance < 16 ? 3 : 2;
  return baseShots + randomShots;
}

export function getEnemyBurstShotCooldown(
  kind: FirearmKind,
  randomUnit: number,
) {
  const random = Math.min(1, Math.max(0, randomUnit));
  return (FIREARMS[kind].fireIntervalMs / 1000) * (0.92 + random * 0.16);
}

export function getEnemyReloadDuration(kind: FirearmKind) {
  return FIREARMS[kind].reloadMs / 1000;
}

export function reloadEnemyPrimary(kind: FirearmKind, ammo: FirearmAmmo) {
  const definition = FIREARMS[kind];
  return definition.reloadMode === 'shell'
    ? reloadSingleShell(ammo, definition.magazineSize)
    : reloadMagazine(ammo, definition.magazineSize);
}

export function getEnemyMuzzleOffsetZ(kind: FirearmKind) {
  if (kind === 'sniper') return -1.48;
  if (kind === 'shotgun') return -1.34;
  if (kind === 'smg') return -0.92;
  if (isSecondaryWeaponKind(kind)) return -0.62;
  return -1.12;
}

export function getEnemyEngagementRange(kind: FirearmKind) {
  if (kind === 'sniper') return 60;
  if (kind === 'rifle' || kind === 'carbine') return 44;
  if (kind === 'smg') return 34;
  if (isSecondaryWeaponKind(kind)) return 30;
  return 24;
}

export function getEnemyPreferredRange(
  kind: FirearmKind,
  profilePreferredRange: number,
) {
  const weaponRange =
    kind === 'sniper'
      ? 27
      : kind === 'rifle' || kind === 'carbine'
        ? 14
        : kind === 'smg'
          ? 10
          : isSecondaryWeaponKind(kind)
            ? 9
            : 7;
  const profileScale = Math.min(
    1.15,
    Math.max(0.85, Math.max(0, profilePreferredRange) / 11),
  );
  return weaponRange * profileScale;
}

export function getEnemyReactionTime(
  kind: FirearmKind,
  profileReactionTime: number,
) {
  const weaponDelay = kind === 'sniper' ? 0.28 : kind === 'shotgun' ? 0.04 : 0;
  return Math.max(0, profileReactionTime) + weaponDelay;
}

export function getEnemyPursuitSpeed(
  role: EnemyRole,
  aggression: number,
  suppression: number,
  burstShotsRemaining: number,
) {
  const baseSpeed = role === 'hunter' ? 3.2 : 1.9;
  const suppressionMultiplier = 1 + Math.min(1, Math.max(0, suppression)) * 0.1;
  const firingMultiplier = burstShotsRemaining > 0 ? 0.28 : 1;
  return (
    baseSpeed *
    Math.max(0.1, aggression) *
    suppressionMultiplier *
    firingMultiplier
  );
}

export function canEnemyFire({
  playerAlive,
  hasLineOfSight,
  blinded,
  inRange,
  facingPlayer,
  sightSeconds,
  reactionSeconds,
  fireCooldown,
  reloadSeconds,
  utilitySeconds,
  hasMagazineAmmo,
  burstShotsRemaining,
  activeShooters,
  activeBurstLimit = 3,
  carrierPlanting,
}: {
  playerAlive: boolean;
  hasLineOfSight: boolean;
  blinded: boolean;
  inRange: boolean;
  facingPlayer: boolean;
  sightSeconds: number;
  reactionSeconds: number;
  fireCooldown: number;
  reloadSeconds: number;
  utilitySeconds: number;
  hasMagazineAmmo: boolean;
  burstShotsRemaining: number;
  activeShooters: number;
  activeBurstLimit?: number;
  carrierPlanting: boolean;
}) {
  return (
    playerAlive &&
    hasLineOfSight &&
    !blinded &&
    inRange &&
    facingPlayer &&
    sightSeconds >= reactionSeconds &&
    fireCooldown <= 0 &&
    reloadSeconds <= 0 &&
    utilitySeconds <= 0 &&
    hasMagazineAmmo &&
    (burstShotsRemaining > 0 ||
      canEnemyStartBurst(activeShooters, activeBurstLimit)) &&
    !carrierPlanting
  );
}

export function canPlayerSpotEnemy({
  playerAlive,
  blinded,
  hasLineOfSight,
  distance,
  viewAlignment,
}: {
  playerAlive: boolean;
  blinded: boolean;
  hasLineOfSight: boolean;
  distance: number;
  viewAlignment: number;
}) {
  return (
    playerAlive &&
    !blinded &&
    hasLineOfSight &&
    distance <= 60 &&
    viewAlignment >= 0.12
  );
}

export function shouldShowRadarContact({ team, alive }: { team: BotTeam; alive: boolean }) {
  return alive && team === 'ally';
}

const RADAR_WORLD_SCALE = 1.12;
const RADAR_SAFE_MIN_PERCENT = 4;
const RADAR_SAFE_MAX_PERCENT = 96;

export function getRadarMapPosition(x: number, z: number) {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeZ = Number.isFinite(z) ? z : 0;
  return {
    leftPercent: Math.min(
      RADAR_SAFE_MAX_PERCENT,
      Math.max(RADAR_SAFE_MIN_PERCENT, 50 + safeX * RADAR_WORLD_SCALE),
    ),
    topPercent: Math.min(
      RADAR_SAFE_MAX_PERCENT,
      Math.max(RADAR_SAFE_MIN_PERCENT, 50 + safeZ * RADAR_WORLD_SCALE),
    ),
  };
}

export function getRadarHeadingDegrees(yaw: number) {
  if (!Number.isFinite(yaw)) return 0;
  const degrees = (-yaw * 180) / Math.PI;
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

export function shouldChooseEnemyMovement(
  decisionSeconds: number,
  burstShotsRemaining: number,
) {
  return decisionSeconds <= 0 && burstShotsRemaining <= 0;
}

export function getEnemyCombatMovement(
  distance: number,
  preferredRange: number,
  randomUnit: number,
): EnemyCombatMovement {
  if (distance < preferredRange * 0.65) return 'retreat';
  const random = Math.min(1, Math.max(0, randomUnit));
  if (distance > preferredRange * 1.45 && random < 0.62) return 'advance';
  if (random < 0.38) return 'hold';
  return random < 0.69 ? 'left' : 'right';
}

export function canEnemyUseSquadIntel(
  intelAgeSeconds: number,
  memorySeconds: number,
) {
  return (
    intelAgeSeconds >= 0.45 &&
    intelAgeSeconds < Math.min(4.5, Math.max(0, memorySeconds))
  );
}

export const FRIENDLY_INTEL_RADIO_DELAY_SECONDS = 0.45;
export const FRIENDLY_INTEL_MAX_FRESHNESS_SECONDS = 4.5;
export const SQUAD_BACKUP_CALL_COOLDOWN_MS = 8000;
export const SQUAD_BACKUP_REQUEST_SECONDS = 6.5;
export const SQUAD_BACKUP_CALLOUT_MS = 2600;
export const SQUAD_BACKUP_TARGET_SEPARATION = 0.9;
export const ALLY_ENEMY_SPOTTED_CALLOUT_MS = 1800;
export const ALLY_ENEMY_SPOTTED_COOLDOWN_MS = 4500;
export const ALLY_ENEMY_SPOTTED_CALLOUT_TEXT = 'RADIO · ENEMY SPOTTED';
export const SQUAD_BACKUP_FORMATION_OFFSETS = [
  [-1.9, -1.15],
  [1.9, -1.15],
  [-1.9, 1.15],
  [1.9, 1.15],
] as const;

export function canIssueBackupCall({
  active,
  playerAlive,
  freezeSeconds,
  nowMs,
  nextCallAtMs,
  livingAllyCount,
}: Readonly<{
  active: boolean;
  playerAlive: boolean;
  freezeSeconds: number;
  nowMs: number;
  nextCallAtMs: number;
  livingAllyCount: number;
}>) {
  return (
    active &&
    playerAlive &&
    Number.isFinite(freezeSeconds) &&
    freezeSeconds <= 0 &&
    Number.isFinite(nowMs) &&
    Number.isFinite(nextCallAtMs) &&
    nowMs >= nextCallAtMs &&
    Number.isFinite(livingAllyCount) &&
    livingAllyCount > 0
  );
}

export function shouldAllyRespondToBackup({
  hasDirectContact,
  objectiveLocked,
  playerAlive,
  requestAgeSeconds,
}: Readonly<{
  hasDirectContact: boolean;
  objectiveLocked: boolean;
  playerAlive: boolean;
  requestAgeSeconds: number;
}>) {
  return (
    !hasDirectContact &&
    !objectiveLocked &&
    playerAlive &&
    Number.isFinite(requestAgeSeconds) &&
    requestAgeSeconds >= 0 &&
    requestAgeSeconds < SQUAD_BACKUP_REQUEST_SECONDS
  );
}

export function shouldEmitAllyEnemySpottedCallout({
  active,
  sourceAlive,
  targetAlive,
  playerAlive,
  directContactId,
  previousDirectContactId,
  freezeSeconds,
  nowMs,
  nextCalloutAtMs,
  radioBusy,
}: Readonly<{
  active: boolean;
  sourceAlive: boolean;
  targetAlive: boolean;
  playerAlive: boolean;
  directContactId: number | null;
  previousDirectContactId: number | null;
  freezeSeconds: number;
  nowMs: number;
  nextCalloutAtMs: number;
  radioBusy: boolean;
}>) {
  return (
    active &&
    sourceAlive &&
    targetAlive &&
    playerAlive &&
    Number.isFinite(directContactId) &&
    directContactId !== previousDirectContactId &&
    (previousDirectContactId === null ||
      Number.isFinite(previousDirectContactId)) &&
    Number.isFinite(freezeSeconds) &&
    freezeSeconds <= 0 &&
    Number.isFinite(nowMs) &&
    Number.isFinite(nextCalloutAtMs) &&
    nowMs >= nextCalloutAtMs &&
    !radioBusy
  );
}

export function getSquadBackupFormationOffset(allyId: number) {
  const index = Number.isFinite(allyId)
    ? Math.abs(Math.floor(allyId)) % SQUAD_BACKUP_FORMATION_OFFSETS.length
    : 0;
  return SQUAD_BACKUP_FORMATION_OFFSETS[index];
}

export function getSquadBackupTarget(
  originX: number,
  originZ: number,
  allyId: number,
  isBlocked: (x: number, z: number) => boolean,
  reservedTargets: ReadonlyArray<Readonly<{ x: number; z: number }>> = [],
) {
  if (!Number.isFinite(originX) || !Number.isFinite(originZ)) return null;
  for (
    let offsetIndex = 0;
    offsetIndex < SQUAD_BACKUP_FORMATION_OFFSETS.length;
    offsetIndex += 1
  ) {
    const [offsetX, offsetZ] = getSquadBackupFormationOffset(
      allyId + offsetIndex,
    );
    const x = originX + offsetX;
    const z = originZ + offsetZ;
    const overlapsReservedTarget = reservedTargets.some(
      (target) =>
        Math.hypot(target.x - x, target.z - z) < SQUAD_BACKUP_TARGET_SEPARATION,
    );
    if (!isBlocked(x, z) && !overlapsReservedTarget) return { x, z };
  }
  return null;
}

export function shouldAllyInvestigateIntel({
  hasDirectContact,
  objectiveLocked,
  calloutAgeSeconds,
  freshnessAgeSeconds,
  memorySeconds,
}: Readonly<{
  hasDirectContact: boolean;
  objectiveLocked: boolean;
  calloutAgeSeconds: number;
  freshnessAgeSeconds: number;
  memorySeconds: number;
}>) {
  return (
    !hasDirectContact &&
    !objectiveLocked &&
    Number.isFinite(calloutAgeSeconds) &&
    calloutAgeSeconds >= FRIENDLY_INTEL_RADIO_DELAY_SECONDS &&
    Number.isFinite(freshnessAgeSeconds) &&
    freshnessAgeSeconds >= 0 &&
    Number.isFinite(memorySeconds) &&
    freshnessAgeSeconds <
      Math.min(FRIENDLY_INTEL_MAX_FRESHNESS_SECONDS, Math.max(0, memorySeconds))
  );
}

export function shouldClearFriendlyIntelForElimination(
  trackedEnemyId: number | null,
  victimTeam: BotTeam,
  victimId: number,
) {
  return (
    victimTeam === 'enemy' &&
    trackedEnemyId !== null &&
    trackedEnemyId === victimId
  );
}

export type EnemyCombatTargetId = 'player' | `ally:${number}`;

export type EnemyCombatTarget =
  | Readonly<{
      id: 'player';
      kind: 'player';
      alive: boolean;
      distance: number;
      visible: boolean;
    }>
  | Readonly<{
      id: `ally:${number}`;
      kind: 'ally';
      alive: boolean;
      distance: number;
      visible: boolean;
    }>;

export function chooseEnemyCombatTarget(
  candidates: readonly EnemyCombatTarget[],
  playerDistanceBias = 0.86,
): EnemyCombatTarget | null {
  const bias = Number.isFinite(playerDistanceBias)
    ? Math.min(1, Math.max(0, playerDistanceBias))
    : 0.86;
  const visible = candidates.filter(
    (candidate) =>
      candidate.alive &&
      candidate.visible &&
      Number.isFinite(candidate.distance) &&
      candidate.distance >= 0,
  );
  if (visible.length === 0) return null;

  const nearest = (targets: readonly EnemyCombatTarget[]) =>
    [...targets].sort((left, right) => {
      const distanceDelta = left.distance - right.distance;
      if (distanceDelta !== 0) return distanceDelta;
      if (left.kind === 'ally' && right.kind === 'ally') {
        return (
          Number(left.id.slice('ally:'.length)) -
          Number(right.id.slice('ally:'.length))
        );
      }
      return left.kind === 'player' ? -1 : 1;
    })[0] ?? null;
  const player = visible.find((candidate) => candidate.kind === 'player');
  if (!player) return nearest(visible);
  const closerAlly = nearest(
    visible.filter(
      (candidate) =>
        candidate.kind === 'ally' &&
        candidate.distance < player.distance * bias,
    ),
  );
  return closerAlly ?? player;
}

export function shouldResetEnemyTracking(
  previousTargetId: EnemyCombatTargetId | null,
  nextTargetId: EnemyCombatTargetId | null,
) {
  return previousTargetId !== nextTargetId;
}

export function canEnemyStartBurst(activeShooters: number, limit = 3) {
  return Math.max(0, activeShooters) < Math.max(1, limit);
}

export type ArmorDamageInput = Readonly<
  | {
      health: number;
      armor: number;
      helmet: boolean;
      rawDamage: number;
      source: 'bullet';
      weapon: FirearmKind;
      hitGroup: HitGroup;
    }
  | {
      health: number;
      armor: number;
      helmet: boolean;
      rawDamage: number;
      source: 'explosion';
    }
>;

export function applyArmorDamage(input: ArmorDamageInput) {
  const safeHealth = Number.isFinite(input.health)
    ? Math.max(0, input.health)
    : 0;
  const safeArmor = Number.isFinite(input.armor)
    ? Math.min(100, Math.max(0, input.armor))
    : 0;
  const safeHelmet = Boolean(input.helmet) && safeArmor > 0;
  const safeDamage = Number.isFinite(input.rawDamage)
    ? Math.max(0, input.rawDamage)
    : 0;
  const armoredHit =
    safeArmor > 0 &&
    (input.source === 'explosion' ||
      input.hitGroup === 'torso' ||
      input.hitGroup === 'stomach' ||
      (input.hitGroup === 'head' && safeHelmet));
  if (!armoredHit || safeDamage === 0) {
    const health = Math.max(0, safeHealth - safeDamage);
    return {
      armor: safeArmor,
      helmet: safeHelmet,
      health,
      armorDamage: 0,
      healthDamage: safeHealth - health,
    };
  }

  const healthRatio =
    input.source === 'explosion'
      ? 0.5
      : Math.min(1, 0.5 * FIREARM_ARMOR_RATIO_MULTIPLIERS[input.weapon]);
  const protectedHealthDamage = safeDamage * healthRatio;
  const requiredArmor = (safeDamage - protectedHealthDamage) * 0.5;
  let healthDamage = protectedHealthDamage;
  let armor = safeArmor - requiredArmor;
  if (requiredArmor > safeArmor) {
    healthDamage =
      input.source === 'explosion'
        ? safeDamage - safeArmor
        : safeDamage - safeArmor / 0.5;
    armor = 0;
  }
  const health = Math.max(0, safeHealth - Math.max(0, healthDamage));
  const nextArmor = Math.max(0, armor);
  return {
    armor: nextArmor,
    helmet: safeHelmet && nextArmor > 0,
    health,
    armorDamage: safeArmor - nextArmor,
    healthDamage: safeHealth - health,
  };
}

// ReGameDLL-CS b0889847 reconstructed-reference constants, expressed through
// the project's existing GoldSrc-to-scene conversion. This is not a retail
// measurement or a replacement for the current physics tuning.
export const FALL_DAMAGE_SAFE_SPEED = 500 / GOLDSRC_UNITS_PER_SCENE_UNIT;
export const FALL_DAMAGE_FATAL_REFERENCE_SPEED = 1100 / GOLDSRC_UNITS_PER_SCENE_UNIT;
export const FALL_DAMAGE_SCALE =
  (100 / (FALL_DAMAGE_FATAL_REFERENCE_SPEED - FALL_DAMAGE_SAFE_SPEED)) * 1.25;

export function getFallDamage(impactDownwardSpeed: number) {
  const speed = Number.isFinite(impactDownwardSpeed)
    ? Math.max(0, impactDownwardSpeed)
    : 0;
  return Math.max(0, speed - FALL_DAMAGE_SAFE_SPEED) * FALL_DAMAGE_SCALE;
}

export type FallDamageInput = Readonly<{
  health: number;
  armor: number;
  helmet: boolean;
  impactDownwardSpeed: number;
}>;

/** Shared player/bot fall result. Falls bypass armor and leave helmet intact. */
export function resolveFallDamage(input: FallDamageInput) {
  const healthBefore = Number.isFinite(input.health) ? Math.max(0, input.health) : 0;
  const health = Math.max(0, healthBefore - getFallDamage(input.impactDownwardSpeed));
  return {
    health,
    armor: input.armor,
    helmet: input.helmet,
    healthDamage: healthBefore - health,
    armorDamage: 0,
  };
}

export const MAX_PLAYER_DAMAGE_TAG = 0.4;
export const PLAYER_DAMAGE_TAG_RECOVERY_PER_SECOND = 0.55;

export function applyPlayerDamageTag(currentTag: number, healthDamage: number) {
  const current = Number.isFinite(currentTag)
    ? Math.min(MAX_PLAYER_DAMAGE_TAG, Math.max(0, currentTag))
    : 0;
  if (!Number.isFinite(healthDamage) || healthDamage <= 0) return current;
  const incoming = Math.min(MAX_PLAYER_DAMAGE_TAG, 0.1 + healthDamage * 0.006);
  return Math.max(current, incoming);
}

export function getPlayerDamageTagSpeedMultiplier(
  currentTag: number,
  grounded: boolean,
) {
  if (!grounded) return 1;
  const tag = Number.isFinite(currentTag)
    ? Math.min(MAX_PLAYER_DAMAGE_TAG, Math.max(0, currentTag))
    : 0;
  return 1 - tag;
}

export function decayPlayerDamageTag(currentTag: number, frameSeconds: number) {
  const current = Number.isFinite(currentTag)
    ? Math.min(MAX_PLAYER_DAMAGE_TAG, Math.max(0, currentTag))
    : 0;
  if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return current;
  return Math.max(
    0,
    current - frameSeconds * PLAYER_DAMAGE_TAG_RECOVERY_PER_SECOND,
  );
}

export const MAX_DAMAGE_SUPPRESSION = 0.12;

export function applyDamageSuppression(
  currentSuppression: number,
  healthDamage: number,
) {
  const current = Number.isFinite(currentSuppression)
    ? Math.min(MAX_DAMAGE_SUPPRESSION, Math.max(0, currentSuppression))
    : 0;
  if (!Number.isFinite(healthDamage) || healthDamage <= 0) return current;
  const addition = Math.min(0.08, Math.max(0.02, healthDamage * 0.002));
  return Math.min(MAX_DAMAGE_SUPPRESSION, current + addition);
}

export function decayDamageSuppression(
  currentSuppression: number,
  frameSeconds: number,
) {
  const current = Number.isFinite(currentSuppression)
    ? Math.min(MAX_DAMAGE_SUPPRESSION, Math.max(0, currentSuppression))
    : 0;
  if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return current;
  return Math.max(0, current - frameSeconds * 0.18);
}
