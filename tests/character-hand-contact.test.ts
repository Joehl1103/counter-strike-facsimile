import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  createFacetedLimbGeometry,
  getCharacterLimbGeometryMetadata,
} from '../app/character-visuals.ts';
import {
  applyCharacterRigPose,
  applyCharacterRigWeaponAim,
  applyCharacterRigWeaponGripTargets,
  createCharacterRig,
  type CharacterRigWeaponGripOutput,
} from '../app/character-rig.ts';
import { createCharacterLimbDeformationController } from '../app/character-limb-deformation.ts';
import {
  createBotAnimationPose,
  createBotAnimationState,
  writeBotAnimationPose,
} from '../app/bot-animation.ts';

function handWorldBox(mesh: THREE.Mesh): THREE.Box3 {
  const metadata = getCharacterLimbGeometryMetadata(mesh.geometry);
  assert.ok(metadata);
  const range = metadata.segments.find(({ segment }) => segment === 'hand');
  assert.ok(range);
  const positions = mesh.geometry.getAttribute('position');
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let vertex = range.start; vertex < range.end; vertex += 1) {
    point.fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld);
    box.expandByPoint(point);
  }
  return box;
}

function handWorldCentroid(mesh: THREE.Mesh): THREE.Vector3 {
  const metadata = getCharacterLimbGeometryMetadata(mesh.geometry);
  assert.ok(metadata);
  const range = metadata.segments.find(({ segment }) => segment === 'hand');
  assert.ok(range);
  const positions = mesh.geometry.getAttribute('position');
  const centroid = new THREE.Vector3();
  const point = new THREE.Vector3();
  for (let vertex = range.start; vertex < range.end; vertex += 1) {
    centroid.add(point.fromBufferAttribute(positions, vertex));
  }
  centroid.multiplyScalar(1 / range.count).applyMatrix4(mesh.matrixWorld);
  return centroid;
}

function boxDistance(box: THREE.Box3, point: THREE.Vector3): number {
  const clamped = point.clone().clamp(box.min, box.max);
  return clamped.distanceTo(point);
}

void test('page arm setup renders palms around calibrated weapon contacts', () => {
  const scene = new THREE.Scene();
  const authorityRoot = new THREE.Group();
  scene.add(authorityRoot);
  const leftArm = new THREE.Mesh(createFacetedLimbGeometry(0.105, 0.42));
  const rightArm = new THREE.Mesh(createFacetedLimbGeometry(0.105, 0.42));
  // Match the live setup: the compound mesh is authored in shoulder space;
  // the rig's shoulder and CPU elbow transforms provide the whole pose.
  leftArm.position.set(0, 0, 0);
  rightArm.position.set(0, 0, 0);
  const leftController = createCharacterLimbDeformationController(
    leftArm,
    'arm',
  );
  const rightController = createCharacterLimbDeformationController(
    rightArm,
    'arm',
  );
  const rig = createCharacterRig({
    authorityRoot,
    fallbackVisuals: false,
    visualParts: {
      leftShoulder: leftArm,
      rightShoulder: rightArm,
    },
  });
  const pose = createBotAnimationPose();
  pose.weaponSocketX = 0.07;
  const output: CharacterRigWeaponGripOutput = {
    leftElbowPitch: 0,
    rightElbowPitch: 0,
  };
  applyCharacterRigPose(rig, pose);
  applyCharacterRigWeaponAim(rig, 0, pose);
  applyCharacterRigWeaponGripTargets(rig, output);
  leftController.write({ elbow: output.leftElbowPitch });
  rightController.write({ elbow: output.rightElbowPitch });
  authorityRoot.updateMatrixWorld(true);
  rig.visualRoot.updateMatrixWorld(true);

  const leftTarget = new THREE.Vector3();
  const rightTarget = new THREE.Vector3();
  rig.supportGripTarget.getWorldPosition(leftTarget);
  rig.dominantGripTarget.getWorldPosition(rightTarget);
  const leftBox = handWorldBox(leftArm);
  const rightBox = handWorldBox(rightArm);
  const leftCentroid = handWorldCentroid(leftArm);
  const rightCentroid = handWorldCentroid(rightArm);
  const leftDistance = boxDistance(leftBox, leftTarget);
  const rightDistance = boxDistance(rightBox, rightTarget);
  const leftCentroidDistance = leftCentroid.distanceTo(leftTarget);
  const rightCentroidDistance = rightCentroid.distanceTo(rightTarget);
  assert.ok(leftDistance <= 0.03);
  assert.ok(rightDistance <= 0.03);
  assert.ok(leftCentroidDistance <= 0.03);
  assert.ok(rightCentroidDistance <= 0.03);
});

void test('armed bot arm contacts stay exact while elbows vary across movement and recoil rates', () => {
  const samples = [
    {
      velocity: { x: 0, z: -4.8 },
      acceleration: { x: 0, z: -1 },
      bodyYaw: 0,
      aimYaw: 0.08,
      phase: 0.3,
      actions: {},
    },
    {
      velocity: { x: 2.2, z: -2.8 },
      acceleration: { x: 2, z: 0 },
      bodyYaw: 0.15,
      aimYaw: 0.7,
      phase: 1.7,
      actions: {},
    },
    {
      velocity: { x: -2.4, z: -1.1 },
      acceleration: { x: -2, z: 1 },
      bodyYaw: -0.2,
      aimYaw: -0.85,
      phase: 3.1,
      actions: {},
    },
    {
      velocity: { x: 0, z: 0 },
      acceleration: { x: 0, z: 0 },
      bodyYaw: 0.4,
      aimYaw: 1.05,
      phase: 4.35,
      actions: { fire: 1 },
    },
    {
      velocity: { x: 0.8, z: -4 },
      acceleration: { x: 1, z: -1 },
      bodyYaw: -0.35,
      aimYaw: -0.55,
      phase: 5.6,
      actions: { fire: 0.35, reload: 0.5 },
    },
  ] as const;
  const elbowPaths: THREE.Vector3[][] = [];
  let worstContact = 0;

  for (const frameRate of [30, 60, 120]) {
    const scene = new THREE.Scene();
    const authorityRoot = new THREE.Group();
    scene.add(authorityRoot);
    const leftArm = new THREE.Mesh(createFacetedLimbGeometry(0.105, 0.42));
    const rightArm = new THREE.Mesh(createFacetedLimbGeometry(0.105, 0.42));
    const leftController = createCharacterLimbDeformationController(
      leftArm,
      'arm',
    );
    const rightController = createCharacterLimbDeformationController(
      rightArm,
      'arm',
    );
    const rig = createCharacterRig({
      authorityRoot,
      fallbackVisuals: false,
      visualParts: {
        leftShoulder: leftArm,
        rightShoulder: rightArm,
      },
    });
    const state = createBotAnimationState();
    const pose = createBotAnimationPose();
    const output: CharacterRigWeaponGripOutput = {
      leftElbowPitch: 0,
      rightElbowPitch: 0,
    };
    const nodeIdentities: THREE.Object3D[] = [];
    const childIdentities: THREE.Object3D[][] = [];
    const meshIdentities: THREE.Mesh[] = [];
    const geometryIdentities: THREE.BufferGeometry[] = [];
    const materialIdentities: (THREE.Material | THREE.Material[])[] = [];
    rig.visualRoot.traverse((node) => {
      nodeIdentities.push(node);
      childIdentities.push(node.children);
      if (node instanceof THREE.Mesh) {
        meshIdentities.push(node);
        geometryIdentities.push(node.geometry);
        materialIdentities.push(node.material);
      }
    });
    assert.deepEqual(meshIdentities, [leftArm, rightArm]);
    const paths: THREE.Vector3[] = [];
    for (const sample of samples) {
      writeBotAnimationPose(
        { ...sample, dtSeconds: 1 / frameRate, grounded: true },
        state,
        pose,
      );
      applyCharacterRigPose(rig, pose);
      applyCharacterRigWeaponAim(rig, sample.aimYaw - sample.bodyYaw, pose);
      applyCharacterRigWeaponGripTargets(rig, output);
      leftController.write({ elbow: output.leftElbowPitch });
      rightController.write({ elbow: output.rightElbowPitch });
      rig.visualRoot.updateMatrixWorld(true);

      const leftTarget = new THREE.Vector3();
      const rightTarget = new THREE.Vector3();
      rig.supportGripTarget.getWorldPosition(leftTarget);
      rig.dominantGripTarget.getWorldPosition(rightTarget);
      const leftDistance = handWorldCentroid(leftArm).distanceTo(leftTarget);
      const rightDistance = handWorldCentroid(rightArm).distanceTo(rightTarget);
      worstContact = Math.max(worstContact, leftDistance, rightDistance);
      assert.ok(leftDistance <= 0.03);
      assert.ok(rightDistance <= 0.03);

      const leftElbow = new THREE.Vector3();
      const rightElbow = new THREE.Vector3();
      rig.leftForearm.getWorldPosition(leftElbow);
      rig.rightForearm.getWorldPosition(rightElbow);
      paths.push(leftElbow, rightElbow);
    }
    const afterNodes: THREE.Object3D[] = [];
    rig.visualRoot.traverse((node) => afterNodes.push(node));
    assert.equal(afterNodes.length, nodeIdentities.length);
    afterNodes.forEach((node, index) => {
      assert.equal(node, nodeIdentities[index]);
      assert.equal(node.children, childIdentities[index]);
    });
    meshIdentities.forEach((mesh, index) => {
      assert.equal(mesh.geometry, geometryIdentities[index]);
      assert.equal(mesh.material, materialIdentities[index]);
    });
    elbowPaths.push(paths);
  }

  const allElbows = elbowPaths.flat();
  const xRange =
    Math.max(...allElbows.map((point) => point.x)) -
    Math.min(...allElbows.map((point) => point.x));
  const yRange =
    Math.max(...allElbows.map((point) => point.y)) -
    Math.min(...allElbows.map((point) => point.y));
  const zRange =
    Math.max(...allElbows.map((point) => point.z)) -
    Math.min(...allElbows.map((point) => point.z));
  assert.ok(xRange > 0.08 || yRange > 0.08 || zRange > 0.08);
  const referencePaths = elbowPaths[0];
  for (const pathsAtRate of elbowPaths.slice(1)) {
    pathsAtRate.forEach((path, index) => {
      // Different render deltas may slightly lag authored angle envelopes,
      // but the solved elbow path must remain frame-rate stable.
      assert.ok(path.distanceTo(referencePaths[index]) < 0.15);
    });
  }
  for (const pathsAtRate of elbowPaths) {
    for (let sample = 0; sample < samples.length; sample += 1) {
      const left = pathsAtRate[sample * 2];
      const right = pathsAtRate[sample * 2 + 1];
      assert.ok(
        left.x < right.x,
        `sample ${sample} did not preserve side order`,
      );
    }
  }
  assert.ok(worstContact <= 0.03);
});
