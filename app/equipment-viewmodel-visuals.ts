import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const EQUIPMENT_VIEWMODEL_KINDS = [
  'knife',
  'grenade',
  'smoke',
  'flash',
  'bomb',
] as const;

export type EquipmentViewmodelKind = (typeof EQUIPMENT_VIEWMODEL_KINDS)[number];

export type EquipmentViewmodelMount = Readonly<{
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  scale: number;
}>;

/**
 * Camera-local presentation mounts. Thrown items sit farther from the camera
 * than firearms so the canister, pin, hand, and wrist remain readable together.
 * The knife's positive yaw exposes the blade side between the crosshair and the
 * lower-right grip instead of looking straight down its spine.
 */
export const EQUIPMENT_VIEWMODEL_MOUNTS: Readonly<
  Record<EquipmentViewmodelKind, EquipmentViewmodelMount>
> = {
  knife: {
    position: [0.18, -0.13, -0.9],
    rotation: [-0.08, 0.72, 0.3],
    scale: 0.9,
  },
  grenade: {
    position: [0.28, -0.07, -0.82],
    rotation: [-0.1, 0.22, 0.08],
    scale: 0.8,
  },
  smoke: {
    position: [0.28, -0.06, -0.84],
    rotation: [-0.1, 0.22, 0.08],
    scale: 0.8,
  },
  flash: {
    position: [0.28, -0.06, -0.84],
    rotation: [-0.1, 0.22, 0.08],
    scale: 0.8,
  },
  bomb: {
    position: [0.02, -0.02, -0.86],
    rotation: [-0.32, 0, 0],
    scale: 0.9,
  },
};

export type EquipmentViewmodelPartName =
  | 'blade'
  | 'handle'
  | 'body'
  | 'pin'
  | 'display';

export type EquipmentViewmodelModel = Readonly<{
  root: THREE.Group;
  parts: Readonly<Partial<Record<EquipmentViewmodelPartName, THREE.Object3D>>>;
}>;

type EquipmentViewmodelDependencies = Readonly<{
  knifeGripMaterial: THREE.Material;
  throwableBodyMaterials: Readonly<
    Record<'grenade' | 'smoke' | 'flash', THREE.Material>
  >;
  attachViewmodelArms: (
    kind: EquipmentViewmodelKind,
    root: THREE.Group,
  ) => void;
}>;

function namePart<T extends THREE.Object3D>(
  kind: EquipmentViewmodelKind,
  part: EquipmentViewmodelPartName,
  object: T,
) {
  object.name = `viewmodel-${kind}-${part}`;
  return object;
}

function applyMount(kind: EquipmentViewmodelKind, root: THREE.Group) {
  const mount = EQUIPMENT_VIEWMODEL_MOUNTS[kind];
  root.position.set(...mount.position);
  root.rotation.set(...mount.rotation);
  root.scale.setScalar(mount.scale);
  root.name = `viewmodel-${kind}`;
}

function createKnifeModel(
  dependencies: EquipmentViewmodelDependencies,
): EquipmentViewmodelModel {
  const root = new THREE.Group();
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.035, -0.29);
  bladeShape.lineTo(0.035, -0.29);
  bladeShape.lineTo(0.03, 0.19);
  bladeShape.lineTo(0, 0.33);
  bladeShape.lineTo(-0.03, 0.19);
  bladeShape.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.006,
    bevelThickness: 0.006,
  });
  bladeGeometry.center();
  bladeGeometry.rotateX(Math.PI / 2);
  const blade = namePart(
    'knife',
    'blade',
    new THREE.Mesh(
      bladeGeometry,
      new THREE.MeshStandardMaterial({
        color: 0xb6b9b1,
        roughness: 0.32,
        metalness: 0.8,
      }),
    ),
  );
  blade.rotation.y = -0.15;
  root.add(blade);
  const handle = namePart(
    'knife',
    'handle',
    new THREE.Mesh(
      new RoundedBoxGeometry(0.09, 0.08, 0.25, 3, 0.025),
      dependencies.knifeGripMaterial,
    ),
  );
  handle.position.z = 0.38;
  root.add(handle);
  dependencies.attachViewmodelArms('knife', root);
  applyMount('knife', root);
  return { root, parts: { blade, handle } };
}

function createGrenadeModel(
  dependencies: EquipmentViewmodelDependencies,
): EquipmentViewmodelModel {
  const root = new THREE.Group();
  const body = namePart(
    'grenade',
    'body',
    new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 12),
      dependencies.throwableBodyMaterials.grenade,
    ),
  );
  body.scale.y = 1.25;
  root.add(body);
  const band = new THREE.Mesh(
    new RoundedBoxGeometry(0.04, 0.27, 0.18, 2, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0x222722,
      roughness: 0.72,
      metalness: 0.32,
    }),
  );
  band.position.x = 0.09;
  root.add(band);
  const pin = namePart(
    'grenade',
    'pin',
    new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.01, 6, 12),
      new THREE.MeshStandardMaterial({
        color: 0x9c9b87,
        roughness: 0.42,
        metalness: 0.72,
      }),
    ),
  );
  pin.position.set(0.1, 0.17, 0);
  pin.rotation.y = Math.PI / 2;
  root.add(pin);
  dependencies.attachViewmodelArms('grenade', root);
  applyMount('grenade', root);
  return { root, parts: { body, pin } };
}

function createCanisterModel(
  kind: 'smoke' | 'flash',
  dependencies: EquipmentViewmodelDependencies,
): EquipmentViewmodelModel {
  const root = new THREE.Group();
  const isSmoke = kind === 'smoke';
  const body = namePart(
    kind,
    'body',
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.105,
        isSmoke ? 0.12 : 0.115,
        isSmoke ? 0.3 : 0.28,
        18,
      ),
      dependencies.throwableBodyMaterials[kind],
    ),
  );
  root.add(body);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(isSmoke ? 0.112 : 0.111, 0.018, 6, 12),
    new THREE.MeshStandardMaterial({
      color: isSmoke ? 0xc56a32 : 0x4a6f89,
      roughness: isSmoke ? 0.7 : 0.68,
      metalness: isSmoke ? 0.12 : 0.15,
    }),
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = isSmoke ? -0.03 : -0.035;
  root.add(band);
  const lever = new THREE.Mesh(
    new RoundedBoxGeometry(0.055, 0.2, 0.13, 2, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0x343936,
      roughness: 0.68,
      metalness: 0.35,
    }),
  );
  lever.position.set(0.07, 0.13, 0);
  root.add(lever);
  const pin = namePart(
    kind,
    'pin',
    new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.009, 6, 12),
      new THREE.MeshStandardMaterial({
        color: 0xa9aa9d,
        roughness: 0.4,
        metalness: 0.74,
      }),
    ),
  );
  pin.position.set(0.1, 0.2, 0);
  pin.rotation.y = Math.PI / 2;
  root.add(pin);
  dependencies.attachViewmodelArms(kind, root);
  applyMount(kind, root);
  return { root, parts: { body, pin } };
}

function createBombModel(
  dependencies: EquipmentViewmodelDependencies,
): EquipmentViewmodelModel {
  const root = new THREE.Group();
  const body = namePart(
    'bomb',
    'body',
    new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.16, 0.34, 4, 0.045),
      new THREE.MeshStandardMaterial({
        color: 0x252923,
        roughness: 0.72,
        metalness: 0.24,
      }),
    ),
  );
  root.add(body);
  const display = namePart(
    'bomb',
    'display',
    new THREE.Mesh(
      new RoundedBoxGeometry(0.2, 0.025, 0.1, 2, 0.008),
      new THREE.MeshStandardMaterial({
        color: 0x6f160f,
        emissive: 0xf2462f,
        emissiveIntensity: 0.85,
        roughness: 0.35,
      }),
    ),
  );
  // Keep the established body/grip silhouette and expose the controls on its
  // player-facing surface. Tilting the whole device also tilts both forearms.
  display.rotation.x = Math.PI / 2;
  display.position.set(-0.105, 0.01, 0.184);
  root.add(display);
  const keyMaterial = new THREE.MeshStandardMaterial({
    color: 0x777b70,
    roughness: 0.62,
    metalness: 0.28,
  });
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const key = new THREE.Mesh(
        new RoundedBoxGeometry(0.035, 0.018, 0.035, 2, 0.006),
        keyMaterial,
      );
      key.rotation.x = Math.PI / 2;
      key.position.set(0.055 + column * 0.05, 0.048 - row * 0.032, 0.184);
      root.add(key);
    }
  }
  const wire = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.01, 7, 20, Math.PI * 1.45),
    new THREE.MeshStandardMaterial({
      color: 0xbb3b28,
      roughness: 0.58,
      metalness: 0.14,
    }),
  );
  wire.position.set(-0.12, 0.06, 0.1);
  wire.rotation.x = -Math.PI / 2;
  root.add(wire);
  dependencies.attachViewmodelArms('bomb', root);
  applyMount('bomb', root);
  return { root, parts: { body, display } };
}

export function createEquipmentFirstPersonModels(
  dependencies: EquipmentViewmodelDependencies,
): Readonly<Record<EquipmentViewmodelKind, EquipmentViewmodelModel>> {
  return {
    knife: createKnifeModel(dependencies),
    grenade: createGrenadeModel(dependencies),
    smoke: createCanisterModel('smoke', dependencies),
    flash: createCanisterModel('flash', dependencies),
    bomb: createBombModel(dependencies),
  };
}
