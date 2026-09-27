import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advancePlayerPresentation,
  composePlayerPresentationPose,
  createPlayerPresentationState,
  getPlayerPresentationPose,
  PLAYER_PRESENTATION_MAX_ROLL,
  PLAYER_PRESENTATION_MAX_STEP_SECONDS,
  PLAYER_PRESENTATION_MAX_TRANSLATION,
  stepPlayerPresentation,
} from '../app/player-presentation.ts';

const input = (dtSeconds: number) => ({
  dtSeconds,
  localVelocity: { forward: 4.55, strafe: 0, speed: 4.55 },
  localAcceleration: { forward: 0, strafe: 0 },
  stance: 'standing' as const,
  grounded: true,
  authoritativeYawRadians: 1.2,
  authoritativePitchRadians: -0.16,
});

function length(offset: { x: number; y: number; z: number }) {
  return Math.hypot(offset.x, offset.y, offset.z);
}

function runFor(dtSeconds: number, elapsedSeconds: number, makeInput = input) {
  let state = createPlayerPresentationState();
  const count = Math.round(elapsedSeconds / dtSeconds);
  for (let index = 0; index < count; index += 1)
    state = advancePlayerPresentation(state, makeInput(dtSeconds));
  return state;
}

void test('same input and state produce a deterministic pose without aim drift', () => {
  const base = createPlayerPresentationState(1.2, -0.16);
  const first = stepPlayerPresentation(input(1 / 60), base);
  const second = stepPlayerPresentation(input(1 / 60), base);
  assert.deepEqual(first, second);
  assert.equal(first.pose.cameraYawRadians, 1.2);
  assert.equal(first.pose.cameraPitchRadians, -0.16);
  assert.equal(first.pose.authoritativeYawRadians, 1.2);
  assert.equal(first.pose.authoritativePitchRadians, -0.16);
});

void test('dt is sanitized and bounded to the simulation presentation step', () => {
  const base = createPlayerPresentationState(1.2, -0.16);
  const invalid = advancePlayerPresentation(base, {
    ...input(Number.NaN),
    dtSeconds: Number.NaN,
  });
  const negative = advancePlayerPresentation(base, {
    ...input(-1),
    dtSeconds: -1,
  });
  const capped = advancePlayerPresentation(base, {
    ...input(1),
    dtSeconds: 1,
  });
  const expected = advancePlayerPresentation(base, {
    ...input(PLAYER_PRESENTATION_MAX_STEP_SECONDS),
    dtSeconds: PLAYER_PRESENTATION_MAX_STEP_SECONDS,
  });
  assert.deepEqual(invalid, base);
  assert.deepEqual(negative, base);
  assert.deepEqual(capped, expected);
});

void test('30, 60, and 120 Hz produce stable equal-elapsed-time state', () => {
  const at30 = runFor(1 / 30, 0.5);
  const at60 = runFor(1 / 60, 0.5);
  const at120 = runFor(1 / 120, 0.5);
  for (const key of ['x', 'y', 'z'] as const) {
    assert.ok(
      Math.abs(at30.cameraOffset[key] - at60.cameraOffset[key]) < 0.001,
    );
    assert.ok(
      Math.abs(at60.cameraOffset[key] - at120.cameraOffset[key]) < 0.001,
    );
    assert.ok(
      Math.abs(at30.viewmodelOffset[key] - at120.viewmodelOffset[key]) < 0.001,
    );
  }
  assert.ok(Math.abs(at30.cameraRoll - at120.cameraRoll) < 0.001);
  assert.ok(Math.abs(at30.viewmodelRoll - at120.viewmodelRoll) < 0.001);
  assert.ok(Math.abs(at30.phase - at120.phase) < 1e-9);
});

void test('neutral movement settles promptly with analytic damping', () => {
  let state = createPlayerPresentationState();
  state = advancePlayerPresentation(state, {
    ...input(0.05),
    dtSeconds: 0.05,
    localVelocity: { forward: 0, strafe: 4.55, speed: 4.55 },
    localAcceleration: { forward: 0, strafe: 10 },
  });
  for (let index = 0; index < 5; index += 1)
    state = advancePlayerPresentation(state, {
      ...input(0.05),
      dtSeconds: 0.05,
      localVelocity: { forward: 0, strafe: 0, speed: 0 },
      localAcceleration: { forward: 0, strafe: 0 },
    });
  assert.ok(length(state.cameraOffset) < 0.002);
  assert.ok(length(state.viewmodelOffset) < 0.002);
  assert.ok(Math.abs(state.cameraRoll) < 0.002);
  assert.ok(Math.abs(state.viewmodelRoll) < 0.002);
});

void test('velocity, acceleration, and landing retain readable signed directionality', () => {
  const right = getPlayerPresentationPose({
    ...input(0.05),
    localVelocity: { forward: 0, strafe: 4.55, speed: 4.55 },
    localAcceleration: { forward: 0, strafe: 0 },
  });
  const left = getPlayerPresentationPose({
    ...input(0.05),
    localVelocity: { forward: 0, strafe: -4.55, speed: 4.55 },
    localAcceleration: { forward: 0, strafe: 0 },
  });
  const braking = getPlayerPresentationPose({
    ...input(0.05),
    localVelocity: { forward: 0, strafe: 4.55, speed: 4.55 },
    localAcceleration: { forward: 0, strafe: -10 },
  });
  const landing = getPlayerPresentationPose({
    ...input(0.05),
    localVelocity: { forward: 0, strafe: 0, speed: 0 },
    landing: true,
  });
  assert.ok(right.viewmodelOffset.x > 0);
  assert.ok(left.viewmodelOffset.x < 0);
  assert.ok(right.cameraRoll > 0);
  assert.ok(left.cameraRoll < 0);
  assert.ok(braking.viewmodelOffset.x > 0);
  assert.ok(landing.viewmodelOffset.y < 0);
  assert.ok(landing.viewmodelPitch > 0);
});

void test('forward gait adds a restrained phase-locked lateral camera sway', () => {
  const forward = {
    ...input(0.05),
    dtSeconds: 0.05,
    localVelocity: { forward: 4.55, strafe: 0, speed: 4.55 },
    localAcceleration: { forward: 0, strafe: 0 },
    locomotionPhase: Math.PI / 4,
  };
  const mirrored = { ...forward, locomotionPhase: (Math.PI * 7) / 4 };
  const leftSway = getPlayerPresentationPose(forward).cameraOffset.x;
  const rightSway = getPlayerPresentationPose(mirrored).cameraOffset.x;

  assert.ok(leftSway > 0);
  assert.ok(rightSway < 0);
  assert.ok(Math.abs(leftSway + rightSway) < 1e-12);
  assert.ok(Math.abs(leftSway) < 0.002);
});

void test('invalid input fails closed, preserves input objects, and stays bounded', () => {
  const malformed = {
    ...input(Number.POSITIVE_INFINITY),
    dtSeconds: Number.POSITIVE_INFINITY,
    localVelocity: {
      forward: Number.NaN,
      strafe: Number.NEGATIVE_INFINITY,
      speed: Number.POSITIVE_INFINITY,
    },
    localAcceleration: {
      forward: Number.NaN,
      strafe: Number.POSITIVE_INFINITY,
    },
    authoritativeYawRadians: Number.NaN,
    authoritativePitchRadians: Number.POSITIVE_INFINITY,
    landingRecoverySeconds: Number.POSITIVE_INFINITY,
  };
  const before = structuredClone(malformed);
  const pose = getPlayerPresentationPose(malformed);
  assert.deepEqual(malformed, before);
  for (const value of [
    pose.phase,
    pose.speed,
    pose.authoritativeYawRadians,
    pose.authoritativePitchRadians,
    pose.cameraRoll,
    pose.viewmodelPitch,
    pose.viewmodelRoll,
    ...Object.values(pose.cameraOffset),
    ...Object.values(pose.viewmodelOffset),
  ])
    assert.ok(Number.isFinite(value));
  assert.ok(length(pose.cameraOffset) <= PLAYER_PRESENTATION_MAX_TRANSLATION);
  assert.ok(
    length(pose.viewmodelOffset) <= PLAYER_PRESENTATION_MAX_TRANSLATION,
  );
  assert.ok(Math.abs(pose.cameraRoll) <= PLAYER_PRESENTATION_MAX_ROLL);
  assert.ok(Math.abs(pose.viewmodelRoll) <= PLAYER_PRESENTATION_MAX_ROLL);
});

void test('pose composition reports the advanced state without mutating it', () => {
  const state = createPlayerPresentationState();
  const next = advancePlayerPresentation(state, input(0.05));
  const pose = composePlayerPresentationPose(next, {
    ...input(0),
    locomotionPhase: next.phase,
  });
  assert.equal(pose.phase, next.phase);
  assert.deepEqual(state, createPlayerPresentationState());
  assert.deepEqual(pose.cameraOffset, next.cameraOffset);
  assert.deepEqual(pose.viewmodelOffset, next.viewmodelOffset);
});
