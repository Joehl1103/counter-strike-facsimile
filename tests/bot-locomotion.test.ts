import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceBotStridePhase,
  BOT_BODY_MAX_TURN_RATE,
  BOT_POSE_REFERENCE_SPEED,
  BOT_MAX_ACCELERATION_LEAN,
  BOT_MAX_LEG_SWING,
  BOT_MAX_PELVIS_LIFT,
  BOT_MAX_TORSO_AIM_OFFSET,
  getBotLocomotionPose,
  resetBotLocomotionState,
  stepBotBodyYaw,
  stepBotGroundVelocity,
  wrapBotAngle,
  wrapBotPhase,
} from '../app/bot-locomotion.ts';

import { getWeaponMoveSpeed, stepHorizontalVelocity, type FirearmKind } from '../app/game-rules.ts';
import { createSimulationClock } from '../app/simulation-clock.ts';

const vector = (x: number, z: number) => ({ x, z });

void test('bot ground acceleration and stopping friction match the production player rules', () => {
  const base = { weapon: 'rifle' as const, scoped: false, grounded: true, dtSeconds: 0.05 };
  const moving = stepBotGroundVelocity({ ...base, velocity: vector(0, 0), desiredVelocity: vector(4, 0) });
  assert.deepEqual(moving, { velocity: vector(2, 0), acceleration: vector(40, 0), speed: 2 });
  const braking = stepBotGroundVelocity({ ...base, velocity: vector(4, 0), desiredVelocity: vector(0, 0) });
  assert.equal(braking.velocity.x, 3.2);
  assert.equal(braking.velocity.z, 0);
  const settled = stepBotGroundVelocity({ ...base, velocity: vector(0.1, 0), desiredVelocity: vector(0, 0) });
  assert.deepEqual(settled.velocity, vector(0, 0));
});

void test('ground steering pairs with the player primitive at 16, 33 and 50 ms', () => {
  const cases = [
    { velocity: vector(0, 0), desiredVelocity: vector(4, 0) },
    { velocity: vector(2.5, -1.5), desiredVelocity: vector(-3, 2) },
    { velocity: vector(8, 0), desiredVelocity: vector(2, 0) },
    { velocity: vector(3, 4), desiredVelocity: vector(0, 0) },
  ];
  for (const input of cases) for (const dtSeconds of [0.016, 0.033, 0.05]) {
    const maxSpeed = Math.min(Math.hypot(input.desiredVelocity.x, input.desiredVelocity.z),
      getWeaponMoveSpeed({ weapon: 'rifle', scoped: false, walking: false, crouching: false }));
    const expected = stepHorizontalVelocity({ velocity: input.velocity,
      wishDirection: input.desiredVelocity, maxSpeed, dtSeconds, grounded: true });
    const actual = stepBotGroundVelocity({ ...input, dtSeconds, weapon: 'rifle', scoped: false, grounded: true });
    assert.ok(Math.abs(actual.velocity.x - expected.x) <= 1e-12);
    assert.ok(Math.abs(actual.velocity.z - expected.z) <= 1e-12);
    assert.equal(actual.acceleration.x, (expected.x - input.velocity.x) / dtSeconds);
    assert.equal(actual.acceleration.z, (expected.z - input.velocity.z) / dtSeconds);
  }
});

void test('every active firearm and scope state caps requested speed without overriding slower route decisions', () => {
  const weapons: FirearmKind[] = ['rifle', 'carbine', 'sniper', 'smg', 'shotgun', 'usp', 'glock18', 'p228', 'deagle', 'elite', 'fiveseven'];
  for (const weapon of weapons) for (const scoped of [false, true]) for (const requested of [1.15, 100]) {
    const maxSpeed = Math.min(requested, getWeaponMoveSpeed({ weapon, scoped, walking: false, crouching: false }));
    let velocity = vector(0, 0);
    for (let tick = 0; tick < 200; tick++) {
      velocity = stepBotGroundVelocity({ velocity, desiredVelocity: vector(requested * 0.6, requested * 0.8),
        weapon, scoped, grounded: true, dtSeconds: 0.01 }).velocity;
      assert.ok(Math.hypot(velocity.x, velocity.z) <= maxSpeed + 1e-12);
    }
    assert.ok(Math.abs(Math.hypot(velocity.x, velocity.z) - maxSpeed) <= 1e-12);
  }
  assert.equal(getWeaponMoveSpeed({ weapon: 'sniper', scoped: true, walking: false, crouching: false }), 2.175);
});

void test('invalid velocity and deltas use shared sanitization and finite stopping behavior', () => {
  for (const dtSeconds of [0, -1, NaN, Infinity, 1]) {
    const input = { velocity: vector(NaN, 2), desiredVelocity: vector(Infinity, -3),
      weapon: 'rifle' as const, scoped: false, grounded: true, dtSeconds };
    const actual = stepBotGroundVelocity(input);
    const expected = stepHorizontalVelocity({ velocity: input.velocity, wishDirection: vector(0, -3),
      maxSpeed: 3, dtSeconds, grounded: true });
    assert.deepEqual(actual.velocity, expected);
    for (const value of [...Object.values(actual.velocity), ...Object.values(actual.acceleration), actual.speed])
      assert.ok(Number.isFinite(value));
  }
  const overflow = stepBotGroundVelocity({ velocity: vector(Number.MAX_VALUE, Number.MAX_VALUE),
    desiredVelocity: vector(Number.MAX_VALUE, Number.MAX_VALUE), weapon: 'rifle', scoped: false, grounded: true, dtSeconds: 0.05 });
  assert.deepEqual(overflow, { velocity: vector(0, 0), acceleration: vector(0, 0), speed: 0 });
});

void test('fixed 100 Hz movement replays identically across render frame batches', () => {
  const replay = (frames: number[]) => {
    const clock = createSimulationClock();
    let velocity = vector(0, 0), x = 0, z = 0;
    for (const frame of frames) clock.advance(frame, (dtSeconds, start) => {
      const desiredVelocity = start < 0.2 ? vector(4, 0) : start < 0.35 ? vector(-2, 3) : vector(0, 0);
      velocity = stepBotGroundVelocity({ velocity, desiredVelocity, dtSeconds, weapon: 'rifle', scoped: false, grounded: true }).velocity;
      x += velocity.x * dtSeconds; z += velocity.z * dtSeconds;
    });
    return { velocity, x, z, elapsed: clock.getTimeSeconds() };
  };
  const expected = replay(Array(50).fill(0.01));
  assert.deepEqual(replay(Array(10).fill(0.05)), expected);
  assert.deepEqual(replay(Array(10).fill([0.016, 0.033, 0.001]).flat()), expected);
  assert.equal(expected.elapsed, 0.5);
});

void test('body turn response takes the shortest wrapped path and is rate bounded', () => {
  const current = Math.PI - 0.05;
  const target = -Math.PI + 0.05;
  const next = stepBotBodyYaw(current, target, 0.05);
  assert.ok(
    Math.abs(wrapBotAngle(next - current)) <=
      BOT_BODY_MAX_TURN_RATE * 0.05 + 1e-9,
  );
  assert.ok(
    Math.abs(wrapBotAngle(target - next)) <
      Math.abs(wrapBotAngle(target - current)),
  );
  assert.equal(stepBotBodyYaw(current, target, 0), wrapBotAngle(current));
});

void test('stride phase follows distance, pauses when stopped or airborne, and wraps', () => {
  const advanced = advanceBotStridePhase(0, 4, 0.05, true);
  assert.ok(advanced > 0);
  const paused = advanceBotStridePhase(advanced, 0, 0.05, true);
  assert.equal(paused, advanced);
  assert.equal(advanceBotStridePhase(advanced, 4, 0.05, false), advanced);
  const resumed = advanceBotStridePhase(paused, 4, 0.05, true);
  assert.ok(resumed > paused);
  assert.ok(Math.abs(wrapBotPhase(-0.2) - (Math.PI * 2 - 0.2)) < 1e-12);
  assert.ok(Math.abs(wrapBotPhase(Math.PI * 2 + 0.2) - 0.2) < 1e-12);
});

void test('living pose uses opposite leg swings and planted-foot contacts', () => {
  const pose = getBotLocomotionPose({
    phase: Math.PI / 2,
    speed: BOT_POSE_REFERENCE_SPEED,
    acceleration: vector(0, 0),
    aimYawDelta: 0,
    grounded: true,
  });
  assert.equal(pose.leftLegPitch, -pose.rightLegPitch);
  assert.equal(pose.leftFootPlant + pose.rightFootPlant, 1);
  assert.ok(Math.abs(pose.pelvisLift - BOT_MAX_PELVIS_LIFT) < 1e-12);
  const leftContact = getBotLocomotionPose({
    phase: 0,
    speed: BOT_POSE_REFERENCE_SPEED,
    acceleration: vector(0, 0),
    aimYawDelta: 0,
    grounded: true,
  });
  assert.equal(leftContact.leftFootPlant, 1);
  assert.equal(leftContact.rightFootPlant, 0);
  assert.equal(leftContact.pelvisLift, 0);
});

void test('pose lean follows acceleration and stays bounded', () => {
  const pose = getBotLocomotionPose({
    phase: 0,
    speed: 2,
    acceleration: vector(100, -100),
    aimYawDelta: 0,
    grounded: true,
  });
  assert.equal(pose.leanX, BOT_MAX_ACCELERATION_LEAN);
  assert.equal(pose.leanZ, -BOT_MAX_ACCELERATION_LEAN);
  assert.ok(Math.abs(pose.leftLegPitch) <= BOT_MAX_LEG_SWING);
  assert.ok(Math.abs(pose.rightLegPitch) <= BOT_MAX_LEG_SWING);
  assert.ok(pose.pelvisLift <= BOT_MAX_PELVIS_LIFT);
});

void test('torso aim offset is shortest-path normalized and capped', () => {
  const pose = getBotLocomotionPose({
    phase: 0,
    speed: 0,
    acceleration: vector(0, 0),
    aimYawDelta: Math.PI * 2,
    grounded: true,
  });
  assert.equal(pose.torsoAimYaw, 0);
  const capped = getBotLocomotionPose({
    phase: 0,
    speed: 0,
    acceleration: vector(0, 0),
    aimYawDelta: Math.PI,
    grounded: true,
  });
  assert.equal(capped.torsoAimYaw, BOT_MAX_TORSO_AIM_OFFSET);
});

void test('airborne and invalid inputs fail closed to finite pose values', () => {
  const pose = getBotLocomotionPose({
    phase: Number.NaN,
    speed: Number.POSITIVE_INFINITY,
    acceleration: vector(Number.NaN, Number.NEGATIVE_INFINITY),
    aimYawDelta: Number.NaN,
    grounded: false,
  });
  for (const value of Object.values(pose)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
  assert.equal(pose.speed, 0);
  assert.equal(pose.leftLegPitch, 0);
  assert.equal(pose.rightLegPitch, 0);
  assert.equal(pose.pelvisLift, 0);
});

void test('reset state clears velocity and phase while preserving wrapped body yaw', () => {
  assert.deepEqual(resetBotLocomotionState(Math.PI * 3), {
    velocity: vector(0, 0),
    phase: 0,
    bodyYaw: Math.PI,
  });
});
