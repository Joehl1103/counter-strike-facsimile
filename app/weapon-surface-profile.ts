import {
  CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  createClassicReliefPixelData,
} from './classic-surface-profile.ts';

export const WEAPON_SURFACE_TEXTURE_SIZE = CLASSIC_SURFACE_TEXTURE_MAX_SIZE;
export const WEAPON_SURFACE_SEED = 9013;

export type WeaponSurfaceRole = 'metal' | 'polymer' | 'accent';

export type WeaponSurfaceMaterialProfile = Readonly<{
  color: number;
  roughness: number;
  metalness: number;
  normalScale: number;
}>;

/**
 * Multipliers for one shared weapon texture set. The texture supplies a
 * readable mid-gray steel value; these profiles separate receiver, polymer,
 * and machined detail without increasing texture count per weapon.
 */
export const WEAPON_SURFACE_MATERIAL_PROFILES: Readonly<
  Record<WeaponSurfaceRole, WeaponSurfaceMaterialProfile>
> = Object.freeze({
  metal: Object.freeze({
    color: 0x68706c,
    roughness: 0.82,
    metalness: 0.1,
    normalScale: 0.12,
  }),
  polymer: Object.freeze({
    color: 0x303632,
    roughness: 0.96,
    metalness: 0.02,
    normalScale: 0.055,
  }),
  accent: Object.freeze({
    color: 0x9ca49e,
    roughness: 0.72,
    metalness: 0.14,
    normalScale: 0.08,
  }),
});

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hash2d(x: number, y: number, seed: number) {
  let value = Math.imul(x + 0x9e3779b9, 0x85ebca6b);
  value ^= Math.imul(y + seed, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return (value >>> 0) / 0x100000000;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const amount = Math.max(
    0,
    Math.min(1, (value - edge0) / Math.max(Number.EPSILON, edge1 - edge0)),
  );
  return amount * amount * (3 - 2 * amount);
}

/**
 * A seamless, neutral gun-metal raster with fine brushing and restrained wear
 * at normalized UV borders. Its luminance floor stays above the environmental
 * oxidized-metal shadows that crushed first-person receivers to black.
 */
export function createWeaponMetalDiffusePixelData(
  seed = WEAPON_SURFACE_SEED,
  width = WEAPON_SURFACE_TEXTURE_SIZE,
  height = WEAPON_SURFACE_TEXTURE_SIZE,
): Uint8ClampedArray {
  const safeWidth = Math.max(2, Math.floor(width));
  const safeHeight = Math.max(2, Math.floor(height));
  const periodX = safeWidth - 1;
  const periodY = safeHeight - 1;
  const data = new Uint8ClampedArray(safeWidth * safeHeight * 4);

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      const sx = x % periodX;
      const sy = y % periodY;
      const u = sx / periodX;
      const v = sy / periodY;
      const grain = hash2d(sx, sy, seed) - 0.5;
      const fineGrain = hash2d(sx * 3, sy * 5, seed + 211) - 0.5;
      // Longitudinal brush lines remain subtle enough to avoid a striped gun.
      const brush =
        Math.sin((v * 94 + Math.sin(u * Math.PI * 4) * 0.16) * Math.PI * 2) * 2;
      const broad =
        Math.sin((u * 2 + v + (seed % 29) / 29) * Math.PI * 2) * 4.5;
      const edgeDistance = Math.min(
        sx / periodX,
        (periodX - sx) / periodX,
        sy / periodY,
        (periodY - sy) / periodY,
      );
      const edgeWear = (1 - smoothstep(0.012, 0.08, edgeDistance)) * 20;
      const variation = broad + brush + grain * 6 + fineGrain * 2 + edgeWear;
      const index = (y * safeWidth + x) * 4;
      data[index] = clampByte(151 + variation);
      data[index + 1] = clampByte(158 + variation);
      data[index + 2] = clampByte(155 + variation);
      data[index + 3] = 255;
    }
  }
  return data;
}

/** Derives tangent-space relief through the existing procedural pipeline. */
export function createWeaponMetalReliefPixelData(
  diffuse: Uint8ClampedArray,
  width = WEAPON_SURFACE_TEXTURE_SIZE,
  height = WEAPON_SURFACE_TEXTURE_SIZE,
): Uint8ClampedArray {
  return createClassicReliefPixelData(diffuse, width, height, 1.35);
}

/**
 * Brighter worn texels are smoother; recessed/darker marks remain rough. The
 * high floor prevents the map from turning matte gun parts into chrome.
 */
export function createWeaponMetalRoughnessPixelData(
  diffuse: Uint8ClampedArray,
  width = WEAPON_SURFACE_TEXTURE_SIZE,
  height = WEAPON_SURFACE_TEXTURE_SIZE,
): Uint8ClampedArray {
  const safeWidth = Math.max(2, Math.floor(width));
  const safeHeight = Math.max(2, Math.floor(height));
  if (diffuse.length !== safeWidth * safeHeight * 4)
    throw new Error('Weapon diffuse dimensions do not match its pixel data.');
  const roughness = new Uint8ClampedArray(diffuse.length);
  for (let index = 0; index < diffuse.length; index += 4) {
    const luminance =
      diffuse[index] * 0.299 +
      diffuse[index + 1] * 0.587 +
      diffuse[index + 2] * 0.114;
    const value = clampByte(226 - (luminance - 155) * 0.58);
    roughness[index] = value;
    roughness[index + 1] = value;
    roughness[index + 2] = value;
    roughness[index + 3] = 255;
  }
  return roughness;
}
