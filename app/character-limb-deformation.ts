import * as THREE from 'three';
import {
  getCharacterLimbGeometryMetadata,
  type CharacterLimbGeometryMetadata,
  type CharacterLimbKind,
  type CharacterLimbSegment,
  type CharacterLimbSegmentRange,
} from './character-visuals.ts';

/** Hard visual bounds; gameplay angles and hit proxies are unaffected. */
export const CHARACTER_LIMB_MAX_KNEE_ANGLE = 1.35;
export const CHARACTER_LIMB_MAX_ANKLE_ANGLE = 1.1;
// A two-handed firearm stance commonly folds the trigger-side elbow past
// ninety degrees. This visual-only bound still stops inversion while allowing
// the compound palm to meet the authored grip instead of hovering beside it.
export const CHARACTER_LIMB_MAX_ELBOW_ANGLE = 2.4;

export type CharacterLimbDeformationAngles = Readonly<{
  knee?: number;
  ankle?: number;
  elbow?: number;
  kneeAngle?: number;
  ankleAngle?: number;
  elbowAngle?: number;
  kneePitch?: number;
  anklePitch?: number;
  elbowPitch?: number;
  lowerLeg?: number;
  boot?: number;
  forearm?: number;
  lowerLegAngle?: number;
  bootAngle?: number;
  forearmAngle?: number;
}>;

/** Render-only foot contact inputs. Authority roots and hit proxies are untouched. */
export type CharacterLimbFootPlantInput = Readonly<{
  /** 1 is fully planted, 0 is fully swinging. */
  plant?: number;
  /** Forward/backward local offset used while the foot is swinging. */
  swingOffsetZ?: number;
  /** Desired world-space ground height for the rendered sole. */
  groundY?: number;
  /** Desired swing sole clearance in world units. */
  toeClearance?: number;
}>;

const EMPTY_DEFORMATION_ANGLES: CharacterLimbDeformationAngles = {};
export const CHARACTER_RENDERED_FOOT_MIN_CLEARANCE = 0.04;
export const CHARACTER_RENDERED_FOOT_MAX_CLEARANCE = 0.12;
export const CHARACTER_RENDERED_FOOT_PLANT_HEIGHT = 0.005;
/** Maximum visual stretch before a planted boot is allowed to slide. */
export const CHARACTER_RENDERED_FOOT_MAX_CORRECTION = 0.28;

type DeformationOperation = Readonly<{
  start: number;
  end: number;
  kind: 0 | 1 | 2 | 3 | 4 | 5;
  pivotY: number;
  pivotZ: number;
  secondaryPivotY: number;
  secondaryPivotZ: number;
  vertexGroups: readonly Uint32Array[];
  bindPositionRange: Float32Array;
  bindNormalRange: Float32Array;
}>;

/** Per-mesh CPU deformation state. All arrays are allocated during setup. */
export type CharacterLimbDeformationController = {
  readonly mesh: THREE.Mesh;
  readonly geometry: THREE.BufferGeometry;
  readonly limbKind: CharacterLimbKind;
  readonly metadata: CharacterLimbGeometryMetadata;
  readonly ranges: readonly CharacterLimbSegmentRange[];
  readonly bindPositions: Float32Array;
  readonly bindNormals: Float32Array;
  /** Smooth setup-time influence used to plant feet without moving the hip. */
  readonly footPlantWeights: Float32Array;
  /** Derivative of each influence with respect to authored local Y. */
  readonly footPlantWeightSlopes: Float32Array;
  readonly positionAttribute: THREE.BufferAttribute;
  readonly normalAttribute: THREE.BufferAttribute;
  readonly operations: readonly DeformationOperation[];
  readonly footTranslationGroups: readonly Uint32Array[];
  readonly footNormalGroups: readonly Uint32Array[];
  write: (angles?: CharacterLimbDeformationAngles) => void;
  reset: () => void;
};

type FootPlantState = {
  readonly restPosition: THREE.Vector3;
  readonly bootAnchorWorld: THREE.Vector3;
  readonly worldDelta: THREE.Vector3;
  readonly localDelta: THREE.Vector3;
  readonly localDeformationDelta: THREE.Vector3;
  readonly meshWorldInverse: THREE.Matrix4;
  bootRange: CharacterLimbSegmentRange | null;
  minimumWorldY: number;
  planted: boolean;
  targetWorldX: number;
  targetWorldZ: number;
};

const footPlantStates = new WeakMap<
  CharacterLimbDeformationController,
  FootPlantState
>();

function createFootPlantState(mesh: THREE.Mesh): FootPlantState {
  return {
    restPosition: mesh.position.clone(),
    bootAnchorWorld: new THREE.Vector3(),
    worldDelta: new THREE.Vector3(),
    localDelta: new THREE.Vector3(),
    localDeformationDelta: new THREE.Vector3(),
    meshWorldInverse: new THREE.Matrix4(),
    bootRange: null,
    minimumWorldY: Number.POSITIVE_INFINITY,
    planted: false,
    targetWorldX: 0,
    targetWorldZ: 0,
  };
}

function createFootPlantInfluences(
  bindPositions: Float32Array,
  limbKind: CharacterLimbKind,
): Readonly<{ weights: Float32Array; slopes: Float32Array }> {
  const vertexCount = bindPositions.length / 3;
  const weights = new Float32Array(vertexCount);
  const slopes = new Float32Array(vertexCount);
  if (limbKind !== 'leg') return { weights, slopes };

  let highestY = Number.NEGATIVE_INFINITY;
  for (let vertex = 0; vertex < vertexCount; vertex += 1)
    highestY = Math.max(highestY, bindPositions[vertex * 3 + 1]);

  // Keep a broad ring at the hip completely fixed. Below it, ease the
  // correction through the cloth until the ankle so the boot can make exact
  // contact without translating the whole leg away from the pelvis.
  const fixedHipBandY = highestY - 0.09;
  const fullInfluenceY = -0.6;
  const influenceHeight = Math.max(
    fixedHipBandY - fullInfluenceY,
    Number.EPSILON,
  );
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const y = bindPositions[vertex * 3 + 1];
    const linear = Math.min(
      Math.max((fixedHipBandY - y) / influenceHeight, 0),
      1,
    );
    weights[vertex] = linear * linear * (3 - 2 * linear);
    slopes[vertex] =
      linear > 0 && linear < 1
        ? (-6 * linear * (1 - linear)) / influenceHeight
        : 0;
  }
  return { weights, slopes };
}

function finite(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? value : 0;
}

function bounded(value: number | undefined, maximum: number): number {
  const safe = finite(value);
  return Math.min(Math.max(safe, -maximum), maximum);
}

function pick(
  primary: number | undefined,
  alias: number | undefined,
  pitch: number | undefined,
  descriptive?: number,
  descriptiveAlias?: number,
): number {
  if (primary !== undefined && Number.isFinite(primary)) return primary;
  if (alias !== undefined && Number.isFinite(alias)) return alias;
  if (pitch !== undefined && Number.isFinite(pitch)) return pitch;
  if (descriptive !== undefined && Number.isFinite(descriptive))
    return descriptive;
  return descriptiveAlias ?? 0;
}

function segmentOperationKind(
  limbKind: CharacterLimbKind,
  segment: CharacterLimbSegment,
): DeformationOperation['kind'] {
  if (limbKind === 'leg') {
    if (segment === 'knee') return 1;
    if (segment === 'shin') return 2;
    if (segment === 'boot') return 3;
  } else {
    if (segment === 'elbow') return 4;
    if (segment === 'forearm' || segment === 'hand') return 5;
  }
  return 0;
}

function validateMetadata(
  geometry: THREE.BufferGeometry,
  metadata: CharacterLimbGeometryMetadata,
  expectedKind?: CharacterLimbKind,
): void {
  if (geometry.index) {
    throw new Error('Character limb deformation requires non-indexed geometry');
  }
  if (expectedKind && metadata.kind !== expectedKind) {
    throw new Error(
      `Character limb kind mismatch: expected ${expectedKind}, got ${metadata.kind}`,
    );
  }
  const vertexCount = geometry.getAttribute('position').count;
  let nextStart = 0;
  for (const range of metadata.segments) {
    if (
      range.start !== nextStart ||
      range.count <= 0 ||
      range.end !== range.start + range.count ||
      range.vertexStart !== range.start ||
      range.vertexCount !== range.count ||
      range.end > vertexCount
    ) {
      throw new Error('Invalid character limb segment ranges');
    }
    nextStart = range.end;
  }
  if (nextStart !== vertexCount) {
    throw new Error('Character limb segment ranges do not cover the geometry');
  }
}

function operationFromRange(
  metadata: CharacterLimbGeometryMetadata,
  range: CharacterLimbSegmentRange,
  bindPositions: Float32Array,
  bindNormals: Float32Array,
): DeformationOperation {
  const kind = segmentOperationKind(metadata.kind, range.segment);
  const pivot = range.pivot;
  const isBoot = metadata.kind === 'leg' && range.segment === 'boot';
  return {
    start: range.start,
    end: range.end,
    kind,
    // A boot first follows the knee, then hinges around its own ankle pivot.
    pivotY: isBoot ? -0.32 : (pivot?.y ?? 0),
    pivotZ: isBoot ? 0 : (pivot?.z ?? 0),
    secondaryPivotY: isBoot ? (pivot?.y ?? 0) : 0,
    secondaryPivotZ: isBoot ? (pivot?.z ?? 0) : 0,
    vertexGroups: groupIdenticalVertices(range, bindPositions, bindNormals),
    bindPositionRange: bindPositions.subarray(range.start * 3, range.end * 3),
    bindNormalRange: bindNormals.subarray(range.start * 3, range.end * 3),
  };
}

/** Share arithmetic across triangle corners, never across different hinges. */
function groupIdenticalVertices(
  range: CharacterLimbSegmentRange,
  bindPositions: Float32Array,
  bindNormals: Float32Array,
): readonly Uint32Array[] {
  const groups = new Map<string, number[]>();
  // Bit keys preserve signed zero as well as exact Float32 identity. Positions
  // also determine the planting weight/slope, so all six inputs must match.
  const positionBits = new Uint32Array(bindPositions.buffer);
  const normalBits = new Uint32Array(bindNormals.buffer);
  for (let vertex = range.start; vertex < range.end; vertex += 1) {
    const offset = vertex * 3;
    const positionKey = `${positionBits[offset]},${positionBits[offset + 1]},${positionBits[offset + 2]}`;
    const normalKey = `${normalBits[offset]},${normalBits[offset + 1]},${normalBits[offset + 2]}`;
    const key = `${positionKey},${normalKey}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(offset);
    } else {
      groups.set(key, [offset]);
    }
  }
  return Array.from(groups.values(), (offsets) => Uint32Array.from(offsets));
}

function writeRange(
  operation: DeformationOperation,
  bindPositions: Float32Array,
  bindNormals: Float32Array,
  positions: THREE.BufferAttribute['array'],
  normals: THREE.BufferAttribute['array'],
  kneeSin: number,
  kneeCos: number,
  ankleSin: number,
  ankleCos: number,
  elbowSin: number,
  elbowCos: number,
): void {
  if (operation.kind === 0) {
    // The upper segment never hinges, but planting may have deformed it on the
    // previous frame. Restore it with the same bind data, using bulk copies.
    positions.set(operation.bindPositionRange, operation.start * 3);
    normals.set(operation.bindNormalRange, operation.start * 3);
    return;
  }
  const hasKnee =
    operation.kind === 1 || operation.kind === 2 || operation.kind === 3;
  const hasAnkle = operation.kind === 3;
  const hasElbow = operation.kind === 4 || operation.kind === 5;
  const pivotY = operation.pivotY;
  const pivotZ = operation.pivotZ;
  let anklePivotY = operation.secondaryPivotY;
  let anklePivotZ = operation.secondaryPivotZ;
  if (hasAnkle) {
    const ankleDy = anklePivotY - pivotY;
    const ankleDz = anklePivotZ - pivotZ;
    anklePivotY = pivotY + kneeCos * ankleDy - kneeSin * ankleDz;
    anklePivotZ = pivotZ + kneeSin * ankleDy + kneeCos * ankleDz;
  }
  for (const group of operation.vertexGroups) {
    const offset = group[0];
    const x = bindPositions[offset];
    let y = bindPositions[offset + 1];
    let z = bindPositions[offset + 2];
    const nx = bindNormals[offset];
    let ny = bindNormals[offset + 1];
    let nz = bindNormals[offset + 2];

    if (hasKnee) {
      const dy = y - pivotY;
      const dz = z - pivotZ;
      y = pivotY + kneeCos * dy - kneeSin * dz;
      z = pivotZ + kneeSin * dy + kneeCos * dz;
      const normalY = kneeCos * ny - kneeSin * nz;
      nz = kneeSin * ny + kneeCos * nz;
      ny = normalY;
    } else if (hasElbow) {
      const dy = y - pivotY;
      const dz = z - pivotZ;
      y = pivotY + elbowCos * dy - elbowSin * dz;
      z = pivotZ + elbowSin * dy + elbowCos * dz;
      const normalY = elbowCos * ny - elbowSin * nz;
      nz = elbowSin * ny + elbowCos * nz;
      ny = normalY;
    }

    if (hasAnkle) {
      const dy = y - anklePivotY;
      const dz = z - anklePivotZ;
      y = anklePivotY + ankleCos * dy - ankleSin * dz;
      z = anklePivotZ + ankleSin * dy + ankleCos * dz;
      const normalY = ankleCos * ny - ankleSin * nz;
      nz = ankleSin * ny + ankleCos * nz;
      ny = normalY;
    }

    for (let corner = 0; corner < group.length; corner += 1) {
      const destination = group[corner];
      positions[destination] = x;
      positions[destination + 1] = y;
      positions[destination + 2] = z;
      normals[destination] = nx;
      normals[destination + 1] = ny;
      normals[destination + 2] = nz;
    }
  }
}

function installConservativeBounds(
  geometry: THREE.BufferGeometry,
  positions: Float32Array,
  operations: readonly DeformationOperation[],
): void {
  let radius = 0;
  for (const operation of operations) {
    const pivotRadius = Math.hypot(operation.pivotY, operation.pivotZ);
    const anklePivotRadius = Math.hypot(
      operation.secondaryPivotY,
      operation.secondaryPivotZ,
    );
    for (let vertex = operation.start; vertex < operation.end; vertex += 1) {
      const offset = vertex * 3;
      const pointRadius = Math.hypot(
        positions[offset],
        positions[offset + 1],
        positions[offset + 2],
      );
      const relativeRadius = Math.hypot(
        positions[offset],
        positions[offset + 1] - operation.pivotY,
        positions[offset + 2] - operation.pivotZ,
      );
      const transformedRadius =
        operation.kind === 3
          ? pivotRadius + relativeRadius + 2 * anklePivotRadius
          : operation.kind === 0
            ? pointRadius
            : pivotRadius + relativeRadius;
      if (transformedRadius > radius) radius = transformedRadius;
    }
  }
  const extent = Math.max(radius, Number.EPSILON);
  // Both objects are created once and remain valid for every bounded pose.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), extent);
  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-extent, -extent, -extent),
    new THREE.Vector3(extent, extent, extent),
  );
}

function writeController(
  controller: CharacterLimbDeformationController,
  angles?: CharacterLimbDeformationAngles,
): void {
  const footPlant = footPlantStates.get(controller);
  if (footPlant) controller.mesh.position.copy(footPlant.restPosition);
  const suppliedAngles = angles ?? EMPTY_DEFORMATION_ANGLES;
  const knee = bounded(
    pick(
      suppliedAngles.knee,
      suppliedAngles.kneeAngle,
      suppliedAngles.kneePitch,
      suppliedAngles.lowerLeg,
      suppliedAngles.lowerLegAngle,
    ),
    CHARACTER_LIMB_MAX_KNEE_ANGLE,
  );
  const ankle = bounded(
    pick(
      suppliedAngles.ankle,
      suppliedAngles.ankleAngle,
      suppliedAngles.anklePitch,
      suppliedAngles.boot,
      suppliedAngles.bootAngle,
    ),
    CHARACTER_LIMB_MAX_ANKLE_ANGLE,
  );
  const elbow = bounded(
    pick(
      suppliedAngles.elbow,
      suppliedAngles.elbowAngle,
      suppliedAngles.elbowPitch,
      suppliedAngles.forearm,
      suppliedAngles.forearmAngle,
    ),
    CHARACTER_LIMB_MAX_ELBOW_ANGLE,
  );
  const kneeSin = Math.sin(knee);
  const kneeCos = Math.cos(knee);
  const ankleSin = Math.sin(ankle);
  const ankleCos = Math.cos(ankle);
  const elbowSin = Math.sin(elbow);
  const elbowCos = Math.cos(elbow);
  const positions = controller.positionAttribute.array;
  const normals = controller.normalAttribute.array;
  if (knee === 0 && ankle === 0 && elbow === 0) {
    (positions as Float32Array).set(controller.bindPositions);
    (normals as Float32Array).set(controller.bindNormals);
    controller.positionAttribute.needsUpdate = true;
    controller.normalAttribute.needsUpdate = true;
    return;
  }
  const operations = controller.operations;
  for (let index = 0; index < operations.length; index += 1) {
    writeRange(
      operations[index],
      controller.bindPositions,
      controller.bindNormals,
      positions,
      normals,
      kneeSin,
      kneeCos,
      ankleSin,
      ankleCos,
      elbowSin,
      elbowCos,
    );
  }
  controller.positionAttribute.needsUpdate = true;
  controller.normalAttribute.needsUpdate = true;
}

function resetController(controller: CharacterLimbDeformationController): void {
  (controller.positionAttribute.array as Float32Array).set(
    controller.bindPositions,
  );
  (controller.normalAttribute.array as Float32Array).set(
    controller.bindNormals,
  );
  controller.positionAttribute.needsUpdate = true;
  controller.normalAttribute.needsUpdate = true;
  const footPlant = footPlantStates.get(controller);
  if (footPlant) {
    controller.mesh.position.copy(footPlant.restPosition);
    footPlant.planted = false;
    footPlant.targetWorldX = 0;
    footPlant.targetWorldZ = 0;
  }
}

function measureBootWorldBounds(
  controller: CharacterLimbDeformationController,
  state: FootPlantState,
): boolean {
  const boot = state.bootRange;
  if (!boot) {
    return false;
  }
  const positions = controller.positionAttribute.array as ArrayLike<number>;
  const elements = controller.mesh.matrixWorld.elements;
  let minimumY = Number.POSITIVE_INFINITY;
  let anchorCount = 0;
  let anchorX = 0;
  let anchorZ = 0;
  for (let vertex = boot.start; vertex < boot.end; vertex += 1) {
    const offset = vertex * 3;
    const x = positions[offset];
    const y = positions[offset + 1];
    const z = positions[offset + 2];
    const inverseW = 1 / (
      elements[3] * x + elements[7] * y + elements[11] * z + elements[15]
    );
    const worldY = (
      elements[1] * x + elements[5] * y + elements[9] * z + elements[13]
    ) * inverseW;
    const newMinimum = worldY < minimumY - 1e-5;
    const atMinimum = Math.abs(worldY - minimumY) <= 1e-5;
    if (!newMinimum && !atMinimum) {
      continue;
    }
    // Only sole candidates contribute X/Z. Preserve the original vertex
    // order and repeated corners so anchor averaging rounds identically.
    const worldX = (
      elements[0] * x + elements[4] * y + elements[8] * z + elements[12]
    ) * inverseW;
    const worldZ = (
      elements[2] * x + elements[6] * y + elements[10] * z + elements[14]
    ) * inverseW;
    if (newMinimum) {
      minimumY = worldY;
      anchorCount = 1;
      anchorX = worldX;
      anchorZ = worldZ;
    } else {
      anchorCount += 1;
      anchorX += worldX;
      anchorZ += worldZ;
    }
  }
  if (!Number.isFinite(minimumY) || anchorCount === 0) {
    return false;
  }
  state.minimumWorldY = minimumY;
  state.bootAnchorWorld.set(
    anchorX / anchorCount,
    minimumY,
    anchorZ / anchorCount,
  );
  return true;
}

function applyFootLocalTranslation(
  controller: CharacterLimbDeformationController,
  state: FootPlantState,
  x: number,
  y: number,
  z: number,
): void {
  const positions = controller.positionAttribute.array as Float32Array;
  const weights = controller.footPlantWeights;
  for (const group of controller.footTranslationGroups) {
    const offset = group[0];
    const weight = weights[offset / 3];
    const translatedX = positions[offset] + x * weight;
    const translatedY = positions[offset + 1] + y * weight;
    const translatedZ = positions[offset + 2] + z * weight;
    for (let corner = 0; corner < group.length; corner += 1) {
      const destination = group[corner];
      positions[destination] = translatedX;
      positions[destination + 1] = translatedY;
      positions[destination + 2] = translatedZ;
    }
  }
  state.localDeformationDelta.x += x;
  state.localDeformationDelta.y += y;
  state.localDeformationDelta.z += z;
  controller.positionAttribute.needsUpdate = true;
}

function writeFootPlantNormals(
  controller: CharacterLimbDeformationController,
  state: FootPlantState,
): void {
  const normals = controller.normalAttribute.array as Float32Array;
  const slopes = controller.footPlantWeightSlopes;
  const dx = state.localDeformationDelta.x;
  const dy = state.localDeformationDelta.y;
  const dz = state.localDeformationDelta.z;
  if (dx === 0 && dy === 0 && dz === 0) {
    return;
  }
  for (const group of controller.footNormalGroups) {
    const offset = group[0];
    const slope = slopes[offset / 3];
    const nx = normals[offset];
    const nz = normals[offset + 2];
    const denominator = 1 + dy * slope;
    const safeDenominator =
      Math.abs(denominator) > 1e-4
        ? denominator
        : Math.sign(denominator) * 1e-4;
    const ny =
      (normals[offset + 1] - slope * (dx * nx + dz * nz)) /
      (safeDenominator || 1e-4);
    // Ordinary unit-scale normals avoid the general hypot scaling pass.
    // Keep its robust path for extreme finite inputs whose square over/underflows.
    const lengthSquared = nx * nx + ny * ny + nz * nz;
    const magnitude = (lengthSquared > 0 && Number.isFinite(lengthSquared)
      ? Math.sqrt(lengthSquared)
      : Math.hypot(nx, ny, nz)) || 1;
    const normalX = nx / magnitude;
    const normalY = ny / magnitude;
    const normalZ = nz / magnitude;
    for (let corner = 0; corner < group.length; corner += 1) {
      const destination = group[corner];
      normals[destination] = normalX;
      normals[destination + 1] = normalY;
      normals[destination + 2] = normalZ;
    }
  }
  controller.normalAttribute.needsUpdate = true;
}

function applyFootWorldTranslation(
  controller: CharacterLimbDeformationController,
  state: FootPlantState,
  targetY: number,
): void {
  state.worldDelta.set(
    state.planted ? state.targetWorldX - state.bootAnchorWorld.x : 0,
    targetY - state.minimumWorldY,
    state.planted ? state.targetWorldZ - state.bootAnchorWorld.z : 0,
  );
  if (
    state.planted &&
    Math.hypot(state.worldDelta.x, state.worldDelta.z) >
      CHARACTER_RENDERED_FOOT_MAX_CORRECTION
  ) {
    // The contact has exceeded anatomical reach. Release it now so a high
    // plant signal can latch again at the boot's current location next frame.
    state.planted = false;
    state.worldDelta.x = 0;
    state.worldDelta.z = 0;
  }
  state.meshWorldInverse.copy(controller.mesh.matrixWorld).invert();
  // Convert a world-space direction into the mesh's local frame. Clearing
  // translation is essential because vertices receive a displacement vector.
  const elements = state.meshWorldInverse.elements;
  elements[12] = 0;
  elements[13] = 0;
  elements[14] = 0;
  state.localDelta.copy(state.worldDelta).applyMatrix4(state.meshWorldInverse);
  // A planted contact is presentation guidance, not an infinite constraint.
  // Let the boot slide once the correction exceeds a believable leg reach;
  // otherwise a fast bot or falling body turns the trousers into a rubber tube.
  state.localDelta.clampLength(0, CHARACTER_RENDERED_FOOT_MAX_CORRECTION);
  applyFootLocalTranslation(
    controller,
    state,
    state.localDelta.x,
    state.localDelta.y,
    state.localDelta.z,
  );
}

function writeFootPlanting(
  controller: CharacterLimbDeformationController,
  input?: CharacterLimbFootPlantInput,
  ancestorsCurrent = false,
): void {
  if (controller.limbKind !== 'leg') return;
  const state = footPlantStates.get(controller);
  if (!state) return;

  const supplied = input ?? {};
  state.localDeformationDelta.set(0, 0, 0);
  const plant = Math.min(Math.max(finite(supplied.plant), 0), 1);
  const releasePlant = 0.35;
  const activatePlant = 0.5;
  if (plant < releasePlant) state.planted = false;

  // A deformation write restores the authored mesh transform and bind shape.
  // Apply swing travel through the same hip-safe influence field used for
  // planting, so neither phase can pull the visible thigh out of the pelvis.
  controller.mesh.position.copy(state.restPosition);
  if (!state.planted)
    applyFootLocalTranslation(
      controller,
      state,
      0,
      0,
      finite(supplied.swingOffsetZ),
    );

  // updateWorldMatrix also refreshes ancestors after the authority-sibling
  // root has translated this frame. This is presentation-only state.
  controller.mesh.updateWorldMatrix(!ancestorsCurrent, false);
  if (!measureBootWorldBounds(controller, state)) return;

  if (plant >= activatePlant && !state.planted) {
    state.targetWorldX = state.bootAnchorWorld.x;
    state.targetWorldZ = state.bootAnchorWorld.z;
    state.planted = true;
  }

  const groundY = finite(supplied.groundY);
  const toeClearance = Math.min(
    Math.max(
      supplied.toeClearance === undefined ||
        !Number.isFinite(supplied.toeClearance)
        ? CHARACTER_RENDERED_FOOT_MIN_CLEARANCE
        : supplied.toeClearance,
      CHARACTER_RENDERED_FOOT_MIN_CLEARANCE,
    ),
    CHARACTER_RENDERED_FOOT_MAX_CLEARANCE,
  );
  // Keep the contact transition smooth, while fully planted and fully
  // swinging states hit the exact measured bounds required by the renderer.
  const plantSettle = 0.75;
  const blend = Math.min(
    Math.max((plant - activatePlant) / (plantSettle - activatePlant), 0),
    1,
  );
  const smoothBlend = blend * blend * (3 - 2 * blend);
  const targetY =
    groundY +
    toeClearance * (1 - smoothBlend) +
    CHARACTER_RENDERED_FOOT_PLANT_HEIGHT * smoothBlend;
  applyFootWorldTranslation(controller, state, targetY);
  // The graded correction bends the cloth surface. Update normals with the
  // inverse-transpose of that one-dimensional deformation field, avoiding a
  // general whole-geometry normal rebuild on every bot leg.
  writeFootPlantNormals(controller, state);
}

/** Clone one mesh's geometry and prepare its immutable bind snapshot. */
export function createCharacterLimbDeformationController(
  mesh: THREE.Mesh,
  expectedKind?: CharacterLimbKind,
): CharacterLimbDeformationController {
  const sourceGeometry = mesh.geometry;
  const metadata = getCharacterLimbGeometryMetadata(sourceGeometry);
  if (!metadata)
    throw new Error('Mesh geometry has no character limb metadata');
  validateMetadata(sourceGeometry, metadata, expectedKind);

  // Each mesh gets a private output buffer. Shared base geometry therefore
  // remains immutable when one bot bends its limb.
  const geometry = sourceGeometry.clone();
  const positionAttribute = geometry.getAttribute(
    'position',
  ) as THREE.BufferAttribute;
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  const normalAttribute = geometry.getAttribute(
    'normal',
  ) as THREE.BufferAttribute;
  if (!positionAttribute || !normalAttribute)
    throw new Error(
      'Character limb geometry requires position and normal attributes',
    );
  if (positionAttribute.count !== normalAttribute.count)
    throw new Error(
      'Character limb position and normal attributes differ in size',
    );
  mesh.geometry = geometry;
  geometry.userData.characterLimb = metadata;

  const bindPositions = Float32Array.from(
    positionAttribute.array as ArrayLike<number>,
  );
  const footPlantInfluences = createFootPlantInfluences(
    bindPositions,
    metadata.kind,
  );
  const bindNormals = Float32Array.from(
    normalAttribute.array as ArrayLike<number>,
  );
  const operations = metadata.segments.map((range) =>
    operationFromRange(metadata, range, bindPositions, bindNormals),
  );
  const vertexGroups = operations.flatMap((operation) => operation.vertexGroups);
  const controller: CharacterLimbDeformationController = {
    mesh,
    geometry,
    limbKind: metadata.kind,
    metadata,
    ranges: metadata.segments,
    bindPositions,
    bindNormals,
    footPlantWeights: footPlantInfluences.weights,
    footPlantWeightSlopes: footPlantInfluences.slopes,
    positionAttribute,
    normalAttribute,
    operations,
    footTranslationGroups: vertexGroups.filter(
      (group) => footPlantInfluences.weights[group[0] / 3] !== 0,
    ),
    footNormalGroups: vertexGroups.filter(
      (group) => footPlantInfluences.slopes[group[0] / 3] !== 0,
    ),
    write: undefined as unknown as (
      angles?: CharacterLimbDeformationAngles,
    ) => void,
    reset: undefined as unknown as () => void,
  };
  const footPlant = createFootPlantState(mesh);
  footPlant.bootRange =
    controller.ranges.find(({ segment }) => segment === 'boot') ?? null;
  footPlantStates.set(controller, footPlant);
  installConservativeBounds(
    geometry,
    controller.bindPositions,
    controller.operations,
  );
  controller.write = (angles) => writeController(controller, angles);
  controller.reset = () => resetController(controller);
  return controller;
}

/** Allocation-free per-frame writer for a prepared limb mesh. */
export function writeCharacterLimbDeformation(
  controller: CharacterLimbDeformationController,
  angles?: CharacterLimbDeformationAngles,
): void {
  writeController(controller, angles);
}

/** Restore exact bind positions and normals without replacing attributes. */
export function resetCharacterLimbDeformation(
  controller: CharacterLimbDeformationController,
): void {
  resetController(controller);
}

/**
 * Allocation-free rendered boot planting pass; call after deformation.write.
 * Only paired-leg callers that refreshed the current parent matrices may pass
 * ancestorsCurrent. Standalone/reset/death writers keep the default refresh.
 */
export function writeCharacterLimbFootPlanting(
  controller: CharacterLimbDeformationController,
  input?: CharacterLimbFootPlantInput,
  ancestorsCurrent = false,
): void {
  writeFootPlanting(controller, input, ancestorsCurrent);
}

// Short aliases keep the API easy to discover for renderer call sites.
export const createLimbDeformationController =
  createCharacterLimbDeformationController;
export const writeLimbDeformation = writeCharacterLimbDeformation;
export const resetLimbDeformation = resetCharacterLimbDeformation;
export const writeLimbFootPlanting = writeCharacterLimbFootPlanting;
