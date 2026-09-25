import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getClassicRenderProfile,
  MAX_HIGH_QUALITY_PIXEL_RATIO,
  getRenderPixelRatio,
  getStructuralVertexTone,
} from '../app/render-quality.ts';

void test('classic render profile keeps a matte two-light frame', () => {
  const high = getClassicRenderProfile('high');
  const performance = getClassicRenderProfile('performance');
  assert.equal(high.toneMapping, 'aces');
  assert.equal(high.toneMappingExposure, 1.32);
  assert.equal(high.fogColor, high.backgroundColor);
  assert.equal(performance.fogColor, performance.backgroundColor);
  assert.equal(high.fogNear, 40);
  assert.equal(high.fogFar, 90);
  assert.equal(performance.fogNear, 35);
  assert.equal(performance.fogFar, 76);
  assert.equal(high.hemisphereSkyColor, 0xd8e8ee);
  assert.equal(high.hemisphereGroundColor, 0xc4a77b);
  assert.equal(high.hemisphereIntensity, 1.4);
  assert.equal(high.sunIntensity, 2.6);
  assert.equal(high.shadowMapSize, 2048);
  assert.equal(performance.shadowMapSize, 0);
});

void test('sun dominates the fill so surfaces keep a shading gradient', () => {
  const high = getClassicRenderProfile('high');
  // A flat scene is caused by fill light rivalling the sun: faces pointing
  // away from the sun then match lit faces and geometry loses its volume.
  assert.ok(high.sunIntensity > high.hemisphereIntensity * 1.75);
});

void test('high quality preserves display resolution up to its stable cap', () => {
  assert.equal(getRenderPixelRatio('high', 1), 1);
  assert.equal(getRenderPixelRatio('high', 1.75), 1.75);
  assert.equal(getRenderPixelRatio('high', 2), 2);
  assert.equal(getRenderPixelRatio('high', 3), MAX_HIGH_QUALITY_PIXEL_RATIO);
});

void test('performance quality stays at one physical pixel per CSS pixel', () => {
  assert.equal(getRenderPixelRatio('performance', 1), 1);
  assert.equal(getRenderPixelRatio('performance', 3), 1);
});

void test('invalid display ratios fall back safely', () => {
  assert.equal(getRenderPixelRatio('high', 0), 1);
  assert.equal(getRenderPixelRatio('high', -1), 1);
  assert.equal(getRenderPixelRatio('high', Number.NaN), 1);
  assert.equal(getRenderPixelRatio('high', Number.POSITIVE_INFINITY), 1);
});

void test('structural vertex tones add bounded deterministic depth', () => {
  const lower = getStructuralVertexTone(0, 0, 41);
  const upper = getStructuralVertexTone(1, 1, 41);
  assert.deepEqual(getStructuralVertexTone(0, 0, 41), lower);
  assert.ok(upper.r >= lower.r);
  assert.ok(upper.g >= lower.g);
  assert.ok(upper.b >= lower.b);

  [
    lower,
    upper,
    getStructuralVertexTone(-4, -3, Number.NaN),
    getStructuralVertexTone(Number.NaN, Number.POSITIVE_INFINITY, 3),
  ].forEach((tone) => {
    Object.values(tone).forEach((channel) => {
      assert.ok(Number.isFinite(channel));
      assert.ok(channel >= 0.84);
      assert.ok(channel <= 1.04);
    });
  });
});
