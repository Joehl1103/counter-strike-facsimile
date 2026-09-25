import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWeaponMetalDiffusePixelData,
  createWeaponMetalReliefPixelData,
  createWeaponMetalRoughnessPixelData,
  WEAPON_SURFACE_MATERIAL_PROFILES,
  WEAPON_SURFACE_TEXTURE_SIZE,
} from '../app/weapon-surface-profile.ts';

function luminances(data: Uint8ClampedArray) {
  const values: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    values.push(
      data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114,
    );
    assert.equal(data[index + 3], 255);
  }
  return values;
}

function mean(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

void test('weapon metal diffuse is deterministic, graphite-gray, and restrained', () => {
  const first = createWeaponMetalDiffusePixelData();
  const second = createWeaponMetalDiffusePixelData();
  assert.deepEqual(first, second);
  assert.equal(
    first.length,
    WEAPON_SURFACE_TEXTURE_SIZE * WEAPON_SURFACE_TEXTURE_SIZE * 4,
  );
  const values = luminances(first).sort((a, b) => a - b);
  assert.ok(mean(values) >= 150 && mean(values) <= 165);
  assert.ok(values[Math.floor(values.length * 0.05)] >= 138);
  assert.ok(values.at(-1)! - values[0] <= 52);
  const multiplierLuminance = (color: number) =>
    (((color >> 16) & 0xff) * 0.299 +
      ((color >> 8) & 0xff) * 0.587 +
      (color & 0xff) * 0.114) /
    255;
  const metalAlbedo =
    mean(values) *
    multiplierLuminance(WEAPON_SURFACE_MATERIAL_PROFILES.metal.color);
  const accentAlbedo =
    mean(values) *
    multiplierLuminance(WEAPON_SURFACE_MATERIAL_PROFILES.accent.color);
  const polymerAlbedo =
    mean(values) *
    multiplierLuminance(WEAPON_SURFACE_MATERIAL_PROFILES.polymer.color);
  assert.ok(metalAlbedo >= 60 && metalAlbedo <= 76);
  assert.ok(accentAlbedo >= metalAlbedo + 15);
  assert.ok(polymerAlbedo <= metalAlbedo - 30);
});

void test('weapon finish tiles cleanly and keeps edge wear subtle', () => {
  const size = 64;
  const data = createWeaponMetalDiffusePixelData(9013, size, size);
  const pixel = (x: number, y: number) => {
    const index = (y * size + x) * 4;
    return data.slice(index, index + 4);
  };
  for (let offset = 0; offset < size; offset += 1) {
    assert.deepEqual(pixel(0, offset), pixel(size - 1, offset));
    assert.deepEqual(pixel(offset, 0), pixel(offset, size - 1));
  }
  const edge: number[] = [];
  const center: number[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const value =
        data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      if (x < 3 || y < 3 || x >= size - 3 || y >= size - 3) edge.push(value);
      if (x >= 20 && x < 44 && y >= 20 && y < 44) center.push(value);
    }
  }
  const wearLift = mean(edge) - mean(center);
  assert.ok(wearLift >= 10 && wearLift <= 22);
});

void test('weapon relief and roughness derive surface response from albedo', () => {
  const size = 64;
  const diffuse = createWeaponMetalDiffusePixelData(9013, size, size);
  const relief = createWeaponMetalReliefPixelData(diffuse, size, size);
  const roughness = createWeaponMetalRoughnessPixelData(diffuse, size, size);
  assert.equal(relief.length, diffuse.length);
  assert.equal(roughness.length, diffuse.length);
  const normalRed = [] as number[];
  const normalBlue = [] as number[];
  const rough = [] as number[];
  for (let index = 0; index < diffuse.length; index += 4) {
    normalRed.push(relief[index]);
    normalBlue.push(relief[index + 2]);
    rough.push(roughness[index]);
    assert.equal(roughness[index], roughness[index + 1]);
    assert.equal(roughness[index], roughness[index + 2]);
  }
  assert.ok(Math.max(...normalRed) - Math.min(...normalRed) >= 4);
  assert.ok(Math.min(...normalBlue) >= 248);
  assert.ok(Math.min(...rough) >= 208);
  assert.ok(Math.max(...rough) - Math.min(...rough) >= 10);
});

void test('material profiles separate receiver, polymer, and edge detail', () => {
  const { metal, polymer, accent } = WEAPON_SURFACE_MATERIAL_PROFILES;
  assert.ok(polymer.color < metal.color);
  assert.ok(polymer.roughness > metal.roughness);
  assert.ok(polymer.metalness < metal.metalness);
  assert.ok(accent.metalness > metal.metalness);
  assert.ok(accent.normalScale < metal.normalScale);
  for (const profile of Object.values(WEAPON_SURFACE_MATERIAL_PROFILES)) {
    assert.ok(profile.roughness >= 0.65 && profile.roughness <= 1);
    assert.ok(profile.metalness >= 0 && profile.metalness <= 0.2);
    assert.ok(profile.normalScale > 0 && profile.normalScale <= 0.12);
  }
});

void test('roughness rejects mismatched raster dimensions', () => {
  assert.throws(
    () => createWeaponMetalRoughnessPixelData(new Uint8ClampedArray(8), 4, 4),
    /dimensions/,
  );
});
