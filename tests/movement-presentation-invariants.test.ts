import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceBotStridePhase,
  stepBotBodyYaw,
  stepBotGroundVelocity,
} from '../app/bot-locomotion.ts';
import { getBotAnimationPose } from '../app/bot-animation.ts';
import {
  createPlayerPresentationState,
  stepPlayerPresentation,
} from '../app/player-presentation.ts';
import {
  assertMovementPresentationInvariant,
  compareMovementPresentationTrace,
  formatMovementInvariantReport,
  MOVEMENT_PRESENTATION_TRACE_DELTAS,
  type MovementAuthoritativeSnapshot,
  runMovementPresentationTrace,
} from '../app/movement-presentation-invariants.ts';

type SimState = {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  yawRadians: number;
  elapsedSeconds: number;
  phase: number;
  fireTimeMs: number | null;
  objectiveTimeMs: number | null;
  footstepTimeMs: number | null;
  rngState: number;
  rngCalls: number;
};

const initialState = (): SimState => ({
  position: { x: -2, y: 0, z: 7 },
  velocity: { x: 0, y: 0, z: -3.8 },
  yawRadians: 0.3,
  elapsedSeconds: 0,
  phase: 0.2,
  fireTimeMs: null,
  objectiveTimeMs: null,
  footstepTimeMs: null,
  rngState: 0x12345678,
  rngCalls: 0,
});

const cloneState = (state: SimState): SimState => ({
  ...state,
  position: { ...state.position },
  velocity: { ...state.velocity },
});

const snapshot = (state: SimState): MovementAuthoritativeSnapshot => ({
  position: { ...state.position },
  velocity: { ...state.velocity },
  yawRadians: state.yawRadians,
  fireTimeMs: state.fireTimeMs,
  objectiveTimeMs: state.objectiveTimeMs,
  footstepTimeMs: state.footstepTimeMs,
  rng: { consumed: state.rngCalls, state: state.rngState },
});

// This stands in for the simulation's seeded RNG. Presentation callbacks never
// receive the generator, so a render pass cannot consume an authoritative draw.
const consumeAuthoritativeRandom = (state: SimState): void => {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  state.rngCalls += 1;
};

const markAuthoritativeEvents = (state: SimState, frameIndex: number): void => {
  if (frameIndex === 2) state.fireTimeMs = state.elapsedSeconds * 1000;
  if (frameIndex === 4) state.objectiveTimeMs = state.elapsedSeconds * 1000;
  if (frameIndex === 6) state.footstepTimeMs = state.elapsedSeconds * 1000;
};

const stepBot = (state: SimState, dtSeconds: number, frameIndex: number) => {
  const velocity = stepBotGroundVelocity({
    weapon: 'rifle', scoped: false, grounded: true,
    velocity: state.velocity,
    desiredVelocity: { x: 2.2, z: -3.8 },
    dtSeconds,
  });
  state.velocity = { x: velocity.velocity.x, y: 0, z: velocity.velocity.z };
  state.position = {
    x: state.position.x + state.velocity.x * dtSeconds,
    y: state.position.y,
    z: state.position.z + state.velocity.z * dtSeconds,
  };
  state.yawRadians = stepBotBodyYaw(
    state.yawRadians,
    Math.atan2(state.velocity.x, -state.velocity.z),
    dtSeconds,
  );
  state.phase = advanceBotStridePhase(
    state.phase,
    velocity.speed,
    dtSeconds,
    true,
  );
  state.elapsedSeconds += dtSeconds;
  consumeAuthoritativeRandom(state);
  markAuthoritativeEvents(state, frameIndex);
  return { state, authoritative: snapshot(state) };
};

const stepPlayer = (state: SimState, dtSeconds: number, frameIndex: number) => {
  state.position = {
    x: state.position.x + state.velocity.x * dtSeconds,
    y: state.position.y,
    z: state.position.z + state.velocity.z * dtSeconds,
  };
  state.yawRadians += 0.04 * dtSeconds;
  state.phase = (state.phase + 2.1 * dtSeconds) % (Math.PI * 2);
  state.elapsedSeconds += dtSeconds;
  consumeAuthoritativeRandom(state);
  markAuthoritativeEvents(state, frameIndex);
  return { state, authoritative: snapshot(state) };
};

void test('runner compares bot movement traces across all requested frame deltas', () => {
  for (const dtSeconds of MOVEMENT_PRESENTATION_TRACE_DELTAS) {
    const trace = runMovementPresentationTrace({
      kind: 'bot',
      initialState: initialState(),
      dtSeconds: Array.from({ length: 8 }, () => dtSeconds),
      cloneState,
      stepAuthoritative: stepBot,
      computePresentation: (authoritative, dt, frameIndex) =>
        getBotAnimationPose({
          dtSeconds: dt,
          velocity: authoritative.velocity,
          acceleration: { x: 2, z: 0 },
          bodyYaw: authoritative.yawRadians,
          aimYaw: authoritative.yawRadians + 0.2,
          grounded: true,
          phase: 0.2 + frameIndex * 0.1,
          actions: { fire: frameIndex === 2 ? 1 : 0 },
        }),
    });
    const report = compareMovementPresentationTrace(trace);
    assertMovementPresentationInvariant(report);
    assert.equal(trace.presentation.length, 8);
    assert.match(
      formatMovementInvariantReport(report),
      /^bot: 8 frames invariant$/,
    );
  }
});

void test('runner compares player movement traces without changing event or RNG inputs', () => {
  for (const dtSeconds of MOVEMENT_PRESENTATION_TRACE_DELTAS) {
    let presentationState = createPlayerPresentationState(0.3, 0, 0.2);
    const trace = runMovementPresentationTrace({
      kind: 'player',
      initialState: initialState(),
      dtSeconds: Array.from({ length: 8 }, () => dtSeconds),
      cloneState,
      stepAuthoritative: stepPlayer,
      computePresentation: (authoritative, dt, frameIndex) => {
        const frame = stepPlayerPresentation(
          {
            dtSeconds: dt,
            velocity: {
              forward: -authoritative.velocity.z,
              strafe: authoritative.velocity.x,
              speed: Math.hypot(
                authoritative.velocity.x,
                authoritative.velocity.z,
              ),
            },
            acceleration: { forward: 0, strafe: 0 },
            grounded: true,
            locomotionPhase: 0.2 + frameIndex * 0.1,
            authoritativeYawRadians: authoritative.yawRadians,
            authoritativePitchRadians: 0,
          },
          presentationState,
        );
        presentationState = frame.state;
        return frame.pose;
      },
    });
    const report = compareMovementPresentationTrace(trace);
    assertMovementPresentationInvariant(report);
    assert.equal(trace.presentation.length, 8);
    assert.match(
      formatMovementInvariantReport(report),
      /^player: 8 frames invariant$/,
    );
  }
});

void test('comparison report identifies a changed authoritative channel', () => {
  const trace = runMovementPresentationTrace({
    kind: 'player',
    initialState: initialState(),
    dtSeconds: [1 / 60],
    cloneState,
    stepAuthoritative: stepPlayer,
    computePresentation: () => undefined,
  });
  const changed = {
    ...trace,
    withPresentation: [
      {
        ...trace.withPresentation[0],
        authoritative: {
          ...trace.withPresentation[0].authoritative,
          yawRadians: trace.withPresentation[0].authoritative.yawRadians + 1,
        },
      },
    ],
  };
  const report = compareMovementPresentationTrace(changed);
  assert.equal(report.equal, false);
  assert.deepEqual(
    report.differences.map(({ field }) => field),
    ['yawRadians'],
  );
  assert.throws(
    () => assertMovementPresentationInvariant(report),
    /yawRadians/,
  );
});
