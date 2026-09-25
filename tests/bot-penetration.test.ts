import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { intersectPlayerShot, nearestShotImpact } from '../app/bot-shot-resolution.ts';
import { tracePenetratingBullet, type BulletTraceHit, type PenetrationMaterial } from '../app/weapon-penetration.ts';
import { resolveBulletDamage } from '../app/combat-damage.ts';
import { applyArmorDamage, type FirearmKind } from '../app/game-rules.ts';

const origin = { x: 0, y: 1.1, z: 0 }, direction = { x: 0, y: 0, z: -1 }, feet = { x: 0, y: 0, z: -5 };

void test('analytical character hits choose a valid root inside each absolute interval', () => {
  const target = { x: 0, y: 0, z: -10 };
  const first = intersectPlayerShot(origin, direction, target, 1.8)!;
  assert.ok(Math.abs(first.distance - 9.7) < 1e-9);
  const exit = intersectPlayerShot(origin, direction, target, 1.8, 10, 10.4)!;
  assert.ok(Math.abs(exit.distance - 10.3) < 1e-9);
  assert.equal(exit.hitGroup, 'torso');
  assert.equal(intersectPlayerShot(origin, direction, target, 1.8, 10.31, 20), null);
  assert.equal(intersectPlayerShot(origin, direction, target, 1.8, 0, 9.69), null);
  for (const near of [-1, NaN, Infinity]) assert.equal(intersectPlayerShot(origin, direction, target, 1.8, near, 20), null);
  assert.equal(intersectPlayerShot(origin, direction, target, 1.8, 10, 9), null);
  for (const height of [1.8, 1.2]) {
    const head = intersectPlayerShot({ ...origin, y: height * 0.9 }, direction, target, height, 10, 11)!;
    assert.equal(head.hitGroup, 'head');
    assert.ok(Math.abs(head.distance - (10 + height * 0.1)) < 1e-9);
  }
});

function fireAtProxy(weapon: FirearmKind, thickness: number, material: PenetrationMaterial = 'wood') {
  const wall = {};
  const intervals: number[][] = [];
  const result = tracePenetratingBullet(weapon, false, (near, far): BulletTraceHit<string> | null => {
    intervals.push([near, far]);
    const human = intersectPlayerShot(origin, direction, feet, 1.8, near, far);
    const hit = nearestShotImpact(near <= 2 && far >= 2 ? 2 : null,
      human ? [{ ...human, target: 'opponent' }] : [], far);
    if (hit.kind === 'world') return { kind: 'world', distance: 2, exitDistance: 2 + thickness, material, collider: wall };
    return hit.kind === 'target' ? { kind: 'target', distance: hit.distance, hitGroup: hit.hitGroup, target: hit.target } : null;
  });
  return { result, intervals };
}

void test('shared penetration reaches the analytical player through thin wood with bounded absolute intervals', () => {
  for (const weapon of ['rifle', 'carbine', 'deagle', 'sniper'] as const) {
    const { result, intervals } = fireAtProxy(weapon, 0.1);
    assert.equal(result?.target, 'opponent');
    assert.equal(result?.exits, 1);
    assert.ok(result!.damage > 0);
    assert.equal(intervals[0][0], 0);
    assert.ok(Math.abs(intervals[1][0] - 2.125) < 1e-9);
  }
  for (const weapon of ['usp', 'glock18', 'smg', 'shotgun'] as const)
    assert.equal(fireAtProxy(weapon, 0.1).result, null);
});

void test('bot proxy trace preserves thick cover and metal limits without recomputing damage', () => {
  assert.equal(fireAtProxy('rifle', 1).result, null);
  assert.equal(fireAtProxy('rifle', 0.13, 'metal').result, null);
  const wood = fireAtProxy('rifle', 0.1).result!;
  const metal = fireAtProxy('rifle', 0.1, 'metal').result!;
  assert.equal(wood.damage, 20);
  assert.equal(metal.damage, 6);
  const target = { health: 100, armor: 100, helmet: true };
  for (const rawDamage of [wood.damage, metal.damage]) {
    const actual = resolveBulletDamage(target, 'rifle', 'torso', rawDamage);
    const expected = applyArmorDamage({ ...target, rawDamage, weapon: 'rifle', hitGroup: 'torso', source: 'bullet' });
    assert.equal(actual.health, expected.health);
    assert.equal(actual.armor, expected.armor);
    assert.equal(actual.healthDamage, target.health - expected.health);
  }
});

void test('a nearer friendly body terminates the material trace before a farther opponent', () => {
  const result = tracePenetratingBullet('sniper', false, (near, far) => {
    const hit = nearestShotImpact(null, [
      { target: 'friendly', distance: 3, hitGroup: 'torso' as const },
      { target: 'opponent', distance: 5, hitGroup: 'head' as const },
    ].filter(hit => hit.distance >= near), far);
    return hit.kind === 'target' ? { kind: 'target' as const, distance: hit.distance, hitGroup: hit.hitGroup, target: hit.target } : null;
  });
  assert.equal(result?.target, 'friendly');
  assert.equal(result?.exits, 0);
});

void test('page routes bot pellets through shared material damage and restores every pellet interval', () => {
  const page = readFileSync(process.env.CS16_BOT_PENETRATION_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  const bot = page.slice(page.indexOf('const commitBotShot ='), page.indexOf('const tryInsertGrenadeProjectile ='));
  assert.match(bot, /tracePenetratingBullet\(bot.primaryWeapon, silenced, \(near, far\)/);
  assert.match(bot, /shotRay.near = near; shotRay.far = far/);
  assert.match(bot, /PLAYER_HULL.standingHeight, near, far/);
  assert.match(bot, /getAxisAlignedBoxExitDistance\(shotRay.ray.origin, shotRay.ray.direction, box.min, box.max\)/);
  assert.match(bot, /getPenetrationMaterial\(getSurfaceImpactKind\(world.object\)\)/);
  assert.match(bot, /finally \{\s*shotRay.near = savedNear; shotRay.far = savedFar;/);
  assert.match(bot, /if \(pellet === 0 && firstSegment\)/);
  assert.match(bot, /if \(\(victim\?\.side \?\? matchState.playerSide\) === bot.side\) continue/);
  assert.match(bot, /resolveBulletDamage\(before, bot.primaryWeapon, hitGroup, result.damage\)/);
  assert.match(page, /resolveBulletDamage\(before, firearmKind!, hitGroup, bulletDamage \?\? 0\)/);
  assert.doesNotMatch(bot, /resolveBulletPellets|getFirearmDamage|rawDamage.*\*/);
});
