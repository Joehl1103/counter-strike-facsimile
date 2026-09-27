import type { BotTeam } from './game-rules';

export type BotDeathVariant = 0 | 1 | 2 | 3;

export type BotVisualPose = Readonly<{
  /** Smoothed 0..1 blend from the sampled living skeleton to its rest pose. */
  collapseWeight: number;
  rootY: number;
  rootPitch: number;
  rootRoll: number;
  leftLegPitch: number;
  rightLegPitch: number;
  leftHipPitch: number;
  rightHipPitch: number;
  leftHipYaw: number;
  rightHipYaw: number;
  leftKneePitch: number;
  rightKneePitch: number;
  leftAnklePitch: number;
  rightAnklePitch: number;
  leftArmPitch: number;
  rightArmPitch: number;
  leftForearmPitch: number;
  rightForearmPitch: number;
  leftHandPitch: number;
  rightHandPitch: number;
  headPitch: number;
}>;

export type MutableBotVisualPose = {
  -readonly [Key in keyof BotVisualPose]: number;
};

export const BOT_DEATH_DURATION_SECONDS = 0.58;
export const BOT_TORSO_CENTER_Y = 1.18;
export const BOT_TORSO_HALF_HEIGHT = 0.615;
export const BOT_TORSO_HALF_WIDTH = 0.38;

export const LIVING_BOT_POSE: BotVisualPose = {
  collapseWeight: 0,
  rootY: 0,
  rootPitch: 0,
  rootRoll: 0,
  leftLegPitch: 0,
  rightLegPitch: 0,
  leftHipPitch: 0,
  rightHipPitch: 0,
  leftHipYaw: 0,
  rightHipYaw: 0,
  leftKneePitch: 0,
  rightKneePitch: 0,
  leftAnklePitch: 0,
  rightAnklePitch: 0,
  leftArmPitch: 1.08,
  rightArmPitch: 1.08,
  leftForearmPitch: 0,
  rightForearmPitch: 0,
  leftHandPitch: 0,
  rightHandPitch: 0,
  headPitch: 0,
};

export function getBotDeathVariant(id: number, team: BotTeam): BotDeathVariant {
  const safeId = Number.isSafeInteger(id) && id >= 0 ? id : 0;
  return ((safeId + (team === 'ally' ? 1 : 0)) % 4) as BotDeathVariant;
}

export function getBotDeathPose(
  elapsedSeconds: number,
  variant: BotDeathVariant,
): BotVisualPose {
  const output = { ...LIVING_BOT_POSE };
  return writeBotDeathPose(elapsedSeconds, variant, output);
}

/** Allocation-free death sample writer for the retained render pose. */
export function writeBotDeathPose(
  elapsedSeconds: number,
  variant: BotDeathVariant,
  output: MutableBotVisualPose,
): MutableBotVisualPose {
  const elapsed = Number.isFinite(elapsedSeconds)
    ? Math.max(0, elapsedSeconds)
    : 0;
  const progress = Math.min(1, elapsed / BOT_DEATH_DURATION_SECONDS);
  if (progress === 0) {
    Object.assign(output, LIVING_BOT_POSE);
    return output;
  }
  const eased = progress * progress * (3 - 2 * progress);
  const fallDirection = variant < 2 ? 1 : -1;
  const side = variant % 2 === 0 ? -1 : 1;
  const finalPitch = fallDirection * (variant % 2 === 0 ? 1.56 : 1.55);
  const impactDip = Math.sin(progress * Math.PI) * 0.055;

  // Keep the settled torso/pelvis envelope inside the presentation ground
  // tolerance. This is a visual offset on the sibling root; authority roots
  // and hit proxies remain at their original grounded transforms.
  output.collapseWeight = eased;
  const settledRootY = 0.39;
  output.rootY = Math.sin(progress * Math.PI) * 0.075 + eased * settledRootY;
  output.rootPitch = finalPitch * eased + fallDirection * impactDip;
  output.rootRoll = side * (0.025 * eased + impactDip * 0.7);
  output.leftLegPitch = side * -0.24 * eased;
  output.rightLegPitch = side * 0.16 * eased;
  // The extra hinges keep a corpse anatomically articulated even when the
  // living pose came from a planted gait, strafe, reload, or recoil frame.
  output.leftHipPitch = side * -0.52 * eased;
  output.rightHipPitch = side * 0.38 * eased;
  output.leftHipYaw = fallDirection * side * 0.16 * eased;
  output.rightHipYaw = -fallDirection * side * 0.12 * eased;
  output.leftKneePitch = (0.56 + side * 0.1) * eased;
  output.rightKneePitch = (0.46 - side * 0.08) * eased;
  output.leftAnklePitch = -fallDirection * 0.42 * eased;
  output.rightAnklePitch = fallDirection * 0.34 * eased;
  output.leftArmPitch = 1.08 + (fallDirection * 0.22 + side * 0.32) * eased;
  output.rightArmPitch = 1.08 + (fallDirection * 0.16 - side * 0.38) * eased;
  output.leftForearmPitch = (fallDirection * 0.62 + side * 0.2) * eased;
  output.rightForearmPitch = (fallDirection * 0.5 - side * 0.26) * eased;
  output.leftHandPitch = -side * 0.3 * eased;
  output.rightHandPitch = side * 0.24 * eased;
  output.headPitch = -fallDirection * 0.34 * eased;
  return output;
}

export function getConservativeTorsoBottomY(pose: BotVisualPose) {
  const pitch = Math.abs(pose.rootPitch);
  const roll = Math.abs(pose.rootRoll);
  return (
    pose.rootY +
    (BOT_TORSO_CENTER_Y - BOT_TORSO_HALF_HEIGHT) * Math.cos(pitch) -
    BOT_TORSO_HALF_WIDTH * Math.sin(pitch) -
    BOT_TORSO_HALF_WIDTH * Math.sin(roll)
  );
}

export function shouldAdvanceBotDeathPose(
  isPlaying: boolean,
  status:
    | 'briefing'
    | 'active'
    | 'round-won'
    | 'round-lost'
    | 'match-won'
    | 'match-lost',
) {
  return (
    isPlaying ||
    status === 'round-won' ||
    status === 'round-lost' ||
    status === 'match-won' ||
    status === 'match-lost'
  );
}
