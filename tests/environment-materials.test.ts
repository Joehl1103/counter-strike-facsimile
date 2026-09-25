import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  applyEnvironmentSurfaceUv,
  ENVIRONMENT_SURFACE_PROFILES,
  ENVIRONMENT_TEXTURE_GPU_BYTES,
  createEnvironmentSurfaceLibrary,
  getEnvironmentSurfaceUv,
} from '../app/environment-materials.ts';

void test('environment profiles use bounded physical scales and paired CC0 maps', () => {
  assert.deepEqual(Object.keys(ENVIRONMENT_SURFACE_PROFILES).sort(), [
    'cobblestone',
    'sandstoneBlocks',
    'weatheredPlaster',
  ]);
  Object.values(ENVIRONMENT_SURFACE_PROFILES).forEach((profile) => {
    assert.ok(Object.isFrozen(profile));
    assert.ok(profile.diffuseUrl.endsWith('_diff_1k.jpg'));
    assert.ok(profile.normalUrl.endsWith('_nor_gl_1k.jpg'));
    assert.ok(profile.tileWidthMeters >= 2 && profile.tileWidthMeters <= 3);
    assert.ok(profile.tileHeightMeters >= 2 && profile.tileHeightMeters <= 3);
    assert.ok(profile.normalStrength > 0 && profile.normalStrength <= 0.5);
    assert.ok(profile.roughness >= 0.85 && profile.roughness <= 1);
    assert.ok(profile.daylightMultiplier.every(Number.isFinite));
    assert.ok(profile.shadowTint.every(Number.isFinite));
    assert.ok(profile.shadowTint.every((channel) => channel >= 0 && channel <= 1));
    assert.ok(profile.shadowMapIntensity > 0 && profile.shadowMapIntensity < 0.35);
  });
  assert.ok(
    ENVIRONMENT_SURFACE_PROFILES.weatheredPlaster.daylightMultiplier[0] > 2.5,
  );
  assert.ok(
    ENVIRONMENT_SURFACE_PROFILES.sandstoneBlocks.daylightMultiplier[0] > 2,
  );
  assert.ok(
    ENVIRONMENT_SURFACE_PROFILES.weatheredPlaster.shadowMapIntensity >
      ENVIRONMENT_SURFACE_PROFILES.cobblestone.shadowMapIntensity,
  );
});

void test('environment materials reuse albedo detail for bounded warm shadow lift', () => {
  const originalLoad = Reflect.get(
    THREE.TextureLoader.prototype,
    'load',
  ) as THREE.TextureLoader['load'];
  THREE.TextureLoader.prototype.load = () => new THREE.Texture();
  try {
    const library = createEnvironmentSurfaceLibrary(16);
    Object.entries(library.materials).forEach(([kind, material]) => {
      const profile = ENVIRONMENT_SURFACE_PROFILES[
        kind as keyof typeof ENVIRONMENT_SURFACE_PROFILES
      ];
      assert.equal(material.emissiveMap, material.map);
      assert.equal(material.emissiveIntensity, profile.shadowMapIntensity);
      assert.equal(material.normalMap !== null, true);
      assert.equal(material.normalScale.x, profile.normalStrength);
    });
    library.dispose();
  } finally {
    THREE.TextureLoader.prototype.load = originalLoad;
  }
});

void test('each 1k texture declares decoded RGBA storage with mipmaps', () => {
  assert.equal(
    ENVIRONMENT_TEXTURE_GPU_BYTES,
    Math.ceil(1024 * 1024 * 4 * (4 / 3)),
  );
});

void test('environment loader does not upload textures before images arrive', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../app/environment-materials.ts', import.meta.url), 'utf8'),
  );
  const configureStart = source.indexOf('function configureTexture');
  const configureEnd = source.indexOf('export function createEnvironmentSurfaceLibrary');
  assert.ok(configureStart >= 0 && configureEnd > configureStart);
  assert.doesNotMatch(
    source.slice(configureStart, configureEnd),
    /texture\.needsUpdate\s*=\s*true/,
  );
});

void test('environment UV projection preserves real scale on walls and ground', () => {
  assert.deepEqual(
    getEnvironmentSurfaceUv('sandstoneBlocks', [6, 3, 0], [0, 0, 1]),
    [2, 1],
  );
  assert.deepEqual(
    getEnvironmentSurfaceUv('weatheredPlaster', [0, 5, 2.5], [1, 0, 0]),
    [1, 2],
  );
  assert.deepEqual(
    getEnvironmentSurfaceUv('cobblestone', [4, 0, 6], [0, 1, 0]),
    [2, 3],
  );
});

void test('environment UV writer mutates only the geometry UV channel', () => {
  const geometry = new THREE.BoxGeometry(6, 3, 2);
  const positions = Array.from(geometry.getAttribute('position').array);
  const normals = Array.from(geometry.getAttribute('normal').array);
  const before = Array.from(geometry.getAttribute('uv').array);
  assert.equal(
    applyEnvironmentSurfaceUv(geometry, 'sandstoneBlocks'),
    geometry,
  );
  assert.notDeepEqual(Array.from(geometry.getAttribute('uv').array), before);
  assert.deepEqual(
    Array.from(geometry.getAttribute('position').array),
    positions,
  );
  assert.deepEqual(Array.from(geometry.getAttribute('normal').array), normals);
  geometry.dispose();
});
