import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { inspectGraphicsBudget } from '../app/graphics-budget.ts';
import { batchStaticVisualMeshes } from '../app/static-visual-batching.ts';

void test('batches tagged visual meshes while preserving triangle count and render state', () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xc9a36f });
  for (let index = 0; index < 3; index += 1) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.position.x = index * 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.userData.visualOnly = true;
    mesh.userData.staticVisualBatch = true;
    root.add(mesh);
  }
  const before = inspectGraphicsBudget(root);
  const result = batchStaticVisualMeshes(root);
  const after = inspectGraphicsBudget(root);

  assert.deepEqual(result, {
    sourceMeshes: 3,
    batchedMeshes: 1,
    drawProxiesRemoved: 2,
  });
  assert.equal(after.visibleDrawProxies, 1);
  assert.equal(after.visibleTriangles, before.visibleTriangles);
  const batch = root.children[0] as THREE.Mesh;
  assert.equal(batch.material, material);
  assert.equal(batch.castShadow, true);
  assert.equal(batch.receiveShadow, true);
  assert.equal(batch.frustumCulled, false);
  assert.deepEqual(batch.geometry.boundingBox?.min.toArray(), [-0.5, -0.5, -0.5]);
  assert.deepEqual(batch.geometry.boundingBox?.max.toArray(), [4.5, 0.5, 0.5]);
});

void test('skips parent meshes so unbatched descendants stay attached', () => {
  const root = new THREE.Group();
  const material = new THREE.MeshBasicMaterial();
  for (let index = 0; index < 2; index += 1) {
    const parent = new THREE.Mesh(new THREE.BoxGeometry(), material);
    parent.userData.visualOnly = true;
    parent.userData.staticVisualBatch = true;
    parent.add(new THREE.Mesh(new THREE.PlaneGeometry(), material));
    root.add(parent);
  }
  assert.equal(batchStaticVisualMeshes(root).drawProxiesRemoved, 0);
  assert.equal(root.children.length, 2);
  assert.ok(root.children.every((parent) => parent.children.length === 1));
});

void test('skips untagged, transparent-state mismatches, instanced and skinned meshes', () => {
  const root = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 });
  const tagged = new THREE.Mesh(new THREE.PlaneGeometry(), material);
  tagged.userData.visualOnly = true;
  tagged.userData.staticVisualBatch = true;
  tagged.renderOrder = 1;
  const differentOrder = tagged.clone();
  differentOrder.renderOrder = 2;
  const untagged = new THREE.Mesh(new THREE.PlaneGeometry(), material);
  const instanced = new THREE.InstancedMesh(new THREE.PlaneGeometry(), material, 2);
  instanced.userData.visualOnly = true;
  instanced.userData.staticVisualBatch = true;
  const skinned = new THREE.SkinnedMesh(new THREE.PlaneGeometry(), material);
  skinned.userData.visualOnly = true;
  skinned.userData.staticVisualBatch = true;
  root.add(tagged, differentOrder, untagged, instanced, skinned);

  assert.deepEqual(batchStaticVisualMeshes(root), {
    sourceMeshes: 0,
    batchedMeshes: 0,
    drawProxiesRemoved: 0,
  });
  assert.equal(root.children.length, 5);
});

void test('does not flatten candidates below hidden ancestors', () => {
  const root = new THREE.Group();
  const hidden = new THREE.Group();
  hidden.visible = false;
  const material = new THREE.MeshBasicMaterial();
  for (let index = 0; index < 2; index += 1) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    mesh.userData.visualOnly = true;
    mesh.userData.staticVisualBatch = true;
    hidden.add(mesh);
  }
  root.add(hidden);
  assert.equal(batchStaticVisualMeshes(root).drawProxiesRemoved, 0);
  assert.equal(hidden.children.length, 2);
});

void test('may batch below an invisible root without changing effective visibility', () => {
  const root = new THREE.Group();
  root.visible = false;
  const material = new THREE.MeshBasicMaterial();
  for (let index = 0; index < 2; index += 1) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    mesh.userData.visualOnly = true;
    mesh.userData.staticVisualBatch = true;
    root.add(mesh);
  }
  assert.equal(batchStaticVisualMeshes(root).drawProxiesRemoved, 1);
  assert.equal(root.visible, false);
  assert.equal(inspectGraphicsBudget(root).visibleDrawProxies, 0);
});

void test('explicit scope preserves nested transforms and releases unshared source geometry', () => {
  const root = new THREE.Group();
  root.position.set(4, 2, -3);
  const nested = new THREE.Group();
  nested.position.set(2, 0, 0);
  root.add(nested);
  const material = new THREE.MeshBasicMaterial();
  const geometries: THREE.BufferGeometry[] = [];
  let disposals = 0;
  for (let index = 0; index < 2; index += 1) {
    const geometry = new THREE.BoxGeometry();
    geometry.addEventListener('dispose', () => {
      disposals += 1;
    });
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = index * 2;
    mesh.userData.visualOnly = true;
    mesh.userData.staticVisualBatch = true;
    mesh.userData.staticVisualBatchScope = root.uuid;
    nested.add(mesh);
  }

  batchStaticVisualMeshes(root);
  const batch = root.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh;
  assert.ok(batch);
  assert.deepEqual(batch.geometry.boundingBox?.min.toArray(), [1.5, -0.5, -0.5]);
  assert.deepEqual(batch.geometry.boundingBox?.max.toArray(), [4.5, 0.5, 0.5]);
  assert.equal(disposals, 2);
  assert.ok(geometries.every((geometry) => geometry !== batch.geometry));
});
