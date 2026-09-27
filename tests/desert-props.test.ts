import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
  DESERT_MOUNTAIN_PANORAMA_BOTTOM,
  DESERT_MOUNTAIN_PANORAMA_HEIGHT,
  DESERT_MOUNTAIN_PANORAMA_RADIUS,
  DESERT_MOUNTAIN_PANORAMA_SEGMENTS,
  DESERT_MOUNTAIN_PANORAMA_TEXTURE_BYTES,
  DESERT_MOUNTAIN_PANORAMA_TEXTURE_HEIGHT,
  DESERT_MOUNTAIN_PANORAMA_TEXTURE_WIDTH,
  DESERT_MOUNTAIN_PANORAMA_TRIANGLE_BUDGET,
  DESERT_PROP_DRAW_BUDGET,
  DESERT_PROP_TRIANGLE_BUDGET,
  createMountainPanoramaGeometry,
  createMountainPanoramaMesh,
  createPalmGrove,
  createPalmGroveGeometries,
  createStratifiedRockBatch,
  createStratifiedRockGeometry,
  geometryTriangleCount,
  type PalmPlacement,
  type RockPlacement,
} from '../app/desert-props.ts';
import { inspectGraphicsBudget } from '../app/graphics-budget.ts';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);

const palms: readonly PalmPlacement[] = [
  { x: -29.5, z: -15.5, scale: 0.9, lean: 0.55 },
  { x: 29.2, z: 17.5, scale: 0.78, lean: -0.42 },
];

const rocks: readonly RockPlacement[] = Array.from(
  { length: 33 },
  (_, index) => ({
    position: [index - 16, 0, index % 2 ? -15.5 : 15.5] as const,
    scale: [0.35 + (index % 3) * 0.1, 0.16 + (index % 4) * 0.04, 0.4] as const,
    rotation: [0, index * 0.37, 0] as const,
  }),
);

void test('panorama cylinder stays inside the sky and within 128 triangles', () => {
  const geometry = createMountainPanoramaGeometry();
  assert.equal(
    geometryTriangleCount(geometry),
    DESERT_MOUNTAIN_PANORAMA_SEGMENTS * 2,
  );
  assert.ok(
    geometryTriangleCount(geometry) <= DESERT_MOUNTAIN_PANORAMA_TRIANGLE_BUDGET,
  );
  assert.equal(geometry.boundingBox?.min.x, -DESERT_MOUNTAIN_PANORAMA_RADIUS);
  assert.equal(geometry.boundingBox?.max.x, DESERT_MOUNTAIN_PANORAMA_RADIUS);
  assert.equal(geometry.boundingBox?.min.z, -DESERT_MOUNTAIN_PANORAMA_RADIUS);
  assert.equal(geometry.boundingBox?.max.z, DESERT_MOUNTAIN_PANORAMA_RADIUS);
  assert.equal(geometry.boundingBox?.min.y, DESERT_MOUNTAIN_PANORAMA_BOTTOM);
  assert.equal(
    geometry.boundingBox?.max.y,
    DESERT_MOUNTAIN_PANORAMA_BOTTOM + DESERT_MOUNTAIN_PANORAMA_HEIGHT,
  );
  assert.ok(DESERT_MOUNTAIN_PANORAMA_RADIUS < 100);
  assert.ok(geometry.getAttribute('uv'));
  geometry.dispose();
});

void test('every indexed panorama face points inward without DoubleSide', () => {
  const geometry = createMountainPanoramaGeometry();
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  assert.ok(indices);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const radial = new THREE.Vector3();
  for (let index = 0; index < indices.count; index += 3) {
    a.fromBufferAttribute(positions, indices.getX(index));
    b.fromBufferAttribute(positions, indices.getX(index + 1));
    c.fromBufferAttribute(positions, indices.getX(index + 2));
    normal.subVectors(b, a).cross(c.clone().sub(a)).normalize();
    radial
      .copy(a)
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
    radial.y = 0;
    assert.ok(normal.dot(radial.normalize()) < -0.99);
  }
  geometry.dispose();
});

void test('panorama material uses baked alpha haze with authoritative depth', () => {
  const texture = new THREE.Texture();
  const mesh = createMountainPanoramaMesh(texture);
  const material = mesh.material as THREE.MeshBasicMaterial;
  assert.equal(material.map, texture);
  assert.equal(material.transparent, true);
  assert.equal(material.alphaTest, 0.03);
  assert.equal(material.depthTest, true);
  assert.equal(material.depthWrite, true);
  assert.equal(material.side, THREE.FrontSide);
  assert.equal(material.fog, false);
  assert.equal(material.toneMapped, false);
  assert.equal(mesh.castShadow, false);
  assert.equal(mesh.receiveShadow, false);
  assert.equal(mesh.userData.visualOnly, true);
  assert.equal((mesh.raycast as unknown as () => void)(), undefined);
  mesh.geometry.dispose();
  material.dispose();
  texture.dispose();
});

void test('page loads one mirrored sRGB panorama and fails closed', () => {
  assert.doesNotMatch(pageSource, /createTerrainHorizonMesh/);
  assert.match(
    pageSource,
    /'\/assets\/environment\/desert-mountain-panorama\.png'/,
  );
  assert.match(
    pageSource,
    /mountainPanoramaTexture\.colorSpace = THREE\.SRGBColorSpace/,
  );
  assert.match(
    pageSource,
    /mountainPanoramaTexture\.wrapS = THREE\.MirroredRepeatWrapping/,
  );
  assert.match(pageSource, /mountainPanoramaTexture\.repeat\.x = 2/);
  assert.match(pageSource, /mount\.dataset\.mountainPanoramaReady = 'loading'/);
  assert.match(pageSource, /mount\.dataset\.mountainPanoramaReady = 'ready'/);
  assert.match(pageSource, /mount\.dataset\.mountainPanoramaReady = 'error'/);
  assert.match(pageSource, /if \(!mountainPanoramaLoadActive\)/);
  assert.match(pageSource, /mountainPanoramaLoadActive = false/);
  assert.match(pageSource, /delete mount\.dataset\.mountainPanoramaReady/);
  assert.match(
    pageSource,
    /mountainPanorama\.visible = true;\s*mount\.dataset\.mountainPanoramaReady = 'ready';\s*publishGraphicsBudget\('ready'\)/,
  );
  assert.equal(
    DESERT_MOUNTAIN_PANORAMA_TEXTURE_BYTES,
    Math.ceil(
      DESERT_MOUNTAIN_PANORAMA_TEXTURE_WIDTH *
        DESERT_MOUNTAIN_PANORAMA_TEXTURE_HEIGHT *
        4 *
        (4 / 3),
    ),
  );
});

void test('palm grove uses broad ribbon leaves within its prior geometry budget', () => {
  const { trunkGeometry, leafGeometry } = createPalmGroveGeometries(palms);
  assert.equal(geometryTriangleCount(trunkGeometry), 160);
  assert.equal(geometryTriangleCount(leafGeometry), 192);
  assert.ok(leafGeometry.getAttribute('color'));
  assert.ok(leafGeometry.getAttribute('uv'));
  const box = leafGeometry.boundingBox;
  assert.ok(box && box.max.x - box.min.x > 5);
  assert.ok(box && box.max.z - box.min.z > 30);
  assert.ok(
    geometryTriangleCount(trunkGeometry) + geometryTriangleCount(leafGeometry) <
      1_456,
  );
  trunkGeometry.dispose();
  leafGeometry.dispose();
});

void test('rocks are grounded, faceted, stratified, and instanced in one draw', () => {
  const geometry = createStratifiedRockGeometry();
  assert.equal(geometryTriangleCount(geometry), 36);
  assert.equal(geometry.boundingBox?.min.y, 0);
  assert.equal(geometry.boundingBox?.max.y, 1);
  const color = geometry.getAttribute('color');
  const strata = new Set<string>();
  for (let index = 0; index < color.count; index += 1) {
    strata.add(
      `${color.getX(index).toFixed(2)},${color.getY(index).toFixed(2)},${color.getZ(index).toFixed(2)}`,
    );
  }
  assert.ok(strata.size >= 4);
  geometry.dispose();

  const batch = createStratifiedRockBatch(rocks);
  assert.equal(batch.count, 33);
  assert.equal(inspectGraphicsBudget(batch).visibleDrawProxies, 1);
  assert.equal(inspectGraphicsBudget(batch).visibleTriangles, 36 * 33);
  batch.geometry.dispose();
  (batch.material as THREE.Material).dispose();
});

void test('combined panorama, palms, and rocks stay below existing budgets', () => {
  const texture = new THREE.Texture();
  texture.userData.estimatedTextureBytes =
    DESERT_MOUNTAIN_PANORAMA_TEXTURE_BYTES;
  const root = new THREE.Group();
  const panorama = createMountainPanoramaMesh(texture);
  const palmGrove = createPalmGrove(palms, { map: texture });
  const rockBatch = createStratifiedRockBatch(rocks, { map: texture });
  root.add(panorama, palmGrove, rockBatch);
  const budget = inspectGraphicsBudget(root);
  assert.equal(budget.visibleDrawProxies, 4);
  assert.ok(budget.visibleDrawProxies <= DESERT_PROP_DRAW_BUDGET);
  assert.ok(budget.visibleTriangles <= DESERT_PROP_TRIANGLE_BUDGET);
  assert.equal(budget.uniqueTextures, 1);
  assert.equal(budget.textureBytes, DESERT_MOUNTAIN_PANORAMA_TEXTURE_BYTES);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => material.dispose());
  });
  texture.dispose();
});
