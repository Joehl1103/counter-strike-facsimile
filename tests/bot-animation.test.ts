import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOT_ANIMATION_ACTION_SETTLE_SECONDS,
  BOT_ANIMATION_MAX_FRAME_ANGLE,
  BOT_ANIMATION_MAX_IMPULSE_ANGLE,
  BOT_ANIMATION_MAX_SPEED,
  BOT_ANIMATION_MAX_STEP_SECONDS,
  BOT_ANIMATION_MAX_TORSO_YAW,
  BOT_ANIMATION_MAX_TOE_CLEARANCE,
  BOT_ANIMATION_MIN_TOE_CLEARANCE,
  createBotAnimationPose,
  createBotAnimationState,
  getBotAnimationLocalVector,
  getBotAnimationPose,
  writeBotAnimationPose,
} from '../app/bot-animation.ts';

const input = (overrides: Record<string, unknown> = {}) => ({
  dtSeconds: 1 / 60,
  velocity: { x: 2.4, z: -1.1 },
  acceleration: { x: 3, z: -2 },
  bodyYaw: 0.4,
  aimYaw: 0.7,
  grounded: true,
  phase: 1.1,
  ...overrides,
});

void test('world velocity and acceleration are converted to body-local space', () => {
  const local = getBotAnimationLocalVector({ x: 0, z: -3 }, 0);
  assert.deepEqual(local, { x: 0, z: 3 });
  const rotated = getBotAnimationLocalVector({ x: 1, z: 0 }, Math.PI / 2);
  assert.ok(Math.abs(rotated.x) < 1e-12);
  assert.ok(Math.abs(rotated.z + 1) < 1e-12);
});

void test('pose is flat, finite, grounded, and bounded', () => {
  const pose = getBotAnimationPose(
    input({
      dtSeconds: 1,
      velocity: { x: Number.NaN, z: Number.POSITIVE_INFINITY },
      acceleration: { x: Number.NEGATIVE_INFINITY, z: Number.NaN },
      bodyYaw: Number.NaN,
      aimYaw: Number.POSITIVE_INFINITY,
      phase: Number.NaN,
      actions: { fire: Number.NaN, reload: Number.POSITIVE_INFINITY },
    }),
  );
  for (const value of Object.values(pose)) assert.ok(Number.isFinite(value));
  assert.ok(Math.abs(pose.upperBodyYaw) <= BOT_ANIMATION_MAX_TORSO_YAW);
  assert.ok(pose.leftKneePitch >= 0.04);
  assert.ok(pose.rightKneePitch >= 0.04);
  assert.ok(pose.leftToeClearance >= BOT_ANIMATION_MIN_TOE_CLEARANCE);
  assert.ok(pose.leftToeClearance <= BOT_ANIMATION_MAX_TOE_CLEARANCE);
});

void test('airborne pose removes gait contacts while preserving a safe knee bend', () => {
  const pose = getBotAnimationPose(
    input({ grounded: false, velocity: { x: 5, z: 5 } }),
  );
  assert.equal(pose.speed, 0);
  assert.equal(pose.leftFootPlant, 0);
  assert.equal(pose.rightFootPlant, 0);
  assert.equal(pose.pelvisLift, 0);
  assert.equal(pose.leftKneePitch, 0.04);
  assert.equal(pose.rightKneePitch, 0.04);
});

void test('stationary grounded stance stays symmetric regardless of phase', () => {
  for (const phase of [0, Math.PI / 3, Math.PI, (5 * Math.PI) / 3]) {
    const pose = getBotAnimationPose(
      input({ phase, velocity: { x: 0, z: 0 }, acceleration: { x: 0, z: 0 } }),
    );
    assert.equal(pose.leftFootPlant, 0.5);
    assert.equal(pose.rightFootPlant, 0.5);
    assert.equal(pose.leftHipPitch, 0);
    assert.equal(pose.rightHipPitch, 0);
    assert.equal(pose.leftKneePitch, pose.rightKneePitch);
    assert.equal(pose.leftKneePitch, 0.1);
    assert.equal(pose.leftAnklePitch, 0);
    assert.equal(pose.rightAnklePitch, 0);
    assert.equal(pose.pelvisLift, 0);
    assert.equal(pose.pelvisWeightShift, 0);
  }
});

void test('half-stride phase swaps mirrored leg and foot behavior', () => {
  const phase = 0.73;
  const first = getBotAnimationPose(
    input({
      phase,
      velocity: { x: 0, z: -BOT_ANIMATION_MAX_SPEED },
      acceleration: { x: 0, z: 0 },
    }),
  );
  const second = getBotAnimationPose(
    input({
      phase: phase + Math.PI,
      velocity: { x: 0, z: -BOT_ANIMATION_MAX_SPEED },
      acceleration: { x: 0, z: 0 },
    }),
  );
  assert.ok(Math.abs(first.leftFootPlant - second.rightFootPlant) < 1e-12);
  assert.ok(Math.abs(first.rightFootPlant - second.leftFootPlant) < 1e-12);
  for (const [left, right] of [
    ['leftHipPitch', 'rightHipPitch'],
    ['leftHipYaw', 'rightHipYaw'],
    ['leftKneePitch', 'rightKneePitch'],
    ['leftAnklePitch', 'rightAnklePitch'],
    ['leftFootOffsetZ', 'rightFootOffsetZ'],
    ['leftToeClearance', 'rightToeClearance'],
  ] as const) {
    assert.ok(Math.abs(first[left] - second[right]) < 1e-12, left);
  }
  assert.ok(Math.abs(first.pelvisLift - second.pelvisLift) < 1e-12);
  assert.ok(
    Math.abs(first.pelvisWeightShift + second.pelvisWeightShift) < 1e-12,
  );
});

void test('strafe acceleration counter-rotates torso and transfers pelvis load', () => {
  const positive = getBotAnimationPose(
    input({
      phase: Math.PI / 2,
      velocity: { x: 3, z: 0 },
      acceleration: { x: 4, z: 0 },
      bodyYaw: 0,
      aimYaw: 0,
    }),
  );
  const negative = getBotAnimationPose(
    input({
      phase: Math.PI / 2,
      velocity: { x: -3, z: 0 },
      acceleration: { x: -4, z: 0 },
      bodyYaw: 0,
      aimYaw: 0,
    }),
  );
  assert.ok(positive.upperBodyYaw < 0);
  assert.ok(negative.upperBodyYaw > 0);
  assert.ok(positive.torsoLeanX < 0);
  assert.ok(negative.torsoLeanX > 0);
  assert.ok(positive.pelvisWeightShift > 0);
  assert.ok(negative.pelvisWeightShift < 0);
  assert.ok(positive.leftHipYaw < 0);
  assert.ok(negative.leftHipYaw > 0);
  assert.ok(Math.abs(positive.upperBodyYaw + negative.upperBodyYaw) < 1e-12);
});

void test('authoritative phase gives equal-time stable samples at 30, 60, and 120 Hz', () => {
  const sampleAt = (hz: number) => {
    const state = createBotAnimationState();
    const pose = createBotAnimationPose();
    const frames = Math.round(hz * 0.8);
    for (let frame = 0; frame <= frames; frame += 1) {
      const time = frame / hz;
      writeBotAnimationPose(
        input({
          dtSeconds: 1 / hz,
          phase: time * 4.1,
        }),
        state,
        pose,
      );
    }
    return pose;
  };
  const thirty = sampleAt(30);
  const sixty = sampleAt(60);
  const oneTwenty = sampleAt(120);
  for (const key of Object.keys(thirty) as Array<keyof typeof thirty>) {
    assert.ok(Math.abs(thirty[key] - sixty[key]) < 0.02, key);
    assert.ok(Math.abs(sixty[key] - oneTwenty[key]) < 0.02, key);
  }
});

void test('step-input angle transitions are time-based across render rates', () => {
  const sampleStepAt = (hz: number, fire: boolean) => {
    const state = createBotAnimationState();
    const pose = createBotAnimationPose();
    const stationary = {
      velocity: { x: 0, z: 0 },
      acceleration: { x: 0, z: 0 },
      bodyYaw: 0,
      phase: 0,
    };
    writeBotAnimationPose(input({ ...stationary, aimYaw: 0 }), state, pose);
    let elapsed = 0;
    let previous = fire ? pose.weaponSocketPitch : pose.upperBodyYaw;
    const samples: number[] = [];
    for (const sampleTime of [0.05, 0.1, 0.15]) {
      while (elapsed < sampleTime - 1e-12) {
        const dt = Math.min(1 / hz, sampleTime - elapsed);
        writeBotAnimationPose(
          input({
            ...stationary,
            aimYaw: 1,
            dtSeconds: dt,
            actions: fire ? { fire: 1 } : {},
          }),
          state,
          pose,
        );
        const current = fire ? pose.weaponSocketPitch : pose.upperBodyYaw;
        if (hz === 30) {
          assert.ok(
            Math.abs(current - previous) <=
              (fire
                ? BOT_ANIMATION_MAX_IMPULSE_ANGLE
                : BOT_ANIMATION_MAX_FRAME_ANGLE) +
                1e-9,
          );
        }
        previous = current;
        elapsed += dt;
      }
      samples.push(fire ? pose.weaponSocketPitch : pose.upperBodyYaw);
    }
    return samples;
  };

  const ordinarySamples = [30, 60, 120].map((hz) => sampleStepAt(hz, false));
  const impulseSamples = [30, 60, 120].map((hz) => sampleStepAt(hz, true));
  for (let index = 0; index < 3; index += 1) {
    assert.ok(
      Math.abs(ordinarySamples[0][index] - ordinarySamples[1][index]) < 1e-10,
    );
    assert.ok(
      Math.abs(ordinarySamples[1][index] - ordinarySamples[2][index]) < 1e-10,
    );
    assert.ok(
      Math.abs(impulseSamples[0][index] - impulseSamples[1][index]) < 1e-10,
    );
    assert.ok(
      Math.abs(impulseSamples[1][index] - impulseSamples[2][index]) < 1e-10,
    );
  }
});

void test('normal pose angular transitions stay within the per-frame budget', () => {
  const state = createBotAnimationState();
  const pose = createBotAnimationPose();
  writeBotAnimationPose(input({ phase: 0, aimYaw: 0 }), state, pose);
  const previous = { ...pose };
  writeBotAnimationPose(input({ phase: 0.15, aimYaw: 1 }), state, pose);
  const angularKeys = [
    'upperBodyYaw',
    'leftHipPitch',
    'rightHipPitch',
    'leftKneePitch',
    'rightKneePitch',
    'leftAnklePitch',
    'rightAnklePitch',
    'leftShoulderPitch',
    'rightShoulderPitch',
    'leftElbowPitch',
    'rightElbowPitch',
    'visualAimPitch',
    'weaponSocketPitch',
    'weaponSocketYaw',
    'weaponSocketRoll',
  ] as const;
  angularKeys.forEach((key) => {
    assert.ok(
      Math.abs(pose[key] - previous[key]) <=
        BOT_ANIMATION_MAX_FRAME_ANGLE + 1e-9,
      key,
    );
  });
});

void test('action impulses are visible and analytically settle within 250 ms', () => {
  const state = createBotAnimationState();
  const pose = createBotAnimationPose();
  writeBotAnimationPose(
    input({ dtSeconds: 0, actions: { fire: 1, reload: 1, hit: 1 } }),
    state,
    pose,
  );
  assert.ok(pose.recoilPitch > 0);
  assert.ok(pose.additivePitch > 0);
  const pulseFrameLimit = Math.ceil(
    BOT_ANIMATION_ACTION_SETTLE_SECONDS / BOT_ANIMATION_MAX_STEP_SECONDS,
  );
  for (let frame = 0; frame < pulseFrameLimit; frame += 1) {
    writeBotAnimationPose(
      input({ dtSeconds: BOT_ANIMATION_MAX_STEP_SECONDS, actions: {} }),
      state,
      pose,
    );
  }
  assert.ok(state.firePulse < 0.01);
  assert.ok(state.reloadPulse < 0.01);
  assert.ok(state.hitPulse < 0.01);
});

void test('foot anchors, offsets, and toe clearance form a drift-calculable seam', () => {
  const pose = getBotAnimationPose(
    input({ phase: Math.PI / 2, velocity: { x: 5.8, z: 0 } }),
  );
  assert.equal(pose.leftFootPlant + pose.rightFootPlant, 1);
  assert.equal(pose.leftFootPlantAnchorX, pose.leftFootOffsetX);
  assert.equal(pose.rightFootPlantAnchorX, pose.rightFootOffsetX);
  assert.ok(
    Math.abs(pose.leftFootPlantAnchorZ) <= Math.abs(pose.leftFootOffsetZ),
  );
  assert.ok(
    Math.abs(pose.rightFootPlantAnchorZ) <= Math.abs(pose.rightFootOffsetZ),
  );
  assert.ok(pose.leftToeClearance >= BOT_ANIMATION_MIN_TOE_CLEARANCE);
  assert.ok(pose.rightToeClearance <= BOT_ANIMATION_MAX_TOE_CLEARANCE);
});

void test('fire impulse angle remains within the documented exceptional budget', () => {
  const state = createBotAnimationState();
  const pose = createBotAnimationPose();
  writeBotAnimationPose(input({ dtSeconds: 0 }), state, pose);
  const previous = pose.weaponSocketPitch;
  writeBotAnimationPose(
    input({ dtSeconds: 1 / 30, actions: { fire: 1 } }),
    state,
    pose,
  );
  assert.ok(
    Math.abs(pose.weaponSocketPitch - previous) <=
      BOT_ANIMATION_MAX_IMPULSE_ANGLE + 1e-9,
  );
});
