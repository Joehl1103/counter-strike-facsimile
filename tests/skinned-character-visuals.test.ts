import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CHARACTER_CAPSULE_PROFILES } from '../app/character-visuals.ts';
import {
  BOT_DEATH_DURATION_SECONDS,
  getBotDeathPose,
} from '../app/death-poses.ts';
import {
  SKINNED_CHARACTER_ASSET_URL,
  SKINNED_CHARACTER_DRAW_BUDGET,
  SKINNED_CHARACTER_HEIGHT_METRES,
  SKINNED_CHARACTER_TRIANGLE_BUDGET,
  applySkinnedCharacterDeathPose,
  createSkinnedCharacterInstance,
  createSkinnedCharacterTemplate,
  disposeSkinnedCharacterInstance,
  getSkinnedCharacterAnimationWeights,
  getSkinnedCharacterNormalizedPhase,
  inspectSkinnedCharacterGroundSupport,
  resetSkinnedCharacterDeathPose,
  sampleSkinnedCharacterPose,
  setSkinnedCharacterWeaponGrip,
} from '../app/skinned-character-visuals.ts';

type GlbJson = {
  accessors: { count: number }[];
  animations: { name?: string }[];
  meshes: { primitives: { indices: number; material?: number }[] }[];
  nodes: { name?: string }[];
};

function worldPosition(object: THREE.Object3D): THREE.Vector3 {
  return object.getWorldPosition(new THREE.Vector3());
}

function preciseGroundMinInVisualRoot(
  instance: ReturnType<typeof createSkinnedCharacterInstance>,
): number {
  instance.visualRoot.updateMatrixWorld(true);
  const rootInverse = instance.visualRoot.matrixWorld.clone().invert();
  const meshToRoot = new THREE.Matrix4();
  const vertex = new THREE.Vector3();
  let minimumY = Number.POSITIVE_INFINITY;
  instance.model.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    object.skeleton.update();
    meshToRoot.multiplyMatrices(rootInverse, object.matrixWorld);
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      object.getVertexPosition(index, vertex).applyMatrix4(meshToRoot);
      minimumY = Math.min(minimumY, vertex.y);
    }
  });
  return minimumY;
}

function assertGroundSupportMatchesNative(
  instance: ReturnType<typeof createSkinnedCharacterInstance>,
  label: string,
): void {
  const optimizedSamples = inspectSkinnedCharacterGroundSupport(instance);
  assert.ok(optimizedSamples.length > 0, `${label} has no support samples`);

  instance.visualRoot.updateMatrixWorld(true);
  const rootInverse = instance.visualRoot.matrixWorld.clone().invert();
  const meshToRootByMesh = new Map<THREE.SkinnedMesh, THREE.Matrix4>();
  const nativeVertex = new THREE.Vector3();
  let optimizedMinimum = Number.POSITIVE_INFINITY;
  let nativeMinimum = Number.POSITIVE_INFINITY;
  for (const sample of optimizedSamples) {
    let meshToRoot = meshToRootByMesh.get(sample.mesh);
    if (!meshToRoot) {
      meshToRoot = new THREE.Matrix4().multiplyMatrices(
        rootInverse,
        sample.mesh.matrixWorld,
      );
      meshToRootByMesh.set(sample.mesh, meshToRoot);
    }
    sample.mesh
      .getVertexPosition(sample.vertexIndex, nativeVertex)
      .applyMatrix4(meshToRoot);
    assert.ok(
      sample.position.distanceTo(nativeVertex) <= 1e-10,
      `${label} vertex=${sample.vertexIndex} distance=${sample.position.distanceTo(nativeVertex)}`,
    );
    optimizedMinimum = Math.min(optimizedMinimum, sample.position.y);
    nativeMinimum = Math.min(nativeMinimum, nativeVertex.y);
  }
  assert.ok(
    Math.abs(optimizedMinimum - nativeMinimum) <= 1e-10,
    `${label} support minimum=${optimizedMinimum} native=${nativeMinimum}`,
  );
  assert.ok(
    Math.abs(-optimizedMinimum - -nativeMinimum) <= 1e-10,
    `${label} correction=${-optimizedMinimum} native=${-nativeMinimum}`,
  );
}

function groundSupportIndexSignatures(
  instance: ReturnType<typeof createSkinnedCharacterInstance>,
): ReadonlyMap<THREE.SkinnedMesh, string> {
  const signatures = new Map<THREE.SkinnedMesh, number[]>();
  for (const sample of inspectSkinnedCharacterGroundSupport(instance)) {
    let indices = signatures.get(sample.mesh);
    if (!indices) {
      indices = [];
      signatures.set(sample.mesh, indices);
    }
    indices.push(sample.vertexIndex);
  }
  return new Map(
    [...signatures].map(([mesh, indices]) => [mesh, indices.join(',')]),
  );
}

function assertGroundSupportSetIsUnchanged(
  expected: ReadonlyMap<THREE.SkinnedMesh, string>,
  instance: ReturnType<typeof createSkinnedCharacterInstance>,
  label: string,
): void {
  const actual = groundSupportIndexSignatures(instance);
  assert.equal(actual.size, expected.size, `${label} support mesh count`);
  for (const [mesh, expectedIndices] of expected) {
    assert.equal(
      actual.get(mesh),
      expectedIndices,
      `${label} support indices changed`,
    );
  }
}

function assertFullSkinGroundCorrection(
  instance: ReturnType<typeof createSkinnedCharacterInstance>,
  label: string,
): void {
  const minimumY = preciseGroundMinInVisualRoot(instance);
  assert.ok(
    minimumY >= -0.02 && minimumY <= 0.002,
    `${label} full native minimum=${minimumY}`,
  );
}

function preciseSkinnedBoundsInVisualRoot(
  instance: ReturnType<typeof createSkinnedCharacterInstance>,
  selectedBones?: ReadonlySet<string>,
): THREE.Box3 {
  instance.visualRoot.updateMatrixWorld(true);
  const rootInverse = instance.visualRoot.matrixWorld.clone().invert();
  const meshToRoot = new THREE.Matrix4();
  const vertex = new THREE.Vector3();
  const bounds = new THREE.Box3();
  instance.model.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    object.skeleton.update();
    meshToRoot.multiplyMatrices(rootInverse, object.matrixWorld);
    const position = object.geometry.getAttribute('position');
    const skinIndex = object.geometry.getAttribute('skinIndex');
    const skinWeight = object.geometry.getAttribute('skinWeight');
    for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
      if (selectedBones) {
        let selectedWeight = 0;
        for (let influence = 0; influence < 4; influence += 1) {
          const boneName =
            object.skeleton.bones[
              skinIndex.getComponent(vertexIndex, influence)
            ]?.name;
          if (boneName && selectedBones.has(boneName))
            selectedWeight += skinWeight.getComponent(vertexIndex, influence);
        }
        if (selectedWeight < 0.5) continue;
      }
      object.getVertexPosition(vertexIndex, vertex).applyMatrix4(meshToRoot);
      bounds.expandByPoint(vertex);
    }
  });
  return bounds;
}

const HEAD_AUTHORITY = Object.freeze({ centerY: 1.92, radius: 0.25 });
const HEAD_COVER_AUTHORITY = Object.freeze({
  centerY: 1.94,
  radius: 0.276,
  thetaLength: Math.PI * 0.58,
});

function insideAuthorityCapsule(
  point: THREE.Vector3,
  centerY: number,
  part: 'body' | 'vest',
  scaleZ: number,
): boolean {
  const { radius, length } = CHARACTER_CAPSULE_PROFILES[part];
  const closestY = THREE.MathUtils.clamp(
    point.y,
    centerY - length / 2,
    centerY + length / 2,
  );
  return (
    point.x * point.x +
      (point.y - closestY) * (point.y - closestY) +
      (point.z / scaleZ) * (point.z / scaleZ) <=
    radius * radius
  );
}

function measureHeadAuthorityOverlap(
  instance: ReturnType<typeof createSkinnedCharacterInstance>,
) {
  instance.visualRoot.updateMatrixWorld(true);
  const rootInverse = instance.visualRoot.matrixWorld.clone().invert();
  const meshToRoot = new THREE.Matrix4();
  const point = new THREE.Vector3();
  const headCenter = new THREE.Vector3(0, HEAD_AUTHORITY.centerY, 0);
  const coverCenter = new THREE.Vector3(0, HEAD_COVER_AUTHORITY.centerY, 0);
  const relativeCover = new THREE.Vector3();
  const bounds = new THREE.Box3();
  let total = 0;
  let inHead = 0;
  let inHeadCover = 0;
  let inHeadUnion = 0;
  let inBody = 0;
  let inVest = 0;
  instance.model.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    object.skeleton.update();
    meshToRoot.multiplyMatrices(rootInverse, object.matrixWorld);
    const position = object.geometry.getAttribute('position');
    const skinIndex = object.geometry.getAttribute('skinIndex');
    const skinWeight = object.geometry.getAttribute('skinWeight');
    for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
      const boneIndices = [
        skinIndex.getX(vertexIndex),
        skinIndex.getY(vertexIndex),
        skinIndex.getZ(vertexIndex),
        skinIndex.getW(vertexIndex),
      ];
      const boneWeights = [
        skinWeight.getX(vertexIndex),
        skinWeight.getY(vertexIndex),
        skinWeight.getZ(vertexIndex),
        skinWeight.getW(vertexIndex),
      ];
      let headWeight = 0;
      for (let influence = 0; influence < 4; influence += 1)
        if (
          object.skeleton.bones[boneIndices[influence]]?.name ===
          'mixamorigHead'
        )
          headWeight += boneWeights[influence];
      if (headWeight < 0.05) continue;

      object.getVertexPosition(vertexIndex, point).applyMatrix4(meshToRoot);
      bounds.expandByPoint(point);
      total += 1;
      const insideHead =
        point.distanceToSquared(headCenter) <= HEAD_AUTHORITY.radius ** 2;
      relativeCover.subVectors(point, coverCenter);
      const coverDistance = relativeCover.length();
      const insideHeadCover =
        coverDistance <= HEAD_COVER_AUTHORITY.radius &&
        Math.acos(
          THREE.MathUtils.clamp(
            relativeCover.y / Math.max(coverDistance, 1e-9),
            -1,
            1,
          ),
        ) <= HEAD_COVER_AUTHORITY.thetaLength;
      if (insideHead) inHead += 1;
      if (insideHeadCover) inHeadCover += 1;
      if (insideHead || insideHeadCover) inHeadUnion += 1;
      if (insideAuthorityCapsule(point, 1.18, 'body', 0.72)) inBody += 1;
      if (insideAuthorityCapsule(point, 1.36, 'vest', 0.7)) inVest += 1;
    }
  });
  return {
    bounds,
    total,
    headFraction: inHead / total,
    headCoverFraction: inHeadCover / total,
    headUnionFraction: inHeadUnion / total,
    bodyFraction: inBody / total,
    vestFraction: inVest / total,
  };
}

function createAuthorityRayMeshes(): THREE.Mesh[] {
  const material = new THREE.MeshBasicMaterial();
  const bodyProfile = CHARACTER_CAPSULE_PROFILES.body;
  const vestProfile = CHARACTER_CAPSULE_PROFILES.vest;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_AUTHORITY.radius, 32, 20),
    material,
  );
  head.name = 'head';
  head.position.y = HEAD_AUTHORITY.centerY;
  const headCover = new THREE.Mesh(
    new THREE.SphereGeometry(
      HEAD_COVER_AUTHORITY.radius,
      24,
      16,
      0,
      Math.PI * 2,
      0,
      HEAD_COVER_AUTHORITY.thetaLength,
    ),
    material,
  );
  headCover.name = 'head';
  headCover.position.y = HEAD_COVER_AUTHORITY.centerY;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      bodyProfile.radius,
      bodyProfile.length,
      bodyProfile.performance.capSegments,
      bodyProfile.performance.radialSegments,
    ),
    material,
  );
  body.name = 'torso';
  body.position.y = 1.18;
  body.scale.z = 0.72;
  const vest = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      vestProfile.radius,
      vestProfile.length,
      vestProfile.performance.capSegments,
      vestProfile.performance.radialSegments,
    ),
    material,
  );
  vest.name = 'torso';
  vest.position.y = 1.36;
  vest.scale.z = 0.7;
  const meshes = [head, headCover, body, vest];
  for (const mesh of meshes) mesh.updateMatrixWorld(true);
  return meshes;
}

function assertArmAnatomy(
  instance: ReturnType<typeof createSkinnedCharacterInstance>,
  label: string,
): void {
  instance.visualRoot.updateWorldMatrix(true, true);
  for (const [side, palm, target, outwardSign] of [
    ['Left', instance.supportPalmAnchor, instance.supportGripTarget, -1],
    ['Right', instance.dominantPalmAnchor, instance.dominantGripTarget, 1],
  ] as const) {
    const shoulder = worldPosition(instance.bones[`mixamorig:${side}Arm`]);
    const elbow = worldPosition(instance.bones[`mixamorig:${side}ForeArm`]);
    const palmPosition = worldPosition(palm);
    const targetPosition = worldPosition(target);
    const upperLength = shoulder.distanceTo(elbow);
    const lowerLength = elbow.distanceTo(palmPosition);
    const bend = elbow
      .clone()
      .sub(shoulder)
      .normalize()
      .dot(palmPosition.clone().sub(elbow).normalize());
    const localShoulder = instance.modelRoot.worldToLocal(shoulder.clone());
    const localElbow = instance.modelRoot.worldToLocal(elbow.clone());
    const elbowOutward = (localElbow.x - localShoulder.x) * outwardSign;

    assert.ok(
      palmPosition.distanceTo(targetPosition) < 0.01,
      `${label} ${side} palm contact=${palmPosition.distanceTo(targetPosition)}`,
    );
    assert.ok(
      upperLength > 0.19 && upperLength < 0.38,
      `${label} ${side} upper=${upperLength}`,
    );
    assert.ok(
      lowerLength > 0.23 && lowerLength < 0.44,
      `${label} ${side} lower=${lowerLength}`,
    );
    assert.ok(bend > -0.85 && bend < 0.96, `${label} ${side} bend=${bend}`);
    assert.ok(
      elbowOutward > 0.005,
      `${label} ${side} elbow plane=${elbowOutward}`,
    );
  }
}

function readCharacterGlbJson(): GlbJson {
  const asset = readFileSync(
    new URL('../public/assets/characters/vanguard.glb', import.meta.url),
  );
  assert.equal(asset.subarray(0, 4).toString(), 'glTF');
  const jsonLength = asset.readUInt32LE(12);
  return JSON.parse(asset.subarray(20, 20 + jsonLength).toString()) as GlbJson;
}

function readTexturelessCharacterGlb(
  filename = 'vanguard.glb',
): ArrayBuffer {
  const source = readFileSync(
    new URL(`../public/assets/characters/${filename}`, import.meta.url),
  );
  const sourceJsonLength = source.readUInt32LE(12);
  const json = JSON.parse(
    source.subarray(20, 20 + sourceJsonLength).toString(),
  ) as {
    materials: {
      normalTexture?: unknown;
      pbrMetallicRoughness?: { baseColorTexture?: unknown };
    }[];
  };
  for (const material of json.materials) {
    delete material.normalTexture;
    if (material.pbrMetallicRoughness)
      delete material.pbrMetallicRoughness.baseColorTexture;
  }
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const paddedJsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const binaryChunk = source.subarray(20 + sourceJsonLength);
  const output = Buffer.alloc(20 + paddedJsonLength + binaryChunk.length, 0x20);
  source.copy(output, 0, 0, 12);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(paddedJsonLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonBytes.copy(output, 20);
  binaryChunk.copy(output, 20 + paddedJsonLength);
  return output.buffer.slice(
    output.byteOffset,
    output.byteOffset + output.byteLength,
  );
}

void test('Vanguard asset stays within the approved skinned-character budget', () => {
  const glb = readCharacterGlbJson();
  const primitives = glb.meshes.flatMap((mesh) => mesh.primitives);
  const triangles = primitives.reduce(
    (sum, primitive) => sum + glb.accessors[primitive.indices].count / 3,
    0,
  );
  assert.equal(SKINNED_CHARACTER_ASSET_URL, '/assets/characters/vanguard.glb');
  assert.equal(SKINNED_CHARACTER_HEIGHT_METRES, 2.272);
  assert.equal(SKINNED_CHARACTER_TRIANGLE_BUDGET, 12_000);
  assert.equal(SKINNED_CHARACTER_DRAW_BUDGET, 2);
  assert.ok(
    triangles > 10_000 && triangles <= SKINNED_CHARACTER_TRIANGLE_BUDGET,
  );
  assert.ok(primitives.length <= SKINNED_CHARACTER_DRAW_BUDGET);
  assert.equal(new Set(primitives.map(({ material }) => material)).size, 2);
});

void test('Vanguard asset has the clips and bones required by the runtime adapter', () => {
  const glb = readCharacterGlbJson();
  const clips = new Set(glb.animations.map(({ name }) => name));
  for (const clip of ['Idle', 'Walk', 'Run', 'TPose'])
    assert.ok(clips.has(clip));
  const bones = new Set(glb.nodes.map(({ name }) => name));
  for (const bone of [
    'mixamorig:Hips',
    'mixamorig:Spine2',
    'mixamorig:Head',
    'mixamorig:LeftArm',
    'mixamorig:LeftForeArm',
    'mixamorig:LeftHand',
    'mixamorig:RightArm',
    'mixamorig:RightForeArm',
    'mixamorig:RightHand',
    'mixamorig:LeftUpLeg',
    'mixamorig:LeftLeg',
    'mixamorig:LeftFoot',
    'mixamorig:RightUpLeg',
    'mixamorig:RightLeg',
    'mixamorig:RightFoot',
  ])
    assert.ok(bones.has(bone), bone);
});

void test('animation weights are finite, normalized, and movement-sensitive', () => {
  assert.deepEqual(getSkinnedCharacterAnimationWeights(0), {
    idle: 1,
    walk: 0,
    run: 0,
  });
  const walk = getSkinnedCharacterAnimationWeights(2);
  const run = getSkinnedCharacterAnimationWeights(4.8);
  for (const weights of [walk, run]) {
    assert.ok(Math.abs(weights.idle + weights.walk + weights.run - 1) < 1e-12);
    for (const value of Object.values(weights))
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
  }
  assert.ok(walk.walk > walk.run);
  assert.ok(run.run > run.walk);
  assert.deepEqual(getSkinnedCharacterAnimationWeights(Number.NaN), {
    idle: 1,
    walk: 0,
    run: 0,
  });
});

void test('phase wraps deterministically', () => {
  assert.equal(getSkinnedCharacterNormalizedPhase(0), 0);
  assert.ok(
    Math.abs(getSkinnedCharacterNormalizedPhase(Math.PI) - 0.5) < 1e-12,
  );
  assert.ok(
    Math.abs(getSkinnedCharacterNormalizedPhase(-Math.PI / 2) - 0.75) < 1e-12,
  );
  assert.equal(getSkinnedCharacterNormalizedPhase(Number.NaN), 0);
});

void test('repeating an identical sampled pose does not accumulate crouch, aim or grip corrections', async () => {
  const gltf = await new GLTFLoader().parseAsync(readTexturelessCharacterGlb(), '');
  const instance = createSkinnedCharacterInstance(createSkinnedCharacterTemplate(gltf), 'ct');
  const pose = { speed: 0, phase: 0, pelvisLift: -0.28, upperBodyYaw: 0.3, visualAimPitch: 0.2 };
  try {
    sampleSkinnedCharacterPose(instance, pose, { elapsedSeconds: 1 });
    const initial = Object.values(instance.bones).map((bone) => ({
      position: bone.position.clone(), quaternion: bone.quaternion.clone(),
    }));
    for (let frame = 0; frame < 20; frame += 1)
      sampleSkinnedCharacterPose(instance, pose, { elapsedSeconds: 1 });
    Object.values(instance.bones).forEach((bone, index) => {
      assert.ok(bone.position.distanceTo(initial[index].position) < 1e-9, bone.name);
      assert.ok(bone.quaternion.angleTo(initial[index].quaternion) < 1e-6, bone.name);
    });
  } finally {
    disposeSkinnedCharacterInstance(instance);
  }
});

void test('visible face stays aligned with unchanged head authority through locomotion', async () => {
  // Lock the adapter audit to the authority transforms owned by page.tsx.
  const pageSource = readFileSync(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(pageSource, /new THREE\.SphereGeometry\(0\.25, 32, 20\)/);
  assert.match(pageSource, /head\.position\.y = 1\.92/);
  assert.match(pageSource, /headCover\.position\.y = 1\.94/);
  assert.match(pageSource, /Math\.PI \* 0\.58/);
  assert.match(pageSource, /body\.position\.y = 1\.18/);
  assert.match(pageSource, /vest\.position\.y = 1\.36/);

  const gltf = await new GLTFLoader().parseAsync(
    readTexturelessCharacterGlb(),
    '',
  );
  const instance = createSkinnedCharacterInstance(
    createSkinnedCharacterTemplate(gltf),
    'ct',
  );
  const authorityMeshes = createAuthorityRayMeshes();
  const raycaster = new THREE.Raycaster();
  const samples = [
    ...[0, 0.4, 0.8, 1.2, 1.6].map((elapsedSeconds) => ({
      label: `idle-${elapsedSeconds}`,
      phase: 0,
      speed: 0,
      elapsedSeconds,
    })),
    ...Array.from({ length: 16 }, (_, index) => ({
      label: `walk-${index}`,
      phase: (index * Math.PI) / 8,
      speed: 2.2,
      elapsedSeconds: index / 60,
    })),
    ...Array.from({ length: 16 }, (_, index) => ({
      label: `run-${index}`,
      phase: (index * Math.PI) / 8,
      speed: 4.2,
      elapsedSeconds: index / 60,
    })),
  ];
  try {
    for (const sample of samples) {
      sampleSkinnedCharacterPose(
        instance,
        {
          phase: sample.phase,
          speed: sample.speed,
          weaponSocketX: 0.07,
          weaponSocketY: 1.2,
          weaponSocketZ: -0.34,
        },
        { elapsedSeconds: sample.elapsedSeconds },
      );
      const overlap = measureHeadAuthorityOverlap(instance);
      const center = overlap.bounds.getCenter(new THREE.Vector3());
      const size = overlap.bounds.getSize(new THREE.Vector3());
      assert.ok(
        overlap.bounds.min.y >= 1.64 && overlap.bounds.max.y <= 2.22,
        `${sample.label} visible head y=${overlap.bounds.min.y}..${overlap.bounds.max.y}`,
      );
      assert.ok(
        Math.abs(center.y - HEAD_AUTHORITY.centerY) <= 0.1,
        `${sample.label} head center y=${center.y}`,
      );
      assert.ok(
        overlap.headFraction >= 0.3 && overlap.headUnionFraction >= 0.4,
        `${sample.label} head overlap sphere=${overlap.headFraction} union=${overlap.headUnionFraction}`,
      );
      assert.ok(
        overlap.bodyFraction < 0.02 && overlap.vestFraction < 0.03,
        `${sample.label} torso overlap body=${overlap.bodyFraction} vest=${overlap.vestFraction}`,
      );

      // Fire from the character's front through the visible face center and
      // forehead. The first unchanged proxy surface must resolve as a head hit.
      for (const [rayLabel, y] of [
        ['face', center.y],
        ['forehead', center.y + size.y * 0.28],
      ] as const) {
        raycaster.set(
          new THREE.Vector3(center.x, y, -3),
          new THREE.Vector3(0, 0, 1),
        );
        const visibleHits: THREE.Intersection[] = [];
        instance.model.traverse((object) => {
          if (object instanceof THREE.SkinnedMesh)
            THREE.SkinnedMesh.prototype.raycast.call(
              object,
              raycaster,
              visibleHits,
            );
        });
        assert.ok(
          visibleHits.length > 0,
          `${sample.label} ${rayLabel} misses visible mesh y=${y}`,
        );
        const firstHit = raycaster.intersectObjects(authorityMeshes, false)[0];
        assert.equal(
          firstHit?.object.name,
          'head',
          `${sample.label} ${rayLabel} first=${firstHit?.object.name ?? 'none'} y=${y}`,
        );
      }
    }
  } finally {
    disposeSkinnedCharacterInstance(instance);
    const materials = new Set<THREE.Material>();
    for (const mesh of authorityMeshes) {
      mesh.geometry.dispose();
      materials.add(mesh.material as THREE.Material);
    }
    materials.forEach((material) => material.dispose());
  }
});

void test('actual skeleton keeps a connected weapon pose through idle, motion, crouch, and death', async () => {
  const gltf = await new GLTFLoader().parseAsync(
    readTexturelessCharacterGlb(),
    '',
  );
  const template = createSkinnedCharacterTemplate(gltf);
  const first = createSkinnedCharacterInstance(template, 'ct');
  const second = createSkinnedCharacterInstance(template, 't');
  try {
    assert.notEqual(
      first.bones['mixamorig:Hips'],
      second.bones['mixamorig:Hips'],
    );
    assert.notEqual(first.materials[0], second.materials[0]);
    const firstMesh = first.model.getObjectByName(
      'classic-uniform-skinned-body',
    ) as THREE.Mesh;
    const secondMesh = second.model.getObjectByName(
      'classic-uniform-skinned-body',
    ) as THREE.Mesh;
    assert.ok(firstMesh && secondMesh);
    for (const attribute of ['position', 'normal', 'skinIndex', 'skinWeight'])
      assert.equal(
        firstMesh.geometry.getAttribute(attribute),
        secondMesh.geometry.getAttribute(attribute),
      );
    assert.notEqual(
      firstMesh.geometry.getAttribute('color'),
      secondMesh.geometry.getAttribute('color'),
    );
    assert.notDeepEqual(
      firstMesh.geometry.getAttribute('color').array,
      secondMesh.geometry.getAttribute('color').array,
    );
    for (const instance of [first, second]) {
      const surfaces: THREE.SkinnedMesh[] = [];
      instance.model.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh) surfaces.push(object);
      });
      assert.equal(
        surfaces.length,
        1,
        'classic clothing must remain one skinned draw',
      );
      const triangles = surfaces[0].geometry.getAttribute('position').count / 3;
      assert.ok(triangles <= SKINNED_CHARACTER_TRIANGLE_BUDGET);
    }

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
      'fiveseven',
      'elite',
    ] as const) {
      setSkinnedCharacterWeaponGrip(first, kind);
      sampleSkinnedCharacterPose(
        first,
        {
          phase: 0,
          speed: 0,
          weaponSocketX: 0.07,
          weaponSocketY: 1.2,
          weaponSocketZ: -0.34,
        },
        { elapsedSeconds: 0 },
      );
      assertArmAnatomy(first, `idle-${kind}`);
      for (const [motionIndex, phase] of [
        Math.PI / 2,
        Math.PI * 1.5,
      ].entries()) {
        sampleSkinnedCharacterPose(first, {
          phase,
          speed: motionIndex === 0 ? 2.2 : 4.2,
          weaponSocketX: 0.07,
          weaponSocketY: 1.2,
          weaponSocketZ: -0.34,
        });
        assertArmAnatomy(first, `moving-${kind}-${motionIndex}`);
      }
    }

    // Exact page-default idle sample: phase 0, speed 0, inherited legacy socket.
    setSkinnedCharacterWeaponGrip(first, 'rifle');
    sampleSkinnedCharacterPose(
      first,
      {
        phase: 0,
        speed: 0,
        weaponSocketX: 0.07,
        weaponSocketY: 1.2,
        weaponSocketZ: -0.34,
      },
      { elapsedSeconds: 0 },
    );
    assert.equal(first.modelRoot.rotation.y, 0);
    assert.ok(Math.abs(first.weaponSocket.position.y - 1.3) < 1e-12);
    assertArmAnatomy(first, 'idle');

    setSkinnedCharacterWeaponGrip(first, 'carbine');
    for (const [index, phase] of [
      0,
      Math.PI / 2,
      Math.PI,
      Math.PI * 1.5,
    ].entries()) {
      sampleSkinnedCharacterPose(first, {
        phase,
        speed: index % 2 === 0 ? 2.2 : 4.2,
        weaponSocketX: 0.07,
        weaponSocketY: 1.2,
        weaponSocketZ: -0.34,
      });
      assertArmAnatomy(first, `moving-${index}`);
    }

    sampleSkinnedCharacterPose(first, {
      phase: Math.PI * 0.7,
      speed: 3.2,
      weaponSocketX: 0.07,
      weaponSocketY: 1.2,
      weaponSocketZ: -0.34,
    });
    first.visualRoot.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(first.modelRoot, true);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.y > 2.05 && size.y < 2.4, `height=${size.y}`);
    assert.ok(
      bounds.min.y > -0.08 && bounds.min.y < 0.12,
      `ground=${bounds.min.y}`,
    );
    assertArmAnatomy(first, 'moving');

    sampleSkinnedCharacterPose(first, {
      speed: 0,
      pelvisLift: -0.28,
      weaponSocketY: 0.92,
    });
    first.visualRoot.updateMatrixWorld(true);
    const crouchBounds = new THREE.Box3().setFromObject(first.modelRoot, true);
    const crouchSize = crouchBounds.getSize(new THREE.Vector3());
    assert.ok(crouchBounds.min.y > -0.04 && crouchBounds.min.y < 0.05);
    assert.ok(crouchSize.y < 2.05, `crouch height=${crouchSize.y}`);
    assertArmAnatomy(first, 'crouch');

    sampleSkinnedCharacterPose(first, { speed: 0 });
    applySkinnedCharacterDeathPose(first, getBotDeathPose(0.58, 0));
    first.visualRoot.updateMatrixWorld(true);
    const deathBounds = new THREE.Box3().setFromObject(first.modelRoot, true);
    const deathSize = deathBounds.getSize(new THREE.Vector3());
    assert.ok(deathSize.y < size.y * 0.85, `death height=${deathSize.y}`);
    assert.ok(
      deathBounds.min.y > -0.01 && deathBounds.min.y < 0.01,
      `death ground=${deathBounds.min.y}`,
    );
    assertArmAnatomy(first, 'death');
  } finally {
    disposeSkinnedCharacterInstance(first);
    disposeSkinnedCharacterInstance(second);
  }
});

void test('authored uniform death variants settle the torso and head into a compact grounded corpse from every action origin', async () => {
  const gltf = await new GLTFLoader().parseAsync(
    readTexturelessCharacterGlb(),
    '',
  );
  const instance = createSkinnedCharacterInstance(
    createSkinnedCharacterTemplate(gltf),
    'ct',
  );
  const torsoBones = new Set([
    'mixamorigHips',
    'mixamorigSpine',
    'mixamorigSpine1',
    'mixamorigSpine2',
  ]);
  const headBones = new Set(['mixamorigNeck', 'mixamorigHead']);
  const armBones = new Set([
    'mixamorigLeftArm',
    'mixamorigLeftForeArm',
    'mixamorigLeftHand',
    'mixamorigRightArm',
    'mixamorigRightForeArm',
    'mixamorigRightHand',
  ]);
  const legBones = new Set([
    'mixamorigLeftUpLeg',
    'mixamorigLeftLeg',
    'mixamorigLeftFoot',
    'mixamorigRightUpLeg',
    'mixamorigRightLeg',
    'mixamorigRightFoot',
  ]);
  const origins = [
    { label: 'neutral', speed: 0, phase: 0, upperBodyYaw: 0, aim: 0 },
    {
      label: 'left-contact',
      speed: 4.2,
      phase: 0,
      upperBodyYaw: 0,
      aim: 0,
    },
    {
      label: 'right-contact',
      speed: 4.2,
      phase: Math.PI,
      upperBodyYaw: 0,
      aim: 0,
    },
    {
      label: 'strafe-aim',
      speed: 3.2,
      phase: Math.PI / 2,
      upperBodyYaw: 0.55,
      aim: -0.24,
    },
  ] as const;
  const rootMatrix = new THREE.Matrix4();
  const boneQuaternions = new Map<string, THREE.Quaternion>();
  sampleSkinnedCharacterPose(instance, {
    speed: 0,
    phase: 0,
    weaponSocketX: 0.07,
    weaponSocketY: 1.2,
    weaponSocketZ: -0.34,
  });
  instance.visualRoot.updateMatrixWorld(true);
  const resetRootMatrix = instance.modelRoot.matrix.clone();
  const resetBoneQuaternions = new Map(
    Object.entries(instance.bones).map(([name, bone]) => [
      name,
      bone.quaternion.clone(),
    ]),
  );
  try {
    for (const origin of origins) {
      const sampleOrigin = () =>
        sampleSkinnedCharacterPose(instance, {
          speed: origin.speed,
          phase: origin.phase,
          upperBodyYaw: origin.upperBodyYaw,
          visualAimPitch: origin.aim,
          weaponSocketX: 0.07,
          weaponSocketY: 1.2,
          weaponSocketZ: -0.34,
        });
      sampleOrigin();
      instance.visualRoot.updateMatrixWorld(true);
      rootMatrix.copy(instance.modelRoot.matrix);
      boneQuaternions.clear();
      for (const [name, bone] of Object.entries(instance.bones))
        boneQuaternions.set(name, bone.quaternion.clone());

      applySkinnedCharacterDeathPose(instance, getBotDeathPose(0, 0));
      assert.deepEqual(
        instance.modelRoot.matrix.toArray(),
        rootMatrix.toArray(),
        `${origin.label} changed at death start`,
      );

      const finalVariantSignatures = new Set<string>();
      for (const variant of [0, 1, 2, 3] as const) {
        for (const elapsedSeconds of [0.29, BOT_DEATH_DURATION_SECONDS]) {
          sampleOrigin();
          applySkinnedCharacterDeathPose(
            instance,
            getBotDeathPose(elapsedSeconds, variant),
          );
          const full = preciseSkinnedBoundsInVisualRoot(instance);
          const torso = preciseSkinnedBoundsInVisualRoot(instance, torsoBones);
          const head = preciseSkinnedBoundsInVisualRoot(instance, headBones);
          const arms = preciseSkinnedBoundsInVisualRoot(instance, armBones);
          const legs = preciseSkinnedBoundsInVisualRoot(instance, legBones);
          const size = full.getSize(new THREE.Vector3());
          for (const value of [
            ...full.min.toArray(),
            ...full.max.toArray(),
            ...torso.min.toArray(),
            ...torso.max.toArray(),
            ...head.min.toArray(),
            ...head.max.toArray(),
            ...arms.min.toArray(),
            ...arms.max.toArray(),
            ...legs.min.toArray(),
            ...legs.max.toArray(),
          ])
            assert.ok(
              Number.isFinite(value),
              `${origin.label}/v${variant}/t${elapsedSeconds} non-finite bound`,
            );
          assert.ok(
            full.min.y >= -0.02 && full.min.y <= 0.002,
            `${origin.label}/v${variant}/t${elapsedSeconds} ground=${full.min.y}`,
          );
          if (elapsedSeconds === BOT_DEATH_DURATION_SECONDS) {
            finalVariantSignatures.add(
              [
                ...instance.modelRoot.quaternion.toArray(),
                ...instance.bones['mixamorig:LeftUpLeg'].quaternion.toArray(),
                ...instance.bones['mixamorig:RightUpLeg'].quaternion.toArray(),
              ]
                .map((value) => value.toFixed(5))
                .join(','),
            );
            assert.ok(
              full.max.y <= 0.9,
              `${origin.label}/v${variant} corpse height=${size.y} torso=${torso.min.y}..${torso.max.y} head=${head.min.y}..${head.max.y} arms=${arms.min.y}..${arms.max.y} legs=${legs.min.y}..${legs.max.y}`,
            );
            assert.ok(
              torso.max.y <= 0.75,
              `${origin.label}/v${variant} full=${full.min.y}..${full.max.y} torso=${torso.min.y}..${torso.max.y} head=${head.min.y}..${head.max.y} arms=${arms.min.y}..${arms.max.y} legs=${legs.min.y}..${legs.max.y}`,
            );
            assert.ok(
              head.max.y <= 0.75,
              `${origin.label}/v${variant} head=${head.min.y}..${head.max.y}`,
            );
            assert.ok(
              arms.max.y <= 0.9 && legs.max.y <= 0.8,
              `${origin.label}/v${variant} arms=${arms.max.y} legs=${legs.max.y}`,
            );
          }
        }
      }
      assert.equal(
        finalVariantSignatures.size,
        4,
        `${origin.label} collapsed distinct death variants`,
      );

      resetSkinnedCharacterDeathPose(instance);
      for (const [name, bone] of Object.entries(instance.bones))
        assert.deepEqual(
          bone.quaternion.toArray(),
          boneQuaternions.get(name)?.toArray(),
          `${origin.label} adapter failed to restore ${name}`,
        );
      sampleSkinnedCharacterPose(instance, {
        speed: 0,
        phase: 0,
        weaponSocketX: 0.07,
        weaponSocketY: 1.2,
        weaponSocketZ: -0.34,
      });
      assert.deepEqual(
        instance.modelRoot.matrix.toArray(),
        resetRootMatrix.toArray(),
      );
      for (const [name, bone] of Object.entries(instance.bones)) {
        const expected = resetBoneQuaternions.get(name);
        assert.ok(expected);
        assert.ok(
          1 - Math.abs(bone.quaternion.dot(expected)) <= 1e-12,
          `${origin.label} failed idle respawn ${name}: ${1 - Math.abs(bone.quaternion.dot(expected))}`,
        );
      }
    }
  } finally {
    disposeSkinnedCharacterInstance(instance);
  }
});

void test('reduced grounding stays within two centimetres of full skin bounds in the visual-root frame', async () => {
  const gltf = await new GLTFLoader().parseAsync(
    readTexturelessCharacterGlb(),
    '',
  );
  const instance = createSkinnedCharacterInstance(
    createSkinnedCharacterTemplate(gltf),
    'ct',
  );
  const grips = [
    'rifle',
    'carbine',
    'smg',
    'shotgun',
    'sniper',
    'glock18',
    'usp',
    'p228',
    'deagle',
    'fiveseven',
    'elite',
  ] as const;
  const parentTransforms = [
    { position: [0, 0, 0] as const, rotation: [0, 0, 0] as const },
    {
      position: [3.5, 0.75, -2.25] as const,
      rotation: [0, 0.83, 0] as const,
    },
    {
      position: [-4, 1.2, 6] as const,
      rotation: [0.08, -1.15, -0.06] as const,
    },
  ] as const;
  let worstGroundError = 0;
  try {
    for (const [transformIndex, transform] of parentTransforms.entries()) {
      instance.visualRoot.position.set(
        transform.position[0],
        transform.position[1],
        transform.position[2],
      );
      instance.visualRoot.rotation.set(
        transform.rotation[0],
        transform.rotation[1],
        transform.rotation[2],
      );
      instance.visualRoot.updateMatrixWorld(true);
      for (const [gripIndex, grip] of grips.entries()) {
        setSkinnedCharacterWeaponGrip(instance, grip);
        const crouch = -0.07 * (1 + (gripIndex % 4));
        sampleSkinnedCharacterPose(
          instance,
          {
            phase: (gripIndex / grips.length) * Math.PI * 2,
            speed: 0,
            pelvisLift: crouch,
            weaponSocketY: 1.2 + crouch,
          },
          { elapsedSeconds: gripIndex * 0.17 },
        );
        const ground = preciseGroundMinInVisualRoot(instance);
        worstGroundError = Math.max(worstGroundError, Math.abs(ground));
        assert.ok(
          ground >= -0.02 && ground <= 0.002,
          `crouch parent=${transformIndex} grip=${grip} ground=${ground}`,
        );
      }

      for (const variant of [0, 1, 2, 3] as const) {
        for (const elapsedSeconds of [0.12, 0.29, 0.45, 0.58]) {
          setSkinnedCharacterWeaponGrip(
            instance,
            grips[
              (variant * 4 + Math.round(elapsedSeconds * 10)) % grips.length
            ],
          );
          sampleSkinnedCharacterPose(
            instance,
            { phase: variant * 0.61, speed: variant % 2 === 0 ? 0 : 3.2 },
            { elapsedSeconds },
          );
          applySkinnedCharacterDeathPose(
            instance,
            getBotDeathPose(elapsedSeconds, variant),
          );
          const ground = preciseGroundMinInVisualRoot(instance);
          worstGroundError = Math.max(worstGroundError, Math.abs(ground));
          assert.ok(
            ground >= -0.02 && ground <= 0.002,
            `death parent=${transformIndex} variant=${variant} time=${elapsedSeconds} ground=${ground}`,
          );
        }
      }
    }
    assert.ok(worstGroundError > 0);
  } finally {
    disposeSkinnedCharacterInstance(instance);
  }
});

void test('grounding support vertices match Three native skinning for both shipped character assets', async () => {
  const assets = [
    { filename: 'vanguard.glb', surface: 'classic' as const, side: 't' as const },
    { filename: 'ct-mpfb.glb', surface: 'authored' as const, side: 'ct' as const },
  ];
  const grips = [
    'rifle',
    'carbine',
    'smg',
    'shotgun',
    'sniper',
    'glock18',
    'usp',
    'p228',
    'deagle',
    'fiveseven',
    'elite',
  ] as const;
  const parentTransforms = [
    { position: [0, 0, 0] as const, rotation: [0, 0, 0] as const },
    {
      position: [3.5, 0.75, -2.25] as const,
      rotation: [0, 0.83, 0] as const,
    },
    {
      position: [-4, 1.2, 6] as const,
      rotation: [0.08, -1.15, -0.06] as const,
    },
  ] as const;
  for (const asset of assets) {
    const gltf = await new GLTFLoader().parseAsync(
      readTexturelessCharacterGlb(asset.filename),
      '',
    );
    const instance = createSkinnedCharacterInstance(
      createSkinnedCharacterTemplate(gltf, asset.surface),
      asset.side,
    );
    try {
      const expectedSupportIndices = groundSupportIndexSignatures(instance);
      for (const [transformIndex, transform] of parentTransforms.entries()) {
        instance.visualRoot.position.set(...transform.position);
        instance.visualRoot.rotation.set(...transform.rotation);
        for (const [gripIndex, grip] of grips.entries()) {
          setSkinnedCharacterWeaponGrip(instance, grip);
          sampleSkinnedCharacterPose(
            instance,
            {
              phase: gripIndex * 0.37,
              speed: gripIndex % 2 === 0 ? 0 : 4.2,
              pelvisLift: -0.07 * (1 + (gripIndex % 4)),
              weaponSocketY: 1.2 - 0.07 * (1 + (gripIndex % 4)),
            },
            { elapsedSeconds: gripIndex * 0.17 },
          );
          assertGroundSupportMatchesNative(
            instance,
            `${asset.filename}/parent=${transformIndex}/grip=${grip}`,
          );
          assertGroundSupportSetIsUnchanged(
            expectedSupportIndices,
            instance,
            `${asset.filename}/parent=${transformIndex}/grip=${grip}`,
          );
          assertFullSkinGroundCorrection(
            instance,
            `${asset.filename}/parent=${transformIndex}/grip=${grip}`,
          );
          applySkinnedCharacterDeathPose(
            instance,
            getBotDeathPose(0.45, gripIndex % 4),
          );
          assertGroundSupportMatchesNative(
            instance,
            `${asset.filename}/death-parent=${transformIndex}/grip=${grip}`,
          );
          assertGroundSupportSetIsUnchanged(
            expectedSupportIndices,
            instance,
            `${asset.filename}/death-parent=${transformIndex}/grip=${grip}`,
          );
          assertFullSkinGroundCorrection(
            instance,
            `${asset.filename}/death-parent=${transformIndex}/grip=${grip}`,
          );
        }
      }
    } finally {
      disposeSkinnedCharacterInstance(instance);
    }
  }
});

void test('grounding reads live four-slot weights and indices after bind and morph changes', async () => {
  const gltf = await new GLTFLoader().parseAsync(
    readTexturelessCharacterGlb(),
    '',
  );
  const instance = createSkinnedCharacterInstance(
    createSkinnedCharacterTemplate(gltf),
    'ct',
  );
  const originalSupportSamples = inspectSkinnedCharacterGroundSupport(instance);
  const controlledMesh = originalSupportSamples[0]?.mesh;
  assert.ok(controlledMesh, 'expected a skinned support mesh');
  const supportIndices = originalSupportSamples
    .filter((sample) => sample.mesh === controlledMesh)
    .map((sample) => sample.vertexIndex);
  const vertexCount = Math.max(...supportIndices) + 1;
  const controlledGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(vertexCount * 3);
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  const relativeMorphPositions = new Float32Array(vertexCount * 3);
  const absoluteMorphPositions = new Float32Array(vertexCount * 3);
  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    positions[vertexIndex * 3] = (vertexIndex % 7) * 0.03;
    positions[vertexIndex * 3 + 1] = (vertexIndex % 11) * -0.02;
    positions[vertexIndex * 3 + 2] = (vertexIndex % 5) * 0.04;
    relativeMorphPositions[vertexIndex * 3] = 0.09;
    relativeMorphPositions[vertexIndex * 3 + 1] = -0.06;
    relativeMorphPositions[vertexIndex * 3 + 2] = 0.03;
    absoluteMorphPositions[vertexIndex * 3] = positions[vertexIndex * 3] + 0.08;
    absoluteMorphPositions[vertexIndex * 3 + 1] = positions[vertexIndex * 3 + 1] - 0.04;
    absoluteMorphPositions[vertexIndex * 3 + 2] = positions[vertexIndex * 3 + 2] + 0.02;
    skinIndices.set([0, 1, 2, 3], vertexIndex * 4);
    skinWeights.set([0.1, 0.2, 0.3, 0.4], vertexIndex * 4);
  }
  controlledGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  controlledGeometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
  controlledGeometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
  controlledGeometry.morphAttributes.position = [
    new THREE.BufferAttribute(relativeMorphPositions, 3),
  ];
  controlledMesh.geometry = controlledGeometry;
  controlledMesh.morphTargetInfluences = [0.65];
  controlledMesh.position.set(0.4, -0.25, 0.6);
  controlledMesh.rotation.set(0.1, -0.2, 0.05);
  controlledMesh.bindMatrix.makeTranslation(0.12, -0.08, 0.04);
  try {
    controlledGeometry.morphTargetsRelative = true;
    controlledMesh.bindMode = 'attached';
    assertGroundSupportMatchesNative(instance, 'relative morph attached bind');

    controlledGeometry.morphAttributes.position = [
      new THREE.BufferAttribute(absoluteMorphPositions, 3),
    ];
    controlledGeometry.morphTargetsRelative = false;
    controlledMesh.bindMode = 'detached';
    controlledMesh.bindMatrix.elements[3] = 0.07;
    controlledMesh.bindMatrixInverse.copy(controlledMesh.bindMatrix).invert();
    assertGroundSupportMatchesNative(instance, 'absolute morph detached bind');

    const mutatedVertexIndex = supportIndices[0];
    skinIndices.set([3, 2, 1, 0], mutatedVertexIndex * 4);
    skinWeights.set([0.4, 0, 0.2, 0.4], mutatedVertexIndex * 4);
    controlledGeometry.getAttribute('skinIndex').needsUpdate = true;
    controlledGeometry.getAttribute('skinWeight').needsUpdate = true;
    assertGroundSupportMatchesNative(
      instance,
      'post-setup live skin-index and skin-weight mutation',
    );
  } finally {
    controlledGeometry.dispose();
    disposeSkinnedCharacterInstance(instance);
  }
});

void test('runtime grounding evaluates a reduced support hull instead of every vertex', async () => {
  const gltf = await new GLTFLoader().parseAsync(
    readTexturelessCharacterGlb(),
    '',
  );
  const instance = createSkinnedCharacterInstance(
    createSkinnedCharacterTemplate(gltf),
    'ct',
  );
  let fullVertexCount = 0;
  instance.model.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh)
      fullVertexCount += object.geometry.getAttribute('position').count;
  });
  // oxlint-disable typescript/unbound-method
  const originalGetVertexPosition = THREE.Mesh.prototype.getVertexPosition;
  // oxlint-enable typescript/unbound-method
  let vertexReads = 0;
  THREE.Mesh.prototype.getVertexPosition = function (
    index: number,
    target: THREE.Vector3,
  ) {
    vertexReads += 1;
    return originalGetVertexPosition.call(this, index, target);
  };
  try {
    sampleSkinnedCharacterPose(instance, {
      phase: 0,
      speed: 0,
      pelvisLift: -0.28,
      weaponSocketY: 0.92,
    });
    const crouchReads = vertexReads;
    vertexReads = 0;
    sampleSkinnedCharacterPose(instance, { phase: 0, speed: 0 });
    applySkinnedCharacterDeathPose(instance, getBotDeathPose(0.45, 2));
    const deathReads = vertexReads;
    for (const [label, reads] of [
      ['crouch', crouchReads],
      ['death', deathReads],
    ] as const) {
      assert.ok(reads > 0, `${label} support hull was not evaluated`);
      assert.ok(
        reads < fullVertexCount / 10,
        `${label} read ${reads}/${fullVertexCount} vertices`,
      );
    }
  } finally {
    THREE.Mesh.prototype.getVertexPosition = originalGetVertexPosition;
    disposeSkinnedCharacterInstance(instance);
  }
});
