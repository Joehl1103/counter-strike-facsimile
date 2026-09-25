import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  applyCharacterRigPose,
  applyCharacterRigWeaponGripTargets,
  attachCharacterRigSibling,
  createCharacterRig,
  filterOutCharacterRigVisuals,
  getCharacterRigSocketMetrics,
  isCharacterRigVisualObject,
  isCharacterRigVisualOnly,
  validateCharacterRigVisualOnly,
  type CharacterRigWeaponGripOutput,
} from '../app/character-rig.ts';
import { createBotAnimationPose } from '../app/bot-animation.ts';

void test('the rig exposes a deterministic articulated hierarchy', () => {
  const first = createCharacterRig();
  const second = createCharacterRig();

  assert.equal(first.visualRoot.name, 'visualRoot');
  assert.equal(first.pelvis.parent, first.visualRoot);
  assert.equal(first.lowerBody.parent, first.pelvis);
  assert.equal(first.upperBody.parent, first.pelvis);
  assert.equal(first.head.parent, first.upperBody);
  assert.equal(first.leftThigh.parent, first.pelvis);
  assert.equal(first.leftShin.parent, first.leftThigh);
  assert.equal(first.leftFoot.parent, first.leftShin);
  assert.equal(first.rightThigh.parent, first.pelvis);
  assert.equal(first.rightShin.parent, first.rightThigh);
  assert.equal(first.rightFoot.parent, first.rightShin);
  assert.equal(first.leftShoulder.parent, first.upperBody);
  assert.equal(first.leftForearm.parent, first.leftShoulder);
  assert.equal(first.leftHand.parent, first.leftForearm);
  assert.equal(first.rightShoulder.parent, first.upperBody);
  assert.equal(first.rightForearm.parent, first.rightShoulder);
  assert.equal(first.rightHand.parent, first.rightForearm);
  assert.equal(first.leftGripSocket.parent, first.leftHand);
  assert.equal(first.rightGripSocket.parent, first.rightHand);
  assert.equal(first.weaponSocket.parent, first.visualRoot);
  assert.equal(first.muzzleSocket.parent, first.weaponSocket);

  const firstTransforms = [
    first.pelvis.position.toArray(),
    first.leftThigh.position.toArray(),
    first.weaponSocket.position.toArray(),
  ];
  const secondTransforms = [
    second.pelvis.position.toArray(),
    second.leftThigh.position.toArray(),
    second.weaponSocket.position.toArray(),
  ];
  assert.deepEqual(firstTransforms, secondTransforms);
});

void test('visual root mounts beside, never below, the authority root', () => {
  const scene = new THREE.Scene();
  const authorityRoot = new THREE.Group();
  authorityRoot.name = 'authorityRoot';
  scene.add(authorityRoot);
  const rig = createCharacterRig({ autoAttach: false });

  attachCharacterRigSibling(rig, authorityRoot);
  assert.equal(rig.visualRoot.parent, scene);
  assert.equal(authorityRoot.parent, scene);
  assert.equal(authorityRoot.children.includes(rig.visualRoot), false);
  assert.equal(rig.visualRoot.children.includes(authorityRoot), false);
});

void test('presentation nodes are visual-only and excluded from authority arrays', () => {
  const rig = createCharacterRig();
  const authorityHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshBasicMaterial(),
  );
  authorityHit.userData.authoritative = true;
  const collision = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
  );
  const candidates: THREE.Object3D[] = [
    authorityHit,
    rig.leftHand,
    collision,
    rig.muzzleSocket,
  ];

  assert.equal(validateCharacterRigVisualOnly(rig), true);
  assert.equal(isCharacterRigVisualObject(rig, rig.leftHand), true);
  assert.deepEqual(filterOutCharacterRigVisuals(candidates, rig), [
    authorityHit,
    collision,
  ]);
  assert.equal(
    filterOutCharacterRigVisuals(
      [authorityHit] as THREE.Object3D[],
      rig,
    ).includes(rig.leftHand),
    false,
  );

  authorityHit.geometry.dispose();
  (authorityHit.material as THREE.Material).dispose();
  collision.geometry.dispose();
  (collision.material as THREE.Material).dispose();
});

void test('a raycaster cannot hit any visual rig node', () => {
  const rig = createCharacterRig();
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(0, 1, 3),
    new THREE.Vector3(0, 0, -1),
  );
  rig.visualRoot.updateMatrixWorld(true);
  const intersections = raycaster.intersectObject(rig.visualRoot, true);
  assert.equal(intersections.length, 0);
  rig.visualRoot.traverse((object) => {
    assert.equal(isCharacterRigVisualOnly(object), true, object.name);
  });
});

void test('pose writes reuse node identity and create no replacement joints', () => {
  const rig = createCharacterRig();
  const identity = {
    pelvis: rig.pelvis,
    leftThigh: rig.leftThigh,
    leftHand: rig.leftHand,
    rightHand: rig.rightHand,
    weaponSocket: rig.weaponSocket,
    muzzleSocket: rig.muzzleSocket,
  };
  const pose = createBotAnimationPose();
  applyCharacterRigPose(rig, pose);
  const leftFootPosition = rig.leftFoot.position.clone();
  pose.leftHipPitch = 0.32;
  pose.leftFootOffsetZ = 0.11;
  pose.rightElbowPitch = 0.7;
  pose.weaponSocketX = 0.4;
  pose.weaponSocketPitch = -0.12;
  applyCharacterRigPose(rig, pose);

  assert.equal(rig.pelvis, identity.pelvis);
  assert.equal(rig.leftThigh, identity.leftThigh);
  assert.equal(rig.leftHand, identity.leftHand);
  assert.equal(rig.rightHand, identity.rightHand);
  assert.equal(rig.weaponSocket, identity.weaponSocket);
  assert.equal(rig.muzzleSocket, identity.muzzleSocket);
  assert.notDeepEqual(rig.leftThigh.rotation.toArray(), [0, 0, 0, 'XYZ']);
  assert.notDeepEqual(
    rig.leftFoot.position.toArray(),
    leftFootPosition.toArray(),
  );
  assert.equal(rig.visualRoot.children.length, 2);
});

void test('socket metrics stay finite and maintain short hand/grip anchors', () => {
  const rig = createCharacterRig();
  rig.visualRoot.updateMatrixWorld(true);
  const metrics = getCharacterRigSocketMetrics(rig);
  for (const value of Object.values(metrics)) assert.ok(Number.isFinite(value));
  assert.ok(metrics.leftHandToGrip < 0.7);
  assert.ok(metrics.rightHandToGrip < 0.7);
  assert.ok(metrics.weaponToMuzzle > 0.5 && metrics.weaponToMuzzle < 0.9);
  assert.ok(metrics.leftGripToMuzzle < 1.5);
  assert.ok(metrics.rightGripToMuzzle < 1.5);
});

void test('weapon grip solver reaches both authored contacts with bounded output', () => {
  const rig = createCharacterRig({ fallbackVisuals: false });
  const output: CharacterRigWeaponGripOutput = {
    leftElbowPitch: 0,
    rightElbowPitch: 0,
  };
  applyCharacterRigWeaponGripTargets(rig, output);
  rig.visualRoot.updateMatrixWorld(true);

  const leftGrip = new THREE.Vector3();
  const rightGrip = new THREE.Vector3();
  const supportTarget = new THREE.Vector3();
  const dominantTarget = new THREE.Vector3();
  rig.leftGripSocket.getWorldPosition(leftGrip);
  rig.rightGripSocket.getWorldPosition(rightGrip);
  rig.supportGripTarget.getWorldPosition(supportTarget);
  rig.dominantGripTarget.getWorldPosition(dominantTarget);

  // The default rifle's support contact is just beyond the 1.5x forearm
  // presentation bound; the residual is intentionally small and bounded.
  assert.ok(leftGrip.distanceTo(supportTarget) <= 0.03);
  assert.ok(rightGrip.distanceTo(dominantTarget) <= 0.03);
  assert.ok(output.leftElbowPitch >= 0 && output.leftElbowPitch <= Math.PI);
  assert.ok(output.rightElbowPitch >= 0 && output.rightElbowPitch <= Math.PI);

  for (const joint of [
    rig.leftShoulder,
    rig.leftForearm,
    rig.rightShoulder,
    rig.rightForearm,
  ]) {
    for (const component of joint.quaternion.toArray())
      assert.ok(Number.isFinite(component));
    assert.ok(joint.scale.y >= 1 && joint.scale.y <= 1.2);
  }
});

void test('repeated grip solves retain rig resources and caller output identity', () => {
  const rig = createCharacterRig();
  const output: CharacterRigWeaponGripOutput = {
    leftElbowPitch: 0,
    rightElbowPitch: 0,
  };
  const nodes: THREE.Object3D[] = [];
  const meshes: THREE.Mesh[] = [];
  rig.visualRoot.traverse((node) => {
    nodes.push(node);
    if (node instanceof THREE.Mesh) meshes.push(node);
  });
  const childLists = nodes.map((node) => node.children);
  const outputIdentity = output;

  for (let frame = 0; frame < 240; frame += 1) {
    rig.weaponSocket.rotation.set(
      Math.sin(frame * 0.11) * 0.4,
      Math.cos(frame * 0.07) * 0.8,
      Math.sin(frame * 0.05) * 0.2,
    );
    applyCharacterRigWeaponGripTargets(rig, output);
  }

  const afterNodes: THREE.Object3D[] = [];
  rig.visualRoot.traverse((node) => afterNodes.push(node));
  assert.deepEqual(afterNodes, nodes);
  nodes.forEach((node, index) =>
    assert.equal(node.children, childLists[index]),
  );
  assert.equal(output, outputIdentity);
  assert.ok(Number.isFinite(output.leftElbowPitch));
  assert.ok(Number.isFinite(output.rightElbowPitch));
  assert.equal(
    meshes.length,
    nodes.filter((node) => node instanceof THREE.Mesh).length,
  );
});

void test('injected visual parts are reparented to named joints with stable locals', () => {
  const source = new THREE.Group();
  const torsoMaterial = new THREE.MeshStandardMaterial({ color: 0x123456 });
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.6, 0.2),
    torsoMaterial,
  );
  torso.name = 'facetedTorso';
  torso.position.set(0.12, 0.24, -0.18);
  torso.rotation.set(0.1, -0.2, 0.3);
  source.add(torso);

  const weapon = new THREE.Group();
  weapon.name = 'facetedWeapon';
  weapon.position.set(0.05, 0.02, -0.4);
  const weaponPart = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x654321 }),
  );
  weapon.add(weaponPart);

  const rig = createCharacterRig({
    visualParts: {
      upperBody: torso,
      weaponSocket: weapon,
    },
  });

  assert.equal(torso.parent, rig.upperBody);
  assert.deepEqual(torso.position.toArray(), [0.12, 0.24, -0.18]);
  assert.deepEqual(torso.rotation.toArray(), [0.1, -0.2, 0.3, 'XYZ']);
  assert.equal(weapon.parent, rig.weaponSocket);
  assert.equal(isCharacterRigVisualOnly(torso), true);
  assert.equal(isCharacterRigVisualOnly(weaponPart), true);
  assert.equal(validateCharacterRigVisualOnly(rig), true);
  assert.equal(
    rig.upperBody.children.some((child) => child.name === 'upperBodyMesh'),
    false,
  );
  assert.equal(rig.weaponSocket.children.includes(weapon), true);

  torso.geometry.dispose();
  torsoMaterial.dispose();
  weaponPart.geometry.dispose();
  (weaponPart.material as THREE.Material).dispose();
});

void test('default visual resources are isolated between rigs', () => {
  const first = createCharacterRig();
  const second = createCharacterRig();
  const firstPelvisMesh = first.pelvis.children.find(
    (child): child is THREE.Mesh => child instanceof THREE.Mesh,
  );
  const secondPelvisMesh = second.pelvis.children.find(
    (child): child is THREE.Mesh => child instanceof THREE.Mesh,
  );

  assert.ok(firstPelvisMesh);
  assert.ok(secondPelvisMesh);
  assert.notEqual(firstPelvisMesh.geometry, secondPelvisMesh.geometry);
  assert.notEqual(firstPelvisMesh.material, secondPelvisMesh.material);
  (firstPelvisMesh.material as THREE.MeshStandardMaterial).color.setHex(
    0xff00ff,
  );
  assert.notEqual(
    (secondPelvisMesh.material as THREE.MeshStandardMaterial).color.getHex(),
    0xff00ff,
  );
});

void test('socket and grip metrics remain stable in world space', () => {
  const rig = createCharacterRig();
  rig.visualRoot.updateMatrixWorld(true);
  const initial = getCharacterRigSocketMetrics(rig);

  rig.visualRoot.position.set(4.5, 1.2, -3.25);
  rig.visualRoot.rotation.set(0.2, -0.7, 0.1);
  rig.visualRoot.updateMatrixWorld(true);
  const transformed = getCharacterRigSocketMetrics(rig);

  for (const key of Object.keys(initial) as (keyof typeof initial)[]) {
    assert.ok(Math.abs(initial[key] - transformed[key]) < 1e-9, key);
  }
  assert.ok(transformed.leftHandToGrip < 0.7);
  assert.ok(transformed.rightHandToGrip < 0.7);
  assert.ok(
    transformed.weaponToMuzzle > 0.5 && transformed.weaponToMuzzle < 0.9,
  );
});

void test('fallback visuals can be disabled for compound injected parts', () => {
  const names = [
    'upperBodyPart',
    'headPart',
    'leftThighPart',
    'rightThighPart',
    'leftShoulderPart',
    'rightShoulderPart',
  ] as const;
  const meshes = Object.fromEntries(
    names.map((name) => [
      name,
      new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x445566 }),
      ),
    ]),
  ) as unknown as Record<(typeof names)[number], THREE.Mesh>;
  names.forEach((name) => {
    meshes[name].name = name;
  });

  const rig = createCharacterRig({
    fallbackVisuals: false,
    visualParts: {
      upperBody: meshes.upperBodyPart,
      head: meshes.headPart,
      leftThigh: meshes.leftThighPart,
      rightThigh: meshes.rightThighPart,
      leftShoulder: meshes.leftShoulderPart,
      rightShoulder: meshes.rightShoulderPart,
    },
  });
  const visibleMeshes: THREE.Mesh[] = [];
  rig.visualRoot.traverse((object) => {
    if (object instanceof THREE.Mesh && object.visible)
      visibleMeshes.push(object);
  });

  assert.deepEqual(
    visibleMeshes.map((mesh) => mesh.name).sort(),
    [...names].sort(),
  );
  assert.equal(rig.lowerBody.parent, rig.pelvis);
  assert.equal(rig.leftShin.parent, rig.leftThigh);
  assert.equal(rig.leftFoot.parent, rig.leftShin);
  assert.equal(rig.leftGripSocket.parent, rig.leftHand);
  assert.equal(rig.rightGripSocket.parent, rig.rightHand);
  assert.equal(rig.weaponSocket.parent, rig.visualRoot);
  assert.equal(rig.muzzleSocket.parent, rig.weaponSocket);
  assert.equal(validateCharacterRigVisualOnly(rig), true);

  names.forEach((name) => {
    meshes[name].geometry.dispose();
    (meshes[name].material as THREE.Material).dispose();
  });
});
