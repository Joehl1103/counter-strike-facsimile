/**
 * Pure first-person player presentation.
 *
 * The game rules own movement, collision, and aim. This module only composes
 * bounded render offsets from snapshots of that state. It deliberately has no
 * Three.js or wall-clock dependency, so it can be stepped by the simulation
 * and tested with ordinary data.
 */

export const PLAYER_PRESENTATION_MAX_STEP_SECONDS = 0.05;
export const PLAYER_PRESENTATION_REFERENCE_SPEED = 4.55;
export const PLAYER_PRESENTATION_REFERENCE_ACCELERATION = 10;
export const PLAYER_PRESENTATION_STRIDE_LENGTH = 1.85;
export const PLAYER_PRESENTATION_PHASE_PERIOD = Math.PI * 2;
export const PLAYER_PRESENTATION_LANDING_SECONDS = 0.2;

// These are deliberately small. Each translation vector is normalized to the
// aggregate 4 cm limit below after its cue is composed.
export const PLAYER_PRESENTATION_MAX_TRANSLATION = 0.04;
export const PLAYER_PRESENTATION_MAX_ROLL = 0.03;

export const PLAYER_PRESENTATION_CAMERA_RESPONSE = 20;
export const PLAYER_PRESENTATION_VIEWMODEL_RESPONSE = 24;
export const PLAYER_PRESENTATION_LANDING_RESPONSE = 22;
/** Small lateral head sway keeps forward gait from feeling mechanically vertical. */
export const PLAYER_PRESENTATION_CAMERA_SWAY = 0.0015;

export type PlayerPresentationVector = Readonly<{
  forward?: number;
  strafe?: number;
  /** World-axis aliases are useful when the caller already transformed data. */
  x?: number;
  z?: number;
  speed?: number;
}>;

export type PlayerPresentationAcceleration = Readonly<{
  forward?: number;
  strafe?: number;
  x?: number;
  z?: number;
}>;

export type PlayerPresentationStance =
  | 'standing'
  | 'walking'
  | 'crouching'
  | Readonly<{
      walking?: boolean;
      crouching?: boolean;
    }>;

export type PlayerPresentationInput = Readonly<{
  dtSeconds: number;
  /** Actual local velocity. `velocity` is accepted as a convenient alias. */
  localVelocity?: PlayerPresentationVector;
  velocity?: PlayerPresentationVector;
  /** Actual local acceleration. `acceleration` is accepted as an alias. */
  localAcceleration?: PlayerPresentationAcceleration;
  acceleration?: PlayerPresentationAcceleration;
  stance?: PlayerPresentationStance;
  walking?: boolean;
  crouching?: boolean;
  grounded: boolean;
  /** A one-frame landing event, or the simulation's remaining recovery time. */
  landing?: boolean;
  landingRecoverySeconds?: number;
  /** Current authoritative look snapshot. Never modified by this module. */
  authoritativeYawRadians?: number;
  authoritativePitchRadians?: number;
  yawRadians?: number;
  pitchRadians?: number;
  /** Optional authoritative stride phase; otherwise the module advances it. */
  locomotionPhase?: number;
  phase?: number;
}>;

export type PlayerPresentationOffset = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type PlayerPresentationState = Readonly<{
  phase: number;
  landing: number;
  cameraOffset: PlayerPresentationOffset;
  cameraRoll: number;
  viewmodelOffset: PlayerPresentationOffset;
  viewmodelPitch: number;
  viewmodelRoll: number;
  authoritativeYawRadians: number;
  authoritativePitchRadians: number;
}>;

export type PlayerPresentationPose = Readonly<{
  phase: number;
  speed: number;
  localVelocity: Readonly<{ forward: number; strafe: number; speed: number }>;
  localAcceleration: PlayerPresentationAcceleration;
  authoritativeYawRadians: number;
  authoritativePitchRadians: number;
  cameraOffset: PlayerPresentationOffset;
  cameraRoll: number;
  viewmodelOffset: PlayerPresentationOffset;
  viewmodelPitch: number;
  viewmodelRoll: number;
  /** Explicitly unchanged aim channels for future page integration. */
  cameraYawRadians: number;
  cameraPitchRadians: number;
}>;

export type PlayerPresentationFrame = Readonly<{
  state: PlayerPresentationState;
  pose: PlayerPresentationPose;
}>;

const ZERO_OFFSET: PlayerPresentationOffset = { x: 0, y: 0, z: 0 };

function finiteOr(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  const result = Math.min(maximum, Math.max(minimum, value));
  return result === 0 ? 0 : result;
}

function damp(current: number, target: number, dt: number, response: number) {
  if (dt <= 0 || response <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-response * dt));
}

function wrapPhase(phase: number): number {
  const wrapped = finiteOr(phase) % PLAYER_PRESENTATION_PHASE_PERIOD;
  return wrapped < 0 ? wrapped + PLAYER_PRESENTATION_PHASE_PERIOD : wrapped;
}

function sanitizeOffset(
  offset: PlayerPresentationOffset,
): PlayerPresentationOffset {
  return {
    x: finiteOr(offset.x),
    y: finiteOr(offset.y),
    z: finiteOr(offset.z),
  };
}

function capOffset(offset: PlayerPresentationOffset): PlayerPresentationOffset {
  const safe = sanitizeOffset(offset);
  const length = Math.hypot(safe.x, safe.y, safe.z);
  if (length <= PLAYER_PRESENTATION_MAX_TRANSLATION || length === 0)
    return safe;
  const scale = PLAYER_PRESENTATION_MAX_TRANSLATION / length;
  return { x: safe.x * scale, y: safe.y * scale, z: safe.z * scale };
}

function stanceAmplitude(stance: PlayerPresentationStance | undefined): number {
  if (stance === 'crouching') return 0.42;
  if (stance === 'walking') return 0.68;
  if (stance === 'standing' || stance === undefined) return 1;
  if (stance.crouching) return 0.42;
  if (stance.walking) return 0.68;
  return 1;
}

function readVelocity(input: PlayerPresentationInput) {
  const source = input.localVelocity ?? input.velocity;
  const forward = finiteOr(source?.forward ?? source?.z);
  const strafe = finiteOr(source?.strafe ?? source?.x);
  const sourceSpeed = finiteOr(source?.speed, Number.NaN);
  const speed = Number.isFinite(sourceSpeed)
    ? Math.max(0, sourceSpeed)
    : Math.hypot(forward, strafe);
  return {
    forward,
    strafe,
    speed: Number.isFinite(speed) ? speed : 0,
  };
}

function readAcceleration(input: PlayerPresentationInput) {
  const source = input.localAcceleration ?? input.acceleration;
  return {
    forward: clamp(finiteOr(source?.forward ?? source?.z), -50, 50),
    strafe: clamp(finiteOr(source?.strafe ?? source?.x), -50, 50),
  };
}

function readStance(input: PlayerPresentationInput): number {
  if (input.crouching === true) return 0.42;
  if (input.walking === true) return 0.68;
  return stanceAmplitude(input.stance);
}

function readLanding(input: PlayerPresentationInput): number {
  const recovery = clamp(
    finiteOr(input.landingRecoverySeconds),
    0,
    PLAYER_PRESENTATION_LANDING_SECONDS,
  );
  return input.landing === true
    ? 1
    : recovery / PLAYER_PRESENTATION_LANDING_SECONDS;
}

function readAim(input: PlayerPresentationInput) {
  return {
    yaw: finiteOr(input.authoritativeYawRadians ?? input.yawRadians),
    pitch: finiteOr(input.authoritativePitchRadians ?? input.pitchRadians),
  };
}

function targetPose(
  input: PlayerPresentationInput,
  phase: number,
  landing: number,
): {
  cameraOffset: PlayerPresentationOffset;
  cameraRoll: number;
  viewmodelOffset: PlayerPresentationOffset;
  viewmodelPitch: number;
  viewmodelRoll: number;
} {
  const velocity = readVelocity(input);
  const acceleration = readAcceleration(input);
  const grounded = input.grounded === true;
  const movement = grounded
    ? clamp(velocity.speed / PLAYER_PRESENTATION_REFERENCE_SPEED, 0, 1)
    : 0;
  const stance = readStance(input);
  const amount = movement * stance;
  const forward = clamp(
    velocity.forward / PLAYER_PRESENTATION_REFERENCE_SPEED,
    -1,
    1,
  );
  const strafe = clamp(
    velocity.strafe / PLAYER_PRESENTATION_REFERENCE_SPEED,
    -1,
    1,
  );
  const accelerationForward = clamp(
    acceleration.forward / PLAYER_PRESENTATION_REFERENCE_ACCELERATION,
    -1,
    1,
  );
  const accelerationStrafe = clamp(
    acceleration.strafe / PLAYER_PRESENTATION_REFERENCE_ACCELERATION,
    -1,
    1,
  );
  const doublePhase = phase * 2;
  const verticalWave = (Math.cos(doublePhase) - 1) * 0.5;
  const sideWave = Math.sin(doublePhase);
  const landingY = landing * 0.015;

  // Acceleration leans opposite the force; velocity cues preserve signed
  // strafe/forward direction so left/right and braking remain readable.
  return {
    cameraOffset: capOffset({
      x:
        sideWave * PLAYER_PRESENTATION_CAMERA_SWAY * amount -
        accelerationStrafe * 0.004 * amount,
      y: verticalWave * 0.008 * amount - landingY,
      z: -accelerationForward * 0.003 * amount,
    }),
    cameraRoll: clamp(
      strafe * 0.012 * amount + accelerationStrafe * 0.006 * amount,
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
    viewmodelOffset: capOffset({
      x: strafe * 0.012 * amount - accelerationStrafe * 0.004 * amount,
      y: verticalWave * 0.008 * amount - landingY,
      z: -forward * 0.01 * amount - accelerationForward * 0.003 * amount,
    }),
    viewmodelPitch: clamp(
      landing * 0.02 + accelerationForward * 0.004 * amount,
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
    viewmodelRoll: clamp(
      sideWave * 0.008 * amount + strafe * 0.01 * amount,
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
  };
}

export function createPlayerPresentationState(
  authoritativeYawRadians = 0,
  authoritativePitchRadians = 0,
  phase = 0,
): PlayerPresentationState {
  return {
    phase: wrapPhase(phase),
    landing: 0,
    cameraOffset: ZERO_OFFSET,
    cameraRoll: 0,
    viewmodelOffset: ZERO_OFFSET,
    viewmodelPitch: 0,
    viewmodelRoll: 0,
    authoritativeYawRadians: finiteOr(authoritativeYawRadians),
    authoritativePitchRadians: finiteOr(authoritativePitchRadians),
  };
}

export function advancePlayerPresentation(
  state: PlayerPresentationState,
  input: PlayerPresentationInput,
): PlayerPresentationState {
  const safeState: PlayerPresentationState = {
    phase: wrapPhase(state?.phase),
    landing: clamp(finiteOr(state?.landing), 0, 1),
    cameraOffset: capOffset(state?.cameraOffset ?? ZERO_OFFSET),
    cameraRoll: clamp(
      finiteOr(state?.cameraRoll),
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
    viewmodelOffset: capOffset(state?.viewmodelOffset ?? ZERO_OFFSET),
    viewmodelPitch: clamp(
      finiteOr(state?.viewmodelPitch),
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
    viewmodelRoll: clamp(
      finiteOr(state?.viewmodelRoll),
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
    authoritativeYawRadians: finiteOr(state?.authoritativeYawRadians),
    authoritativePitchRadians: finiteOr(state?.authoritativePitchRadians),
  };
  const dt = clamp(
    finiteOr(input.dtSeconds),
    0,
    PLAYER_PRESENTATION_MAX_STEP_SECONDS,
  );
  const velocity = readVelocity(input);
  const safePhase = wrapPhase(
    input.locomotionPhase ?? input.phase ?? safeState.phase,
  );
  const nextPhase =
    input.locomotionPhase !== undefined || input.phase !== undefined
      ? safePhase
      : input.grounded === true && velocity.speed > 0
        ? wrapPhase(
            safePhase +
              (velocity.speed * dt * PLAYER_PRESENTATION_PHASE_PERIOD) /
                PLAYER_PRESENTATION_STRIDE_LENGTH,
          )
        : safePhase;
  const nextLanding = damp(
    safeState.landing,
    readLanding(input),
    dt,
    PLAYER_PRESENTATION_LANDING_RESPONSE,
  );
  const target = targetPose(input, nextPhase, nextLanding);
  const cameraOffset = {
    x: damp(
      safeState.cameraOffset.x,
      target.cameraOffset.x,
      dt,
      PLAYER_PRESENTATION_CAMERA_RESPONSE,
    ),
    y: damp(
      safeState.cameraOffset.y,
      target.cameraOffset.y,
      dt,
      PLAYER_PRESENTATION_CAMERA_RESPONSE,
    ),
    z: damp(
      safeState.cameraOffset.z,
      target.cameraOffset.z,
      dt,
      PLAYER_PRESENTATION_CAMERA_RESPONSE,
    ),
  };
  const viewmodelOffset = {
    x: damp(
      safeState.viewmodelOffset.x,
      target.viewmodelOffset.x,
      dt,
      PLAYER_PRESENTATION_VIEWMODEL_RESPONSE,
    ),
    y: damp(
      safeState.viewmodelOffset.y,
      target.viewmodelOffset.y,
      dt,
      PLAYER_PRESENTATION_VIEWMODEL_RESPONSE,
    ),
    z: damp(
      safeState.viewmodelOffset.z,
      target.viewmodelOffset.z,
      dt,
      PLAYER_PRESENTATION_VIEWMODEL_RESPONSE,
    ),
  };
  return {
    phase: nextPhase,
    landing: clamp(finiteOr(nextLanding), 0, 1),
    cameraOffset: capOffset(cameraOffset),
    cameraRoll: clamp(
      damp(
        safeState.cameraRoll,
        target.cameraRoll,
        dt,
        PLAYER_PRESENTATION_CAMERA_RESPONSE,
      ),
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
    viewmodelOffset: capOffset(viewmodelOffset),
    viewmodelPitch: clamp(
      damp(
        safeState.viewmodelPitch,
        target.viewmodelPitch,
        dt,
        PLAYER_PRESENTATION_VIEWMODEL_RESPONSE,
      ),
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
    viewmodelRoll: clamp(
      damp(
        safeState.viewmodelRoll,
        target.viewmodelRoll,
        dt,
        PLAYER_PRESENTATION_VIEWMODEL_RESPONSE,
      ),
      -PLAYER_PRESENTATION_MAX_ROLL,
      PLAYER_PRESENTATION_MAX_ROLL,
    ),
    authoritativeYawRadians: readAim(input).yaw,
    authoritativePitchRadians: readAim(input).pitch,
  };
}

export function composePlayerPresentationPose(
  state: PlayerPresentationState,
  input: PlayerPresentationInput,
): PlayerPresentationPose {
  const velocity = readVelocity(input);
  const frame = advancePlayerPresentation(state, input);
  const aim = readAim(input);
  return composePoseFromState(frame, input, aim, velocity);
}

function composePoseFromState(
  state: PlayerPresentationState,
  input: PlayerPresentationInput,
  aim = readAim(input),
  velocity = readVelocity(input),
): PlayerPresentationPose {
  return {
    phase: state.phase,
    speed: velocity.speed,
    localVelocity: velocity,
    localAcceleration: readAcceleration(input),
    authoritativeYawRadians: aim.yaw,
    authoritativePitchRadians: aim.pitch,
    cameraOffset: state.cameraOffset,
    cameraRoll: state.cameraRoll,
    viewmodelOffset: state.viewmodelOffset,
    viewmodelPitch: state.viewmodelPitch,
    viewmodelRoll: state.viewmodelRoll,
    cameraYawRadians: aim.yaw,
    cameraPitchRadians: aim.pitch,
  };
}

/** One-call immutable step for integrations that keep the returned state. */
export function stepPlayerPresentation(
  input: PlayerPresentationInput,
  state = createPlayerPresentationState(),
): PlayerPresentationFrame {
  const nextState = advancePlayerPresentation(state, input);
  return {
    state: nextState,
    pose: composePoseFromState(nextState, input),
  };
}

export function getPlayerPresentationPose(
  input: PlayerPresentationInput,
  state = createPlayerPresentationState(),
): PlayerPresentationPose {
  return stepPlayerPresentation(input, state).pose;
}
