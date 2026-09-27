import * as THREE from 'three';
import {
  createWeaponMetalDiffusePixelData,
  createWeaponMetalReliefPixelData,
  createWeaponMetalRoughnessPixelData,
  WEAPON_SURFACE_MATERIAL_PROFILES,
  WEAPON_SURFACE_SEED,
  WEAPON_SURFACE_TEXTURE_SIZE,
  type WeaponSurfaceRole,
} from './weapon-surface-profile.ts';

export type WeaponSurfaceFinish = Readonly<{
  textures: Readonly<{
    diffuse: THREE.DataTexture;
    normal: THREE.DataTexture;
    roughness: THREE.DataTexture;
  }>;
  materials: Readonly<Record<WeaponSurfaceRole, THREE.MeshStandardMaterial>>;
  dispose: () => void;
}>;

function createTexture(
  pixels: Uint8ClampedArray,
  colorSpace: THREE.ColorSpace,
  anisotropy: number,
) {
  const texture = new THREE.DataTexture(
    pixels,
    WEAPON_SURFACE_TEXTURE_SIZE,
    WEAPON_SURFACE_TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Number.isFinite(anisotropy)
    ? Math.max(1, Math.min(8, Math.floor(anisotropy)))
    : 1;
  texture.needsUpdate = true;
  return texture;
}

/** Creates one shared three-map finish for every first-person firearm. */
export function createWeaponSurfaceFinish(
  maximumAnisotropy = 1,
): WeaponSurfaceFinish {
  const diffusePixels = createWeaponMetalDiffusePixelData(
    WEAPON_SURFACE_SEED,
    WEAPON_SURFACE_TEXTURE_SIZE,
    WEAPON_SURFACE_TEXTURE_SIZE,
  );
  const textures = Object.freeze({
    diffuse: createTexture(
      diffusePixels,
      THREE.SRGBColorSpace,
      maximumAnisotropy,
    ),
    normal: createTexture(
      createWeaponMetalReliefPixelData(
        diffusePixels,
        WEAPON_SURFACE_TEXTURE_SIZE,
        WEAPON_SURFACE_TEXTURE_SIZE,
      ),
      THREE.NoColorSpace,
      maximumAnisotropy,
    ),
    roughness: createTexture(
      createWeaponMetalRoughnessPixelData(
        diffusePixels,
        WEAPON_SURFACE_TEXTURE_SIZE,
        WEAPON_SURFACE_TEXTURE_SIZE,
      ),
      THREE.NoColorSpace,
      maximumAnisotropy,
    ),
  });
  const material = (role: WeaponSurfaceRole) => {
    const profile = WEAPON_SURFACE_MATERIAL_PROFILES[role];
    const value = new THREE.MeshStandardMaterial({
      map: textures.diffuse,
      normalMap: textures.normal,
      normalScale: new THREE.Vector2(profile.normalScale, profile.normalScale),
      roughnessMap: textures.roughness,
      color: profile.color,
      roughness: profile.roughness,
      metalness: profile.metalness,
    });
    value.name = `first-person-weapon-${role}`;
    return value;
  };
  const materials = Object.freeze({
    metal: material('metal'),
    polymer: material('polymer'),
    accent: material('accent'),
  });
  let disposed = false;
  return Object.freeze({
    textures,
    materials,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      Object.values(materials).forEach((value) => value.dispose());
      Object.values(textures).forEach((value) => value.dispose());
    },
  });
}

/** Continuous walnut grain for gun furniture; it has no board or crate seams. */
export function createWeaponWoodTexture(): THREE.DataTexture {
  const size = WEAPON_SURFACE_TEXTURE_SIZE;
  const pixels = new Uint8ClampedArray(size * size * 4);
  let seed = 10427;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = Math.sin(
        y * 0.39 + Math.sin(x * 0.025) * 2.2 + Math.sin(y * 0.053),
      );
      const broad = Math.sin(y * 0.045 + Math.sin(x * 0.012)) * 12;
      const noise = (seed / 0xffffffff - 0.5) * 8;
      const shade = grain * 8 + broad + noise;
      const offset = (y * size + x) * 4;
      pixels[offset] = 119 + shade;
      pixels[offset + 1] = 62 + shade * 0.6;
      pixels[offset + 2] = 30 + shade * 0.35;
      pixels[offset + 3] = 255;
    }
  const texture = createTexture(pixels, THREE.SRGBColorSpace, 4);
  texture.name = 'original-walnut-gun-furniture';
  return texture;
}
