import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  createClassicDiffusePixelData,
  createClassicReliefPixelData,
} from '../app/classic-surface-profile.ts';

const SIZE = CLASSIC_SURFACE_TEXTURE_MAX_SIZE;
const pageSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

void test('relief textures repeat with metre-scaled UVs instead of clamping into streaks', () => {
  const start = pageSource.indexOf('const createClassicReliefTexture =');
  const end = pageSource.indexOf('// Exactly six 256px', start);
  assert.ok(start >= 0 && end > start);
  const setup = pageSource.slice(start, end);
  assert.match(setup, /texture\.wrapS = THREE\.RepeatWrapping/);
  assert.match(setup, /texture\.wrapT = THREE\.RepeatWrapping/);
  assert.match(setup, /texture\.needsUpdate = true/);
});

/**
 * The relief pass converts an existing diffuse raster into a tangent-space
 * normal map. It exists so sunlight produces real shading variation across a
 * wall instead of one uniform value per face.
 */
void test('relief data is a full RGBA raster matching its diffuse source', () => {
  const diffuse = createClassicDiffusePixelData('plaster', 5107, SIZE, SIZE);
  const relief = createClassicReliefPixelData(diffuse, SIZE, SIZE);

  assert.equal(relief.length, SIZE * SIZE * 4);
  for (let index = 3; index < relief.length; index += 4) {
    assert.equal(relief[index], 255);
  }
});

void test('relief encodes unit-length tangent-space normals', () => {
  const diffuse = createClassicDiffusePixelData('cutStone', 2767, SIZE, SIZE);
  const relief = createClassicReliefPixelData(diffuse, SIZE, SIZE);

  for (let index = 0; index < relief.length; index += 4) {
    const x = (relief[index] / 255) * 2 - 1;
    const y = (relief[index + 1] / 255) * 2 - 1;
    const z = (relief[index + 2] / 255) * 2 - 1;
    const length = Math.sqrt(x * x + y * y + z * z);
    assert.ok(Math.abs(length - 1) < 0.02, `normal length ${length}`);
    // A surface normal must always point outward, never into the geometry.
    assert.ok(z > 0, `inward-facing normal z=${z}`);
  }
});

void test('flat input yields flat normals so smooth materials stay smooth', () => {
  const flat = new Uint8ClampedArray(SIZE * SIZE * 4).fill(128);
  for (let index = 3; index < flat.length; index += 4) flat[index] = 255;
  const relief = createClassicReliefPixelData(flat, SIZE, SIZE);

  for (let index = 0; index < relief.length; index += 4) {
    assert.equal(relief[index], 128);
    assert.equal(relief[index + 1], 128);
    assert.equal(relief[index + 2], 255);
  }
});

void test('relief tiles seamlessly so walls show no repeat seam', () => {
  const diffuse = createClassicDiffusePixelData('sand', 1729, SIZE, SIZE);
  const relief = createClassicReliefPixelData(diffuse, SIZE, SIZE);
  const at = (x: number, y: number) => (y * SIZE + x) * 4;

  // Opposite edges are different texels, so they are not expected to match.
  // Seamlessness means the step across the wrap is no larger than a typical
  // step inside the map: a visible seam would be a step far bigger than that.
  const stepAcross = (y: number, channel: number) =>
    Math.abs(relief[at(0, y) + channel] - relief[at(SIZE - 1, y) + channel]);
  const stepInside = (y: number, channel: number) =>
    Math.abs(relief[at(1, y) + channel] - relief[at(2, y) + channel]);

  let largestAcross = 0;
  let largestInside = 0;
  for (let y = 0; y < SIZE; y += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      largestAcross = Math.max(largestAcross, stepAcross(y, channel));
      largestInside = Math.max(largestInside, stepInside(y, channel));
    }
  }

  assert.ok(
    largestAcross <= largestInside * 1.5,
    `wrap step ${largestAcross} exceeds interior step ${largestInside}`,
  );
});

void test('detailed surfaces actually produce relief, not a flat map', () => {
  const diffuse = createClassicDiffusePixelData('darkMasonry', 4051, SIZE, SIZE);
  const relief = createClassicReliefPixelData(diffuse, SIZE, SIZE);

  let perturbed = 0;
  for (let index = 0; index < relief.length; index += 4) {
    if (Math.abs(relief[index] - 128) > 3 || Math.abs(relief[index + 1] - 128) > 3) {
      perturbed += 1;
    }
  }
  // Masonry joints must register as relief across a meaningful share of the map.
  assert.ok(perturbed > SIZE * SIZE * 0.05, `only ${perturbed} perturbed texels`);
});
