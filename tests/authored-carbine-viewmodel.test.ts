import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FIREARMS, getWeaponEquipDelay } from '../app/game-rules.ts';
import {
  resolveAuthoredViewmodelSample, createAuthoredViewmodelTemplate,
  createAuthoredCarbineViewmodel, AUTHORED_CARBINE_ASSET_URL,
} from '../app/authored-carbine-viewmodel.ts';

const durations = { Idle: 5, Fire: 0.5, Reload: 3.5, Equip: 0.8 };

// The real GLB supplies geometry, skins, clips and texture bindings. Pixel
// appearance is separately checked in the browser; Node has no image decoder.
Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
Object.defineProperty(globalThis, 'createImageBitmap', {
  configurable: true, value: async () => ({ width: 512, height: 512, close() {} }),
});
const assetBytes = await readFile(new URL(`../public${AUTHORED_CARBINE_ASSET_URL}`, import.meta.url));
const template = createAuthoredViewmodelTemplate(await new GLTFLoader().parseAsync(
  assetBytes.buffer.slice(assetBytes.byteOffset, assetBytes.byteOffset + assetBytes.byteLength), '',
));

function skinnedMeshes(root: THREE.Object3D) {
  const result: THREE.SkinnedMesh[] = [];
  root.traverse((object) => { if (object instanceof THREE.SkinnedMesh) result.push(object); });
  return result;
}

void test('the served M4 stays textured and within budget, with its muzzle in the game camera', () => {
  const model = createAuthoredCarbineViewmodel(template, new THREE.PointLight());
  const meshes = skinnedMeshes(model.root);
  const armMeshes = meshes.filter((mesh) => mesh.userData.viewmodelArm);
  const rifleMeshes = meshes.filter((mesh) => mesh.userData.primaryWeaponGeometry);
  const triangleCount = (mesh: THREE.SkinnedMesh) =>
    (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  assert.equal(armMeshes.length, 2, 'skin and glove leaves must both retain their arm classification');
  assert.equal(rifleMeshes.length, 1);
  assert.ok(meshes.length <= 3, 'the material split must stay within the viewmodel draw ceiling');
  // Measure the whole arm surface: a material partition must not multiply its budget.
  assert.ok(armMeshes.reduce((total, mesh) => total + triangleCount(mesh), 0) <= 4000);
  assert.ok(rifleMeshes.reduce((total, mesh) => total + triangleCount(mesh), 0) <= 3500);
  for (const mesh of meshes) {
    assert.ok(mesh.userData.viewmodelArm || mesh.userData.primaryWeaponGeometry);
    assert.ok((mesh.material as THREE.MeshStandardMaterial).map);
    assert.ok(mesh.geometry.getAttribute('uv'));
  }
  for (const aspect of [4 / 3, 16 / 9]) {
    const camera = new THREE.PerspectiveCamera(74, aspect, .05, 180);
    camera.updateMatrixWorld(true);
    const muzzle = model.muzzle.getWorldPosition(new THREE.Vector3());
    assert.ok(muzzle.z < -.05, 'the known Empty/camera basis defect puts the muzzle behind the camera');
    muzzle.project(camera);
    assert.ok(Math.abs(muzzle.x) < 1 && Math.abs(muzzle.y) < 1, 'idle muzzle must be visible at both aspects');
  }
  assert.ok(model.muzzle.getWorldScale(new THREE.Vector3()).distanceTo(new THREE.Vector3(1, 1, 1)) < 1e-6,
    'source centimetres must not shrink metre-sized muzzle effects');
  model.authoredAnimation!.dispose();
});

void test('the M4 muzzle keeps metre-sized attachments aligned through every authored action', () => {
  const model = createAuthoredCarbineViewmodel(template, new THREE.PointLight());
  const mainBone = model.root.getObjectByName('Main')!;
  const muzzleSocket = model.root.getObjectByName('muzzle-socket')!;
  const silencer = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .27, 10));
  // Use the generic attachment convention in page.tsx. Native and loaded
  // barrel-geometry measurements independently establish Main +X as forward.
  silencer.rotation.x = Math.PI / 2;
  silencer.position.set(0, 0, -.12);
  model.muzzle.add(silencer);
  const reload = { startedAt: 0, completesAt: FIREARMS.carbine.reloadMs };
  const equip = { startedAt: 0, completesAt: getWeaponEquipDelay('carbine') };
  for (const fraction of [0, .5, .999]) {
    const clocks = [
      { nowMs: fraction * durations.Idle * 1000 },
      { nowMs: fraction * durations.Fire * 1000, fireStartedAtMs: 0 },
      { nowMs: fraction * reload.completesAt, reload },
      { nowMs: fraction * equip.completesAt, equip },
    ];
    for (const clock of clocks) {
      model.authoredAnimation!.sample(clock);
      const barrelForward = new THREE.Vector3(1, 0, 0).transformDirection(mainBone.matrixWorld);
      const effectForward = new THREE.Vector3(0, 0, -1).transformDirection(model.muzzle.matrixWorld);
      assert.ok(THREE.MathUtils.radToDeg(effectForward.angleTo(barrelForward)) <= .5,
        `attachment forward must follow the barrel: ${JSON.stringify(clock)}`);
      const expectedCenter = muzzleSocket.getWorldPosition(new THREE.Vector3())
        .addScaledVector(barrelForward, .12);
      assert.ok(silencer.getWorldPosition(new THREE.Vector3()).distanceTo(expectedCenter) <= .0005);
      const firstEnd = silencer.localToWorld(new THREE.Vector3(0, -.135, 0));
      const secondEnd = silencer.localToWorld(new THREE.Vector3(0, .135, 0));
      assert.ok(Math.abs(firstEnd.distanceTo(secondEnd) - .27) < 1e-6);
      assert.equal(model.muzzle.parent, muzzleSocket);
      assert.ok(model.muzzle.getWorldPosition(new THREE.Vector3())
        .distanceTo(muzzleSocket.getWorldPosition(new THREE.Vector3())) < 1e-12);
      assert.ok(model.muzzle.getWorldScale(new THREE.Vector3())
        .distanceTo(new THREE.Vector3(1, 1, 1)) < 1e-6);
    }
  }
  silencer.geometry.dispose();
  (silencer.material as THREE.Material).dispose();
  model.authoredAnimation!.dispose();
});

void test('authored M4 reload moves the barrel and skin together without drift or shared instance state', () => {
  const first = createAuthoredCarbineViewmodel(template, new THREE.PointLight());
  const second = createAuthoredCarbineViewmodel(template, new THREE.PointLight());
  const initialMuzzle = first.muzzle.getWorldPosition(new THREE.Vector3());
  const secondMuzzle = second.muzzle.getWorldPosition(new THREE.Vector3());
  const reload = { startedAt: 0, completesAt: FIREARMS.carbine.reloadMs };
  first.authoredAnimation!.sample({ nowMs: reload.completesAt / 2, reload });
  const movedMuzzle = first.muzzle.getWorldPosition(new THREE.Vector3());
  assert.ok(movedMuzzle.distanceTo(initialMuzzle) > .05, 'reload must animate the gun, not just a static pose');
  for (const mesh of skinnedMeshes(first.root)) {
    const other = skinnedMeshes(second.root).find((candidate) => candidate.name === mesh.name)!;
    assert.notEqual(mesh.skeleton, other.skeleton);
    assert.notEqual(mesh.skeleton.bones[0], other.skeleton.bones[0]);
    assert.notEqual(mesh.geometry, other.geometry);
    assert.notEqual(mesh.material, other.material);
    for (let vertex = 0; vertex < mesh.geometry.getAttribute('position').count; vertex += 1)
      assert.ok(mesh.getVertexPosition(vertex, new THREE.Vector3()).toArray().every(Number.isFinite));
  }
  for (let sample = 0; sample < 20; sample += 1)
    first.authoredAnimation!.sample({ nowMs: reload.completesAt / 2, reload });
  assert.ok(first.muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(movedMuzzle) < 1e-12);
  assert.ok(second.muzzle.getWorldPosition(new THREE.Vector3()).distanceTo(secondMuzzle) < 1e-12);
  first.authoredAnimation!.dispose();
  first.authoredAnimation!.dispose();
  assert.throws(() => first.authoredAnimation!.sample({ nowMs: 0 }), /disposed/);
  second.authoredAnimation!.sample({ nowMs: 200 });
  second.authoredAnimation!.dispose();
});

void test('malformed action windows cannot feed nonfinite time into the animation mixer', () => {
  for (const window of [
    { startedAt: NaN, completesAt: 500 },
    { startedAt: 0, completesAt: Infinity },
    { startedAt: 500, completesAt: 500 },
    { startedAt: 500, completesAt: 0 },
  ]) {
    assert.throws(() => resolveAuthoredViewmodelSample({ nowMs: 100, reload: window }, durations), /timestamps/);
    assert.throws(() => resolveAuthoredViewmodelSample({ nowMs: 100, equip: window }, durations), /timestamps/);
  }
  assert.throws(() => resolveAuthoredViewmodelSample({ nowMs: 100 }, { ...durations, Idle: 0 }), /duration/);
});

void test('authored clips follow gameplay reload and equip clocks with explicit precedence', () => {
  const reload = { startedAt: 100, completesAt: 100 + FIREARMS.carbine.reloadMs };
  const equip = { startedAt: 100, completesAt: 100 + getWeaponEquipDelay('carbine') };
  assert.deepEqual(resolveAuthoredViewmodelSample({ nowMs: 100, reload, equip, fireStartedAtMs: 100 }, durations),
    { name: 'Reload', time: 0 });
  assert.deepEqual(resolveAuthoredViewmodelSample({ nowMs: (reload.startedAt + reload.completesAt) / 2, reload }, durations),
    { name: 'Reload', time: durations.Reload / 2 });
  assert.deepEqual(resolveAuthoredViewmodelSample({ nowMs: reload.completesAt, reload }, durations),
    { name: 'Reload', time: durations.Reload });
  assert.deepEqual(resolveAuthoredViewmodelSample({ nowMs: (equip.startedAt + equip.completesAt) / 2, equip, fireStartedAtMs: 100 }, durations),
    { name: 'Equip', time: durations.Equip / 2 });
  assert.equal(resolveAuthoredViewmodelSample({ nowMs: equip.completesAt, equip }, durations).name, 'Idle');
});

void test('committed automatic shots restart the visual clip, then return to deterministic idle', () => {
  assert.deepEqual(resolveAuthoredViewmodelSample({ nowMs: 300, fireStartedAtMs: 100 }, durations),
    { name: 'Fire', time: 0.2 });
  assert.deepEqual(resolveAuthoredViewmodelSample({ nowMs: 300, fireStartedAtMs: 300 }, durations),
    { name: 'Fire', time: 0 });
  const idle = resolveAuthoredViewmodelSample({ nowMs: 800, fireStartedAtMs: 300 }, durations);
  assert.equal(idle.name, 'Idle');
  assert.ok(Math.abs(idle.time - 0.8) < 1e-12);
  assert.ok(Math.abs(resolveAuthoredViewmodelSample({ nowMs: 5800 }, durations).time - idle.time) < 1e-12);
});
