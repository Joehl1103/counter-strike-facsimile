import assert from 'node:assert/strict';
import test from 'node:test';
import type { FirearmKind } from '../app/game-rules.ts';
import {
  COMBAT_VISUAL_MARK_BASE_SIZES,
  COMBAT_VISUAL_NORMAL_ALIGNMENT_EPSILON,
  COMBAT_VISUAL_SURFACE_PROFILES,
  COMBAT_VISUAL_WEAPON_CLASS_BY_FIREARM,
  COMBAT_VISUAL_WEAPON_PROFILES,
  getCombatVisualMarkSize,
  getCombatVisualSurfaceProfile,
  getCombatVisualWeaponClass,
  getCombatVisualWeaponProfile,
  type CombatVisualActor,
  type CombatVisualWeaponClass,
} from '../app/combat-visual-effects.ts';

const firearms = Object.keys(
  COMBAT_VISUAL_WEAPON_CLASS_BY_FIREARM,
) as FirearmKind[];
const actors: CombatVisualActor[] = ['player', 'bot'];
const classes: CombatVisualWeaponClass[] = [
  'sidearm',
  'smg',
  'rifle',
  'shotgun',
  'sniper',
];

void test('weapon effect profiles are finite, frozen, and bounded', () => {
  assert.ok(Object.isFrozen(COMBAT_VISUAL_WEAPON_PROFILES));
  actors.forEach((actor) => {
    assert.ok(Object.isFrozen(COMBAT_VISUAL_WEAPON_PROFILES[actor]));
    classes.forEach((weaponClass) => {
      const profile = COMBAT_VISUAL_WEAPON_PROFILES[actor][weaponClass];
      assert.ok(Object.isFrozen(profile));
      assert.ok(
        [
          profile.muzzleRadius,
          profile.muzzleSpriteScale,
          profile.muzzleDurationMs,
          profile.muzzleIntensityMin,
          profile.muzzleIntensityMax,
          profile.tracerWidth,
          profile.tracerLifetimeMs,
        ].every(Number.isFinite),
      );
      assert.ok(profile.muzzleRadius > 0 && profile.muzzleRadius <= 4);
      assert.ok(
        profile.muzzleSpriteScale >= 0.1 && profile.muzzleSpriteScale <= 0.24,
      );
      assert.ok(
        profile.muzzleDurationMs >= 48 && profile.muzzleDurationMs <= 75,
      );
      assert.equal(profile.muzzleIntensityMin, 0);
      assert.ok(
        profile.muzzleIntensityMax >= 4 && profile.muzzleIntensityMax <= 6.4,
      );
      assert.ok(profile.tracerWidth > 0 && profile.tracerWidth <= 0.02);
      assert.ok(
        profile.tracerLifetimeMs >= 48 && profile.tracerLifetimeMs <= 68,
      );
    });
  });
  assert.ok(
    COMBAT_VISUAL_WEAPON_PROFILES.player.sidearm.muzzleSpriteScale <
      COMBAT_VISUAL_WEAPON_PROFILES.player.shotgun.muzzleSpriteScale,
  );
  assert.ok(
    COMBAT_VISUAL_WEAPON_PROFILES.player.sidearm.tracerWidth <
      COMBAT_VISUAL_WEAPON_PROFILES.player.rifle.tracerWidth,
  );
});

void test('firearm lookup preserves sidearm and long-gun distinctions', () => {
  assert.equal(getCombatVisualWeaponClass('glock18'), 'sidearm');
  assert.equal(getCombatVisualWeaponClass('deagle'), 'sidearm');
  assert.equal(getCombatVisualWeaponClass('smg'), 'smg');
  assert.equal(getCombatVisualWeaponClass('rifle'), 'rifle');
  assert.equal(getCombatVisualWeaponClass('carbine'), 'rifle');
  assert.equal(getCombatVisualWeaponClass('shotgun'), 'shotgun');
  assert.equal(getCombatVisualWeaponClass('sniper'), 'sniper');
  assert.equal(
    getCombatVisualWeaponProfile('player', 'usp'),
    COMBAT_VISUAL_WEAPON_PROFILES.player.sidearm,
  );
  assert.equal(
    getCombatVisualWeaponProfile('bot', 'rifle'),
    COMBAT_VISUAL_WEAPON_PROFILES.bot.rifle,
  );
});

void test('surface impact profiles and alignment epsilon stay finite and compact', () => {
  assert.ok(Number.isFinite(COMBAT_VISUAL_NORMAL_ALIGNMENT_EPSILON));
  assert.equal(COMBAT_VISUAL_NORMAL_ALIGNMENT_EPSILON, 1e-5);
  assert.ok(Object.isFrozen(COMBAT_VISUAL_SURFACE_PROFILES));
  (
    Object.keys(COMBAT_VISUAL_SURFACE_PROFILES) as Array<
      keyof typeof COMBAT_VISUAL_SURFACE_PROFILES
    >
  ).forEach((surface) => {
    const profile = getCombatVisualSurfaceProfile(surface);
    assert.ok(Object.isFrozen(profile));
    assert.ok(
      [
        profile.impactScale,
        profile.impactLifetimeMs,
        profile.normalAlignmentEpsilon,
        profile.markSizeMultiplier,
      ].every(Number.isFinite),
    );
    assert.ok(profile.impactScale > 0 && profile.impactScale <= 0.24);
    assert.ok(
      profile.impactLifetimeMs >= 200 && profile.impactLifetimeMs <= 340,
    );
    assert.ok(profile.normalAlignmentEpsilon > 0);
    assert.ok(
      profile.markSizeMultiplier >= 0 && profile.markSizeMultiplier <= 1.1,
    );
  });
  assert.ok(
    COMBAT_VISUAL_SURFACE_PROFILES.metal.impactScale <
      COMBAT_VISUAL_SURFACE_PROFILES.plaster.impactScale,
  );
});

void test('mark sizes are finite, surface-aware, and do not persist on sand', () => {
  assert.ok(Object.isFrozen(COMBAT_VISUAL_MARK_BASE_SIZES));
  firearms.forEach((firearm) => {
    const base = COMBAT_VISUAL_MARK_BASE_SIZES[firearm];
    assert.ok(Number.isFinite(base));
    assert.ok(base >= 0.045 && base <= 0.07);
    assert.equal(getCombatVisualMarkSize(firearm, 'sand'), null);
    const plaster = getCombatVisualMarkSize(firearm, 'plaster');
    const wood = getCombatVisualMarkSize(firearm, 'wood');
    const metal = getCombatVisualMarkSize(firearm, 'metal');
    assert.equal(plaster, base);
    assert.equal(wood, base * 1.04);
    assert.equal(metal, base * 0.82);
    assert.ok([plaster, wood, metal].every((size) => Number.isFinite(size)));
  });
  assert.ok(
    getCombatVisualMarkSize('sniper', 'plaster')! >
      getCombatVisualMarkSize('glock18', 'plaster')!,
  );
});

void test('profile lookups are deterministic and return stable immutable records', () => {
  const first = {
    player: firearms.map((firearm) =>
      getCombatVisualWeaponProfile('player', firearm),
    ),
    bot: firearms.map((firearm) =>
      getCombatVisualWeaponProfile('bot', firearm),
    ),
    surfaces: Object.keys(COMBAT_VISUAL_SURFACE_PROFILES).map((surface) =>
      getCombatVisualSurfaceProfile(
        surface as keyof typeof COMBAT_VISUAL_SURFACE_PROFILES,
      ),
    ),
  };
  const second = {
    player: firearms.map((firearm) =>
      getCombatVisualWeaponProfile('player', firearm),
    ),
    bot: firearms.map((firearm) =>
      getCombatVisualWeaponProfile('bot', firearm),
    ),
    surfaces: Object.keys(COMBAT_VISUAL_SURFACE_PROFILES).map((surface) =>
      getCombatVisualSurfaceProfile(
        surface as keyof typeof COMBAT_VISUAL_SURFACE_PROFILES,
      ),
    ),
  };
  assert.deepEqual(first, second);
  assert.equal(first.player[0], second.player[0]);
  assert.equal(first.surfaces[0], second.surfaces[0]);
});
