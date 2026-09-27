/**
 * Pure player locomotion presentation helpers.
 *
 * The simulation owns velocity and grounded state. This module only turns
 * traveled distance into a stable stride phase and small additive camera /
 * viewmodel offsets. It intentionally has no Three.js dependency so it can be
 * used by the simulation and tested in Node.
 */

export const PLAYER_LOCOMOTION_MAX_STEP_SECONDS = 0.05;
export const PLAYER_LOCOMOTION_REFERENCE_SPEED = 4.55;
export const PLAYER_LOCOMOTION_STRIDE_LENGTH = 1.85;
export const PLAYER_LOCOMOTION_PHASE_PERIOD = Math.PI * 2;
export const PLAYER_LOCOMOTION_FOOTSTEP_PHASES = [0, Math.PI] as const;
export const PLAYER_LOCOMOTION_LANDING_RECOVERY_SECONDS = 0.2;

export const PLAYER_CAMERA_BOB_Y = 0.011;
export const PLAYER_CAMERA_STRAFE_ROLL = 0.009;
export const PLAYER_VIEWMODEL_BOB_Y = 0.018;
export const PLAYER_VIEWMODEL_STRAFE_X = 0.009;
export const PLAYER_VIEWMODEL_FORWARD_Z = 0.008;
export const PLAYER_VIEWMODEL_ROLL = 0.014;
export const PLAYER_LANDING_CAMERA_Y = 0.018;
export const PLAYER_LANDING_CAMERA_PITCH = 0.022;
export const PLAYER_LANDING_VIEWMODEL_Y = 0.018;
export const PLAYER_LANDING_VIEWMODEL_PITCH = 0.022;

export const PLAYER_CAMERA_Y_BOUNDS = 0.04;
export const PLAYER_CAMERA_PITCH_BOUNDS = 0.04;
export const PLAYER_CAMERA_ROLL_BOUNDS = 0.03;
export const PLAYER_VIEWMODEL_X_BOUNDS = 0.02;
export const PLAYER_VIEWMODEL_Y_BOUNDS = 0.04;
export const PLAYER_VIEWMODEL_Z_BOUNDS = 0.02;
export const PLAYER_VIEWMODEL_PITCH_BOUNDS = 0.04;
export const PLAYER_VIEWMODEL_ROLL_BOUNDS = 0.03;

export type LocomotionVelocity = Readonly<{ x: number; z: number }>;

export type LocalLocomotionVelocity = Readonly<{
  forward: number;
  strafe: number;
  speed: number;
}>;

export type PlayerLocomotionInput = Readonly<{
  velocity: LocomotionVelocity;
  yawRadians: number;
  phase: number;
  dtSeconds: number;
  grounded: boolean;
  crouching: boolean;
  walking: boolean;
  landingRecoverySeconds?: number;
}>;

export type PlayerLocomotionPose = Readonly<{
  phase: number;
  speed: number;
  forwardSpeed: number;
  strafeSpeed: number;
  cameraY: number;
  cameraPitch: number;
  cameraRoll: number;
  viewX: number;
  viewY: number;
  viewZ: number;
  viewPitch: number;
  viewRoll: number;
  footstepCrossed: boolean;
}>;

export type PlayerLocomotionStep = Readonly<{
  phase: number;
  previousPhase: number;
  dtSeconds: number;
  distance: number;
  localVelocity: LocalLocomotionVelocity;
  footstepCrossed: boolean;
}>;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  const clamped = Math.min(Math.max(value, minimum), maximum);
  return clamped === 0 ? 0 : clamped;
}

export function clampPlayerLocomotionDelta(dtSeconds: number): number {
  return clamp(finiteOr(dtSeconds, 0), 0, PLAYER_LOCOMOTION_MAX_STEP_SECONDS);
}

export function wrapLocomotionPhase(phase: number): number {
  const normalized = finiteOr(phase, 0) % PLAYER_LOCOMOTION_PHASE_PERIOD;
  return normalized < 0
    ? normalized + PLAYER_LOCOMOTION_PHASE_PERIOD
    : normalized;
}

export function getLocalLocomotionVelocity(
  velocity: LocomotionVelocity,
  yawRadians: number,
): LocalLocomotionVelocity {
  const x = finiteOr(velocity.x, 0);
  const z = finiteOr(velocity.z, 0);
  const yaw = finiteOr(yawRadians, 0);
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);

  // The game camera faces -Z at yaw 0. Right is (cos(yaw), -sin(yaw)).
  const forwardValue = -(x * sinYaw + z * cosYaw);
  const strafeValue = x * cosYaw - z * sinYaw;
  return {
    forward: forwardValue === 0 ? 0 : forwardValue,
    strafe: strafeValue === 0 ? 0 : strafeValue,
    speed: Math.hypot(x, z),
  };
}

export function advanceLocomotionPhase(
  phase: number,
  speed: number,
  dtSeconds: number,
  grounded: boolean,
  strideLength = PLAYER_LOCOMOTION_STRIDE_LENGTH,
): number {
  const safePhase = wrapLocomotionPhase(phase);
  const safeDt = clampPlayerLocomotionDelta(dtSeconds);
  const safeSpeed = Math.max(0, finiteOr(speed, 0));
  const safeStrideLength = Math.max(finiteOr(strideLength, 0), 0.001);
  if (!grounded || safeDt === 0 || safeSpeed === 0) return safePhase;
  return wrapLocomotionPhase(
    safePhase +
      (safeSpeed * safeDt * PLAYER_LOCOMOTION_PHASE_PERIOD) / safeStrideLength,
  );
}

function crossedPhaseBoundary(
  previousPhase: number,
  nextPhase: number,
  boundary: number,
): boolean {
  const previous = wrapLocomotionPhase(previousPhase);
  const next = wrapLocomotionPhase(nextPhase);
  const target = wrapLocomotionPhase(boundary);
  const travel =
    (next - previous + PLAYER_LOCOMOTION_PHASE_PERIOD) %
    PLAYER_LOCOMOTION_PHASE_PERIOD;
  if (travel === 0) return false;
  const rawDistanceToTarget =
    (target - previous + PLAYER_LOCOMOTION_PHASE_PERIOD) %
    PLAYER_LOCOMOTION_PHASE_PERIOD;
  // Being exactly on a contact phase is the beginning of a stride, not a
  // newly-triggered footstep. The next crossing is one full turn away.
  const distanceToTarget =
    rawDistanceToTarget === 0
      ? PLAYER_LOCOMOTION_PHASE_PERIOD
      : rawDistanceToTarget;
  return distanceToTarget <= travel;
}

export function didCrossFootstepPhase(
  previousPhase: number,
  nextPhase: number,
): boolean {
  return PLAYER_LOCOMOTION_FOOTSTEP_PHASES.some((boundary) =>
    crossedPhaseBoundary(previousPhase, nextPhase, boundary),
  );
}

export function advancePlayerLocomotion(
  input: PlayerLocomotionInput,
): PlayerLocomotionStep {
  const localVelocity = getLocalLocomotionVelocity(
    input.velocity,
    input.yawRadians,
  );
  const dtSeconds = clampPlayerLocomotionDelta(input.dtSeconds);
  const phase = advanceLocomotionPhase(
    input.phase,
    localVelocity.speed,
    dtSeconds,
    input.grounded,
  );
  const distance = input.grounded ? localVelocity.speed * dtSeconds : 0;
  return {
    phase,
    previousPhase: wrapLocomotionPhase(input.phase),
    dtSeconds,
    distance,
    localVelocity,
    footstepCrossed:
      input.grounded && localVelocity.speed > 0.2
        ? didCrossFootstepPhase(input.phase, phase)
        : false,
  };
}

function stanceAmplitude(crouching: boolean, walking: boolean): number {
  if (crouching) return 0.42;
  if (walking) return 0.68;
  return 1;
}

export function getPlayerLocomotionPose(
  input: PlayerLocomotionInput,
): PlayerLocomotionPose {
  const step = advancePlayerLocomotion(input);
  const { forward, strafe, speed } = step.localVelocity;
  const movement = input.grounded
    ? clamp(speed / PLAYER_LOCOMOTION_REFERENCE_SPEED, 0, 1)
    : 0;
  const stance = stanceAmplitude(input.crouching, input.walking);
  const movementAmplitude = movement * stance;
  const doublePhase = step.phase * 2;
  const verticalWave = (Math.cos(doublePhase) - 1) * 0.5;
  const sideWave = Math.sin(doublePhase);
  const forwardRatio = clamp(
    forward / PLAYER_LOCOMOTION_REFERENCE_SPEED,
    -1,
    1,
  );
  const strafeRatio = clamp(strafe / PLAYER_LOCOMOTION_REFERENCE_SPEED, -1, 1);
  const landingRatio = clamp(
    finiteOr(input.landingRecoverySeconds ?? 0, 0) /
      PLAYER_LOCOMOTION_LANDING_RECOVERY_SECONDS,
    0,
    1,
  );
  const landingEase = landingRatio * landingRatio;

  const cameraY = clamp(
    verticalWave * PLAYER_CAMERA_BOB_Y * movementAmplitude -
      landingEase * PLAYER_LANDING_CAMERA_Y,
    -PLAYER_CAMERA_Y_BOUNDS,
    PLAYER_CAMERA_Y_BOUNDS,
  );
  const cameraPitch = clamp(
    landingEase * PLAYER_LANDING_CAMERA_PITCH,
    -PLAYER_CAMERA_PITCH_BOUNDS,
    PLAYER_CAMERA_PITCH_BOUNDS,
  );
  const cameraRoll = clamp(
    sideWave * PLAYER_CAMERA_STRAFE_ROLL * movementAmplitude * 0.25 +
      strafeRatio * PLAYER_CAMERA_STRAFE_ROLL * 0.65,
    -PLAYER_CAMERA_ROLL_BOUNDS,
    PLAYER_CAMERA_ROLL_BOUNDS,
  );
  const viewX = clamp(
    strafeRatio * PLAYER_VIEWMODEL_STRAFE_X * movementAmplitude,
    -PLAYER_VIEWMODEL_X_BOUNDS,
    PLAYER_VIEWMODEL_X_BOUNDS,
  );
  const viewY = clamp(
    verticalWave * PLAYER_VIEWMODEL_BOB_Y * movementAmplitude -
      landingEase * PLAYER_LANDING_VIEWMODEL_Y,
    -PLAYER_VIEWMODEL_Y_BOUNDS,
    PLAYER_VIEWMODEL_Y_BOUNDS,
  );
  const viewZ = clamp(
    -forwardRatio * PLAYER_VIEWMODEL_FORWARD_Z * movementAmplitude,
    -PLAYER_VIEWMODEL_Z_BOUNDS,
    PLAYER_VIEWMODEL_Z_BOUNDS,
  );
  const viewPitch = clamp(
    landingEase * PLAYER_LANDING_VIEWMODEL_PITCH,
    -PLAYER_VIEWMODEL_PITCH_BOUNDS,
    PLAYER_VIEWMODEL_PITCH_BOUNDS,
  );
  const viewRoll = clamp(
    sideWave * PLAYER_VIEWMODEL_ROLL * movementAmplitude +
      strafeRatio * PLAYER_VIEWMODEL_ROLL * 0.5,
    -PLAYER_VIEWMODEL_ROLL_BOUNDS,
    PLAYER_VIEWMODEL_ROLL_BOUNDS,
  );

  return {
    phase: step.phase,
    speed,
    forwardSpeed: forward,
    strafeSpeed: strafe,
    cameraY,
    cameraPitch,
    cameraRoll,
    viewX,
    viewY,
    viewZ,
    viewPitch,
    viewRoll,
    footstepCrossed: step.footstepCrossed,
  };
}
