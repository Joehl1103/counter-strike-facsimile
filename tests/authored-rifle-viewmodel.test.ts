import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AUTHORED_RIFLE_ASSET_URL, createAuthoredRifleViewmodel } from '../app/authored-rifle-viewmodel.ts';
import { PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS } from '../app/primary-weapon-models.ts';
import { FIREARMS, writeWeaponReloadPose } from '../app/game-rules.ts';

Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
Object.defineProperty(globalThis, 'createImageBitmap', {
  configurable: true, value: async () => ({ width: 1254, height: 1254, close() {} }),
});
const bytes = await readFile(new URL(`../public${AUTHORED_RIFLE_ASSET_URL}`, import.meta.url));
const template = (await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
)).scene;

function meshes(root: THREE.Object3D) {
  const result: THREE.Mesh[] = [];
  root.traverse((object) => { if (object instanceof THREE.Mesh) result.push(object); });
  return result;
}

function worldPoints(mesh: THREE.Mesh) {
  const positions = mesh.geometry.getAttribute('position');
  return Array.from({ length: positions.count }, (_, index) =>
    new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld));
}

void test('authored AK retains the gameplay light and owns a bounded textured mesh assembly', () => {
  const flash = new THREE.PointLight(0xffaa55, 3, 2);
  const model = createAuthoredRifleViewmodel(template, flash);
  assert.equal(model.muzzle, flash);
  assert.equal(flash.parent, model.root);
  assert.equal(flash.userData.transient, true);
  assert.ok(flash.position.distanceTo(new THREE.Vector3(0, .006, -.972)) < .002);
  assert.deepEqual(flash.position.toArray(), model.root.getObjectByName('muzzle-socket')!.position.toArray());
  assert.ok(model.ejectionAnchor);
  assert.equal(model.ejectionAnchor, model.root.getObjectByName('ejection-socket'));
  assert.deepEqual(model.root.position.toArray(), PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS.rifle.position);
  const weapon = meshes(model.root).filter((mesh) => mesh.userData.primaryWeaponGeometry);
  const arms = meshes(model.root).filter((mesh) => mesh.userData.viewmodelArm);
  const triangleCount = (mesh: THREE.Mesh) => (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  assert.ok(weapon.length > 0, 'the export must identify its weapon meshes');
  assert.ok(arms.length > 0, 'the export must identify its arm meshes');
  assert.equal(weapon.length + arms.length, meshes(model.root).length, 'every rendered mesh belongs to the weapon or arms');
  assert.ok(weapon.length + arms.length <= 6, 'the combined assembly must stay within six mesh draws');
  assert.ok(weapon.reduce((sum, mesh) => sum + triangleCount(mesh), 0) <= 3500);
  assert.ok(arms.reduce((sum, mesh) => sum + triangleCount(mesh), 0) <= 4000);
  for (const mesh of [...weapon, ...arms]) {
    assert.ok(mesh.geometry.getAttribute('uv'));
    assert.ok((mesh.material as THREE.MeshStandardMaterial).map);
    assert.notEqual(mesh.geometry, meshes(template).find((source) => source.name === mesh.name)!.geometry);
  }
  model.root.updateMatrixWorld(true);
  const flashPosition = flash.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.min(...weapon.flatMap((mesh) => worldPoints(mesh).map((point) => point.distanceTo(flashPosition)))) < .025);
});

void test('AK first-person stock crop preserves the camera clearance and central sightline', () => {
  const model = createAuthoredRifleViewmodel(template, new THREE.PointLight());
  model.root.updateMatrixWorld(true);
  const weapon = meshes(model.root).filter((mesh) => mesh.userData.primaryWeaponGeometry);
  const weaponPoints = weapon.flatMap(worldPoints);
  assert.ok(Math.max(...weaponPoints.map((point) => point.z)) <= -.32);
  for (const aspect of [4 / 3, 16 / 9]) {
    const camera = new THREE.PerspectiveCamera(74, aspect, .05, 180);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    const projected = weaponPoints.map((point) => point.clone().project(camera));
    const minimumX = Math.min(...projected.map((point) => point.x));
    const minimumY = Math.min(...projected.map((point) => point.y));
    const maximumY = Math.max(...projected.map((point) => point.y));
    assert.ok(minimumX > .02, 'weapon must leave the crosshair column clear');
    assert.ok((1 - minimumX) / 2 <= .5);
    assert.ok((Math.min(1, maximumY) - Math.max(-1, minimumY)) / 2 <= .5);
    const muzzle = model.muzzle.getWorldPosition(new THREE.Vector3()).project(camera);
    assert.ok(muzzle.x > 0 && muzzle.x < 1 && muzzle.y > -1 && muzzle.y < 1);
  }
});

void test('authored AK hands remain attached through the retained reload envelope', () => {
  const model = createAuthoredRifleViewmodel(template, new THREE.PointLight());
  const mount = PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS.rifle;
  const armTransforms = meshes(model.root).filter((mesh) => mesh.userData.viewmodelArm)
    .map((mesh) => ({ mesh, matrix: mesh.matrix.clone() }));
  const pose = { positionX: 0, positionY: 0, positionZ: 0, rotationX: 0, rotationY: 0, rotationZ: 0 };
  assert.ok(FIREARMS.rifle.reloadMs > 0);
  for (let step = 0; step <= 40; step += 1) {
    writeWeaponReloadPose('rifle', step / 40, pose);
    model.root.position.set(mount.position[0] + pose.positionX, mount.position[1] + pose.positionY, mount.position[2] + pose.positionZ);
    model.root.rotation.set(mount.rotation[0] + pose.rotationX, mount.rotation[1] + pose.rotationY, mount.rotation[2] + pose.rotationZ);
    model.root.updateMatrixWorld(true);
    for (const { mesh, matrix } of armTransforms) {
      assert.deepEqual(mesh.matrix.elements, matrix.elements, 'root motion must not stretch or detach an arm');
    }
    for (const mesh of meshes(model.root)) {
      assert.ok(worldPoints(mesh).every((point) => point.z < -.07), 'reload geometry must remain beyond the near plane clearance');
    }
  }
});
