import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  CLASSIC_HORIZON_COLOR,
  CLASSIC_MICRO_BEVEL_MAX,
  CLASSIC_MICRO_BEVEL_MIN,
  CLASSIC_STRUCTURAL_BUMP_MAPS_ENABLED,
  CLASSIC_STRUCTURAL_NORMAL_MAPS_ENABLED,
  CLASSIC_SURFACE_PALETTES,
  CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  getClassicBlockMeanArtifactMetrics,
  createClassicDiffusePixelData,
  createClassicSkyPixelData,
  createSeededDiffuseTextureInstructions,
  createSeededMasonryInstructions,
  createSeededSiteMotifInstructions,
  createSeededSkyCloudLayers,
  getClassicStructuralProxyBounds,
  getClassicPixelColumnSeamDelta,
  getClassicSkyCloudReadabilityMetrics,
  getClassicWorldUvScale,
  getClassicBoxFaceUv,
  isClassicMicroBevel,
} from '../app/classic-surface-profile.ts';

void test('classic surface palettes are immutable finite material families', () => {
  assert.deepEqual(Object.keys(CLASSIC_SURFACE_PALETTES).sort(), [
    'cutStone',
    'darkMasonry',
    'paintedOxidizedMetal',
    'plaster',
    'sand',
    'timber',
  ]);
  Object.values(CLASSIC_SURFACE_PALETTES).forEach((palette) => {
    assert.ok(Object.isFrozen(palette));
    assert.ok(
      [palette.base, palette.light, palette.shadow].every(Number.isInteger),
    );
    assert.ok([palette.roughness, palette.metalness].every(Number.isFinite));
    assert.ok(palette.roughness >= 0 && palette.roughness <= 1);
    assert.ok(palette.metalness >= 0 && palette.metalness <= 1);
  });
  assert.ok(Object.isFrozen(CLASSIC_SURFACE_PALETTES));
});

void test('palette values preserve readable light and shadow separation', () => {
  const luminance = (color: number) => {
    const red = (color >> 16) & 0xff;
    const green = (color >> 8) & 0xff;
    const blue = color & 0xff;
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  };
  Object.values(CLASSIC_SURFACE_PALETTES).forEach((palette) => {
    assert.ok(luminance(palette.light) > luminance(palette.base));
    assert.ok(luminance(palette.base) > luminance(palette.shadow));
  });
  assert.ok(CLASSIC_SURFACE_PALETTES.paintedOxidizedMetal.metalness <= 0.2);
});

void test('masonry instructions are deterministic, seeded, and bounded', () => {
  const first = createSeededMasonryInstructions(42, 6, 4);
  const second = createSeededMasonryInstructions(42, 6, 4);
  assert.deepEqual(first, second);
  assert.equal(first.blocks.length, 24);
  assert.equal(first.seams.length, 12);
  assert.ok(Object.isFrozen(first));
  first.blocks.forEach((block) => {
    assert.ok(
      [block.x, block.y, block.width, block.height].every(Number.isFinite),
    );
    assert.ok(block.width > 0 && block.width <= 1 / 6);
    assert.ok(block.height > 0 && block.height <= 1 / 4);
    assert.ok(block.shade >= 0 && block.shade <= 2);
  });
  first.seams.forEach((seam) => {
    assert.ok(
      [seam.x1, seam.y1, seam.x2, seam.y2, seam.width].every(Number.isFinite),
    );
    assert.ok(seam.width >= 0.006 && seam.width <= 0.012);
  });
  assert.notDeepEqual(first, createSeededMasonryInstructions(43, 6, 4));
});

void test('diffuse texture instructions cover every family with bounded low-res passes', () => {
  const families = Object.keys(CLASSIC_SURFACE_PALETTES) as Array<
    keyof typeof CLASSIC_SURFACE_PALETTES
  >;
  const patterns = new Map<string, string>();
  families.forEach((family) => {
    const first = createSeededDiffuseTextureInstructions(family, 42, 512, 300);
    const second = createSeededDiffuseTextureInstructions(family, 42, 512, 300);
    assert.deepEqual(first, second);
    assert.equal(first.width, CLASSIC_SURFACE_TEXTURE_MAX_SIZE);
    assert.equal(first.height, CLASSIC_SURFACE_TEXTURE_MAX_SIZE);
    assert.equal(first.maxTextureSize, CLASSIC_SURFACE_TEXTURE_MAX_SIZE);
    assert.equal(first.structuralBumpMapEnabled, false);
    assert.equal(first.structuralNormalMapEnabled, false);
    assert.ok(Object.isFrozen(first));
    assert.ok(Object.isFrozen(first.passes));
    assert.ok(first.passes.length >= 8);
    first.passes.forEach((pass) => {
      assert.ok(
        [
          pass.x,
          pass.y,
          pass.width,
          pass.height,
          pass.rotation,
          pass.opacity,
        ].every(Number.isFinite),
      );
      assert.ok(pass.x >= 0 && pass.x <= 1);
      assert.ok(pass.y >= 0 && pass.y <= 1);
      assert.ok(pass.width >= 0 && pass.width <= 1);
      assert.ok(pass.height >= 0 && pass.height <= 1);
      assert.ok(pass.x + pass.width <= 1);
      assert.ok(pass.y + pass.height <= 1);
      assert.ok(pass.opacity >= 0 && pass.opacity <= 1);
      assert.ok(pass.tone >= 0 && pass.tone <= 2);
    });
    patterns.set(
      family,
      [...new Set(first.passes.map((pass) => pass.kind))].sort().join(','),
    );
  });
  assert.deepEqual([...patterns.keys()].sort(), families.slice().sort());
  assert.ok(patterns.get('plaster')?.includes('crack'));
  assert.ok(patterns.get('cutStone')?.includes('block'));
  assert.ok(patterns.get('darkMasonry')?.includes('seam'));
  assert.ok(patterns.get('sand')?.includes('speckle'));
  assert.ok(patterns.get('timber')?.includes('grain'));
  assert.ok(patterns.get('paintedOxidizedMetal')?.includes('edgeWear'));
  assert.notDeepEqual(
    createSeededDiffuseTextureInstructions('plaster', 42),
    createSeededDiffuseTextureInstructions('plaster', 43),
  );
});

void test('site A, site B, and mid motifs stay restrained but distinct', () => {
  const motifs = ['siteA', 'siteB', 'mid'] as const;
  const instructions = motifs.map((motif) =>
    createSeededSiteMotifInstructions(motif, 9),
  );
  assert.deepEqual(
    instructions,
    motifs.map((motif) => createSeededSiteMotifInstructions(motif, 9)),
  );
  assert.equal(
    new Set(instructions.map((entry) => JSON.stringify(entry.marks))).size,
    motifs.length,
  );
  instructions.forEach((entry) => {
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.marks));
    assert.equal(entry.marks.length, 3);
    entry.marks.forEach((mark) => {
      assert.ok(
        [
          mark.x,
          mark.y,
          mark.width,
          mark.height,
          mark.rotation,
          mark.opacity,
        ].every(Number.isFinite),
      );
      assert.ok(mark.x >= 0 && mark.x <= 1);
      assert.ok(mark.y >= 0 && mark.y <= 1);
      assert.ok(mark.width > 0 && mark.x + mark.width <= 1);
      assert.ok(mark.height > 0 && mark.y + mark.height <= 1);
      assert.ok(mark.opacity >= 0 && mark.opacity <= 0.36);
    });
  });
});

void test('sky cloud layers are deterministic and remain inside texture bounds', () => {
  const layers = createSeededSkyCloudLayers(7, 8);
  assert.deepEqual(layers, createSeededSkyCloudLayers(7, 8));
  assert.equal(layers.length, 8);
  layers.forEach((layer) => {
    assert.ok(
      [
        layer.x,
        layer.y,
        layer.width,
        layer.height,
        layer.opacity,
        layer.seed,
      ].every(Number.isFinite),
    );
    assert.ok(layer.x >= 0 && layer.x <= 1);
    assert.ok(layer.y >= 0 && layer.y <= 1);
    assert.ok(layer.width > 0 && layer.width <= 0.44);
    assert.ok(layer.height > 0 && layer.height <= 0.125);
    assert.ok(layer.opacity >= 0.08 && layer.opacity <= 0.28);
  });
});

void test('shared horizon and renderer-facing safety constants are exact', () => {
  assert.equal(CLASSIC_SURFACE_TEXTURE_MAX_SIZE, 256);
  assert.equal(CLASSIC_STRUCTURAL_BUMP_MAPS_ENABLED, false);
  assert.equal(CLASSIC_STRUCTURAL_NORMAL_MAPS_ENABLED, false);
  assert.equal(CLASSIC_HORIZON_COLOR, 0xc2ccc9);
  assert.equal(CLASSIC_MICRO_BEVEL_MIN, 0.02);
  assert.equal(CLASSIC_MICRO_BEVEL_MAX, 0.04);
  assert.ok(isClassicMicroBevel(0.02));
  assert.ok(isClassicMicroBevel(0.04));
  assert.ok(!isClassicMicroBevel(0.019));
  assert.ok(!isClassicMicroBevel(0.041));
  assert.ok(!isClassicMicroBevel(Number.NaN));
});

void test('authoritative structural proxy bounds are exact and immutable', () => {
  const bounds = getClassicStructuralProxyBounds([4, 2.6, -8], [16, 5.2, 2]);
  assert.deepEqual(bounds, {
    min: [-4, 0, -9],
    max: [12, 5.2, -7],
  });
  assert.ok(Object.isFrozen(bounds));
  assert.ok(Object.isFrozen(bounds.min));
  assert.ok(Object.isFrozen(bounds.max));
});

void test('diffuse detail survives close inspection without repeating false shadows', () => {
  const luminanceStdDev = (data: Uint8ClampedArray, blockSize = 1) => {
    const values: number[] = [];
    // Average the texels that cover a distant screen pixel. Strided point
    // sampling aliases fine grain and cannot measure minified appearance.
    for (let y = 0; y < 256; y += blockSize) {
      for (let x = 0; x < 256; x += blockSize) {
        let total = 0;
        for (let dy = 0; dy < blockSize; dy += 1) {
          for (let dx = 0; dx < blockSize; dx += 1) {
            const index = ((y + dy) * 256 + x + dx) * 4;
            total += (0.2126 * data[index] + 0.7152 * data[index + 1] +
              0.0722 * data[index + 2]) / 255;
          }
        }
        values.push(total / (blockSize * blockSize));
      }
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        values.length,
    );
  };
  for (const family of ['plaster', 'sand'] as const) {
    for (const seed of [42, 5107, 1729]) {
      const raster = createClassicDiffusePixelData(family, seed);
      assert.ok(luminanceStdDev(raster) >= 0.015, `${family} fine aggregate`);
      assert.ok(luminanceStdDev(raster, 16) < 0.02, `${family} broad blotches`);
      const artifact = getClassicBlockMeanArtifactMetrics(raster, 256, 256);
      assert.ok(artifact.p95Jump < 0.025, `${family} block p95 jump`);
      assert.ok(artifact.maxJump < 0.045, `${family} block max jump`);
    }
  }
  const stone = createClassicDiffusePixelData('cutStone', 42);
  assert.ok(luminanceStdDev(stone) >= 0.035, 'stone joints remain readable');
  assert.ok(luminanceStdDev(stone, 16) >= 0.02, 'stone courses survive minification');
  const plaster = createClassicDiffusePixelData('plaster', 42);
  const dark = createClassicDiffusePixelData('darkMasonry', 42);
  const adjoiningPlaster =
    plaster[0] * 0.2126 + plaster[1] * 0.7152 + plaster[2] * 0.0722;
  const darkAperture = dark[0] * 0.2126 + dark[1] * 0.7152 + dark[2] * 0.0722;
  assert.ok(darkAperture / adjoiningPlaster <= 0.65);
});

void test('generated diffuse maps meet the repeated-tile RGB seam gate', () => {
  for (const family of Object.keys(CLASSIC_SURFACE_PALETTES) as Array<
    keyof typeof CLASSIC_SURFACE_PALETTES
  >) {
    const raster = createClassicDiffusePixelData(family, 42);
    const seamDelta = getClassicPixelColumnSeamDelta(raster, 256, 256);
    assert.ok(seamDelta <= 2, `${family} diffuse seam delta ${seamDelta}`);
    assert.deepEqual(
      raster.slice(0, 256 * 4),
      raster.slice(255 * 256 * 4),
      `${family} must also repeat continuously in the vertical direction`,
    );
  }
});

void test('generated sky is periodic at the UV seam and keeps the horizon palette', () => {
  const sky = createClassicSkyPixelData(9029);
  assert.equal(getClassicPixelColumnSeamDelta(sky, 256, 256), 0);
  const horizon = [
    (CLASSIC_HORIZON_COLOR >> 16) & 0xff,
    (CLASSIC_HORIZON_COLOR >> 8) & 0xff,
    CLASSIC_HORIZON_COLOR & 0xff,
  ];
  const horizonIndex = (220 * 256 + 128) * 4;
  assert.deepEqual(
    Array.from(sky.slice(horizonIndex, horizonIndex + 3)),
    horizon,
  );
});

void test('generated sky keeps two-dimensional cloud readability in the cloud band', () => {
  const metrics = getClassicSkyCloudReadabilityMetrics(
    createClassicSkyPixelData(9029),
    256,
    256,
  );
  assert.ok(
    metrics.residualLumaRms >= 0.025,
    `cloud residual RMS ${metrics.residualLumaRms}`,
  );
  assert.ok(
    metrics.p90RowRange >= 0.1,
    `cloud p90 row range ${metrics.p90RowRange}`,
  );
});

void test('world UV scales preserve family texel density and visual decals stay non-interactive', () => {
  assert.deepEqual(getClassicWorldUvScale('plaster', [4, 8, 2]), [1, 2]);
  assert.deepEqual(getClassicWorldUvScale('plaster', [40, 20, 5]), [10, 5]);
  assert.deepEqual(getClassicWorldUvScale('sand', [72, 72, 1]), [18, 18]);
  const source = readFileSync(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /createClassicSkyPixelData\(9029, 256, 256\)/);
  assert.match(source, /skyTexture\.wrapS = THREE\.RepeatWrapping/);
  assert.match(
    source,
    /classic-bombsite-\$\{name\.toLowerCase\(\)\}-paint-visual-only/,
  );
  assert.match(source, /marker\.userData\.visualOnly = true/);
  assert.match(source, /marker\.raycast = \(\) => undefined/);
});

void test('box faces preserve metre-scale texture density on fronts, ends and tops', () => {
  // A 40m wall only 2m thick: its end must not inherit ten front-face tiles.
  const size = [40, 8, 2] as const;
  for (const sign of [-1, 1]) {
    const front = getClassicBoxFaceUv('plaster', size, [20, 4, sign], [0, 0, sign]);
    const end = getClassicBoxFaceUv('plaster', size, [sign * 20, 4, 1], [sign, 0, 0]);
    const top = getClassicBoxFaceUv('plaster', size, [20, sign * 4, 1], [0, sign, 0]);
    assert.deepEqual(front, [10, 2]);
    assert.deepEqual(end, [0.5, 2]);
    assert.deepEqual(top, [10, 0.5]);
  }
  // Thin cornices still show the correct fraction of a course.
  assert.deepEqual(getClassicBoxFaceUv('cutStone', [12, 0.12, 0.3],
    [6, 0.06, 0.15], [0, 0, 1]), [4, 0.04]);
});
