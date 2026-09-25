import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertFirearmRuntimeObservation, assertFirearmEarlyEquipRejection } from '../scripts/firearm-runtime-observation.mjs';
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
  assert.match(page, /getFirearmRuntimeFixture\(/);
  assert.match(page, /id="jkh-131-firearm-runtime-receipt"/);
  assert.match(page, /recordFirearmRuntimeEvent\(action, 'queued'\)/);
  assert.match(page, /caller: 'shoot'/);
  assert.match(page, /tracePenetratingBullet\(firearmKind/);
  assert.match(page, /resolveBulletDamage\(before, firearmKind!/);
  assert.match(page, /seedObserved: firearmRuntimeSeed/);
  assert.match(page, /applyFirearmRuntimeFixture\(\)/);
  assert.match(page, /enemy === firearmRuntimeFixtureTarget/);
  assert.match(page, /damageAggregation:/);
  assert.match(page, /shotBasis: firearmRuntimeShotBasis/);
  assert.match(page, /firearmRuntimeFixture \? \[\] : null/);
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
  return {
    target: { ...beforeTarget, health: 20 },
    details: { rays: [{
      pellet: 0, targetId: 't:0', traceResult: 'target', rawDamage: 80,
      hitGroup, exits: 0,
      damageInputBefore: { health: 100, armor: 0, helmet: false },
      damageResolved: { health: 20, armor: 0, helmet: false },
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
    { outcome: 'target', observedHitGroups: ['torso'], wallsObserved: 0 },
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


void test('lethal shotgun pellets remain a valid sequential damage aggregate', () => {
  const fixture = { ...directFixture, weapon: 'shotgun' };
  const shot = shotWithHitGroup('torso');
  shot.target.health = 0;
  shot.details.rays[0].damageResolved.health = 0;
  shot.details.rays.push({
    ...shot.details.rays[0], pellet: 1, hitGroup: 'leg',
    damageInputBefore: { health: 0, armor: 0, helmet: false },
    damageResolved: { health: 0, armor: 0, helmet: false },
  });
  assert.deepEqual(
    assertFirearmRuntimeObservation(fixture, beforeTarget, shot).observedHitGroups,
    ['torso', 'leg'],
  );
  shot.details.rays[1].damageInputBefore.health = 100;
  assert.throws(() => assertFirearmRuntimeObservation(fixture, beforeTarget, shot), /pellet damage chain/);
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
