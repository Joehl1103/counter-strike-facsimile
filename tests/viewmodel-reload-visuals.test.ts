import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  applySecondaryReloadActionParts,
  getSecondaryReloadGripBlend,
  getSecondaryReloadVisualPose,
  resetSecondaryReloadActionParts,
} from '../app/viewmodel-reload-visuals.ts';
import {
  createSecondaryFirstPersonModel,
  SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS,
  type SecondaryWeaponActionParts,
} from '../app/secondary-weapon-models.ts';
import {
  FIREARMS,
  writeWeaponReloadPose,
  type WeaponReloadPose,
} from '../app/game-rules.ts';
import {
  clipViewmodelNdcBounds,
  createTexturedViewmodelArmFactory,
  VIEWMODEL_ARM_POSES,
  type ViewmodelNdcBounds,
} from '../app/viewmodel-visuals.ts';
import { createSkinnedCharacterTemplate } from '../app/skinned-character-visuals.ts';

function fixture(): SecondaryWeaponActionParts {
  const magazine = new THREE.Object3D();
  magazine.position.set(0, -0.17, 0.065);
  magazine.rotation.x = -0.18;
  const support = new THREE.Object3D();
  support.position.set(-0.04, -0.14, 0.09);
  support.rotation.set(-0.28, 0.18, -0.78);
  const idleGeometry = new THREE.BufferGeometry();
  const supportMesh = new THREE.Mesh(idleGeometry);
  supportMesh.morphTargetInfluences = [0];
  support.add(supportMesh);
  magazine.updateMatrix();
  support.updateMatrix();
  return {
    magazines: [
      {
        object: magazine,
        basePosition: magazine.position.clone(),
        baseRotation: magazine.rotation.clone(),
      },
    ],
    supportHand: {
      object: support,
      basePosition: support.position.clone(),
      baseRotation: support.rotation.clone(),
      mesh: supportMesh,
      magazine,
      magazineToHand: magazine.matrix.clone().invert().multiply(support.matrix),
    },
  };
}

function projectObjectBounds(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
): ViewmodelNdcBounds {
  object.updateWorldMatrix(true, true);
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
  object.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    const positions = part.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      const projected = part
        .getVertexPosition(index, new THREE.Vector3())
        .applyMatrix4(part.matrixWorld)
        .project(camera);
      bounds.minX = Math.min(bounds.minX, projected.x);
      bounds.maxX = Math.max(bounds.maxX, projected.x);
      bounds.minY = Math.min(bounds.minY, projected.y);
      bounds.maxY = Math.max(bounds.maxY, projected.y);
    }
  });
  assert.ok(Object.values(bounds).every(Number.isFinite));
  return bounds;
}

function projectedArea(bounds: ViewmodelNdcBounds) {
  return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
}

function countMeshVerticesInBox(mesh: THREE.Mesh, bounds: THREE.Box3) {
  const positions = mesh.geometry.getAttribute('position');
  const point = new THREE.Vector3();
  let count = 0;
  for (let index = 0; index < positions.count; index += 1) {
    mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
    if (bounds.containsPoint(point)) count += 1;
  }
  return count;
}

function weightedDigitPoints(mesh: THREE.Mesh, digit: string) {
  const positions = mesh.geometry.getAttribute('position');
  const morphPositions = mesh.geometry.morphAttributes.position?.[0];
  const influence = mesh.morphTargetInfluences?.[0] ?? 0;
  const indices = (
    mesh.geometry.userData.viewmodelWeightedDigitVertices as Readonly<
      Record<string, readonly number[]>
    >
  )[digit];
  assert.ok(indices?.length, `${digit} has no weighted skin vertices`);
  return indices.map((index) => {
    const point = new THREE.Vector3().fromBufferAttribute(positions, index);
    if (morphPositions)
      point.lerp(
        new THREE.Vector3().fromBufferAttribute(morphPositions, index),
        influence,
      );
    return point.applyMatrix4(mesh.matrixWorld);
  });
}

function toPixelBounds(
  bounds: ViewmodelNdcBounds,
  width: number,
  height: number,
) {
  return {
    left: ((bounds.minX + 1) * width) / 2,
    right: ((bounds.maxX + 1) * width) / 2,
    top: ((1 - bounds.maxY) * height) / 2,
    bottom: ((1 - bounds.minY) * height) / 2,
  };
}

function sampleUnoccludedUpperMagazineFace(
  magazine: THREE.Mesh,
  armMeshes: readonly THREE.Mesh[],
  camera: THREE.PerspectiveCamera,
) {
  magazine.geometry.computeBoundingBox();
  assert.ok(magazine.geometry.boundingBox);
  const upperHalfStart = magazine.geometry.boundingBox.getCenter(
    new THREE.Vector3(),
  ).y;
  const positions = magazine.geometry.getAttribute('position');
  const indices = magazine.geometry.index;
  const triangleCount = (indices?.count ?? positions.count) / 3;
  const occluders = armMeshes.map((arm) => {
    const proxy = new THREE.Mesh(
      arm.geometry,
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    proxy.updateMorphTargets();
    proxy.morphTargetInfluences?.forEach((_value, index) => {
      proxy.morphTargetInfluences![index] =
        arm.morphTargetInfluences?.[index] ?? 0;
    });
    proxy.matrixAutoUpdate = false;
    proxy.matrixWorld.copy(arm.matrixWorld);
    return proxy;
  });
  const raycaster = new THREE.Raycaster();
  const cameraOrigin = new THREE.Vector3();
  const visibleSamples: THREE.Vector3[] = [];
  let facingSamples = 0;
  let visibleFaces = 0;
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const vertices = [0, 1, 2].map((corner) => {
      const attributeIndex = indices
        ? indices.getX(triangle * 3 + corner)
        : triangle * 3 + corner;
      return new THREE.Vector3().fromBufferAttribute(positions, attributeIndex);
    });
    const localCenter = vertices[0]
      .clone()
      .add(vertices[1])
      .add(vertices[2])
      .multiplyScalar(1 / 3);
    if (localCenter.y < upperHalfStart) continue;
    const worldVertices = vertices.map((vertex) =>
      vertex.applyMatrix4(magazine.matrixWorld),
    );
    const worldCenter = worldVertices[0]
      .clone()
      .add(worldVertices[1])
      .add(worldVertices[2])
      .multiplyScalar(1 / 3);
    const normal = worldVertices[1]
      .clone()
      .sub(worldVertices[0])
      .cross(worldVertices[2].clone().sub(worldVertices[0]))
      .normalize();
    if (normal.dot(worldCenter.clone().negate().normalize()) <= 0.05) continue;
    facingSamples += 1;
    const distance = worldCenter.length();
    raycaster.set(cameraOrigin, worldCenter.clone().normalize());
    raycaster.near = 0;
    raycaster.far = distance - 0.001;
    if (raycaster.intersectObjects(occluders, false).length > 0) continue;
    visibleFaces += 1;
    visibleSamples.push(
      ...worldVertices.map((vertex) => vertex.project(camera)),
    );
  }
  occluders.forEach((occluder) => {
    (occluder.material as THREE.Material).dispose();
  });
  assert.ok(facingSamples > 0);
  const bounds = new THREE.Box2().setFromPoints(
    visibleSamples.map((sample) => new THREE.Vector2(sample.x, sample.y)),
  );
  return {
    facingSamples,
    visibleFaces,
    visibleFraction: visibleFaces / facingSamples,
    pixelWidth: bounds.isEmpty()
      ? 0
      : bounds.getSize(new THREE.Vector2()).x * 555 * 0.5,
    pixelHeight: bounds.isEmpty()
      ? 0
      : bounds.getSize(new THREE.Vector2()).y * 308 * 0.5,
  };
}

void test('mid-reload clears the magazine below the grip and support hand follows', () => {
  const parts = fixture();
  applySecondaryReloadActionParts(parts, 0.5);
  const magazine = parts.magazines[0];
  assert.ok(magazine.object.position.y < magazine.basePosition.y - 0.15);
  assert.ok(magazine.object.position.x < magazine.basePosition.x - 0.27);
  assert.ok(parts.supportHand);
  magazine.object.updateMatrix();
  parts.supportHand.object.updateMatrix();
  const liveMagazineToHand = magazine.object.matrix
    .clone()
    .invert()
    .multiply(parts.supportHand.object.matrix);
  assert.ok(
    liveMagazineToHand.elements.every(
      (value, index) =>
        Math.abs(value - parts.supportHand!.magazineToHand.elements[index]) <
        1e-12,
    ),
    'support hand must preserve its magazine-local grip socket',
  );
  assert.equal(parts.supportHand.mesh.morphTargetInfluences?.[0], 1);
});

void test('reload endpoints, cancellation, and invalid input restore exact authored transforms', () => {
  for (const progress of [0, 1, -1, 2, Number.NaN]) {
    const parts = fixture();
    applySecondaryReloadActionParts(parts, progress);
    for (const part of [...parts.magazines, parts.supportHand!]) {
      assert.deepEqual(
        part.object.position.toArray(),
        part.basePosition.toArray(),
      );
      assert.deepEqual(
        part.object.rotation.toArray(),
        part.baseRotation.toArray(),
      );
    }
    applySecondaryReloadActionParts(parts, 0.5);
    resetSecondaryReloadActionParts(parts);
    for (const part of [...parts.magazines, parts.supportHand!]) {
      assert.deepEqual(
        part.object.position.toArray(),
        part.basePosition.toArray(),
      );
    }
  }
});

void test('removal and insertion use opposite lateral handoff without jumps', () => {
  const removal = getSecondaryReloadVisualPose(0.25);
  const midpoint = getSecondaryReloadVisualPose(0.5);
  const insertion = getSecondaryReloadVisualPose(0.75);
  assert.ok(removal.magazineOffset.y < 0);
  assert.ok(midpoint.magazineOffset.y < removal.magazineOffset.y);
  assert.ok(
    Math.abs(insertion.magazineOffset.y - removal.magazineOffset.y) < 1e-12,
  );
  assert.notEqual(insertion.magazineOffset.x, removal.magazineOffset.x);
  assert.equal(getSecondaryReloadGripBlend(0), 0);
  assert.equal(getSecondaryReloadGripBlend(0.12), 1);
  assert.equal(getSecondaryReloadGripBlend(0.5), 1);
  assert.equal(getSecondaryReloadGripBlend(0.88), 1);
  assert.equal(getSecondaryReloadGripBlend(1), 0);
});

void test('live USP reload samples keep the real magazine and textured support hand in frame', async () => {
  Object.defineProperty(globalThis, 'self', {
    configurable: true,
    value: globalThis,
  });
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: async () => ({ width: 1024, height: 1024, close() {} }),
  });
  const bytes = await readFile(
    new URL('../public/assets/characters/vanguard.glb', import.meta.url),
  );
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  const factory = createTexturedViewmodelArmFactory(
    createSkinnedCharacterTemplate(gltf),
    new THREE.Texture(),
  );
  const arms: ReturnType<typeof factory.create>[] = [];
  const model = createSecondaryFirstPersonModel('usp', {
    attachViewmodelArms: (root) => {
      VIEWMODEL_ARM_POSES.usp.forEach((pose) => {
        const arm = factory.create(pose);
        arms.push(arm);
        root.add(arm.root);
      });
    },
  });
  const dominant = arms.find(
    (arm) => arm.root.userData.viewmodelGrip === 'trigger',
  );
  const support = arms.find(
    (arm) => arm.root.userData.viewmodelGrip === 'pistol-support',
  );
  assert.ok(dominant);
  assert.ok(support);
  assert.equal(model.actionParts.supportHand?.object, support.root);
  const magazine = model.actionParts.magazines[0];
  assert.ok(magazine);
  assert.ok(magazine.object instanceof THREE.Mesh);

  const mount = SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS.usp;
  const authoredRootPosition = new THREE.Vector3(...mount.position);
  const authoredRootRotation = new THREE.Euler(...mount.rotation);
  const camera = new THREE.PerspectiveCamera(74, 555 / 308, 0.05, 180);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const nativeViewport = { width: 555, height: 308 } as const;
  const bottomCenterTimer = {
    left: 211,
    right: 343,
    top: 252,
    bottom: 293,
  } as const;
  const reloadPose: WeaponReloadPose = {
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  };

  for (const timeSeconds of [0.5, 1, 1.35, 1.8, 2.3]) {
    model.root.position.copy(authoredRootPosition);
    model.root.rotation.copy(authoredRootRotation);
    resetSecondaryReloadActionParts(model.actionParts);
    const progress = (timeSeconds * 1_000) / FIREARMS.usp.reloadMs;
    writeWeaponReloadPose('usp', progress, reloadPose);
    model.root.position.add(
      new THREE.Vector3(
        reloadPose.positionX,
        reloadPose.positionY,
        reloadPose.positionZ,
      ),
    );
    model.root.rotation.x += reloadPose.rotationX;
    model.root.rotation.y += reloadPose.rotationY;
    model.root.rotation.z += reloadPose.rotationZ;
    applySecondaryReloadActionParts(model.actionParts, progress);
    model.root.updateMatrixWorld(true);

    const magazineBounds = projectObjectBounds(magazine.object, camera);
    const magazinePixels = toPixelBounds(
      magazineBounds,
      nativeViewport.width,
      nativeViewport.height,
    );
    const supportBounds = clipViewmodelNdcBounds(
      projectObjectBounds(support.root, camera),
    );
    const supportPixels = toPixelBounds(
      supportBounds,
      nativeViewport.width,
      nativeViewport.height,
    );
    const supportPalm = support.palmAnchor
      .getWorldPosition(new THREE.Vector3())
      .project(camera);
    const dominantPalm = dominant.palmAnchor
      .getWorldPosition(new THREE.Vector3())
      .project(camera);
    assert.ok(
      magazineBounds.minY >= -0.92,
      `${timeSeconds}s magazine bottom is cropped at ${magazineBounds.minY}`,
    );
    assert.ok(
      projectedArea(magazineBounds) >= 0.004,
      `${timeSeconds}s magazine must retain meaningful projected area`,
    );
    // The fully closed insertion grip at 2.3s contracts the outer silhouette
    // slightly while improving actual finger contact around the magazine.
    const minimumSupportArea = timeSeconds === 2.3 ? 0.155 : 0.16;
    const supportArea = projectedArea(supportBounds);
    assert.ok(
      supportArea >= minimumSupportArea,
      `${timeSeconds}s support hand and wrist area ${supportArea} must retain a readable projected area of at least ${minimumSupportArea}`,
    );
    assert.ok(
      supportPixels.right - supportPixels.left >= 85 &&
        supportPixels.bottom - supportPixels.top >= 70,
      `${timeSeconds}s support hand and wrist ${JSON.stringify(supportPixels)} must retain a readable native-viewport footprint`,
    );
    assert.ok(
      supportPalm.y >= -0.88 && supportPalm.y <= 0.5,
      `${timeSeconds}s support palm must remain above the bottom crop`,
    );
    if (timeSeconds >= 1) {
      const hudClearance = 2;
      const overlapsTimer = !(
        magazinePixels.right <= bottomCenterTimer.left - hudClearance ||
        magazinePixels.left >= bottomCenterTimer.right + hudClearance ||
        magazinePixels.bottom <= bottomCenterTimer.top - hudClearance ||
        magazinePixels.top >= bottomCenterTimer.bottom + hudClearance
      );
      assert.equal(
        overlapsTimer,
        false,
        `${timeSeconds}s magazine ${JSON.stringify(magazinePixels)} must clear the native bottom-center timer`,
      );
      if (timeSeconds <= 1.8) {
        assert.ok(
          Math.abs(supportPalm.x - dominantPalm.x) >= 0.08,
          `${timeSeconds}s support hand must separate from the dominant palm`,
        );
      }
      const exposure = sampleUnoccludedUpperMagazineFace(
        magazine.object,
        arms.map((arm) => arm.mesh),
        camera,
      );
      assert.ok(
        exposure.visibleFraction >= 0.25 &&
          exposure.pixelWidth >= 6 &&
          exposure.pixelHeight >= 8,
        `${timeSeconds}s magazine upper face is occluded: ${JSON.stringify(exposure)}`,
      );
    }
    const magazineWorldBounds = new THREE.Box3().setFromObject(magazine.object);
    const lowerMagazineGrip = magazineWorldBounds.clone();
    lowerMagazineGrip.max.y = THREE.MathUtils.lerp(
      magazineWorldBounds.min.y,
      magazineWorldBounds.max.y,
      0.55,
    );
    lowerMagazineGrip.expandByScalar(0.018);
    const lowerGripVertices = countMeshVerticesInBox(
      support.mesh,
      lowerMagazineGrip,
    );
    assert.ok(
      lowerGripVertices >= 3,
      `${timeSeconds}s support fingers must contact the magazine's lower half, found ${lowerGripVertices} actual mesh vertices`,
    );
    assert.ok(
      support.palmAnchor
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(
          magazineWorldBounds.clampPoint(
            support.palmAnchor.getWorldPosition(new THREE.Vector3()),
            new THREE.Vector3(),
          ),
        ) <= 0.04,
      `${timeSeconds}s support palm must stay with the magazine`,
    );
    if (timeSeconds >= 0.5 && timeSeconds <= 1.8) {
      const magazineMesh = magazine.object as THREE.Mesh;
      magazineMesh.geometry.computeBoundingBox();
      assert.ok(magazineMesh.geometry.boundingBox);
      const localMagazine = magazineMesh.geometry.boundingBox;
      const contactBounds = localMagazine.clone().expandByScalar(0.032);
      const digitCenters = Object.fromEntries(
        ['index', 'middle', 'thumb'].map((digit) => {
          const localPoints = weightedDigitPoints(support.mesh, digit).map(
            (point) => magazineMesh.worldToLocal(point.clone()),
          );
          assert.ok(
            localPoints.some((point) => contactBounds.containsPoint(point)),
            `${timeSeconds}s ${digit} weighted pad must contact the magazine`,
          );
          return [
            digit,
            new THREE.Box3()
              .setFromPoints(localPoints)
              .getCenter(new THREE.Vector3()),
          ];
        }),
      ) as Record<string, THREE.Vector3>;
      assert.ok(
        digitCenters.index.x > localMagazine.min.x &&
          digitCenters.middle.x > localMagazine.min.x,
        `${timeSeconds}s index and middle pads must wrap one magazine face`,
      );
      assert.ok(
        digitCenters.thumb.x < localMagazine.min.x - 0.025,
        `${timeSeconds}s thumb pad ${JSON.stringify(digitCenters.thumb.toArray())} must oppose the two gripping fingers around ${JSON.stringify([localMagazine.min.toArray(), localMagazine.max.toArray()])}`,
      );
    }
  }

  // Sample the production reload writer at both review camera proportions.
  // Use deformed mesh vertices so the magazine-grip morph is covered too.
  for (const timeSeconds of [
    0, 0.05, 0.25, 0.5, 0.75, 1, 1.25, 1.35, 1.75, 1.8, 2.25, 2.3, 2.4,
  ]) {
    model.root.position.copy(authoredRootPosition);
    model.root.rotation.copy(authoredRootRotation);
    resetSecondaryReloadActionParts(model.actionParts);
    const progress = (timeSeconds * 1000) / FIREARMS.usp.reloadMs;
    writeWeaponReloadPose('usp', progress, reloadPose);
    model.root.position.add(
      new THREE.Vector3(
        reloadPose.positionX,
        reloadPose.positionY,
        reloadPose.positionZ,
      ),
    );
    model.root.rotation.x += reloadPose.rotationX;
    model.root.rotation.y += reloadPose.rotationY;
    model.root.rotation.z += reloadPose.rotationZ;
    applySecondaryReloadActionParts(model.actionParts, progress);
    model.root.updateMatrixWorld(true);
    for (const aspect of [1398 / 957, 555 / 308]) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      for (const arm of arms) {
        const start = arm.mesh.geometry.userData
          .viewmodelForearmEndRingStart as number;
        const end = new THREE.Box3();
        for (let vertex = start; vertex < start + 12; vertex++) {
          const point = arm.mesh
            .getVertexPosition(vertex, new THREE.Vector3())
            .applyMatrix4(arm.mesh.matrixWorld);
          assert.ok(
            point.z < -0.07,
            `${timeSeconds}s forearm crosses the near plane`,
          );
          end.expandByPoint(point.project(camera));
        }
        assert.ok(
          end.max.y < -1 || end.max.x < -1 || end.min.x > 1,
          `${timeSeconds}s ${arm.root.userData.viewmodelGrip} cap remains visible: ${JSON.stringify(end)}`,
        );
      }
    }
  }

  for (const progress of [0, 1]) {
    model.root.position.copy(authoredRootPosition);
    model.root.rotation.copy(authoredRootRotation);
    writeWeaponReloadPose('usp', progress, reloadPose);
    model.root.position.add(
      new THREE.Vector3(
        reloadPose.positionX,
        reloadPose.positionY,
        reloadPose.positionZ,
      ),
    );
    applySecondaryReloadActionParts(model.actionParts, progress);
    assert.deepEqual(
      model.root.position.toArray(),
      authoredRootPosition.toArray(),
    );
    assert.deepEqual(
      magazine.object.position.toArray(),
      magazine.basePosition.toArray(),
    );
    assert.deepEqual(
      support.root.position.toArray(),
      model.actionParts.supportHand?.basePosition.toArray(),
    );
    assert.equal(
      model.actionParts.supportHand?.mesh.morphTargetInfluences?.[0],
      0,
    );
  }
  factory.dispose();
});
