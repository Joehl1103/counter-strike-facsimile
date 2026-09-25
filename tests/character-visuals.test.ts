import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  CHARACTER_CAPSULE_PROFILES,
  CHARACTER_FACETED_PROFILE,
  CHARACTER_HUMAN_GRAMMAR_GATES,
  CHARACTER_SIDE_PALETTES,
  CHARACTER_SILHOUETTE_CUES,
  CHARACTER_SHOULDER_PROFILE,
  CHARACTER_SMOOTH_VARIANT_TRIANGLE_BUDGET_PER_BOT,
  createFacetedHeadCueGeometry,
  createFacetedHeadGeometry,
  createFacetedLimbGeometry,
  createFacetedTorsoCueGeometry,
  createFacetedTorsoGeometry,
  characterDeltaE2000,
  getCharacterClothPaletteMetrics,
  getCharacterLimbGeometryMetadata,
  getCharacterHumanGrammarGateResults,
  getCharacterProjectedProfileMetrics,
  getCharacterVariantVisibility,
} from '../app/character-visuals.ts';

void test('high-quality character capsules preserve dimensions and add silhouette detail', () => {
  Object.values(CHARACTER_CAPSULE_PROFILES).forEach((profile) => {
    assert.ok(Number.isFinite(profile.radius) && profile.radius > 0);
    assert.ok(Number.isFinite(profile.length) && profile.length > 0);
    assert.ok(profile.high.capSegments > profile.performance.capSegments);
    assert.ok(profile.high.radialSegments > profile.performance.radialSegments);
  });
  assert.ok(
    CHARACTER_SHOULDER_PROFILE.high.widthSegments >
      CHARACTER_SHOULDER_PROFILE.performance.widthSegments,
  );
  assert.ok(
    CHARACTER_SHOULDER_PROFILE.high.heightSegments >
      CHARACTER_SHOULDER_PROFILE.performance.heightSegments,
  );
});

void test('character quality modes show exactly one render variant', () => {
  assert.deepEqual(getCharacterVariantVisibility('performance'), {
    proxy: false,
    smooth: true,
  });
  assert.deepEqual(getCharacterVariantVisibility('high'), {
    proxy: false,
    smooth: true,
  });
});

void test('faceted visible character stays inside triangle and draw budgets', () => {
  const baseGeometries = [
    createFacetedTorsoGeometry(),
    createFacetedHeadGeometry(),
    createFacetedLimbGeometry(0.13, 0.56),
    createFacetedLimbGeometry(0.105, 0.42),
  ];
  const triangleCount = (geometry: THREE.BufferGeometry) =>
    (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
  const baseTriangles =
    triangleCount(baseGeometries[0]) +
    triangleCount(baseGeometries[1]) +
    triangleCount(baseGeometries[2]) * 2 +
    triangleCount(baseGeometries[3]) * 2;
  const cueGeometries = [
    createFacetedTorsoCueGeometry('ct'),
    createFacetedHeadCueGeometry('ct'),
    createFacetedTorsoCueGeometry('t'),
    createFacetedHeadCueGeometry('t'),
  ];
  const cueTriangles = Math.max(
    triangleCount(cueGeometries[0]) + triangleCount(cueGeometries[1]),
    triangleCount(cueGeometries[2]) + triangleCount(cueGeometries[3]),
  );
  baseGeometries.forEach((geometry) => geometry.dispose());
  cueGeometries.forEach((geometry) => geometry.dispose());
  // Six body meshes plus two active cues are the complete visible shell.
  assert.ok(
    baseTriangles + cueTriangles <= CHARACTER_FACETED_PROFILE.maxTriangles,
  );
  assert.equal(CHARACTER_FACETED_PROFILE.maxMaterialDraws, 8);
  assert.equal(
    CHARACTER_SMOOTH_VARIANT_TRIANGLE_BUDGET_PER_BOT,
    CHARACTER_FACETED_PROFILE.maxTriangles,
  );
});

void test('CT and T palettes are deterministic and contrast in cloth and cues', () => {
  assert.deepEqual(CHARACTER_SIDE_PALETTES.ct, {
    cloth: 0x31536d,
    armor: 0x1d2b38,
    accent: 0x78bddd,
    skin: 0x9b6d4f,
  });
  assert.deepEqual(CHARACTER_SIDE_PALETTES.t, {
    cloth: 0x906f3d,
    armor: 0x362f20,
    accent: 0xbd7048,
    skin: 0x9b6d4f,
  });
  assert.notEqual(
    CHARACTER_SIDE_PALETTES.ct.cloth,
    CHARACTER_SIDE_PALETTES.t.cloth,
  );
  assert.notEqual(
    CHARACTER_SIDE_PALETTES.ct.accent,
    CHARACTER_SIDE_PALETTES.t.accent,
  );
  const clothMetrics = getCharacterClothPaletteMetrics();
  assert.ok(clothMetrics.ctLightness >= 8);
  assert.ok(clothMetrics.tLightness >= 8);
  assert.ok(clothMetrics.lightnessGap >= 8);
  assert.ok(clothMetrics.deltaE2000 >= 15);
  // Sharma et al.'s canonical CIEDE2000 pair keeps the implementation's
  // conversion/weighting deterministic rather than merely comparing hexes.
  assert.ok(
    Math.abs(
      characterDeltaE2000(
        { l: 50, a: 2.6772, b: -79.7751 },
        { l: 50, a: 0, b: -82.7485 },
      ) - 2.0425,
    ) < 0.001,
  );
});

void test('each side has two explicit geometry silhouette cues', () => {
  assert.equal(CHARACTER_SILHOUETTE_CUES.ct.length, 2);
  assert.equal(CHARACTER_SILHOUETTE_CUES.t.length, 2);
  assert.notDeepEqual(
    CHARACTER_SILHOUETTE_CUES.ct,
    CHARACTER_SILHOUETTE_CUES.t,
  );
});

void test('visible human grammar passes deterministic front and quarter gates', () => {
  const front = getCharacterProjectedProfileMetrics(0);
  const quarter = getCharacterProjectedProfileMetrics(Math.PI / 4);
  const gates = getCharacterHumanGrammarGateResults();
  assert.ok(
    front.headBodyHeightRatio >=
      CHARACTER_HUMAN_GRAMMAR_GATES.headBodyHeightRatio.min,
  );
  assert.ok(
    front.headBodyHeightRatio <=
      CHARACTER_HUMAN_GRAMMAR_GATES.headBodyHeightRatio.max,
  );
  [front, quarter].forEach((metrics) => {
    assert.ok(
      metrics.shoulderHipWidthRatio >=
        CHARACTER_HUMAN_GRAMMAR_GATES.shoulderHipWidthRatio.min,
    );
    assert.ok(
      metrics.shoulderHipWidthRatio <=
        CHARACTER_HUMAN_GRAMMAR_GATES.shoulderHipWidthRatio.max,
    );
  });
  assert.ok(
    front.limbSeparation >=
      CHARACTER_HUMAN_GRAMMAR_GATES.frontLimbSeparationMin,
  );
  assert.ok(
    quarter.limbSeparation >=
      CHARACTER_HUMAN_GRAMMAR_GATES.quarterLimbSeparationMin,
  );
  assert.deepEqual(gates, {
    headBodyHeight: true,
    shoulderHipWidth: true,
    frontLimbSeparation: true,
    quarterLimbSeparation: true,
    teamCuePaletteRecognition: true,
    passes: true,
  });
});

void test('compound shells preserve human silhouette transitions', () => {
  const torso = createFacetedTorsoGeometry();
  const head = createFacetedHeadGeometry();
  const leg = createFacetedLimbGeometry(0.13, 0.56);
  const arm = createFacetedLimbGeometry(0.105, 0.42);
  const ctHelmet = createFacetedHeadCueGeometry('ct');
  [torso, head, leg, arm, ctHelmet].forEach((geometry) =>
    geometry.computeBoundingBox(),
  );
  assert.ok((torso.boundingBox?.max.x ?? 0) >= 0.3);
  assert.ok((torso.boundingBox?.min.y ?? 0) <= -0.35);
  // The connected chest is elliptical, not a circular barrel as deep as wide.
  assert.ok((torso.boundingBox?.max.z ?? 0) >= 0.24);
  // The fitted backpack extends the equipped back profile without turning the
  // torso itself into a circular barrel.
  assert.ok((torso.boundingBox?.max.z ?? 0) >= 0.32);
  assert.ok((torso.boundingBox?.max.z ?? 1) <= 0.35);
  assert.ok((head.boundingBox?.min.y ?? 0) <= -0.3);
  assert.ok((leg.boundingBox?.max.y ?? 0) >= 0.1);
  assert.ok((leg.boundingBox?.min.y ?? 0) <= -0.7);
  assert.ok((leg.boundingBox?.min.z ?? 0) <= -0.2);
  assert.ok((arm.boundingBox?.min.y ?? 0) <= -0.7);
  // The calibrated palm is centered on the rig's hand endpoint rather than
  // carrying a forward bind offset; the posed shoulder/elbow supplies depth.
  assert.ok((arm.boundingBox?.min.z ?? 0) <= -0.1);
  assert.ok((ctHelmet.boundingBox?.max.x ?? 1) <= 0.28);
  assert.ok((ctHelmet.boundingBox?.min.z ?? 0) <= -0.2);
  [torso, head, leg, arm, ctHelmet].forEach((geometry) => geometry.dispose());
});

void test('compound limb shells retain deterministic setup ranges', () => {
  const leg = createFacetedLimbGeometry(0.13, 0.56);
  const arm = createFacetedLimbGeometry(0.105, 0.42);
  assert.deepEqual(
    getCharacterLimbGeometryMetadata(leg)?.segments.map(
      ({ segment }) => segment,
    ),
    ['upper', 'knee', 'shin', 'boot'],
  );
  assert.deepEqual(
    getCharacterLimbGeometryMetadata(arm)?.segments.map(
      ({ segment }) => segment,
    ),
    ['upper', 'elbow', 'forearm', 'hand'],
  );
  for (const geometry of [leg, arm]) {
    const metadata = getCharacterLimbGeometryMetadata(geometry);
    assert.ok(metadata);
    assert.equal(
      metadata.segments.at(-1)?.end,
      geometry.getAttribute('position').count,
    );
    geometry.dispose();
  }
});

void test('arm hand is compact, tapered, and metadata covers every vertex', () => {
  const arm = createFacetedLimbGeometry(0.105, 0.42);
  const position = arm.getAttribute('position');
  const metadata = getCharacterLimbGeometryMetadata(arm);
  assert.ok(metadata);
  let covered = 0;
  metadata.segments.forEach((range, index) => {
    assert.equal(range.start, covered);
    assert.equal(range.end, range.start + range.count);
    assert.ok(range.count > 0);
    if (index === metadata.segments.length - 1)
      assert.equal(range.end, position.count);
    covered = range.end;
  });

  const hand = metadata.segments.find(({ segment }) => segment === 'hand');
  assert.ok(hand);
  const handBox = new THREE.Box3();
  for (let vertex = hand.start; vertex < hand.end; vertex += 1)
    handBox.expandByPoint(
      new THREE.Vector3().fromBufferAttribute(position, vertex),
    );
  const handSize = handBox.getSize(new THREE.Vector3());
  // The palm is wider than it is tall, but remains below the old block's
  // silhouette width and has a short, grip-friendly depth.
  assert.ok(handSize.x <= 0.23);
  assert.ok(handSize.y <= 0.23);
  assert.ok(handSize.z <= 0.23);
  assert.ok(handSize.x > handSize.y);
  assert.ok(handSize.y > 0.1);

  const armTriangles = position.count / 3;
  assert.ok(armTriangles <= CHARACTER_FACETED_PROFILE.maxTriangles);
  arm.dispose();
});

void test('an invisible character proxy remains an authoritative raycast target', () => {
  const proxy = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 6),
    new THREE.MeshBasicMaterial(),
  );
  proxy.visible = false;
  proxy.userData.part = 'head';
  proxy.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 2),
    new THREE.Vector3(0, 0, -1),
  );
  const hit = raycaster.intersectObject(proxy, false)[0];
  assert.ok(hit);
  assert.equal(hit.object, proxy);
  assert.equal(hit.object.userData.part, 'head');
  proxy.geometry.dispose();
  (proxy.material as THREE.Material).dispose();
});

void test('CT helmet rim overlaps the dome instead of leaving a sky slit', () => {
  const helmet = createFacetedHeadCueGeometry('ct');
  const positions = helmet.getAttribute('position');
  // The final box contributes 36 non-indexed vertices after mergeParts.
  const dome = new THREE.Box3();
  const rim = new THREE.Box3();
  const vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    (index < positions.count - 36 ? dome : rim).expandByPoint(vertex);
  }
  assert.ok(
    rim.max.y > dome.min.y + 0.015,
    'helmet components must overlap vertically',
  );
  assert.ok(rim.intersectsBox(dome));
  helmet.dispose();
});
