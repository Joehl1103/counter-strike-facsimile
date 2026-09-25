/**
 * Presentation-only articulated bot animation.
 *
 * The simulation remains authoritative for position, velocity, yaw, aim, and
 * actions. This module only converts that state to scalar rig values. The
 * writer mutates caller-owned state and output objects so a render loop does
 * not need to allocate vectors, matrices, or animation objects.
 */

export const BOT_ANIMATION_MAX_STEP_SECONDS = 0.05;
export const BOT_ANIMATION_MAX_SPEED = 5.8;
export const BOT_ANIMATION_STRIDE_LENGTH = 1.85;
export const BOT_ANIMATION_PHASE_PERIOD = Math.PI * 2;
export const BOT_ANIMATION_MAX_TORSO_YAW = Math.PI / 4;
export const BOT_ANIMATION_MAX_FRAME_ANGLE = 0.12;
export const BOT_ANIMATION_MAX_IMPULSE_ANGLE = 0.18;
export const BOT_ANIMATION_ACTION_SETTLE_SECONDS = 0.25;
export const BOT_ANIMATION_MIN_TOE_CLEARANCE = 0.04;
export const BOT_ANIMATION_MAX_TOE_CLEARANCE = 0.12;

const ACTION_DECAY_RATE = 24;
const BOT_ANIMATION_FRAME_ANGLE_RATE = BOT_ANIMATION_MAX_FRAME_ANGLE * 30;
const BOT_ANIMATION_IMPULSE_ANGLE_RATE = BOT_ANIMATION_MAX_IMPULSE_ANGLE * 30;
const MAX_LEG_SWING = 0.48;
const MAX_TORSO_LEAN = 0.1;
const MAX_AIM_PITCH = 0.42;
const MAX_RECOIL_PITCH = 0.18;
const MAX_RECOIL_YAW = 0.08;
const FOOT_SEPARATION = 0.18;
const FOOT_SWING_FORWARD = 0.16;

export type BotAnimationVector = Readonly<{ x: number; z: number }>;

export type BotAnimationActions = Readonly<{
  fire?: number;
  reload?: number;
  flash?: number;
  hit?: number;
  death?: number;
}>;

export type BotAnimationInput = Readonly<{
  dtSeconds: number;
  velocity: BotAnimationVector;
  acceleration: BotAnimationVector;
  bodyYaw: number;
  aimYaw: number;
  grounded: boolean;
  /** Prefer an authoritative phase. Simulation time is a deterministic fallback. */
  phase?: number;
  simulationTimeSeconds?: number;
  /** Optional authoritative vertical view aim, in radians. */
  aimPitch?: number;
  actions?: BotAnimationActions;
}>;

/** Persistent envelopes and previous scalar angles; create once per bot. */
export type BotAnimationState = {
  firePulse: number;
  reloadPulse: number;
  flashPulse: number;
  hitPulse: number;
  deathPulse: number;
  previousAnglesInitialized: boolean;
  previousUpperBodyYaw: number;
  previousLeftHipPitch: number;
  previousRightHipPitch: number;
  previousLeftKneePitch: number;
  previousRightKneePitch: number;
  previousLeftAnklePitch: number;
  previousRightAnklePitch: number;
  previousLeftHipYaw: number;
  previousRightHipYaw: number;
  previousLeftShoulderPitch: number;
  previousRightShoulderPitch: number;
  previousLeftShoulderYaw: number;
  previousRightShoulderYaw: number;
  previousLeftElbowPitch: number;
  previousRightElbowPitch: number;
  previousVisualAimPitch: number;
  previousRecoilPitch: number;
  previousRecoilYaw: number;
  previousAdditivePitch: number;
  previousAdditiveYaw: number;
  previousWeaponSocketPitch: number;
  previousWeaponSocketYaw: number;
  previousWeaponSocketRoll: number;
};

/**
 * Flat scalar output. Foot offsets and anchors are local to the lower-body
 * root; a renderer can compare successive anchors in world space to measure
 * planted-foot drift without this module knowing world position.
 */
export type BotAnimationPose = {
  phase: number;
  speed: number;
  localForwardVelocity: number;
  localStrafeVelocity: number;
  localForwardAcceleration: number;
  localStrafeAcceleration: number;
  pelvisLift: number;
  pelvisWeightShift: number;
  lowerBodyYaw: number;
  upperBodyYaw: number;
  torsoLeanX: number;
  torsoLeanZ: number;
  leftHipPitch: number;
  leftHipYaw: number;
  leftKneePitch: number;
  leftAnklePitch: number;
  rightHipPitch: number;
  rightHipYaw: number;
  rightKneePitch: number;
  rightAnklePitch: number;
  leftShoulderPitch: number;
  leftShoulderYaw: number;
  leftElbowPitch: number;
  rightShoulderPitch: number;
  rightShoulderYaw: number;
  rightElbowPitch: number;
  leftFootPlant: number;
  rightFootPlant: number;
  leftFootOffsetX: number;
  leftFootOffsetY: number;
  leftFootOffsetZ: number;
  rightFootOffsetX: number;
  rightFootOffsetY: number;
  rightFootOffsetZ: number;
  leftFootPlantAnchorX: number;
  leftFootPlantAnchorZ: number;
  rightFootPlantAnchorX: number;
  rightFootPlantAnchorZ: number;
  leftToeClearance: number;
  rightToeClearance: number;
  visualAimPitch: number;
  recoilPitch: number;
  recoilYaw: number;
  additivePitch: number;
  additiveYaw: number;
  weaponSocketX: number;
  weaponSocketY: number;
  weaponSocketZ: number;
  weaponSocketPitch: number;
  weaponSocketYaw: number;
  weaponSocketRoll: number;
};

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  const result = Math.min(Math.max(value, minimum), maximum);
  return result === 0 ? 0 : result;
}

function wrapPhase(value: number): number {
  const wrapped = finiteOr(value, 0) % BOT_ANIMATION_PHASE_PERIOD;
  return wrapped < 0 ? wrapped + BOT_ANIMATION_PHASE_PERIOD : wrapped;
}

function wrapAngle(value: number): number {
  let wrapped = finiteOr(value, 0) % BOT_ANIMATION_PHASE_PERIOD;
  if (wrapped <= -Math.PI) wrapped += BOT_ANIMATION_PHASE_PERIOD;
  if (wrapped > Math.PI) wrapped -= BOT_ANIMATION_PHASE_PERIOD;
  return wrapped === 0 ? 0 : wrapped;
}

function decayPulse(previous: number, next: number, dtSeconds: number): number {
  const decayed =
    finiteOr(previous, 0) * Math.exp(-ACTION_DECAY_RATE * dtSeconds);
  return Math.max(clamp(next, 0, 1), decayed);
}

function limitAngle(
  target: number,
  previous: number,
  maximumRate: number,
  dtSeconds: number,
): number {
  const delta = wrapAngle(target - previous);
  const maximumStep = maximumRate * dtSeconds;
  return previous + clamp(delta, -maximumStep, maximumStep);
}

type BotAnimationAngleKey =
  | 'previousUpperBodyYaw'
  | 'previousLeftHipPitch'
  | 'previousRightHipPitch'
  | 'previousLeftKneePitch'
  | 'previousRightKneePitch'
  | 'previousLeftAnklePitch'
  | 'previousRightAnklePitch'
  | 'previousLeftHipYaw'
  | 'previousRightHipYaw'
  | 'previousLeftShoulderPitch'
  | 'previousRightShoulderPitch'
  | 'previousLeftShoulderYaw'
  | 'previousRightShoulderYaw'
  | 'previousLeftElbowPitch'
  | 'previousRightElbowPitch'
  | 'previousVisualAimPitch'
  | 'previousRecoilPitch'
  | 'previousRecoilYaw'
  | 'previousAdditivePitch'
  | 'previousAdditiveYaw'
  | 'previousWeaponSocketPitch'
  | 'previousWeaponSocketYaw'
  | 'previousWeaponSocketRoll';

function writeAngle(
  state: BotAnimationState,
  key: BotAnimationAngleKey,
  target: number,
  impulse: boolean,
  dtSeconds: number,
): number {
  const previous = finiteOr(state[key] as number, 0);
  const value = state.previousAnglesInitialized
    ? limitAngle(
        target,
        previous,
        impulse
          ? BOT_ANIMATION_IMPULSE_ANGLE_RATE
          : BOT_ANIMATION_FRAME_ANGLE_RATE,
        dtSeconds,
      )
    : target;
  state[key] = value;
  return value;
}

export function createBotAnimationState(): BotAnimationState {
  return {
    firePulse: 0,
    reloadPulse: 0,
    flashPulse: 0,
    hitPulse: 0,
    deathPulse: 0,
    previousAnglesInitialized: false,
    previousUpperBodyYaw: 0,
    previousLeftHipPitch: 0,
    previousRightHipPitch: 0,
    previousLeftKneePitch: 0,
    previousRightKneePitch: 0,
    previousLeftAnklePitch: 0,
    previousRightAnklePitch: 0,
    previousLeftHipYaw: 0,
    previousRightHipYaw: 0,
    previousLeftShoulderPitch: 1.08,
    previousRightShoulderPitch: 1.08,
    previousLeftShoulderYaw: 0,
    previousRightShoulderYaw: 0,
    previousLeftElbowPitch: 0.38,
    previousRightElbowPitch: 0.38,
    previousVisualAimPitch: 0,
    previousRecoilPitch: 0,
    previousRecoilYaw: 0,
    previousAdditivePitch: 0,
    previousAdditiveYaw: 0,
    previousWeaponSocketPitch: 0,
    previousWeaponSocketYaw: 0,
    previousWeaponSocketRoll: 0,
  };
}

export function createBotAnimationPose(): BotAnimationPose {
  return {
    phase: 0,
    speed: 0,
    localForwardVelocity: 0,
    localStrafeVelocity: 0,
    localForwardAcceleration: 0,
    localStrafeAcceleration: 0,
    pelvisLift: 0,
    pelvisWeightShift: 0,
    lowerBodyYaw: 0,
    upperBodyYaw: 0,
    torsoLeanX: 0,
    torsoLeanZ: 0,
    leftHipPitch: 0,
    leftHipYaw: 0,
    leftKneePitch: 0.1,
    leftAnklePitch: 0,
    rightHipPitch: 0,
    rightHipYaw: 0,
    rightKneePitch: 0.1,
    rightAnklePitch: 0,
    leftShoulderPitch: 1.08,
    leftShoulderYaw: 0,
    leftElbowPitch: 0.38,
    rightShoulderPitch: 1.08,
    rightShoulderYaw: 0,
    rightElbowPitch: 0.38,
    leftFootPlant: 1,
    rightFootPlant: 0,
    leftFootOffsetX: -FOOT_SEPARATION,
    leftFootOffsetY: 0,
    leftFootOffsetZ: 0,
    rightFootOffsetX: FOOT_SEPARATION,
    rightFootOffsetY: 0,
    rightFootOffsetZ: 0,
    leftFootPlantAnchorX: -FOOT_SEPARATION,
    leftFootPlantAnchorZ: 0,
    rightFootPlantAnchorX: FOOT_SEPARATION,
    rightFootPlantAnchorZ: 0,
    leftToeClearance: BOT_ANIMATION_MIN_TOE_CLEARANCE,
    rightToeClearance: BOT_ANIMATION_MIN_TOE_CLEARANCE,
    visualAimPitch: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    additivePitch: 0,
    additiveYaw: 0,
    weaponSocketX: 0.07,
    weaponSocketY: 1.2,
    weaponSocketZ: -0.34,
    weaponSocketPitch: 0,
    weaponSocketYaw: 0,
    weaponSocketRoll: 0,
  };
}

/** Clamp a render delta; simulation clocks are never changed by this helper. */
export function clampBotAnimationDelta(dtSeconds: number): number {
  return clamp(finiteOr(dtSeconds, 0), 0, BOT_ANIMATION_MAX_STEP_SECONDS);
}

/** Convert world X/Z velocity or acceleration into the bot's body-local frame. */
export function getBotAnimationLocalVector(
  vector: BotAnimationVector,
  bodyYaw: number,
): BotAnimationVector {
  const x = finiteOr(vector?.x, 0);
  const z = finiteOr(vector?.z, 0);
  const yaw = finiteOr(bodyYaw, 0);
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);
  // Body forward is -Z at yaw 0; local X is right.
  return {
    x: x * cosYaw - z * sinYaw,
    z: -(x * sinYaw + z * cosYaw),
  };
}

/**
 * Write one deterministic pose. `state` and `output` should be retained by
 * the caller and reused for every frame of one bot.
 */
export function writeBotAnimationPose(
  input: BotAnimationInput,
  state: BotAnimationState,
  output: BotAnimationPose,
): BotAnimationPose {
  const dt = clampBotAnimationDelta(input.dtSeconds);
  const velocityX = finiteOr(input.velocity?.x, 0);
  const velocityZ = finiteOr(input.velocity?.z, 0);
  const accelerationX = finiteOr(input.acceleration?.x, 0);
  const accelerationZ = finiteOr(input.acceleration?.z, 0);
  const bodyYaw = wrapAngle(input.bodyYaw);
  const aimYaw = wrapAngle(input.aimYaw);
  const localVelocityX = finiteOr(
    velocityX * Math.cos(bodyYaw) - velocityZ * Math.sin(bodyYaw),
    0,
  );
  const localVelocityZ = finiteOr(
    -(velocityX * Math.sin(bodyYaw) + velocityZ * Math.cos(bodyYaw)),
    0,
  );
  const localAccelerationX = finiteOr(
    accelerationX * Math.cos(bodyYaw) - accelerationZ * Math.sin(bodyYaw),
    0,
  );
  const localAccelerationZ = finiteOr(
    -(accelerationX * Math.sin(bodyYaw) + accelerationZ * Math.cos(bodyYaw)),
    0,
  );
  const speed = input.grounded
    ? clamp(Math.hypot(velocityX, velocityZ), 0, BOT_ANIMATION_MAX_SPEED)
    : 0;
  const movement = clamp(speed / BOT_ANIMATION_MAX_SPEED, 0, 1);
  const phase =
    input.phase !== undefined && Number.isFinite(input.phase)
      ? wrapPhase(input.phase)
      : wrapPhase(
          finiteOr(input.simulationTimeSeconds, 0) * Math.PI * 2 * 1.25,
        );
  const actions = input.actions;
  state.firePulse = decayPulse(state.firePulse, finiteOr(actions?.fire, 0), dt);
  state.reloadPulse = decayPulse(
    state.reloadPulse,
    finiteOr(actions?.reload, 0),
    dt,
  );
  state.flashPulse = decayPulse(
    state.flashPulse,
    finiteOr(actions?.flash, 0),
    dt,
  );
  state.hitPulse = decayPulse(state.hitPulse, finiteOr(actions?.hit, 0), dt);
  state.deathPulse = decayPulse(
    state.deathPulse,
    finiteOr(actions?.death, 0),
    dt,
  );

  const sine = Math.sin(phase);
  const cosine = Math.cos(phase);
  // Keep a stopped bot in a balanced stance. The authoritative phase can
  // continue to be sampled while stationary, but it must not make one leg
  // look planted and the other look mid-stride.
  const leftPlant = input.grounded
    ? clamp(0.5 + cosine * 0.5 * movement, 0, 1)
    : 0;
  const rightPlant = input.grounded
    ? clamp(0.5 - cosine * 0.5 * movement, 0, 1)
    : 0;
  const swing = sine * MAX_LEG_SWING * movement;
  const impulse =
    state.firePulse > 0.001 ||
    state.hitPulse > 0.001 ||
    state.deathPulse > 0.001;
  const aimDelta = clamp(
    wrapAngle(aimYaw - bodyYaw),
    -BOT_ANIMATION_MAX_TORSO_YAW,
    BOT_ANIMATION_MAX_TORSO_YAW,
  );
  const normalizedAccelerationX = clamp(localAccelerationX / 10, -1, 1);
  const normalizedAccelerationZ = clamp(localAccelerationZ / 10, -1, 1);
  const torsoCounter = clamp(
    (-localVelocityX / BOT_ANIMATION_MAX_SPEED) * 0.1 -
      normalizedAccelerationX * 0.025,
    -0.12,
    0.12,
  );
  const targetUpperBodyYaw = clamp(
    aimDelta * 0.72 + torsoCounter,
    -BOT_ANIMATION_MAX_TORSO_YAW,
    BOT_ANIMATION_MAX_TORSO_YAW,
  );
  const leftHipPitch = input.grounded
    ? clamp(
        swing * 0.8 + normalizedAccelerationZ * 0.035,
        -MAX_LEG_SWING,
        MAX_LEG_SWING,
      )
    : 0;
  const rightHipPitch = input.grounded
    ? clamp(
        -swing * 0.8 + normalizedAccelerationZ * 0.035,
        -MAX_LEG_SWING,
        MAX_LEG_SWING,
      )
    : 0;
  // Knees never cross zero: the small positive bend keeps the joint from
  // visually inverting when the stride or velocity changes direction.
  const leftKneePitch = input.grounded
    ? clamp(
        0.1 + Math.abs(swing) * 0.36 + (1 - leftPlant) * 0.12 * movement,
        0.04,
        0.52,
      )
    : 0.04;
  const rightKneePitch = input.grounded
    ? clamp(
        0.1 + Math.abs(swing) * 0.36 + (1 - rightPlant) * 0.12 * movement,
        0.04,
        0.52,
      )
    : 0.04;
  const leftAnklePitch = clamp(
    -leftHipPitch * 0.42 -
      (leftKneePitch - 0.1) * 0.16 -
      (1 - leftPlant) * 0.08 * movement,
    -0.35,
    0.35,
  );
  const rightAnklePitch = clamp(
    -rightHipPitch * 0.42 -
      (rightKneePitch - 0.1) * 0.16 -
      (1 - rightPlant) * 0.08 * movement,
    -0.35,
    0.35,
  );
  const aimPitch = clamp(
    finiteOr(input.aimPitch, 0),
    -MAX_AIM_PITCH,
    MAX_AIM_PITCH,
  );
  const bobPitch = cosine * 0.018 * movement;
  const recoilPitch = clamp(
    state.firePulse * MAX_RECOIL_PITCH + state.hitPulse * 0.045,
    0,
    MAX_RECOIL_PITCH,
  );
  const recoilYaw = clamp(
    state.firePulse * sine * MAX_RECOIL_YAW,
    -MAX_RECOIL_YAW,
    MAX_RECOIL_YAW,
  );
  const additivePitch = clamp(
    state.reloadPulse * 0.1 + state.flashPulse * 0.18 + state.deathPulse * 0.14,
    -0.3,
    0.3,
  );
  const additiveYaw = clamp(
    state.reloadPulse * -0.08 + state.deathPulse * 0.12,
    -0.3,
    0.3,
  );
  const targetVisualAimPitch = clamp(
    aimPitch + bobPitch - recoilPitch - additivePitch * 0.28,
    -MAX_AIM_PITCH,
    MAX_AIM_PITCH,
  );
  const targetLeftShoulderPitch =
    1.08 - leftHipPitch * 0.16 - recoilPitch - additivePitch * 0.35;
  const targetRightShoulderPitch =
    1.08 - rightHipPitch * 0.16 - recoilPitch - additivePitch * 0.35;
  const targetLeftShoulderYaw =
    targetUpperBodyYaw * 0.35 +
    localVelocityX * 0.012 -
    sine * 0.015 * movement;
  const targetRightShoulderYaw =
    targetUpperBodyYaw * 0.35 +
    localVelocityX * 0.012 +
    sine * 0.015 * movement;
  const targetLeftElbowPitch =
    0.38 + state.reloadPulse * 0.22 + recoilPitch * 0.2;
  const targetRightElbowPitch =
    0.38 + state.reloadPulse * 0.22 + recoilPitch * 0.2;

  output.phase = phase;
  output.speed = speed;
  output.localForwardVelocity = localVelocityZ;
  output.localStrafeVelocity = localVelocityX;
  output.localForwardAcceleration = localAccelerationZ;
  output.localStrafeAcceleration = localAccelerationX;
  output.pelvisLift = input.grounded
    ? (1 - Math.abs(cosine)) * 0.018 * movement
    : 0;
  output.pelvisWeightShift = input.grounded
    ? clamp(
        (rightPlant - leftPlant) * 0.12 + localAccelerationX * 0.006,
        -0.2,
        0.2,
      )
    : 0;
  output.lowerBodyYaw = bodyYaw;
  output.upperBodyYaw = writeAngle(
    state,
    'previousUpperBodyYaw',
    targetUpperBodyYaw,
    false,
    dt,
  );
  output.torsoLeanX = clamp(
    -normalizedAccelerationX * MAX_TORSO_LEAN,
    -MAX_TORSO_LEAN,
    MAX_TORSO_LEAN,
  );
  output.torsoLeanZ = clamp(
    normalizedAccelerationZ * MAX_TORSO_LEAN,
    -MAX_TORSO_LEAN,
    MAX_TORSO_LEAN,
  );
  output.leftHipPitch = writeAngle(
    state,
    'previousLeftHipPitch',
    leftHipPitch,
    false,
    dt,
  );
  output.rightHipPitch = writeAngle(
    state,
    'previousRightHipPitch',
    rightHipPitch,
    false,
    dt,
  );
  output.leftHipYaw = writeAngle(
    state,
    'previousLeftHipYaw',
    clamp(
      -localVelocityX * 0.022 -
        normalizedAccelerationX * 0.012 +
        sine * 0.025 * movement,
      -0.12,
      0.12,
    ),
    false,
    dt,
  );
  output.rightHipYaw = writeAngle(
    state,
    'previousRightHipYaw',
    clamp(
      -localVelocityX * 0.022 -
        normalizedAccelerationX * 0.012 -
        sine * 0.025 * movement,
      -0.12,
      0.12,
    ),
    false,
    dt,
  );
  output.leftKneePitch = writeAngle(
    state,
    'previousLeftKneePitch',
    leftKneePitch,
    false,
    dt,
  );
  output.rightKneePitch = writeAngle(
    state,
    'previousRightKneePitch',
    rightKneePitch,
    false,
    dt,
  );
  output.leftAnklePitch = writeAngle(
    state,
    'previousLeftAnklePitch',
    leftAnklePitch,
    false,
    dt,
  );
  output.rightAnklePitch = writeAngle(
    state,
    'previousRightAnklePitch',
    rightAnklePitch,
    false,
    dt,
  );
  output.leftShoulderPitch = writeAngle(
    state,
    'previousLeftShoulderPitch',
    targetLeftShoulderPitch,
    impulse,
    dt,
  );
  output.rightShoulderPitch = writeAngle(
    state,
    'previousRightShoulderPitch',
    targetRightShoulderPitch,
    impulse,
    dt,
  );
  output.leftShoulderYaw = writeAngle(
    state,
    'previousLeftShoulderYaw',
    targetLeftShoulderYaw,
    false,
    dt,
  );
  output.rightShoulderYaw = writeAngle(
    state,
    'previousRightShoulderYaw',
    targetRightShoulderYaw,
    false,
    dt,
  );
  output.leftElbowPitch = writeAngle(
    state,
    'previousLeftElbowPitch',
    targetLeftElbowPitch,
    impulse,
    dt,
  );
  output.rightElbowPitch = writeAngle(
    state,
    'previousRightElbowPitch',
    targetRightElbowPitch,
    impulse,
    dt,
  );
  output.leftFootPlant = leftPlant;
  output.rightFootPlant = rightPlant;
  output.leftFootOffsetX = -FOOT_SEPARATION;
  output.leftFootOffsetY = input.grounded ? output.pelvisLift : 0;
  output.leftFootOffsetZ = swing * FOOT_SWING_FORWARD;
  output.rightFootOffsetX = FOOT_SEPARATION;
  output.rightFootOffsetY = input.grounded ? output.pelvisLift : 0;
  output.rightFootOffsetZ = -swing * FOOT_SWING_FORWARD;
  output.leftFootPlantAnchorX = -FOOT_SEPARATION;
  output.leftFootPlantAnchorZ = output.leftFootOffsetZ * leftPlant;
  output.rightFootPlantAnchorX = FOOT_SEPARATION;
  output.rightFootPlantAnchorZ = output.rightFootOffsetZ * rightPlant;
  output.leftToeClearance = clamp(
    BOT_ANIMATION_MIN_TOE_CLEARANCE +
      (1 - leftPlant) * 0.06 +
      Math.abs(leftHipPitch) * 0.03,
    BOT_ANIMATION_MIN_TOE_CLEARANCE,
    BOT_ANIMATION_MAX_TOE_CLEARANCE,
  );
  output.rightToeClearance = clamp(
    BOT_ANIMATION_MIN_TOE_CLEARANCE +
      (1 - rightPlant) * 0.06 +
      Math.abs(rightHipPitch) * 0.03,
    BOT_ANIMATION_MIN_TOE_CLEARANCE,
    BOT_ANIMATION_MAX_TOE_CLEARANCE,
  );
  output.visualAimPitch = writeAngle(
    state,
    'previousVisualAimPitch',
    targetVisualAimPitch,
    impulse,
    dt,
  );
  output.recoilPitch = writeAngle(
    state,
    'previousRecoilPitch',
    recoilPitch,
    true,
    dt,
  );
  output.recoilYaw = writeAngle(
    state,
    'previousRecoilYaw',
    recoilYaw,
    true,
    dt,
  );
  output.additivePitch = writeAngle(
    state,
    'previousAdditivePitch',
    additivePitch,
    impulse,
    dt,
  );
  output.additiveYaw = writeAngle(
    state,
    'previousAdditiveYaw',
    additiveYaw,
    impulse,
    dt,
  );
  output.weaponSocketX = 0.07 + output.torsoLeanX * 0.08;
  output.weaponSocketY = 1.2 + output.pelvisLift + output.torsoLeanZ * 0.08;
  output.weaponSocketZ = -0.34 - output.torsoLeanZ * 0.08;
  output.weaponSocketPitch = writeAngle(
    state,
    'previousWeaponSocketPitch',
    output.visualAimPitch - output.recoilPitch - output.additivePitch * 0.25,
    impulse,
    dt,
  );
  output.weaponSocketYaw = writeAngle(
    state,
    'previousWeaponSocketYaw',
    output.upperBodyYaw + output.recoilYaw + output.additiveYaw * 0.2,
    impulse,
    dt,
  );
  output.weaponSocketRoll = writeAngle(
    state,
    'previousWeaponSocketRoll',
    -output.torsoLeanX * 0.35,
    false,
    dt,
  );
  state.previousAnglesInitialized = true;
  return output;
}

/** Allocation-friendly convenience wrapper for tests and one-shot previews. */
export function getBotAnimationPose(
  input: BotAnimationInput,
): BotAnimationPose {
  return writeBotAnimationPose(
    input,
    createBotAnimationState(),
    createBotAnimationPose(),
  );
}
