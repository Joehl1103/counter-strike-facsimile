import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createSkinnedCharacterInstance, createSkinnedCharacterTemplate,
  disposeSkinnedCharacterInstance, sampleSkinnedCharacterPose,
  applySkinnedCharacterDeathPose, resetSkinnedCharacterDeathPose,
  SKINNED_CHARACTER_TRIANGLE_BUDGET, SKINNED_CHARACTER_DRAW_BUDGET,
} from '../app/skinned-character-visuals.ts';
import { getBotDeathPose, BOT_DEATH_DURATION_SECONDS } from '../app/death-poses.ts';

async function loadNativeTemplate() {
  const source = readFileSync(new URL('../public/assets/characters/ct-mpfb.glb', import.meta.url));
  const jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString()) as {
    materials: { pbrMetallicRoughness?: { baseColorTexture?: unknown } }[];
  };
  // Skeletal checks do not need an image decoder. Keep all original binary
  // geometry/skin/animation bytes and remove only these texture references.
  for (const material of json.materials)
    if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const paddedLength = Math.ceil(jsonBytes.length / 4) * 4;
  const binary = source.subarray(20 + jsonLength);
  const output = Buffer.alloc(20 + paddedLength + binary.length, 0x20);
  source.copy(output, 0, 0, 12);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(paddedLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonBytes.copy(output, 20);
  binary.copy(output, 20 + paddedLength);
  const gltf = await new GLTFLoader().parseAsync(
    output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength), '',
  );
  return createSkinnedCharacterTemplate(gltf, 'authored');
}

function skins(root: THREE.Object3D): THREE.SkinnedMesh[] {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse((object) => { if (object instanceof THREE.SkinnedMesh) meshes.push(object); });
  return meshes;
}

function fullSkinBounds(instance: ReturnType<typeof createSkinnedCharacterInstance>) {
  instance.visualRoot.updateMatrixWorld(true);
  const inverseRoot = instance.visualRoot.matrixWorld.clone().invert();
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  for (const mesh of skins(instance.model)) {
    mesh.skeleton.update();
    const toRoot = inverseRoot.clone().multiply(mesh.matrixWorld);
    for (let index = 0; index < mesh.geometry.getAttribute('position').count; index += 1) {
      mesh.getVertexPosition(index, point).applyMatrix4(toRoot);
      assert.ok(point.toArray().every(Number.isFinite), `${mesh.name} vertex ${index}`);
      bounds.expandByPoint(point);
    }
  }
  return bounds;
}

void test('native CT preserves its authored mesh within budgets and isolates live skeletons and materials', async () => {
  const template = await loadNativeTemplate();
  const first = createSkinnedCharacterInstance(template, 'ct');
  const second = createSkinnedCharacterInstance(template, 'ct');
  try {
    const original = skins(template.scene);
    const firstSkins = skins(first.model);
    const secondSkins = skins(second.model);
    assert.equal(firstSkins.length, 2);
    assert.ok(firstSkins.length <= SKINNED_CHARACTER_DRAW_BUDGET);
    const triangles = firstSkins.reduce((sum, mesh) => sum +
      (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
    assert.ok(triangles <= SKINNED_CHARACTER_TRIANGLE_BUDGET);
    assert.equal(first.model.getObjectByName('classic-uniform-skinned-body'), undefined);
    firstSkins.forEach((mesh, index) => {
      assert.equal(mesh.geometry, original[index].geometry);
      assert.equal(mesh.geometry, secondSkins[index].geometry);
      assert.notEqual(mesh.material, original[index].material);
      assert.notEqual(mesh.material, secondSkins[index].material);
      assert.equal(mesh.skeleton.bones.length, 52);
      assert.notEqual(mesh.skeleton.bones[0], original[index].skeleton.bones[0]);
      assert.notEqual(mesh.skeleton.bones[0], secondSkins[index].skeleton.bones[0]);
    });
    assert.ok(first.dominantPalmAnchor.position.length() < 0.15);
    assert.ok(first.dominantPalmAnchor.position.length() > 0.02);
    const upWorld = first.pelvisUpInParent.clone().applyMatrix3(new THREE.Matrix3()
      .setFromMatrix4(first.bones['mixamorig:Hips'].parent!.matrixWorld));
    assert.ok(upWorld.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6);
    let sourceDisposed = 0;
    original[0].geometry.addEventListener('dispose', () => { sourceDisposed += 1; });
    const instanceSkeletons = new Set(firstSkins.map((mesh) => mesh.skeleton));
    let disposedBoneTextures = 0;
    for (const skeleton of instanceSkeletons) {
      skeleton.computeBoneTexture();
      skeleton.boneTexture!.addEventListener('dispose', () => { disposedBoneTextures += 1; });
    }
    disposeSkinnedCharacterInstance(first);
    assert.equal(sourceDisposed, 0);
    assert.equal(disposedBoneTextures, instanceSkeletons.size,
      'faction swaps and renderer cleanup must release each instance bone texture');
    sampleSkinnedCharacterPose(second, { speed: 2.4, phase: 1 });
    assert.ok(fullSkinBounds(second).getSize(new THREE.Vector3()).y > 1.5);
  } finally {
    disposeSkinnedCharacterInstance(first);
    disposeSkinnedCharacterInstance(second);
  }
});

void test('native crouch lowers the head moderately and keeps the carried weapon below the face', async () => {
  const instance = createSkinnedCharacterInstance(await loadNativeTemplate(), 'ct');
  const headPosition = () => instance.bones['mixamorig:Head'].getWorldPosition(new THREE.Vector3());
  try {
    sampleSkinnedCharacterPose(instance, { speed: 0 }, { elapsedSeconds: 1 });
    const standingHead = headPosition();
    sampleSkinnedCharacterPose(instance, {
      speed: 0, pelvisLift: -0.28, weaponSocketY: 1.2 - 0.28 - 0.08 * 0.08,
      leftHipPitch: 0.55, rightHipPitch: 0.55,
      leftKneePitch: -1.05, rightKneePitch: -1.05,
      leftAnklePitch: 0.5, rightAnklePitch: 0.5,
    }, { elapsedSeconds: 1 });
    const crouchedHead = headPosition();
    const headDrop = standingHead.y - crouchedHead.y;
    assert.ok(headDrop > 0.1 && headDrop < 0.45, `head drop ${headDrop}m`);
    const weaponPosition = instance.weaponSocket.getWorldPosition(new THREE.Vector3());
    assert.ok(crouchedHead.y - weaponPosition.y > 0.05, 'weapon must remain below the face');
    assert.ok(Math.abs(fullSkinBounds(instance).min.y) < 0.02);
  } finally {
    disposeSkinnedCharacterInstance(instance);
  }
});

void test('native CT living and death poses remain finite and within two centimetres of the ground', async () => {
  const instance = createSkinnedCharacterInstance(await loadNativeTemplate(), 'ct');
  instance.visualRoot.position.set(4, 2, -3);
  instance.visualRoot.rotation.y = 0.6;
  const worldPosition = (object: THREE.Object3D) => object.getWorldPosition(new THREE.Vector3());
  try {
    for (const speed of [0, 2.4, 4.8]) {
      for (let phaseIndex = 0; phaseIndex < 16; phaseIndex += 1) {
        const pose = { speed, phase: phaseIndex * Math.PI / 8,
          pelvisLift: phaseIndex % 2 ? -0.28 : 0,
          weaponSocketY: 1.2 + (phaseIndex % 2 ? -0.28 : 0),
          visualAimPitch: phaseIndex % 2 ? 0.24 : -0.24, upperBodyYaw: 0.3 };
        sampleSkinnedCharacterPose(instance, pose, { elapsedSeconds: phaseIndex / 10 });
        const bounds = fullSkinBounds(instance);
        assert.ok(Math.abs(bounds.min.y) <= 0.02, `speed ${speed}, phase ${phaseIndex}: ${bounds.min.y}`);
        assert.ok(bounds.getSize(new THREE.Vector3()).y < 2.5);
        assert.ok(worldPosition(instance.dominantPalmAnchor).distanceTo(worldPosition(instance.dominantGripTarget)) < 0.025);
        assert.ok(worldPosition(instance.supportPalmAnchor).distanceTo(worldPosition(instance.supportGripTarget)) < 0.025,
          `support hand: speed ${speed}, phase ${phaseIndex}`);
      }
    }
    for (const variant of [0, 1, 2, 3] as const) {
      sampleSkinnedCharacterPose(instance, { speed: 0 });
      applySkinnedCharacterDeathPose(instance, getBotDeathPose(0, variant));
      applySkinnedCharacterDeathPose(instance, getBotDeathPose(BOT_DEATH_DURATION_SECONDS, variant));
      const bounds = fullSkinBounds(instance);
      assert.ok(Math.abs(bounds.min.y) <= 0.02, `death ${variant}: ${bounds.min.y}`);
      resetSkinnedCharacterDeathPose(instance);
    }
    const pose = { speed: 0, pelvisLift: -0.28, upperBodyYaw: 0.3, visualAimPitch: 0.2 };
    sampleSkinnedCharacterPose(instance, pose, { elapsedSeconds: 1 });
    const original = Object.values(instance.bones).map((bone) => bone.matrixWorld.clone());
    for (let frame = 0; frame < 20; frame += 1)
      sampleSkinnedCharacterPose(instance, pose, { elapsedSeconds: 1 });
    Object.values(instance.bones).forEach((bone, index) =>
      bone.matrixWorld.elements.forEach((value, component) =>
        assert.ok(Math.abs(value - original[index].elements[component]) < 1e-9)));
  } finally {
    disposeSkinnedCharacterInstance(instance);
  }
});
