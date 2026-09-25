import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertFirearmRuntimeObservation } from '../scripts/firearm-runtime-observation.mjs';
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
      damageInputBefore: { ...beforeTarget },
      damageResolved: { ...beforeTarget, health: 20 },
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
