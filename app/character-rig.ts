import * as THREE from 'three';
import type { BotAnimationPose } from './bot-animation.ts';

/**
 * A small, procedural presentation rig for one bot.
 *
 * `visualRoot` is deliberately a separate scene object from the simulation's
 * authority root.  It contains no hitbox or collision geometry and can be
 * mounted as the authority root's sibling with `attachCharacterRigSibling`.
 */
export type CharacterRig = {
  visualRoot: THREE.Group;
  pelvis: THREE.Group;
  lowerBody: THREE.Group;
  upperBody: THREE.Group;
  head: THREE.Group;
  leftThigh: THREE.Group;
  leftShin: THREE.Group;
  leftFoot: THREE.Group;
  rightThigh: THREE.Group;
  rightShin: THREE.Group;
  rightFoot: THREE.Group;
  leftShoulder: THREE.Group;
  leftForearm: THREE.Group;
  leftHand: THREE.Group;
  rightShoulder: THREE.Group;
  rightForearm: THREE.Group;
  rightHand: THREE.Group;
  leftGripSocket: THREE.Object3D;
  rightGripSocket: THREE.Object3D;
  weaponSocket: THREE.Object3D;
  muzzleSocket: THREE.Object3D;
  dominantGripTarget: THREE.Object3D;
  supportGripTarget: THREE.Object3D;
  left: CharacterRigSide;
  right: CharacterRigSide;
};

export type CharacterRigWeaponGripKind =
  | 'rifle'
  | 'carbine'
  | 'smg'
  | 'shotgun'
  | 'sniper'
  | 'glock18'
  | 'usp'
  | 'p228'
  | 'deagle'
  | 'fiveseven'
  | 'elite';

export type CharacterRigWeaponGripTargets = Readonly<{
  dominant: THREE.Vector3Tuple;
  support: THREE.Vector3Tuple;
}>;

/** Caller-owned output for the CPU arm deformation pass. */
export type CharacterRigWeaponGripOutput = {
  leftElbowPitch: number;
  rightElbowPitch: number;
};

export type CharacterRigSide = {
  thigh: THREE.Group;
  shin: THREE.Group;
  foot: THREE.Group;
  shoulder: THREE.Group;
  forearm: THREE.Group;
  hand: THREE.Group;
  gripSocket: THREE.Object3D;
};

/** Joints that accept caller-owned presentation objects. */
export type CharacterRigJointName =
  | 'pelvis'
  | 'lowerBody'
  | 'upperBody'
  | 'head'
  | 'leftThigh'
  | 'leftShin'
  | 'leftFoot'
  | 'leftShoulder'
  | 'leftForearm'
  | 'leftHand'
  | 'rightThigh'
  | 'rightShin'
  | 'rightFoot'
  | 'rightShoulder'
  | 'rightForearm'
  | 'rightHand'
  | 'leftGripSocket'
  | 'rightGripSocket'
  | 'weaponSocket'
  | 'muzzleSocket';

export type CharacterRigVisualPart = THREE.Object3D | readonly THREE.Object3D[];

export type CharacterRigVisualParts = Readonly<
  Partial<Record<CharacterRigJointName, CharacterRigVisualPart>>
>;

/** Names accepted by the optional authority exclusion list. */
export type CharacterRigOptions = Readonly<{
  /** Authority root is used only for sibling mounting; it is never reparented. */
  authorityRoot?: THREE.Object3D;
  /** When true (the default), an already-mounted authority root gets a sibling. */
  autoAttach?: boolean;
  /** Create generic fallback meshes for unfilled joints (defaults to true). */
  fallbackVisuals?: boolean;
  /** Optional arrays to check against the newly-created visual subtree. */
  authoritativeObjects?: readonly THREE.Object3D[];
  authoritativeHitMeshes?: readonly THREE.Object3D[];
  hitMeshes?: readonly THREE.Object3D[];
  collisionObjects?: readonly THREE.Object3D[];
  collisionMeshes?: readonly THREE.Object3D[];
  /** Existing faceted meshes/groups to reparent beneath named rig joints. */
  visualParts?: CharacterRigVisualParts;
  /** Alias for visualParts for callers that describe these as attachments. */
  attachments?: CharacterRigVisualParts;
}>;

export type CharacterRigSocketMetrics = Readonly<{
  leftHandToGrip: number;
  rightHandToGrip: number;
  leftGripToWeapon: number;
  rightGripToWeapon: number;
  leftHandToWeapon: number;
  rightHandToWeapon: number;
  weaponToMuzzle: number;
  leftGripToMuzzle: number;
  rightGripToMuzzle: number;
  leftHandToDominantGrip: number;
  rightHandToDominantGrip: number;
  leftHandToSupportGrip: number;
  rightHandToSupportGrip: number;
}>;

const NO_RAYCAST: THREE.Object3D['raycast'] = () => undefined;
const BASE_PELVIS_Y = 1.05;
const LIMB_X = 0.34;

/** Contacts in the visual weaponSocket frame (the world model is scaled .64). */
const WEAPON_GRIP_TARGETS: Record<
  CharacterRigWeaponGripKind,
  CharacterRigWeaponGripTargets
> = {
  rifle: { dominant: [-0.07, 0.071, 0.141], support: [-0.07, 0.11, -0.089] },
  carbine: { dominant: [-0.07, 0.073, 0.139], support: [-0.07, 0.112, -0.086] },
  smg: { dominant: [-0.07, 0.078, 0.129], support: [-0.07, 0.11, -0.088] },
  shotgun: { dominant: [-0.07, 0.071, 0.141], support: [-0.07, 0.124, -0.268] },
  sniper: { dominant: [-0.07, 0.065, 0.129], support: [-0.07, 0.122, -0.177] },
  glock18: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  usp: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  p228: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  deagle: { dominant: [-0.07, 0.075, 0.132], support: [-0.01, 0.1, 0.09] },
  fiveseven: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  elite: { dominant: [-0.16, 0.081, 0.132], support: [0.02, 0.1, 0.09] },
};

type GripSolverState = {
  upperBodyWorldInverse: THREE.Matrix4;
  supportTargetLocal: THREE.Vector3;
  dominantTargetLocal: THREE.Vector3;
  localTarget: THREE.Vector3;
  shoulder: THREE.Vector3;
  direction: THREE.Vector3;
  elbow: THREE.Vector3;
  shoulderDirection: THREE.Vector3;
  forearmDirection: THREE.Vector3;
  preferredBend: THREE.Vector3;
  hingeAxis: THREE.Vector3;
  basisZ: THREE.Vector3;
  shoulderBasis: THREE.Matrix4;
  shoulderQuaternion: THREE.Quaternion;
  baseAxis: THREE.Vector3;
  authoredPhase: number;
  leftShoulderPitch: number;
  leftShoulderYaw: number;
  leftElbowPitch: number;
  rightShoulderPitch: number;
  rightShoulderYaw: number;
  rightElbowPitch: number;
};

// Solver scratch is presentation state, not part of the rig's public API.
// It is allocated once with the rig and reused by every render call.
const gripSolverStates = new WeakMap<CharacterRig, GripSolverState>();

function createGripSolverState(): GripSolverState {
  return {
    upperBodyWorldInverse: new THREE.Matrix4(),
    supportTargetLocal: new THREE.Vector3(),
    dominantTargetLocal: new THREE.Vector3(),
    localTarget: new THREE.Vector3(),
    shoulder: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    elbow: new THREE.Vector3(),
    shoulderDirection: new THREE.Vector3(),
    forearmDirection: new THREE.Vector3(),
    preferredBend: new THREE.Vector3(),
    hingeAxis: new THREE.Vector3(),
    basisZ: new THREE.Vector3(),
    shoulderBasis: new THREE.Matrix4(),
    shoulderQuaternion: new THREE.Quaternion(),
    baseAxis: new THREE.Vector3(0, -1, 0),
    authoredPhase: 0,
    leftShoulderPitch: 1.08,
    leftShoulderYaw: 0,
    leftElbowPitch: 0.38,
    rightShoulderPitch: 1.08,
    rightShoulderYaw: 0,
    rightElbowPitch: 0.38,
  };
}

function markVisualOnly(object: THREE.Object3D): void {
  object.userData.visualOnly = true;
  object.raycast = NO_RAYCAST;
}

function markVisualSubtree(object: THREE.Object3D): void {
  object.traverse(markVisualOnly);
}

function visualGroup(name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  markVisualOnly(group);
  return group;
}

function visualMesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  markVisualOnly(mesh);
  return mesh;
}

function attachVisualMesh(
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
): void {
  parent.add(visualMesh(name, geometry, material));
}

function hasVisualPart(
  parts: CharacterRigVisualParts,
  joint: CharacterRigJointName,
): boolean {
  return Object.prototype.hasOwnProperty.call(parts, joint);
}

function attachVisualPart(
  parent: THREE.Object3D,
  part: CharacterRigVisualPart,
): void {
  const objects = Array.isArray(part) ? part : [part];
  for (const object of objects) {
    if (object === parent || isInSubtree(object, parent))
      throw new Error(
        `Cannot attach character visual ${object.name || object.uuid} beneath itself`,
      );
    // Object3D.add reparents without rewriting local position/rotation/scale.
    // That makes the attachment's authored local transform stable.
    markVisualSubtree(object);
    parent.add(object);
  }
}

type DefaultVisualResources = {
  jointGeometry: THREE.BufferGeometry;
  torsoGeometry: THREE.BufferGeometry;
  headGeometry: THREE.BufferGeometry;
  footGeometry: THREE.BufferGeometry;
  visualMaterial: THREE.MeshStandardMaterial;
  visualAccentMaterial: THREE.MeshStandardMaterial;
};

function createDefaultVisualResources(): DefaultVisualResources {
  let jointGeometry: THREE.BufferGeometry | undefined;
  let torsoGeometry: THREE.BufferGeometry | undefined;
  let headGeometry: THREE.BufferGeometry | undefined;
  let footGeometry: THREE.BufferGeometry | undefined;
  let visualMaterial: THREE.MeshStandardMaterial | undefined;
  let visualAccentMaterial: THREE.MeshStandardMaterial | undefined;
  return {
    // Every rig owns its fallback resources. Lazy getters also avoid creating
    // generic resources when a caller supplies every visible part.
    get jointGeometry() {
      return (jointGeometry ??= new THREE.CapsuleGeometry(0.11, 0.32, 3, 8));
    },
    get torsoGeometry() {
      return (torsoGeometry ??= new THREE.CapsuleGeometry(0.31, 0.52, 4, 10));
    },
    get headGeometry() {
      return (headGeometry ??= new THREE.SphereGeometry(0.22, 12, 8));
    },
    get footGeometry() {
      return (footGeometry ??= new THREE.BoxGeometry(0.18, 0.12, 0.3));
    },
    get visualMaterial() {
      return (visualMaterial ??= new THREE.MeshStandardMaterial({
        color: 0x8f9a9d,
        roughness: 0.82,
        metalness: 0.04,
      }));
    },
    get visualAccentMaterial() {
      return (visualAccentMaterial ??= new THREE.MeshStandardMaterial({
        color: 0x485b62,
        roughness: 0.88,
        metalness: 0.02,
      }));
    },
  };
}

function finite(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function isInSubtree(root: THREE.Object3D, object: THREE.Object3D): boolean {
  if (root === object) return true;
  let found = false;
  root.traverse((child) => {
    if (child === object) found = true;
  });
  return found;
}

function collectExclusionObjects(
  options: CharacterRigOptions,
): readonly THREE.Object3D[] {
  return [
    ...(options.authoritativeObjects ?? []),
    ...(options.authoritativeHitMeshes ?? []),
    ...(options.hitMeshes ?? []),
    ...(options.collisionObjects ?? []),
    ...(options.collisionMeshes ?? []),
  ];
}

function assertVisualExclusion(
  rig: CharacterRig,
  objects: readonly THREE.Object3D[],
): void {
  for (const object of objects) {
    if (isInSubtree(rig.visualRoot, object)) {
      throw new Error(
        `Character rig visual subtree cannot contain authoritative object ${object.name || object.uuid}`,
      );
    }
  }
}

function makeSide(
  side: 'left' | 'right',
  pelvis: THREE.Group,
  upperBody: THREE.Group,
  parts: CharacterRigVisualParts,
  resources: DefaultVisualResources,
  fallbackVisuals: boolean,
): CharacterRigSide {
  const sign = side === 'left' ? -1 : 1;
  const thigh = visualGroup(`${side}Thigh`);
  const shin = visualGroup(`${side}Shin`);
  const foot = visualGroup(`${side}Foot`);
  const shoulder = visualGroup(`${side}Shoulder`);
  const forearm = visualGroup(`${side}Forearm`);
  const hand = visualGroup(`${side}Hand`);
  const gripSocket = visualGroup(`${side}GripSocket`);

  thigh.position.set(sign * LIMB_X, -0.08, 0);
  shin.position.set(0, -0.39, 0);
  foot.position.set(0, -0.38, -0.03);
  shoulder.position.set(sign * 0.35, 0.16, 0);
  // These offsets match the compound arm's authored elbow (-0.36) and palm
  // (-0.36 - 0.30) pivots. The visible lower arm is CPU-deformed at the same
  // hinge, while these joints provide the stable weapon-contact chain.
  forearm.position.set(0, -0.36, 0);
  hand.position.set(0, -0.3, 0);
  // A grip socket is the palm contact itself. Keeping it at the hand pivot
  // lets the two-bone solver target authored weapon contacts exactly.
  gripSocket.position.set(0, 0, 0);

  const thighJoint = `${side}Thigh` as const;
  const shinJoint = `${side}Shin` as const;
  const footJoint = `${side}Foot` as const;
  const shoulderJoint = `${side}Shoulder` as const;
  const forearmJoint = `${side}Forearm` as const;
  const handJoint = `${side}Hand` as const;

  if (fallbackVisuals && !hasVisualPart(parts, thighJoint))
    attachVisualMesh(
      thigh,
      `${side}ThighMesh`,
      resources.jointGeometry,
      resources.visualMaterial,
    );
  if (fallbackVisuals && !hasVisualPart(parts, shinJoint))
    attachVisualMesh(
      shin,
      `${side}ShinMesh`,
      resources.jointGeometry,
      resources.visualMaterial,
    );
  if (fallbackVisuals && !hasVisualPart(parts, footJoint))
    attachVisualMesh(
      foot,
      `${side}FootMesh`,
      resources.footGeometry,
      resources.visualAccentMaterial,
    );
  if (fallbackVisuals && !hasVisualPart(parts, shoulderJoint))
    attachVisualMesh(
      shoulder,
      `${side}ShoulderMesh`,
      resources.headGeometry,
      resources.visualAccentMaterial,
    );
  if (fallbackVisuals && !hasVisualPart(parts, forearmJoint))
    attachVisualMesh(
      forearm,
      `${side}ForearmMesh`,
      resources.jointGeometry,
      resources.visualMaterial,
    );
  if (fallbackVisuals && !hasVisualPart(parts, handJoint))
    attachVisualMesh(
      hand,
      `${side}HandMesh`,
      resources.headGeometry,
      resources.visualAccentMaterial,
    );

  pelvis.add(thigh);
  thigh.add(shin);
  shin.add(foot);
  upperBody.add(shoulder);
  shoulder.add(forearm);
  forearm.add(hand);
  hand.add(gripSocket);

  return { thigh, shin, foot, shoulder, forearm, hand, gripSocket };
}

function resolveVisualParts(
  options: CharacterRigOptions,
): CharacterRigVisualParts {
  return {
    ...options.attachments,
    ...options.visualParts,
  };
}

function normalizeOptions(
  optionsOrAuthority?: CharacterRigOptions | THREE.Object3D,
): CharacterRigOptions {
  if (optionsOrAuthority instanceof THREE.Object3D)
    return { authorityRoot: optionsOrAuthority };
  return optionsOrAuthority ?? {};
}

/**
 * Create one cached procedural visual rig. No caller-owned authority object is
 * accepted as a child; the optional authority root is only a sibling anchor.
 */
export function createCharacterRig(
  optionsOrAuthority?: CharacterRigOptions | THREE.Object3D,
): CharacterRig {
  const options = normalizeOptions(optionsOrAuthority);
  const parts = resolveVisualParts(options);
  const fallbackVisuals = options.fallbackVisuals !== false;
  // The factory is allocation-free until a fallback getter is read. Keeping
  // it present lets the setup path stay uniform when fallbacks are disabled.
  const resources = createDefaultVisualResources();
  const visualRoot = visualGroup('visualRoot');
  const pelvis = visualGroup('pelvis');
  const lowerBody = visualGroup('lowerBody');
  const upperBody = visualGroup('upperBody');
  const head = visualGroup('head');
  const weaponSocket = visualGroup('weaponSocket');
  const muzzleSocket = visualGroup('muzzleSocket');
  const dominantGripTarget = visualGroup('dominantGripTarget');
  const supportGripTarget = visualGroup('supportGripTarget');

  pelvis.position.set(0, BASE_PELVIS_Y, 0);
  lowerBody.position.set(0, 0, 0);
  upperBody.position.set(0, 0.28, 0);
  head.position.set(0, 0.58, 0);
  weaponSocket.position.set(0.07, 1.2, -0.34);
  muzzleSocket.position.set(0, 0, -0.7);
  dominantGripTarget.userData.weaponGripTarget = 'dominant';
  supportGripTarget.userData.weaponGripTarget = 'support';
  dominantGripTarget.position.set(...WEAPON_GRIP_TARGETS.rifle.dominant);
  supportGripTarget.position.set(...WEAPON_GRIP_TARGETS.rifle.support);

  if (fallbackVisuals && !hasVisualPart(parts, 'pelvis'))
    attachVisualMesh(
      pelvis,
      'pelvisMesh',
      resources.torsoGeometry,
      resources.visualMaterial,
    );
  if (fallbackVisuals && !hasVisualPart(parts, 'upperBody'))
    attachVisualMesh(
      upperBody,
      'upperBodyMesh',
      resources.torsoGeometry,
      resources.visualMaterial,
    );
  if (fallbackVisuals && !hasVisualPart(parts, 'head'))
    attachVisualMesh(
      head,
      'headMesh',
      resources.headGeometry,
      resources.visualAccentMaterial,
    );

  visualRoot.add(pelvis, weaponSocket);
  pelvis.add(lowerBody, upperBody);
  upperBody.add(head);
  weaponSocket.add(muzzleSocket);
  weaponSocket.add(dominantGripTarget, supportGripTarget);

  const left = makeSide(
    'left',
    pelvis,
    upperBody,
    parts,
    resources,
    fallbackVisuals,
  );
  const right = makeSide(
    'right',
    pelvis,
    upperBody,
    parts,
    resources,
    fallbackVisuals,
  );
  const rig: CharacterRig = {
    visualRoot,
    pelvis,
    lowerBody,
    upperBody,
    head,
    leftThigh: left.thigh,
    leftShin: left.shin,
    leftFoot: left.foot,
    rightThigh: right.thigh,
    rightShin: right.shin,
    rightFoot: right.foot,
    leftShoulder: left.shoulder,
    leftForearm: left.forearm,
    leftHand: left.hand,
    rightShoulder: right.shoulder,
    rightForearm: right.forearm,
    rightHand: right.hand,
    leftGripSocket: left.gripSocket,
    rightGripSocket: right.gripSocket,
    weaponSocket,
    muzzleSocket,
    dominantGripTarget,
    supportGripTarget,
    left,
    right,
  };

  const jointParents: Readonly<Record<CharacterRigJointName, THREE.Object3D>> =
    {
      pelvis,
      lowerBody,
      upperBody,
      head,
      leftThigh: left.thigh,
      leftShin: left.shin,
      leftFoot: left.foot,
      leftShoulder: left.shoulder,
      leftForearm: left.forearm,
      leftHand: left.hand,
      rightThigh: right.thigh,
      rightShin: right.shin,
      rightFoot: right.foot,
      rightShoulder: right.shoulder,
      rightForearm: right.forearm,
      rightHand: right.hand,
      leftGripSocket: left.gripSocket,
      rightGripSocket: right.gripSocket,
      weaponSocket,
      muzzleSocket,
    };
  for (const joint of Object.keys(parts) as CharacterRigJointName[]) {
    const part = parts[joint];
    if (part !== undefined) attachVisualPart(jointParents[joint], part);
  }

  gripSolverStates.set(rig, createGripSolverState());

  assertVisualExclusion(rig, collectExclusionObjects(options));
  if (
    options.authorityRoot &&
    options.autoAttach !== false &&
    options.authorityRoot.parent
  )
    attachCharacterRigSibling(rig, options.authorityRoot);
  return rig;
}

/** Attach only beside an authority root; never below it. */
export function attachCharacterRigSibling(
  rig: CharacterRig,
  authorityRoot: THREE.Object3D,
): THREE.Group {
  if (rig.visualRoot === authorityRoot)
    throw new Error('A character visual root cannot be its authority root');
  if (isInSubtree(rig.visualRoot, authorityRoot))
    throw new Error(
      'A character visual root cannot contain its authority root',
    );
  const parent = authorityRoot.parent;
  if (!parent)
    throw new Error(
      'Authority root must be mounted before attaching its visual sibling',
    );
  if (isInSubtree(authorityRoot, rig.visualRoot))
    throw new Error(
      'Character visual root cannot be a child of the authority root',
    );
  parent.add(rig.visualRoot);
  return rig.visualRoot;
}

/** True when an object is part of this presentation subtree. */
export function isCharacterRigVisualObject(
  rig: CharacterRig,
  object: THREE.Object3D,
): boolean {
  return isInSubtree(rig.visualRoot, object);
}

/** True when the object carries both visual-only and no-raycast guarantees. */
export function isCharacterRigVisualOnly(object: THREE.Object3D): boolean {
  return object.userData.visualOnly === true && object.raycast === NO_RAYCAST;
}

/** Verify every existing node in the rig is excluded from raycasts. */
export function validateCharacterRigVisualOnly(rig: CharacterRig): boolean {
  let valid = true;
  rig.visualRoot.traverse((object) => {
    if (!isCharacterRigVisualOnly(object)) valid = false;
  });
  return valid;
}

/**
 * Remove presentation objects from a raycast/collision candidate list without
 * mutating the caller's array. Authority arrays are therefore safe to reuse.
 */
export function filterOutCharacterRigVisuals<T extends THREE.Object3D>(
  objects: readonly T[],
  rig: CharacterRig,
): T[] {
  return objects.filter((object) => !isCharacterRigVisualObject(rig, object));
}

function distanceBetween(
  first: THREE.Object3D,
  second: THREE.Object3D,
): number {
  const firstWorld = new THREE.Vector3();
  const secondWorld = new THREE.Vector3();
  first.updateWorldMatrix(true, false);
  second.updateWorldMatrix(true, false);
  first.getWorldPosition(firstWorld);
  second.getWorldPosition(secondWorld);
  return firstWorld.distanceTo(secondWorld);
}

/** Stable world-space diagnostics for the hand, grip, weapon, and muzzle anchors. */
export function getCharacterRigSocketMetrics(
  rig: CharacterRig,
): CharacterRigSocketMetrics {
  return {
    leftHandToGrip: distanceBetween(rig.leftHand, rig.leftGripSocket),
    rightHandToGrip: distanceBetween(rig.rightHand, rig.rightGripSocket),
    leftGripToWeapon: distanceBetween(rig.leftGripSocket, rig.weaponSocket),
    rightGripToWeapon: distanceBetween(rig.rightGripSocket, rig.weaponSocket),
    leftHandToWeapon: distanceBetween(rig.leftHand, rig.weaponSocket),
    rightHandToWeapon: distanceBetween(rig.rightHand, rig.weaponSocket),
    weaponToMuzzle: distanceBetween(rig.weaponSocket, rig.muzzleSocket),
    leftGripToMuzzle: distanceBetween(rig.leftGripSocket, rig.muzzleSocket),
    rightGripToMuzzle: distanceBetween(rig.rightGripSocket, rig.muzzleSocket),
    leftHandToDominantGrip: distanceBetween(
      rig.leftHand,
      rig.dominantGripTarget,
    ),
    rightHandToDominantGrip: distanceBetween(
      rig.rightHand,
      rig.dominantGripTarget,
    ),
    leftHandToSupportGrip: distanceBetween(rig.leftHand, rig.supportGripTarget),
    rightHandToSupportGrip: distanceBetween(
      rig.rightHand,
      rig.supportGripTarget,
    ),
  };
}

/** Select calibrated weapon-local contacts without allocating scene nodes. */
export function setCharacterRigWeaponGripTargets(
  rig: CharacterRig,
  kind: CharacterRigWeaponGripKind,
): CharacterRigWeaponGripTargets {
  const targets = WEAPON_GRIP_TARGETS[kind] ?? WEAPON_GRIP_TARGETS.rifle;
  rig.dominantGripTarget.position.set(...targets.dominant);
  rig.supportGripTarget.position.set(...targets.support);
  return targets;
}

/**
 * Aim only the visual weapon socket. `pose` contributes recoil/additive yaw,
 * while the full body-relative aim is supplied by the authority simulation.
 * This intentionally leaves the authority root and all hit proxies untouched.
 */
export function applyCharacterRigWeaponAim(
  rig: CharacterRig,
  bodyRelativeAimYaw: number,
  pose?: Readonly<Partial<BotAnimationPose>>,
): CharacterRig {
  const aimYaw = finite(bodyRelativeAimYaw, 0);
  const poseUpperYaw = finite(pose?.upperBodyYaw, 0);
  const poseSocketYaw = finite(pose?.weaponSocketYaw, poseUpperYaw);
  const recoilYaw = poseSocketYaw - poseUpperYaw;
  rig.weaponSocket.rotation.set(
    finite(pose?.weaponSocketPitch, rig.weaponSocket.rotation.x),
    aimYaw + recoilYaw,
    finite(pose?.weaponSocketRoll, rig.weaponSocket.rotation.z),
  );
  return rig;
}

function solveGripArm(
  state: GripSolverState,
  shoulder: THREE.Group,
  forearm: THREE.Group,
  localTarget: THREE.Vector3,
  bendSign: number,
): number {
  const upperArmLength = 0.36;
  const forearmLength = 0.3;
  const maxForearmScale = 1.2;
  const minReach = Math.abs(upperArmLength - forearmLength) + 1e-4;
  const maxReach = upperArmLength + forearmLength * maxForearmScale;

  state.localTarget.copy(localTarget);
  state.shoulder.copy(shoulder.position);
  state.direction.copy(state.localTarget).sub(state.shoulder);
  const targetDistance = state.direction.length();
  if (!Number.isFinite(targetDistance) || targetDistance < 1e-5) return 0;

  // Clamp the endpoint before solving so malformed or distant weapon nodes
  // cannot produce an infinite stretch or an unstable quaternion.
  const reach = THREE.MathUtils.clamp(targetDistance, minReach, maxReach);
  state.direction.multiplyScalar(1 / targetDistance);
  state.localTarget
    .copy(state.shoulder)
    .addScaledVector(state.direction, reach);

  // If the contact is beyond the normal arm span, use a bounded forearm
  // stretch. This keeps the visual contact close while avoiding rubber arms.
  const solvedForearmLength = THREE.MathUtils.clamp(
    reach - upperArmLength > forearmLength
      ? reach - upperArmLength
      : forearmLength,
    forearmLength,
    forearmLength * maxForearmScale,
  );
  const a = THREE.MathUtils.clamp(
    (upperArmLength * upperArmLength -
      solvedForearmLength * solvedForearmLength +
      reach * reach) /
      (2 * reach),
    0,
    upperArmLength,
  );
  const height = Math.sqrt(
    Math.max(0, upperArmLength * upperArmLength - a * a),
  );

  // Project a side-specific authored bend preference onto the bend plane.
  // The target remains authoritative; these small phase/pose terms only move
  // the elbow inside the infinitely-many valid two-bone solutions. Keeping
  // them in the upper-body frame makes the motion follow torso aim naturally.
  const authoredShoulderPitch =
    bendSign < 0 ? state.leftShoulderPitch : state.rightShoulderPitch;
  const authoredShoulderYaw =
    bendSign < 0 ? state.leftShoulderYaw : state.rightShoulderYaw;
  const authoredElbowPitch =
    bendSign < 0 ? state.leftElbowPitch : state.rightElbowPitch;
  const shoulderPitchDelta = THREE.MathUtils.clamp(
    authoredShoulderPitch - 1.08,
    -0.7,
    0.7,
  );
  const elbowPitchDelta = THREE.MathUtils.clamp(
    authoredElbowPitch - 0.38,
    -1.2,
    1.2,
  );
  const phase = state.authoredPhase;
  const counterMotion = Math.sin(phase + bendSign * 1.1) * 0.14;
  const strideDepth = Math.cos(phase + bendSign * 0.8) * 0.08;
  state.preferredBend.set(
    bendSign,
    bendSign * 0.06 +
      shoulderPitchDelta * 0.32 +
      authoredShoulderYaw * 0.16 +
      counterMotion,
    bendSign * 0.28 +
      elbowPitchDelta * 0.16 +
      authoredShoulderYaw * 0.22 +
      strideDepth,
  );
  state.preferredBend.addScaledVector(
    state.direction,
    -state.preferredBend.dot(state.direction),
  );
  if (state.preferredBend.lengthSq() < 1e-8) {
    state.preferredBend.set(0, 0, bendSign);
    state.preferredBend.addScaledVector(
      state.direction,
      -state.preferredBend.dot(state.direction),
    );
  }
  if (state.preferredBend.lengthSq() < 1e-8) {
    state.preferredBend.set(0, 1, 0);
    state.preferredBend.addScaledVector(
      state.direction,
      -state.preferredBend.dot(state.direction),
    );
    if (state.preferredBend.lengthSq() < 1e-8) state.preferredBend.set(1, 0, 0);
  }
  state.preferredBend.normalize();
  state.elbow
    .copy(state.shoulder)
    .addScaledVector(state.direction, a)
    .addScaledVector(state.preferredBend, height);
  state.shoulderDirection.copy(state.elbow).sub(state.shoulder).normalize();
  state.forearmDirection.copy(state.localTarget).sub(state.elbow).normalize();

  // The compound arm's lower vertices are CPU-hinged around local +X. Build a
  // full basis so that shoulder local -Y is U and local +X is the IK hinge;
  // simply aligning -Y to U leaves the hinge plane at an arbitrary twist.
  state.baseAxis.copy(state.shoulderDirection).multiplyScalar(-1);
  state.hingeAxis.crossVectors(state.shoulderDirection, state.forearmDirection);
  if (state.hingeAxis.lengthSq() < 1e-8) {
    state.hingeAxis.crossVectors(state.shoulderDirection, state.preferredBend);
    if (state.hingeAxis.lengthSq() < 1e-8)
      state.hingeAxis.set(0, 0, 1).cross(state.shoulderDirection);
  }
  state.hingeAxis.normalize();
  state.basisZ.crossVectors(state.hingeAxis, state.baseAxis).normalize();
  state.shoulderBasis.makeBasis(state.hingeAxis, state.baseAxis, state.basisZ);
  state.shoulderQuaternion.setFromRotationMatrix(state.shoulderBasis);
  shoulder.quaternion.copy(state.shoulderQuaternion);
  forearm.scale.set(1, solvedForearmLength / forearmLength, 1);

  const bend = Math.acos(
    THREE.MathUtils.clamp(
      state.shoulderDirection.dot(state.forearmDirection),
      -1,
      1,
    ),
  );
  // Keep the rig joint at the actual positive IK bend so its socket remains
  // on the authored contact. The CPU deformation writer independently caps
  // this caller-owned value at its firearm-safe anatomy bound.
  const elbowPitch = THREE.MathUtils.clamp(bend, 0, Math.PI);
  forearm.rotation.set(elbowPitch, 0, 0);
  return elbowPitch;
}

/**
 * Bounded, allocation-free (after rig creation) visual two-arm targeting.
 * Call after generic rig pose and weapon aim, and before CPU arm deformation
 * when the optional output is used. It only mutates visual joints.
 */
export function applyCharacterRigWeaponGripTargets(
  rig: CharacterRig,
  output?: CharacterRigWeaponGripOutput,
): CharacterRig {
  const state = gripSolverStates.get(rig);
  if (!state) return rig;
  // Targets share a weapon parent and neither arm can move them. Refresh only
  // these paths, then reuse one inverse for both upper-body-space targets.
  rig.upperBody.updateWorldMatrix(true, false);
  rig.weaponSocket.updateWorldMatrix(false, false);
  rig.supportGripTarget.updateWorldMatrix(false, false);
  rig.dominantGripTarget.updateWorldMatrix(false, false);
  state.upperBodyWorldInverse.copy(rig.upperBody.matrixWorld).invert();
  state.supportTargetLocal.setFromMatrixPosition(rig.supportGripTarget.matrixWorld)
    .applyMatrix4(state.upperBodyWorldInverse);
  state.dominantTargetLocal.setFromMatrixPosition(rig.dominantGripTarget.matrixWorld)
    .applyMatrix4(state.upperBodyWorldInverse);
  const leftElbowPitch = solveGripArm(
    state, rig.leftShoulder, rig.leftForearm, state.supportTargetLocal, -1,
  );
  const rightElbowPitch = solveGripArm(
    state, rig.rightShoulder, rig.rightForearm, state.dominantTargetLocal, 1,
  );
  if (output) {
    output.leftElbowPitch = leftElbowPitch;
    output.rightElbowPitch = rightElbowPitch;
  }
  return rig;
}

/** Apply flat numeric bot-animation output without creating scene resources. */
export function applyCharacterRigPose(
  rig: CharacterRig,
  pose: Readonly<Partial<BotAnimationPose>>,
): CharacterRig {
  const lowerBodyYaw = finite(pose.lowerBodyYaw, 0);
  const upperBodyYaw = finite(pose.upperBodyYaw, 0);
  const pelvisLift = finite(pose.pelvisLift, 0);
  const pelvisWeightShift = finite(pose.pelvisWeightShift, 0);
  const torsoLeanX = finite(pose.torsoLeanX, 0);
  const torsoLeanZ = finite(pose.torsoLeanZ, 0);

  rig.pelvis.position.set(
    pelvisWeightShift * 0.08,
    BASE_PELVIS_Y + pelvisLift,
    0,
  );
  rig.lowerBody.rotation.set(0, lowerBodyYaw, 0);
  rig.upperBody.rotation.set(torsoLeanZ, upperBodyYaw, -torsoLeanX);

  rig.leftThigh.rotation.set(
    finite(pose.leftHipPitch, 0),
    finite(pose.leftHipYaw, 0),
    0,
  );
  rig.leftShin.rotation.set(finite(pose.leftKneePitch, 0.1), 0, 0);
  rig.leftShin.position.set(0, -0.39, 0);
  rig.leftFoot.rotation.set(finite(pose.leftAnklePitch, 0), 0, 0);
  rig.leftFoot.position.set(
    finite(pose.leftFootOffsetX, -LIMB_X),
    -0.38 +
      finite(pose.leftFootOffsetY, 0) +
      finite(pose.leftToeClearance, 0.04) * 0.25,
    finite(pose.leftFootOffsetZ, 0) - 0.03,
  );

  rig.rightThigh.rotation.set(
    finite(pose.rightHipPitch, 0),
    finite(pose.rightHipYaw, 0),
    0,
  );
  rig.rightShin.rotation.set(finite(pose.rightKneePitch, 0.1), 0, 0);
  rig.rightShin.position.set(0, -0.39, 0);
  rig.rightFoot.rotation.set(finite(pose.rightAnklePitch, 0), 0, 0);
  rig.rightFoot.position.set(
    finite(pose.rightFootOffsetX, LIMB_X),
    -0.38 +
      finite(pose.rightFootOffsetY, 0) +
      finite(pose.rightToeClearance, 0.04) * 0.25,
    finite(pose.rightFootOffsetZ, 0) - 0.03,
  );

  rig.leftShoulder.rotation.set(
    finite(pose.leftShoulderPitch, 1.08),
    finite(pose.leftShoulderYaw, 0),
    0,
  );
  rig.leftForearm.rotation.set(finite(pose.leftElbowPitch, 0.38), 0, 0);
  rig.rightShoulder.rotation.set(
    finite(pose.rightShoulderPitch, 1.08),
    finite(pose.rightShoulderYaw, 0),
    0,
  );
  rig.rightForearm.rotation.set(finite(pose.rightElbowPitch, 0.38), 0, 0);

  // Grip targeting runs after this pose write. Cache the authored arm values
  // once so the solver can preserve their readable asymmetry while retaining
  // exact hand-to-grip endpoint authority.
  const gripState = gripSolverStates.get(rig);
  if (gripState) {
    gripState.authoredPhase = finite(pose.phase, gripState.authoredPhase);
    gripState.leftShoulderPitch = finite(pose.leftShoulderPitch, 1.08);
    gripState.leftShoulderYaw = finite(pose.leftShoulderYaw, 0);
    gripState.leftElbowPitch = finite(pose.leftElbowPitch, 0.38);
    gripState.rightShoulderPitch = finite(pose.rightShoulderPitch, 1.08);
    gripState.rightShoulderYaw = finite(pose.rightShoulderYaw, 0);
    gripState.rightElbowPitch = finite(pose.rightElbowPitch, 0.38);
  }

  rig.weaponSocket.position.set(
    finite(pose.weaponSocketX, 0.07),
    finite(pose.weaponSocketY, 1.2),
    finite(pose.weaponSocketZ, -0.34),
  );
  rig.weaponSocket.rotation.set(
    finite(pose.weaponSocketPitch, 0),
    finite(pose.weaponSocketYaw, 0),
    finite(pose.weaponSocketRoll, 0),
  );
  return rig;
}

/** Naming aliases kept explicit for callers that use "write" terminology. */
export const writeCharacterRigPose = applyCharacterRigPose;
export const mountCharacterRigSibling = attachCharacterRigSibling;
export const getCharacterRigSocketDistances = getCharacterRigSocketMetrics;
export const createVisualCharacterRig = createCharacterRig;
export const applyBotAnimationPoseToCharacterRig = applyCharacterRigPose;
export const excludeCharacterRigVisuals = filterOutCharacterRigVisuals;
