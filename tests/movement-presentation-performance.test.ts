import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import * as THREE from 'three';
import { createFacetedLimbGeometry } from '../app/character-visuals.ts';
import {
  createCharacterLimbDeformationController,
  writeCharacterLimbFootPlanting,
  type CharacterLimbDeformationController,
} from '../app/character-limb-deformation.ts';
import {
  applyCharacterRigPose,
  applyCharacterRigWeaponAim,
  applyCharacterRigWeaponGripTargets,
  createCharacterRig,
  setCharacterRigWeaponGripTargets,
  type CharacterRig,
  type CharacterRigWeaponGripOutput,
} from '../app/character-rig.ts';
import {
  createBotAnimationPose,
  createBotAnimationState,
  writeBotAnimationPose,
  type BotAnimationInput,
  type BotAnimationPose,
  type BotAnimationState,
} from '../app/bot-animation.ts';
import {
  createSecondaryWorldModel,
} from '../app/secondary-weapon-models.ts';
import type { FirearmKind, SecondaryWeaponKind } from '../app/game-rules.ts';

const BOT_COUNT = 8;
const WARMUP_FRAMES = 240;
const MEASURED_SAMPLES = 320;
const TARGET_P95_MILLISECONDS = 0.5;
const FRAME_SECONDS = 1 / 60;

type BenchBot = {
  authorityRoot: THREE.Group;
  rig: CharacterRig;
  state: BotAnimationState;
  pose: BotAnimationPose;
  leftLegDeformationController: CharacterLimbDeformationController;
  rightLegDeformationController: CharacterLimbDeformationController;
  leftArmDeformationController: CharacterLimbDeformationController;
  rightArmDeformationController: CharacterLimbDeformationController;
  leftLegAngles: { knee: number; ankle: number };
  rightLegAngles: { knee: number; ankle: number };
  leftArmAngles: { elbow: number };
  rightArmAngles: { elbow: number };
  weaponGripOutput: CharacterRigWeaponGripOutput;
  materials: readonly THREE.Material[];
  weaponKind: FirearmKind;
};

type BenchResources = {
  torsoGeometry: THREE.BufferGeometry;
  weaponGeometry: THREE.BufferGeometry;
  legGeometry: THREE.BufferGeometry;
  armGeometry: THREE.BufferGeometry;
};

type MeshIdentity = {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
};

type RigSnapshot = {
  nodes: readonly THREE.Object3D[];
  childLists: readonly {
    node: THREE.Object3D;
    children: readonly THREE.Object3D[];
  }[];
  meshes: readonly MeshIdentity[];
};

const FIRE_ACTION = Object.freeze({ fire: 1 });
const RELOAD_ACTION = Object.freeze({ reload: 1 });
const HIT_ACTION = Object.freeze({ hit: 1 });
const BENCH_WEAPON_KINDS: readonly FirearmKind[] = [
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
];

function createPrimaryWeaponBranch(
  kind: FirearmKind,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
): THREE.Group {
  const branch = new THREE.Group();
  branch.name = `bench-${kind}-weapon`;
  // The live world firearm path retains receiver, stock, grip, and barrel
  // branches. Four meshes keep this workload representative without changing
  // production code or allocating during presentation updates.
  for (const part of ['receiver', 'stock', 'grip', 'barrel']) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `bench-${kind}-${part}`;
    branch.add(mesh);
  }
  return branch;
}

function disposeSubtree(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) materials.add(material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function createBenchBot(
  index: number,
  scene: THREE.Scene,
  resources: BenchResources,
  weaponKind: FirearmKind,
): BenchBot {
  const torsoMaterial = new THREE.MeshBasicMaterial({ color: 0x6b7280 });
  const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0x111827 });
  const authorityRoot = new THREE.Group();
  authorityRoot.name = `benchAuthority${index}`;
  scene.add(authorityRoot);

  const torso = new THREE.Mesh(resources.torsoGeometry, torsoMaterial);
  const weaponBranches: THREE.Object3D[] = BENCH_WEAPON_KINDS.map((kind) =>
    kind === 'glock18' ||
    kind === 'usp' ||
    kind === 'p228' ||
    kind === 'deagle' ||
    kind === 'fiveseven' ||
    kind === 'elite'
      ? createSecondaryWorldModel(kind as SecondaryWeaponKind)
      : createPrimaryWeaponBranch(kind, resources.weaponGeometry, weaponMaterial),
  );
  const leftLeg = new THREE.Mesh(resources.legGeometry, torsoMaterial);
  const rightLeg = new THREE.Mesh(resources.legGeometry, torsoMaterial);
  const leftArm = new THREE.Mesh(resources.armGeometry, torsoMaterial);
  const rightArm = new THREE.Mesh(resources.armGeometry, torsoMaterial);
  torso.name = `benchTorso${index}`;
  leftLeg.name = `benchLeftLeg${index}`;
  rightLeg.name = `benchRightLeg${index}`;
  leftArm.name = `benchLeftArm${index}`;
  rightArm.name = `benchRightArm${index}`;

  const leftLegDeformationController = createCharacterLimbDeformationController(
    leftLeg,
    'leg',
  );
  const rightLegDeformationController =
    createCharacterLimbDeformationController(rightLeg, 'leg');
  const leftArmDeformationController = createCharacterLimbDeformationController(
    leftArm,
    'arm',
  );
  const rightArmDeformationController =
    createCharacterLimbDeformationController(rightArm, 'arm');

  const rig = createCharacterRig({
    authorityRoot,
    fallbackVisuals: false,
    visualParts: {
      upperBody: torso,
      leftThigh: leftLeg,
      rightThigh: rightLeg,
      leftShoulder: leftArm,
      rightShoulder: rightArm,
      weaponSocket: weaponBranches,
    },
  });
  setCharacterRigWeaponGripTargets(rig, 'rifle');

  return {
    authorityRoot,
    rig,
    state: createBotAnimationState(),
    pose: createBotAnimationPose(),
    leftLegDeformationController,
    rightLegDeformationController,
    leftArmDeformationController,
    rightArmDeformationController,
    leftLegAngles: { knee: 0, ankle: 0 },
    rightLegAngles: { knee: 0, ankle: 0 },
    leftArmAngles: { elbow: 0 },
    rightArmAngles: { elbow: 0 },
    weaponGripOutput: { leftElbowPitch: 0, rightElbowPitch: 0 },
    materials: [torsoMaterial, weaponMaterial],
    weaponKind,
  };
}

function snapshotRig(rig: CharacterRig): RigSnapshot {
  const nodes: THREE.Object3D[] = [];
  rig.visualRoot.traverse((node) => nodes.push(node));
  return {
    nodes,
    childLists: nodes.map((node) => ({
      node,
      children: node.children,
    })),
    meshes: nodes.flatMap((node) =>
      node instanceof THREE.Mesh
        ? [{ mesh: node, geometry: node.geometry, material: node.material }]
        : [],
    ),
  };
}

function assertStableRigSnapshot(before: RigSnapshot, rig: CharacterRig): void {
  const after = snapshotRig(rig);
  assert.equal(after.nodes.length, before.nodes.length);
  assert.equal(after.meshes.length, before.meshes.length);

  before.nodes.forEach((node, index) => {
    assert.equal(after.nodes[index], node, `node identity changed at ${index}`);
  });
  before.childLists.forEach(({ node, children }, index) => {
    const afterChildren = after.childLists[index];
    assert.equal(afterChildren.node, node);
    assert.equal(
      afterChildren.children,
      children,
      `${node.name} child list replaced`,
    );
    assert.equal(
      afterChildren.children.length,
      children.length,
      `${node.name} child count changed`,
    );
    children.forEach((child, childIndex) => {
      assert.equal(
        afterChildren.children[childIndex],
        child,
        `${node.name} child identity changed`,
      );
    });
  });
  before.meshes.forEach(({ mesh, geometry, material }, index) => {
    const current = after.meshes[index];
    assert.equal(current.mesh, mesh, `mesh identity changed at ${index}`);
    assert.equal(
      current.geometry,
      geometry,
      `${mesh.name} geometry identity changed`,
    );
    assert.equal(
      current.material,
      material,
      `${mesh.name} material identity changed`,
    );
  });
}

function makeTrace(): readonly (readonly BotAnimationInput[])[] {
  const frameCount = WARMUP_FRAMES + MEASURED_SAMPLES;
  return Array.from({ length: frameCount }, (_, frame) => {
    const time = frame * FRAME_SECONDS;
    return Array.from({ length: BOT_COUNT }, (_, bot) => {
      const phaseOffset = bot * 0.73;
      const heading = phaseOffset + time * (0.23 + bot * 0.01);
      const speed = 2.3 + 1.25 * Math.sin(time * 0.83 + phaseOffset);
      const velocityAngle = heading + 0.28 * Math.sin(time * 0.47 + bot);
      const velocity = {
        x: Math.cos(velocityAngle) * speed,
        z: Math.sin(velocityAngle) * speed,
      };
      const acceleration = {
        x: Math.cos(time * 1.1 + phaseOffset) * 4.2,
        z: Math.sin(time * 0.91 + phaseOffset) * 4.2,
      };
      const action =
        frame % 181 === bot * 7
          ? FIRE_ACTION
          : frame % 257 === bot * 11
            ? RELOAD_ACTION
            : frame % 313 === bot * 13
              ? HIT_ACTION
              : undefined;
      return {
        dtSeconds: FRAME_SECONDS,
        velocity,
        acceleration,
        bodyYaw: heading,
        aimYaw: heading + 0.42 * Math.sin(time * 0.67 + phaseOffset),
        grounded: frame % 149 < 137,
        phase: time * 5.2 + phaseOffset,
        aimPitch: 0.18 * Math.sin(time * 0.59 + phaseOffset),
        actions: action,
      };
    });
  });
}

function updateBatch(
  bots: readonly BenchBot[],
  inputs: readonly BotAnimationInput[],
): void {
  for (let bot = 0; bot < bots.length; bot += 1) {
    const benchBot = bots[bot];
    const authorityRoot = benchBot.authorityRoot;
    const rig = benchBot.rig;
    const pose = benchBot.pose;
    const input = inputs[bot];

    // This is the same retained presentation sequence used by the live bot
    // loop. The authority transform is simulation-owned; only its values are
    // copied into the sibling visual root here.
    rig.visualRoot.position.set(
      authorityRoot.position.x,
      authorityRoot.position.y,
      authorityRoot.position.z,
    );
    rig.visualRoot.rotation.set(0, authorityRoot.rotation.y, 0);
    rig.visualRoot.visible = authorityRoot.visible;

    writeBotAnimationPose(input, benchBot.state, pose);
    pose.lowerBodyYaw = 0;
    applyCharacterRigPose(rig, pose);
    applyCharacterRigWeaponAim(
      rig,
      THREE.MathUtils.euclideanModulo(
        input.aimYaw - input.bodyYaw + Math.PI,
        Math.PI * 2,
      ) - Math.PI,
      pose,
    );
    setCharacterRigWeaponGripTargets(rig, benchBot.weaponKind);
    applyCharacterRigWeaponGripTargets(rig, benchBot.weaponGripOutput);
    rig.pelvis.updateWorldMatrix(true, false);
    rig.leftThigh.updateWorldMatrix(false, false);
    rig.rightThigh.updateWorldMatrix(false, false);

    const leftLegAngles = benchBot.leftLegAngles;
    leftLegAngles.knee = pose.leftKneePitch;
    leftLegAngles.ankle = pose.leftAnklePitch;
    benchBot.leftLegDeformationController.write(leftLegAngles);
    writeCharacterLimbFootPlanting(benchBot.leftLegDeformationController, {
      plant: pose.leftFootPlant,
      swingOffsetZ: pose.leftFootOffsetZ,
      toeClearance: pose.leftToeClearance,
    }, true);
    const rightLegAngles = benchBot.rightLegAngles;
    rightLegAngles.knee = pose.rightKneePitch;
    rightLegAngles.ankle = pose.rightAnklePitch;
    benchBot.rightLegDeformationController.write(rightLegAngles);
    writeCharacterLimbFootPlanting(benchBot.rightLegDeformationController, {
      plant: pose.rightFootPlant,
      swingOffsetZ: pose.rightFootOffsetZ,
      toeClearance: pose.rightToeClearance,
    }, true);
    const leftArmAngles = benchBot.leftArmAngles;
    leftArmAngles.elbow = benchBot.weaponGripOutput.leftElbowPitch;
    benchBot.leftArmDeformationController.write(leftArmAngles);
    const rightArmAngles = benchBot.rightArmAngles;
    rightArmAngles.elbow = benchBot.weaponGripOutput.rightElbowPitch;
    benchBot.rightArmDeformationController.write(rightArmAngles);

    // Keep both authority and presentation world matrices current, as the
    // render loop does after the retained pose/deformation writes.
    authorityRoot.updateMatrixWorld(true);
    rig.visualRoot.updateMatrixWorld(true);
  }
}

function setAuthorityBatch(
  bots: readonly BenchBot[],
  inputs: readonly BotAnimationInput[],
): void {
  for (let bot = 0; bot < bots.length; bot += 1) {
    const input = inputs[bot];
    const root = bots[bot].authorityRoot;
    root.position.set(input.velocity.x * 0.1, 0, input.velocity.z * 0.1);
    root.rotation.set(0, input.bodyYaw, 0);
  }
}

function percentile(
  values: readonly number[],
  percentileValue: number,
): number {
  const sorted = [...values].sort((first, second) => first - second);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * percentileValue) - 1,
  );
  return sorted[index];
}

function assertFinitePoseAndState(bot: BenchBot): void {
  for (const value of Object.values(bot.pose))
    assert.ok(Number.isFinite(value));
  for (const value of Object.values(bot.state)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
}

void test('8-bot movement presentation stays allocation-stable and under the 60 Hz p95 gate', () => {
  const resources: BenchResources = {
    torsoGeometry: new THREE.BoxGeometry(0.3, 0.5, 0.2),
    weaponGeometry: new THREE.BoxGeometry(0.12, 0.12, 0.45),
    legGeometry: createFacetedLimbGeometry(0.13, 0.56),
    armGeometry: createFacetedLimbGeometry(0.105, 0.42),
  };
  const scene = new THREE.Scene();
  const bots = Array.from({ length: BOT_COUNT }, (_, index) =>
    createBenchBot(index, scene, resources, BENCH_WEAPON_KINDS[index]),
  );
  const trace = makeTrace();
  const snapshots = bots.map(({ rig }) => snapshotRig(rig));

  for (let frame = 0; frame < WARMUP_FRAMES; frame += 1) {
    setAuthorityBatch(bots, trace[frame]);
    updateBatch(bots, trace[frame]);
  }

  bots.forEach((bot, index) => {
    assertStableRigSnapshot(snapshots[index], bot.rig);
    assertFinitePoseAndState(bot);
  });

  const frameMilliseconds: number[] = [];
  for (let sample = 0; sample < MEASURED_SAMPLES; sample += 1) {
    const frame = WARMUP_FRAMES + sample;
    // Keep the simulation-owned authority transform current for this frame;
    // measure exactly one retained presentation update, as the render loop
    // does, rather than hiding spikes inside a multi-frame average.
    setAuthorityBatch(bots, trace[frame]);
    const startedAt = performance.now();
    updateBatch(bots, trace[frame]);
    frameMilliseconds.push(performance.now() - startedAt);
  }

  const p95Milliseconds = percentile(frameMilliseconds, 0.95);
  assert.ok(
    p95Milliseconds < TARGET_P95_MILLISECONDS,
    `8-bot per-frame presentation p95 ${p95Milliseconds.toFixed(4)} ms >= ${TARGET_P95_MILLISECONDS} ms`,
  );
  bots.forEach((bot, index) => {
    assertStableRigSnapshot(snapshots[index], bot.rig);
    assertFinitePoseAndState(bot);
    assert.equal(bot.rig.visualRoot.position.x, bot.authorityRoot.position.x);
    assert.equal(bot.rig.visualRoot.position.y, bot.authorityRoot.position.y);
    assert.equal(bot.rig.visualRoot.position.z, bot.authorityRoot.position.z);
    assert.equal(bot.rig.visualRoot.rotation.y, bot.authorityRoot.rotation.y);
    assert.equal(bot.rig.visualRoot.rotation.x, 0);
    assert.equal(bot.rig.visualRoot.rotation.z, 0);
    assert.ok(Number.isFinite(bot.weaponGripOutput.leftElbowPitch));
    assert.ok(Number.isFinite(bot.weaponGripOutput.rightElbowPitch));
  });
  console.log(
    `[movement performance] 8-bot per-frame p95=${p95Milliseconds.toFixed(4)} ms (target < ${TARGET_P95_MILLISECONDS} ms; ${MEASURED_SAMPLES} frames after ${WARMUP_FRAMES}-frame warm-up)`,
  );

  bots.forEach((bot) => {
    bot.leftLegDeformationController.geometry.dispose();
    bot.rightLegDeformationController.geometry.dispose();
    bot.leftArmDeformationController.geometry.dispose();
    bot.rightArmDeformationController.geometry.dispose();
    bot.materials.forEach((resource) => resource.dispose());
    bot.rig.weaponSocket.children.forEach((branch) => disposeSubtree(branch));
  });
  Object.values(resources).forEach((resource) => {
    resource.dispose();
  });
});
