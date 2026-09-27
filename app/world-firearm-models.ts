import * as THREE from 'three';
import { FIREARMS, isSecondaryWeaponKind } from './game-rules.ts';
import {
  createPrimaryWorldModel,
  type PrimaryWeaponMaterials,
} from './primary-weapon-models.ts';
import { createSecondaryWorldModel } from './secondary-weapon-models.ts';
import { batchPrimaryWorldFirearmVisuals } from './world-firearm-batching.ts';
import type { FirearmKind, SecondaryWeaponKind } from './game-rules.ts';
import type { CombatVisualWeaponProfile } from './combat-visual-effects.ts';

export type WorldFirearmMaterials = Readonly<{
  polymer: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
}>;

export type WorldFirearmModelOptions = Readonly<{
  materials: WorldFirearmMaterials;
  createSecondaryMuzzleFlash: (
    kind: SecondaryWeaponKind,
  ) => THREE.PointLight;
}>;

/** Keep the rendered light and sprite child identical in browser and CPU fixtures. */
export function createWorldFirearmMuzzleFlash(
  color: number,
  profile: CombatVisualWeaponProfile,
  texture: THREE.Texture | null,
): THREE.PointLight {
  const light = new THREE.PointLight(
    color,
    profile.muzzleIntensityMin,
    profile.muzzleRadius,
    2,
  );
  light.userData.transient = true;
  light.userData.muzzleIntensityMin = profile.muzzleIntensityMin;
  light.userData.muzzleIntensityMax = profile.muzzleIntensityMax;
  light.userData.muzzleSpriteScale = profile.muzzleSpriteScale;

  const flareMaterial = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const flare = new THREE.Sprite(flareMaterial);
  flare.scale.setScalar(profile.muzzleSpriteScale);
  flare.renderOrder = 8;
  flare.onBeforeRender = () => {
    const intensityMin = light.userData.muzzleIntensityMin as number;
    const intensityMax = light.userData.muzzleIntensityMax as number;
    const spriteScale = light.userData.muzzleSpriteScale as number;
    const intensityRange = intensityMax - intensityMin;
    const strength = THREE.MathUtils.clamp(
      (light.intensity - intensityMin) / intensityRange,
      0,
      1,
    );
    flareMaterial.opacity = strength;
    flare.scale.setScalar(spriteScale * (0.78 + strength * 0.42));
  };
  light.add(flare);
  return light;
}

/** Build the shared rendered model used by enemy weapons and dropped pickups. */
export function createWorldFirearmModel(
  kind: FirearmKind,
  options: WorldFirearmModelOptions,
): THREE.Group {
  const root = new THREE.Group();
  const definition = FIREARMS[kind];

  if (isSecondaryWeaponKind(kind)) {
    const model = createSecondaryWorldModel(kind, {
      createMuzzleFlash: options.createSecondaryMuzzleFlash,
    });
    const modelMaterials = new Set<THREE.MeshStandardMaterial>();

    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          modelMaterials.add(material);
        }
      }
    });

    for (const material of modelMaterials) {
      const originalColor = material.color.getHex();
      let worldMaterial = options.materials.metal;
      if (originalColor === 0x4d5554) {
        worldMaterial = options.materials.polymer;
      } else if (originalColor === 0xa9b0ae) {
        worldMaterial = options.materials.accent;
      }

      material.copy(worldMaterial);
      material.name = `${worldMaterial.name}-${kind}`;
    }

    root.add(model);
    root.name = `${definition.label} world firearm`;
    root.rotation.set(0.18, 0, Math.PI / 2);
    root.scale.setScalar(0.76);
    setWorldFirearmShadowFlags(root);
    return root;
  }

  const metalMaterial = options.materials.metal.clone();
  const primaryMaterials: PrimaryWeaponMaterials = {
    metal: metalMaterial,
    wood: options.materials.wood.clone(),
    polymer: options.materials.polymer.clone(),
    accent:
      kind === 'sniper'
        ? options.materials.accent.clone()
        : metalMaterial,
  };
  root.add(createPrimaryWorldModel(kind, primaryMaterials));

  if (kind === 'carbine') {
    root.userData.silencerSocket = root.children[0].userData.silencerSocket;
  }

  root.name = `${definition.label} world firearm`;
  root.rotation.set(0.18, 0, Math.PI / 2);
  root.scale.setScalar(0.72);
  setWorldFirearmShadowFlags(root);
  batchPrimaryWorldFirearmVisuals(root, kind);
  return root;
}

function setWorldFirearmShadowFlags(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.castShadow = true;
    object.receiveShadow = true;
  });
}
