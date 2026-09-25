import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  createWeaponBallistics,
  getClassicSpread,
  createSeededRandom,
  sampleClassicSpread,
  type BallisticPose,
} from '../app/weapon-ballistics.ts';
import { createSimulationClock } from '../app/simulation-clock.ts';
import { FIREARMS } from '../app/game-rules.ts';
const stand: BallisticPose = {
  grounded: true,
  crouching: false,
  speed: 0,
  scoped: false,
  silenced: false,
  burst: false,
};
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

void test('automatic source accuracy uses pre-shot value and bounded stateful punch', () => {
  const b = createWeaponBallistics();
  near(b.shot('rifle', 0, stand).spread, 0.0055);
  near(b.snapshot('rifle').accuracy, 0.355);
  near(b.snapshot('rifle').punch.pitch, 1);
  near(b.snapshot('rifle').punch.yaw, 0.375);
  near(b.shot('rifle', 100, stand).spread, 0.0097625);
  near(b.snapshot('rifle').punch.pitch, 2.35);
  for (let n = 2; n < 50; n++) b.shot('rifle', n * 100, stand);
  assert.equal(b.snapshot('rifle').accuracy, 1.25);
  assert.equal(b.snapshot('rifle').punch.pitch, 5.75);
  assert.ok(Math.abs(b.snapshot('rifle').punch.yaw) <= 1.75);
  b.reset();
  near(b.shot('carbine', 0, stand).spread, 0.004);
  b.reset();
  assert.equal(b.shot('smg', 0, stand).spread, 0);
});

void test('source movement branch precedence differs between AK/M4 and MP5', () => {
  const b = createWeaponBallistics();
  b.shot('rifle', 0, { ...stand, grounded: false, speed: 1 });
  assert.equal(b.snapshot('rifle').punch.pitch, 1.5);
  b.reset();
  b.shot('rifle', 0, { ...stand, grounded: false });
  assert.equal(b.snapshot('rifle').punch.pitch, 2);
  b.reset();
  b.shot('smg', 0, { ...stand, grounded: false, speed: 1 });
  assert.equal(b.snapshot('smg').punch.pitch, 0.9);
  near(getClassicSpread('rifle', 0.2, { ...stand, speed: 4 }), 0.054);
  near(getClassicSpread('carbine', 0.2, { ...stand, silenced: true }), 0.005);
});

void test('pistol delta-time accuracy, burst/silencer spread and sniper/shotgun families stay distinct', () => {
  const b = createWeaponBallistics();
  near(b.shot('usp', 0, stand).spread, 0.008);
  b.shot('usp', 150, stand);
  near(b.snapshot('usp').accuracy, 0.87875);
  near(b.spread('usp', stand), 0.012125);
  near(getClassicSpread('glock18', 0.9, { ...stand, burst: true }), 0.03);
  near(getClassicSpread('usp', 0.92, { ...stand, silenced: true }), 0.012);
  assert.equal(
    getClassicSpread('sniper', 1, { ...stand, scoped: true, crouching: true }),
    0,
  );
  assert.equal(
    getClassicSpread('sniper', 1, { ...stand, scoped: true, speed: 1 }),
    0.1,
  );
  near(getClassicSpread('sniper', 1, stand), 0.081);
  assert.equal(
    getClassicSpread('shotgun', 1, { ...stand, grounded: false }),
    0.0675,
  );
  for (const kind of Object.keys(FIREARMS) as (keyof typeof FIREARMS)[]) {
    assert.ok(Number.isFinite(b.spread(kind, stand)), kind);
    assert.ok(b.spread(kind, stand) >= 0, kind);
  }
});

void test('release recovery and deploy reset preserve weapon isolation and default accuracy branch', () => {
  const b = createWeaponBallistics();
  for (let n = 0; n < 20; n++) b.shot('rifle', n * 100, stand);
  b.advance('rifle', 2000, 0.01, false);
  assert.equal(b.snapshot('rifle').shots, 15);
  b.advance('rifle', 2399, 0, false);
  assert.equal(b.snapshot('rifle').shots, 15);
  b.advance('rifle', 2400, 0, false);
  assert.equal(b.snapshot('rifle').shots, 14);
  b.advance('rifle', 3000, 0, false);
  assert.equal(b.snapshot('rifle').shots, 0);
  assert.equal(b.snapshot('rifle').accuracy, 1.25);
  b.shot('usp', 3100, stand);
  b.shot('usp', 3200, stand);
  const usp = b.snapshot('usp').accuracy;
  b.resetWeapon('rifle');
  assert.equal(b.snapshot('rifle').accuracy, 0.2);
  assert.equal(b.snapshot('usp').accuracy, usp);
});

void test('punch decay is bounded and ray-cone sampling is reproducible', () => {
  const b = createWeaponBallistics();
  b.shot('rifle', 0, stand);
  const length = Math.hypot(1, 0.375);
  b.advance('rifle', 10, 0.01, true);
  const p = b.snapshot('rifle').punch;
  near(Math.hypot(p.pitch, p.yaw), length - (10 + 0.5 * length) * 0.01);
  b.advance(null, 10000, 10, false);
  assert.deepEqual(b.aim(), { pitch: 0, yaw: 0 });
  const a = createSeededRandom(42),
    c = createSeededRandom(42);
  for (let i = 0; i < 1000; i++) {
    const sample = sampleClassicSpread(0.0675, a);
    assert.deepEqual(sample, sampleClassicSpread(0.0675, c));
    assert.ok(Math.hypot(sample.x, sample.y) <= 0.0675 + 1e-12);
  }
});

void test('seeded sprays and recovery match across render rates without kicking movement yaw', () => {
  const replay = (rate: number) => {
    const clock = createSimulationClock(),
      b = createWeaponBallistics(18),
      trace: unknown[] = [];
    clock.resetDebt();
    for (let frame = 0; frame < rate * 4; frame++)
      clock.advance(1 / rate, (dt, _start, end) => {
        const now = Math.round(end * 1000);
        b.advance('rifle', now, dt, now <= 2000);
        if (now <= 2000 && now % 100 === 0) b.shot('rifle', now, stand);
        trace.push(b.snapshot('rifle'));
      });
    return trace;
  };
  const reference = replay(100);
  assert.equal(reference.length, 400);
  for (const rate of [30, 60, 144]) assert.deepEqual(replay(rate), reference);
  const page = readFileSync(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  const shot = page.slice(
    page.indexOf('    const shoot ='),
    page.indexOf('    let touchLookPointer'),
  );
  assert.doesNotMatch(shot, /player\.(?:pitch|yaw)\s*(?:\+=|=)/);
  assert.match(page, /player\.yaw \+ punch\.yaw/);
  assert.match(page, /sampleClassicSpread\(spread, spreadRandom\)/);
});

void test('all lethal routes share ballistic reset and retain the committed camera aim', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const start = page.indexOf('    const beginPlayerDeathCamera =');
  const end = page.indexOf('    const ', start + 15);
  const death = page.slice(start,end);
  assert.match(death,/weaponBallistics\.reset\(\)/);
  assert.match(death,/spreadRandom = createSeededRandom\(1602\)/);
  assert.match(death,/pitch: camera\.rotation\.x/);
  assert.match(death,/yaw: camera\.rotation\.y/);
  // Bullet, HE, and C4 deaths converge on one player-death cleanup path.
  assert.equal((page.match(/beginPlayerDeathCamera\(/g)||[]).length, 1);
  const playerDeath = page.slice(page.indexOf('    const beginSpectating ='), page.indexOf('    const eliminateEnemy ='));
  assert.match(playerDeath, /beginPlayerDeathCamera\(/);
  assert.match(page, /if \(player.health <= 0\) beginSpectating\(bot, bot.primaryWeapon, false\)/);
  const blast = page.slice(page.indexOf('    const applyBlastToActors ='), page.indexOf('    const hasClearWorldLine ='));
  assert.match(blast, /if \(result.killed\) beginSpectating\(/);
  assert.match(blast, /kind === 'bomb' \? 'bomb' : 'grenade', false/);
});
