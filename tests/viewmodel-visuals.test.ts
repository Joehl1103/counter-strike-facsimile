import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  clipViewmodelNdcBounds,
  countGeometryTriangles,
  createTexturedViewmodelArmFactory,
  createViewmodelArmGeometries,
  getViewmodelVisualRecoilDepth,
  getViewmodelHandContactAnchor,
  getViewmodelSleeveExit,
  KNIFE_VIEWMODEL_ROOT_Z,
  VIEWMODEL_ARM_DRAW_CALLS_PER_ARM,
  VIEWMODEL_ARM_NDC_HEIGHT_LIMIT,
  VIEWMODEL_ARM_NDC_WIDTH_LIMIT,
  VIEWMODEL_ARM_POSES,
  VIEWMODEL_ARM_TRIANGLE_BUDGET,
  VIEWMODEL_NEAR_PLANE,
  VIEWMODEL_NEAR_PLANE_CLEARANCE,
  VIEWMODEL_VISIBLE_ARM_TRIANGLE_BUDGET,
  VIEWMODEL_VISIBLE_ARM_DRAW_CALL_BUDGET,
  TEXTURED_VIEWMODEL_VISIBLE_ARM_DRAW_CALL_BUDGET,
  TEXTURED_VIEWMODEL_VISIBLE_ARM_TRIANGLE_BUDGET,
  TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE,
  isViewmodelArmFootprintWithinLimits,
  isPistolViewmodelSilhouetteWithinLimits,
  type ViewmodelGripPose,
  type ViewmodelHandedness,
  type ViewmodelNdcBounds,
} from '../app/viewmodel-visuals.ts';
import {
  createSecondaryFirstPersonModel,
  SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS,
} from '../app/secondary-weapon-models.ts';
import { PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS } from '../app/primary-weapon-models.ts';
import {
  createEquipmentFirstPersonModels,
  EQUIPMENT_VIEWMODEL_KINDS,
  EQUIPMENT_VIEWMODEL_MOUNTS,
} from '../app/equipment-viewmodel-visuals.ts';
import {
  createSkinnedCharacterTemplate,
  type SkinnedCharacterTemplate,
} from '../app/skinned-character-visuals.ts';

let vanguardTemplatePromise: Promise<SkinnedCharacterTemplate> | undefined;

function loadVanguardTemplate() {
  vanguardTemplatePromise ??= (async () => {
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
    return createSkinnedCharacterTemplate(gltf);
  })();
  return vanguardTemplatePromise;
}

function projectObjectBounds(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
) {
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
      const projected = new THREE.Vector3(
        positions.getX(index),
        positions.getY(index),
        positions.getZ(index),
      )
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

function indexedComponentCount(geometry: THREE.BufferGeometry) {
  const index = geometry.index;
  assert.ok(index, 'continuous sleeve geometry must stay indexed');
  const adjacency = Array.from(
    { length: geometry.getAttribute('position').count },
    () => new Set<number>(),
  );
  for (let offset = 0; offset < index.count; offset += 3) {
    const triangle = [
      index.getX(offset),
      index.getX(offset + 1),
      index.getX(offset + 2),
    ];
    triangle.forEach((vertex, corner) => {
      adjacency[vertex].add(triangle[(corner + 1) % 3]);
      adjacency[vertex].add(triangle[(corner + 2) % 3]);
    });
  }
  const visited = new Set<number>();
  let components = 0;
  adjacency.forEach((neighbors, start) => {
    if (visited.has(start) || neighbors.size === 0) return;
    components += 1;
    const pending = [start];
    while (pending.length > 0) {
      const vertex = pending.pop();
      if (vertex === undefined || visited.has(vertex)) continue;
      visited.add(vertex);
      adjacency[vertex].forEach((neighbor) => pending.push(neighbor));
    }
  });
  return components;
}

function indexedEdgeUseCounts(geometry: THREE.BufferGeometry) {
  const index = geometry.index;
  assert.ok(index, 'continuous sleeve geometry must stay indexed');
  const uses = new Map<string, number>();
  for (let offset = 0; offset < index.count; offset += 3) {
    const triangle = [
      index.getX(offset),
      index.getX(offset + 1),
      index.getX(offset + 2),
    ];
    triangle.forEach((vertex, corner) => {
      const other = triangle[(corner + 1) % 3];
      const edge = [vertex, other].sort((a, b) => a - b).join(':');
      uses.set(edge, (uses.get(edge) ?? 0) + 1);
    });
  }
  return uses;
}

type ViewmodelPartRange = Readonly<{
  name: string;
  start: number;
  count: number;
}>;

type TexturedDigitLandmarks = Readonly<
  Record<string, readonly (readonly [number, number, number])[]>
>;

function texturedDigitLandmarks(geometry: THREE.BufferGeometry) {
  const landmarks = geometry.userData
    .viewmodelDigitLandmarks as TexturedDigitLandmarks;
  assert.ok(landmarks);
  return landmarks;
}

function weightedDigitPoints(mesh: THREE.Mesh, digit: string) {
  const positions = mesh.geometry.getAttribute('position');
  const indices = (
    mesh.geometry.userData.viewmodelWeightedDigitVertices as Readonly<
      Record<string, readonly number[]>
    >
  )[digit];
  assert.ok(indices?.length, `${digit} has no weighted skin vertices`);
  return indices.map((index) =>
    new THREE.Vector3()
      .fromBufferAttribute(positions, index)
      .applyMatrix4(mesh.matrixWorld),
  );
}

function viewmodelPartBounds(
  geometry: THREE.BufferGeometry,
  include: (name: string) => boolean,
) {
  const positions = geometry.getAttribute('position');
  const ranges =
    (geometry.userData.viewmodelPartRanges as
      | readonly ViewmodelPartRange[]
      | undefined) ?? [];
  return ranges
    .filter((range) => include(range.name))
    .map((range) => {
      const points: THREE.Vector3[] = [];
      for (let offset = 0; offset < range.count; offset += 1) {
        points.push(
          new THREE.Vector3().fromBufferAttribute(
            positions,
            range.start + offset,
          ),
        );
      }
      return {
        name: range.name,
        bounds: new THREE.Box3().setFromPoints(points),
      };
    });
}

function secondaryPartBounds(root: THREE.Object3D, name: string) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    const ranges =
      (object.geometry.userData.secondaryWeaponPartRanges as
        | readonly ViewmodelPartRange[]
        | undefined) ?? [];
    ranges
      .filter((range) => range.name === name)
      .forEach((range) => {
        for (let offset = 0; offset < range.count; offset += 1) {
          bounds.expandByPoint(
            new THREE.Vector3()
              .fromBufferAttribute(positions, range.start + offset)
              .applyMatrix4(object.matrixWorld),
          );
        }
      });
  });
  assert.equal(bounds.isEmpty(), false, `${name} has no actual geometry`);
  return bounds;
}

void test('Vanguard firearm arms bake actual textured skin into static bounded meshes', async () => {
  const factory = createTexturedViewmodelArmFactory(
    await loadVanguardTemplate(),
    new THREE.Texture(),
  );
  const instances = VIEWMODEL_ARM_POSES.usp.map(factory.create);
  let visibleTriangles = 0;
  for (const instance of instances) {
    assert.equal(instance.mesh instanceof THREE.SkinnedMesh, false);
    assert.equal(
      instance.root.children.some((child) => child instanceof THREE.Bone),
      false,
    );
    assert.equal(instance.root.userData.visualOnly, true);
    assert.equal(instance.mesh.userData.visualOnly, true);
    assert.equal(instance.mesh.geometry.userData.texturedViewmodelArm, true);
    const handVertexCount = instance.mesh.geometry.userData
      .sourceHandVertexCount as number;
    const handPositions = instance.mesh.geometry.getAttribute('position');
    assert.ok(handVertexCount > 0 && handVertexCount < handPositions.count);
    for (let vertex = 0; vertex < handVertexCount; vertex += 1) {
      if (handPositions.getY(vertex) >= -0.015) continue;
      assert.ok(
        Math.hypot(
          handPositions.getX(vertex) / 0.042,
          handPositions.getZ(vertex) / 0.038,
        ) <=
          1 + 1e-6,
        'source wrist boundary must fit inside the clean procedural cuff',
      );
    }
    assert.ok(instance.mesh.geometry.index);
    assert.ok(instance.mesh.geometry.getAttribute('position'));
    assert.ok(instance.mesh.geometry.getAttribute('normal'));
    assert.ok(instance.mesh.geometry.getAttribute('uv'));
    const fabricColors = instance.mesh.geometry.getAttribute('color');
    assert.ok(fabricColors);
    assert.equal(instance.mesh.geometry.getAttribute('skinIndex'), undefined);
    assert.equal(instance.mesh.geometry.getAttribute('skinWeight'), undefined);
    assert.ok(instance.mesh.material instanceof THREE.MeshStandardMaterial);
    assert.equal(instance.mesh.material.vertexColors, true);
    assert.ok(instance.mesh.material.map instanceof THREE.Texture);
    assert.ok(instance.mesh.material.normalMap instanceof THREE.Texture);
    assert.equal(
      instance.mesh.material.color.getHex(),
      TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.color,
    );
    assert.equal(
      instance.mesh.material.emissive.getHex(),
      TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.emissive,
    );
    assert.equal(
      instance.mesh.material.emissiveIntensity,
      TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.emissiveIntensity,
    );
    assert.equal(
      instance.mesh.material.roughness,
      TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.roughness,
    );
    assert.equal(
      instance.mesh.material.metalness,
      TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.metalness,
    );
    const sleeveColor = new THREE.Color(
      TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.sleeveVertexColor,
    );
    const gloveColor = new THREE.Color(
      TEXTURED_VIEWMODEL_ARM_MATERIAL_PROFILE.gloveVertexColor,
    );
    let sleeveVertices = 0;
    let gloveVertices = 0;
    for (let vertex = 0; vertex < fabricColors.count; vertex += 1) {
      const color = new THREE.Color(
        fabricColors.getX(vertex),
        fabricColors.getY(vertex),
        fabricColors.getZ(vertex),
      );
      const sleeveDistance = Math.hypot(
        color.r - sleeveColor.r,
        color.g - sleeveColor.g,
        color.b - sleeveColor.b,
      );
      const gloveDistance = Math.hypot(
        color.r - gloveColor.r,
        color.g - gloveColor.g,
        color.b - gloveColor.b,
      );
      if (sleeveDistance < 0.02) sleeveVertices += 1;
      if (gloveDistance < 0.02) gloveVertices += 1;
    }
    assert.ok(
      sleeveVertices >= 20,
      `baked fabric must retain a coherent sleeve region, found ${sleeveVertices} vertices`,
    );
    assert.ok(
      gloveVertices >= 20,
      `baked fabric must retain a coherent dark glove region, found ${gloveVertices} vertices`,
    );
    assert.ok(
      gloveColor.getHSL({ h: 0, s: 0, l: 0 }).l <
        sleeveColor.getHSL({ h: 0, s: 0, l: 0 }).l * 0.65,
      'the tactical glove must remain visibly darker than the tan forearm',
    );
    instance.mesh.geometry.computeBoundingBox();
    assert.ok(instance.mesh.geometry.boundingBox);
    const bounds = instance.mesh.geometry.boundingBox;
    assert.ok(
      bounds.min.y < -0.5,
      'textured sleeve no longer reaches the frame',
    );
    assert.ok(bounds.max.y < 0.28, 'scaled fingers flare too far above palm');
    visibleTriangles += countGeometryTriangles(instance.mesh.geometry);
    assert.deepEqual(instance.palmAnchor.position.toArray(), [0, 0, 0]);
  }
  assert.ok(visibleTriangles <= TEXTURED_VIEWMODEL_VISIBLE_ARM_TRIANGLE_BUDGET);
  assert.equal(
    new Set(instances.map((instance) => instance.mesh.material)).size,
    1,
  );
  assert.equal(
    instances.length,
    TEXTURED_VIEWMODEL_VISIBLE_ARM_DRAW_CALL_BUDGET,
  );
  const repeated = factory.create(VIEWMODEL_ARM_POSES.usp[0]);
  assert.equal(repeated.mesh.geometry, instances[0].mesh.geometry);
  const reloadGeometry = instances[1].mesh.userData
    .viewmodelReloadGripGeometry as THREE.BufferGeometry;
  assert.ok(reloadGeometry);
  assert.deepEqual(factory.inspect(), {
    cachedPoses: 3,
    triangles: visibleTriangles + countGeometryTriangles(reloadGeometry),
    materials: 1,
  });
  factory.dispose();
});

void test('mounted primary forearms continue beyond the visible frame', async () => {
  const factory = createTexturedViewmodelArmFactory(
    await loadVanguardTemplate(),
    new THREE.Texture(),
  );
  for (const [kind, mount] of Object.entries(
    PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS,
  )) {
    const root = new THREE.Group();
    root.position.set(...mount.position);
    root.rotation.set(...mount.rotation);
    root.scale.setScalar(mount.scale);
    const arms = VIEWMODEL_ARM_POSES[
      kind as keyof typeof PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS
    ].map(factory.create);
    root.add(...arms.map((arm) => arm.root));
    root.updateMatrixWorld(true);
    for (const aspect of [1398 / 957, 555 / 308]) {
      const camera = new THREE.PerspectiveCamera(74, aspect, 0.05, 180);
      camera.updateMatrixWorld(true);
      for (const arm of arms) {
        const positions = arm.mesh.geometry.getAttribute('position');
        const start = arm.mesh.geometry.userData
          .viewmodelForearmEndRingStart as number;
        const end = new THREE.Box3();
        for (let vertex = start; vertex < start + 12; vertex++) {
          const point = new THREE.Vector3()
            .fromBufferAttribute(positions, vertex)
            .applyMatrix4(arm.mesh.matrixWorld);
          assert.ok(
            point.z < -0.07,
            `${kind} forearm crosses the camera near plane`,
          );
          end.expandByPoint(point.project(camera));
        }
        assert.ok(
          end.max.y < -1 || end.max.x < -1 || end.min.x > 1,
          `${kind} ${arm.root.userData.viewmodelHandedness} forearm cap remains visible: ${JSON.stringify(end)}`,
        );
      }
    }
  }
  factory.dispose();
});

void test('textured grip landmarks curl every mirrored digit toward the object', async () => {
  const factory = createTexturedViewmodelArmFactory(
    await loadVanguardTemplate(),
    new THREE.Texture(),
  );
  for (const pose of [
    VIEWMODEL_ARM_POSES.usp[0],
    VIEWMODEL_ARM_POSES.usp[1],
    VIEWMODEL_ARM_POSES.knife[0],
  ]) {
    const instance = factory.create(pose);
    const landmarks = texturedDigitLandmarks(instance.mesh.geometry);
    const knuckleXs: number[] = [];
    for (const digit of ['index', 'middle', 'ring', 'pinky']) {
      const chain = landmarks[digit];
      assert.ok(chain.length >= 2);
      const base = new THREE.Vector3(...chain[0]);
      const tip = new THREE.Vector3(...chain.at(-1)!);
      knuckleXs.push(base.x);
      assert.ok(
        tip.z <= base.z - 0.006,
        `${pose.handedness} ${pose.grip} ${digit} opens away from its object`,
      );
      assert.ok(
        tip.y <= base.y + 0.05,
        `${pose.handedness} ${pose.grip} ${digit} regressed to a vertical rib`,
      );
    }
    assert.deepEqual(
      knuckleXs,
      knuckleXs.toSorted((left, right) => left - right),
    );
    const thumb = landmarks.thumb;
    assert.ok(thumb.length >= 2);
    const thumbBase = new THREE.Vector3(...thumb[0]);
    const thumbTip = new THREE.Vector3(...thumb.at(-1)!);
    if (pose.grip === 'knife') {
      // A knife is enclosed across the palm depth. Requiring the thumb to
      // point sideways on X preserved the old detached thumb silhouette.
      const fingerTip = new THREE.Vector3(...landmarks.middle.at(-1)!);
      assert.ok(thumbTip.z > 0.01 && fingerTip.z < -0.02);
      assert.ok(thumbTip.y > thumbBase.y + 0.025);
      assert.ok(thumbTip.distanceTo(fingerTip) < 0.13);
    } else {
      assert.ok(
        thumbTip.x <= thumbBase.x - 0.02,
        `${pose.handedness} ${pose.grip} thumb no longer opposes the fingers`,
      );
    }
  }
  factory.dispose();
});

void test('knife, thrown equipment, and bomb share cached static Vanguard arms', async () => {
  const factory = createTexturedViewmodelArmFactory(
    await loadVanguardTemplate(),
    new THREE.Texture(),
  );
  const knife = factory.create(VIEWMODEL_ARM_POSES.knife[0]);
  const grenade = factory.create(VIEWMODEL_ARM_POSES.grenade[0]);
  const smoke = factory.create(VIEWMODEL_ARM_POSES.smoke[0]);
  const bomb = VIEWMODEL_ARM_POSES.bomb.map(factory.create);
  assert.equal(grenade.mesh.geometry, smoke.mesh.geometry);
  for (const instance of [knife, grenade, ...bomb]) {
    assert.equal(instance.mesh instanceof THREE.SkinnedMesh, false);
    assert.ok(instance.mesh.material instanceof THREE.MeshStandardMaterial);
    assert.ok(instance.mesh.material.map instanceof THREE.Texture);
    assert.ok(instance.mesh.material.normalMap instanceof THREE.Texture);
    assert.ok(countGeometryTriangles(instance.mesh.geometry) <= 2_000);
  }
  assert.ok(
    bomb.reduce(
      (total, instance) =>
        total + countGeometryTriangles(instance.mesh.geometry),
      0,
    ) <= TEXTURED_VIEWMODEL_VISIBLE_ARM_TRIANGLE_BUDGET,
  );
  assert.equal(bomb.length, TEXTURED_VIEWMODEL_VISIBLE_ARM_DRAW_CALL_BUDGET);
  const pageSource = await readFile(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(pageSource, /createPrimitiveViewArm|armGeometryCache/);
  assert.match(
    pageSource,
    /VIEWMODEL_ARM_POSES\[kind\][\s\S]*?texturedViewmodelArmFactory\.create\(pose\)/,
  );
  factory.dispose();
});

void test('equipment mounts expose named hardware and keep gripping hands visible', async () => {
  const factory = createTexturedViewmodelArmFactory(
    await loadVanguardTemplate(),
    new THREE.Texture(),
  );
  const attachedArms: Record<
    (typeof EQUIPMENT_VIEWMODEL_KINDS)[number],
    ReturnType<typeof factory.create>[]
  > = {
    knife: [],
    grenade: [],
    smoke: [],
    flash: [],
    bomb: [],
  };
  const sharedMaterial = new THREE.MeshStandardMaterial();
  const models = createEquipmentFirstPersonModels({
    knifeGripMaterial: sharedMaterial,
    throwableBodyMaterials: {
      grenade: sharedMaterial,
      smoke: sharedMaterial,
      flash: sharedMaterial,
    },
    attachViewmodelArms: (kind, root) => {
      VIEWMODEL_ARM_POSES[kind].forEach((pose) => {
        const arm = factory.create(pose);
        attachedArms[kind].push(arm);
        root.add(arm.root);
      });
    },
  });
  const camera = new THREE.PerspectiveCamera(74, 555 / 308, 0.05, 180);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  for (const kind of EQUIPMENT_VIEWMODEL_KINDS) {
    const model = models[kind];
    const mount = EQUIPMENT_VIEWMODEL_MOUNTS[kind];
    assert.deepEqual(model.root.position.toArray(), [...mount.position]);
    assert.ok(Math.abs(model.root.scale.x - mount.scale) < 1e-9);
    model.root.updateMatrixWorld(true);

    const contactPart =
      kind === 'knife' ? model.parts.handle : model.parts.body;
    assert.ok(contactPart, `${kind} must expose its hand-contact part`);
    const contactBounds = new THREE.Box3().setFromObject(contactPart);
    for (const arm of attachedArms[kind]) {
      const palm = arm.palmAnchor.getWorldPosition(new THREE.Vector3());
      const nearestContact = contactBounds.clampPoint(
        palm,
        new THREE.Vector3(),
      );
      assert.ok(
        palm.distanceTo(nearestContact) <= 0.03,
        `${kind} palm must remain on its handle or body`,
      );
      const visibleArmBounds = clipViewmodelNdcBounds(
        projectObjectBounds(arm.root, camera),
      );
      assert.ok(
        projectedArea(visibleArmBounds) >= 0.18,
        `${kind} hand and wrist must occupy meaningful visible area`,
      );
      assert.ok(
        projectedArea(visibleArmBounds) <= 0.65,
        `${kind} arm may not dominate the lower-right frame`,
      );
    }
  }

  const bladeBounds = projectObjectBounds(models.knife.parts.blade!, camera);
  const handleBounds = projectObjectBounds(models.knife.parts.handle!, camera);
  assert.ok(projectedArea(bladeBounds) >= 0.04);
  assert.ok(projectedArea(handleBounds) >= 0.04);
  assert.ok(
    bladeBounds.minX <= handleBounds.minX - 0.2,
    'knife blade must extend clearly toward screen center from its handle',
  );

  for (const kind of ['grenade', 'smoke', 'flash'] as const) {
    const bodyBounds = projectObjectBounds(models[kind].parts.body!, camera);
    const pinBounds = projectObjectBounds(models[kind].parts.pin!, camera);
    assert.ok(projectedArea(bodyBounds) >= 0.06);
    assert.ok(projectedArea(bodyBounds) <= 0.1);
    assert.ok(projectedArea(pinBounds) >= 0.006);
    for (const bound of [bodyBounds, pinBounds]) {
      assert.ok(bound.minX >= -0.9 && bound.maxX <= 0.9);
      assert.ok(bound.minY >= -0.9 && bound.maxY <= 0.9);
    }
  }

  const bombBodyBounds = projectObjectBounds(models.bomb.parts.body!, camera);
  const bombDisplayBounds = projectObjectBounds(
    models.bomb.parts.display!,
    camera,
  );
  assert.ok(projectedArea(bombBodyBounds) >= 0.1);
  assert.ok(projectedArea(bombBodyBounds) <= 0.18);
  assert.ok(projectedArea(bombDisplayBounds) >= 0.008);
  const displayCenter = models.bomb.parts.display!.getWorldPosition(new THREE.Vector3());
  const displayRay = new THREE.Raycaster(new THREE.Vector3(), displayCenter.clone().normalize());
  const blockingBodyHit = displayRay.intersectObject(models.bomb.parts.body!, false)
    .find(hit => hit.distance < displayCenter.length());
  assert.equal(blockingBodyHit, undefined, 'the held C4 body must not hide its display');
  const bombPalms = attachedArms.bomb.map((arm) =>
    arm.palmAnchor.getWorldPosition(new THREE.Vector3()).project(camera),
  );
  assert.equal(bombPalms.length, 2);
  assert.ok(Math.abs(bombPalms[0].x - bombPalms[1].x) >= 0.25);
  assert.ok(bombPalms.every((palm) => Math.abs(palm.x) < 0.9));
  assert.ok(bombPalms.every((palm) => palm.y > -0.8 && palm.y < 0.4));

  factory.dispose();
  sharedMaterial.dispose();
});

void test('baked Vanguard palms contact the actual USP grip on both sides', async () => {
  const factory = createTexturedViewmodelArmFactory(
    await loadVanguardTemplate(),
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
  const mount = SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS.usp;
  model.root.position.set(...mount.position);
  model.root.rotation.set(...mount.rotation);
  model.root.scale.setScalar(mount.scale);
  model.root.updateMatrixWorld(true);
  const grip = secondaryPartBounds(model.root, 'grip');
  for (const arm of arms) {
    const palm = arm.palmAnchor.getWorldPosition(new THREE.Vector3());
    const nearest = grip.clampPoint(palm, new THREE.Vector3());
    assert.ok(
      palm.distanceTo(nearest) <= 0.005,
      `${arm.root.name} palm is detached from the actual USP grip`,
    );
  }
  const dominant = arms.find(
    (arm) => arm.root.userData.viewmodelGrip === 'trigger',
  );
  assert.ok(dominant);
  const camera = new THREE.PerspectiveCamera(74, 1398 / 957, 0.05, 180);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const fingerCenters = ['index', 'middle', 'ring', 'pinky'].map((digit) =>
    new THREE.Box3()
      .setFromPoints(weightedDigitPoints(dominant.mesh, digit))
      .getCenter(new THREE.Vector3()),
  );
  const projectedFingers = fingerCenters.map((center) =>
    center.clone().project(camera),
  );
  assert.ok(
    projectedFingers.every(
      (finger, index) =>
        index === 0 || finger.x > projectedFingers[index - 1].x + 0.012,
    ),
    'fully mounted fingers must read as staggered knuckles across the grip',
  );
  assert.ok(
    Math.max(...projectedFingers.map((finger) => finger.y)) -
      Math.min(...projectedFingers.map((finger) => finger.y)) <
      0.035,
    'fully mounted finger pads must wrap across the grip instead of projecting as vertical ribs',
  );
  const expandedGrip = grip.clone().expandByScalar(0.02);
  fingerCenters.forEach((center, index) =>
    assert.ok(
      expandedGrip.containsPoint(center),
      `${['index', 'middle', 'ring', 'pinky'][index]} weighted pad must remain on the actual USP grip`,
    ),
  );
  // Judge contact after the weapon mount. The old local box required a
  // minimum sideways thumb reach and therefore preserved the protruding pad.
  const thumbBounds = new THREE.Box3().setFromPoints(
    weightedDigitPoints(dominant.mesh, 'thumb'),
  );
  const thumbCenter = thumbBounds.getCenter(new THREE.Vector3());
  assert.ok(
    thumbBounds.intersectsBox(grip),
    'thumb must touch the actual grip',
  );
  assert.ok(
    expandedGrip.containsPoint(thumbCenter),
    'thumb pad must stay compact beside the grip',
  );
  assert.ok(
    fingerCenters.every((finger) => finger.distanceTo(thumbCenter) > 0.012),
    'thumb pad must remain distinct from the finger row around the grip',
  );
  factory.dispose();
});

void test('accumulated gameplay recoil has a bounded visual depth contribution', () => {
  assert.equal(getViewmodelVisualRecoilDepth(Number.NaN), 0);
  assert.equal(getViewmodelVisualRecoilDepth(-0.1), 0);
  assert.ok(Math.abs(getViewmodelVisualRecoilDepth(0.115) - 0.023) < 1e-9);
  assert.ok(getViewmodelVisualRecoilDepth(0.115) < 0.03);
});

void test('every viewmodel has a deliberate bounded arm layout', () => {
  const expectedArmCounts = {
    rifle: 2,
    carbine: 2,
    smg: 2,
    shotgun: 2,
    sniper: 2,
    glock18: 2,
    usp: 2,
    p228: 2,
    deagle: 2,
    elite: 2,
    fiveseven: 2,
    knife: 1,
    grenade: 1,
    smoke: 1,
    flash: 1,
    bomb: 2,
  } as const;
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(VIEWMODEL_ARM_POSES).map(([kind, poses]) => [
        kind,
        poses.length,
      ]),
    ),
    expectedArmCounts,
  );
  Object.values(VIEWMODEL_ARM_POSES)
    .flat()
    .forEach((pose) => {
      assert.ok(pose.position.every(Number.isFinite));
      assert.ok(pose.rotation.every(Number.isFinite));
      assert.ok(Number.isFinite(pose.scale) && pose.scale > 0);
    });
});

void test('two-hand poses use real left and right assemblies', () => {
  for (const kind of [
    'rifle',
    'carbine',
    'smg',
    'shotgun',
    'sniper',
    'glock18',
    'usp',
    'p228',
    'deagle',
    'elite',
    'fiveseven',
    'bomb',
  ] as const) {
    assert.deepEqual(
      new Set(VIEWMODEL_ARM_POSES[kind].map((pose) => pose.handedness)),
      new Set(['left', 'right']),
    );
    if (kind === 'elite') {
      assert.ok(
        VIEWMODEL_ARM_POSES[kind].every((pose) => pose.grip === 'dual-wield'),
      );
    }
  }
});

void test('pistol gloves terminate at frame and grip contacts, never muzzle ends', () => {
  for (const kind of [
    'glock18',
    'usp',
    'p228',
    'deagle',
    'fiveseven',
    'elite',
  ] as const) {
    VIEWMODEL_ARM_POSES[kind].forEach((pose) => {
      assert.ok(
        pose.grip === 'trigger' ||
          pose.grip === 'pistol-support' ||
          pose.grip === 'dual-wield',
      );
      // Every pistol muzzle is forward (negative local Z); palms stay on the
      // receiver/grip side so fingers cannot appear at the barrel tip.
      assert.ok(
        pose.position[2] >= (pose.grip === 'pistol-support' ? 0.085 : 0.1),
      );
      if (pose.grip === 'pistol-support') {
        assert.ok(pose.position[0] >= -0.05 && pose.position[0] <= -0.03);
        assert.ok(pose.position[1] >= -0.16 && pose.position[1] <= -0.13);
        // The baked shoulder axis starts downward. Negative roll sends the
        // support sleeve toward the lower-left while its palm stays on grip.
        assert.ok(pose.rotation[0] <= -0.25);
        assert.ok(pose.rotation[2] <= -0.7);
      } else {
        assert.ok(pose.position[1] >= -0.22 && pose.position[1] <= -0.17);
      }
    });
  }
});

void test('pistol contact anchors are explicit, readable, and well behind the muzzle', () => {
  const muzzleZ = {
    glock18: -0.35,
    usp: -0.43,
    p228: -0.305,
    deagle: -0.555,
    fiveseven: -0.435,
  } as const;
  for (const kind of Object.keys(muzzleZ) as Array<keyof typeof muzzleZ>) {
    VIEWMODEL_ARM_POSES[kind].forEach((pose) => {
      const contact = getViewmodelHandContactAnchor(pose.handedness, pose.grip);
      assert.ok(contact.every(Number.isFinite));
      assert.ok(contact[2] < -0.03);
      assert.ok(pose.position[2] + contact[2] > muzzleZ[kind] + 0.22);

      const geometry = createViewmodelArmGeometries(pose.handedness, pose.grip);
      geometry.glove.computeBoundingBox();
      assert.ok(
        geometry.glove.boundingBox?.containsPoint(
          new THREE.Vector3(...contact),
        ),
      );
      assert.ok(
        countGeometryTriangles(geometry.glove) >= 800 &&
          countGeometryTriangles(geometry.glove) <
            VIEWMODEL_ARM_TRIANGLE_BUDGET,
      );
      geometry.glove.dispose();
      geometry.sleeve.dispose();
    });
  }
});

void test('pistol arms keep a continuous forearm-cuff-wrist seam and wrap the grip', () => {
  const pistolKinds = [
    'glock18',
    'usp',
    'p228',
    'deagle',
    'fiveseven',
  ] as const;
  const gripBox = new THREE.Box3(
    new THREE.Vector3(-0.08, -0.34, -0.15),
    new THREE.Vector3(0.08, -0.02, 0.18),
  );
  for (const kind of pistolKinds) {
    const support = VIEWMODEL_ARM_POSES[kind].find(
      (pose) => pose.grip === 'pistol-support',
    );
    assert.ok(support);
    const geometry = createViewmodelArmGeometries(
      support.handedness,
      support.grip,
    );
    geometry.sleeve.computeBoundingBox();
    geometry.glove.computeBoundingBox();
    assert.ok(geometry.sleeve.boundingBox);
    assert.ok(geometry.glove.boundingBox);

    // The retained sleeve reaches both the lower-frame forearm exit and the
    // wrist, while the glove reaches back into that wrist volume.
    assert.ok(geometry.sleeve.boundingBox.min.y <= -0.25);
    assert.ok(geometry.sleeve.boundingBox.max.y >= -0.055);
    assert.ok(
      geometry.sleeve.boundingBox.intersectsBox(geometry.glove.boundingBox),
    );

    const triggerGeometry = createViewmodelArmGeometries('right', 'trigger');
    triggerGeometry.sleeve.computeBoundingBox();
    assert.ok(triggerGeometry.sleeve.boundingBox);
    // The trigger-side forearm remains the dominant lower-right sweep; the
    // support sleeve is intentionally shorter and partially occluded.
    assert.ok(
      geometry.sleeve.boundingBox.min.y >=
        triggerGeometry.sleeve.boundingBox.min.y + 0.04,
    );

    const handMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...support.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...support.rotation)),
      new THREE.Vector3(support.scale, support.scale, support.scale),
    );
    const handBox = geometry.glove.boundingBox.clone().applyMatrix4(handMatrix);
    // A support palm that crosses the receiver center is wrapping the grip;
    // a detached V stays entirely on the outside of the weapon.
    assert.ok(handBox.min.x < 0 && handBox.max.x > 0);
    assert.ok(handBox.intersectsBox(gripBox));
    assert.ok(
      handBox.max.z > 0.15,
      `${kind} support palm remains hidden behind the grip`,
    );
    geometry.glove.dispose();
    geometry.sleeve.dispose();
    triggerGeometry.glove.dispose();
    triggerGeometry.sleeve.dispose();
  }
});

void test('pistol knuckle web joins the palm to separated gripping fingers', () => {
  for (const [handedness, grip] of [
    ['right', 'trigger'],
    ['left', 'pistol-support'],
  ] as const) {
    const geometry = createViewmodelArmGeometries(handedness, grip);
    const [palm] = viewmodelPartBounds(
      geometry.glove,
      (name) => name === 'palm',
    );
    const [web] = viewmodelPartBounds(
      geometry.glove,
      (name) => name === 'knuckle-web',
    );
    const knuckles = viewmodelPartBounds(geometry.glove, (name) =>
      name.startsWith('lower-knuckle-'),
    );
    const fingers = viewmodelPartBounds(geometry.glove, (name) =>
      name.startsWith('lower-finger-'),
    );
    assert.ok(palm && web);
    assert.equal(knuckles.length, 3);
    assert.equal(fingers.length, 3);
    assert.ok(web.bounds.intersectsBox(palm.bounds));
    knuckles.forEach((knuckle) => {
      assert.ok(
        web.bounds.intersectsBox(knuckle.bounds),
        `${grip} ${knuckle.name} floats clear of the knuckle web`,
      );
      const size = knuckle.bounds.getSize(new THREE.Vector3());
      const dimensions = size.toArray().toSorted((left, right) => left - right);
      assert.ok(
        dimensions[2] / dimensions[0] >= 1.35,
        `${grip} ${knuckle.name} regressed to a bead-like sphere`,
      );
    });
    fingers.forEach((finger, index) => {
      assert.ok(
        finger.bounds.intersectsBox(knuckles[index].bounds),
        `${grip} ${finger.name} floats clear of its knuckle`,
      );
    });
    const fingerCenters = fingers.map((finger) =>
      finger.bounds.getCenter(new THREE.Vector3()),
    );
    assert.ok(
      fingerCenters[0].distanceTo(fingerCenters[1]) > 0.025 &&
        fingerCenters[1].distanceTo(fingerCenters[2]) > 0.025,
      `${grip} gripping fingers collapse into one blob`,
    );
    geometry.glove.dispose();
    geometry.sleeve.dispose();
  }
});

void test('glove vertex colors separate charcoal fabric from tan fingertips', () => {
  const geometry = createViewmodelArmGeometries('right', 'trigger');
  const colors = geometry.glove.getAttribute('color');
  assert.ok(colors);
  const red = Array.from({ length: colors.count }, (_, index) =>
    colors.getX(index),
  );
  assert.ok(Math.min(...red) <= 0.15);
  assert.ok(Math.max(...red) >= 0.65);
  geometry.glove.dispose();
  geometry.sleeve.dispose();
});

void test('pistol sleeves are one watertight surface that widens toward the frame exit', () => {
  for (const grip of ['trigger', 'pistol-support'] as const) {
    const handedness = grip === 'trigger' ? 'right' : 'left';
    const geometry = createViewmodelArmGeometries(handedness, grip);
    assert.equal(indexedComponentCount(geometry.sleeve), 1);
    indexedEdgeUseCounts(geometry.sleeve).forEach((uses) => {
      assert.equal(uses, 2, `${grip} sleeve contains an open or doubled edge`);
    });

    const positions = geometry.sleeve.getAttribute('position');
    const ringCount = (positions.count - 2) / 8;
    assert.equal(ringCount, 6);
    const meanRadius = (ring: number, center: THREE.Vector3) => {
      let total = 0;
      for (let segment = 0; segment < 8; segment += 1) {
        total += new THREE.Vector3()
          .fromBufferAttribute(positions, ring * 8 + segment)
          .distanceTo(center);
      }
      return total / 8;
    };
    const wristRadius = meanRadius(0, new THREE.Vector3(0, -0.052, 0.022));
    const exitRadius = meanRadius(
      ringCount - 1,
      new THREE.Vector3(...getViewmodelSleeveExit(handedness, grip)),
    );
    assert.ok(
      exitRadius > wristRadius * 1.12,
      `${grip} forearm taper is inverted`,
    );
    geometry.glove.dispose();
    geometry.sleeve.dispose();
  }
});

void test('pistol silhouette gate requires an asymmetric compact arm profile', () => {
  const weapon = { minX: 0.16, maxX: 0.29, minY: -0.42, maxY: -0.08 };
  const compactAsymmetricArms = {
    minX: 0.1,
    maxX: 0.29,
    minY: -0.61,
    maxY: -0.23,
  };
  assert.ok(
    isPistolViewmodelSilhouetteWithinLimits(compactAsymmetricArms, weapon),
  );
  assert.equal(
    isPistolViewmodelSilhouetteWithinLimits(
      { ...compactAsymmetricArms, minX: 0.04 },
      weapon,
    ),
    false,
  );
  const triggerExit = getViewmodelSleeveExit('right', 'trigger');
  const supportExit = getViewmodelSleeveExit('left', 'pistol-support');
  // Both branches stay on the weapon's right-side screen footprint: the
  // support branch is near-center, while the trigger branch owns the wider
  // lower-right sweep.
  assert.ok(triggerExit[0] > supportExit[0] && supportExit[0] > -0.05);
  assert.ok(Math.abs(triggerExit[0]) > Math.abs(supportExit[0]));
  assert.ok(triggerExit[1] < supportExit[1]);
});

void test('long-gun support arms stay behind muzzles without sideways forearms', () => {
  for (const kind of [
    'rifle',
    'carbine',
    'smg',
    'shotgun',
    'sniper',
  ] as const) {
    const support = VIEWMODEL_ARM_POSES[kind].find(
      (pose) => pose.grip === 'support',
    );
    assert.ok(support);
    assert.equal(support.handedness, 'left');
    assert.ok(support.position[2] <= -0.4);
    assert.ok(Math.abs(support.rotation[2]) < 0.2);
  }
});

void test('arm geometry stays below its triangle and draw-call budgets', () => {
  const combinations = new Set<string>();
  Object.values(VIEWMODEL_ARM_POSES)
    .flat()
    .forEach((pose) => combinations.add(`${pose.handedness}:${pose.grip}`));
  combinations.forEach((combination) => {
    const [handedness, grip] = combination.split(':') as [
      ViewmodelHandedness,
      ViewmodelGripPose,
    ];
    const geometry = createViewmodelArmGeometries(handedness, grip);
    const triangles =
      countGeometryTriangles(geometry.glove) +
      countGeometryTriangles(geometry.sleeve);
    assert.ok(triangles <= VIEWMODEL_ARM_TRIANGLE_BUDGET);
    geometry.glove.dispose();
    geometry.sleeve.dispose();
  });
  assert.equal(VIEWMODEL_ARM_DRAW_CALLS_PER_ARM, 2);
  Object.values(VIEWMODEL_ARM_POSES).forEach((poses) => {
    let visibleTriangles = 0;
    poses.forEach((pose) => {
      const geometry = createViewmodelArmGeometries(pose.handedness, pose.grip);
      visibleTriangles +=
        countGeometryTriangles(geometry.glove) +
        countGeometryTriangles(geometry.sleeve);
      geometry.glove.dispose();
      geometry.sleeve.dispose();
    });
    assert.ok(visibleTriangles <= VIEWMODEL_VISIBLE_ARM_TRIANGLE_BUDGET);
    assert.ok(
      poses.length * VIEWMODEL_ARM_DRAW_CALLS_PER_ARM <=
        VIEWMODEL_VISIBLE_ARM_DRAW_CALL_BUDGET,
    );
  });
});

void test('firearm gloves overlap their modeled support and trigger controls', () => {
  const contactBoxes = {
    rifle: [
      new THREE.Box3(
        new THREE.Vector3(-0.09, -0.08, -0.59),
        new THREE.Vector3(0.09, 0.05, -0.25),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.06, -0.31, -0.06),
        new THREE.Vector3(0.06, -0.03, 0.22),
      ),
    ],
    carbine: [
      new THREE.Box3(
        new THREE.Vector3(-0.08, -0.08, -0.64),
        new THREE.Vector3(0.08, 0.07, -0.3),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.055, -0.3, -0.07),
        new THREE.Vector3(0.055, -0.03, 0.19),
      ),
    ],
    glock18: [
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.33, -0.14),
        new THREE.Vector3(0.07, -0.03, 0.17),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.33, -0.14),
        new THREE.Vector3(0.07, -0.03, 0.17),
      ),
    ],
    usp: [
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.33, -0.14),
        new THREE.Vector3(0.07, -0.03, 0.17),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.33, -0.14),
        new THREE.Vector3(0.07, -0.03, 0.17),
      ),
    ],
    p228: [
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.33, -0.14),
        new THREE.Vector3(0.07, -0.03, 0.17),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.33, -0.14),
        new THREE.Vector3(0.07, -0.03, 0.17),
      ),
    ],
    deagle: [
      new THREE.Box3(
        new THREE.Vector3(-0.08, -0.34, -0.15),
        new THREE.Vector3(0.08, -0.03, 0.18),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.08, -0.34, -0.15),
        new THREE.Vector3(0.08, -0.03, 0.18),
      ),
    ],
    elite: [
      new THREE.Box3(
        new THREE.Vector3(-0.17, -0.34, -0.15),
        new THREE.Vector3(0, -0.03, 0.18),
      ),
      new THREE.Box3(
        new THREE.Vector3(0, -0.34, -0.15),
        new THREE.Vector3(0.17, -0.03, 0.18),
      ),
    ],
    fiveseven: [
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.33, -0.14),
        new THREE.Vector3(0.07, -0.03, 0.17),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.33, -0.14),
        new THREE.Vector3(0.07, -0.03, 0.17),
      ),
    ],
    smg: [
      new THREE.Box3(
        new THREE.Vector3(-0.05, -0.21, -0.48),
        new THREE.Vector3(0.05, -0.01, -0.36),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.055, -0.28, -0.06),
        new THREE.Vector3(0.055, -0.04, 0.18),
      ),
    ],
    shotgun: [
      new THREE.Box3(
        new THREE.Vector3(-0.1, -0.13, -0.72),
        new THREE.Vector3(0.1, 0.05, -0.4),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.31, -0.07),
        new THREE.Vector3(0.07, -0.03, 0.2),
      ),
    ],
    sniper: [
      new THREE.Box3(
        new THREE.Vector3(-0.04, -0.005, -1.68),
        new THREE.Vector3(0.04, 0.075, -0.48),
      ),
      new THREE.Box3(
        new THREE.Vector3(-0.07, -0.32, -0.08),
        new THREE.Vector3(0.07, -0.03, 0.2),
      ),
    ],
  } as const;

  Object.entries(contactBoxes).forEach(([kind, boxes]) => {
    VIEWMODEL_ARM_POSES[kind as keyof typeof contactBoxes].forEach(
      (pose, index) => {
        const geometry = createViewmodelArmGeometries(
          pose.handedness,
          pose.grip,
        );
        const handMatrix = new THREE.Matrix4().compose(
          new THREE.Vector3(...pose.position),
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(...pose.rotation),
          ),
          new THREE.Vector3(pose.scale, pose.scale, pose.scale),
        );
        geometry.glove.computeBoundingBox();
        assert.ok(geometry.glove.boundingBox);
        const gloveBox = geometry.glove.boundingBox
          .clone()
          .applyMatrix4(handMatrix);
        assert.ok(gloveBox.intersectsBox(boxes[index]));
        geometry.glove.dispose();
        geometry.sleeve.dispose();
      },
    );
  });
});

void test('sleeves exit below the compact pistol silhouette and knife clears the near plane', () => {
  for (const handedness of ['left', 'right'] as const) {
    const exit = getViewmodelSleeveExit(handedness);
    assert.ok(Math.abs(exit[0]) >= 0.2);
    assert.ok(exit[1] <= -0.3);
    assert.ok(exit.every(Number.isFinite));
  }
  const knifeArm = VIEWMODEL_ARM_POSES.knife[0];
  const geometry = createViewmodelArmGeometries(
    knifeArm.handedness,
    knifeArm.grip,
  );
  const armMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...knifeArm.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...knifeArm.rotation)),
    new THREE.Vector3(knifeArm.scale, knifeArm.scale, knifeArm.scale),
  );
  const rootMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(0.34, -0.32, KNIFE_VIEWMODEL_ROOT_Z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.22, -0.18, 0.42)),
    new THREE.Vector3(1, 1, 1),
  );
  const cameraMatrix = rootMatrix.multiply(armMatrix);
  let nearestKnifeArmPoint = Number.NEGATIVE_INFINITY;
  for (const armPart of [geometry.glove, geometry.sleeve]) {
    const transformed = armPart.clone().applyMatrix4(cameraMatrix);
    transformed.computeBoundingBox();
    nearestKnifeArmPoint = Math.max(
      nearestKnifeArmPoint,
      transformed.boundingBox?.max.z ?? Number.POSITIVE_INFINITY,
    );
    transformed.dispose();
    armPart.dispose();
  }
  assert.ok(
    nearestKnifeArmPoint <=
      -(VIEWMODEL_NEAR_PLANE + VIEWMODEL_NEAR_PLANE_CLEARANCE),
  );
});

void test('first-person arm footprint is directly gated against the weapon', () => {
  const weapon = { minX: 0.21, maxX: 0.38, minY: -0.42, maxY: -0.08 };
  const compactArms = {
    minX: 0.04,
    maxX: 0.5,
    minY: -0.47,
    maxY: -0.03,
  };
  assert.ok(
    (compactArms.maxY - compactArms.minY) / 2 <= VIEWMODEL_ARM_NDC_HEIGHT_LIMIT,
  );
  assert.ok(
    (compactArms.maxX - compactArms.minX) / 2 <= VIEWMODEL_ARM_NDC_WIDTH_LIMIT,
  );
  assert.ok(isViewmodelArmFootprintWithinLimits(compactArms, weapon));
  assert.equal(
    isViewmodelArmFootprintWithinLimits({ ...compactArms, minY: -1 }, weapon),
    false,
  );
  assert.equal(
    isViewmodelArmFootprintWithinLimits(
      { ...compactArms, minX: -0.04 },
      weapon,
    ),
    false,
  );
});

void test('viewmodel NDC footprints clip to the visible viewport before gating', () => {
  assert.deepEqual(
    clipViewmodelNdcBounds({
      minX: -1.4,
      maxX: 0.5,
      minY: -1.2,
      maxY: 1.3,
    }),
    { minX: -1, maxX: 0.5, minY: -1, maxY: 1 },
  );
});

void test('USP hand and sleeve assemblies remain behind the camera near plane', () => {
  const mount = SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS.usp;
  const rootMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...mount.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...mount.rotation)),
    new THREE.Vector3(mount.scale, mount.scale, mount.scale),
  );
  let nearest = Number.NEGATIVE_INFINITY;
  VIEWMODEL_ARM_POSES.usp.forEach((pose) => {
    const geometry = createViewmodelArmGeometries(pose.handedness, pose.grip);
    const armMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...pose.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...pose.rotation)),
      new THREE.Vector3(pose.scale, pose.scale, pose.scale),
    );
    const cameraMatrix = rootMatrix.clone().multiply(armMatrix);
    for (const part of [geometry.glove, geometry.sleeve]) {
      part.computeBoundingBox();
      assert.ok(part.boundingBox);
      nearest = Math.max(
        nearest,
        part.boundingBox.clone().applyMatrix4(cameraMatrix).max.z,
      );
      part.dispose();
    }
  });
  assert.ok(
    nearest <= -(VIEWMODEL_NEAR_PLANE + VIEWMODEL_NEAR_PLANE_CLEARANCE),
  );
});
