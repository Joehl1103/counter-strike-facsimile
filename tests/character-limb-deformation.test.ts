import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  createFacetedLimbGeometry,
  getCharacterLimbGeometryMetadata,
} from '../app/character-visuals.ts';
import {
  CHARACTER_LIMB_MAX_ANKLE_ANGLE,
  CHARACTER_LIMB_MAX_ELBOW_ANGLE,
  CHARACTER_LIMB_MAX_KNEE_ANGLE,
  createCharacterLimbDeformationController,
  resetCharacterLimbDeformation,
  writeCharacterLimbFootPlanting,
  writeCharacterLimbDeformation,
} from '../app/character-limb-deformation.ts';
import {
  applyCharacterRigPose,
  createCharacterRig,
} from '../app/character-rig.ts';
import { createBotAnimationPose } from '../app/bot-animation.ts';

function meshFor(kind: 'leg' | 'arm'): THREE.Mesh {
  return new THREE.Mesh(
    createFacetedLimbGeometry(0.13, kind === 'leg' ? 0.56 : 0.42),
  );
}

function rotateX(
  y: number,
  z: number,
  pivotY: number,
  angle: number,
  pivotZ = 0,
) {
  const dy = y - pivotY;
  const dz = z - pivotZ;
  return {
    y: pivotY + Math.cos(angle) * dy - Math.sin(angle) * dz,
    z: pivotZ + Math.sin(angle) * dy + Math.cos(angle) * dz,
  };
}

void test('compound limb metadata preserves deterministic ranges after merging', () => {
  const leg = createFacetedLimbGeometry(0.13, 0.56);
  const arm = createFacetedLimbGeometry(0.105, 0.42);
  const legMetadata = getCharacterLimbGeometryMetadata(leg);
  const armMetadata = getCharacterLimbGeometryMetadata(arm);
  assert.equal(legMetadata?.kind, 'leg');
  assert.equal(armMetadata?.kind, 'arm');
  assert.deepEqual(
    legMetadata?.segments.map(({ segment }) => segment),
    ['upper', 'knee', 'shin', 'boot'],
  );
  assert.deepEqual(
    armMetadata?.segments.map(({ segment }) => segment),
    ['upper', 'elbow', 'forearm', 'hand'],
  );
  for (const metadata of [legMetadata, armMetadata]) {
    assert.ok(metadata);
    let start = 0;
    for (const range of metadata.segments) {
      assert.equal(range.start, start);
      assert.equal(range.end, range.start + range.count);
      assert.equal(range.vertexStart, range.start);
      assert.equal(range.vertexCount, range.count);
      start = range.end;
    }
    assert.equal(start, metadata.segments.at(-1)?.end);
  }
  leg.dispose();
  arm.dispose();
});

void test('leg lower segments visibly hinge at knee and ankle pivots', () => {
  const mesh = meshFor('leg');
  const source = mesh.geometry;
  const sourceMetadata = getCharacterLimbGeometryMetadata(source);
  assert.ok(sourceMetadata);
  const controller = createCharacterLimbDeformationController(mesh, 'leg');
  const shin = sourceMetadata.segments.find(
    ({ segment }) => segment === 'shin',
  );
  const boot = sourceMetadata.segments.find(
    ({ segment }) => segment === 'boot',
  );
  assert.ok(shin && boot);
  const shinOffset = shin.start * 3;
  const bootOffset = boot.start * 3;
  const bind = controller.bindPositions;
  writeCharacterLimbDeformation(controller, { knee: 0.5, ankle: 0.35 });
  const expectedShin = rotateX(
    bind[shinOffset + 1],
    bind[shinOffset + 2],
    -0.32,
    0.5,
  );
  assert.ok(
    Math.abs(
      controller.positionAttribute.array[shinOffset + 1] - expectedShin.y,
    ) < 1e-6,
  );
  assert.ok(
    Math.abs(
      controller.positionAttribute.array[shinOffset + 2] - expectedShin.z,
    ) < 1e-6,
  );
  const kneeShin = rotateX(
    bind[bootOffset + 1],
    bind[bootOffset + 2],
    -0.32,
    0.5,
  );
  const transformedAnkle = rotateX(-0.62, 0, -0.32, 0.5);
  const expectedBoot = rotateX(
    kneeShin.y,
    kneeShin.z,
    transformedAnkle.y,
    0.35,
    transformedAnkle.z,
  );
  assert.ok(
    Math.abs(
      controller.positionAttribute.array[bootOffset + 1] - expectedBoot.y,
    ) < 1e-6,
  );
  assert.ok(
    Math.abs(
      controller.positionAttribute.array[bootOffset + 2] - expectedBoot.z,
    ) < 1e-6,
  );
  assert.notEqual(
    controller.positionAttribute.array[shinOffset + 2],
    bind[shinOffset + 2],
  );
  assert.notEqual(
    controller.positionAttribute.array[bootOffset + 2],
    bind[bootOffset + 2],
  );
  controller.geometry.dispose();
  source.dispose();
});

void test('rendered boot vertices plant and clear the ground at every render rate', () => {
  for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
    const scene = new THREE.Scene();
    const leftMesh = new THREE.Mesh(createFacetedLimbGeometry(0.13, 0.56));
    const rightMesh = new THREE.Mesh(createFacetedLimbGeometry(0.13, 0.56));
    leftMesh.position.set(0.14, -0.19, 0);
    rightMesh.position.set(-0.14, -0.19, 0);
    const leftController = createCharacterLimbDeformationController(
      leftMesh,
      'leg',
    );
    const rightController = createCharacterLimbDeformationController(
      rightMesh,
      'leg',
    );
    const rig = createCharacterRig({
      fallbackVisuals: false,
      visualParts: { leftThigh: leftMesh, rightThigh: rightMesh },
    });
    scene.add(rig.visualRoot);
    const pose = createBotAnimationPose();
    let phase = 0;
    let rootZ = 0;
    const restPositions = [
      leftMesh.position.clone(),
      rightMesh.position.clone(),
    ];
    const measureBoot = (
      controller: ReturnType<typeof createCharacterLimbDeformationController>,
    ) => {
      const range = controller.ranges.find(({ segment }) => segment === 'boot');
      assert.ok(range);
      controller.mesh.updateWorldMatrix(true, false);
      const vertex = new THREE.Vector3();
      let minY = Number.POSITIVE_INFINITY;
      let sumX = 0;
      let sumZ = 0;
      let count = 0;
      const positions = controller.positionAttribute.array;
      for (let index = range.start; index < range.end; index += 1) {
        const offset = index * 3;
        vertex
          .set(positions[offset], positions[offset + 1], positions[offset + 2])
          .applyMatrix4(controller.mesh.matrixWorld);
        if (vertex.y < minY - 1e-5) {
          minY = vertex.y;
          sumX = vertex.x;
          sumZ = vertex.z;
          count = 1;
        } else if (Math.abs(vertex.y - minY) <= 1e-5) {
          sumX += vertex.x;
          sumZ += vertex.z;
          count += 1;
        }
      }
      return { minY, anchor: new THREE.Vector3(sumX / count, 0, sumZ / count) };
    };
    const measureHipAttachmentError = (
      controller: ReturnType<typeof createCharacterLimbDeformationController>,
    ) => {
      controller.mesh.updateWorldMatrix(true, false);
      let highestY = Number.NEGATIVE_INFINITY;
      for (
        let vertex = 0;
        vertex < controller.bindPositions.length / 3;
        vertex += 1
      )
        highestY = Math.max(highestY, controller.bindPositions[vertex * 3 + 1]);
      const actual = new THREE.Vector3();
      const expected = new THREE.Vector3();
      const vertex = new THREE.Vector3();
      let count = 0;
      for (
        let index = 0;
        index < controller.bindPositions.length / 3;
        index += 1
      ) {
        const offset = index * 3;
        if (controller.bindPositions[offset + 1] < highestY - 0.025) continue;
        vertex
          .set(
            controller.positionAttribute.array[offset],
            controller.positionAttribute.array[offset + 1],
            controller.positionAttribute.array[offset + 2],
          )
          .applyMatrix4(controller.mesh.matrixWorld);
        actual.add(vertex);
        vertex
          .set(
            controller.bindPositions[offset],
            controller.bindPositions[offset + 1],
            controller.bindPositions[offset + 2],
          )
          .applyMatrix4(controller.mesh.matrixWorld);
        expected.add(vertex);
        count += 1;
      }
      assert.ok(count > 0);
      return actual
        .multiplyScalar(1 / count)
        .distanceTo(expected.multiplyScalar(1 / count));
    };

    for (let frame = 0; frame < 180; frame += 1) {
      rootZ -= 3.8 * dt;
      rig.visualRoot.position.set(0, 0, rootZ);
      pose.leftHipPitch = Math.sin(phase) * 0.62;
      pose.rightHipPitch = -pose.leftHipPitch;
      pose.leftKneePitch = 0.1;
      pose.rightKneePitch = 0.1;
      pose.leftAnklePitch = 0;
      pose.rightAnklePitch = 0;
      pose.leftFootPlant = (1 + Math.cos(phase)) * 0.5;
      pose.rightFootPlant = (1 - Math.cos(phase)) * 0.5;
      pose.leftToeClearance = 0.04 + (1 - pose.leftFootPlant) * 0.06;
      pose.rightToeClearance = 0.04 + (1 - pose.rightFootPlant) * 0.06;
      pose.leftFootOffsetZ = Math.sin(phase) * 0.09;
      pose.rightFootOffsetZ = -pose.leftFootOffsetZ;
      applyCharacterRigPose(rig, pose);
      leftController.write({
        knee: pose.leftKneePitch,
        ankle: pose.leftAnklePitch,
      });
      rightController.write({
        knee: pose.rightKneePitch,
        ankle: pose.rightAnklePitch,
      });
      writeCharacterLimbFootPlanting(leftController, {
        plant: pose.leftFootPlant,
        swingOffsetZ: pose.leftFootOffsetZ,
        toeClearance: pose.leftToeClearance,
      });
      writeCharacterLimbFootPlanting(rightController, {
        plant: pose.rightFootPlant,
        swingOffsetZ: pose.rightFootOffsetZ,
        toeClearance: pose.rightToeClearance,
      });
      const measurements = [
        measureBoot(leftController),
        measureBoot(rightController),
      ];
      const controllers = [leftController, rightController] as const;
      for (let side = 0; side < 2; side += 1) {
        const plant = side === 0 ? pose.leftFootPlant : pose.rightFootPlant;
        const measurement = measurements[side];
        const controller = controllers[side];
        // Production regression: foot planting may shape the trouser leg but
        // must never move the compound mesh or its upper attachment ring.
        assert.ok(
          controller.mesh.position.distanceTo(restPositions[side]) < 1e-9,
        );
        assert.ok(measureHipAttachmentError(controller) < 1e-6);
        const hip = new THREE.Vector3();
        controller.mesh.getWorldPosition(hip);
        assert.ok(hip.distanceTo(measurement.anchor) < 1.2);
        if (plant >= 0.8) {
          assert.ok(
            measurement.minY >= 0 && measurement.minY <= 0.02,
            `dt=${dt} frame=${frame} side=${side} phase=${phase} minY=${measurement.minY}`,
          );
        } else {
          if (plant <= 0.2)
            assert.ok(measurement.minY >= 0.04 && measurement.minY <= 0.12);
        }
      }
      phase = (phase + (3.8 * dt * Math.PI * 2) / 1.85) % (Math.PI * 2);
    }
    leftController.geometry.dispose();
    rightController.geometry.dispose();
  }
});

void test('arm forearm and hand bend forward from the elbow', () => {
  const mesh = meshFor('arm');
  const controller = createCharacterLimbDeformationController(mesh, 'arm');
  const hand = controller.ranges.find(({ segment }) => segment === 'hand');
  assert.ok(hand);
  let lowestVertex = hand.start;
  let normalVertex = hand.start;
  for (let vertex = hand.start + 1; vertex < hand.end; vertex += 1) {
    if (
      controller.bindPositions[vertex * 3 + 1] <
      controller.bindPositions[lowestVertex * 3 + 1]
    )
      lowestVertex = vertex;
    if (
      Math.abs(controller.bindNormals[vertex * 3 + 1]) +
        Math.abs(controller.bindNormals[vertex * 3 + 2]) >
      0.1
    )
      normalVertex = vertex;
  }
  const offset = lowestVertex * 3;
  const bindZ = controller.bindPositions[offset + 2];
  writeCharacterLimbDeformation(controller, { elbow: 0.8 });
  assert.ok(controller.positionAttribute.array[offset + 2] < bindZ - 0.01);
  const normalOffset = normalVertex * 3;
  assert.ok(
    controller.normalAttribute.array[normalOffset + 1] !==
      controller.bindNormals[normalOffset + 1] ||
      controller.normalAttribute.array[normalOffset + 2] !==
        controller.bindNormals[normalOffset + 2],
  );
  controller.geometry.dispose();
  mesh.geometry.dispose();
});

void test('controllers isolate shared base geometry and keep identities stable', () => {
  const shared = createFacetedLimbGeometry(0.13, 0.56);
  const first = new THREE.Mesh(shared);
  const second = new THREE.Mesh(shared);
  const firstController = createCharacterLimbDeformationController(first);
  const secondController = createCharacterLimbDeformationController(second);
  const triangleCount = shared.getAttribute('position').count / 3;
  const sharedBefore = Float32Array.from(
    shared.getAttribute('position').array as ArrayLike<number>,
  );
  const outputGeometry = firstController.geometry;
  const outputBoundingBox = outputGeometry.boundingBox;
  const outputBoundingSphere = outputGeometry.boundingSphere;
  const outputPositionArray = firstController.positionAttribute.array;
  const outputNormalArray = firstController.normalAttribute.array;
  for (let frame = 0; frame < 240; frame += 1)
    writeCharacterLimbDeformation(firstController, {
      knee: Math.sin(frame * 0.07) * 0.8,
      ankle: Math.cos(frame * 0.11) * 0.5,
    });
  writeCharacterLimbDeformation(firstController);
  assert.deepEqual(
    firstController.positionAttribute.array,
    firstController.bindPositions,
  );
  assert.equal(firstController.geometry, outputGeometry);
  assert.equal(firstController.geometry.boundingBox, outputBoundingBox);
  assert.equal(firstController.geometry.boundingSphere, outputBoundingSphere);
  assert.equal(
    firstController.geometry.getAttribute('position').count / 3,
    triangleCount,
  );
  assert.equal(first.geometry.groups.length, 0);
  assert.ok(!Array.isArray(first.material));
  assert.equal(firstController.positionAttribute.array, outputPositionArray);
  assert.equal(firstController.normalAttribute.array, outputNormalArray);
  assert.deepEqual(shared.getAttribute('position').array, sharedBefore);
  assert.deepEqual(secondController.bindPositions, sharedBefore);
  firstController.geometry.dispose();
  secondController.geometry.dispose();
  shared.dispose();
});

void test('writer sanitizes angles, stays finite and reset restores bind state', () => {
  const mesh = meshFor('leg');
  const controller = createCharacterLimbDeformationController(mesh);
  const positionArray = controller.positionAttribute.array;
  const normalArray = controller.normalAttribute.array;
  writeCharacterLimbDeformation(controller, {
    knee: Number.POSITIVE_INFINITY,
    ankle: Number.NaN,
    elbow: Number.NEGATIVE_INFINITY,
  });
  for (const value of positionArray) assert.ok(Number.isFinite(value));
  for (const value of normalArray) assert.ok(Number.isFinite(value));
  const kneeBound = Math.sin(CHARACTER_LIMB_MAX_KNEE_ANGLE);
  assert.ok(Math.abs(kneeBound) <= 1);
  assert.ok(CHARACTER_LIMB_MAX_ANKLE_ANGLE > 0);
  assert.equal(CHARACTER_LIMB_MAX_ELBOW_ANGLE, 2.4);
  writeCharacterLimbDeformation(controller, { knee: 0.5, ankle: 0.4 });
  resetCharacterLimbDeformation(controller);
  assert.deepEqual(positionArray, controller.bindPositions);
  assert.deepEqual(normalArray, controller.bindNormals);
  controller.geometry.dispose();
  mesh.geometry.dispose();
});

void test('four limbs across eight bots remain within the deformation budget', () => {
  const controllers: ReturnType<
    typeof createCharacterLimbDeformationController
  >[] = [];
  for (let bot = 0; bot < 8; bot += 1) {
    controllers.push(createCharacterLimbDeformationController(meshFor('leg')));
    controllers.push(createCharacterLimbDeformationController(meshFor('leg')));
    controllers.push(createCharacterLimbDeformationController(meshFor('arm')));
    controllers.push(createCharacterLimbDeformationController(meshFor('arm')));
  }
  for (let warmup = 0; warmup < 100; warmup += 1)
    for (const controller of controllers)
      writeCharacterLimbDeformation(controller, {
        knee: 0.2,
        ankle: -0.1,
        elbow: 0.35,
      });
  const samples: number[] = [];
  for (let sample = 0; sample < 100; sample += 1) {
    const started = performance.now();
    for (const controller of controllers)
      writeCharacterLimbDeformation(controller, {
        knee: 0.2,
        ankle: -0.1,
        elbow: 0.35,
      });
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.floor(samples.length * 0.95)];
  console.log(
    `character limb deformation benchmark: 32 writes p95=${p95.toFixed(3)}ms`,
  );
  for (const controller of controllers) controller.geometry.dispose();
  assert.equal(controllers.length, 32);
});
