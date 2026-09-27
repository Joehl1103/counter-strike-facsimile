import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertFirearmRuntimeObservation,
  assertFirearmRuntimeDamageVerdictSupported,
  assertFirearmEarlyEquipRejection,
} from '../scripts/firearm-runtime-observation.mjs';
import {
  FIREARM_RUNTIME_FIXTURE_SEED,
  FIREARM_RUNTIME_FIXTURES,
  getFirearmRuntimeFixture,
} from '../app/firearm-runtime-fixture.ts';

void test('the firearm runtime fixture is loopback-only, finite, and covers every firearm', () => {
  assert.equal(FIREARM_RUNTIME_FIXTURE_SEED, 1947);
  const weapons = new Set(FIREARM_RUNTIME_FIXTURES.map((fixture) => fixture.weapon));
  assert.deepEqual([...weapons].sort(), [
    'carbine', 'deagle', 'elite', 'fiveseven', 'glock18', 'p228', 'rifle',
    'shotgun', 'smg', 'sniper', 'usp',
  ]);
  assert.equal(
    getFirearmRuntimeFixture('?firearm-runtime-fixture=1&case=glock18-12-5-torso', 'localhost')?.weapon,
    'glock18',
  );
  assert.equal(getFirearmRuntimeFixture('', 'localhost'), null);
  assert.throws(
    () => getFirearmRuntimeFixture('?firearm-runtime-fixture=1', 'localhost'),
    /requires a named case/,
  );
  assert.throws(
    () => getFirearmRuntimeFixture('?firearm-runtime-fixture=1&case=nope', 'localhost'),
    /unknown JKH-131 firearm fixture case/,
  );
  assert.throws(
    () => getFirearmRuntimeFixture('?firearm-runtime-fixture=1&case=glock18-12-5-torso', 'example.com'),
    /localhost-only/,
  );
});

void test('the page observes ordinary actions and keeps the receipt outside visual tools', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const verifier = readFileSync(
    new URL('../scripts/verify-jkh-131-firearm-runtime.mjs', import.meta.url),
    'utf8',
  );
  assert.match(page, /getFirearmRuntimeFixture\(/);
  assert.match(page, /id="jkh-131-firearm-runtime-receipt"/);
  assert.match(page, /recordFirearmRuntimeEvent\(action, 'queued'\)/);
  assert.match(page, /caller: 'shoot'/);
  assert.match(page, /tracePenetratingBullet\(firearmKind/);
  assert.match(page, /resolveBulletDamage\(before, firearmKind!/);
  assert.match(page, /seedObserved: firearmRuntimeSeed/);
  assert.match(page, /applyFirearmRuntimeFixture\(\)/);
  assert.match(page, /enemy === firearmRuntimeFixtureTarget/);
  assert.match(page, /syncBotRigToAuthority\(target\)/);
  assert.match(page, /syncBotRigToAuthority\(enemy\)/);
  assert.match(page, /visualAlignment/);
  assert.match(verifier, /function assertFixtureTargetVisualAlignment/);
  assert.match(verifier, /alignment\.distance <= 0\.001/);
  assert.match(verifier, /alignment\.yawDelta <= 0\.001/);
  assert.match(page, /damageAggregation:/);
  assert.match(page, /shotBasis: firearmRuntimeShotBasis/);
  assert.match(page, /firearmRuntimeFixture \? \[\] : null/);
});

void test('runtime damage acceptance fails closed on unsupported numeric verdicts', () => {
  assert.doesNotThrow(() => assertFirearmRuntimeDamageVerdictSupported({
    damageVerdict: 'verified-direct-unarmored',
  }));
  assert.doesNotThrow(() => assertFirearmRuntimeDamageVerdictSupported({
    damageVerdict: 'not-applicable-blocked',
  }));
  assert.throws(
    () => assertFirearmRuntimeDamageVerdictSupported({
      damageVerdict: 'unsupported-armored-resolution',
    }),
    /numeric damage verification is unsupported.*unsupported-armored-resolution/,
  );
  assert.throws(
    () => assertFirearmRuntimeDamageVerdictSupported({
      damageVerdict: 'unsupported-wall-attenuation',
    }),
    /numeric damage verification is unsupported.*unsupported-wall-attenuation/,
  );
  assert.throws(
    () => assertFirearmRuntimeDamageVerdictSupported({}),
    /numeric damage verification is unsupported.*missing/,
  );
});

void test('multi-wall fixtures cover the one-exit and two-exit weapon limits', () => {
  for (const weapon of ['rifle', 'carbine', 'deagle', 'sniper']) {
    const twoWalls = getFirearmRuntimeFixture(`?firearm-runtime-fixture=1&case=${weapon}-wood-2-walls`, 'localhost');
    assert.equal(twoWalls?.wallCount, 2);
    assert.equal(twoWalls?.material, 'wood');
  }
  const threeWalls = getFirearmRuntimeFixture('?firearm-runtime-fixture=1&case=sniper-wood-3-walls', 'localhost');
  assert.equal(threeWalls?.wallCount, 3);
});

// Minimal representative receipts isolate the prior false positive without a browser.
const beforeTarget = { id: 't:0', health: 100, armor: 0, helmet: false };
const directFixture = { weapon: 'sniper', material: 'direct', wallCount: 0, hitGroup: 'torso' };
function shotWithHitGroup(hitGroup: string) {
  const rawDamage = hitGroup === 'torso' ? 113 : 84.75;
  const health = Math.max(0, beforeTarget.health - rawDamage);
  return {
    target: { ...beforeTarget, health },
    details: { rays: [{
      pellet: 0, targetId: 't:0', traceResult: 'target', rawDamage,
      targetDistance: 12.248428140951821,
      hitGroup, exits: 0,
      damageInputBefore: { health: 100, armor: 0, helmet: false },
      damageResolved: {
        health, armor: 0, helmet: false, armorDamage: 0,
        healthDamage: beforeTarget.health - health,
      },
    }] },
  };
}

void test('a positive AWP leg hit fails a requested torso case', () => {
  assert.throws(
    () => assertFirearmRuntimeObservation(directFixture, beforeTarget, shotWithHitGroup('leg')),
    /requested torso was not observed/,
  );
  assert.deepEqual(
    assertFirearmRuntimeObservation(directFixture, beforeTarget, shotWithHitGroup('torso')),
    {
      outcome: 'target', observedHitGroups: ['torso'], wallsObserved: 0,
      damageVerdict: 'verified-direct-unarmored',
    },
  );
});

void test('ray damage without an applied live target change fails', () => {
  const shot = shotWithHitGroup('torso');
  shot.target.health = 100;
  assert.throws(
    () => assertFirearmRuntimeObservation(directFixture, beforeTarget, shot),
    /live target health did not decrease/,
  );
});

void test('blocked multi-wall controls require each named collision and unchanged target state', () => {
  const fixture = { weapon: 'rifle', material: 'wood', wallCount: 2, hitGroup: 'torso' };
  const walls = [1, 2].map((wallNumber) => ({
    pellet: 0, collider: `jkh-131-wood-slab-${wallNumber}`,
    traceResult: 'rejected', worldDistance: wallNumber * 3, exitDistance: wallNumber * 3 + 0.2,
  }));
  const shot = { target: { ...beforeTarget }, details: { rays: walls } };
  assert.equal(assertFirearmRuntimeObservation(fixture, beforeTarget, shot).outcome, 'blocked');
  shot.details.rays = walls.slice(0, 1);
  assert.throws(() => assertFirearmRuntimeObservation(fixture, beforeTarget, shot), /missing required wall/);
  shot.details.rays = [walls[0], walls[0]];
  assert.throws(() => assertFirearmRuntimeObservation(fixture, beforeTarget, shot), /unexpected or reused collider/);
});


void test('retained direct rifle, M3, and scoped AWP receipts match frozen numeric expectations', () => {
  const rifleBefore = { id: 'enemy:0', health: 100, armor: 0, helmet: false };
  const rifleShot = {
    target: { ...rifleBefore, health: 65 },
    details: { rays: [{
      pellet: 0, targetId: 'enemy:0', traceResult: 'target',
      targetDistance: 12.257244933083394, hitGroup: 'torso', rawDamage: 35, exits: 0,
      damageInputBefore: { health: 100, armor: 0, helmet: false },
      damageResolved: { health: 65, armor: 0, helmet: false, armorDamage: 0, healthDamage: 35 },
    }] },
  };
  const rifleFixture = { weapon: 'rifle', material: 'direct', wallCount: 0, hitGroup: 'torso', armor: 'none' };

  const shotgunBefore = { id: 'enemy:0', health: 100, armor: 0, helmet: false };
  const shotgunRays = ([
    [0, 12.442361608615053, 'leg', 12, 100, 88],
    [1, 12.24087758061833, 'torso', 16, 88, 72],
    [2, 12.456631465711952, 'torso', 16, 72, 56],
    [6, 12.307857901846567, 'torso', 16, 56, 40],
    [8, 12.348230468351598, 'torso', 16, 40, 24],
  ] as const).map(([pellet, targetDistance, hitGroup, rawDamage, healthBefore, healthAfter]) => ({
    pellet, targetId: 'enemy:0', traceResult: 'target',
    targetDistance, hitGroup, rawDamage, exits: 0,
    damageInputBefore: { health: healthBefore, armor: 0, helmet: false },
    damageResolved: {
      health: healthAfter, armor: 0, helmet: false, armorDamage: 0,
      healthDamage: healthBefore - healthAfter,
    },
  }));
  const shotgunFixture = {
    weapon: 'shotgun', material: 'direct', wallCount: 0,
    hitGroup: 'torso', armor: 'none',
  };
  const shotgunShot = {
    target: { ...shotgunBefore, health: 24 },
    details: { rays: shotgunRays },
  };

  const awpBefore = { id: 'enemy:0', health: 100, armor: 0, helmet: false };
  const awpShot = {
    target: { ...awpBefore, health: 0 },
    details: { shotBasis: { pose: { silenced: false } }, rays: [{
      pellet: 0, targetId: 'enemy:0', traceResult: 'target',
      targetDistance: 12.248428140951821, hitGroup: 'torso', rawDamage: 113, exits: 0,
      damageInputBefore: { health: 100, armor: 0, helmet: false },
      damageResolved: { health: 0, armor: 0, helmet: false, armorDamage: 0, healthDamage: 100 },
    }] },
  };
  const awpFixture = { weapon: 'sniper', material: 'direct', wallCount: 0, hitGroup: 'torso', armor: 'none' };

  // These compact projections are from the retained fired JSON receipts:
  // outputs/jkh-131-resume-2026-09-27/evidence/runtime-single/rifle-12-5-torso-fired.json
  // outputs/jkh-131-resume-2026-09-27/new/evidence/runtime-two/{shotgun,sniper}-12-5-torso-fired.json
  assert.equal(assertFirearmRuntimeObservation(rifleFixture, rifleBefore, rifleShot).damageVerdict,
    'verified-direct-unarmored');
  assert.equal(assertFirearmRuntimeObservation(shotgunFixture, shotgunBefore, shotgunShot).damageVerdict,
    'verified-direct-unarmored');
  assert.equal(assertFirearmRuntimeObservation(awpFixture, awpBefore, awpShot).damageVerdict,
    'verified-direct-unarmored');

  const wrongRawDamage = structuredClone(rifleShot);
  wrongRawDamage.details.rays[0].rawDamage = 36;
  wrongRawDamage.details.rays[0].damageResolved = {
    health: 64, armor: 0, helmet: false, armorDamage: 0, healthDamage: 36,
  };
  wrongRawDamage.target.health = 64;
  assert.throws(
    () => assertFirearmRuntimeObservation(rifleFixture, rifleBefore, wrongRawDamage),
    /raw damage disagrees with frozen direct formula/,
  );

  const wrongHealth = structuredClone(rifleShot);
  wrongHealth.details.rays[0].damageResolved.health = 66;
  wrongHealth.details.rays[0].damageResolved.healthDamage = 34;
  wrongHealth.target.health = 66;
  assert.throws(
    () => assertFirearmRuntimeObservation(rifleFixture, rifleBefore, wrongHealth),
    /applied damage disagrees with frozen unarmored direct result/,
  );

  const wrongArmor = structuredClone(rifleShot);
  wrongArmor.details.rays[0].damageResolved.armor = 1;
  wrongArmor.details.rays[0].damageResolved.armorDamage = -1;
  wrongArmor.target.armor = 1;
  assert.throws(
    () => assertFirearmRuntimeObservation(rifleFixture, rifleBefore, wrongArmor),
    /applied damage disagrees with frozen unarmored direct result/,
  );
});

void test('a lethal sequential M3 pellet chain matches each pellet distance and raw result', () => {
  const targetBefore = { id: 't:0', health: 20, armor: 0, helmet: false };
  const fixture = { ...directFixture, weapon: 'shotgun' };
  const shot = {
    target: { ...targetBefore, health: 0 },
    details: { rays: [
      {
        pellet: 0, targetId: 't:0', traceResult: 'target', targetDistance: 12.24,
        hitGroup: 'torso', rawDamage: 16, exits: 0,
        damageInputBefore: { health: 20, armor: 0, helmet: false },
        damageResolved: { health: 4, armor: 0, helmet: false, armorDamage: 0, healthDamage: 16 },
      },
      {
        pellet: 1, targetId: 't:0', traceResult: 'target', targetDistance: 12.24,
        hitGroup: 'torso', rawDamage: 16, exits: 0,
        damageInputBefore: { health: 4, armor: 0, helmet: false },
        damageResolved: { health: 0, armor: 0, helmet: false, armorDamage: 0, healthDamage: 4 },
      },
    ] },
  };
  assert.deepEqual(
    assertFirearmRuntimeObservation(fixture, targetBefore, shot).observedHitGroups,
    ['torso', 'torso'],
  );
  shot.details.rays[1].damageInputBefore.health = 20;
  assert.throws(() => assertFirearmRuntimeObservation(fixture, targetBefore, shot), /pellet damage chain/);
});

void test('a trace that exits the blocking wall and subsequently misses is not wall rejection evidence', () => {
  const fixture = { weapon: 'rifle', material: 'wood', wallCount: 2, hitGroup: 'torso' };
  const rays = [1, 2].map((wallNumber) => ({
    pellet: 0, collider: `jkh-131-wood-slab-${wallNumber}`,
    traceResult: 'rejected', worldDistance: wallNumber * 3, exitDistance: wallNumber * 3 + 0.2,
  }));
  const shot = { target: { ...beforeTarget }, details: { rays: [...rays, { pellet: 0, result: 'no-hit' }] } };
  assert.throws(() => assertFirearmRuntimeObservation(fixture, beforeTarget, shot), /continued beyond its final wall/);
});


void test('early fire must be inside the equip lock and leave target and ballistic count unchanged', () => {
  const before = {
    event: { input: 'Digit1', outcome: 'committed', simulationNowMs: 5000 },
    player: { activeWeapon: 'rifle', equipReadyAtMs: 5520, ammo: { magazine: 30, reserve: 90 }, ballistic: { shots: 0 } },
    target: { ...beforeTarget },
  };
  const after = structuredClone(before);
  after.event = { input: 'KeyF', outcome: 'rejected', simulationNowMs: 5010 };
  assert.doesNotThrow(() => assertFirearmEarlyEquipRejection(before, after, 'rifle', 'Digit1'));
  after.event.simulationNowMs = 5520;
  assert.throws(() => assertFirearmEarlyEquipRejection(before, after, 'rifle', 'Digit1'), /missed the equip-lock window/);
  after.event.simulationNowMs = 5010;
  after.target.health = 90;
  assert.throws(() => assertFirearmEarlyEquipRejection(before, after, 'rifle', 'Digit1'), /changed target state/);
  after.target.health = 100;
  after.player.ballistic.shots = 1;
  assert.throws(() => assertFirearmEarlyEquipRejection(before, after, 'rifle', 'Digit1'), /changed ballistic shot count/);
});
