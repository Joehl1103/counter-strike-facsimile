import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBotShotState, getBotAimCone, getShotDirection, intersectPlayerShot, nearestShotImpact } from '../app/bot-shot-resolution.ts';
import { FIREARMS, type FirearmKind } from '../app/game-rules.ts';

const pose = { grounded: true, crouching: false, speed: 0, scoped: false, silenced: false, burst: false };
const feet = { x: 0, y: 0, z: -10 };

void test('same seed and tick inputs reproduce every ray, reset restores first shot', () => {
  const a = createBotShotState(16001), b = createBotShotState(16001), c = createBotShotState(17001);
  const first = a.shot('rifle', 1000, pose, 0, 0, 0.025);
  assert.deepEqual(first, b.shot('rifle', 1000, pose, 0, 0, 0.025));
  assert.notDeepEqual(first, c.shot('rifle', 1000, pose, 0, 0, 0.025));
  for (let n = 1; n <= 15; n++) {
    a.advance('rifle', 1000 + n * 100, 0.1, true);
    b.advance('rifle', 1000 + n * 100, 0.1, true);
    assert.deepEqual(a.shot('rifle', 1000 + n * 100, pose, 0.1, -0.01, 0.025),
      b.shot('rifle', 1000 + n * 100, pose, 0.1, -0.01, 0.025));
  }
  a.reset();
  assert.deepEqual(a.shot('rifle', 1000, pose, 0, 0, 0.025), first);
});

void test('every firearm produces its exact pellet count and normalized finite directions', () => {
  for (const weapon of Object.keys(FIREARMS) as FirearmKind[]) {
    const rays = createBotShotState(3).shot(weapon, 0, pose, 0.4, -0.1, 0.02);
    assert.equal(rays.length, FIREARMS[weapon].pellets);
    for (const ray of rays) {
      assert.ok(Object.values(ray).every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(ray.x, ray.y, ray.z) - 1) < 1e-12);
    }
  }
});

void test('authoritative yaw and recoil change real ray direction', () => {
  assert.deepEqual(getShotDirection(0, 0), { x: 0, y: 0, z: -1 });
  assert.ok(getShotDirection(Math.PI / 2, 0).x < -0.999);
  assert.equal(intersectPlayerShot({ x: 0, y: 1.1, z: 0 }, getShotDirection(0.5, 0), feet, 1.8), null);
  const a = createBotShotState(11);
  const initial = a.shot('rifle', 0, pose, 0, 0, 0)[0];
  const following = a.shot('rifle', 100, pose, 0, 0, 0)[0];
  assert.ok(following.y > initial.y);
  assert.ok(intersectPlayerShot({ x: 0, y: 1.1, z: 0 }, getShotDirection(0, 0), feet, 1.8));
});

void test('standing and crouched human proxies classify actual head, torso, stomach and leg hits', () => {
  for (const height of [1.8, 1.2]) {
    for (const [ratio, expected] of [[0.9, 'head'], [0.7, 'torso'], [0.45, 'stomach'], [0.2, 'leg']] as const) {
      const hit = intersectPlayerShot({ x: 0, y: height * ratio, z: 0 }, getShotDirection(0, 0), feet, height);
      assert.equal(hit?.hitGroup, expected);
      assert.ok(hit!.distance > 9.6 && hit!.distance < 10);
    }
  }
  assert.equal(intersectPlayerShot({ x: 0, y: 1.65, z: 0 }, getShotDirection(0, 0), feet, 1.2), null);
  assert.equal(intersectPlayerShot({ x: 0.31, y: 1.1, z: 0 }, getShotDirection(0, 0), feet, 1.8), null);
  assert.equal(intersectPlayerShot({ x: 0, y: 2, z: 0 }, getShotDirection(0, 0), feet, 1.8), null);
});

void test('vertical, translated and invalid proxy rays remain well-defined', () => {
  const down = intersectPlayerShot({ x: 0, y: 4, z: -10 }, { x: 0, y: -1, z: 0 }, feet, 1.8);
  assert.equal(down?.hitGroup, 'head');
  assert.ok(Math.abs(down!.distance - 2.2) < 1e-12);
  const original = intersectPlayerShot({ x: 0, y: 1.1, z: 0 }, getShotDirection(0, 0), feet, 1.8);
  const translated = intersectPlayerShot({ x: 12, y: 5.1, z: 6 }, getShotDirection(0, 0), { x: 12, y: 4, z: -4 }, 1.8);
  assert.deepEqual(original, translated);
  assert.equal(intersectPlayerShot({ x: NaN, y: 1, z: 0 }, getShotDirection(0, 0), feet, 1.8), null);
  assert.equal(intersectPlayerShot({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 0 }, feet, 1.8), null);
});

void test('nearest world blocks including ties, nearer characters block farther opponents', () => {
  const enemy = { distance: 10, hitGroup: 'torso' as const, target: 'enemy' };
  const friendly = { distance: 6, hitGroup: 'torso' as const, target: 'friendly' };
  assert.deepEqual(nearestShotImpact(10, [enemy], 100), { kind: 'world', distance: 10 });
  assert.deepEqual(nearestShotImpact(5, [enemy, friendly], 100), { kind: 'world', distance: 5 });
  assert.deepEqual(nearestShotImpact(null, [enemy, friendly], 100), { kind: 'target', ...friendly });
  assert.deepEqual(nearestShotImpact(null, [enemy], 9), { kind: 'miss', distance: 9 });
  assert.deepEqual(nearestShotImpact(Infinity, [], 100), { kind: 'miss', distance: 100 });
});

void test('difficulty, lower aim skill and suppression widen a shared actor-neutral cone', () => {
  assert.equal(getBotAimCone('recruit', 1, 0), 0.055);
  assert.equal(getBotAimCone('standard', 1, 0), 0.025);
  assert.equal(getBotAimCone('veteran', 1, 0), 0.01);
  assert.ok(getBotAimCone('standard', 0.5, 0) > getBotAimCone('standard', 1, 0));
  assert.ok(getBotAimCone('standard', 1, 1) > getBotAimCone('standard', 1, 0));
  assert.ok(Number.isFinite(getBotAimCone('standard', NaN, Infinity)));
});

void test('page commits geometric shots for both squads and settles physical hits once', () => {
  const page = readFileSync(process.env.CS16_BOT_SHOT_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /commitBotShot\(enemy, targetPosition, enemySpeed\)/);
  assert.match(page, /commitBotShot\(ally, targetPosition, allySpeed\)/);
  const adapter = page.slice(page.indexOf('const commitBotShot ='), page.indexOf('const tryInsertGrenadeProjectile ='));
  assert.match(adapter, /bot.shots.shot\(bot.primaryWeapon/);
  assert.match(adapter, /bot.aimYaw, pitch, getBotAimCone/);
  assert.match(adapter, /nearestShotImpact\(world\?\.distance \?\? null, characters, far\)/);
  assert.match(adapter, /\(victim\?\.side \?\? matchState.playerSide\) === bot.side\) continue/);
  assert.match(adapter, /resolveBulletDamage\(before, bot.primaryWeapon, hitGroup, result.damage\)/);
  assert.match(adapter, /eliminateBotWithCredit\(victim, bot, false\)/);
  assert.match(adapter, /beginSpectating\(bot, bot.primaryWeapon, false\)/);
  assert.equal((adapter.match(/resolveTeamElimination\(\)/g) ?? []).length, 1);
  assert.equal((page.match(/\.shots.reset\(\)/g) ?? []).length, 2);
  assert.equal((page.match(/\.shots.advance\(/g) ?? []).length, 2);
  assert.equal((page.match(/bot.shots.resetWeapon\(bot.primaryWeapon\)/g) ?? []).length, 2);
  assert.doesNotMatch(page, /Math.random\(\) < hitChance|getEnemyHitChance|getEnemyPlayerHitGroup|scaleEnemyPlayerHitChance/);
  const tracer = page.slice(page.indexOf('const showEnemyTracer ='), page.indexOf('const showEnemyTracer =') + 1500);
  assert.doesNotMatch(tracer, /Math.random/);
});
