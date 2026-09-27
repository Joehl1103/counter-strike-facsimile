import * as THREE from 'three';
import type { SecondaryWeaponActionParts } from './secondary-weapon-models';

export type SecondaryReloadVisualPose = Readonly<{
  magazineOffset: THREE.Vector3;
  magazineRoll: number;
}>;

export function getSecondaryReloadGripBlend(progress: number) {
  const safe = Number.isFinite(progress)
    ? THREE.MathUtils.clamp(progress, 0, 1)
    : 0;
  const reach = THREE.MathUtils.smoothstep(safe, 0, 0.12);
  const release = 1 - THREE.MathUtils.smoothstep(safe, 0.88, 1);
  return reach * release;
}

export function getSecondaryReloadVisualPose(
  progress: number,
): SecondaryReloadVisualPose {
  const safe = Number.isFinite(progress)
    ? THREE.MathUtils.clamp(progress, 0, 1)
    : 0;
  const envelope = safe <= 0 || safe >= 1 ? 0 : Math.sin(Math.PI * safe) ** 2;
  const handoff = Math.sin(Math.PI * 2 * safe) * envelope;
  return {
    magazineOffset: new THREE.Vector3(
      -0.28 * envelope - 0.25 * handoff,
      -0.16 * envelope,
      -0.04 * envelope,
    ),
    magazineRoll: -0.12 * envelope - 0.08 * handoff,
  };
}

export function resetSecondaryReloadActionParts(
  parts?: SecondaryWeaponActionParts,
) {
  if (!parts) return;
  parts.magazines.forEach((part) => {
    part.object.position.copy(part.basePosition);
    part.object.rotation.copy(part.baseRotation);
  });
  if (parts.supportHand) {
    parts.supportHand.object.position.copy(parts.supportHand.basePosition);
    parts.supportHand.object.rotation.copy(parts.supportHand.baseRotation);
    if (parts.supportHand.mesh.morphTargetInfluences)
      parts.supportHand.mesh.morphTargetInfluences[0] = 0;
  }
}

export function applySecondaryReloadActionParts(
  parts: SecondaryWeaponActionParts | undefined,
  progress: number,
) {
  resetSecondaryReloadActionParts(parts);
  if (!parts) return;
  const pose = getSecondaryReloadVisualPose(progress);
  parts.magazines.forEach((part, index) => {
    const side = parts.magazines.length > 1 && index === 0 ? -1 : 1;
    part.object.position.add(
      new THREE.Vector3(
        pose.magazineOffset.x * side,
        pose.magazineOffset.y,
        pose.magazineOffset.z,
      ),
    );
    part.object.rotation.z += pose.magazineRoll * side;
  });
  if (parts.supportHand) {
    const activeMagazine = parts.magazines.find(
      (part) => part.object === parts.supportHand?.magazine,
    );
    if (activeMagazine) {
      const gripBlend = getSecondaryReloadGripBlend(progress);
      if (gripBlend > 0) {
        activeMagazine.object.updateMatrix();
        const socketedHand = activeMagazine.object.matrix
          .clone()
          .multiply(parts.supportHand.magazineToHand);
        const socketPosition = new THREE.Vector3();
        const socketRotation = new THREE.Quaternion();
        const socketScale = new THREE.Vector3();
        socketedHand.decompose(socketPosition, socketRotation, socketScale);
        parts.supportHand.object.position.lerp(socketPosition, gripBlend);
        parts.supportHand.object.quaternion.slerp(socketRotation, gripBlend);
        parts.supportHand.object.scale.lerp(socketScale, gripBlend);
      }
      if (parts.supportHand.mesh.morphTargetInfluences)
        parts.supportHand.mesh.morphTargetInfluences[0] = gripBlend;
    }
  }
}
