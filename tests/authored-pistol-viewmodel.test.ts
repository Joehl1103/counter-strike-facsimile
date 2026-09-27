import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FIREARMS, getWeaponEquipDelay } from '../app/game-rules.ts';
import {
  AUTHORED_PISTOL_ASSET_URL,
  createAuthoredPistolViewmodel,
  createAuthoredPistolViewmodelTemplate,
} from '../app/authored-pistol-viewmodel.ts';

Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
Object.defineProperty(globalThis, 'createImageBitmap', {
  configurable: true, value: async () => ({ width: 512, height: 512, close() {} }),
});

const assetBytes = await readFile(new URL(`../public${AUTHORED_PISTOL_ASSET_URL}`, import.meta.url));
const template = createAuthoredPistolViewmodelTemplate(await new GLTFLoader().parseAsync(
  assetBytes.buffer.slice(assetBytes.byteOffset, assetBytes.byteOffset + assetBytes.byteLength), '',
));

function skinnedMeshes(root: THREE.Object3D) {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse((object) => { if (object instanceof THREE.SkinnedMesh) meshes.push(object); });
  return meshes;
}

function triangleCount(meshes: readonly THREE.SkinnedMesh[]) {
  return meshes.reduce((total, mesh) => total +
    (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
}

void test('the exported Glock preserves its tagged multi-material arms and pistol leaves', () => {
  const first = createAuthoredPistolViewmodel(template, new THREE.PointLight());
  const second = createAuthoredPistolViewmodel(template, new THREE.PointLight());
  const meshes = skinnedMeshes(first.root);
  const arms = meshes.filter((mesh) => mesh.userData.viewmodelArm === true);
  const pistol = meshes.filter((mesh) => mesh.userData.secondaryWeaponGeometry === true);
  assert.equal(first.root.name, 'glock18-viewmodel');
  assert.equal(arms.length, 2, 'the complete hand/arm assembly has two material leaves');
  assert.equal(pistol.length, 4, 'the Glock must preserve its four gun material leaves');
  assert.equal(triangleCount(arms), 3920);
  assert.equal(triangleCount(pistol), 2255);
  assert.equal(meshes.length, arms.length + pistol.length);
  for (const mesh of meshes) {
    assert.ok(mesh.geometry.getAttribute('uv'));
    const peer = skinnedMeshes(second.root).find((candidate) => candidate.name === mesh.name)!;
    assert.notEqual(mesh.geometry, peer.geometry);
    assert.notEqual(mesh.material, peer.material);
    assert.notEqual(mesh.skeleton, peer.skeleton);
  }
  first.authoredAnimation!.dispose();
  second.authoredAnimation!.dispose();
});

void test('Glock sockets keep metre-sized effects on the animated weapon across every clip', () => {
  const model = createAuthoredPistolViewmodel(template, new THREE.PointLight());
  const muzzleSocket = model.root.getObjectByName('muzzle-socket')!;
  const ejectionSocket = model.root.getObjectByName('ejection-socket')!;
  const main = model.root.getObjectByName('Main')!;
  const slide = model.root.getObjectByName('Slide')!;
  assert.ok(muzzleSocket && ejectionSocket && main && slide);
  const camera = new THREE.PerspectiveCamera(74, 16 / 9, .05, 180);
  const idleMuzzle = new THREE.Vector3();
  const idleSlide = new THREE.Vector3();
  const samples = [
    { name: 'Idle', clock: { nowMs: template.clips.Idle.duration * 500 } },
    { name: 'Fire', clock: { nowMs: 45, fireStartedAtMs: 0 } },
    { name: 'Reload', clock: { nowMs: FIREARMS.glock18.reloadMs / 2,
      reload: { startedAt: 0, completesAt: FIREARMS.glock18.reloadMs } } },
    { name: 'Equip', clock: { nowMs: getWeaponEquipDelay('glock18') / 2,
      equip: { startedAt: 0, completesAt: getWeaponEquipDelay('glock18') } } },
  ] as const;
  for (const { name, clock } of samples) {
    model.authoredAnimation!.sample(clock);
    const muzzle = model.muzzle.getWorldPosition(new THREE.Vector3());
    const ejection = ejectionSocket.getWorldPosition(new THREE.Vector3());
    const socketForward = new THREE.Vector3(0, -1, 0).transformDirection(muzzleSocket.matrixWorld);
    const effectForward = new THREE.Vector3(0, 0, -1).transformDirection(model.muzzle.matrixWorld);
    assert.ok(muzzle.toArray().every(Number.isFinite), `${name} muzzle position`);
    assert.ok(ejection.toArray().every(Number.isFinite), `${name} ejection position`);
    assert.ok(THREE.MathUtils.radToDeg(socketForward.angleTo(effectForward)) <= .5,
      `${name} flash must retain the socket's animated barrel direction`);
    assert.ok(model.muzzle.getWorldPosition(new THREE.Vector3())
      .distanceTo(muzzleSocket.getWorldPosition(new THREE.Vector3())) < 1e-12);
    assert.ok(model.muzzle.getWorldScale(new THREE.Vector3())
      .distanceTo(new THREE.Vector3(1, 1, 1)) < 1e-6);
    for (const aspect of [4 / 3, 16 / 9]) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      const projected = muzzle.clone().project(camera);
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1,
        `${name} muzzle must stay inside the game camera at ${aspect}:1`);
    }
    if (name === 'Idle') {
      idleMuzzle.copy(muzzle);
      idleSlide.copy(main.worldToLocal(slide.getWorldPosition(new THREE.Vector3())));
    }
  }
  model.authoredAnimation!.sample({ nowMs: 45, fireStartedAtMs: 0 });
  assert.ok(main.worldToLocal(slide.getWorldPosition(new THREE.Vector3())).distanceTo(idleSlide) > .001,
    'Fire must move Slide relative to Main');
  model.authoredAnimation!.sample({ nowMs: FIREARMS.glock18.reloadMs / 2,
    reload: { startedAt: 0, completesAt: FIREARMS.glock18.reloadMs } });
  assert.ok(model.muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(idleMuzzle) > .01,
    'Reload must move the pistol muzzle with the authored hand rig');
  model.authoredAnimation!.dispose();
});
