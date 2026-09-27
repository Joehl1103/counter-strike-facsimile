import type * as THREE from 'three';
import {
  writeBotAnimationPose,
  type BotAnimationInput,
  type BotAnimationPose,
  type BotAnimationState,
} from './bot-animation.ts';
import {
  applyCharacterRigPose,
  applyCharacterRigWeaponAim,
  applyCharacterRigWeaponGripTargets,
  type CharacterRig,
  type CharacterRigWeaponGripOutput,
} from './character-rig.ts';
import {
  sampleSkinnedCharacterPose,
  type SkinnedCharacterInstance,
} from './skinned-character-visuals.ts';

export type BotPresentation = {
  root: THREE.Group;
  rig: CharacterRig;
  skinned: SkinnedCharacterInstance;
  animationState: BotAnimationState;
  animationPose: BotAnimationPose;
  weaponGripOutput: CharacterRigWeaponGripOutput;
};

/** Shared by the live team loops and the CPU presentation benchmark. */
export function presentBotAnimation(
  bot: BotPresentation,
  input: BotAnimationInput,
  relativeAimYaw: number,
  elapsedSeconds: number,
): void {
  // Authority owns hit proxies. Only the visible sibling follows its anchor.
  bot.skinned.visualRoot.position.copy(bot.root.position);
  bot.skinned.visualRoot.rotation.set(0, bot.root.rotation.y, 0);
  bot.skinned.visualRoot.visible = bot.root.visible;
  bot.rig.visualRoot.visible = false;

  writeBotAnimationPose(input, bot.animationState, bot.animationPose);
  bot.animationPose.lowerBodyYaw = 0;

  // Death capture still consumes these joints and grip values. The retired
  // faceted vertex buffers have no live consumer and are no longer updated.
  applyCharacterRigPose(bot.rig, bot.animationPose);
  applyCharacterRigWeaponAim(bot.rig, relativeAimYaw, bot.animationPose);
  applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);
  sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
    elapsedSeconds,
  });
}
