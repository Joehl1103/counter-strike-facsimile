import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  GRAPHICS_BUDGET_THRESHOLDS,
  estimateTextureBytes,
  inspectGraphicsBudget,
  inspectVisibleGeometryLoad,
} from '../app/graphics-budget.ts';

void test('inspects visible proxies, triangles, and shared resources deterministically', () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const texture = new THREE.Texture();
  const firstMaterial = new THREE.MeshStandardMaterial({ map: texture });
  const secondMaterial = new THREE.MeshBasicMaterial();
  scene.add(new THREE.Mesh(geometry, [firstMaterial, secondMaterial]));
  scene.add(new THREE.Mesh(geometry, firstMaterial));
  scene.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texture })));
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(1, 0, 0),
  ]), new THREE.LineBasicMaterial()));

  assert.deepEqual(inspectGraphicsBudget(scene), {
    visibleDrawProxies: 4,
    visibleTriangles: 26,
    uniqueGeometries: 3,
    uniqueTextures: 1,
    textureBytes: 0,
    uniqueMaterials: 4,
    persistentLights: 0,
    shadowCasters: 0,
    maxShadowMapSize: 0,
    thresholds: GRAPHICS_BUDGET_THRESHOLDS.high,
    withinThresholds: true,
  });
});

void test('compact geometry load honors ancestor visibility and instances', () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  root.add(new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), 3));
  const hidden = new THREE.Group();
  hidden.visible = false;
  hidden.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  root.add(hidden);
  assert.deepEqual(inspectVisibleGeometryLoad(root), {
    visibleDrawProxies: 2,
    visibleTriangles: 48,
  });
});

void test('quality caps are inclusive at their boundaries and fail above them', () => {
  const highScene = new THREE.Scene();
  const highGeometry = new THREE.BufferGeometry();
  highGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(Array.from({ length: 27 }, () => 0), 3),
  );
  const highInstances = new THREE.InstancedMesh(
    highGeometry,
    new THREE.MeshBasicMaterial(),
    60_000,
  );
  highScene.add(highInstances);
  assert.equal(inspectGraphicsBudget(highScene, 'high').visibleTriangles, 180_000);
  assert.equal(inspectGraphicsBudget(highScene, 'high').withinThresholds, true);

  highInstances.count = 60_001;
  assert.equal(inspectGraphicsBudget(highScene, 'high').withinThresholds, false);

  const performanceScene = new THREE.Scene();
  const performanceMaterial = new THREE.MeshBasicMaterial();
  for (let index = 0; index < 91; index += 1) {
    performanceScene.add(
      new THREE.Mesh(new THREE.BufferGeometry(), performanceMaterial),
    );
  }
  assert.equal(inspectGraphicsBudget(performanceScene, 'performance').withinThresholds, false);
});

void test('unique texture count remains a separate resource cap', () => {
  const scene = new THREE.Scene();
  for (let index = 0; index < 41; index += 1) {
    const texture = new THREE.Texture();
    scene.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texture })));
  }
  const budget = inspectGraphicsBudget(scene, 'performance');
  assert.equal(budget.uniqueTextures, 41);
  assert.equal(budget.withinThresholds, false);
});

void test('texture bytes use decoded dimensions, mipmaps, and shared identity', () => {
  const scene = new THREE.Scene();
  const texture = new THREE.Texture({ width: 1024, height: 1024 });
  texture.generateMipmaps = true;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), material));
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), material));
  const expected = Math.ceil(1024 * 1024 * 4 * (4 / 3));
  assert.equal(estimateTextureBytes(texture), expected);
  assert.equal(inspectGraphicsBudget(scene).textureBytes, expected);
});

void test('explicit texture-byte metadata covers not-yet-decoded assets', () => {
  const texture = new THREE.Texture();
  texture.userData.estimatedTextureBytes = 6 * 1024 * 1024;
  assert.equal(estimateTextureBytes(texture), 6 * 1024 * 1024);
});

void test('invisible subtrees do not contribute resources or lights', () => {
  const scene = new THREE.Scene();
  const hidden = new THREE.Group();
  hidden.visible = false;
  hidden.add(new THREE.Mesh(new THREE.TetrahedronGeometry(), new THREE.MeshBasicMaterial()));
  hidden.add(new THREE.DirectionalLight(0xffffff, 1));
  scene.add(hidden);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial()));

  const budget = inspectGraphicsBudget(scene);
  assert.equal(budget.visibleDrawProxies, 1);
  assert.equal(budget.uniqueGeometries, 1);
  assert.equal(budget.persistentLights, 0);
});

void test('lighting thresholds distinguish high and performance shadow policy', () => {
  const scene = new THREE.Scene();
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 512);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 1));

  assert.equal(inspectGraphicsBudget(scene, 'high').withinThresholds, true);
  assert.equal(inspectGraphicsBudget(scene, 'performance').withinThresholds, false);
});

void test('the high-quality sun may use its full 2048 shadow map', () => {
  const scene = new THREE.Scene();
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  // The shipped profile configures 2048; the budget must admit it, since a
  // 1024 map left the scene's only shadow too coarse to read as ground contact.
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 1));

  const budget = inspectGraphicsBudget(scene, 'high');
  assert.equal(budget.maxShadowMapSize, 2048);
  assert.equal(budget.withinThresholds, true);
});

void test('shadow maps beyond the documented ceiling are rejected', () => {
  const scene = new THREE.Scene();
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 1));

  assert.equal(inspectGraphicsBudget(scene, 'high').withinThresholds, false);
});

void test('transient visible lights are excluded while world lights remain counted', () => {
  const scene = new THREE.Scene();
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  hemisphere.userData.persistent = true;
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.userData.persistent = true;
  sun.castShadow = true;
  const muzzle = new THREE.PointLight(0xffb85a, 4, 2);
  muzzle.userData.transient = true;
  const blast = new THREE.PointLight(0xff4b2e, 2, 4);
  blast.userData.transient = true;
  scene.add(hemisphere, sun, muzzle, blast);

  const budget = inspectGraphicsBudget(scene, 'high');
  assert.equal(budget.persistentLights, 2);
  assert.equal(budget.shadowCasters, 1);
  assert.equal(budget.withinThresholds, true);
});
