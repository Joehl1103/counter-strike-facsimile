import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  CRATE_COLLIDER_SIZE,
  CRATE_DRAPE_SIZE,
  CRATE_DRAPE_TOP_Y,
  CRATE_DRAPE_VARIANTS,
  CRATE_VISUAL_PLACEMENTS,
  EXTERIOR_DUNE_HEIGHT_SEGMENTS,
  EXTERIOR_DUNE_PLACEMENTS,
  EXTERIOR_DUNE_WIDTH_SEGMENTS,
  EXTERIOR_MESA_BASE_RADIUS,
  EXTERIOR_MESA_HEIGHT_SEGMENTS,
  EXTERIOR_MESA_PLACEMENTS,
  EXTERIOR_MESA_RADIAL_SEGMENTS,
  EXTERIOR_VISUAL_TRIANGLE_BUDGET,
  EXTERIOR_WALL_EDGE,
  EXTERIOR_VISUAL_CLEARANCE,
  isExteriorPeakVisibleFromCenter,
  isExteriorVisualPlacement,
} from '../app/scene-layout.ts';

void test('crate visuals stay bounded to their authoritative cover', () => {
  assert.equal(CRATE_VISUAL_PLACEMENTS.length, 6);
  assert.equal(CRATE_DRAPE_VARIANTS.length, CRATE_VISUAL_PLACEMENTS.length);
  assert.ok((CRATE_DRAPE_SIZE - CRATE_COLLIDER_SIZE) / 2 <= 0.081);
  assert.ok(CRATE_DRAPE_TOP_Y > CRATE_COLLIDER_SIZE);
  assert.ok(CRATE_DRAPE_TOP_Y <= CRATE_COLLIDER_SIZE + 0.08);

  const centers = new Set<string>();
  CRATE_VISUAL_PLACEMENTS.forEach(([x, y, z]) => {
    assert.ok([x, y, z].every(Number.isFinite));
    centers.add(`${x},${y},${z}`);
  });
  assert.equal(centers.size, CRATE_VISUAL_PLACEMENTS.length);

  const coveredIndices = new Set<number>();
  CRATE_DRAPE_VARIANTS.forEach(({ crateIndex, materialIndex }) => {
    assert.ok(Number.isInteger(crateIndex));
    assert.ok(crateIndex >= 0 && crateIndex < CRATE_VISUAL_PLACEMENTS.length);
    assert.ok(Number.isInteger(materialIndex));
    assert.ok(materialIndex >= 0 && materialIndex < 3);
    coveredIndices.add(crateIndex);
  });
  assert.equal(coveredIndices.size, CRATE_VISUAL_PLACEMENTS.length);
});

void test('exterior silhouettes remain finite and outside the arena', () => {
  assert.equal(EXTERIOR_MESA_PLACEMENTS.length, 12);
  assert.equal(EXTERIOR_DUNE_PLACEMENTS.length, 6);
  const placements = [...EXTERIOR_MESA_PLACEMENTS, ...EXTERIOR_DUNE_PLACEMENTS];
  const centers = new Set<string>();
  placements.forEach(([x, z, scaleX, scaleY, scaleZ, rotationY]) => {
    assert.ok([x, z, scaleX, scaleY, scaleZ, rotationY].every(Number.isFinite));
    assert.ok(scaleX > 0 && scaleY > 0 && scaleZ > 0);
    assert.equal(
      isExteriorVisualPlacement(x, z, Math.max(scaleX, scaleZ)),
      true,
    );
    centers.add(`${x},${z}`);
  });
  assert.equal(centers.size, placements.length);
  EXTERIOR_MESA_PLACEMENTS.forEach(([x, z, scaleX, , scaleZ]) => {
    assert.equal(
      isExteriorVisualPlacement(
        x,
        z,
        Math.max(scaleX, scaleZ) * EXTERIOR_MESA_BASE_RADIUS,
      ),
      true,
    );
  });
  placements.forEach(([x, z, , scaleY]) => {
    assert.equal(isExteriorPeakVisibleFromCenter(x, z, scaleY), true);
  });
});

void test('exterior placement clearance rejects invalid and interior art', () => {
  const minimumEdge = EXTERIOR_WALL_EDGE + EXTERIOR_VISUAL_CLEARANCE;
  assert.equal(isExteriorVisualPlacement(0, 0, 1), false);
  assert.equal(isExteriorVisualPlacement(minimumEdge + 1, 0, 1), true);
  assert.equal(isExteriorVisualPlacement(minimumEdge + 0.99, 0, 1), false);
  assert.equal(isExteriorVisualPlacement(Number.NaN, 50, 1), false);
  assert.equal(
    isExteriorVisualPlacement(50, Number.POSITIVE_INFINITY, 1),
    false,
  );
  assert.equal(isExteriorVisualPlacement(50, 0, 0), false);
  assert.equal(isExteriorVisualPlacement(50, 0, -1), false);
  assert.equal(isExteriorPeakVisibleFromCenter(0, 0, 10), false);
  assert.equal(isExteriorPeakVisibleFromCenter(0, 50, 2), false);
  assert.equal(isExteriorPeakVisibleFromCenter(Number.NaN, 50, 10), false);
  assert.equal(
    isExteriorPeakVisibleFromCenter(50, Number.POSITIVE_INFINITY, 10),
    false,
  );
});

void test('exterior silhouettes stay inside the static triangle budget', () => {
  const mesaGeometry = new THREE.CylinderGeometry(
    1,
    EXTERIOR_MESA_BASE_RADIUS,
    1,
    EXTERIOR_MESA_RADIAL_SEGMENTS,
    EXTERIOR_MESA_HEIGHT_SEGMENTS,
  );
  const duneGeometry = new THREE.SphereGeometry(
    1,
    EXTERIOR_DUNE_WIDTH_SEGMENTS,
    EXTERIOR_DUNE_HEIGHT_SEGMENTS,
  );
  const triangleCount = (geometry: THREE.BufferGeometry) =>
    (geometry.index?.count ?? geometry.attributes.position.count) / 3;
  const totalTriangles =
    triangleCount(mesaGeometry) * EXTERIOR_MESA_PLACEMENTS.length +
    triangleCount(duneGeometry) * EXTERIOR_DUNE_PLACEMENTS.length;
  assert.ok(totalTriangles <= EXTERIOR_VISUAL_TRIANGLE_BUDGET);
  mesaGeometry.dispose();
  duneGeometry.dispose();
});
