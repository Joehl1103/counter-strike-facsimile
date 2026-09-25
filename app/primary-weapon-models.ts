import * as THREE from 'three';
import type { AuthoredViewmodelController } from './authored-carbine-viewmodel.ts';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PRIMARY_WEAPON_KINDS = [
  'rifle',
  'carbine',
  'smg',
  'shotgun',
  'sniper',
] as const;

export type PrimaryWeaponKind = (typeof PRIMARY_WEAPON_KINDS)[number];

export type PrimaryWeaponMaterials = Readonly<{
  metal: THREE.Material;
  wood: THREE.Material;
  polymer: THREE.Material;
  accent: THREE.Material;
}>;

export type PrimaryWeaponActionPart = Readonly<{
  object: THREE.Object3D;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
}>;

export type PrimaryWeaponActionParts = Readonly<{
  shotgunPump?: PrimaryWeaponActionPart;
  sniperBolt?: PrimaryWeaponActionPart;
}>;

export type PrimaryFirstPersonModel = Readonly<{
  root: THREE.Group;
  muzzle: THREE.PointLight;
  ejectionAnchor?: THREE.Object3D;
  actionParts: PrimaryWeaponActionParts;
  authoredAnimation?: AuthoredViewmodelController;
}>;

export type PrimaryModelOptions = Readonly<{
  materials: PrimaryWeaponMaterials;
  attachViewmodelArms?: (root: THREE.Group, kind: PrimaryWeaponKind) => void;
  createMuzzleFlash?: (kind: PrimaryWeaponKind) => THREE.PointLight;
}>;

export type PrimaryFirstPersonMount = Readonly<{
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  scale: number;
}>;

export const PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS: Readonly<
  Record<Exclude<PrimaryWeaponKind, 'carbine'>, PrimaryFirstPersonMount>
> = Object.freeze({
  rifle: Object.freeze({
    position: Object.freeze([0.43, -0.34, -0.59] as const),
    rotation: Object.freeze([0.08, 0.14, 0] as const),
    scale: 0.82,
  }),
  smg: Object.freeze({
    position: Object.freeze([0.29, -0.29, -0.82] as const),
    rotation: Object.freeze([-0.04, 0.16, 0] as const),
    scale: 0.82,
  }),
  shotgun: Object.freeze({
    position: Object.freeze([0.3, -0.29, -1.05] as const),
    rotation: Object.freeze([-0.035, 0.12, 0] as const),
    scale: 0.76,
  }),
  sniper: Object.freeze({
    position: Object.freeze([0.32, -0.28, -1.3] as const),
    rotation: Object.freeze([-0.025, 0.1, 0] as const),
    scale: 0.68,
  }),
});

const PRIMARY_TRIANGLE_BUDGET: Readonly<Record<PrimaryWeaponKind, number>> = {
  rifle: 3500,
  carbine: 3200,
  smg: 3000,
  shotgun: 3200,
  sniper: 3800,
};

export const PRIMARY_WEAPON_DRAW_CALL_BUDGET = 6;
const PRIMARY_WEAPON_DRAW_CALL_BUDGETS: Readonly<
  Record<PrimaryWeaponKind, number>
> = {
  rifle: 4,
  carbine: 4,
  smg: 4,
  // The wood pump and its steel ribs add two moving draws to the four static
  // material buckets; keeping both finishes makes the action readable.
  shotgun: 6,
  sniper: 5,
};

function actionPart(object: THREE.Object3D): PrimaryWeaponActionPart {
  object.userData.primaryWeaponActionPart = true;
  return Object.freeze({
    object,
    basePosition: object.position.clone(),
    baseRotation: object.rotation.clone(),
  });
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
) {
  const value = new THREE.Mesh(geometry, material);
  value.name = name;
  value.userData.primaryWeaponGeometry = true;
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
  bevel = 0.012,
) {
  return mesh(
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

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  length: number,
  material: THREE.Material,
  name: string,
  radialSegments = 12,
) {
  const value = mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, length, radialSegments),
    material,
    name,
  );
  value.rotation.x = Math.PI / 2;
  return value;
}

function createTaperedPrism(
  length: number,
  rearHeight: number,
  frontHeight: number,
  width: number,
) {
  const halfLength = length / 2;
  const halfWidth = width / 2;
  const rearHalfHeight = rearHeight / 2;
  const frontHalfHeight = frontHeight / 2;
  const positions = new Float32Array([
    -halfWidth,
    -frontHalfHeight,
    -halfLength,
    halfWidth,
    -frontHalfHeight,
    -halfLength,
    halfWidth,
    frontHalfHeight,
    -halfLength,
    -halfWidth,
    frontHalfHeight,
    -halfLength,
    -halfWidth,
    -rearHalfHeight,
    halfLength,
    halfWidth,
    -rearHalfHeight,
    halfLength,
    halfWidth,
    rearHalfHeight,
    halfLength,
    -halfWidth,
    rearHalfHeight,
    halfLength,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1],
      2,
    ),
  );
  geometry.setIndex([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 1,
    2, 6, 1, 6, 5, 0, 4, 7, 0, 7, 3,
  ]);
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  geometry.dispose();
  return faceted;
}

function createTaperedGrip(
  width: number,
  height: number,
  lowerDepth: number,
  upperDepth: number,
) {
  const geometry = createTaperedPrism(height, lowerDepth, upperDepth, width);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function addMuzzleBore(
  root: THREE.Group,
  materials: PrimaryWeaponMaterials,
  z: number,
  y: number,
  radius: number,
) {
  const crown = mesh(
    new THREE.TorusGeometry(radius * 0.7, radius * 0.2, 5, 12),
    materials.accent,
    'muzzle-crown',
  );
  crown.position.set(0, y, z);
  root.add(crown);
  const bore = cylinder(
    radius * 0.38,
    radius * 0.38,
    0.006,
    materials.polymer,
    'muzzle-bore',
    12,
  );
  // The inner face sits behind the crown along local +Z. Keeping these as
  // separate named ranges lets geometry QA prove the recess after merging.
  bore.position.set(0, y, z + 0.012);
  root.add(bore);
}

function addReceiverSeams(
  root: THREE.Group,
  materials: PrimaryWeaponMaterials,
  halfWidth: number,
  y: number,
  z: number,
  length: number,
) {
  for (const side of [-1, 1] as const) {
    const seam = detailBox(
      0.008,
      0.022,
      length,
      materials.accent,
      `receiver-seam-${side < 0 ? 'left' : 'right'}`,
    );
    seam.position.set(side * (halfWidth + 0.002), y, z);
    root.add(seam);
    const inset = detailBox(
      0.007,
      0.052,
      length * 0.42,
      materials.accent,
      `receiver-inset-${side < 0 ? 'left' : 'right'}`,
    );
    inset.position.set(
      side * (halfWidth + 0.003),
      y + 0.047,
      z - length * 0.14,
    );
    root.add(inset);
    for (const pinZ of [-0.25, 0.27]) {
      const pin = detailBox(
        0.009,
        0.016,
        0.016,
        materials.accent,
        `receiver-pin-${side < 0 ? 'left' : 'right'}`,
      );
      pin.position.set(
        side * (halfWidth + 0.004),
        y + 0.012,
        z + length * pinZ,
      );
      root.add(pin);
    }
  }
}

function addMagazinePanel(
  root: THREE.Group,
  materials: PrimaryWeaponMaterials,
  x: number,
  y: number,
  z: number,
  height: number,
  length: number,
) {
  const panel = detailBox(
    0.009,
    height,
    length,
    materials.accent,
    'magazine-side-panel',
  );
  panel.position.set(x, y, z);
  root.add(panel);
}

function addMuzzle(
  root: THREE.Group,
  kind: PrimaryWeaponKind,
  position: readonly [number, number, number],
  factory?: (kind: PrimaryWeaponKind) => THREE.PointLight,
) {
  const muzzle = factory?.(kind) ?? new THREE.PointLight(0xffb35a, 0, 1.6, 2);
  muzzle.name = 'muzzle-flash';
  muzzle.userData.transient = true;
  muzzle.position.set(...position);
  root.add(muzzle);
  return muzzle;
}

function addEjectionAnchor(
  root: THREE.Group,
  position: readonly [number, number, number],
  rotateY = false,
) {
  const anchor = new THREE.Object3D();
  anchor.name = 'ejection-anchor';
  anchor.position.set(...position);
  if (rotateY) anchor.rotation.y = Math.PI;
  root.add(anchor);
  return anchor;
}

function buildRifle(
  root: THREE.Group,
  materials: PrimaryWeaponMaterials,
  createMuzzleFlash?: (kind: PrimaryWeaponKind) => THREE.PointLight,
) {
  const receiver = box(0.12, 0.13, 0.62, materials.metal, 'receiver', 0.005);
  receiver.position.z = -0.12;
  root.add(receiver);
  const barrel = cylinder(0.025, 0.028, 0.52, materials.metal, 'barrel', 14);
  barrel.position.set(0, 0.02, -0.63);
  root.add(barrel);
  const stock = mesh(
    createTaperedPrism(0.29, 0.14, 0.1, 0.105),
    materials.wood,
    'wood-stock',
  );
  stock.position.set(0, -0.015, 0.315);
  stock.rotation.x = -0.13;
  root.add(stock);
  const stockPad = box(
    0.115,
    0.14,
    0.025,
    materials.polymer,
    'stock-pad',
    0.012,
  );
  stockPad.position.set(0, -0.032, 0.46);
  stockPad.rotation.x = -0.13;
  root.add(stockPad);
  const grip = mesh(
    createTaperedGrip(0.1, 0.25, 0.095, 0.135),
    materials.wood,
    'grip',
  );
  grip.position.set(0, -0.155, 0.08);
  grip.rotation.x = -0.22;
  root.add(grip);
  const magazineShape = new THREE.Shape();
  magazineShape.moveTo(-0.07, 0.13);
  magazineShape.lineTo(0.07, 0.13);
  magazineShape.quadraticCurveTo(0.065, -0.09, 0.2, -0.27);
  magazineShape.lineTo(0.095, -0.325);
  magazineShape.quadraticCurveTo(-0.04, -0.14, -0.07, 0.13);
  magazineShape.closePath();
  const magazine = mesh(
    new THREE.ExtrudeGeometry(magazineShape, {
      depth: 0.095,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.007,
      bevelThickness: 0.007,
      curveSegments: 5,
    }),
    materials.metal,
    'curved-magazine',
  );
  magazine.position.set(-0.0475, -0.1, -0.25);
  magazine.rotation.y = Math.PI / 2;
  root.add(magazine);
  const handguard = box(
    0.15,
    0.12,
    0.34,
    materials.wood,
    'wood-handguard',
    0.025,
  );
  handguard.position.set(0, -0.015, -0.42);
  root.add(handguard);
  const gasTube = cylinder(
    0.021,
    0.023,
    0.3,
    materials.wood,
    'upper-wood-handguard',
    10,
  );
  gasTube.position.set(0, 0.09, -0.42);
  root.add(gasTube);
  const dustCover = box(0.12, 0.05, 0.36, materials.metal, 'dust-cover', 0.019);
  dustCover.position.set(0, 0.061, -0.05);
  root.add(dustCover);
  const ejectionPlate = detailBox(
    0.012,
    0.067,
    0.17,
    materials.accent,
    'ejection-plate',
  );
  ejectionPlate.position.set(-0.066, 0.012, -0.1);
  root.add(ejectionPlate);
  addReceiverSeams(root, materials, 0.06, -0.047, -0.1, 0.26);
  for (const side of [-1, 1])
    for (const offset of [-0.04, 0, 0.04]) {
      const ribCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 0.055, -0.11, -0.25 + offset),
        new THREE.Vector3(side * 0.055, -0.28, -0.29 + offset),
        new THREE.Vector3(side * 0.055, -0.39, -0.405 + offset),
      );
      root.add(
        mesh(
          new THREE.TubeGeometry(ribCurve, 5, 0.003, 4, false),
          materials.metal,
          'magazine-rib',
        ),
      );
    }
  const frontSight = detailBox(
    0.024,
    0.055,
    0.026,
    materials.metal,
    'front-sight',
  );
  frontSight.position.set(0, 0.105, -0.76);
  root.add(frontSight);
  for (const side of [-1, 1]) {
    const ear = detailBox(
      0.012,
      0.06,
      0.024,
      materials.metal,
      'front-sight-ear',
    );
    ear.position.set(side * 0.03, 0.09, -0.76);
    ear.rotation.z = side * 0.2;
    root.add(ear);
  }
  const sightBase = detailBox(0.073, 0.025, 0.07, materials.metal, 'gas-block');
  sightBase.position.set(0, 0.05, -0.74);
  root.add(sightBase);
  const rearSight = detailBox(
    0.07,
    0.035,
    0.09,
    materials.metal,
    'rear-sight-leaf',
  );
  rearSight.position.set(0, 0.105, -0.31);
  root.add(rearSight);
  const muzzleBrake = cylinder(
    0.038,
    0.038,
    0.09,
    materials.metal,
    'muzzle-brake',
    14,
  );
  muzzleBrake.position.set(0, 0.02, -0.895);
  root.add(muzzleBrake);
  addMuzzleBore(root, materials, -0.94, 0.01, 0.036);
  return {
    muzzle: addMuzzle(root, 'rifle', [0, 0.01, -0.94], createMuzzleFlash),
    ejectionAnchor: addEjectionAnchor(root, [-0.075, 0.045, -0.1], true),
    actionParts: {},
  };
}

function buildCarbine(
  root: THREE.Group,
  materials: PrimaryWeaponMaterials,
  createMuzzleFlash?: (kind: PrimaryWeaponKind) => THREE.PointLight,
) {
  const receiver = box(0.118, 0.095, 0.46, materials.metal, 'receiver', 0.007);
  receiver.position.set(0, 0.023, -0.08);
  root.add(receiver);
  const lowerReceiver = box(
    0.104,
    0.075,
    0.29,
    materials.metal,
    'receiver',
    0.007,
  );
  lowerReceiver.position.set(0, -0.052, -0.018);
  root.add(lowerReceiver);
  const magazineWell = box(
    0.114,
    0.11,
    0.135,
    materials.metal,
    'magazine-well',
    0.005,
  );
  magazineWell.position.set(0, -0.086, -0.2);
  root.add(magazineWell);
  const guardShape = new THREE.Shape();
  guardShape.moveTo(-0.1, -0.072);
  guardShape.lineTo(0.045, -0.072);
  guardShape.lineTo(0.037, -0.17);
  guardShape.lineTo(-0.079, -0.17);
  guardShape.closePath();
  const guardOpening = new THREE.Path();
  guardOpening.moveTo(-0.082, -0.087);
  guardOpening.lineTo(-0.066, -0.153);
  guardOpening.lineTo(0.023, -0.153);
  guardOpening.lineTo(0.03, -0.087);
  guardOpening.closePath();
  guardShape.holes.push(guardOpening);
  const triggerGuard = mesh(
    new THREE.ExtrudeGeometry(guardShape, {
      depth: 0.037,
      bevelEnabled: false,
    }),
    materials.polymer,
    'trigger-guard',
  );
  triggerGuard.rotation.y = Math.PI / 2;
  triggerGuard.position.set(-0.0185, 0, -0.04);
  root.add(triggerGuard);
  const barrel = cylinder(0.023, 0.026, 0.48, materials.metal, 'barrel', 14);
  barrel.position.set(0, 0.015, -0.65);
  root.add(barrel);
  const bufferTube = cylinder(
    0.026,
    0.026,
    0.21,
    materials.metal,
    'buffer-tube',
    10,
  );
  bufferTube.position.set(0, 0.02, 0.2);
  root.add(bufferTube);
  const stock = mesh(
    createTaperedPrism(0.13, 0.08, 0.055, 0.075),
    materials.polymer,
    'stock',
  );
  stock.position.set(0, -0.022, 0.24);
  root.add(stock);
  const stockPad = box(
    0.075,
    0.085,
    0.023,
    materials.polymer,
    'stock-pad',
    0.006,
  );
  stockPad.position.set(0, -0.027, 0.317);
  root.add(stockPad);
  const grip = mesh(
    createTaperedGrip(0.095, 0.23, 0.09, 0.13),
    materials.polymer,
    'grip',
  );
  grip.position.set(0, -0.15, 0.06);
  grip.rotation.x = -0.18;
  root.add(grip);
  const magazine = box(0.105, 0.245, 0.12, materials.metal, 'magazine', 0.015);
  magazine.position.set(0, -0.14, -0.2);
  magazine.rotation.x = -0.08;
  root.add(magazine);
  addMagazinePanel(root, materials, 0.057, -0.14, -0.2, 0.15, 0.07);
  const handguard = cylinder(
    0.065,
    0.075,
    0.34,
    materials.polymer,
    'handguard',
    12,
  );
  handguard.position.set(0, -0.005, -0.47);
  root.add(handguard);
  for (let ring = 0; ring < 7; ring++) {
    const rib = cylinder(
      0.078 - ring * 0.0014,
      0.078 - ring * 0.0014,
      0.017,
      materials.polymer,
      'handguard-rib',
      12,
    );
    rib.position.set(0, -0.005, -0.33 - ring * 0.045);
    root.add(rib);
  }
  // A hollow carry handle provides the characteristic upper receiver profile.
  const handleShape = new THREE.Shape();
  handleShape.moveTo(-0.2, 0.066);
  handleShape.lineTo(0.12, 0.066);
  handleShape.lineTo(0.09, 0.16);
  handleShape.lineTo(-0.18, 0.16);
  handleShape.closePath();
  const aperture = new THREE.Path();
  aperture.moveTo(-0.16, 0.084);
  aperture.lineTo(-0.16, 0.14);
  aperture.lineTo(0.07, 0.14);
  aperture.lineTo(0.08, 0.084);
  aperture.closePath();
  handleShape.holes.push(aperture);
  const handle = mesh(
    new THREE.ExtrudeGeometry(handleShape, {
      depth: 0.036,
      bevelEnabled: false,
    }),
    materials.metal,
    'carry-handle',
  );
  handle.rotation.y = Math.PI / 2;
  handle.position.set(-0.018, 0, -0.11);
  root.add(handle);
  const ejectionPlate = detailBox(
    0.012,
    0.06,
    0.16,
    materials.accent,
    'ejection-plate',
  );
  ejectionPlate.position.set(0.071, 0.025, -0.13);
  root.add(ejectionPlate);
  addReceiverSeams(root, materials, 0.065, -0.05, -0.14, 0.24);
  const boltCatch = detailBox(
    0.01,
    0.046,
    0.023,
    materials.accent,
    'bolt-catch',
  );
  boltCatch.position.set(-0.071, 0.002, -0.08);
  root.add(boltCatch);
  const selector = detailBox(
    0.012,
    0.015,
    0.038,
    materials.accent,
    'fire-selector',
  );
  selector.position.set(-0.071, -0.028, 0.043);
  selector.rotation.x = -0.25;
  root.add(selector);
  const frontSight = detailBox(
    0.022,
    0.05,
    0.025,
    materials.metal,
    'front-sight',
  );
  frontSight.position.set(0, 0.125, -0.78);
  root.add(frontSight);
  for (const side of [-1, 1]) {
    const support = detailBox(
      0.025,
      0.115,
      0.018,
      materials.metal,
      'triangular-front-sight',
    );
    support.rotation.x = side * 0.4;
    support.position.set(0, 0.069, -0.78 + side * 0.027);
    root.add(support);
  }
  const brake = cylinder(
    0.034,
    0.034,
    0.07,
    materials.metal,
    'muzzle-brake',
    14,
  );
  brake.position.set(0, 0.015, -0.875);
  root.add(brake);
  addMuzzleBore(root, materials, -0.91, 0.015, 0.033);
  return {
    muzzle: addMuzzle(root, 'carbine', [0, 0.015, -0.91], createMuzzleFlash),
    ejectionAnchor: addEjectionAnchor(root, [0.08, 0.045, -0.13]),
    actionParts: {},
  };
}

function buildSmg(
  root: THREE.Group,
  materials: PrimaryWeaponMaterials,
  createMuzzleFlash?: (kind: PrimaryWeaponKind) => THREE.PointLight,
) {
  const receiver = box(0.16, 0.17, 0.52, materials.metal, 'receiver', 0.025);
  receiver.position.z = -0.16;
  root.add(receiver);
  const barrel = cylinder(0.026, 0.026, 0.34, materials.metal, 'barrel', 14);
  barrel.position.z = -0.58;
  root.add(barrel);
  const magazine = box(0.11, 0.27, 0.13, materials.metal, 'magazine', 0.016);
  magazine.position.set(0, -0.18, -0.12);
  magazine.rotation.x = -0.13;
  root.add(magazine);
  addMagazinePanel(root, materials, 0.06, -0.18, -0.12, 0.17, 0.075);
  const stock = mesh(
    createTaperedPrism(0.38, 0.13, 0.08, 0.12),
    materials.polymer,
    'stock',
  );
  stock.position.set(0, 0, 0.27);
  root.add(stock);
  for (const side of [-1, 1] as const) {
    const stockRail = cylinder(
      0.012,
      0.012,
      0.38,
      materials.accent,
      'stock-rail',
      8,
    );
    stockRail.position.set(side * 0.05, 0.045, 0.28);
    root.add(stockRail);
  }
  const grip = mesh(
    createTaperedGrip(0.1, 0.22, 0.09, 0.13),
    materials.polymer,
    'grip',
  );
  grip.position.set(0, -0.145, 0.06);
  grip.rotation.x = -0.18;
  root.add(grip);
  const rail = detailBox(0.08, 0.025, 0.34, materials.accent, 'top-rail');
  rail.position.set(0, 0.105, -0.17);
  root.add(rail);
  const ejectionPlate = detailBox(
    0.012,
    0.065,
    0.14,
    materials.accent,
    'ejection-plate',
  );
  ejectionPlate.position.set(0.086, 0.035, -0.16);
  root.add(ejectionPlate);
  addReceiverSeams(root, materials, 0.08, -0.06, -0.16, 0.22);
  const foregrip = box(0.09, 0.17, 0.1, materials.polymer, 'foregrip', 0.012);
  foregrip.position.set(0, -0.1, -0.42);
  foregrip.rotation.x = -0.08;
  root.add(foregrip);
  const brake = cylinder(
    0.034,
    0.034,
    0.065,
    materials.metal,
    'muzzle-brake',
    14,
  );
  brake.position.set(0, 0.01, -0.75);
  root.add(brake);
  addMuzzleBore(root, materials, -0.78, 0.01, 0.033);
  return {
    muzzle: addMuzzle(root, 'smg', [0, 0.01, -0.78], createMuzzleFlash),
    ejectionAnchor: addEjectionAnchor(root, [0.095, 0.04, -0.16]),
    actionParts: {},
  };
}

function buildShotgun(
  root: THREE.Group,
  materials: PrimaryWeaponMaterials,
  createMuzzleFlash?: (kind: PrimaryWeaponKind) => THREE.PointLight,
) {
  const receiver = box(0.18, 0.18, 0.48, materials.metal, 'receiver', 0.028);
  receiver.position.z = -0.1;
  root.add(receiver);
  const stock = mesh(
    createTaperedPrism(0.48, 0.22, 0.15, 0.18),
    materials.wood,
    'stock',
  );
  stock.position.set(0, -0.015, 0.35);
  root.add(stock);
  const barrel = cylinder(0.032, 0.032, 0.92, materials.metal, 'barrel', 16);
  barrel.position.set(0, 0.055, -0.75);
  root.add(barrel);
  const tube = cylinder(
    0.035,
    0.035,
    0.68,
    materials.accent,
    'magazine-tube',
    14,
  );
  tube.position.set(0, -0.045, -0.62);
  root.add(tube);
  const pumpAssembly = new THREE.Group();
  pumpAssembly.name = 'shotgun-pump-action';
  pumpAssembly.position.set(0, -0.04, -0.56);
  const pump = box(0.2, 0.17, 0.31, materials.wood, 'ribbed-pump', 0.025);
  pumpAssembly.add(pump);
  [-0.1, -0.035, 0.035, 0.1].forEach((offset) => {
    const pumpRib = detailBox(0.205, 0.02, 0.018, materials.metal, 'pump-rib');
    pumpRib.position.set(0, 0.092, offset);
    pumpAssembly.add(pumpRib);
  });
  root.add(pumpAssembly);
  const shotgunPump = actionPart(pumpAssembly);
  const bead = mesh(
    new THREE.SphereGeometry(0.016, 7, 5),
    materials.accent,
    'front-bead',
  );
  bead.position.set(0, 0.087, -1.17);
  root.add(bead);
  const receiverSeam = detailBox(
    0.185,
    0.012,
    0.24,
    materials.accent,
    'receiver-top-seam',
  );
  receiverSeam.position.set(0, 0.095, -0.09);
  root.add(receiverSeam);
  addReceiverSeams(root, materials, 0.09, -0.06, -0.1, 0.2);
  addMuzzleBore(root, materials, -1.22, 0.055, 0.032);
  return {
    muzzle: addMuzzle(root, 'shotgun', [0, 0.055, -1.22], createMuzzleFlash),
    actionParts: { shotgunPump },
  };
}

function buildSniper(
  root: THREE.Group,
  materials: PrimaryWeaponMaterials,
  createMuzzleFlash?: (kind: PrimaryWeaponKind) => THREE.PointLight,
) {
  const receiver = box(0.17, 0.18, 0.7, materials.metal, 'receiver', 0.028);
  receiver.position.z = -0.16;
  root.add(receiver);
  const stock = mesh(
    createTaperedPrism(0.58, 0.24, 0.16, 0.18),
    materials.wood,
    'stock',
  );
  stock.position.set(0, -0.015, 0.46);
  stock.rotation.x = -0.08;
  root.add(stock);
  const grip = mesh(
    createTaperedGrip(0.12, 0.25, 0.105, 0.155),
    materials.polymer,
    'grip',
  );
  grip.position.set(0, -0.165, 0.06);
  grip.rotation.x = -0.18;
  root.add(grip);
  const magazine = box(0.13, 0.2, 0.15, materials.metal, 'magazine', 0.02);
  magazine.position.set(0, -0.15, -0.19);
  magazine.rotation.x = -0.12;
  root.add(magazine);
  addMagazinePanel(root, materials, 0.07, -0.15, -0.19, 0.12, 0.09);
  const barrel = cylinder(0.027, 0.034, 1.2, materials.metal, 'barrel', 16);
  barrel.position.set(0, 0.035, -1.08);
  root.add(barrel);
  const muzzleBrake = cylinder(
    0.048,
    0.043,
    0.16,
    materials.accent,
    'muzzle-brake',
    16,
  );
  muzzleBrake.position.set(0, 0.035, -1.75);
  root.add(muzzleBrake);
  addMuzzleBore(root, materials, -1.86, 0.035, 0.044);
  const scopeTube = cylinder(
    0.058,
    0.058,
    0.5,
    materials.metal,
    'scope-tube',
    18,
  );
  scopeTube.position.set(0, 0.19, -0.2);
  root.add(scopeTube);
  [-0.46, 0.06].forEach((z, index) => {
    const scopeBell = cylinder(
      index === 0 ? 0.078 : 0.068,
      0.06,
      0.09,
      materials.metal,
      'scope-bell',
      18,
    );
    scopeBell.position.set(0, 0.19, z);
    root.add(scopeBell);
  });
  for (const z of [-0.36, -0.06]) {
    const scopeMount = detailBox(
      0.08,
      0.1,
      0.035,
      materials.accent,
      'scope-mount',
    );
    scopeMount.position.set(0, 0.115, z);
    root.add(scopeMount);
  }
  const scopeLens = mesh(
    new THREE.CircleGeometry(0.064, 20),
    materials.accent,
    'scope-lens',
  );
  scopeLens.position.set(0, 0.19, -0.508);
  root.add(scopeLens);
  const boltHandle = mesh(
    new THREE.CapsuleGeometry(0.017, 0.11, 3, 8),
    materials.accent,
    'bolt-handle',
  );
  boltHandle.rotation.z = Math.PI / 2;
  boltHandle.position.set(-0.12, 0.04, -0.02);
  root.add(boltHandle);
  const sniperBolt = actionPart(boltHandle);
  addReceiverSeams(root, materials, 0.085, -0.06, -0.15, 0.28);
  return {
    muzzle: addMuzzle(root, 'sniper', [0, 0.035, -1.86], createMuzzleFlash),
    actionParts: { sniperBolt },
  };
}

function consolidateWeaponMeshes(
  root: THREE.Group,
  kind: PrimaryWeaponKind,
  includeActionParts = false,
) {
  root.updateMatrixWorld(true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<
    THREE.Material,
    Array<{ geometry: THREE.BufferGeometry; name: string }>
  >();
  const sourceMeshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    let ancestor: THREE.Object3D | null = object;
    let belongsToActionPart = false;
    while (ancestor) {
      if (ancestor.userData.primaryWeaponActionPart) {
        belongsToActionPart = true;
        break;
      }
      if (ancestor === root) break;
      ancestor = ancestor.parent;
    }
    if (
      !(object instanceof THREE.Mesh) ||
      !object.userData.primaryWeaponGeometry ||
      (!includeActionParts && belongsToActionPart)
    )
      return;
    sourceMeshes.push(object);
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
    if (!merged) throw new Error(`Unable to consolidate ${kind} geometry.`);
    merged.userData.primaryWeaponPartRanges = ranges;
    const value = new THREE.Mesh(merged, material);
    value.name = `primary-weapon-material-${materialIndex}`;
    value.userData.primaryWeaponGeometry = true;
    value.castShadow = true;
    value.receiveShadow = true;
    root.add(value);
    materialIndex += 1;
  });
}

function geometryTriangles(geometry: THREE.BufferGeometry) {
  const count =
    geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  return Math.floor(count / 3);
}

export function inspectPrimaryWeaponBudget(
  root: THREE.Object3D,
  kind: PrimaryWeaponKind,
) {
  let triangles = 0;
  let weaponDraws = 0;
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !object.userData.primaryWeaponGeometry
    )
      return;
    triangles += geometryTriangles(object.geometry);
    weaponDraws += Array.isArray(object.material) ? object.material.length : 1;
    (Array.isArray(object.material)
      ? object.material
      : [object.material]
    ).forEach((material) => materials.add(material));
  });
  const triangleBudget = PRIMARY_TRIANGLE_BUDGET[kind];
  const drawBudget = PRIMARY_WEAPON_DRAW_CALL_BUDGETS[kind];
  return {
    triangles,
    weaponDraws,
    materials: materials.size,
    triangleBudget,
    drawBudget,
    withinBudget: triangles <= triangleBudget && weaponDraws <= drawBudget,
  } as const;
}

function createPrimaryGeometryModel(
  kind: PrimaryWeaponKind,
  options: PrimaryModelOptions,
): PrimaryFirstPersonModel {
  const root = new THREE.Group();
  root.name = `${kind}-first-person`;
  let built: Pick<
    PrimaryFirstPersonModel,
    'muzzle' | 'ejectionAnchor' | 'actionParts'
  >;
  switch (kind) {
    case 'rifle':
      built = buildRifle(root, options.materials, options.createMuzzleFlash);
      break;
    case 'carbine':
      built = buildCarbine(root, options.materials, options.createMuzzleFlash);
      break;
    case 'smg':
      built = buildSmg(root, options.materials, options.createMuzzleFlash);
      break;
    case 'shotgun':
      built = buildShotgun(root, options.materials, options.createMuzzleFlash);
      break;
    case 'sniper':
      built = buildSniper(root, options.materials, options.createMuzzleFlash);
      break;
  }
  if (built.actionParts.shotgunPump?.object instanceof THREE.Group) {
    consolidateWeaponMeshes(built.actionParts.shotgunPump.object, kind, true);
  }
  consolidateWeaponMeshes(root, kind);
  return { root, ...built };
}

export function createPrimaryFirstPersonModel(
  kind: Exclude<PrimaryWeaponKind, 'rifle' | 'carbine'>,
  options: PrimaryModelOptions,
): PrimaryFirstPersonModel {
  const model = createPrimaryGeometryModel(kind, options);
  const { root } = model;
  options.attachViewmodelArms?.(root, kind);
  const mount = PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS[kind];
  root.position.set(...mount.position);
  root.rotation.set(...mount.rotation);
  root.scale.setScalar(mount.scale);
  root.visible = false;
  return model;
}

/** World and foreground weapons share one silhouette; only presentation differs. */
export function createPrimaryWorldModel(
  kind: PrimaryWeaponKind,
  materials: PrimaryWeaponMaterials,
): THREE.Group {
  const model = createPrimaryGeometryModel(kind, { materials });
  model.root.name = `${kind}-world-surface`;
  model.root.scale.set(1.3, 1.1, 1.1);
  const root = new THREE.Group();
  root.add(model.root);
  if (kind === 'carbine')
    root.userData.silencerSocket = model.muzzle.position
      .clone()
      .multiply(model.root.scale);
  model.muzzle.removeFromParent();
  return root;
}
