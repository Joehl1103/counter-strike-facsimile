import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WeaponKind } from './game-rules';
import type { SkinnedCharacterTemplate } from './skinned-character-visuals';
import { applyViewmodelSurface } from './viewmodel-surface.ts';

export type ViewmodelHandedness = 'left' | 'right';
export type ViewmodelGripPose =
  | 'trigger'
  | 'dual-wield'
  | 'support'
  | 'pistol-support'
  | 'magazine-hold'
  | 'knife'
  | 'cradle';

export type ViewmodelArmPose = Readonly<{
  handedness: ViewmodelHandedness;
  grip: ViewmodelGripPose;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  scale: number;
  forearmExtension?: number;
}>;

export const VIEWMODEL_ARM_TRIANGLE_BUDGET = 1200;
export const VIEWMODEL_VISIBLE_ARM_TRIANGLE_BUDGET = 2400;
export const VIEWMODEL_ARM_DRAW_CALLS_PER_ARM = 2;
export const VIEWMODEL_VISIBLE_ARM_DRAW_CALL_BUDGET = 4;
export const TEXTURED_VIEWMODEL_VISIBLE_ARM_TRIANGLE_BUDGET = 4_000;
export const TEXTURED_VIEWMODEL_VISIBLE_ARM_DRAW_CALL_BUDGET = 2;
export const TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE = Object.freeze({
  color: 0xffffff,
  emissive: 0x1b120b,
  emissiveIntensity: 0.035,
  roughness: 0.94,
  metalness: 0,
  sleeveVertexColor: 0xc79467,
  gloveVertexColor: 0x343630,
  fingertipVertexColor: 0xc79467,
});
export const VIEWMODEL_NEAR_PLANE = 0.05;
export const VIEWMODEL_NEAR_PLANE_CLEARANCE = 0.02;
export const KNIFE_VIEWMODEL_ROOT_Z = -0.84;
/** QA contract for the visible first-person arm contribution in NDC. */
export const VIEWMODEL_ARM_NDC_HEIGHT_LIMIT = 0.48;
export const VIEWMODEL_ARM_NDC_WIDTH_LIMIT = 0.52;

export type ViewmodelNdcBounds = Readonly<{
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}>;

export const VIEWMODEL_ACCUMULATED_RECOIL_DEPTH_SCALE = 0.2;

/** Keep accuracy recoil authoritative while presenting only a compact shove. */
export function getViewmodelVisualRecoilDepth(recoil: number): number {
  if (!Number.isFinite(recoil) || recoil <= 0) return 0;
  return recoil * VIEWMODEL_ACCUMULATED_RECOIL_DEPTH_SCALE;
}

/** Clamp a projected footprint to the part that can actually be visible. */
export function clipViewmodelNdcBounds(
  bounds: ViewmodelNdcBounds,
): ViewmodelNdcBounds {
  return {
    minX: THREE.MathUtils.clamp(bounds.minX, -1, 1),
    maxX: THREE.MathUtils.clamp(bounds.maxX, -1, 1),
    minY: THREE.MathUtils.clamp(bounds.minY, -1, 1),
    maxY: THREE.MathUtils.clamp(bounds.maxY, -1, 1),
  };
}

/**
 * Direct presentation gate used by visual QA: arms must remain compact next
 * to the firearm footprint and may not enter the center crosshair column.
 * Bounds are expected in normalized device coordinates (-1..1).
 */
export function isViewmodelArmFootprintWithinLimits(
  arm: ViewmodelNdcBounds,
  weapon: ViewmodelNdcBounds,
  crosshairHalfWidth = 0.02,
) {
  const validBounds = (bounds: ViewmodelNdcBounds) =>
    [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].every(
      Number.isFinite,
    ) &&
    bounds.minX <= bounds.maxX &&
    bounds.minY <= bounds.maxY;
  // NDC spans cover two viewport units (-1..1), while the QA limits are
  // expressed as a fraction of the full viewport dimension.
  const armHeight = (arm.maxY - arm.minY) / 2;
  const armWidth = (arm.maxX - arm.minX) / 2;
  const armOverlapsCrosshair =
    arm.minX < crosshairHalfWidth && arm.maxX > -crosshairHalfWidth;
  const weaponHeight = (weapon.maxY - weapon.minY) / 2;
  return (
    validBounds(arm) &&
    validBounds(weapon) &&
    Number.isFinite(crosshairHalfWidth) &&
    crosshairHalfWidth >= 0 &&
    armHeight <= VIEWMODEL_ARM_NDC_HEIGHT_LIMIT &&
    armWidth <= VIEWMODEL_ARM_NDC_WIDTH_LIMIT &&
    !armOverlapsCrosshair &&
    // The weapon bound is intentionally part of this gate: callers cannot
    // accidentally validate an arm in isolation. Pistols are shorter than a
    // natural two-hand silhouette, so no arbitrary arm/weapon ratio is used.
    weaponHeight > 0
  );
}

/**
 * Stricter pistol silhouette gate for compact first-person review boards.
 * Unlike the general arm gate, a pistol's visible arms may not overwhelm its
 * weapon footprint; this catches the symmetric sleeve-V regression directly.
 */
export function isPistolViewmodelSilhouetteWithinLimits(
  arm: ViewmodelNdcBounds,
  weapon: ViewmodelNdcBounds,
  crosshairHalfWidth = 0.02,
  maxArmToWeaponWidthRatio = 1.5,
) {
  const armWidth = arm.maxX - arm.minX;
  const weaponWidth = weapon.maxX - weapon.minX;
  return (
    isViewmodelArmFootprintWithinLimits(arm, weapon, crosshairHalfWidth) &&
    Number.isFinite(maxArmToWeaponWidthRatio) &&
    maxArmToWeaponWidthRatio > 0 &&
    weaponWidth > 0 &&
    armWidth / weaponWidth <= maxArmToWeaponWidthRatio
  );
}

/** Local hand contacts are deliberately on the receiver/grip side of a gun. */
export function getViewmodelHandContactAnchor(
  handedness: ViewmodelHandedness,
  grip: ViewmodelGripPose,
) {
  const handSign = handedness === 'left' ? -1 : 1;
  if (grip === 'trigger' || grip === 'dual-wield') {
    // The index finger is inside the hand, extended toward the trigger guard.
    return [-0.018 * handSign, 0.048, -0.047] as const;
  }
  if (grip === 'pistol-support') {
    // The support webbing sits across the frame/magazine junction, not the
    // barrel. The negative local Z is the front face of that frame.
    return [0, 0.012, -0.052] as const;
  }
  if (grip === 'magazine-hold') return [0, -0.008, -0.048] as const;
  if (grip === 'support') return [0, 0.006, -0.044] as const;
  if (grip === 'knife') return [0, 0.018, -0.018] as const;
  return [0, 0, -0.02] as const;
}

export const VIEWMODEL_ARM_POSES: Readonly<
  Record<WeaponKind, readonly ViewmodelArmPose[]>
> = {
  rifle: [
    {
      handedness: 'left',
      grip: 'support',
      position: [-0.09, -0.095, -0.43],
      rotation: [0.12, -0.55, -0.08],
      scale: 0.92,
    },
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.04, -0.205, 0.04],
      rotation: [-0.24, 0.05, 0.04],
      scale: 0.88,
    },
  ],
  carbine: [
    {
      handedness: 'left',
      grip: 'support',
      position: [-0.085, -0.095, -0.47],
      rotation: [0.1, -0.55, -0.07],
      scale: 0.92,
    },
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.04, -0.2, 0.03],
      rotation: [-0.23, 0.04, 0.035],
      scale: 0.88,
    },
  ],
  glock18: [
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.035, -0.215, 0.14],
      rotation: [-0.72, -0.42, 0.16],
      scale: 1.02,
    },
    {
      handedness: 'left',
      grip: 'pistol-support',
      // The support palm sits over the frame/magazine junction; keeping it
      // behind the muzzle prevents the glove from reading as a barrel cap.
      // The support wrist crosses the receiver instead of ending beside it;
      // the thumb then has a real frame to wrap around.
      position: [-0.04, -0.14, 0.09],
      rotation: [-0.28, 0.18, -0.78],
      scale: 1.02,
    },
  ],
  usp: [
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.035, -0.215, 0.14],
      rotation: [-0.72, -0.42, 0.16],
      scale: 1.02,
    },
    {
      handedness: 'left',
      grip: 'pistol-support',
      position: [-0.04, -0.14, 0.09],
      rotation: [-0.28, 0.18, -0.78],
      scale: 1.02,
    },
  ],
  p228: [
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.038, -0.212, 0.138],
      rotation: [-0.72, -0.42, 0.16],
      scale: 1.02,
    },
    {
      handedness: 'left',
      grip: 'pistol-support',
      position: [-0.038, -0.14, 0.09],
      rotation: [-0.28, 0.18, -0.78],
      scale: 1.02,
    },
  ],
  deagle: [
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.045, -0.22, 0.16],
      rotation: [-0.72, -0.38, 0.16],
      scale: 1.07,
    },
    {
      handedness: 'left',
      grip: 'pistol-support',
      position: [-0.035, -0.15, 0.105],
      rotation: [-0.3, 0.18, -0.74],
      scale: 1.04,
    },
  ],
  elite: [
    {
      handedness: 'left',
      grip: 'dual-wield',
      position: [-0.09, -0.215, 0.14],
      rotation: [-0.72, 0.42, -0.16],
      scale: 0.98,
    },
    {
      handedness: 'right',
      grip: 'dual-wield',
      position: [0.09, -0.215, 0.14],
      rotation: [-0.72, -0.42, 0.16],
      scale: 0.98,
    },
  ],
  fiveseven: [
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.035, -0.215, 0.14],
      rotation: [-0.72, -0.42, 0.16],
      scale: 1.02,
    },
    {
      handedness: 'left',
      grip: 'pistol-support',
      position: [-0.04, -0.14, 0.09],
      rotation: [-0.28, 0.18, -0.78],
      scale: 1.02,
    },
  ],
  smg: [
    {
      handedness: 'left',
      grip: 'support',
      position: [-0.09, -0.105, -0.4],
      rotation: [0.08, -0.55, -0.08],
      scale: 0.92,
    },
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.04, -0.205, 0.035],
      rotation: [-0.23, 0.04, 0.035],
      scale: 0.88,
    },
  ],
  shotgun: [
    {
      handedness: 'left',
      grip: 'support',
      position: [-0.095, -0.11, -0.59],
      rotation: [0.08, -0.55, -0.08],
      scale: 0.96,
    },
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.045, -0.205, 0.065],
      rotation: [-0.24, 0.04, 0.035],
      scale: 0.92,
    },
  ],
  sniper: [
    {
      handedness: 'left',
      grip: 'support',
      position: [-0.095, -0.06, -0.76],
      rotation: [0.06, -0.55, -0.07],
      scale: 0.96,
    },
    {
      handedness: 'right',
      grip: 'trigger',
      position: [0.045, -0.21, 0.075],
      rotation: [-0.25, 0.03, 0.025],
      scale: 0.9,
      forearmExtension: 1,
    },
  ],
  knife: [
    {
      handedness: 'right',
      grip: 'knife',
      position: [-0.012, -0.022, 0.38],
      // The handle runs on local Z. A quarter-turn puts the finger curl in
      // its X/Y cross-section so the handle passes through the fist.
      rotation: [-0.18, 1.4, 0.08],
      scale: 0.98,
    },
  ],
  grenade: [
    {
      handedness: 'right',
      grip: 'cradle',
      position: [0.035, -0.1, 0.13],
      rotation: [-0.24, -0.08, 0.12],
      scale: 1,
    },
  ],
  smoke: [
    {
      handedness: 'right',
      grip: 'cradle',
      position: [0.035, -0.11, 0.115],
      rotation: [-0.24, -0.08, 0.12],
      scale: 1,
    },
  ],
  flash: [
    {
      handedness: 'right',
      grip: 'cradle',
      position: [0.035, -0.11, 0.115],
      rotation: [-0.24, -0.08, 0.12],
      scale: 1,
    },
  ],
  bomb: [
    {
      handedness: 'left',
      grip: 'cradle',
      position: [-0.2, -0.12, 0.115],
      rotation: [0.28, 0.08, -0.24],
      scale: 0.96,
    },
    {
      handedness: 'right',
      grip: 'cradle',
      position: [0.2, -0.12, 0.115],
      rotation: [0.28, -0.08, 0.24],
      scale: 0.96,
    },
  ],
};

export function getViewmodelSleeveExit(
  handedness: ViewmodelHandedness,
  grip?: ViewmodelGripPose,
) {
  // Pistol support enters from below the receiver and is partly hidden by the
  // dominant hand. Both pistol branches converge on the lower-right frame
  // exit; the support branch sits a little farther from the camera so the
  // dominant forearm owns the visible sweep.
  if (grip === 'pistol-support') return [0.055, -0.96, 0.015] as const;
  if (grip === 'trigger') return [0.15, -1.04, -0.04] as const;
  // The unqualified/default value remains the shared long-arm QA contract.
  return [handedness === 'left' ? -0.2 : 0.2, -0.32, -0.08] as const;
}

type ArmGeometrySet = Readonly<{
  glove: THREE.BufferGeometry;
  sleeve: THREE.BufferGeometry;
}>;

function addTransformedGeometry(
  parts: THREE.BufferGeometry[],
  geometry: THREE.BufferGeometry,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
  scale: readonly [number, number, number] = [1, 1, 1],
  name = '',
) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
  geometry.applyMatrix4(matrix);
  geometry.userData.viewmodelPartName = name;
  parts.push(geometry);
}

type SleeveRing = Readonly<{
  center: THREE.Vector3;
  radius: number;
  scaleX: number;
  scaleZ: number;
}>;

/**
 * Build the wrist, cuff, elbow, and forearm as one closed indexed surface.
 * The old arm stacked capped cylinders at these joints. Their coplanar caps
 * fought under perspective and exposed triangle-shaped holes on the sleeve
 * underside. Shared rings leave no internal end faces and cannot split apart.
 */
function createContinuousSleeveGeometry(
  rings: readonly SleeveRing[],
  radialSegments = 8,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  const localAxis = new THREE.Vector3(0, -1, 0);

  rings.forEach((ring, ringIndex) => {
    const previous = rings[Math.max(0, ringIndex - 1)].center;
    const next = rings[Math.min(rings.length - 1, ringIndex + 1)].center;
    const tangent = next.clone().sub(previous).normalize();
    const orientation = new THREE.Quaternion().setFromUnitVectors(
      localAxis,
      tangent,
    );
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const offset = new THREE.Vector3(
        Math.cos(angle) * ring.radius * ring.scaleX,
        0,
        Math.sin(angle) * ring.radius * ring.scaleZ,
      ).applyQuaternion(orientation);
      positions.push(...ring.center.clone().add(offset).toArray());
    }
  });

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + nextSegment;
      const c = (ring + 1) * radialSegments + segment;
      const d = (ring + 1) * radialSegments + nextSegment;
      indices.push(a, b, c, b, d, c);
    }
  }

  const startCenter = positions.length / 3;
  positions.push(...rings[0].center.toArray());
  const endCenter = positions.length / 3;
  positions.push(...rings[rings.length - 1].center.toArray());
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const nextSegment = (segment + 1) % radialSegments;
    indices.push(startCenter, nextSegment, segment);
    const endRing = (rings.length - 1) * radialSegments;
    indices.push(endCenter, endRing + segment, endRing + nextSegment);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.continuousSleeve = true;
  geometry.userData.sleeveRingCount = rings.length;
  return geometry;
}

const TEXTURED_HAND_INFLUENCE_THRESHOLD = 0.18;
const VIEWMODEL_PALM_OFFSET_SOURCE_UNITS = 7;
const NO_VIEWMODEL_RAYCAST: THREE.Object3D['raycast'] = () => undefined;

export type TexturedViewmodelArmInstance = Readonly<{
  root: THREE.Group;
  mesh: THREE.Mesh;
  palmAnchor: THREE.Object3D;
}>;

export type TexturedViewmodelArmFactory = Readonly<{
  create: (pose: ViewmodelArmPose) => TexturedViewmodelArmInstance;
  ownsGeometry: (geometry: THREE.BufferGeometry) => boolean;
  ownsMaterial: (material: THREE.Material) => boolean;
  inspect: () => Readonly<{
    cachedPoses: number;
    triangles: number;
    materials: number;
  }>;
  dispose: () => void;
}>;

function normalizedBoneName(value: string): string {
  return value.replaceAll(':', '');
}

function findTexturedArmSource(scene: THREE.Object3D): THREE.SkinnedMesh {
  let result: THREE.SkinnedMesh | null = null;
  let triangleCount = -1;
  scene.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    if (
      !object.geometry.getAttribute('skinIndex') ||
      !object.geometry.getAttribute('skinWeight')
    )
      return;
    const count = countGeometryTriangles(object.geometry);
    if (count <= triangleCount) return;
    result = object;
    triangleCount = count;
  });
  if (!result)
    throw new Error('Vanguard viewmodel source has no skinned body mesh.');
  return result;
}

function findNamedBone(root: THREE.Object3D, name: string): THREE.Bone {
  const expected = normalizedBoneName(name);
  let result: THREE.Bone | null = null;
  root.traverse((object) => {
    if (
      !result &&
      object instanceof THREE.Bone &&
      normalizedBoneName(object.name) === expected
    )
      result = object;
  });
  if (!result) throw new Error(`Vanguard viewmodel source is missing ${name}.`);
  return result;
}

function applyTexturedHandPose(
  root: THREE.Object3D,
  handedness: ViewmodelHandedness,
  grip: ViewmodelGripPose,
) {
  const side = handedness === 'left' ? 'Left' : 'Right';
  const handSign = handedness === 'left' ? -1 : 1;
  const lowerCurl =
    grip === 'cradle'
      ? 0.58
      : grip === 'pistol-support'
        ? 1.14
        : grip === 'magazine-hold'
          ? 1.2
          : grip === 'support'
            ? 1.02
            : grip === 'knife'
              ? 1.32
              : 1.06;
  const indexCurl =
    grip === 'trigger' || grip === 'dual-wield'
      ? 0.88
      : grip === 'pistol-support'
        ? 1.08
        : grip === 'magazine-hold'
          ? 1.16
          : grip === 'cradle'
            ? 0.52
            : grip === 'knife'
              ? 1.25
              : 0.96;
  for (const finger of ['Index', 'Middle', 'Ring', 'Pinky'] as const) {
    const fingerCurl =
      (finger === 'Index' ? indexCurl : lowerCurl) *
      (finger === 'Ring' ? 1.06 : finger === 'Pinky' ? 1.1 : 1);
    for (const [joint, share] of [
      // Most of the turn belongs at the first knuckle. The previous shallow
      // first joint left every proximal segment pointing above the weapon.
      [1, 0.95],
      [2, 0.78],
      [3, 0.36],
    ] as const) {
      let bone: THREE.Bone;
      try {
        bone = findNamedBone(root, `mixamorig:${side}Hand${finger}${joint}`);
      } catch {
        // Vanguard's weighted pinky chain ends at joint 2.
        if (finger === 'Pinky' && joint === 3) continue;
        throw new Error(
          `Vanguard viewmodel source has an incomplete ${side} ${finger} chain.`,
        );
      }
      // The Vanguard hands are mirrored across their local Z hinge. Applying
      // one sign to both sides opens the support fingers away from the grip.
      bone.rotation.z += handSign * fingerCurl * share;
    }
  }
  const thumb1 = findNamedBone(root, `mixamorig:${side}HandThumb1`);
  const thumb2 = findNamedBone(root, `mixamorig:${side}HandThumb2`);
  const closedGrip =
    grip === 'trigger' ||
    grip === 'dual-wield' ||
    grip === 'pistol-support' ||
    grip === 'magazine-hold' ||
    grip === 'knife';
  // Target the weighted thumb pad rather than the terminal joint, which sits
  // well inside the Vanguard thumb mesh. The second joint folds the pad back
  // toward the object instead of leaving a straight peg below the wrist.
  const thumbBaseTurn =
    grip === 'support'
      ? [-0.2, 0.5, 1.35]
      : grip === 'knife'
        ? [-0.05, 0.7, -0.8]
        : grip === 'cradle'
          ? [-0.2, -0.48, -0.74]
          : grip === 'trigger' || grip === 'dual-wield'
            ? [-0.05, -0.7, -0.6]
            : [
                closedGrip ? 0.15 : 0.2,
                0.3,
                grip === 'magazine-hold' ? 0.78 : closedGrip ? 0 : 0.26,
              ];
  thumb1.rotation.x += handSign * thumbBaseTurn[0];
  thumb1.rotation.y += handSign * thumbBaseTurn[1];
  thumb1.rotation.z += handSign * thumbBaseTurn[2];
  thumb2.rotation.z +=
    handSign *
    (grip === 'cradle'
      ? -0.1
      : grip === 'magazine-hold'
        ? -0.52
        : grip === 'support'
          ? -0.8
          : closedGrip
            ? -0.15
            : 0.3);

  const forearm = findNamedBone(root, `mixamorig:${side}ForeArm`);
  forearm.rotation.x +=
    handSign *
    (grip === 'pistol-support' || grip === 'magazine-hold' ? 0.14 : 0.1);
  forearm.rotation.z +=
    handSign *
    (grip === 'trigger' || grip === 'dual-wield'
      ? 0.16
      : grip === 'knife'
        ? 0.2
        : 0.1);
}

function getTexturedPalmOrientation(
  root: THREE.Object3D,
  handedness: ViewmodelHandedness,
) {
  const side = handedness === 'left' ? 'Left' : 'Right';
  const wrist = findNamedBone(root, `mixamorig:${side}Hand`).getWorldPosition(
    new THREE.Vector3(),
  );
  const middleKnuckle = findNamedBone(
    root,
    `mixamorig:${side}HandMiddle1`,
  ).getWorldPosition(new THREE.Vector3());
  const indexKnuckle = findNamedBone(
    root,
    `mixamorig:${side}HandIndex1`,
  ).getWorldPosition(new THREE.Vector3());
  const pinkyKnuckle = findNamedBone(
    root,
    `mixamorig:${side}HandPinky1`,
  ).getWorldPosition(new THREE.Vector3());
  const fingers = middleKnuckle.sub(wrist).normalize();
  const acrossPalm = pinkyKnuckle.sub(indexKnuckle);
  acrossPalm.addScaledVector(fingers, -acrossPalm.dot(fingers)).normalize();
  const palmNormal = acrossPalm.clone().cross(fingers).normalize();
  const correctedAcross = fingers.clone().cross(palmNormal).normalize();
  return new THREE.Quaternion()
    .setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(correctedAcross, fingers, palmNormal),
    )
    .invert();
}

function createReferenceForearmGeometry(
  handedness: ViewmodelHandedness,
  grip: ViewmodelGripPose,
  extension = 0,
) {
  const handSign = handedness === 'left' ? -1 : 1;
  const visibleLength =
    grip === 'support'
      ? 1.1
      : grip === 'pistol-support' || grip === 'magazine-hold'
        ? 0.58
        : 0.66;
  const outwardTurn =
    handSign *
    (grip === 'trigger' || grip === 'dual-wield'
      ? 0.085
      : grip === 'knife'
        ? 0.065
        : grip === 'support'
          ? 0.32
          : 0.05);
  const rings: SleeveRing[] = [
    {
      center: new THREE.Vector3(0, -0.02, 0),
      radius: 0.048,
      scaleX: 0.92,
      scaleZ: 0.84,
    },
    {
      center: new THREE.Vector3(outwardTurn * 0.025, -0.065, 0.001),
      radius: 0.05,
      scaleX: 0.94,
      scaleZ: 0.86,
    },
    // A short cuff lip gives the leather a definite edge instead of a long
    // color fade down the arm. The close rings remain one closed surface.
    {
      center: new THREE.Vector3(outwardTurn * 0.03, -0.072, 0.001),
      radius: 0.05,
      scaleX: 0.94,
      scaleZ: 0.86,
    },
    {
      center: new THREE.Vector3(outwardTurn * 0.034, -0.076, 0.001),
      radius: 0.048,
      scaleX: 0.94,
      scaleZ: 0.86,
    },
    {
      center: new THREE.Vector3(outwardTurn * 0.08, -0.105, 0.002),
      radius: 0.052,
      scaleX: 0.95,
      scaleZ: 0.87,
    },
    {
      center: new THREE.Vector3(outwardTurn * 0.16, -0.19, 0.004),
      radius: grip === 'support' ? 0.065 : 0.059,
      scaleX: 0.96,
      scaleZ: 0.88,
    },
    {
      center: new THREE.Vector3(outwardTurn * 0.38, -0.31, 0.006),
      radius: grip === 'support' ? 0.082 : 0.07,
      scaleX: 0.98,
      scaleZ: 0.9,
    },
    {
      center: new THREE.Vector3(
        outwardTurn * 0.68,
        -visibleLength * 0.78,
        0.008,
      ),
      radius: grip === 'support' ? 0.112 : 0.081,
      scaleX: 1,
      scaleZ: 0.92,
    },
    {
      center: new THREE.Vector3(outwardTurn, -visibleLength, 0.01),
      radius: grip === 'support' ? 0.12 : 0.089,
      scaleX: 1.02,
      scaleZ: 0.94,
    },
  ];
  if (grip === 'support') {
    // Farther-mounted weapons (AWP and shotgun) expose more of the same arm.
    // Continue beyond their lower frame instead of ending at a visible cap.
    rings.push({
      center: new THREE.Vector3(0, -3, 0.02),
      radius: 0.18,
      scaleX: 1.02,
      scaleZ: 0.94,
    });
    // The longer support arm follows one sweep from cuff to frame exit.
    // Fixed fractions from the short arm created a visible mid-forearm kink.
    for (const ring of rings) {
      if (ring.center.y >= -0.076) continue;
      const progress = (-ring.center.y - 0.076) / (visibleLength - 0.076);
      ring.center.x = handSign * THREE.MathUtils.lerp(0.011, 0.5, progress);
    }
  }
  // The magazine reaches farther forward during reload than the idle grip.
  // Continue both morph shapes so the lower arm cannot end inside the frame.
  const endExtension =
    extension +
    (grip === 'pistol-support' || grip === 'magazine-hold' ? 0.2 : 0);
  if (endExtension > 0) {
    const last = rings.at(-1)!;
    const previous = rings.at(-2)!;
    const direction = last.center.clone().sub(previous.center).normalize();
    rings.push({
      center: last.center.clone().addScaledVector(direction, endExtension),
      radius: last.radius * 1.2,
      scaleX: last.scaleX,
      scaleZ: last.scaleZ,
    });
  }
  const forearm = createContinuousSleeveGeometry(rings, 12);
  forearm.userData.endRingStart = (rings.length - 1) * 12;
  const positions = forearm.getAttribute('position');
  const surfaceUvs = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    // A continuous planar projection avoids a stretched UV seam where the
    // last radial segment joins the first; skin grain still runs lengthwise.
    surfaceUvs[index * 2] =
      positions.getX(index) * 2.2 + positions.getZ(index) * 1.4 + 0.5;
    surfaceUvs[index * 2 + 1] = -positions.getY(index) / visibleLength;
  }
  forearm.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(new Float32Array(positions.count * 2), 2),
  );
  forearm.setAttribute('uv1', new THREE.Float32BufferAttribute(surfaceUvs, 2));
  const skin = new THREE.Color(
    TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.sleeveVertexColor,
  );
  const cuff = new THREE.Color(
    TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.gloveVertexColor,
  );
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const ring = Math.floor(index / 12);
    const color = ring < 3 || index === rings.length * 12 ? cuff : skin;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  forearm.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return forearm;
}

function isSideArmBone(name: string, handedness: ViewmodelHandedness): boolean {
  const side = handedness === 'left' ? 'Left' : 'Right';
  const normalized = normalizedBoneName(name);
  return (
    normalized === `mixamorig${side}Arm` ||
    normalized === `mixamorig${side}ForeArm` ||
    normalized.startsWith(`mixamorig${side}Hand`)
  );
}

function bakeTexturedArmGeometry(
  template: SkinnedCharacterTemplate,
  handedness: ViewmodelHandedness,
  grip: ViewmodelGripPose,
  forearmExtension = 0,
): THREE.BufferGeometry {
  if (handedness === 'left' && (grip === 'dual-wield' || grip === 'cradle')) {
    // Twin pistols and the device use matching grips on opposite sides.
    // Reflect the full bake so each glove back faces the first-person camera.
    const geometry = bakeTexturedArmGeometry(
      template,
      'right',
      grip,
      forearmExtension,
    );
    geometry.scale(-1, 1, 1);
    const index = geometry.getIndex()!;
    for (let triangle = 0; triangle < index.count; triangle += 3) {
      const corner = index.getX(triangle + 1);
      index.setX(triangle + 1, index.getX(triangle + 2));
      index.setX(triangle + 2, corner);
    }
    geometry.userData.viewmodelHandedness = handedness;
    for (const joints of Object.values(
      geometry.userData.viewmodelDigitLandmarks,
    ) as number[][][]) {
      for (const joint of joints) joint[0] *= -1;
    }
    return geometry;
  }
  const posed = cloneSkinned(template.scene) as THREE.Group;
  const mesh = findTexturedArmSource(posed);
  const source = mesh.geometry;
  const sourceIndex = source.index;
  const skinIndex = source.getAttribute('skinIndex');
  const skinWeight = source.getAttribute('skinWeight');
  const uv = source.getAttribute('uv');
  if (!sourceIndex || !skinIndex || !skinWeight || !uv)
    throw new Error(
      'Vanguard viewmodel body is missing indexed skin or UV data.',
    );

  applyTexturedHandPose(posed, handedness, grip);
  posed.updateMatrixWorld(true);
  mesh.skeleton.update();
  const armBoneIndices = new Set<number>();
  const handBoneIndices = new Set<number>();
  const fingertipBoneIndices = new Set<number>();
  mesh.skeleton.bones.forEach((bone, index) => {
    if (isSideArmBone(bone.name, handedness)) armBoneIndices.add(index);
    const side = handedness === 'left' ? 'Left' : 'Right';
    const name = normalizedBoneName(bone.name);
    if (name.startsWith(`mixamorig${side}Hand`)) handBoneIndices.add(index);
    if (
      new RegExp(
        `mixamorig${side}Hand(?:Index3|Middle3|Ring3|Pinky2|Thumb[23])$`,
      ).test(name)
    )
      fingertipBoneIndices.add(index);
  });
  if (armBoneIndices.size < 10)
    throw new Error(
      'Vanguard viewmodel arm has an incomplete weighted skeleton.',
    );

  const hand = findNamedBone(
    posed,
    `mixamorig:${handedness === 'left' ? 'Left' : 'Right'}Hand`,
  );
  const palm = new THREE.Vector3(
    0,
    VIEWMODEL_PALM_OFFSET_SOURCE_UNITS,
    0,
  ).applyMatrix4(hand.matrixWorld);
  const orientation = getTexturedPalmOrientation(posed, handedness);

  const influenceFrom = (vertex: number, boneIndices: ReadonlySet<number>) => {
    const indices = [
      skinIndex.getX(vertex),
      skinIndex.getY(vertex),
      skinIndex.getZ(vertex),
      skinIndex.getW(vertex),
    ];
    const weights = [
      skinWeight.getX(vertex),
      skinWeight.getY(vertex),
      skinWeight.getZ(vertex),
      skinWeight.getW(vertex),
    ];
    return indices.reduce(
      (total, boneIndex, index) =>
        total + (boneIndices.has(boneIndex) ? weights[index] : 0),
      0,
    );
  };
  const selectedSourceIndices: number[] = [];
  for (let offset = 0; offset < sourceIndex.count; offset += 3) {
    const triangle = [
      sourceIndex.getX(offset),
      sourceIndex.getX(offset + 1),
      sourceIndex.getX(offset + 2),
    ];
    if (
      triangle.every(
        (vertex) =>
          influenceFrom(vertex, handBoneIndices) >=
          TEXTURED_HAND_INFLUENCE_THRESHOLD,
      )
    )
      selectedSourceIndices.push(...triangle);
  }
  if (selectedSourceIndices.length === 0)
    throw new Error('Vanguard viewmodel arm crop produced no triangles.');

  const remapped = new Map<number, number>();
  const positions: number[] = [];
  const uvs: number[] = [];
  const surfaceUvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const weightedDigitSourceVertices = new Map<string, Set<number>>();
  for (const digit of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) {
    const digitBones = new Set<number>();
    mesh.skeleton.bones.forEach((bone, index) => {
      if (
        normalizedBoneName(bone.name).startsWith(
          `mixamorig${handedness === 'left' ? 'Left' : 'Right'}Hand${digit}`,
        )
      )
        digitBones.add(index);
    });
    const vertices = new Set<number>();
    selectedSourceIndices.forEach((vertex) => {
      if (influenceFrom(vertex, digitBones) >= 0.45) vertices.add(vertex);
    });
    weightedDigitSourceVertices.set(digit.toLowerCase(), vertices);
  }
  const skinned = new THREE.Vector3();
  const sleeveColor = new THREE.Color(
    TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.sleeveVertexColor,
  );
  const gloveColor = new THREE.Color(
    TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.gloveVertexColor,
  );
  const fingertipColor = new THREE.Color(
    TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.fingertipVertexColor,
  );
  const fabricColor = new THREE.Color();
  selectedSourceIndices.forEach((sourceVertex) => {
    let targetVertex = remapped.get(sourceVertex);
    if (targetVertex === undefined) {
      targetVertex = remapped.size;
      remapped.set(sourceVertex, targetVertex);
      mesh
        .getVertexPosition(sourceVertex, skinned)
        .applyMatrix4(mesh.matrixWorld)
        .sub(palm)
        .applyQuaternion(orientation);
      if (skinned.y < 0.005) {
        const ellipse = Math.hypot(skinned.x / 0.042, skinned.z / 0.038);
        const sleeveFit = Math.min(1, 1 / ellipse);
        const wristBlend =
          1 - THREE.MathUtils.smoothstep(skinned.y, -0.015, 0.005);
        const wristScale = THREE.MathUtils.lerp(1, sleeveFit, wristBlend);
        skinned.x *= wristScale;
        skinned.z *= wristScale;
      }
      positions.push(skinned.x, skinned.y, skinned.z);
      uvs.push(uv.getX(sourceVertex), uv.getY(sourceVertex));
      surfaceUvs.push(skinned.x * 4 + skinned.z * 2 + 0.5, skinned.y * 4 + 0.5);
      const gloveBlend = THREE.MathUtils.smoothstep(
        influenceFrom(sourceVertex, handBoneIndices),
        0.12,
        0.72,
      );
      fabricColor.copy(sleeveColor).lerp(gloveColor, gloveBlend);
      const fingertipBlend = THREE.MathUtils.smoothstep(
        influenceFrom(sourceVertex, fingertipBoneIndices),
        0.42,
        0.86,
      );
      fabricColor.lerp(fingertipColor, fingertipBlend);
      colors.push(fabricColor.r, fabricColor.g, fabricColor.b);
    }
    indices.push(targetVertex);
  });

  const handGeometry = new THREE.BufferGeometry();
  handGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  handGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  handGeometry.setAttribute(
    'uv1',
    new THREE.Float32BufferAttribute(surfaceUvs, 2),
  );
  handGeometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3),
  );
  handGeometry.setIndex(indices);
  handGeometry.computeVertexNormals();
  const sourceHandVertexCount = handGeometry.getAttribute('position').count;
  const forearmGeometry = createReferenceForearmGeometry(
    handedness,
    grip,
    forearmExtension,
  );
  const forearmEndRingStart =
    sourceHandVertexCount + forearmGeometry.userData.endRingStart;
  const geometry = mergeGeometries([handGeometry, forearmGeometry], false);
  handGeometry.dispose();
  forearmGeometry.dispose();
  if (!geometry)
    throw new Error('Unable to join first-person hand and forearm geometry.');
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.texturedViewmodelArm = true;
  geometry.userData.viewmodelHandedness = handedness;
  geometry.userData.viewmodelGrip = grip;
  geometry.userData.sourceTriangleCount = selectedSourceIndices.length / 3;
  geometry.userData.sourceHandVertexCount = sourceHandVertexCount;
  geometry.userData.viewmodelForearmEndRingStart = forearmEndRingStart;
  geometry.userData.handInfluenceThreshold = TEXTURED_HAND_INFLUENCE_THRESHOLD;
  const side = handedness === 'left' ? 'Left' : 'Right';
  geometry.userData.viewmodelDigitLandmarks = Object.fromEntries(
    ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb'].map((digit) => {
      const joints =
        digit === 'Pinky' || (digit === 'Thumb' && side === 'Left')
          ? [1, 2]
          : [1, 2, 3];
      return [
        digit.toLowerCase(),
        joints.map((joint) =>
          findNamedBone(posed, `mixamorig:${side}Hand${digit}${joint}`)
            .getWorldPosition(new THREE.Vector3())
            .sub(palm)
            .applyQuaternion(orientation)
            .toArray(),
        ),
      ];
    }),
  );
  geometry.userData.viewmodelWeightedDigitVertices = Object.fromEntries(
    [...weightedDigitSourceVertices].map(([digit, sourceVertices]) => [
      digit,
      [...sourceVertices]
        .map((sourceVertex) => remapped.get(sourceVertex))
        .filter((vertex): vertex is number => vertex !== undefined),
    ]),
  );
  return geometry;
}

/**
 * Bake the already-loaded Vanguard skin once per grip. Static meshes use the
 * first-person surface atlas without updating 49 hidden bones per arm.
 */
export function createTexturedViewmodelArmFactory(
  template: SkinnedCharacterTemplate,
  surfaceTexture: THREE.Texture,
): TexturedViewmodelArmFactory {
  const source = findTexturedArmSource(template.scene);
  if (Array.isArray(source.material))
    throw new Error('Vanguard viewmodel body must use one textured material.');
  const material = source.material.clone();
  material.name = 'textured-viewmodel-arm';
  if (material instanceof THREE.MeshStandardMaterial) {
    material.color.set(TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.color);
    material.emissive.set(TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.emissive);
    material.emissiveIntensity =
      TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.emissiveIntensity;
    material.roughness = TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.roughness;
    material.metalness = TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.metalness;
    material.vertexColors = true;
    applyViewmodelSurface(material, surfaceTexture);
  }
  const geometries = new Map<string, THREE.BufferGeometry>();
  let disposed = false;
  const create = (pose: ViewmodelArmPose): TexturedViewmodelArmInstance => {
    if (disposed)
      throw new Error('Textured viewmodel arm factory is disposed.');
    const key = `${pose.handedness}:${pose.grip}${pose.forearmExtension ? `:${pose.forearmExtension}` : ''}`;
    let geometry = geometries.get(key);
    if (!geometry) {
      geometry = bakeTexturedArmGeometry(
        template,
        pose.handedness,
        pose.grip,
        pose.forearmExtension,
      );
      geometries.set(key, geometry);
    }
    const root = new THREE.Group();
    root.name = `textured-${key}-viewmodel-arm`;
    root.userData.viewmodelArm = true;
    root.userData.viewmodelHandedness = pose.handedness;
    root.userData.viewmodelGrip = pose.grip;
    root.userData.visualOnly = true;
    root.raycast = NO_VIEWMODEL_RAYCAST;
    root.position.set(...pose.position);
    root.rotation.set(...pose.rotation);
    root.scale.setScalar(pose.scale);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `textured-${key}-mesh`;
    mesh.userData.viewmodelArm = true;
    mesh.userData.visualOnly = true;
    mesh.raycast = NO_VIEWMODEL_RAYCAST;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (pose.grip === 'pistol-support') {
      const reloadKey = `${pose.handedness}:magazine-hold`;
      let reloadGeometry = geometries.get(reloadKey);
      if (!reloadGeometry) {
        reloadGeometry = bakeTexturedArmGeometry(
          template,
          pose.handedness,
          'magazine-hold',
        );
        geometries.set(reloadKey, reloadGeometry);
      }
      const idlePositions = geometry.getAttribute('position');
      const reloadPositions = reloadGeometry.getAttribute('position');
      const idleNormals = geometry.getAttribute('normal');
      const reloadNormals = reloadGeometry.getAttribute('normal');
      if (
        idlePositions.count !== reloadPositions.count ||
        idleNormals.count !== reloadNormals.count
      )
        throw new Error(
          'Magazine grip must preserve the cached support-hand topology.',
        );
      geometry.morphAttributes.position = [reloadPositions];
      geometry.morphAttributes.normal = [reloadNormals];
      mesh.userData.viewmodelReloadGripGeometry = reloadGeometry;
      mesh.updateMorphTargets();
    }
    const palmAnchor = new THREE.Object3D();
    palmAnchor.name = `textured-${key}-palm-anchor`;
    palmAnchor.userData.visualOnly = true;
    palmAnchor.raycast = NO_VIEWMODEL_RAYCAST;
    root.add(palmAnchor);
    return { root, mesh, palmAnchor };
  };
  return Object.freeze({
    create,
    ownsGeometry: (geometry: THREE.BufferGeometry) =>
      [...geometries.values()].includes(geometry),
    ownsMaterial: (candidate: THREE.Material) => candidate === material,
    inspect: () =>
      Object.freeze({
        cachedPoses: geometries.size,
        triangles: [...geometries.values()].reduce(
          (total, geometry) => total + countGeometryTriangles(geometry),
          0,
        ),
        materials: 1,
      }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      geometries.forEach((geometry) => geometry.dispose());
      geometries.clear();
      // Maps belong to the shared character template and remain reusable.
      material.dispose();
    },
  });
}

export function createViewmodelArmGeometries(
  handedness: ViewmodelHandedness,
  grip: ViewmodelGripPose,
): ArmGeometrySet {
  const handSign = handedness === 'left' ? -1 : 1;
  const gloveParts: THREE.BufferGeometry[] = [];
  const sleeveParts: THREE.BufferGeometry[] = [];

  addTransformedGeometry(
    gloveParts,
    new THREE.CapsuleGeometry(0.052, 0.055, 4, 8),
    [0, 0, 0.012],
    [0, 0, 0],
    grip === 'pistol-support'
      ? [0.9, 0.98, 0.8]
      : grip === 'trigger' || grip === 'dual-wield'
        ? [0.96, 1, 0.8]
        : [1.08, 0.98, 0.82],
    'palm',
  );
  addTransformedGeometry(
    gloveParts,
    new THREE.CapsuleGeometry(0.042, 0.045, 3, 7),
    [0, -0.038, 0.028],
    [0, 0, 0],
    [1.16, 0.72, 0.86],
    'wrist-web',
  );
  // A shallow dorsal panel and three knuckle pads give the matte glove a
  // seam structure that catches light without adding another draw call.
  addTransformedGeometry(
    gloveParts,
    new THREE.CapsuleGeometry(0.022, 0.03, 2, 6),
    [0, 0.004, 0.057],
    [0, 0, Math.PI / 2],
    [0.94, 1, 0.24],
    'dorsal-panel',
  );
  [-0.028, 0, 0.028].forEach((offset, index) => {
    addTransformedGeometry(
      gloveParts,
      new THREE.BoxGeometry(0.012, 0.022, 0.005),
      [offset * handSign, 0.038, 0.057],
      [0, 0, 0],
      [1, 1, 1],
      `knuckle-seam-${index}`,
    );
  });

  // The knuckle web overlaps the palm and every finger base. Only the distal
  // finger segments remain separated, so a closed grip cannot read as beads
  // floating beside the weapon.
  addTransformedGeometry(
    gloveParts,
    new THREE.CapsuleGeometry(0.017, 0.058, 2, 6),
    [0, 0.024, -0.023],
    [0, 0, Math.PI / 2],
    [0.94, 1, 0.72],
    'knuckle-web',
  );

  const fingerCurl =
    grip === 'cradle'
      ? -0.5
      : grip === 'pistol-support'
        ? -0.68
        : grip === 'support'
          ? -0.82
          : grip === 'dual-wield'
            ? -0.96
            : -0.96;
  const fingerLength = grip === 'knife' ? 0.037 : 0.044;
  const fingerZ =
    grip === 'pistol-support' || grip === 'support' ? -0.045 : -0.039;
  const fingerY = grip === 'pistol-support' ? 0.014 : 0.008;
  // Three curled lower fingers plus the separately posed index finger below
  // produce the correct five-digit hand once the thumb is included. The old
  // four-finger loop plus a second index produced a six-pronged toy claw.
  [-0.039, 0, 0.039].forEach((offset, index) => {
    const mirroredOffset = offset * handSign;
    addTransformedGeometry(
      gloveParts,
      new THREE.CapsuleGeometry(0.0125, fingerLength, 3, 7),
      [mirroredOffset, fingerY - Math.abs(offset) * 0.12, fingerZ],
      [fingerCurl, 0, (index - 1) * -0.035 * handSign],
      [index === 0 || index === 2 ? 0.92 : 1, 1, 1],
      `lower-finger-${index}`,
    );
    addTransformedGeometry(
      gloveParts,
      new THREE.CapsuleGeometry(0.0105, 0.016, 2, 6),
      [mirroredOffset, 0.025, -0.012],
      [fingerCurl * 0.28, 0, 0],
      [1, 0.72, 0.76],
      `lower-knuckle-${index}`,
    );
  });
  const contact = getViewmodelHandContactAnchor(handedness, grip);
  addTransformedGeometry(
    gloveParts,
    new THREE.CapsuleGeometry(
      0.0135,
      grip === 'pistol-support' ? 0.052 : 0.046,
      3,
      7,
    ),
    contact,
    [
      grip === 'trigger' || grip === 'dual-wield' ? -1.34 : -0.42,
      0.12 * handSign,
      0,
    ],
    [1, 1, 0.82],
    'index-finger',
  );
  addTransformedGeometry(
    gloveParts,
    new THREE.CapsuleGeometry(0.0145, 0.048, 3, 7),
    [(grip === 'pistol-support' ? -0.052 : 0.052) * handSign, 0.005, -0.006],
    [0.08, 0.32 * handSign, -0.74 * handSign],
    [1, 1, 1],
    'thumb',
  );

  const dualWield = grip === 'dual-wield';
  const pistolSupport = grip === 'pistol-support';
  const cuffRadius = dualWield ? 0.078 : pistolSupport ? 0.074 : 0.085;
  const wrist = new THREE.Vector3(0, -0.165, 0.018);
  const sleeveRings: SleeveRing[] = [
    {
      center: new THREE.Vector3(0, -0.052, 0.022),
      radius: dualWield ? 0.061 : 0.067,
      scaleX: 0.96,
      scaleZ: 0.82,
    },
    {
      center: new THREE.Vector3(0, -0.1, 0.021),
      radius: dualWield ? 0.068 : 0.071,
      scaleX: 1,
      scaleZ: 0.86,
    },
    {
      center: new THREE.Vector3(0, -0.122, 0.02),
      radius: cuffRadius,
      scaleX: 1.06,
      scaleZ: 0.91,
    },
    {
      center: wrist,
      radius: cuffRadius * 1.07,
      scaleX: 1,
      scaleZ: 0.9,
    },
  ];
  if (grip === 'trigger' || grip === 'pistol-support') {
    // Both pistol arms turn toward the lower-right frame exit. The support
    // forearm stays slimmer and slightly behind the dominant hand.
    const dominant = grip === 'trigger';
    const elbow = dominant
      ? new THREE.Vector3(0.085, -0.46, -0.012)
      : new THREE.Vector3(0.092, -0.45, 0.012);
    sleeveRings.push(
      {
        center: elbow,
        radius: dominant ? 0.108 : 0.076,
        scaleX: dominant ? 0.82 : 0.62,
        scaleZ: dominant ? 0.95 : 0.84,
      },
      {
        center: new THREE.Vector3(...getViewmodelSleeveExit(handedness, grip)),
        radius: dominant ? 0.132 : 0.096,
        scaleX: dominant ? 0.8 : 0.62,
        scaleZ: dominant ? 0.94 : 0.86,
      },
    );
  } else {
    sleeveRings.push({
      center: new THREE.Vector3(...getViewmodelSleeveExit(handedness, grip)),
      radius: dualWield ? 0.105 : 0.116,
      scaleX: 0.9,
      scaleZ: 0.92,
    });
  }
  sleeveParts.push(createContinuousSleeveGeometry(sleeveRings));

  const glove = mergeGeometries(gloveParts, false);
  const sleeve = mergeGeometries(sleeveParts, false);
  const glovePartRanges: Array<{ name: string; start: number; count: number }> =
    [];
  let glovePartStart = 0;
  gloveParts.forEach((geometry) => {
    const count = geometry.getAttribute('position').count;
    glovePartRanges.push({
      name: String(geometry.userData.viewmodelPartName),
      start: glovePartStart,
      count,
    });
    glovePartStart += count;
  });
  gloveParts.forEach((geometry) => geometry.dispose());
  sleeveParts.forEach((geometry) => geometry.dispose());
  if (!glove || !sleeve)
    throw new Error('Unable to assemble first-person arm geometry.');
  glove.computeVertexNormals();
  glove.userData.viewmodelPartRanges = glovePartRanges;
  sleeve.computeVertexNormals();
  // Vertex colors carry the complete glove palette. The page uses a white
  // material multiplier so charcoal fabric and tan fingertip inserts retain
  // their authored separation under the same lights as the firearm.
  const glovePositions = glove.getAttribute('position');
  const colors = new Float32Array(glovePositions.count * 3);
  for (let index = 0; index < glovePositions.count; index += 1) {
    const z = glovePositions.getZ(index);
    const fingertip = z < -0.058;
    const dorsalSeam = z > 0.05;
    colors[index * 3] = fingertip ? 0.66 : dorsalSeam ? 0.24 : 0.14;
    colors[index * 3 + 1] = fingertip ? 0.4 : dorsalSeam ? 0.27 : 0.16;
    colors[index * 3 + 2] = fingertip ? 0.2 : dorsalSeam ? 0.25 : 0.155;
  }
  glove.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return { glove, sleeve };
}

export function countGeometryTriangles(geometry: THREE.BufferGeometry) {
  return geometry.index
    ? geometry.index.count / 3
    : geometry.getAttribute('position').count / 3;
}
