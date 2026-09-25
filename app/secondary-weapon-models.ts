import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SecondaryWeaponKind } from './game-rules';
import type { AuthoredViewmodelController } from './authored-carbine-viewmodel.ts';

export type ProceduralSecondaryFirstPersonKind = Exclude<
  SecondaryWeaponKind,
  'glock18'
>;

export const PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS = [
  'usp', 'p228', 'deagle', 'elite', 'fiveseven',
] as const satisfies readonly ProceduralSecondaryFirstPersonKind[];

export type SecondaryFirstPersonModel = Readonly<{
  root: THREE.Group;
  muzzle: THREE.PointLight;
  muzzles: readonly THREE.PointLight[];
  ejectionAnchors: readonly THREE.Object3D[];
  actionParts: SecondaryWeaponActionParts;
  /** Present when this pistol owns its arms, weapon mesh, and clips as one rig. */
  authoredAnimation?: AuthoredViewmodelController;
}>;

export type SecondaryWeaponActionPart = Readonly<{
  object: THREE.Object3D;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
}>;

export type SecondarySupportHandActionPart = SecondaryWeaponActionPart &
  Readonly<{
    mesh: THREE.Mesh;
    magazine: THREE.Object3D;
    magazineToHand: THREE.Matrix4;
  }>;

export type SecondaryWeaponActionParts = Readonly<{
  magazines: readonly SecondaryWeaponActionPart[];
  supportHand?: SecondarySupportHandActionPart;
}>;

export type SecondaryFirstPersonMount = Readonly<{
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  scale: number;
}>;

/**
 * Camera-local mounts for the deterministic 1024x768 viewmodel frame. The
 * compact scale keeps the complete firearm + authored hands below the 30%
 * width / 48% height presentation limits while preserving the weapon's local
 * muzzle and ejection anchors for gameplay effects.
 */
export const SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS: Readonly<
  Record<ProceduralSecondaryFirstPersonKind, SecondaryFirstPersonMount>
> = Object.freeze({
  usp: Object.freeze({
    position: Object.freeze([0.27, -0.25, -0.72] as const),
    rotation: Object.freeze([-0.035, 0.2, 0] as const),
    scale: 0.56,
  }),
  p228: Object.freeze({
    position: Object.freeze([0.27, -0.23, -0.7] as const),
    rotation: Object.freeze([-0.035, 0.21, 0] as const),
    scale: 0.56,
  }),
  deagle: Object.freeze({
    position: Object.freeze([0.27, -0.25, -0.82] as const),
    rotation: Object.freeze([-0.035, 0.18, 0] as const),
    scale: 0.56,
  }),
  elite: Object.freeze({
    position: Object.freeze([0.24, -0.23, -0.82] as const),
    rotation: Object.freeze([-0.035, 0.16, 0] as const),
    scale: 0.5,
  }),
  fiveseven: Object.freeze({
    position: Object.freeze([0.27, -0.25, -0.72] as const),
    rotation: Object.freeze([-0.035, 0.2, 0] as const),
    scale: 0.56,
  }),
});

export const SECONDARY_VIEWMODEL_VIEWPORT_LIMITS = Object.freeze({
  width: 0.3,
  height: 0.48,
});

export type SecondaryWeaponVisualBudget = Readonly<{
  triangles: number;
  weaponDraws: number;
  materials: number;
  triangleBudget: number;
  drawBudget: number;
  withinBudget: boolean;
}>;

/** The weapon-only budgets from the Loop 3 visual contract (arms/effects excluded). */
export const SECONDARY_WEAPON_TRIANGLE_BUDGET = 2500;
export const SECONDARY_WEAPON_DRAW_CALL_BUDGET = 4;
export const ELITE_WEAPON_TRIANGLE_BUDGET = 4000;
export const ELITE_WEAPON_DRAW_CALL_BUDGET = 7;

export type SecondaryModelOptions = Readonly<{
  /** Called after geometry is attached, allowing page.tsx to add its cached arms. */
  attachViewmodelArms?: (root: THREE.Group, kind: SecondaryWeaponKind) => void;
  /** Creates the page-owned sprite/light pair at each firearm muzzle. */
  createMuzzleFlash?: (kind: SecondaryWeaponKind) => THREE.PointLight;
  /** Optional page-owned finish; each model clones it before consolidation. */
  materials?: Readonly<{
    body: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
  }>;
}>;

type MuzzleFlashFactory = (kind: SecondaryWeaponKind) => THREE.PointLight;

const POLYMER = new THREE.MeshStandardMaterial({
  color: 0x4d5554,
  roughness: 0.86,
  metalness: 0.03,
});
const DARK_STEEL = new THREE.MeshStandardMaterial({
  color: 0x737e80,
  roughness: 0.66,
  metalness: 0.11,
});
const BRUSHED_STEEL = new THREE.MeshStandardMaterial({
  color: 0x929b9d,
  roughness: 0.58,
  metalness: 0.14,
});
const HIGHLIGHT = new THREE.MeshStandardMaterial({
  color: 0xa9b0ae,
  roughness: 0.52,
  metalness: 0.12,
});
const RUBBER = new THREE.MeshStandardMaterial({
  color: 0x343938,
  roughness: 0.92,
  metalness: 0.01,
});
type LocalWeaponMaterials = Readonly<{
  body: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
}>;

// A build gets its own palette so first-person, world, and dropped models can
// be disposed independently. Meshes within one model share these instances,
// keeping the weapon draw count bounded and making painted highlights readable
// without relying on a PMREM environment.
let activeLocalMaterials: LocalWeaponMaterials | null = null;

function resolveLocalMaterial(material: THREE.Material) {
  if (!activeLocalMaterials) return material.clone();
  if (material === POLYMER || material === RUBBER)
    return activeLocalMaterials.body;
  if (material === HIGHLIGHT) return activeLocalMaterials.accent;
  return activeLocalMaterials.metal;
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
) {
  // Every generated model owns its materials so disposing a dropped firearm
  // cannot invalidate a first-person or bot model that shares the silhouette.
  const value = new THREE.Mesh(geometry, resolveLocalMaterial(material));
  value.name = name;
  value.userData.secondaryWeaponGeometry = true;
  value.castShadow = true;
  value.receiveShadow = true;
  return value;
}

function box(
  width: number,
  height: number,
  length: number,
  material: THREE.Material,
  name: string,
  bevel = 0.01,
) {
  return mesh(
    // One bevel segment preserves a deliberately planar/chamfered silhouette
    // while avoiding the smooth toy-like response of the old four-segment box.
    new RoundedBoxGeometry(width, height, length, 1, bevel),
    material,
    name,
  );
}

function detailBox(
  width: number,
  height: number,
  length: number,
  material: THREE.Material,
  name: string,
) {
  return mesh(new THREE.BoxGeometry(width, height, length), material, name);
}

function addReloadMagazine(
  root: THREE.Group,
  world: boolean,
  position: readonly [number, number, number],
  size: readonly [number, number, number],
) {
  // The moving magazine shares the restrained steel role so it remains legible
  // between the darker polymer grip and tactical support glove.
  const magazine = box(...size, DARK_STEEL, 'reload-magazine', 0.008);
  magazine.position.set(...position);
  magazine.rotation.x = -0.18;
  if (!world) magazine.userData.secondaryReloadMagazine = true;
  root.add(magazine);
  return magazine;
}

function createSlide(
  width: number,
  height: number,
  length: number,
  material: THREE.Material,
  name: string,
) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfLength = length / 2;
  const profile = [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, height * 0.16],
    [width * 0.34, halfHeight],
    [-width * 0.34, halfHeight],
    [-halfWidth, height * 0.16],
  ] as const;
  const positions: number[] = [];
  for (const rear of [false, true]) {
    profile.forEach(([x, y]) => {
      const frontTopRecess = !rear && y > 0 ? length * 0.055 : 0;
      positions.push(x, y, rear ? halfLength : -halfLength + frontTopRecess);
    });
  }
  positions.push(0, 0, -halfLength + length * 0.02, 0, 0, halfLength);
  const indices: number[] = [];
  for (let edge = 0; edge < profile.length; edge += 1) {
    const next = (edge + 1) % profile.length;
    indices.push(edge, next, profile.length + edge);
    indices.push(next, profile.length + next, profile.length + edge);
    indices.push(profile.length * 2, next, edge);
    indices.push(
      profile.length * 2 + 1,
      profile.length + edge,
      profile.length + next,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      Array.from({ length: positions.length / 3 }, () => [0, 0]).flat(),
      2,
    ),
  );
  geometry.setIndex(indices);
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  const position = faceted.getAttribute('position');
  const normals = faceted.getAttribute('normal');
  const uv = faceted.getAttribute('uv');
  for (let vertex = 0; vertex < position.count; vertex++) {
    const frontFace = Math.abs(normals.getZ(vertex)) > 0.8;
    uv.setXY(
      vertex,
      frontFace
        ? position.getX(vertex) / width + 0.5
        : position.getZ(vertex) / length + 0.5,
      position.getY(vertex) / height + 0.5,
    );
  }
  geometry.dispose();
  return mesh(faceted, material, name);
}

function cylinder(
  radius: number,
  length: number,
  material: THREE.Material,
  name: string,
  radialSegments = 8,
) {
  const value = mesh(
    new THREE.CylinderGeometry(radius, radius, length, radialSegments),
    material,
    name,
  );
  value.rotation.x = Math.PI / 2;
  return value;
}

function addGrip(
  root: THREE.Group,
  width: number,
  depth: number,
  height: number,
  x = 0,
  material: THREE.Material = POLYMER,
) {
  const topHalfWidth = width / 2;
  const bottomHalfWidth = width * 0.42;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const positions = new Float32Array([
    -topHalfWidth,
    halfHeight,
    -halfDepth,
    topHalfWidth,
    halfHeight,
    -halfDepth,
    topHalfWidth,
    halfHeight,
    halfDepth,
    -topHalfWidth,
    halfHeight,
    halfDepth,
    -bottomHalfWidth,
    -halfHeight,
    -halfDepth + 0.018,
    bottomHalfWidth,
    -halfHeight,
    -halfDepth + 0.018,
    bottomHalfWidth,
    -halfHeight,
    halfDepth + 0.018,
    -bottomHalfWidth,
    -halfHeight,
    halfDepth + 0.018,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
      2,
    ),
  );
  geometry.setIndex([
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2,
    6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
  ]);
  geometry.computeVertexNormals();
  const grip = mesh(geometry, material, 'grip');
  grip.position.set(x, -height * 0.62, 0.065);
  grip.rotation.x = -0.18;
  root.add(grip);
  return grip;
}

function addGripPanels(
  root: THREE.Group,
  width: number,
  depth: number,
  height: number,
  x = 0,
) {
  for (const side of [-1, 1] as const) {
    const panel = detailBox(
      0.008,
      height * 0.34,
      depth * 0.46,
      DARK_STEEL,
      `grip-panel-${side < 0 ? 'left' : 'right'}`,
    );
    panel.position.set(x + side * (width * 0.48), -height * 0.62, 0.067);
    panel.rotation.x = -0.18;
    root.add(panel);
  }
  const backstrap = detailBox(
    width * 0.62,
    height * 0.46,
    0.008,
    DARK_STEEL,
    'grip-backstrap',
  );
  backstrap.position.set(x, -height * 0.62, 0.067 + depth * 0.49);
  backstrap.rotation.x = -0.18;
  root.add(backstrap);
}

function addTriggerGuard(
  root: THREE.Group,
  x = 0,
  y = -0.065,
  z = -0.065,
  width = 0.06,
) {
  const guard = mesh(
    new THREE.TorusGeometry(width, 0.007, 5, 8, Math.PI),
    DARK_STEEL,
    'trigger-guard',
  );
  guard.rotation.set(Math.PI / 2, 0, Math.PI);
  guard.position.set(x, y, z);
  root.add(guard);
  return guard;
}

function addSight(
  root: THREE.Group,
  x: number,
  z: number,
  rear = false,
  y = 0.062,
) {
  const sight = detailBox(
    rear ? 0.044 : 0.012,
    0.012,
    rear ? 0.02 : 0.018,
    HIGHLIGHT,
    rear ? 'rear-sight' : 'front-sight',
  );
  sight.position.set(x, y, z);
  root.add(sight);
  return sight;
}

function addEjectionPort(root: THREE.Group, x: number, z: number) {
  const port = detailBox(0.012, 0.038, 0.082, RUBBER, 'ejection-port');
  port.position.set(x, 0.057, z);
  root.add(port);
  const anchor = new THREE.Object3D();
  anchor.name = 'ejection-anchor';
  anchor.position.set(x + (x < 0 ? -0.02 : 0.02), 0.065, z);
  root.add(anchor);
  return anchor;
}

function addMuzzle(
  root: THREE.Group,
  kind: SecondaryWeaponKind,
  z: number,
  x = 0,
  createMuzzleFlash?: MuzzleFlashFactory,
) {
  const muzzle =
    createMuzzleFlash?.(kind) ?? new THREE.PointLight(0xffb85a, 0, 1.35, 2);
  muzzle.userData.transient = true;
  muzzle.name = 'muzzle-flash';
  muzzle.position.set(x, 0.012, z);
  root.add(muzzle);
  return muzzle;
}

function addSimpleBarrel(
  root: THREE.Group,
  radius: number,
  length: number,
  z: number,
  x = 0,
  material: THREE.Material = DARK_STEEL,
) {
  const barrel = cylinder(radius, length, material, 'barrel', 12);
  barrel.position.set(x, 0.006, z);
  root.add(barrel);
  return barrel;
}

function addMuzzleBore(root: THREE.Group, radius: number, z: number, x = 0) {
  const crown = mesh(
    new THREE.TorusGeometry(radius * 0.68, radius * 0.2, 5, 12),
    HIGHLIGHT,
    'muzzle-crown',
  );
  crown.position.set(x, 0.006, z);
  root.add(crown);
  const bore = cylinder(radius * 0.38, 0.006, RUBBER, 'muzzle-bore', 12);
  bore.position.set(x, 0.006, z + 0.012);
  root.add(bore);
}

function addSlideDetails(
  root: THREE.Group,
  halfWidth: number,
  rearZ: number,
  topY: number,
  slideLength: number,
) {
  for (const side of [-1, 1] as const) {
    for (let groove = 0; groove < 4; groove += 1) {
      const serration = detailBox(
        0.007,
        0.057,
        0.012,
        POLYMER,
        `slide-serration-${side}-${groove}`,
      );
      serration.position.set(
        side * (halfWidth + 0.002),
        topY - 0.038,
        rearZ - groove * 0.021,
      );
      serration.rotation.x = -0.18;
      root.add(serration);
    }
  }
  const sightRail = detailBox(
    halfWidth * 0.9,
    0.006,
    slideLength * 0.38,
    POLYMER,
    'slide-sight-rib',
  );
  sightRail.position.set(0, topY + 0.007, rearZ - slideLength * 0.31);
  root.add(sightRail);
}

function consolidateWeaponMeshes(root: THREE.Group, kind: SecondaryWeaponKind) {
  root.updateMatrixWorld(true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<
    THREE.Material,
    Array<{ geometry: THREE.BufferGeometry; name: string }>
  >();
  const sourceMeshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !object.userData.secondaryWeaponGeometry ||
      object.userData.secondaryReloadMagazine
    )
      return;
    sourceMeshes.push(object);
    // Box and cylinder primitives do not agree on index buffers. A single
    // non-indexed path keeps the merge deterministic; these are tiny weapon
    // meshes and remain well inside the triangle budget.
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    geometry.applyMatrix4(rootInverse.clone().multiply(object.matrixWorld));
    const material = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    const parts = buckets.get(material) ?? [];
    parts.push({ geometry, name: object.name });
    buckets.set(material, parts);
  });
  sourceMeshes.forEach((source) => {
    source.parent?.remove(source);
    source.geometry.dispose();
  });
  let materialIndex = 0;
  buckets.forEach((parts, material) => {
    const merged = mergeGeometries(
      parts.map((part) => part.geometry),
      false,
    );
    const ranges: Array<{ name: string; start: number; count: number }> = [];
    let start = 0;
    parts.forEach((part) => {
      const count = part.geometry.getAttribute('position').count;
      ranges.push({ name: part.name, start, count });
      start += count;
      part.geometry.dispose();
    });
    if (!merged)
      throw new Error(`Unable to consolidate ${kind} weapon geometry.`);
    merged.userData.secondaryWeaponPartRanges = ranges;
    const value = new THREE.Mesh(merged, material);
    value.name = `secondary-weapon-material-${materialIndex}`;
    value.userData.secondaryWeaponGeometry = true;
    value.castShadow = true;
    value.receiveShadow = true;
    // These merged vertices already include every source part's local
    // transform. Only the owning weapon root moves; reload magazines and
    // supplied muzzle effects were excluded from this consolidation.
    value.updateMatrix();
    value.matrixAutoUpdate = false;
    root.add(value);
    materialIndex += 1;
  });
}

function buildGlock(
  root: THREE.Group,
  world: boolean,
  createMuzzleFlash?: MuzzleFlashFactory,
) {
  const slide = createSlide(
    0.14,
    0.115,
    0.45,
    DARK_STEEL,
    'machined-steel-slide',
  );
  slide.position.z = -0.12;
  root.add(slide);
  const frame = box(0.15, 0.09, 0.31, POLYMER, 'polymer-frame', 0.018);
  frame.position.set(0, -0.045, 0.055);
  root.add(frame);
  addGrip(root, 0.115, 0.13, 0.25, 0, POLYMER);
  addGripPanels(root, 0.115, 0.13, 0.25);
  addSimpleBarrel(root, 0.026, 0.31, -0.17);
  addMuzzleBore(root, 0.027, -0.35);
  addSlideDetails(root, 0.07, 0.075, 0.057, 0.45);
  addTriggerGuard(root, 0, -0.085, -0.06, 0.057);
  addEjectionPort(root, 0.072, -0.125);
  addSight(root, 0, -0.315, false, 0.063);
  addSight(root, 0, 0.05, true, 0.063);
  addReloadMagazine(root, world, [0, -0.175, 0.055], [0.072, 0.19, 0.085]);
  if (world) root.scale.setScalar(0.84);
  return addMuzzle(root, 'glock18', -0.35, 0, createMuzzleFlash);
}

function buildUsp(
  root: THREE.Group,
  world: boolean,
  createMuzzleFlash?: MuzzleFlashFactory,
) {
  // The USP slide is deliberately slimmer than the frame; that step in the
  // silhouette is what keeps the compact first-person model from reading as a
  // single rectangular slab at a glance.
  const slide = createSlide(0.125, 0.102, 0.48, DARK_STEEL, 'angular-slide');
  slide.position.z = -0.13;
  root.add(slide);
  const frame = box(0.132, 0.075, 0.3, POLYMER, 'angular-frame', 0.006);
  frame.position.set(0, -0.045, 0.015);
  frame.rotation.x = -0.05;
  root.add(frame);
  addGrip(root, 0.102, 0.128, 0.24, 0, RUBBER);
  addGripPanels(root, 0.102, 0.128, 0.24);
  addSimpleBarrel(root, 0.022, 0.37, -0.205, 0, BRUSHED_STEEL);
  addMuzzleBore(root, 0.025, -0.43);
  addSlideDetails(root, 0.0625, 0.08, 0.051, 0.48);
  const threadCollar = cylinder(
    0.034,
    0.055,
    HIGHLIGHT,
    'suppressor-ready-collar',
    12,
  );
  threadCollar.position.set(0, 0.006, -0.39);
  root.add(threadCollar);
  addTriggerGuard(root, 0, -0.082, -0.07, 0.057);
  addEjectionPort(root, 0.069, -0.14);
  addSight(root, 0, -0.35, false, 0.057);
  addSight(root, 0, 0.065, true, 0.057);
  addReloadMagazine(root, world, [0, -0.17, 0.065], [0.066, 0.18, 0.085]);
  if (world) root.scale.setScalar(0.86);
  return addMuzzle(root, 'usp', -0.43, 0, createMuzzleFlash);
}

function buildP228(
  root: THREE.Group,
  world: boolean,
  createMuzzleFlash?: MuzzleFlashFactory,
) {
  const slide = createSlide(0.145, 0.12, 0.37, BRUSHED_STEEL, 'compact-slide');
  slide.position.z = -0.09;
  root.add(slide);
  const frame = box(0.15, 0.1, 0.28, POLYMER, 'compact-frame', 0.018);
  frame.position.set(0, -0.045, 0.06);
  root.add(frame);
  addGrip(root, 0.115, 0.13, 0.23, 0, RUBBER);
  addGripPanels(root, 0.115, 0.13, 0.23);
  addSimpleBarrel(root, 0.028, 0.27, -0.145);
  addMuzzleBore(root, 0.029, -0.305);
  addSlideDetails(root, 0.0725, 0.065, 0.06, 0.37);
  addTriggerGuard(root, 0, -0.09, -0.045, 0.058);
  addEjectionPort(root, 0.075, -0.095);
  addSight(root, 0, -0.285, false, 0.066);
  addSight(root, 0, 0.045, true, 0.066);
  addReloadMagazine(root, world, [0, -0.165, 0.065], [0.072, 0.175, 0.09]);
  if (world) root.scale.setScalar(0.9);
  return addMuzzle(root, 'p228', -0.305, 0, createMuzzleFlash);
}

function buildDeagle(
  root: THREE.Group,
  world: boolean,
  createMuzzleFlash?: MuzzleFlashFactory,
) {
  const slide = createSlide(
    0.19,
    0.155,
    0.54,
    BRUSHED_STEEL,
    'heavy-long-slide',
  );
  slide.position.z = -0.12;
  root.add(slide);
  const frame = box(0.19, 0.13, 0.37, POLYMER, 'heavy-frame', 0.025);
  frame.position.set(0, -0.055, 0.06);
  root.add(frame);
  addGrip(root, 0.145, 0.16, 0.3, 0, RUBBER);
  addGripPanels(root, 0.145, 0.16, 0.3);
  addSimpleBarrel(root, 0.037, 0.42, -0.22, 0, DARK_STEEL);
  addMuzzleBore(root, 0.043, -0.555);
  addSlideDetails(root, 0.095, 0.105, 0.077, 0.54);
  const muzzleBrake = cylinder(0.052, 0.11, HIGHLIGHT, 'muzzle-brake', 14);
  muzzleBrake.position.set(0, 0.006, -0.48);
  root.add(muzzleBrake);
  addTriggerGuard(root, 0, -0.1, -0.055, 0.072);
  addEjectionPort(root, 0.097, -0.12);
  addSight(root, 0, -0.42, false, 0.084);
  addSight(root, 0, 0.08, true, 0.084);
  addReloadMagazine(root, world, [0, -0.205, 0.07], [0.088, 0.225, 0.105]);
  if (world) root.scale.setScalar(0.78);
  return addMuzzle(root, 'deagle', -0.555, 0, createMuzzleFlash);
}

function buildFiveSeven(
  root: THREE.Group,
  world: boolean,
  createMuzzleFlash?: MuzzleFlashFactory,
) {
  const slide = createSlide(0.125, 0.095, 0.53, DARK_STEEL, 'long-slim-slide');
  slide.position.z = -0.15;
  root.add(slide);
  const frame = box(0.145, 0.095, 0.38, POLYMER, 'slim-polymer-frame', 0.02);
  frame.position.set(0, -0.035, 0.045);
  root.add(frame);
  addGrip(root, 0.1, 0.14, 0.27, 0, POLYMER);
  addGripPanels(root, 0.1, 0.14, 0.27);
  addSimpleBarrel(root, 0.024, 0.39, -0.235);
  addMuzzleBore(root, 0.026, -0.435);
  addSlideDetails(root, 0.0625, 0.08, 0.047, 0.53);
  addTriggerGuard(root, 0, -0.075, -0.075, 0.055);
  addEjectionPort(root, 0.064, -0.16);
  addSight(root, 0, -0.405, false, 0.054);
  addSight(root, 0, 0.065, true, 0.054);
  addReloadMagazine(root, world, [0, -0.19, 0.055], [0.068, 0.22, 0.085]);
  if (world) root.scale.setScalar(0.84);
  return addMuzzle(root, 'fiveseven', -0.435, 0, createMuzzleFlash);
}

function buildElite(
  root: THREE.Group,
  world: boolean,
  createMuzzleFlash?: MuzzleFlashFactory,
) {
  for (const side of [-1, 1] as const) {
    const handgun = new THREE.Group();
    handgun.name = side < 0 ? 'elite-left-pistol' : 'elite-right-pistol';
    handgun.position.x = side * 0.105;
    handgun.rotation.z = side * 0.035;
    const slide = createSlide(
      0.11,
      0.09,
      0.38,
      DARK_STEEL,
      'paired-steel-slide',
    );
    slide.position.z = -0.1;
    handgun.add(slide);
    const frame = box(0.12, 0.075, 0.27, DARK_STEEL, 'paired-frame', 0.014);
    frame.position.set(0, -0.035, 0.045);
    handgun.add(frame);
    addGrip(handgun, 0.095, 0.11, 0.235, 0, RUBBER);
    addGripPanels(handgun, 0.095, 0.11, 0.235);
    addSimpleBarrel(handgun, 0.022, 0.27, -0.145);
    addMuzzleBore(handgun, 0.024, -0.36);
    addSlideDetails(handgun, 0.055, 0.062, 0.045, 0.38);
    addTriggerGuard(handgun, 0, -0.07, -0.05, 0.05);
    addEjectionPort(handgun, side * 0.057, -0.1);
    addSight(handgun, 0, -0.285, false, 0.051);
    addSight(handgun, 0, 0.045, true, 0.051);
    addReloadMagazine(handgun, world, [0, -0.165, 0.06], [0.06, 0.175, 0.078]);
    root.add(handgun);
  }
  if (world) root.scale.setScalar(0.82);
  // Keep muzzle order aligned with the ejection-anchor traversal above:
  // left pistol first, right pistol second. The player uses one deterministic
  // index for both arrays so each flash and casing must stay on the same side.
  const muzzle = addMuzzle(root, 'elite', -0.36, -0.105, createMuzzleFlash);
  const rightMuzzle = addMuzzle(root, 'elite', -0.36, 0.105, createMuzzleFlash);
  rightMuzzle.name = 'right-muzzle-flash';
  return muzzle;
}

function buildModel(
  kind: SecondaryWeaponKind,
  world: boolean,
  createMuzzleFlash?: MuzzleFlashFactory,
  materials?: SecondaryModelOptions['materials'],
): {
  root: THREE.Group;
  muzzle: THREE.PointLight;
  muzzles: THREE.PointLight[];
  ejectionAnchors: THREE.Object3D[];
  magazines: SecondaryWeaponActionPart[];
} {
  const root = new THREE.Group();
  root.name = `${kind}-${world ? 'world' : 'first-person'}`;
  const previousLocalMaterials = activeLocalMaterials;
  activeLocalMaterials = {
    body: (materials?.body ?? POLYMER).clone(),
    metal: (materials?.metal ?? DARK_STEEL).clone(),
    accent: (materials?.accent ?? HIGHLIGHT).clone(),
  };
  let muzzle: THREE.PointLight | null = null;
  try {
    switch (kind) {
      case 'glock18':
        muzzle = buildGlock(root, world, createMuzzleFlash);
        break;
      case 'usp':
        muzzle = buildUsp(root, world, createMuzzleFlash);
        break;
      case 'p228':
        muzzle = buildP228(root, world, createMuzzleFlash);
        break;
      case 'deagle':
        muzzle = buildDeagle(root, world, createMuzzleFlash);
        break;
      case 'fiveseven':
        muzzle = buildFiveSeven(root, world, createMuzzleFlash);
        break;
      case 'elite': {
        muzzle = buildElite(root, world, createMuzzleFlash);
        break;
      }
      default: {
        const exhaustiveKind: never = kind;
        throw new Error(
          `Unsupported secondary weapon kind: ${String(exhaustiveKind)}`,
        );
      }
    }
    if (!muzzle) throw new Error(`Unsupported secondary weapon: ${kind}`);
    consolidateWeaponMeshes(root, kind);
    const ejectionAnchors: THREE.Object3D[] = [];
    const muzzles: THREE.PointLight[] = [];
    const magazines: SecondaryWeaponActionPart[] = [];
    root.traverse((object) => {
      if (object.name === 'ejection-anchor') ejectionAnchors.push(object);
      if (object instanceof THREE.PointLight) muzzles.push(object);
      if (object.userData.secondaryReloadMagazine)
        magazines.push({
          object,
          basePosition: object.position.clone(),
          baseRotation: object.rotation.clone(),
        });
      if (object instanceof THREE.Object3D && object !== root)
        object.userData.secondaryWeaponKind = kind;
    });
    return { root, muzzle, muzzles, ejectionAnchors, magazines };
  } finally {
    activeLocalMaterials = previousLocalMaterials;
  }
}

function geometryTriangles(geometry: THREE.BufferGeometry) {
  const count =
    geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  return Math.floor(count / 3);
}

/** Counts only tagged firearm meshes, excluding cached arms and muzzle effects. */
export function inspectSecondaryWeaponBudget(
  root: THREE.Object3D,
  kind?: SecondaryWeaponKind,
): SecondaryWeaponVisualBudget {
  const elite = kind === 'elite' || root.name.startsWith('elite-');
  let triangles = 0;
  let weaponDraws = 0;
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !object.userData.secondaryWeaponGeometry
    )
      return;
    triangles += geometryTriangles(object.geometry);
    weaponDraws += Array.isArray(object.material) ? object.material.length : 1;
    (Array.isArray(object.material)
      ? object.material
      : [object.material]
    ).forEach((material) => materials.add(material));
  });
  const triangleBudget = elite
    ? ELITE_WEAPON_TRIANGLE_BUDGET
    : SECONDARY_WEAPON_TRIANGLE_BUDGET;
  const drawBudget = elite
    ? ELITE_WEAPON_DRAW_CALL_BUDGET
    : SECONDARY_WEAPON_DRAW_CALL_BUDGET;
  return {
    triangles,
    weaponDraws,
    materials: materials.size,
    triangleBudget,
    drawBudget,
    withinBudget: triangles <= triangleBudget && weaponDraws <= drawBudget,
  };
}

export function createSecondaryFirstPersonModel(
  kind: ProceduralSecondaryFirstPersonKind,
  options: SecondaryModelOptions = {},
): SecondaryFirstPersonModel {
  // Keep a clear runtime error if a JavaScript caller bypasses the type API.
  if ((kind as SecondaryWeaponKind) === 'glock18')
    throw new Error('Glock first-person rendering requires the authored viewmodel.');
  const built = buildModel(
    kind,
    false,
    options.createMuzzleFlash,
    options.materials,
  );
  options.attachViewmodelArms?.(built.root, kind);
  let supportHandRoot: THREE.Object3D | undefined;
  built.root.traverse((object) => {
    if (object.userData.viewmodelGrip !== 'pistol-support') return;
    supportHandRoot = object;
  });
  let supportHand: SecondarySupportHandActionPart | undefined;
  const magazine = built.magazines[0]?.object;
  if (supportHandRoot && magazine) {
    const mesh = supportHandRoot.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh,
    );
    const reloadGeometry = mesh?.userData.viewmodelReloadGripGeometry as
      | THREE.BufferGeometry
      | undefined;
    if (mesh && reloadGeometry && supportHandRoot.parent === magazine.parent) {
      magazine.updateMatrix();
      supportHandRoot.updateMatrix();
      const magazineToHand = magazine.matrix
        .clone()
        .invert()
        .multiply(supportHandRoot.matrix);
      const magazineGripPosition = new THREE.Vector3();
      const magazineGripRotation = new THREE.Quaternion();
      const magazineGripScale = new THREE.Vector3();
      magazineToHand.decompose(
        magazineGripPosition,
        magazineGripRotation,
        magazineGripScale,
      );
      // Rotate the opposed thumb/finger axis into view, then center the two
      // weighted finger pads on one magazine face and the thumb on the other.
      // The root remains socketed to the moving magazine throughout the hold.
      magazineGripPosition.x -= 0.005;
      magazineGripPosition.y -= 0.045;
      magazineGripRotation.multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          -0.9,
        ),
      );
      magazineToHand.compose(
        magazineGripPosition,
        magazineGripRotation,
        magazineGripScale,
      );
      supportHand = {
        object: supportHandRoot,
        basePosition: supportHandRoot.position.clone(),
        baseRotation: supportHandRoot.rotation.clone(),
        mesh,
        magazine,
        magazineToHand,
      };
    }
  }
  // Apply the camera-local compact mount after arm attachment so hands and
  // weapon remain one authoritative transform during aim, recoil, and reload.
  built.root.scale.setScalar(
    SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS[kind].scale,
  );
  built.root.visible = false;
  return {
    ...built,
    actionParts: { magazines: built.magazines, supportHand },
  };
}

export function createSecondaryWorldModel(
  kind: SecondaryWeaponKind,
  options: Pick<SecondaryModelOptions, 'createMuzzleFlash'> = {},
) {
  return buildModel(kind, true, options.createMuzzleFlash).root;
}
