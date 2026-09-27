import * as THREE from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import {
  installClassicCharacterMesh,
  setClassicCharacterSide,
} from './classic-character-mesh.ts';
import {
  GLTFLoader,
  type GLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { BotAnimationPose } from './bot-animation.ts';
import type { CharacterSide } from './character-visuals.ts';
import type { CharacterRigWeaponGripKind } from './character-rig.ts';
import type { BotVisualPose } from './death-poses.ts';

export const SKINNED_CHARACTER_ASSET_URL =
  '/assets/characters/vanguard.glb' as const;
export const AUTHORED_CT_CHARACTER_ASSET_URL = '/assets/characters/ct-mpfb.glb';
// The gameplay authority was authored for a roughly 2.2 m standing capsule.
// Scale the retained animation skeleton from its grounded feet so the authored
// cloth mesh occupies the existing target volume.
export const SKINNED_CHARACTER_HEIGHT_METRES = 2.272;
export const SKINNED_CHARACTER_TRIANGLE_BUDGET = 12_000;
export const SKINNED_CHARACTER_DRAW_BUDGET = 2;

const NO_RAYCAST: THREE.Object3D['raycast'] = () => undefined;
const TAU = Math.PI * 2;
const MAX_RUN_SPEED = 4.8;
// Page pose inputs were authored against the same authority-sized body. Keep
// the equipped weapon at that chest-level reference after model normalization.
const WEAPON_SOCKET_BODY_OFFSET_Y = 0.1;
const WEAPON_SOCKET_BODY_OFFSET_Z = 0;
const WEAPON_GRIP_TARGETS: Readonly<
  Record<
    CharacterRigWeaponGripKind,
    Readonly<{ dominant: THREE.Vector3Tuple; support: THREE.Vector3Tuple }>
  >
> = {
  rifle: { dominant: [-0.07, 0.071, 0.141], support: [-0.07, 0.11, -0.089] },
  carbine: { dominant: [-0.07, 0.073, 0.139], support: [-0.07, 0.112, -0.086] },
  smg: { dominant: [-0.07, 0.078, 0.129], support: [-0.07, 0.11, -0.088] },
  shotgun: { dominant: [-0.07, 0.071, 0.141], support: [-0.13, 0.124, -0.18] },
  sniper: { dominant: [-0.07, 0.065, 0.129], support: [-0.13, 0.122, -0.177] },
  glock18: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  usp: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  p228: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  deagle: { dominant: [-0.07, 0.075, 0.132], support: [-0.01, 0.1, 0.09] },
  fiveseven: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  elite: { dominant: [-0.16, 0.081, 0.132], support: [-0.02, 0.1, 0.09] },
};

const REQUIRED_BONE_NAMES = [
  'mixamorig:Hips',
  'mixamorig:Spine',
  'mixamorig:Spine1',
  'mixamorig:Spine2',
  'mixamorig:Neck',
  'mixamorig:Head',
  'mixamorig:LeftArm',
  'mixamorig:LeftForeArm',
  'mixamorig:LeftHand',
  'mixamorig:RightArm',
  'mixamorig:RightForeArm',
  'mixamorig:RightHand',
  'mixamorig:LeftUpLeg',
  'mixamorig:LeftLeg',
  'mixamorig:LeftFoot',
  'mixamorig:RightUpLeg',
  'mixamorig:RightLeg',
  'mixamorig:RightFoot',
] as const;

export type SkinnedCharacterBoneName = (typeof REQUIRED_BONE_NAMES)[number];
export type SkinnedCharacterBones = Readonly<
  Record<SkinnedCharacterBoneName, THREE.Bone>
>;

export type SkinnedCharacterAnimationWeights = Readonly<{
  idle: number;
  walk: number;
  run: number;
}>;

export type SkinnedCharacterTemplate = Readonly<{
  scene: THREE.Group;
  animations: readonly THREE.AnimationClip[];
  sourceHeight: number;
  surface: 'classic' | 'authored';
}>;

type SkinnedCharacterActions = Readonly<{
  idle: THREE.AnimationAction;
  walk: THREE.AnimationAction;
  run: THREE.AnimationAction;
}>;

type SkinnedGroundSupportMesh = Readonly<{
  mesh: THREE.SkinnedMesh;
  vertexIndices: readonly number[];
  /** Rebuilt after every skeleton update; never reused across grounding calls. */
  bonePalette: Float64Array;
  meshVertex: THREE.Vector3;
  baseVertex: THREE.Vector4;
  transformedVertex: THREE.Vector4;
  skinnedVertex: THREE.Vector3;
  rootVertex: THREE.Vector3;
}>;

export type SkinnedCharacterInstance = {
  /** Add beside the gameplay authority root. It contains no hit geometry. */
  readonly visualRoot: THREE.Group;
  readonly modelRoot: THREE.Group;
  readonly model: THREE.Group;
  readonly mixer: THREE.AnimationMixer;
  readonly actions: SkinnedCharacterActions;
  readonly bones: SkinnedCharacterBones;
  /** World-scale sockets synchronized from the skinned hands/head each sample. */
  readonly dominantHandSocket: THREE.Object3D;
  readonly supportHandSocket: THREE.Object3D;
  readonly headSocket: THREE.Object3D;
  readonly dominantPalmAnchor: THREE.Object3D;
  readonly supportPalmAnchor: THREE.Object3D;
  /** Metre-scale weapon assembly; existing world weapon models attach here. */
  readonly weaponSocket: THREE.Object3D;
  readonly dominantGripTarget: THREE.Object3D;
  readonly supportGripTarget: THREE.Object3D;
  readonly materials: readonly THREE.Material[];
  readonly baseMaterialColors: readonly THREE.Color[];
  readonly modelUnitsPerMetre: number;
  readonly pelvisUpInParent: THREE.Vector3;
  readonly surface: SkinnedCharacterTemplate['surface'];
  readonly correctionFrames: Readonly<Record<SkinnedCharacterBoneName, THREE.Quaternion>>;
  readonly modelGroundOffsetY: number;
  side: CharacterSide;
};

export type SkinnedCharacterPoseOptions = Readonly<{
  /** Deterministic idle clock; gait timing continues to use pose.phase. */
  elapsedSeconds?: number;
}>;

const templatePromises = new Map<string, Promise<SkinnedCharacterTemplate>>();
const scratchPosition = new THREE.Vector3();
const scratchQuaternion = new THREE.Quaternion();
const scratchRootQuaternion = new THREE.Quaternion();
const scratchJointPosition = new THREE.Vector3();
const scratchEndPosition = new THREE.Vector3();
const scratchCurrentDirection = new THREE.Vector3();
const scratchTargetDirection = new THREE.Vector3();
const scratchShoulderPosition = new THREE.Vector3();
const scratchElbowPosition = new THREE.Vector3();
const scratchPalmPosition = new THREE.Vector3();
const scratchGripPosition = new THREE.Vector3();
const scratchPolePosition = new THREE.Vector3();
const scratchPoleDirection = new THREE.Vector3();
const scratchDesiredElbowPosition = new THREE.Vector3();
const scratchSolveDirection = new THREE.Vector3();
const scratchDeltaQuaternion = new THREE.Quaternion();
const scratchJointQuaternion = new THREE.Quaternion();
const scratchParentQuaternion = new THREE.Quaternion();
const scratchDeathQuaternion = new THREE.Quaternion();
const scratchDeathBoneQuaternion = new THREE.Quaternion();
const scratchDeathBoneDeltaQuaternion = new THREE.Quaternion();
const scratchEuler = new THREE.Euler();
const scratchGroundTransform = new THREE.Matrix4();
const scratchVisualRootInverse = new THREE.Matrix4();
const scratchGroundBoneMatrix = new THREE.Matrix4();
const groundSupportIndicesByGeometry = new WeakMap<
  THREE.BufferGeometry,
  readonly number[]
>();
const groundSupportMeshesByInstance = new WeakMap<
  SkinnedCharacterInstance,
  readonly SkinnedGroundSupportMesh[]
>();
type NeutralBoneTransform = Readonly<{
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}>;
const neutralDeathBonesByInstance = new WeakMap<
  SkinnedCharacterInstance,
  Readonly<Record<SkinnedCharacterBoneName, NeutralBoneTransform>>
>();
const deathStartBonesByInstance = new WeakMap<
  SkinnedCharacterInstance,
  Readonly<Record<SkinnedCharacterBoneName, NeutralBoneTransform>>
>();
const locomotionBonesByInstance = new WeakMap<
  SkinnedCharacterInstance,
  Readonly<Record<SkinnedCharacterBoneName, NeutralBoneTransform>>
>();

function finite(value: number | undefined, fallback = 0): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function captureBoneTransforms(
  instance: SkinnedCharacterInstance,
): Readonly<Record<SkinnedCharacterBoneName, NeutralBoneTransform>> {
  return Object.fromEntries(
    REQUIRED_BONE_NAMES.map((name) => [
      name,
      Object.freeze({
        position: instance.bones[name].position.clone(),
        quaternion: instance.bones[name].quaternion.clone(),
      }),
    ]),
  ) as Record<SkinnedCharacterBoneName, NeutralBoneTransform>;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function markVisualOnly(object: THREE.Object3D): void {
  object.userData.visualOnly = true;
  object.raycast = NO_RAYCAST;
}

function animationByName(
  animations: readonly THREE.AnimationClip[],
  name: 'Idle' | 'Walk' | 'Run',
): THREE.AnimationClip {
  const clip = animations.find(
    (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
  );
  if (!clip) throw new Error(`Skinned character is missing ${name} animation`);
  return clip;
}

function findBones(model: THREE.Object3D): SkinnedCharacterBones {
  const found = {} as Record<SkinnedCharacterBoneName, THREE.Bone>;
  model.traverse((object) => {
    if (!(object instanceof THREE.Bone)) return;
    const canonicalName = REQUIRED_BONE_NAMES.find(
      (name) => name.replace(':', '') === object.name,
    );
    if (canonicalName) found[canonicalName] = object;
  });
  for (const name of REQUIRED_BONE_NAMES)
    if (!found[name])
      throw new Error(`Skinned character is missing bone ${name}`);
  return found;
}

export function createSkinnedCharacterTemplate(
  gltf: GLTF,
  surface: SkinnedCharacterTemplate['surface'] = 'classic',
): SkinnedCharacterTemplate {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene);
  const sourceHeight = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0)
    throw new Error('Skinned character source has invalid bounds');
  findBones(scene);
  animationByName(gltf.animations, 'Idle');
  animationByName(gltf.animations, 'Walk');
  animationByName(gltf.animations, 'Run');
  return Object.freeze({
    scene,
    animations: Object.freeze([...gltf.animations]),
    sourceHeight,
    surface,
  });
}

/** Load and validate one shared GLB template. Calls for the same URL coalesce. */
export function preloadSkinnedCharacter(
  url: string = SKINNED_CHARACTER_ASSET_URL,
  surface: SkinnedCharacterTemplate['surface'] = 'classic',
): Promise<SkinnedCharacterTemplate> {
  const cacheKey = `${surface}:${url}`;
  let pending = templatePromises.get(cacheKey);
  if (!pending) {
    pending = new GLTFLoader()
      .loadAsync(url)
      .then((gltf) => createSkinnedCharacterTemplate(gltf, surface))
      .catch((error: unknown) => {
        templatePromises.delete(cacheKey);
        throw error;
      });
    templatePromises.set(cacheKey, pending);
  }
  return pending;
}

export function getSkinnedCharacterAnimationWeights(
  speed: number,
): SkinnedCharacterAnimationWeights {
  const movement = clamp01(Math.abs(finite(speed)) / MAX_RUN_SPEED);
  const run = clamp01((movement - 0.52) / 0.48);
  return Object.freeze({
    idle: 1 - movement,
    walk: movement * (1 - run),
    run: movement * run,
  });
}

export function getSkinnedCharacterNormalizedPhase(phase: number): number {
  const safe = finite(phase);
  return (((safe % TAU) + TAU) % TAU) / TAU;
}

function cloneInstanceMaterials(model: THREE.Object3D): Readonly<{
  materials: THREE.Material[];
  baseMaterialColors: THREE.Color[];
}> {
  const replacements = new Map<THREE.Material, THREE.Material>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const cloneMaterial = (source: THREE.Material) => {
      let replacement = replacements.get(source);
      if (!replacement) {
        replacement = source.clone();
        replacements.set(source, replacement);
      }
      return replacement;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
  });
  const materials = [...replacements.values()];
  return {
    materials,
    baseMaterialColors: materials.map((material) =>
      'color' in material && material.color instanceof THREE.Color
        ? material.color.clone()
        : new THREE.Color(1, 1, 1),
    ),
  };
}

function createSocket(name: string, parent: THREE.Object3D): THREE.Object3D {
  const socket = new THREE.Object3D();
  socket.name = name;
  markVisualOnly(socket);
  parent.add(socket);
  return socket;
}

function authoredPalmOffset(hand: THREE.Bone): THREE.Vector3 {
  const knuckles = hand.children.filter((child) =>
    child instanceof THREE.Bone && /Hand(Index|Middle|Ring|Pinky)1$/.test(child.name),
  );
  if (knuckles.length < 3) throw new Error(`Missing finger-root landmarks for ${hand.name}`);
  const center = new THREE.Vector3();
  for (const knuckle of knuckles) center.add(knuckle.position);
  // A palm contact lies between wrist and knuckles in the source's own units.
  return center.multiplyScalar(0.65 / knuckles.length);
}

function writeCorrectionQuaternion(
  instance: SkinnedCharacterInstance,
  name: SkinnedCharacterBoneName,
  target: THREE.Quaternion,
  pitch: number,
  yaw = 0,
  roll = 0,
): void {
  target.setFromEuler(scratchEuler.set(pitch, yaw, roll));
  if (instance.surface === 'authored') {
    // Express character-space hinges in each native bone's bind frame.
    const frame = instance.correctionFrames[name];
    scratchParentQuaternion.copy(frame).invert();
    target.premultiply(scratchParentQuaternion).multiply(frame);
  }
}

function rotatePoseBone(
  instance: SkinnedCharacterInstance,
  name: SkinnedCharacterBoneName,
  pitch: number,
  yaw = 0,
): void {
  const bone = instance.bones[name];
  if (instance.surface === 'classic') {
    bone.rotation.x += pitch;
    bone.rotation.y += yaw;
    return;
  }
  writeCorrectionQuaternion(instance, name, scratchDeltaQuaternion, pitch, yaw);
  bone.quaternion.multiply(scratchDeltaQuaternion);
}

function updateSkinnedMeshSkeletons(model: THREE.Object3D): void {
  model.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) object.skeleton.update();
  });
}

function getGroundSupportVertexIndices(
  geometry: THREE.BufferGeometry,
): readonly number[] {
  const cached = groundSupportIndicesByGeometry.get(geometry);
  if (cached) return cached;
  const position = geometry.getAttribute('position');
  const skinIndex = geometry.getAttribute('skinIndex');
  const skinWeight = geometry.getAttribute('skinWeight');
  if (!position || !skinIndex || !skinWeight)
    throw new Error('Skinned character geometry is missing skin attributes');

  const points = Array.from({ length: position.count }, (_, index) =>
    new THREE.Vector3().fromBufferAttribute(position, index));
  const vertexByPoint = new Map(points.map((point, index) => [point, index]));
  const pointsByBone = new Map<number, THREE.Vector3[]>([[-1, points]]);
  for (let index = 0; index < position.count; index += 1) {
    for (let influence = 0; influence < 4; influence += 1) {
      if (skinWeight.getComponent(index, influence) < 0.05) continue;
      const bone = skinIndex.getComponent(index, influence);
      let group = pointsByBone.get(bone);
      if (!group) {
        group = [];
        pointsByBone.set(bone, group);
      }
      group.push(points[index]);
    }
  }
  // Standard QuickHull retains surface corners that a fixed direction grid
  // misses when a trouser leg or boot rotates. Build once per shared geometry.
  // Blended weights still require the full-skin error regression check.
  const selected = new Set<number>();
  for (const group of pointsByBone.values()) {
    if (group.length < 4) {
      group.forEach((point) => selected.add(vertexByPoint.get(point)!));
      continue;
    }
    const hull = new ConvexHull().setFromPoints(group);
    for (const face of hull.faces) {
      let edge = face.edge;
      do {
        selected.add(vertexByPoint.get(edge.head().point)!);
        edge = edge.next;
      } while (edge !== face.edge);
    }
  }
  const result = Object.freeze([...selected]);
  groundSupportIndicesByGeometry.set(geometry, result);
  return result;
}

function createGroundSupportMeshes(
  model: THREE.Object3D,
): readonly SkinnedGroundSupportMesh[] {
  const supports: SkinnedGroundSupportMesh[] = [];
  model.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    supports.push(
      Object.freeze({
        mesh: object,
        vertexIndices: getGroundSupportVertexIndices(object.geometry),
        bonePalette: new Float64Array(object.skeleton.bones.length * 16),
        meshVertex: new THREE.Vector3(),
        baseVertex: new THREE.Vector4(),
        transformedVertex: new THREE.Vector4(),
        skinnedVertex: new THREE.Vector3(),
        rootVertex: new THREE.Vector3(),
      }),
    );
  });
  return Object.freeze(supports);
}

function updateGroundSupportBonePalette(support: SkinnedGroundSupportMesh): void {
  const { bonePalette, mesh } = support;
  const { boneInverses, bones } = mesh.skeleton;
  for (let boneIndex = 0; boneIndex < bones.length; boneIndex += 1) {
    scratchGroundBoneMatrix.multiplyMatrices(
      bones[boneIndex].matrixWorld,
      boneInverses[boneIndex],
    );
    bonePalette.set(scratchGroundBoneMatrix.elements, boneIndex * 16);
  }
}

function applyGroundSupportPaletteTransform(
  support: SkinnedGroundSupportMesh,
  boneIndex: number,
  target: THREE.Vector4,
): THREE.Vector4 {
  const paletteOffset = boneIndex * 16;
  const palette = support.bonePalette;
  const x = target.x;
  const y = target.y;
  const z = target.z;
  const w = target.w;
  // This is Vector4.applyMatrix4 copied in native multiplication order. The
  // Float64 palette avoids allocating a Matrix4 for every live influence.
  target.x =
    palette[paletteOffset] * x +
    palette[paletteOffset + 4] * y +
    palette[paletteOffset + 8] * z +
    palette[paletteOffset + 12] * w;
  target.y =
    palette[paletteOffset + 1] * x +
    palette[paletteOffset + 5] * y +
    palette[paletteOffset + 9] * z +
    palette[paletteOffset + 13] * w;
  target.z =
    palette[paletteOffset + 2] * x +
    palette[paletteOffset + 6] * y +
    palette[paletteOffset + 10] * z +
    palette[paletteOffset + 14] * w;
  target.w =
    palette[paletteOffset + 3] * x +
    palette[paletteOffset + 7] * y +
    palette[paletteOffset + 11] * z +
    palette[paletteOffset + 15] * w;
  return target;
}

function sampleGroundSupportVertex(
  support: SkinnedGroundSupportMesh,
  vertexIndex: number,
  meshToVisualRoot: THREE.Matrix4,
): THREE.Vector3 {
  const {
    mesh,
    meshVertex,
    baseVertex,
    rootVertex,
    skinnedVertex,
    transformedVertex,
  } = support;
  const skinIndex = mesh.geometry.getAttribute('skinIndex');
  const skinWeight = mesh.geometry.getAttribute('skinWeight');
  if (!skinIndex || !skinWeight) {
    throw new Error('Skinned character geometry is missing skin attributes');
  }

  // Keep Mesh's current position and relative/absolute morph behavior before
  // reproducing SkinnedMesh's Vector4 bind and weighted bone arithmetic.
  THREE.Mesh.prototype.getVertexPosition.call(mesh, vertexIndex, meshVertex);
  baseVertex.set(meshVertex.x, meshVertex.y, meshVertex.z, 1).applyMatrix4(
    mesh.bindMatrix,
  );
  skinnedVertex.set(0, 0, 0);
  for (let influence = 0; influence < 4; influence += 1) {
    const weight = skinWeight.getComponent(vertexIndex, influence);
    if (weight === 0) {
      continue;
    }
    const boneIndex = skinIndex.getComponent(vertexIndex, influence);
    transformedVertex
      .copy(baseVertex);
    applyGroundSupportPaletteTransform(
      support,
      boneIndex,
      transformedVertex,
    );
    // Match Three's Vector3 target branch exactly: the temporary transformed
    // vertex remains homogeneous, while the weighted accumulation uses xyz.
    skinnedVertex.x += transformedVertex.x * weight;
    skinnedVertex.y += transformedVertex.y * weight;
    skinnedVertex.z += transformedVertex.z * weight;
  }
  // Three's getVertexPosition passes Vector3 to applyBoneTransform, so this
  // native bind-inverse step includes Vector3's final homogeneous divide.
  skinnedVertex.applyMatrix4(mesh.bindMatrixInverse);
  rootVertex
    .copy(skinnedVertex)
    .applyMatrix4(meshToVisualRoot);
  return rootVertex;
}

function prepareGroundSupportSampling(
  instance: SkinnedCharacterInstance,
): readonly SkinnedGroundSupportMesh[] {
  instance.visualRoot.updateMatrixWorld(true);
  updateSkinnedMeshSkeletons(instance.model);
  scratchVisualRootInverse.copy(instance.visualRoot.matrixWorld).invert();
  const supports = groundSupportMeshesByInstance.get(instance) ?? [];
  for (const support of supports) {
    updateGroundSupportBonePalette(support);
  }
  return supports;
}

/** Test seam for direct comparison with Three's native skinned-vertex oracle. */
export function inspectSkinnedCharacterGroundSupport(
  instance: SkinnedCharacterInstance,
): readonly Readonly<{
  mesh: THREE.SkinnedMesh;
  vertexIndex: number;
  position: THREE.Vector3;
}>[] {
  const samples: Array<{
    mesh: THREE.SkinnedMesh;
    vertexIndex: number;
    position: THREE.Vector3;
  }> = [];
  for (const support of prepareGroundSupportSampling(instance)) {
    scratchGroundTransform.multiplyMatrices(
      scratchVisualRootInverse,
      support.mesh.matrixWorld,
    );
    for (let supportIndex = 0; supportIndex < support.vertexIndices.length; supportIndex += 1) {
      const vertexIndex = support.vertexIndices[supportIndex];
      samples.push({
        mesh: support.mesh,
        vertexIndex,
        position: sampleGroundSupportVertex(
          support,
          vertexIndex,
          scratchGroundTransform,
        ).clone(),
      });
    }
  }
  return samples;
}

/** Ground the reduced skinned support hull in visualRoot-local coordinates. */
function groundSkinnedCharacter(instance: SkinnedCharacterInstance): number {
  let minimumY = Number.POSITIVE_INFINITY;
  for (const support of prepareGroundSupportSampling(instance)) {
    scratchGroundTransform.multiplyMatrices(
      scratchVisualRootInverse,
      support.mesh.matrixWorld,
    );
    for (let supportIndex = 0; supportIndex < support.vertexIndices.length; supportIndex += 1) {
      const vertexIndex = support.vertexIndices[supportIndex];
      const groundedVertex = sampleGroundSupportVertex(
        support,
        vertexIndex,
        scratchGroundTransform,
      );
      minimumY = Math.min(minimumY, groundedVertex.y);
    }
  }
  if (!Number.isFinite(minimumY)) return 0;
  instance.modelRoot.position.y -= minimumY;
  return -minimumY;
}

/** Clone a skeleton-safe render instance. Geometry and textures remain shared. */
export function createSkinnedCharacterInstance(
  template: SkinnedCharacterTemplate,
  side: CharacterSide,
): SkinnedCharacterInstance {
  const visualRoot = new THREE.Group();
  visualRoot.name = 'skinnedCharacterVisualRoot';
  markVisualOnly(visualRoot);
  const modelRoot = new THREE.Group();
  modelRoot.name = 'skinnedCharacterModelRoot';
  markVisualOnly(modelRoot);
  // Soldier.glb already faces local -Z, matching gameplay and weapon models.
  // Keeping the adapter rotation-free also lets caller-owned body yaw remain
  // the single facing transform.
  const model = cloneSkinned(template.scene) as THREE.Group;
  model.name = 'skinnedCharacterModel';
  modelRoot.add(model);
  visualRoot.add(modelRoot);
  modelRoot.updateMatrixWorld(true);
  // Keep the retained skeleton scale stable when clothing or headgear changes.
  const initialBounds = new THREE.Box3().setFromObject(modelRoot);
  if (template.surface === 'classic') installClassicCharacterMesh(model, side);
  const initialHeight = initialBounds.max.y - initialBounds.min.y;
  const normalization = SKINNED_CHARACTER_HEIGHT_METRES / initialHeight;
  modelRoot.scale.setScalar(normalization);
  modelRoot.updateMatrixWorld(true);
  const normalizedBounds = new THREE.Box3().setFromObject(modelRoot);
  modelRoot.position.y -= normalizedBounds.min.y;
  const modelGroundOffsetY = modelRoot.position.y;

  const mixer = new THREE.AnimationMixer(model);
  const actions: SkinnedCharacterActions = {
    idle: mixer.clipAction(animationByName(template.animations, 'Idle')),
    walk: mixer.clipAction(animationByName(template.animations, 'Walk')),
    run: mixer.clipAction(animationByName(template.animations, 'Run')),
  };
  for (const action of Object.values(actions)) {
    action.play();
    action.paused = true;
    action.enabled = true;
  }
  const bones = findBones(model);
  const { materials, baseMaterialColors } = cloneInstanceMaterials(model);
  model.traverse(markVisualOnly);
  const dominantHandSocket = createSocket('dominantHandSocket', visualRoot);
  const supportHandSocket = createSocket('supportHandSocket', visualRoot);
  const headSocket = createSocket('headSocket', visualRoot);
  const weaponSocket = createSocket('weaponSocket', visualRoot);
  // Mixamo's hand bone sits at the wrist. Finger roots show the palm center
  // about seven source centimetres along local +Y, so IK targets the glove
  // body rather than pulling the wrist joint through the weapon grip.
  const dominantPalmAnchor = createSocket(
    'dominantPalmAnchor',
    bones['mixamorig:RightHand'],
  );
  if (template.surface === 'authored')
    dominantPalmAnchor.position.copy(authoredPalmOffset(bones['mixamorig:RightHand']));
  else dominantPalmAnchor.position.y = 7;
  const supportPalmAnchor = createSocket(
    'supportPalmAnchor',
    bones['mixamorig:LeftHand'],
  );
  if (template.surface === 'authored')
    supportPalmAnchor.position.copy(authoredPalmOffset(bones['mixamorig:LeftHand']));
  else supportPalmAnchor.position.y = 7;
  const dominantGripTarget = createSocket('dominantGripTarget', weaponSocket);
  const supportGripTarget = createSocket('supportGripTarget', weaponSocket);
  visualRoot.updateMatrixWorld(true);
  const hipsParent = bones['mixamorig:Hips'].parent;
  if (!hipsParent) throw new Error('The character pelvis requires a parent transform.');
  const parentInverse = hipsParent.matrixWorld.clone().invert();
  const pelvisUpInParent = new THREE.Vector3(0, 1, 0).applyMatrix4(parentInverse)
    .sub(new THREE.Vector3().applyMatrix4(parentInverse));
  const correctionFrames = Object.fromEntries(REQUIRED_BONE_NAMES.map((name) =>
    [name, bones[name].getWorldQuaternion(new THREE.Quaternion())],
  )) as Record<SkinnedCharacterBoneName, THREE.Quaternion>;
  const instance: SkinnedCharacterInstance = {
    visualRoot,
    modelRoot,
    model,
    mixer,
    actions,
    bones,
    dominantHandSocket,
    supportHandSocket,
    headSocket,
    dominantPalmAnchor,
    supportPalmAnchor,
    weaponSocket,
    dominantGripTarget,
    supportGripTarget,
    materials,
    baseMaterialColors,
    modelUnitsPerMetre: pelvisUpInParent.length(),
    pelvisUpInParent,
    surface: template.surface,
    correctionFrames,
    modelGroundOffsetY,
    side,
  };
  // Capture the asset's authored bind skeleton before any locomotion clip is
  // sampled. Its feet share a neutral plane, unlike the rifle idle stance's
  // staggered boots, so rotating it flat cannot recreate a raised balance pose.
  neutralDeathBonesByInstance.set(instance, captureBoneTransforms(instance));
  locomotionBonesByInstance.set(instance, captureBoneTransforms(instance));
  groundSupportMeshesByInstance.set(instance, createGroundSupportMeshes(model));
  instance.weaponSocket.position.set(
    0.07,
    1.2 + WEAPON_SOCKET_BODY_OFFSET_Y,
    -0.34 + WEAPON_SOCKET_BODY_OFFSET_Z,
  );
  setSkinnedCharacterWeaponGrip(instance, 'rifle');
  setSkinnedCharacterSide(instance, side);
  sampleSkinnedCharacterPose(instance, {}, { elapsedSeconds: 0 });
  return instance;
}

export function setSkinnedCharacterWeaponGrip(
  instance: SkinnedCharacterInstance,
  kind: CharacterRigWeaponGripKind,
): void {
  const targets = WEAPON_GRIP_TARGETS[kind];
  instance.dominantGripTarget.position.set(...targets.dominant);
  instance.supportGripTarget.position.set(...targets.support);
}

/** Swap the authored faction colors while retaining the shared skinned surface. */
export function setSkinnedCharacterSide(
  instance: SkinnedCharacterInstance,
  side: CharacterSide,
): void {
  if (instance.surface === 'classic') setClassicCharacterSide(instance.model, side);
  instance.materials.forEach((material, index) => {
    if ('color' in material && material.color instanceof THREE.Color) {
      material.color.copy(instance.baseMaterialColors[index]);
      material.needsUpdate = true;
    }
  });
  instance.side = side;
}

function writeSocketFromAnchor(
  visualRoot: THREE.Object3D,
  socket: THREE.Object3D,
  anchor: THREE.Object3D,
): void {
  anchor.getWorldPosition(scratchPosition);
  socket.position.copy(visualRoot.worldToLocal(scratchPosition));
  anchor.getWorldQuaternion(scratchQuaternion);
  visualRoot.getWorldQuaternion(scratchRootQuaternion).invert();
  socket.quaternion.copy(scratchRootQuaternion.multiply(scratchQuaternion));
  // Keep caller-owned metre-scale weapon models from inheriting Mixamo scale.
  socket.scale.set(1, 1, 1);
}

export function syncSkinnedCharacterSockets(
  instance: SkinnedCharacterInstance,
): void {
  instance.visualRoot.updateMatrixWorld(true);
  writeSocketFromAnchor(
    instance.visualRoot,
    instance.dominantHandSocket,
    instance.dominantPalmAnchor,
  );
  writeSocketFromAnchor(
    instance.visualRoot,
    instance.supportHandSocket,
    instance.supportPalmAnchor,
  );
  writeSocketFromAnchor(
    instance.visualRoot,
    instance.headSocket,
    instance.bones['mixamorig:Head'],
  );
}

function rotateBoneTowardPoint(
  bone: THREE.Bone,
  endpoint: THREE.Object3D,
  targetPosition: THREE.Vector3,
): void {
  bone.getWorldPosition(scratchJointPosition);
  endpoint.getWorldPosition(scratchEndPosition);
  scratchCurrentDirection.subVectors(scratchEndPosition, scratchJointPosition);
  scratchTargetDirection.subVectors(targetPosition, scratchJointPosition);
  if (
    scratchCurrentDirection.lengthSq() < 1e-8 ||
    scratchTargetDirection.lengthSq() < 1e-8
  )
    return;
  scratchCurrentDirection.normalize();
  scratchTargetDirection.normalize();
  scratchDeltaQuaternion.setFromUnitVectors(
    scratchCurrentDirection,
    scratchTargetDirection,
  );
  bone.getWorldQuaternion(scratchJointQuaternion);
  scratchJointQuaternion.premultiply(scratchDeltaQuaternion);
  if (bone.parent) {
    bone.parent.getWorldQuaternion(scratchParentQuaternion).invert();
    scratchJointQuaternion.premultiply(scratchParentQuaternion);
  }
  bone.quaternion.copy(scratchJointQuaternion).normalize();
  bone.updateWorldMatrix(false, true);
}

function solveArmGrip(
  instance: SkinnedCharacterInstance,
  side: 'Left' | 'Right',
  target: THREE.Object3D,
): void {
  const upper = instance.bones[`mixamorig:${side}Arm`];
  const forearm = instance.bones[`mixamorig:${side}ForeArm`];
  const palm =
    side === 'Right' ? instance.dominantPalmAnchor : instance.supportPalmAnchor;
  upper.getWorldPosition(scratchShoulderPosition);
  forearm.getWorldPosition(scratchElbowPosition);
  palm.getWorldPosition(scratchPalmPosition);
  target.getWorldPosition(scratchGripPosition);

  const upperLength = scratchShoulderPosition.distanceTo(scratchElbowPosition);
  const lowerLength = scratchElbowPosition.distanceTo(scratchPalmPosition);
  scratchSolveDirection.subVectors(
    scratchGripPosition,
    scratchShoulderPosition,
  );
  const targetDistance = scratchSolveDirection.length();
  if (upperLength < 1e-4 || lowerLength < 1e-4 || targetDistance < 1e-4) return;
  scratchSolveDirection.multiplyScalar(1 / targetDistance);

  // A pole defines which side of the shoulder-to-grip line the elbow must
  // occupy. It follows modelRoot through crouch and death, so the arm can bend
  // without flipping through the torso or corkscrewing the shoulder.
  scratchPoleDirection
    .set(side === 'Left' ? -0.7 : 0.7, side === 'Left' ? -0.12 : -0.08, 0.05)
    .applyQuaternion(
      instance.modelRoot.getWorldQuaternion(scratchRootQuaternion),
    );
  scratchPolePosition.copy(scratchShoulderPosition).add(scratchPoleDirection);
  scratchPoleDirection
    .subVectors(scratchPolePosition, scratchShoulderPosition)
    .addScaledVector(
      scratchSolveDirection,
      -scratchPoleDirection.dot(scratchSolveDirection),
    );
  if (scratchPoleDirection.lengthSq() < 1e-8) return;
  scratchPoleDirection.normalize();

  const minimumReach = Math.abs(upperLength - lowerLength) + 1e-5;
  const maximumReach = upperLength + lowerLength - 1e-5;
  const solveDistance = THREE.MathUtils.clamp(
    targetDistance,
    minimumReach,
    maximumReach,
  );
  const elbowAlong =
    (upperLength * upperLength -
      lowerLength * lowerLength +
      solveDistance * solveDistance) /
    (2 * solveDistance);
  const elbowAway = Math.sqrt(
    Math.max(0, upperLength * upperLength - elbowAlong * elbowAlong),
  );
  scratchDesiredElbowPosition
    .copy(scratchShoulderPosition)
    .addScaledVector(scratchSolveDirection, elbowAlong)
    .addScaledVector(scratchPoleDirection, elbowAway);

  rotateBoneTowardPoint(upper, forearm, scratchDesiredElbowPosition);
  rotateBoneTowardPoint(forearm, palm, scratchGripPosition);
}

export function solveSkinnedCharacterWeaponGrip(
  instance: SkinnedCharacterInstance,
): void {
  instance.visualRoot.updateMatrixWorld(true);
  solveArmGrip(instance, 'Right', instance.dominantGripTarget);
  solveArmGrip(instance, 'Left', instance.supportGripTarget);
  instance.visualRoot.updateMatrixWorld(true);
  updateSkinnedMeshSkeletons(instance.model);
}

/** Deterministically sample locomotion from the simulation-owned flat pose. */
export function sampleSkinnedCharacterPose(
  instance: SkinnedCharacterInstance,
  pose: Readonly<Partial<BotAnimationPose>>,
  options: SkinnedCharacterPoseOptions = {},
): void {
  instance.modelRoot.position.set(0, instance.modelGroundOffsetY, 0);
  instance.modelRoot.rotation.set(0, 0, 0);
  const movement = clamp01(Math.abs(finite(pose.speed)) / MAX_RUN_SPEED);
  const runWeight = movement * clamp01((movement - 0.52) / 0.48);
  const walkWeight = movement - runWeight;
  const phase = getSkinnedCharacterNormalizedPhase(finite(pose.phase));
  instance.actions.idle.setEffectiveWeight(1 - movement);
  instance.actions.walk.setEffectiveWeight(walkWeight);
  instance.actions.run.setEffectiveWeight(runWeight);
  instance.actions.idle.time =
    ((finite(options.elapsedSeconds) %
      instance.actions.idle.getClip().duration) +
      instance.actions.idle.getClip().duration) %
    instance.actions.idle.getClip().duration;
  instance.actions.walk.time = phase * instance.actions.walk.getClip().duration;
  instance.actions.run.time = phase * instance.actions.run.getClip().duration;
  const locomotionBones = locomotionBonesByInstance.get(instance);
  if (!locomotionBones) throw new Error('Missing sampled locomotion transforms.');
  // Mixer skips unchanged track writes. Restore its last clean result before
  // resampling so crouch, aim and IK cannot accumulate on a repeated frame.
  for (const name of REQUIRED_BONE_NAMES) {
    instance.bones[name].position.copy(locomotionBones[name].position);
    instance.bones[name].quaternion.copy(locomotionBones[name].quaternion);
  }
  instance.mixer.update(0);
  for (const name of REQUIRED_BONE_NAMES) {
    locomotionBones[name].position.copy(instance.bones[name].position);
    locomotionBones[name].quaternion.copy(instance.bones[name].quaternion);
  }

  const pelvisLift = finite(pose.pelvisLift);
  instance.bones['mixamorig:Hips'].position.addScaledVector(instance.pelvisUpInParent, pelvisLift);
  const crouch = clamp01(-pelvisLift / 0.28);
  if (crouch > 0) {
    // The native human follows the requested anatomical joint angles. The
    // retained classic surface needs its existing, stronger rig correction.
    if (instance.surface === 'authored') {
      rotatePoseBone(instance, 'mixamorig:LeftUpLeg', finite(pose.leftHipPitch, 0.55 * crouch));
      rotatePoseBone(instance, 'mixamorig:RightUpLeg', finite(pose.rightHipPitch, 0.55 * crouch));
      rotatePoseBone(instance, 'mixamorig:LeftLeg', finite(pose.leftKneePitch, -1.05 * crouch));
      rotatePoseBone(instance, 'mixamorig:RightLeg', finite(pose.rightKneePitch, -1.05 * crouch));
      rotatePoseBone(instance, 'mixamorig:LeftFoot', finite(pose.leftAnklePitch, 0.5 * crouch));
      rotatePoseBone(instance, 'mixamorig:RightFoot', finite(pose.rightAnklePitch, 0.5 * crouch));
    } else {
      rotatePoseBone(instance, 'mixamorig:LeftUpLeg', 1.2 * crouch);
      rotatePoseBone(instance, 'mixamorig:RightUpLeg', 1.2 * crouch);
      rotatePoseBone(instance, 'mixamorig:LeftLeg', -2.05 * crouch);
      rotatePoseBone(instance, 'mixamorig:RightLeg', -2.05 * crouch);
      rotatePoseBone(instance, 'mixamorig:LeftFoot', 0.85 * crouch);
      rotatePoseBone(instance, 'mixamorig:RightFoot', 0.85 * crouch);
    }
  }
  // Rotation-only retargeted clips retain native hip height, so keep their
  // lowest support planted through every gait, as well as legacy crouches.
  if (crouch > 0 || instance.surface === 'authored') groundSkinnedCharacter(instance);
  rotatePoseBone(instance, 'mixamorig:Spine2', -finite(pose.visualAimPitch) * 0.38,
    finite(pose.upperBodyYaw) * 0.55);
  rotatePoseBone(instance, 'mixamorig:Head', 0, finite(pose.upperBodyYaw) * 0.18);
  instance.weaponSocket.position.set(
    finite(pose.weaponSocketX, 0.07),
    finite(pose.weaponSocketY, 1.2) + WEAPON_SOCKET_BODY_OFFSET_Y,
    finite(pose.weaponSocketZ, -0.34) + WEAPON_SOCKET_BODY_OFFSET_Z,
  );
  instance.weaponSocket.rotation.set(
    finite(pose.weaponSocketPitch),
    finite(pose.weaponSocketYaw),
    finite(pose.weaponSocketRoll),
  );
  solveSkinnedCharacterWeaponGrip(instance);
  syncSkinnedCharacterSockets(instance);
}

/** Apply the existing deterministic death output without exposing Mixamo bones. */
export function applySkinnedCharacterDeathPose(
  instance: SkinnedCharacterInstance,
  pose: Readonly<BotVisualPose>,
): void {
  const collapseWeight = clamp01(finite(pose.collapseWeight));
  // beginBotDeathPose samples elapsed zero immediately. Preserve that exact
  // living frame so the first rendered death sample cannot pop or re-ground.
  if (collapseWeight <= 0) {
    deathStartBonesByInstance.set(instance, captureBoneTransforms(instance));
    return;
  }
  let deathStartBones = deathStartBonesByInstance.get(instance);
  if (!deathStartBones) {
    deathStartBones = captureBoneTransforms(instance);
    deathStartBonesByInstance.set(instance, deathStartBones);
  }
  const rootPitch = finite(pose.rootPitch);
  const rootRoll = finite(pose.rootRoll);
  scratchDeathQuaternion.setFromEuler(scratchEuler.set(rootPitch, 0, rootRoll));
  instance.modelRoot.position.set(
    0,
    instance.modelGroundOffsetY + finite(pose.rootY),
    0,
  );
  instance.modelRoot.quaternion.copy(scratchDeathQuaternion);

  // Carry the metre-scale weapon assembly through the same fall before IK,
  // keeping both hands and the equipped gun together during death review.
  instance.weaponSocket.position.z += 0.03 * collapseWeight;
  instance.weaponSocket.position.applyQuaternion(scratchDeathQuaternion);
  instance.weaponSocket.position.y += finite(pose.rootY);
  // On a backward fall the chest-front socket rotates beneath the torso.
  // Lift that carried assembly into the body's settled thickness so the hands
  // cannot become the lone ground support that leaves the back floating.
  if (rootPitch < 0)
    instance.weaponSocket.position.y += -Math.sin(rootPitch) * 0.3;
  instance.weaponSocket.quaternion.premultiply(scratchDeathQuaternion);

  const neutralBones = neutralDeathBonesByInstance.get(instance);
  if (!neutralBones)
    throw new Error('Skinned character is missing its neutral death skeleton');
  const settled = (value: number, scale = 1) =>
    (finite(value) / collapseWeight) * scale;
  const blendBone = (
    name: SkinnedCharacterBoneName,
    pitch = 0,
    yaw = 0,
    roll = 0,
  ) => {
    const bone = instance.bones[name];
    const start = deathStartBones[name];
    const neutral = neutralBones[name];
    bone.position.copy(start.position).lerp(neutral.position, collapseWeight);
    writeCorrectionQuaternion(instance, name, scratchDeathBoneDeltaQuaternion, pitch, yaw, roll);
    scratchDeathBoneQuaternion
      .copy(neutral.quaternion)
      .multiply(scratchDeathBoneDeltaQuaternion);
    bone.quaternion
      .copy(start.quaternion)
      .slerp(scratchDeathBoneQuaternion, collapseWeight);
  };
  const restoreBone = (name: SkinnedCharacterBoneName) => {
    const bone = instance.bones[name];
    const start = deathStartBones[name];
    bone.position.copy(start.position);
    bone.quaternion.copy(start.quaternion);
  };

  // Locomotion is sampled before this adapter on every frame. Blend those
  // bones toward one stable, lightly articulated corpse instead of adding
  // death hinges to a planted walk frame and leaving one leg raised.
  restoreBone('mixamorig:Hips');
  restoreBone('mixamorig:Spine');
  restoreBone('mixamorig:Spine1');
  restoreBone('mixamorig:Spine2');
  restoreBone('mixamorig:Neck');
  blendBone('mixamorig:Head', settled(pose.headPitch));
  blendBone(
    'mixamorig:LeftUpLeg',
    settled(pose.leftLegPitch + pose.leftHipPitch, 0.04),
    settled(pose.leftHipYaw, 0.75),
  );
  blendBone(
    'mixamorig:RightUpLeg',
    settled(pose.rightLegPitch + pose.rightHipPitch, 0.04),
    settled(pose.rightHipYaw, 0.75),
  );
  blendBone('mixamorig:LeftLeg', settled(pose.leftKneePitch, 0.04));
  blendBone('mixamorig:RightLeg', settled(pose.rightKneePitch, 0.04));
  blendBone('mixamorig:LeftFoot', settled(pose.leftAnklePitch, 0.05));
  blendBone('mixamorig:RightFoot', settled(pose.rightAnklePitch, 0.05));
  blendBone('mixamorig:LeftArm', settled(pose.leftArmPitch - 1.08, 0.5));
  blendBone('mixamorig:RightArm', settled(pose.rightArmPitch - 1.08, 0.5));
  blendBone('mixamorig:LeftForeArm', settled(pose.leftForearmPitch, 0.5));
  blendBone('mixamorig:RightForeArm', settled(pose.rightForearmPitch, 0.5));
  blendBone('mixamorig:LeftHand', settled(pose.leftHandPitch, 0.5));
  blendBone('mixamorig:RightHand', settled(pose.rightHandPitch, 0.5));

  solveSkinnedCharacterWeaponGrip(instance);

  // The procedural death root offsets were authored against coarse capsules.
  // Re-ground the final skinned shape after the arm solve and carry the
  // external weapon socket by the same correction so palm contact is retained.
  const groundCorrection = groundSkinnedCharacter(instance);
  instance.weaponSocket.position.y += groundCorrection;
  syncSkinnedCharacterSockets(instance);
}

/** Restore the exact sampled skeleton captured when this death began. */
export function resetSkinnedCharacterDeathPose(
  instance: SkinnedCharacterInstance,
): void {
  const start = deathStartBonesByInstance.get(instance);
  if (!start) return;
  for (const name of REQUIRED_BONE_NAMES) {
    instance.bones[name].position.copy(start[name].position);
    instance.bones[name].quaternion.copy(start[name].quaternion);
  }
  deathStartBonesByInstance.delete(instance);
  instance.visualRoot.updateMatrixWorld(true);
  updateSkinnedMeshSkeletons(instance.model);
}

/** Release instance resources, retaining shared geometry and source textures. */
export function disposeSkinnedCharacterInstance(
  instance: SkinnedCharacterInstance,
): void {
  instance.mixer.stopAllAction();
  instance.mixer.uncacheRoot(instance.model);
  instance.materials.forEach((material) => material.dispose());
  const skeletons = new Set<THREE.Skeleton>();
  instance.model.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  skeletons.forEach((skeleton) => skeleton.dispose());
  groundSupportMeshesByInstance.delete(instance);
  neutralDeathBonesByInstance.delete(instance);
  deathStartBonesByInstance.delete(instance);
  locomotionBonesByInstance.delete(instance);
  instance.visualRoot.removeFromParent();
}
