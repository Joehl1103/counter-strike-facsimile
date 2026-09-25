import type { FirearmKind } from './game-rules';
import type { SurfaceImpactKind } from './surface-marks';

/**
 * Render-only effect vocabulary.  These values describe presentation budgets;
 * they do not participate in damage, raycasts, recoil, or simulation clocks.
 * Keeping the table free of Three.js objects lets callers apply it to pooled
 * renderer resources without allocating during a shot.
 */
export type CombatVisualActor = 'player' | 'bot';
export type CombatVisualWeaponClass =
  | 'sidearm'
  | 'smg'
  | 'rifle'
  | 'shotgun'
  | 'sniper';

export type CombatVisualWeaponProfile = Readonly<{
  actor: CombatVisualActor;
  weaponClass: CombatVisualWeaponClass;
  /** Point-light falloff radius in world units. */
  muzzleRadius: number;
  /** Billboard scale in world units, kept separate from light falloff. */
  muzzleSpriteScale: number;
  muzzleDurationMs: number;
  muzzleIntensityMin: number;
  muzzleIntensityMax: number;
  tracerWidth: number;
  tracerLifetimeMs: number;
}>;

export type CombatVisualSurfaceProfile = Readonly<{
  surface: SurfaceImpactKind;
  impactScale: number;
  impactLifetimeMs: number;
  /** Minimum normal length accepted before a decal orientation is attempted. */
  normalAlignmentEpsilon: number;
  /** Multiplier applied to the weapon's persistent-mark base size. */
  markSizeMultiplier: number;
}>;

const weaponProfile = (
  actor: CombatVisualActor,
  weaponClass: CombatVisualWeaponClass,
  muzzleRadius: number,
  muzzleSpriteScale: number,
  muzzleDurationMs: number,
  muzzleIntensityMax: number,
  tracerWidth: number,
  tracerLifetimeMs: number,
): CombatVisualWeaponProfile =>
  Object.freeze({
    actor,
    weaponClass,
    muzzleRadius,
    muzzleSpriteScale,
    muzzleDurationMs,
    muzzleIntensityMin: 0,
    muzzleIntensityMax,
    tracerWidth,
    tracerLifetimeMs,
  });

/**
 * Compact classic-style flashes.  Bot sprites are smaller because their
 * world models are viewed at range; the class distinction keeps shotguns and
 * sniper rifles readable without making every firearm produce the same bloom.
 */
export const COMBAT_VISUAL_WEAPON_PROFILES: Readonly<
  Record<
    CombatVisualActor,
    Readonly<Record<CombatVisualWeaponClass, CombatVisualWeaponProfile>>
  >
> = Object.freeze({
  player: Object.freeze({
    sidearm: weaponProfile('player', 'sidearm', 2.1, 0.13, 52, 4.5, 0.01, 50),
    smg: weaponProfile('player', 'smg', 2.3, 0.15, 54, 4.4, 0.012, 52),
    rifle: weaponProfile('player', 'rifle', 2.5, 0.17, 58, 4.8, 0.014, 56),
    shotgun: weaponProfile('player', 'shotgun', 3.1, 0.23, 68, 6.2, 0.018, 62),
    sniper: weaponProfile('player', 'sniper', 3.8, 0.22, 72, 6.4, 0.016, 66),
  }),
  bot: Object.freeze({
    sidearm: weaponProfile('bot', 'sidearm', 1.6, 0.11, 50, 4.2, 0.009, 48),
    smg: weaponProfile('bot', 'smg', 1.8, 0.12, 52, 4.1, 0.011, 50),
    rifle: weaponProfile('bot', 'rifle', 2.0, 0.13, 56, 4.4, 0.012, 54),
    shotgun: weaponProfile('bot', 'shotgun', 2.6, 0.17, 64, 5.8, 0.016, 60),
    sniper: weaponProfile('bot', 'sniper', 3.2, 0.17, 70, 6.2, 0.014, 64),
  }),
});

export const COMBAT_VISUAL_WEAPON_CLASS_BY_FIREARM: Readonly<
  Record<FirearmKind, CombatVisualWeaponClass>
> = Object.freeze({
  glock18: 'sidearm',
  usp: 'sidearm',
  p228: 'sidearm',
  deagle: 'sidearm',
  elite: 'sidearm',
  fiveseven: 'sidearm',
  smg: 'smg',
  rifle: 'rifle',
  carbine: 'rifle',
  shotgun: 'shotgun',
  sniper: 'sniper',
});

/** One shared epsilon prevents unstable decal alignment for near-zero normals. */
export const COMBAT_VISUAL_NORMAL_ALIGNMENT_EPSILON = 1e-5;

const surfaceProfile = (
  surface: SurfaceImpactKind,
  impactScale: number,
  impactLifetimeMs: number,
  markSizeMultiplier: number,
): CombatVisualSurfaceProfile =>
  Object.freeze({
    surface,
    impactScale,
    impactLifetimeMs,
    normalAlignmentEpsilon: COMBAT_VISUAL_NORMAL_ALIGNMENT_EPSILON,
    markSizeMultiplier,
  });

/** Impact sprites and persistent decals share one bounded surface vocabulary. */
export const COMBAT_VISUAL_SURFACE_PROFILES: Readonly<
  Record<SurfaceImpactKind, CombatVisualSurfaceProfile>
> = Object.freeze({
  sand: surfaceProfile('sand', 0.2, 300, 0),
  plaster: surfaceProfile('plaster', 0.22, 320, 1),
  wood: surfaceProfile('wood', 0.19, 300, 1.04),
  metal: surfaceProfile('metal', 0.14, 220, 0.82),
});

/** Base decal sizes by firearm, smaller than the old broad billboard marks. */
export const COMBAT_VISUAL_MARK_BASE_SIZES: Readonly<
  Record<FirearmKind, number>
> = Object.freeze({
  glock18: 0.046,
  usp: 0.045,
  p228: 0.048,
  deagle: 0.053,
  elite: 0.047,
  fiveseven: 0.046,
  smg: 0.052,
  rifle: 0.058,
  carbine: 0.055,
  shotgun: 0.065,
  sniper: 0.07,
});

export function getCombatVisualWeaponClass(
  firearm: FirearmKind,
): CombatVisualWeaponClass {
  return COMBAT_VISUAL_WEAPON_CLASS_BY_FIREARM[firearm];
}

export function getCombatVisualWeaponProfile(
  actor: CombatVisualActor,
  firearm: FirearmKind,
): CombatVisualWeaponProfile {
  return COMBAT_VISUAL_WEAPON_PROFILES[actor][
    getCombatVisualWeaponClass(firearm)
  ];
}

export function getCombatVisualSurfaceProfile(
  surface: SurfaceImpactKind,
): CombatVisualSurfaceProfile {
  return COMBAT_VISUAL_SURFACE_PROFILES[surface];
}

/** Returns null for sand because loose ground does not retain bullet marks. */
export function getCombatVisualMarkSize(
  firearm: FirearmKind,
  surface: SurfaceImpactKind,
): number | null {
  const multiplier = getCombatVisualSurfaceProfile(surface).markSizeMultiplier;
  return multiplier > 0
    ? COMBAT_VISUAL_MARK_BASE_SIZES[firearm] * multiplier
    : null;
}
