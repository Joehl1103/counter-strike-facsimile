import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  DUSTLINE_TRAVEL_SURFACE_RIBBONS,
  TRAVEL_SURFACE_HEIGHT,
  TRAVEL_SURFACE_SEGMENTS_PER_RIBBON,
  TRAVEL_SURFACE_TILE_METERS,
  TRAVEL_SURFACE_TRIANGLE_BUDGET,
  createTravelSurfaceGeometry,
  createTravelSurfaceMesh,
  travelSurfaceTriangleCount,
  type TravelSurfaceRibbon,
} from '../app/travel-surface-detail.ts';

void test('one merged network covers center and both sparse outer lanes', () => {
  const geometry = createTravelSurfaceGeometry();
  assert.deepEqual(
    geometry.userData.ribbonNames,
    DUSTLINE_TRAVEL_SURFACE_RIBBONS.map(({ name }) => name),
  );
  assert.equal(
    travelSurfaceTriangleCount(geometry),
    DUSTLINE_TRAVEL_SURFACE_RIBBONS.length *
      TRAVEL_SURFACE_SEGMENTS_PER_RIBBON *
      2,
  );
  assert.ok(
    travelSurfaceTriangleCount(geometry) <= TRAVEL_SURFACE_TRIANGLE_BUDGET,
  );
  assert.ok((geometry.boundingBox?.min.x ?? 0) < -32);
  assert.ok((geometry.boundingBox?.max.x ?? 0) > 32);
  assert.ok((geometry.boundingBox?.min.z ?? 0) <= -32);
  assert.ok((geometry.boundingBox?.max.z ?? 0) >= 32);
  geometry.dispose();
});

void test('ribbon boundaries are deterministic, jagged, and physically tiled', () => {
  const ribbon = Object.freeze({
    name: 'test-east-lane',
    start: Object.freeze([27, -30] as const),
    end: Object.freeze([27, 30] as const),
    halfWidth: 3,
    seed: 701,
  });
  const first = createTravelSurfaceGeometry([ribbon]);
  const second = createTravelSurfaceGeometry([ribbon]);
  assert.deepEqual(
    Array.from(first.getAttribute('position').array),
    Array.from(second.getAttribute('position').array),
  );
  const positions = first.getAttribute('position');
  const uvs = first.getAttribute('uv');
  const widths = new Set<number>();
  for (
    let segment = 0;
    segment <= TRAVEL_SURFACE_SEGMENTS_PER_RIBBON;
    segment++
  ) {
    const left = segment * 2;
    const right = left + 1;
    widths.add(
      Math.round(Math.abs(positions.getX(right) - positions.getX(left)) * 100),
    );
    for (const index of [left, right]) {
      assert.equal(
        uvs.getX(index),
        positions.getX(index) / TRAVEL_SURFACE_TILE_METERS,
      );
      assert.equal(
        uvs.getY(index),
        positions.getZ(index) / TRAVEL_SURFACE_TILE_METERS,
      );
      assert.equal(positions.getY(index), 0);
    }
  }
  assert.ok(widths.size > 8);
  first.dispose();
  second.dispose();
});

void test('travel surface mesh is one visual-only non-authoritative draw', () => {
  const material = new THREE.MeshStandardMaterial();
  const mesh = createTravelSurfaceMesh(material);
  assert.equal(mesh.material, material);
  assert.equal(mesh.position.y, TRAVEL_SURFACE_HEIGHT);
  assert.equal(mesh.castShadow, false);
  assert.equal(mesh.receiveShadow, true);
  assert.equal(mesh.userData.visualOnly, true);
  assert.equal((mesh.raycast as unknown as () => void)(), undefined);
  assert.equal(mesh.geometry.getAttribute('normal').getY(0) > 0, true);
  mesh.geometry.dispose();
  material.dispose();
});

void test('invalid ribbons fail closed without corrupting valid geometry', () => {
  const invalid = {
    name: 'invalid',
    start: [0, 0],
    end: [0, 0],
    halfWidth: Number.NaN,
    seed: 1,
  } as const satisfies TravelSurfaceRibbon;
  const valid = DUSTLINE_TRAVEL_SURFACE_RIBBONS[0];
  const geometry = createTravelSurfaceGeometry([invalid, valid]);
  assert.deepEqual(geometry.userData.ribbonNames, [valid.name]);
  assert.equal(
    travelSurfaceTriangleCount(geometry),
    TRAVEL_SURFACE_SEGMENTS_PER_RIBBON * 2,
  );
  geometry.dispose();
});
