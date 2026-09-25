import assert from 'node:assert/strict';
import test from 'node:test';
import { stepBotGroundVelocity } from '../app/bot-locomotion.ts';
import { stepCharacterMotion } from '../app/character-motion.ts';
import { DUST2_COLLISION_WORLD, DUST2_MAP, getMapGroundHeight } from '../app/dust2-map.ts';
import { getWeaponMoveSpeed } from '../app/game-rules.ts';
import { createPlayerInputTimeline } from '../app/player-input.ts';
import { stepPlayerPhysics, type PlayerPhysicsState } from '../app/player-physics.ts';
import { PLAYER_HULL } from '../app/player-collision.ts';
import {
  DUST2_ROUTE_RECORDINGS,
  ROUTE_POSITION_TOLERANCE,
  ROUTE_REFERENCE_RATE,
  replayDust2Route,
  recordDust2Route,
} from '../scripts/jkh-130-route-harness.ts';

function stateAt(nodeId: string): PlayerPhysicsState {
  const point = DUST2_MAP.nodes[nodeId];
  const feet = getMapGroundHeight(...point);
  return {
    position: { x: point[0], y: feet + PLAYER_HULL.eyeHeight, z: point[1] },
    velocity: { x: 0, z: 0 },
    verticalVelocity: 0,
    grounded: true,
    crouched: false,
    landingRecoverySeconds: 0,
  };
}

void test('each recorded Dust II route has one timestamped control record and matches at 30/60/144 Hz', () => {
  for (const name of Object.keys(DUST2_ROUTE_RECORDINGS) as Array<keyof typeof DUST2_ROUTE_RECORDINGS>) {
    const recorded = recordDust2Route(name);
    assert.equal(recorded.tickCount % 50, 0, name);
    assert.equal(recorded.controls.length, recorded.tickCount, name);
    assert.equal(recorded.trace.length, recorded.tickCount, name);
    assert.equal(recorded.controls[0].atSeconds, 0, name);
    const reference = replayDust2Route(recorded, ROUTE_REFERENCE_RATE);
    assert.deepEqual(reference.trace, recorded.trace, `${name} recorded 100 Hz trace`);
    for (const rateHz of [30, 60, 144]) {
      const replay = replayDust2Route(recorded, rateHz);
      assert.deepEqual(replay.trace, recorded.trace, `${name} at ${rateHz} Hz`);
      assert.equal(replay.interpolationFrames, (recorded.tickCount * rateHz) / 100, name);
    }
  }
});

void test('the route input timeline preserves an exact non-frame-aligned timestamp and reset discards it', () => {
  const timeline = createPlayerInputTimeline();
  timeline.controls(0.013, { strafe: 1, forward: 0, yaw: 0, walking: false, crouching: false });
  assert.equal(timeline.sample(0.01).strafe, 0);
  assert.equal(timeline.sample(0.02).strafe, 1);
  timeline.controls(0.027, { strafe: 0, forward: 1, yaw: 0, walking: false, crouching: false });
  timeline.reset();
  assert.equal(timeline.sample(1).forward, 0);
});

void test('player and bot share the same Dust II ground/body result for one recorded route', () => {
  const recorded = recordDust2Route('CT-ramp-A');
  const timeline = createPlayerInputTimeline();
  for (const event of recorded.controls) timeline.controls(event.atSeconds, event.controls);
  const player = stateAt(recorded.nodeIds[0]);
  let bot = {
    x: player.position.x,
    feet: player.position.y - PLAYER_HULL.eyeHeight,
    z: player.position.z,
    velocity: { x: 0, z: 0 },
    verticalVelocity: 0,
    grounded: true,
  };
  const speed = getWeaponMoveSpeed({ weapon: 'rifle', scoped: false, walking: false, crouching: false });
  for (let tick = 0; tick < recorded.tickCount; tick++) {
    const controls = timeline.sample(tick / 100);
    const wishDirection = { x: controls.strafe, z: -controls.forward };
    stepPlayerPhysics(player, {
      wishDirection,
      maxSpeed: speed,
      jumpMaxSpeed: speed,
      crouching: false,
    }, false, DUST2_COLLISION_WORLD);
    const length = Math.hypot(wishDirection.x, wishDirection.z);
    const desiredVelocity = length === 0 ? { x: 0, z: 0 } : {
      x: (wishDirection.x / length) * speed,
      z: (wishDirection.z / length) * speed,
    };
    const horizontal = stepBotGroundVelocity({
      velocity: bot.velocity,
      desiredVelocity,
      weapon: 'rifle',
      scoped: false,
      grounded: bot.grounded,
      dtSeconds: 0.01,
    });
    bot = stepCharacterMotion({ ...bot, velocity: horizontal.velocity }, PLAYER_HULL.standingHeight, DUST2_COLLISION_WORLD, 0.01);
    for (const [actual, expected] of [
      [bot.x, player.position.x],
      [bot.feet, player.position.y - PLAYER_HULL.eyeHeight],
      [bot.z, player.position.z],
      [bot.velocity.x, player.velocity.x],
      [bot.velocity.z, player.velocity.z],
      [bot.verticalVelocity, player.verticalVelocity],
    ]) assert.ok(Math.abs(actual - expected) <= 1e-12, `tick ${tick}: ${actual} !== ${expected}`);
    assert.equal(bot.grounded, player.grounded, `tick ${tick}`);
  }
});

void test('route replay honors existing weapon movement speeds without changing their tuning', () => {
  const weapons = [
    { weapon: 'knife' as const, scoped: false },
    { weapon: 'rifle' as const, scoped: false },
    { weapon: 'sniper' as const, scoped: false },
    { weapon: 'sniper' as const, scoped: true },
  ];
  const speeds = weapons.map(({ weapon, scoped }) => getWeaponMoveSpeed({ weapon, scoped, walking: false, crouching: false }));
  assert.deepEqual(speeds, [5.45, 4.55, 3.75, 2.175]);
  for (const entry of weapons) {
    const recorded = recordDust2Route('mid-doors-CT', entry.weapon, entry.scoped);
    const reference = replayDust2Route(recorded, 30);
    const highRate = replayDust2Route(recorded, 144);
    assert.deepEqual(highRate.trace, reference.trace, `${entry.weapon}/${entry.scoped}`);
    const terminal = reference.trace.at(-1)!;
    assert.ok(Math.abs(terminal.velocity.x) <= ROUTE_POSITION_TOLERANCE);
    assert.ok(Math.abs(terminal.velocity.z) <= ROUTE_POSITION_TOLERANCE);
  }
});
