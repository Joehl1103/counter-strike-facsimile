import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS, type PrimaryFirstPersonModel } from './primary-weapon-models.ts';

export const AUTHORED_RIFLE_ASSET_URL = '/assets/viewmodels/ak47.glb';
let templatePromise: Promise<THREE.Group> | undefined;

/** The cached source is immutable; each renderer owns its meshes and materials. */
export function preloadAuthoredRifle() {
  templatePromise ??= new GLTFLoader().loadAsync(AUTHORED_RIFLE_ASSET_URL)
    .then((gltf) => gltf.scene)
    .catch((error: unknown) => {
      templatePromise = undefined;
      throw error;
    });
  return templatePromise;
}

export function createAuthoredRifleViewmodel(
  template: THREE.Group,
  muzzle: THREE.PointLight,
): PrimaryFirstPersonModel {
  const root = template.clone(true);
  root.name = 'rifle-viewmodel';
  const ownedMaterials = new Map<THREE.Material, THREE.Material>();
  root.traverse((object) => {
    // glTF splits a multi-material mesh into a group of draw primitives.
    // Carry the authored category onto each descendant used by game checks.
    for (const category of ['primaryWeaponGeometry', 'viewmodelArm']) {
      if (object.parent?.userData[category] === true) object.userData[category] = true;
    }
    object.userData.visualOnly = true;
    object.raycast = () => undefined;
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry = object.geometry.clone();
    const cloneMaterial = (source: THREE.Material) => {
      let owned = ownedMaterials.get(source);
      if (!owned) {
        owned = source.clone();
        if (owned instanceof THREE.MeshStandardMaterial && owned.map) {
          owned.map = owned.map.clone();
          owned.map.anisotropy = 4;
        }
        ownedMaterials.set(source, owned);
      }
      return owned;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
  });
  muzzle.name = 'muzzle-flash';
  muzzle.userData.transient = true;
  root.updateMatrixWorld(true);
  const sourceMuzzle = root.getObjectByName('muzzle-socket');
  const ejectionAnchor = root.getObjectByName('ejection-socket');
  if (!sourceMuzzle || !ejectionAnchor) throw new Error('The rifle asset requires muzzle and ejection sockets.');
  muzzle.position.copy(root.worldToLocal(sourceMuzzle.getWorldPosition(new THREE.Vector3())));
  root.add(muzzle);
  const mount = PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS.rifle;
  root.position.set(...mount.position);
  root.rotation.set(...mount.rotation);
  root.scale.setScalar(mount.scale);
  root.visible = false;
  return { root, muzzle, ejectionAnchor, actionParts: {} };
}
