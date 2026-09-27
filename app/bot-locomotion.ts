/** Pure bot steering and living-pose helpers. */
import { getWeaponMoveSpeed, stepHorizontalVelocity, type FirearmKind } from './game-rules.ts';

export const BOT_LOCOMOTION_MAX_STEP_SECONDS = 0.05;
// Cosmetic normalization only; movement uses the player weapon/physics rules.
export const BOT_POSE_REFERENCE_SPEED = 5.8;
export const BOT_POSE_REFERENCE_ACCELERATION = 10;
export const BOT_BODY_TURN_RESPONSE = 10;
export const BOT_BODY_MAX_TURN_RATE = 8;
export const BOT_STRIDE_LENGTH = 1.85;
export const BOT_STRIDE_PHASE_PERIOD = Math.PI * 2;

export const BOT_MAX_LEG_SWING = 0.62;
export const BOT_MAX_PELVIS_LIFT = 0.018;
export const BOT_MAX_ACCELERATION_LEAN = 0.08;
export const BOT_MAX_TORSO_AIM_OFFSET = Math.PI / 4;

export type BotHorizontalVelocity = Readonly<{ x: number; z: number }>;

export type BotLocomotionState = Readonly<{
  velocity: BotHorizontalVelocity;
  phase: number;
  bodyYaw: number;
}>;

export type BotHorizontalStepInput = Readonly<{
  velocity: BotHorizontalVelocity;
  desiredVelocity: BotHorizontalVelocity;
  dtSeconds: number;
  weapon: FirearmKind;
  scoped: boolean;
  grounded: boolean;
}>;

export type BotHorizontalStep = Readonly<{
  velocity: BotHorizontalVelocity;
  acceleration: BotHorizontalVelocity;
  speed: number;
}>;

export type BotLocomotionPoseInput = Readonly<{
  phase: number;
  speed: number;
  acceleration: BotHorizontalVelocity;
  aimYawDelta: number;
  grounded: boolean;
}>;

export type BotLocomotionPose = Readonly<{
  phase: number;
  speed: number;
  leftLegPitch: number;
  rightLegPitch: number;
  pelvisLift: number;
  leftFootPlant: number;
  rightFootPlant: number;
  leanX: number;
  leanZ: number;
  torsoAimYaw: number;
}>;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  const clamped = Math.min(Math.max(value, minimum), maximum);
  return clamped === 0 ? 0 : clamped;
}

function sanitizeAcceleration(
  vector: BotHorizontalVelocity,
): BotHorizontalVelocity {
  return {
    x: finiteOr(vector?.x, 0),
    z: finiteOr(vector?.z, 0),
  };
}

function vectorLength(vector: BotHorizontalVelocity): number {
  return Math.hypot(vector.x, vector.z);
}

export function clampBotLocomotionDelta(dtSeconds: number): number {
  return clamp(finiteOr(dtSeconds, 0), 0, BOT_LOCOMOTION_MAX_STEP_SECONDS);
}

export function wrapBotPhase(phase: number): number {
  const normalized = finiteOr(phase, 0) % BOT_STRIDE_PHASE_PERIOD;
  return normalized < 0 ? normalized + BOT_STRIDE_PHASE_PERIOD : normalized;
}

export function wrapBotAngle(angle: number): number {
  const wrapped = finiteOr(angle, 0) % BOT_STRIDE_PHASE_PERIOD;
  if (wrapped <= -Math.PI) return wrapped + BOT_STRIDE_PHASE_PERIOD;
  if (wrapped > Math.PI) return wrapped - BOT_STRIDE_PHASE_PERIOD;
  return wrapped === 0 ? 0 : wrapped;
}

export function stepBotGroundVelocity(input: BotHorizontalStepInput): BotHorizontalStep {
  // The zero-delta call shares the player's finite-velocity normalization too.
  const current = stepHorizontalVelocity({
    velocity: input.velocity,
    wishDirection: { x: 0, z: 0 },
    maxSpeed: 0,
    dtSeconds: 0,
    grounded: true,
  });
  // Ground steering resumes on landing; airborne bots conserve momentum.
  const desired = input.grounded ? {
    x: finiteOr(input.desiredVelocity.x, 0),
    z: finiteOr(input.desiredVelocity.z, 0),
  } : { x: 0, z: 0 };
  const requestedSpeed = vectorLength(desired);
  const weaponSpeed = getWeaponMoveSpeed({
    weapon: input.weapon, scoped: input.scoped, walking: false, crouching: false,
  });
  const maxSpeed = Number.isFinite(requestedSpeed)
    ? Math.min(requestedSpeed, weaponSpeed)
    : 0;
  const dtSeconds = clampBotLocomotionDelta(input.dtSeconds);
  const velocity = stepHorizontalVelocity({
    velocity: current, wishDirection: desired, maxSpeed, dtSeconds, grounded: input.grounded,
  });
  return {
    velocity,
    speed: vectorLength(velocity),
    acceleration: dtSeconds > 0
      ? { x: (velocity.x - current.x) / dtSeconds, z: (velocity.z - current.z) / dtSeconds }
      : { x: 0, z: 0 },
  };
}

export function advanceBotStridePhase(
  phase: number,
  speed: number,
  dtSeconds: number,
  grounded: boolean,
  strideLength = BOT_STRIDE_LENGTH,
): number {
  const safePhase = wrapBotPhase(phase);
  const safeDt = clampBotLocomotionDelta(dtSeconds);
  const safeSpeed = clamp(
    Math.max(0, finiteOr(speed, 0)),
    0,
    BOT_POSE_REFERENCE_SPEED,
  );
  const safeStrideLength = Math.max(finiteOr(strideLength, 0), 0.001);
  if (!grounded || safeDt === 0 || safeSpeed === 0) return safePhase;
  return wrapBotPhase(
    safePhase +
      (safeSpeed * safeDt * BOT_STRIDE_PHASE_PERIOD) / safeStrideLength,
  );
}

export function stepBotBodyYaw(
  bodyYaw: number,
  targetYaw: number,
  dtSeconds: number,
  response = BOT_BODY_TURN_RESPONSE,
  maxTurnRate = BOT_BODY_MAX_TURN_RATE,
): number {
  const current = wrapBotAngle(bodyYaw);
  const target = wrapBotAngle(targetYaw);
  const dt = clampBotLocomotionDelta(dtSeconds);
  if (dt === 0) return current;
  const delta = wrapBotAngle(target - current);
  const responseRate = Math.max(0, finiteOr(response, BOT_BODY_TURN_RESPONSE));
  const maxRate = Math.max(0, finiteOr(maxTurnRate, BOT_BODY_MAX_TURN_RATE));
  const smoothedDelta = delta * (1 - Math.exp(-responseRate * dt));
  const boundedDelta = clamp(smoothedDelta, -maxRate * dt, maxRate * dt);
  return wrapBotAngle(current + boundedDelta);
}

export function getBotLocomotionPose(
  input: BotLocomotionPoseInput,
): BotLocomotionPose {
  const grounded = input.grounded;
  const speed = grounded
    ? clamp(Math.max(0, finiteOr(input.speed, 0)), 0, BOT_POSE_REFERENCE_SPEED)
    : 0;
  const movement = speed / BOT_POSE_REFERENCE_SPEED;
  const phase = wrapBotPhase(input.phase);
  const phaseSine = Math.sin(phase);
  const supportWave = Math.abs(Math.cos(phase));
  const acceleration = sanitizeAcceleration(input.acceleration);
  const aimDelta = clamp(
    wrapBotAngle(input.aimYawDelta),
    -BOT_MAX_TORSO_AIM_OFFSET,
    BOT_MAX_TORSO_AIM_OFFSET,
  );
  const legSwing = phaseSine * BOT_MAX_LEG_SWING * movement;
  return {
    phase,
    speed,
    leftLegPitch: legSwing === 0 ? 0 : legSwing,
    rightLegPitch: legSwing === 0 ? 0 : -legSwing,
    // Contacts occur at phase 0 and PI, where cos has full magnitude.
    pelvisLift: (1 - supportWave) * BOT_MAX_PELVIS_LIFT * movement,
    leftFootPlant: (1 + Math.cos(phase)) * 0.5,
    rightFootPlant: (1 - Math.cos(phase)) * 0.5,
    leanX: clamp(
      acceleration.x *
        (BOT_MAX_ACCELERATION_LEAN / BOT_POSE_REFERENCE_ACCELERATION),
      -BOT_MAX_ACCELERATION_LEAN,
      BOT_MAX_ACCELERATION_LEAN,
    ),
    leanZ: clamp(
      acceleration.z *
        (BOT_MAX_ACCELERATION_LEAN / BOT_POSE_REFERENCE_ACCELERATION),
      -BOT_MAX_ACCELERATION_LEAN,
      BOT_MAX_ACCELERATION_LEAN,
    ),
    torsoAimYaw: aimDelta,
  };
}

export function resetBotLocomotionState(bodyYaw = 0): BotLocomotionState {
  return {
    velocity: { x: 0, z: 0 },
    phase: 0,
    bodyYaw: wrapBotAngle(bodyYaw),
  };
}
