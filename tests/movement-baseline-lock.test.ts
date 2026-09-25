import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceBotStridePhase,
  BOT_BODY_MAX_TURN_RATE,
  BOT_BODY_TURN_RESPONSE,
  BOT_LOCOMOTION_MAX_STEP_SECONDS,
  stepBotBodyYaw,
  stepBotGroundVelocity,
} from '../app/bot-locomotion.ts';
import { stepHorizontalVelocity } from '../app/game-rules.ts';
import {
  advanceLocomotionPhase,
  advancePlayerLocomotion,
  getLocalLocomotionVelocity,
  PLAYER_LOCOMOTION_MAX_STEP_SECONDS,
  PLAYER_LOCOMOTION_PHASE_PERIOD,
  PLAYER_LOCOMOTION_REFERENCE_SPEED,
  PLAYER_LOCOMOTION_STRIDE_LENGTH,
} from '../app/player-locomotion.ts';

const round = (value: number): number =>
  Object.is(value, -0) ? 0 : Number(value.toFixed(12));

const roundVector = (vector: { x: number; z: number }) => ({
  x: round(vector.x),
  z: round(vector.z),
});

const runBotVelocityTrace = (
  initialVelocity: { x: number; z: number },
  desiredVelocity: { x: number; z: number },
  dtTrace: readonly number[],
) => {
  let velocity = initialVelocity;
  return dtTrace.map((dtSeconds) => {
    const step = stepBotGroundVelocity({
      velocity,
      desiredVelocity,
      dtSeconds,
      weapon: 'rifle', scoped: false, grounded: true,
    });
    velocity = step.velocity;
    return {
      velocity: roundVector(step.velocity),
      acceleration: roundVector(step.acceleration),
      speed: round(step.speed),
    };
  });
};

const assertFiniteNumbers = (value: unknown): void => {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertFiniteNumbers);
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(assertFiniteNumbers);
  }
};

void test('bot velocity traces use the previously accepted production player oracle', () => {
  assert.equal(BOT_LOCOMOTION_MAX_STEP_SECONDS, 0.05);
  const cases = [
    { initial: { x: 0, z: 0 }, desired: { x: 4, z: 0 }, deltas: [0.016, 0.016, 0.018, 0.05] },
    { initial: { x: 4, z: 0 }, desired: { x: 4, z: 0 }, deltas: [0.016, 0.033, 0.05] },
    { initial: { x: 4, z: 0 }, desired: { x: 0, z: 0 }, deltas: [0.016, 0.033, 0.05] },
    { initial: { x: 2.5, z: -1.5 }, desired: { x: 2.5, z: -1.5 }, deltas: [0.001, 0.02, 0.05] },
  ];
  for (const { initial, desired, deltas } of cases) {
    let velocity = initial;
    const expected = deltas.map((dtSeconds) => {
      const next = stepHorizontalVelocity({ velocity, wishDirection: desired,
        maxSpeed: Math.hypot(desired.x, desired.z), dtSeconds, grounded: true });
      const step = { velocity: roundVector(next), speed: round(Math.hypot(next.x, next.z)),
        acceleration: roundVector({ x: (next.x - velocity.x) / dtSeconds, z: (next.z - velocity.z) / dtSeconds }) };
      velocity = next;
      return step;
    });
    const actual = runBotVelocityTrace(initial, desired, deltas);
    assert.deepEqual(actual, expected);
    assertFiniteNumbers(actual);
  }
});

void test('bot shortest body-yaw and stride traces remain baseline-locked', () => {
  assert.equal(BOT_BODY_TURN_RESPONSE, 10);
  assert.equal(BOT_BODY_MAX_TURN_RATE, 8);

  let bodyYaw = Math.PI - 0.35;
  const yawTrace = [0.016, 0.024, 0.05].map((dtSeconds) => {
    bodyYaw = stepBotBodyYaw(bodyYaw, -Math.PI + 0.35, dtSeconds);
    return round(bodyYaw);
  });
  assert.deepEqual(yawTrace, [2.895092001313, 3.022368621365, -3.076191415408]);
  assert.ok(yawTrace.every((yaw) => yaw >= -Math.PI && yaw <= Math.PI));

  let phase = 0;
  const phaseTrace = [0.016, 0.033, 0.05].map((dtSeconds) => {
    phase = advanceBotStridePhase(phase, 4.2, dtSeconds, true);
    return round(phase);
  });
  assert.deepEqual(
    phaseTrace,
    [0.228232460888, 0.698961911469, 1.412188351743],
  );
  assertFiniteNumbers({ yawTrace, phaseTrace });
});

void test('player movement integration primitives remain baseline-locked', () => {
  assert.equal(PLAYER_LOCOMOTION_MAX_STEP_SECONDS, 0.05);
  assert.equal(PLAYER_LOCOMOTION_REFERENCE_SPEED, 4.55);
  assert.equal(PLAYER_LOCOMOTION_STRIDE_LENGTH, 1.85);
  assert.equal(PLAYER_LOCOMOTION_PHASE_PERIOD, Math.PI * 2);

  const localVelocity = getLocalLocomotionVelocity(
    { x: 3, z: -4 },
    Math.PI / 2,
  );
  assert.deepEqual(
    {
      forward: round(localVelocity.forward),
      strafe: round(localVelocity.strafe),
      speed: round(localVelocity.speed),
    },
    { forward: -3, strafe: 4, speed: 5 },
  );

  let phase = 0;
  const forwardTrace = [0.016, 0.034, 0.05].map((dtSeconds) => {
    const step = advancePlayerLocomotion({
      velocity: { x: 0, z: -4.2 },
      yawRadians: 0,
      phase,
      dtSeconds,
      grounded: true,
      crouching: false,
      walking: false,
    });
    phase = step.phase;
    return {
      phase: round(step.phase),
      previousPhase: round(step.previousPhase),
      dtSeconds: round(step.dtSeconds),
      distance: round(step.distance),
      localVelocity: {
        forward: round(step.localVelocity.forward),
        strafe: round(step.localVelocity.strafe),
        speed: round(step.localVelocity.speed),
      },
      footstepCrossed: step.footstepCrossed,
    };
  });
  assert.deepEqual(forwardTrace, [
    {
      phase: 0.228232460888,
      previousPhase: 0,
      dtSeconds: 0.016,
      distance: 0.0672,
      localVelocity: { forward: 4.2, strafe: 0, speed: 4.2 },
      footstepCrossed: false,
    },
    {
      phase: 0.713226440274,
      previousPhase: 0.228232460888,
      dtSeconds: 0.034,
      distance: 0.1428,
      localVelocity: { forward: 4.2, strafe: 0, speed: 4.2 },
      footstepCrossed: false,
    },
    {
      phase: 1.426452880549,
      previousPhase: 0.713226440274,
      dtSeconds: 0.05,
      distance: 0.21,
      localVelocity: { forward: 4.2, strafe: 0, speed: 4.2 },
      footstepCrossed: false,
    },
  ]);

  const airborne = advancePlayerLocomotion({
    velocity: { x: 0, z: -4.2 },
    yawRadians: 0,
    phase: 1.2,
    dtSeconds: 0.05,
    grounded: false,
    crouching: false,
    walking: false,
  });
  assert.deepEqual(
    {
      phase: round(airborne.phase),
      previousPhase: round(airborne.previousPhase),
      distance: round(airborne.distance),
      footstepCrossed: airborne.footstepCrossed,
    },
    {
      phase: 1.2,
      previousPhase: 1.2,
      distance: 0,
      footstepCrossed: false,
    },
  );
  assertFiniteNumbers({ localVelocity, forwardTrace, airborne });

  // Keep the direct phase primitive locked alongside the composed helper.
  assert.equal(
    round(advanceLocomotionPhase(0, 4.2, 0.05, true)),
    0.713226440274,
  );
});
