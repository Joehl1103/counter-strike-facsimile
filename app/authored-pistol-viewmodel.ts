import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createAuthoredCarbineViewmodel,
  createAuthoredViewmodelTemplate,
  type AuthoredViewmodelTemplate,
} from './authored-carbine-viewmodel.ts';
import type { SecondaryFirstPersonModel } from './secondary-weapon-models.ts';

export const AUTHORED_PISTOL_ASSET_URL = '/assets/viewmodels/glock18.glb';

/**
 * The Glock has the same Kuptchi rig/clip and socket contract as the M4.
 * Keep the clone, deterministic mixer, metre-sized flash mount, and disposal
 * implementation in one place; this file only selects and labels the pistol.
 */
export function createAuthoredPistolViewmodelTemplate(gltf: GLTF): AuthoredViewmodelTemplate {
  let armMeshes = 0;
  let weaponMeshes = 0;
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    // GLTFLoader splits a multi-material mesh into leaves beneath the source
    // node. The source's role metadata remains on that common parent.
    let isArm = false;
    let isWeapon = false;
    for (let sourceNode: THREE.Object3D | null = object; sourceNode; sourceNode = sourceNode.parent) {
      isArm ||= sourceNode.userData.viewmodelArm === true;
      isWeapon ||= sourceNode.userData.secondaryWeaponGeometry === true;
      if (sourceNode === gltf.scene) break;
    }
    if (isArm === isWeapon)
      throw new Error('Each authored pistol mesh must identify exactly one arm or weapon role.');
    object.userData.viewmodelArm = isArm;
    object.userData.secondaryWeaponGeometry = isWeapon;
    if (isArm) armMeshes += 1;
    if (isWeapon) weaponMeshes += 1;
  });
  if (!armMeshes || !weaponMeshes)
    throw new Error('The authored pistol requires both tagged arms and weapon geometry.');
  return createAuthoredViewmodelTemplate(gltf);
}

let templatePromise: Promise<AuthoredViewmodelTemplate> | undefined;
export function preloadAuthoredPistol(): Promise<AuthoredViewmodelTemplate> {
  templatePromise ??= new GLTFLoader().loadAsync(AUTHORED_PISTOL_ASSET_URL)
    .then(createAuthoredPistolViewmodelTemplate)
    .catch((error: unknown) => {
      templatePromise = undefined;
      throw error;
    });
  return templatePromise;
}

export function createAuthoredPistolViewmodel(
  template: AuthoredViewmodelTemplate,
  muzzle: THREE.PointLight,
): SecondaryFirstPersonModel {
  const authored = createAuthoredCarbineViewmodel(template, muzzle);
  authored.root.name = 'glock18-viewmodel';
  // Turn the complete matched grip toward the reference's diagonal silhouette.
  // Translation retains room around the crosshair without moving either hand.
  authored.root.rotation.set(0.12, 0.28, 0);
  authored.root.position.set(0.15, -0.02, 0.045);
  authored.root.updateMatrixWorld(true);
  return {
    root: authored.root,
    muzzle: authored.muzzle,
    muzzles: [authored.muzzle],
    ejectionAnchors: authored.ejectionAnchor ? [authored.ejectionAnchor] : [],
    actionParts: { magazines: [] },
    authoredAnimation: authored.authoredAnimation,
  };
}
