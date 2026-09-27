import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceLocomotionPhase,
  advancePlayerLocomotion,
  didCrossFootstepPhase,
  getLocalLocomotionVelocity,
  getPlayerLocomotionPose,
  PLAYER_CAMERA_PITCH_BOUNDS,
  PLAYER_CAMERA_ROLL_BOUNDS,
  PLAYER_CAMERA_Y_BOUNDS,
  PLAYER_LOCOMOTION_PHASE_PERIOD,
  PLAYER_LOCOMOTION_STRIDE_LENGTH,
  PLAYER_VIEWMODEL_PITCH_BOUNDS,
  PLAYER_VIEWMODEL_ROLL_BOUNDS,
  PLAYER_VIEWMODEL_X_BOUNDS,
  PLAYER_VIEWMODEL_Y_BOUNDS,
  PLAYER_VIEWMODEL_Z_BOUNDS,
  wrapLocomotionPhase,
} from '../app/player-locomotion.ts';

const velocity = (x: number, z: number) => ({ x, z });

void test('local velocity follows the camera forward and right axes', () => {
  assert.deepEqual(getLocalLocomotionVelocity(velocity(0, -4), 0), {
    forward: 4,
    strafe: 0,
    speed: 4,
  });
  assert.deepEqual(getLocalLocomotionVelocity(velocity(4, 0), 0), {
    forward: 0,
    strafe: 4,
    speed: 4,
  });
});

void test('phase advances by distance and is invariant to reasonable frame steps', () => {
  let finePhase = 0;
  for (let index = 0; index < 30; index += 1) {
    finePhase = advanceLocomotionPhase(finePhase, 4.2, 1 / 60, true);
  }
  let coarsePhase = 0;
  for (let index = 0; index < 10; index += 1) {
    coarsePhase = advanceLocomotionPhase(coarsePhase, 4.2, 0.05, true);
  }
  assert.ok(Math.abs(finePhase - coarsePhase) < 1e-9);
  assert.ok(
    Math.abs(
      finePhase -
        wrapLocomotionPhase(
          (4.2 * 0.5 * PLAYER_LOCOMOTION_PHASE_PERIOD) /
            PLAYER_LOCOMOTION_STRIDE_LENGTH,
        ),
    ) < 1e-9,
  );
});

void test('phase pauses while stopped or airborne and wraps deterministically', () => {
  assert.equal(advanceLocomotionPhase(1.25, 0, 0.05, true), 1.25);
  assert.equal(advanceLocomotionPhase(1.25, 4, 0.05, false), 1.25);
  assert.equal(
    wrapLocomotionPhase(-0.25),
    PLAYER_LOCOMOTION_PHASE_PERIOD - 0.25,
  );
  assert.equal(
    wrapLocomotionPhase(PLAYER_LOCOMOTION_PHASE_PERIOD + 0.25),
    0.25,
  );
  assert.equal(
    advanceLocomotionPhase(0, 4, 1, true),
    advanceLocomotionPhase(0, 4, 0.05, true),
  );
});

void test('footstep detection is true only when a half-stride boundary is crossed', () => {
  assert.equal(didCrossFootstepPhase(0.1, 0.9), false);
  assert.equal(didCrossFootstepPhase(0, 0.1), false);
  assert.equal(didCrossFootstepPhase(0.1, Math.PI + 0.1), true);
  assert.equal(didCrossFootstepPhase(6.1, 0.1), true);
  assert.equal(didCrossFootstepPhase(0.1, 0.1), false);
});

void test('run, walk, and crouch bob amplitudes are ordered', () => {
  const base = {
    velocity: velocity(0, -4.55),
    yawRadians: 0,
    phase: Math.PI / 2,
    dtSeconds: 0,
    grounded: true,
    crouching: false,
    walking: false,
  } as const;
  const run = getPlayerLocomotionPose(base);
  const walk = getPlayerLocomotionPose({ ...base, walking: true });
  const crouch = getPlayerLocomotionPose({ ...base, crouching: true });
  assert.ok(Math.abs(run.cameraY) > Math.abs(walk.cameraY));
  assert.ok(Math.abs(walk.cameraY) > Math.abs(crouch.cameraY));
  assert.ok(Math.abs(run.viewY) > Math.abs(walk.viewY));
  assert.ok(Math.abs(walk.viewY) > Math.abs(crouch.viewY));
});

void test('forward and strafe inputs produce signed, distinct presentation cues', () => {
  const forward = getPlayerLocomotionPose({
    velocity: velocity(0, -4),
    yawRadians: 0,
    phase: 0.7,
    dtSeconds: 0,
    grounded: true,
    crouching: false,
    walking: false,
  });
  const strafeRight = getPlayerLocomotionPose({
    velocity: velocity(4, 0),
    yawRadians: 0,
    phase: 0.7,
    dtSeconds: 0,
    grounded: true,
    crouching: false,
    walking: false,
  });
  const strafeLeft = getPlayerLocomotionPose({
    velocity: velocity(-4, 0),
    yawRadians: 0,
    phase: 0.7,
    dtSeconds: 0,
    grounded: true,
    crouching: false,
    walking: false,
  });
  assert.ok(forward.viewZ < 0);
  assert.equal(forward.viewX, 0);
  assert.ok(strafeRight.viewX > 0);
  assert.ok(strafeLeft.viewX < 0);
  assert.ok(strafeRight.cameraRoll > 0);
  assert.ok(strafeLeft.cameraRoll < 0);
});

void test('airborne locomotion has no bob or footsteps', () => {
  const pose = getPlayerLocomotionPose({
    velocity: velocity(0, -4.55),
    yawRadians: 0,
    phase: 0,
    dtSeconds: 0.05,
    grounded: false,
    crouching: false,
    walking: false,
  });
  assert.equal(pose.cameraY, 0);
  assert.equal(pose.cameraRoll, 0);
  assert.equal(pose.viewX, 0);
  assert.equal(pose.viewY, 0);
  assert.equal(pose.viewZ, 0);
  assert.equal(pose.footstepCrossed, false);
});

void test('landing settle composes with locomotion and remains bounded', () => {
  const moving = {
    velocity: velocity(0, -4.55),
    yawRadians: 0,
    phase: Math.PI / 2,
    dtSeconds: 0,
    grounded: true,
    crouching: false,
    walking: false,
  } as const;
  const normal = getPlayerLocomotionPose(moving);
  const landing = getPlayerLocomotionPose({
    ...moving,
    landingRecoverySeconds: 0.2,
  });
  assert.ok(landing.cameraY < normal.cameraY);
  assert.ok(landing.viewY < normal.viewY);
  assert.ok(landing.cameraPitch > normal.cameraPitch);
  assert.ok(landing.viewPitch > normal.viewPitch);
});

void test('pose outputs are finite and stay inside explicit presentation bounds', () => {
  const pose = getPlayerLocomotionPose({
    velocity: velocity(Number.NaN, Number.POSITIVE_INFINITY),
    yawRadians: Number.NaN,
    phase: Number.NaN,
    dtSeconds: Number.NaN,
    grounded: true,
    crouching: false,
    walking: false,
    landingRecoverySeconds: Number.POSITIVE_INFINITY,
  });
  for (const value of Object.values(pose)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
  assert.ok(Math.abs(pose.cameraY) <= PLAYER_CAMERA_Y_BOUNDS);
  assert.ok(Math.abs(pose.cameraPitch) <= PLAYER_CAMERA_PITCH_BOUNDS);
  assert.ok(Math.abs(pose.cameraRoll) <= PLAYER_CAMERA_ROLL_BOUNDS);
  assert.ok(Math.abs(pose.viewX) <= PLAYER_VIEWMODEL_X_BOUNDS);
  assert.ok(Math.abs(pose.viewY) <= PLAYER_VIEWMODEL_Y_BOUNDS);
  assert.ok(Math.abs(pose.viewZ) <= PLAYER_VIEWMODEL_Z_BOUNDS);
  assert.ok(Math.abs(pose.viewPitch) <= PLAYER_VIEWMODEL_PITCH_BOUNDS);
  assert.ok(Math.abs(pose.viewRoll) <= PLAYER_VIEWMODEL_ROLL_BOUNDS);
});

void test('advance helper reports distance and deterministic footstep crossings', () => {
  const step = advancePlayerLocomotion({
    velocity: velocity(0, -4.55),
    yawRadians: 0,
    phase: PLAYER_LOCOMOTION_PHASE_PERIOD - 0.01,
    dtSeconds: 0.05,
    grounded: true,
    crouching: false,
    walking: false,
  });
  assert.equal(step.distance, 4.55 * 0.05);
  assert.equal(step.footstepCrossed, true);
  assert.equal(
    step.phase,
    advancePlayerLocomotion({
      velocity: velocity(0, -4.55),
      yawRadians: 0,
      phase: PLAYER_LOCOMOTION_PHASE_PERIOD - 0.01,
      dtSeconds: 0.05,
      grounded: true,
      crouching: false,
      walking: false,
    }).phase,
  );
});
