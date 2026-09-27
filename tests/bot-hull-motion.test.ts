import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { stepCharacterMotion, type CharacterMotionState } from '../app/character-motion.ts';
import { PLAYER_HULL, type PlayerCollisionWorld } from '../app/player-collision.ts';
import { stepPlayerPhysics, type PlayerPhysicsState } from '../app/player-physics.ts';
import { stepBotGroundVelocity } from '../app/bot-locomotion.ts';

const open: PlayerCollisionWorld = { boxes: [], ramps: [], floorHeight: 0, actorBlocks: () => false };
const state = (patch: Partial<CharacterMotionState> = {}): CharacterMotionState => ({
  x: 0, feet: 0, z: 0, velocity: { x: 0, z: 0 }, verticalVelocity: 0, grounded: true, ...patch,
});
const step = (input: CharacterMotionState, world = open) => stepCharacterMotion(input, PLAYER_HULL.standingHeight, world, 0.01);

void test('standing player and bot body traces remain paired across ramps, steps and wall slides', () => {
  const worlds = [open,
    { ...open, ramps: [{ minX: 1, maxX: 5, minZ: -4, maxZ: 4, axis: 'x' as const, startHeight: 0, endHeight: 1, baseHeight: 0 }] },
    { ...open, boxes: [{ min: { x: 1, y: 0, z: -5 }, max: { x: 2, y: 0.3, z: 5 } }] },
    { ...open, boxes: [{ min: { x: 1, y: 0, z: -5 }, max: { x: 2, y: 3, z: 5 } }] },
  ];
  for (const world of worlds) {
    const player: PlayerPhysicsState = { position: { x: 0, y: PLAYER_HULL.eyeHeight, z: 0 },
      velocity: { x: 0, z: 0 }, verticalVelocity: 0, grounded: true, crouched: false, landingRecoverySeconds: 0 };
    let bot = state();
    for (let tick = 0; tick < 240; tick++) {
      const desired = { x: tick < 120 ? 3.2 : -3.2, z: 2.4 };
      const horizontal = stepBotGroundVelocity({ velocity: bot.velocity, desiredVelocity: desired,
        weapon: 'rifle', scoped: false, grounded: bot.grounded, dtSeconds: 0.01 });
      const airborne = !player.grounded;
      const result = step({ ...bot, velocity: horizontal.velocity }, world);
      // This slice intentionally supplies no steering in the air to either actor.
      stepPlayerPhysics(player, { wishDirection: airborne ? { x: 0, z: 0 } : desired,
        maxSpeed: 4, jumpMaxSpeed: 4, crouching: false }, false, world);
      bot = result;
      for (const [actual, expected] of [[bot.x, player.position.x], [bot.feet, player.position.y - PLAYER_HULL.eyeHeight],
        [bot.z, player.position.z], [bot.velocity.x, player.velocity.x], [bot.velocity.z, player.velocity.z],
        [bot.verticalVelocity, player.verticalVelocity]]) assert.ok(Math.abs(actual - expected) <= 1e-12);
      assert.equal(bot.grounded, player.grounded);
    }
  }
});

void test('shared standing hull climbs a legal step, rejects a tall rise and slides beside a wall', () => {
  const box = (height: number) => ({ ...open, boxes: [{ min: { x: 1, y: 0, z: -2 }, max: { x: 2, y: height, z: 2 } }] });
  const input = state({ x: 0.56, velocity: { x: 4, z: 1 } });
  const legal = step(input, box(0.3));
  assert.equal(legal.feet, 0.3); assert.equal(legal.grounded, true); assert.ok(Math.abs(legal.x - 0.6) <= 1e-12);
  for (const height of [0.5, 3]) {
    const blocked = step(input, box(height));
    assert.ok(Math.abs(blocked.x - 0.57) <= 1e-12);
    assert.equal(blocked.velocity.x, 0); assert.equal(blocked.velocity.z, 1);
    assert.equal(blocked.z, 0.01); assert.equal(blocked.feet, 0);
  }
});

void test('a bot leaves a ledge, conserves horizontal momentum, falls and lands on support', () => {
  const world = { ...open, boxes: [{ min: { x: -2, y: 0, z: -2 }, max: { x: 0, y: 1, z: 2 } }] };
  let bot = state({ x: 0.42, feet: 1, velocity: { x: 3, z: 0 } });
  bot = step(bot, world);
  assert.equal(bot.grounded, false); assert.equal(bot.feet, 1);
  const horizontal = stepBotGroundVelocity({ velocity: bot.velocity, desiredVelocity: { x: -4, z: 3 },
    weapon: 'rifle', scoped: false, grounded: false, dtSeconds: 0.01 });
  assert.deepEqual(horizontal.velocity, bot.velocity);
  let landed = 0;
  for (let tick = 0; tick < 70; tick++) {
    const next = step(bot, world); landed += Number(next.landed); bot = next;
    assert.ok(bot.feet >= 0);
  }
  assert.equal(landed, 1); assert.equal(bot.feet, 0); assert.equal(bot.verticalVelocity, 0); assert.equal(bot.grounded, true);
});

void test('recovery probes never accumulate gravity or mutate their shared start state', () => {
  const input = Object.freeze(state({ x: 0, feet: 2, verticalVelocity: -1, grounded: false,
    velocity: Object.freeze({ x: 0, z: 0 }) }));
  const before = structuredClone(input);
  const expected = step(input);
  for (let probe = 0; probe < 7; probe++) assert.deepEqual(step(input), expected);
  assert.deepEqual(input, before);
  assert.equal(expected.verticalVelocity, -1.145);
  assert.equal(expected.feet, 1.98855);
});

void test('shared motion handles ceiling contact, invalid numeric inputs and zero elapsed time', () => {
  const ceiling = { ...open, boxes: [{ min: { x: -2, y: 2, z: -2 }, max: { x: 2, y: 3, z: 2 } }] };
  const hit = step(state({ feet: 0.19, verticalVelocity: 5, grounded: false }), ceiling);
  assert.equal(hit.hitCeiling, true); assert.equal(hit.verticalVelocity, 0);
  assert.ok(Math.abs(hit.feet - 0.2) <= 1e-12);
  const invalid = state({ x: NaN, feet: NaN, velocity: { x: Infinity, z: NaN }, verticalVelocity: Infinity });
  for (const dt of [NaN, Infinity, -1, 0, 0.01]) {
    const result = stepCharacterMotion(invalid, PLAYER_HULL.standingHeight, open, dt);
    for (const value of [result.x, result.feet, result.z, result.velocity.x, result.velocity.z, result.verticalVelocity])
      assert.ok(Number.isFinite(value));
  }
  const paused = state({ feet: 2, verticalVelocity: -1, grounded: false });
  assert.deepEqual(stepCharacterMotion(paused, PLAYER_HULL.standingHeight, open, 0),
    { ...paused, landed: false, hitCeiling: false, impactDownwardSpeed: 0 });
});

void test('page commits bot body motion once per tick and propagates actual support state', () => {
  const page = readFileSync(process.env.CS16_BOT_HULL_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  const presentationSource = readFileSync(
    new URL('../app/bot-presentation.ts', import.meta.url),
    'utf8',
  );
  const shared = page.slice(page.indexOf('const getBotCollisionWorld ='), page.indexOf('const getBallisticPose ='));
  assert.match(shared, /stepCharacterMotion\(/);
  assert.match(shared, /other !== bot && other.alive/);
  assert.match(shared, /feet < other.root.position.y \+ PLAYER_HULL.standingHeight/);
  assert.match(shared, /player.crouched \? PLAYER_HULL.crouchedHeight : PLAYER_HULL.standingHeight/);
  assert.equal((shared.match(/< 0.82/g) ?? []).length, 2);
  assert.match(
    shared,
    /if \(enemy\.motionResolvedThisTick\) return 0;\s*enemy\.motionResolvedThisTick = true;/,
  );
  assert.doesNotMatch(shared, /root.position.y = getMapGroundHeight|const enemyCollides/);
  const recovery = shared.slice(shared.indexOf('for (const direction of directions)'), shared.indexOf('if (!acceptedMotion)'));
  assert.match(recovery, /probeBotMotion\(enemy, movement.velocity, dt\)/);
  assert.doesNotMatch(recovery, /root.position\.[xyz] =|commitBotMotion\(/);
  assert.match(shared, /!waypoint \|\| isAtBotWaypoint/);
  const live = page.slice(page.indexOf('const runSimulationTick ='));
  const enemyLoopStart = live.indexOf('enemies.forEach((enemy) => {');
  const enemyLoopEnd = live.indexOf('let activeAllyShooters', enemyLoopStart);
  assert.ok(enemyLoopStart >= 0, 'missing enemy simulation loop');
  assert.ok(enemyLoopEnd > enemyLoopStart, 'missing ally simulation boundary');
  const enemyLoop = live.slice(enemyLoopStart, enemyLoopEnd);
  const enemyActiveGuard = "if (status !== 'active' || !enemy.alive) return;";
  const enemyFixtureGuard = 'enemy === firearmRuntimeFixtureTarget';
  const enemyMotionReset = 'enemy.motionResolvedThisTick = false;';
  assert.ok(enemyLoop.indexOf(enemyActiveGuard) >= 0);
  assert.ok(enemyLoop.indexOf(enemyFixtureGuard) > enemyLoop.indexOf(enemyActiveGuard));
  assert.ok(enemyLoop.indexOf(enemyMotionReset) > enemyLoop.indexOf(enemyFixtureGuard));
  const fixtureBranch = enemyLoop.slice(
    enemyLoop.indexOf(enemyFixtureGuard),
    enemyLoop.indexOf(enemyMotionReset),
  );
  assert.match(
    fixtureBranch,
    /enemy\.root\.updateMatrixWorld\(true\);\s*return;\s*\}\s*$/,
  );

  const allyLoopStart = live.indexOf('allies.forEach((ally) => {');
  const allyLoopEnd = live.indexOf('resolveTeamElimination();', allyLoopStart);
  assert.ok(allyLoopStart >= 0, 'missing ally simulation loop');
  assert.ok(allyLoopEnd > allyLoopStart, 'missing simulation resolution boundary');
  const allyLoop = live.slice(allyLoopStart, allyLoopEnd);
  const allyActiveGuard = "if (status !== 'active' || !ally.alive) return;";
  const allyMotionReset = 'ally.motionResolvedThisTick = false;';
  assert.ok(allyLoop.indexOf(allyActiveGuard) >= 0);
  assert.ok(allyLoop.indexOf(allyMotionReset) > allyLoop.indexOf(allyActiveGuard));

  for (const bot of ['enemy', 'ally']) {
    assert.match(page, new RegExp(`grounded: ${bot}\\.grounded,`));
  }
  assert.doesNotMatch(live, /(?:enemy|ally).root.position.y = getMapGroundHeight/);
  assert.match(page, /grounded: bot.grounded, crouching: false, speed/);
  const animation = page.slice(page.indexOf('const applyBotAnimationPresentation ='), page.indexOf('const captureBotDeathJoint ='));
  assert.match(animation, /grounded: bot.grounded/);
  assert.match(animation, /presentBotAnimation\(/);
  assert.match(
    presentationSource,
    /writeBotAnimationPose\(input, bot\.animationState, bot\.animationPose\);/,
  );
  assert.match(page, /const emitBotHearingFootstep = \(bot: Enemy\) => \{\s*if \(!bot.grounded\) return/);
});
