import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
  applyCharacterRigPose,
  applyCharacterRigWeaponAim,
  applyCharacterRigWeaponGripTargets,
} from '../app/character-rig.ts';
import {
  createBotAnimationPose,
  createBotAnimationState,
} from '../app/bot-animation.ts';
import {
  applySkinnedCharacterDeathPose,
  resetSkinnedCharacterDeathPose,
  sampleSkinnedCharacterPose,
} from '../app/skinned-character-visuals.ts';
import { getBotDeathPose } from '../app/death-poses.ts';
import { presentBotAnimation } from '../app/bot-presentation.ts';
import {
  createBotPresentationFixture,
  runLegacyBotPresentationFrame,
  type PresentationFixture,
  type PresentationFixtureBot,
} from './helpers/bot-presentation-fixture.ts';

const COMPARE_TOLERANCE = 1e-6;
const WORLD_POSITION = new THREE.Vector3();
const SKINNED_VERTEX = new THREE.Vector3();

type WeaponGripTargets = Readonly<{
  dominant: readonly [number, number, number];
  support: readonly [number, number, number];
}>;

const PROCEDURAL_INITIAL_GRIP_TARGETS: Readonly<
  Record<PresentationFixtureBot['weaponKind'], WeaponGripTargets>
> = {
  rifle: { dominant: [-0.07, 0.071, 0.141], support: [-0.07, 0.11, -0.089] },
  carbine: { dominant: [-0.07, 0.073, 0.139], support: [-0.07, 0.112, -0.086] },
  smg: { dominant: [-0.07, 0.078, 0.129], support: [-0.07, 0.11, -0.088] },
  shotgun: { dominant: [-0.07, 0.071, 0.141], support: [-0.07, 0.124, -0.268] },
  sniper: { dominant: [-0.07, 0.065, 0.129], support: [-0.07, 0.122, -0.177] },
  glock18: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  usp: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  p228: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  deagle: { dominant: [-0.07, 0.075, 0.132], support: [-0.01, 0.1, 0.09] },
  fiveseven: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  elite: { dominant: [-0.16, 0.081, 0.132], support: [0.02, 0.1, 0.09] },
};

const SKINNED_INITIAL_GRIP_TARGETS: Readonly<
  Record<PresentationFixtureBot['weaponKind'], WeaponGripTargets>
> = {
  rifle: { dominant: [-0.07, 0.071, 0.141], support: [-0.07, 0.11, -0.089] },
  carbine: { dominant: [-0.07, 0.073, 0.139], support: [-0.07, 0.112, -0.086] },
  smg: { dominant: [-0.07, 0.078, 0.129], support: [-0.07, 0.11, -0.088] },
  shotgun: { dominant: [-0.07, 0.071, 0.141], support: [-0.13, 0.124, -0.18] },
  sniper: { dominant: [-0.07, 0.065, 0.129], support: [-0.13, 0.122, -0.177] },
  glock18: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  usp: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  p228: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  deagle: { dominant: [-0.07, 0.075, 0.132], support: [-0.01, 0.1, 0.09] },
  fiveseven: { dominant: [-0.07, 0.081, 0.132], support: [-0.01, 0.1, 0.09] },
  elite: { dominant: [-0.16, 0.081, 0.132], support: [-0.02, 0.1, 0.09] },
};

function applyCurrentFrame(
  bot: PresentationFixtureBot,
  input: PresentationFixtureBot['input'],
  elapsedSeconds: number,
): void {
  const relativeAimYaw =
    THREE.MathUtils.euclideanModulo(
      input.aimYaw - input.bodyYaw + Math.PI,
      Math.PI * 2,
    ) - Math.PI;
  presentBotAnimation(bot, input, relativeAimYaw, elapsedSeconds);
}

function applyResetWithoutRetiredBuffers(
  bot: PresentationFixtureBot,
  elapsedSeconds: number,
): void {
  Object.assign(bot.animationState, createBotAnimationState());
  Object.assign(bot.animationPose, createBotAnimationPose());
  bot.animationPose.lowerBodyYaw = 0;
  bot.skinned.visualRoot.position.set(
    bot.authorityRoot.position.x,
    bot.authorityRoot.position.y,
    bot.authorityRoot.position.z,
  );
  bot.skinned.visualRoot.rotation.set(0, bot.authorityRoot.rotation.y, 0);
  bot.skinned.visualRoot.visible = bot.authorityRoot.visible;
  bot.rig.visualRoot.visible = false;
  applyCharacterRigPose(bot.rig, bot.animationPose);
  applyCharacterRigWeaponAim(bot.rig, 0, bot.animationPose);
  applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);
  sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
    elapsedSeconds: 0,
  });
  sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
    elapsedSeconds,
  });
}

function applyLegacyReset(
  bot: PresentationFixtureBot,
  elapsedSeconds: number,
): void {
  const controllers = bot.legacyControllers;
  assert.ok(controllers);
  controllers.leftLeg.reset();
  controllers.rightLeg.reset();
  controllers.leftArm.reset();
  controllers.rightArm.reset();
  Object.assign(bot.animationState, createBotAnimationState());
  Object.assign(bot.animationPose, createBotAnimationPose());
  bot.animationPose.lowerBodyYaw = 0;
  bot.skinned.visualRoot.position.set(
    bot.authorityRoot.position.x,
    bot.authorityRoot.position.y,
    bot.authorityRoot.position.z,
  );
  bot.skinned.visualRoot.rotation.set(0, bot.authorityRoot.rotation.y, 0);
  bot.skinned.visualRoot.visible = bot.authorityRoot.visible;
  bot.rig.visualRoot.visible = false;
  applyCharacterRigPose(bot.rig, bot.animationPose);
  applyCharacterRigWeaponAim(bot.rig, 0, bot.animationPose);
  applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);
  sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
    elapsedSeconds: 0,
  });
  controllers.leftLeg.write({
    knee: bot.animationPose.leftKneePitch,
    ankle: bot.animationPose.leftAnklePitch,
  });
  controllers.rightLeg.write({
    knee: bot.animationPose.rightKneePitch,
    ankle: bot.animationPose.rightAnklePitch,
  });
  controllers.leftArm.write({ elbow: bot.weaponGripOutput.leftElbowPitch });
  controllers.rightArm.write({ elbow: bot.weaponGripOutput.rightElbowPitch });
  sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
    elapsedSeconds,
  });
}

function applyCrouchPresentation(
  bot: PresentationFixtureBot,
  elapsedSeconds: number,
): void {
  Object.assign(bot.animationPose, {
    pelvisLift: -0.28,
    torsoLeanZ: -0.08,
    weaponSocketY: 1.2 - 0.28 - 0.08 * 0.08,
    leftHipPitch: 0.55,
    rightHipPitch: 0.55,
    leftKneePitch: -1.05,
    rightKneePitch: -1.05,
    leftAnklePitch: 0.5,
    rightAnklePitch: 0.5,
    leftFootPlant: 1,
    rightFootPlant: 1,
  });
  sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
    elapsedSeconds,
  });
}

function applyDeathContinuation(
  bot: PresentationFixtureBot,
  elapsedSeconds: number,
  variant: 0 | 1 | 2 | 3,
  legacy: boolean,
): void {
  sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
    elapsedSeconds,
  });
  const deathPose = getBotDeathPose(elapsedSeconds, variant);
  if (legacy) {
    const controllers = bot.legacyControllers;
    assert.ok(controllers);
    controllers.leftLeg.write({
      knee: bot.animationPose.leftKneePitch + deathPose.leftKneePitch,
      ankle: bot.animationPose.leftAnklePitch + deathPose.leftAnklePitch,
    });
    controllers.rightLeg.write({
      knee: bot.animationPose.rightKneePitch + deathPose.rightKneePitch,
      ankle: bot.animationPose.rightAnklePitch + deathPose.rightAnklePitch,
    });
    controllers.leftArm.write({
      elbow: bot.weaponGripOutput.leftElbowPitch + deathPose.leftForearmPitch,
    });
    controllers.rightArm.write({
      elbow: bot.weaponGripOutput.rightElbowPitch + deathPose.rightForearmPitch,
    });
  }
  applySkinnedCharacterDeathPose(bot.skinned, deathPose);
}

function assertVectorClose(
  actual: THREE.Vector3,
  expected: THREE.Vector3,
  label: string,
): void {
  assert.ok(
    actual.distanceTo(expected) <= COMPARE_TOLERANCE,
    `${label}: ${actual.toArray().join(', ')} vs ${expected.toArray().join(', ')}`,
  );
}

function quaternionsMatch(
  actual: THREE.Quaternion,
  expected: THREE.Quaternion,
): boolean {
  const actualLength = actual.length();
  const expectedLength = expected.length();
  if (Math.abs(actualLength - expectedLength) > COMPARE_TOLERANCE) {
    return false;
  }

  const normalizedActual = actual.clone().normalize();
  const normalizedExpected = expected.clone().normalize();
  const directDifference = Math.hypot(
    normalizedActual.x - normalizedExpected.x,
    normalizedActual.y - normalizedExpected.y,
    normalizedActual.z - normalizedExpected.z,
    normalizedActual.w - normalizedExpected.w,
  );
  const oppositeDifference = Math.hypot(
    normalizedActual.x + normalizedExpected.x,
    normalizedActual.y + normalizedExpected.y,
    normalizedActual.z + normalizedExpected.z,
    normalizedActual.w + normalizedExpected.w,
  );
  return Math.min(directDifference, oppositeDifference) <= COMPARE_TOLERANCE;
}

void test(
  'quaternion equivalence handles equal non-unit and sign-opposite values',
  () => {
    const rotation = new THREE.Quaternion(0.2, -0.3, 0.1, 0.9);
    const identicalNonUnitRotation = rotation.clone();
    const signOppositeRotation = new THREE.Quaternion(
      -rotation.x,
      -rotation.y,
      -rotation.z,
      -rotation.w,
    );
    const differentRotationScale = rotation.length();
    const differentRotation = new THREE.Quaternion(
      0,
      Math.sin(0.1) * differentRotationScale,
      0,
      Math.cos(0.1) * differentRotationScale,
    );

    assert.ok(quaternionsMatch(rotation, identicalNonUnitRotation));
    assert.ok(quaternionsMatch(rotation, signOppositeRotation));
    assert.equal(quaternionsMatch(rotation, differentRotation), false);
  },
);

function assertFixtureOutputsMatch(
  current: PresentationFixture,
  legacy: PresentationFixture,
): void {
  current.scene.updateMatrixWorld(true);
  legacy.scene.updateMatrixWorld(true);
  assert.equal(current.bots.length, legacy.bots.length);

  for (let botIndex = 0; botIndex < current.bots.length; botIndex += 1) {
    const currentBot = current.bots[botIndex];
    const legacyBot = legacy.bots[botIndex];
    assert.deepEqual(currentBot.animationPose, legacyBot.animationPose);
    assert.deepEqual(currentBot.animationState, legacyBot.animationState);
    assert.deepEqual(currentBot.weaponGripOutput, legacyBot.weaponGripOutput);
    assert.deepEqual(currentBot.weaponGripTargets, legacyBot.weaponGripTargets);
    assert.equal(currentBot.weaponKind, legacyBot.weaponKind);

    assertVectorClose(
      currentBot.rig.dominantGripTarget.position,
      legacyBot.rig.dominantGripTarget.position,
      'procedural rig dominant grip target',
    );
    assertVectorClose(
      currentBot.rig.supportGripTarget.position,
      legacyBot.rig.supportGripTarget.position,
      'procedural rig support grip target',
    );
    assertVectorClose(
      currentBot.skinned.dominantGripTarget.position,
      legacyBot.skinned.dominantGripTarget.position,
      'animated skinned dominant grip target',
    );
    assertVectorClose(
      currentBot.skinned.supportGripTarget.position,
      legacyBot.skinned.supportGripTarget.position,
      'animated skinned support grip target',
    );

    assertVectorClose(
      currentBot.authorityRoot.position,
      legacyBot.authorityRoot.position,
      'authority position',
    );
    assertVectorClose(
      currentBot.authorityRoot.getWorldPosition(WORLD_POSITION),
      legacyBot.authorityRoot.getWorldPosition(new THREE.Vector3()),
      'authority world position',
    );
    assertVectorClose(
      currentBot.hitProxy.getWorldPosition(new THREE.Vector3()),
      legacyBot.hitProxy.getWorldPosition(new THREE.Vector3()),
      'hit proxy position',
    );
    assertVectorClose(
      currentBot.skinned.weaponSocket.getWorldPosition(new THREE.Vector3()),
      legacyBot.skinned.weaponSocket.getWorldPosition(new THREE.Vector3()),
      'weapon socket position',
    );
    assertVectorClose(
      currentBot.muzzleFlash.getWorldPosition(new THREE.Vector3()),
      legacyBot.muzzleFlash.getWorldPosition(new THREE.Vector3()),
      'muzzle position',
    );

    const currentBones = Object.values(currentBot.skinned.bones);
    const legacyBones = Object.values(legacyBot.skinned.bones);
    assert.equal(currentBones.length, legacyBones.length);
    currentBones.forEach((bone, boneIndex) => {
      assert.ok(
        bone.position.distanceTo(legacyBones[boneIndex].position) <=
          COMPARE_TOLERANCE,
        bone.name,
      );
      assert.ok(
        quaternionsMatch(bone.quaternion, legacyBones[boneIndex].quaternion),
        bone.name,
      );
    });

    currentBot.skinnedMeshes.forEach((mesh, meshIndex) => {
      const legacyMesh = legacyBot.skinnedMeshes[meshIndex];
      const currentPositions = mesh.geometry.getAttribute('position');
      const legacyPositions = legacyMesh.geometry.getAttribute('position');
      assert.equal(currentPositions.count, legacyPositions.count);
      const indices = [
        0,
        Math.floor(mesh.geometry.getAttribute('position').count / 2),
        mesh.geometry.getAttribute('position').count - 1,
      ];
      for (const vertexIndex of indices) {
        mesh
          .getVertexPosition(vertexIndex, SKINNED_VERTEX)
          .applyMatrix4(mesh.matrixWorld);
        const currentVertex = SKINNED_VERTEX.clone();
        legacyMesh
          .getVertexPosition(vertexIndex, SKINNED_VERTEX)
          .applyMatrix4(legacyMesh.matrixWorld);
        assertVectorClose(
          currentVertex,
          SKINNED_VERTEX,
          `skinned vertex ${meshIndex}:${vertexIndex}`,
        );
      }
    });
  }
}

function assertInitialWeaponGripTargets(fixture: PresentationFixture): void {
  for (const bot of fixture.bots) {
    const proceduralTargets = PROCEDURAL_INITIAL_GRIP_TARGETS[bot.weaponKind];
    const skinnedTargets = SKINNED_INITIAL_GRIP_TARGETS[bot.weaponKind];
    const expectedProceduralDominantGrip = new THREE.Vector3(
      ...proceduralTargets.dominant,
    );
    const expectedProceduralSupportGrip = new THREE.Vector3(
      ...proceduralTargets.support,
    );
    const expectedSkinnedDominantGrip = new THREE.Vector3(
      ...skinnedTargets.dominant,
    );
    const expectedSkinnedSupportGrip = new THREE.Vector3(
      ...skinnedTargets.support,
    );

    assertVectorClose(
      bot.rig.dominantGripTarget.position,
      expectedProceduralDominantGrip,
      'initial procedural rig dominant grip target',
    );
    assertVectorClose(
      bot.rig.supportGripTarget.position,
      expectedProceduralSupportGrip,
      'initial procedural rig support grip target',
    );
    assertVectorClose(
      bot.skinned.dominantGripTarget.position,
      expectedSkinnedDominantGrip,
      'initial skinned dominant grip target',
    );
    assertVectorClose(
      bot.skinned.supportGripTarget.position,
      expectedSkinnedSupportGrip,
      'initial skinned support grip target',
    );
  }
}

void test('retiring hidden deformation buffers preserves current visible bot presentation', async () => {
  const current = await createBotPresentationFixture();
  const legacy = await createBotPresentationFixture({
    retainLegacyBuffers: true,
  });

  try {
    assert.deepEqual(current.assetEvidence, legacy.assetEvidence);
    assertInitialWeaponGripTargets(current);
    assertInitialWeaponGripTargets(legacy);
    const pageSource = readFileSync(
      new URL('../app/page.tsx', import.meta.url),
      'utf8',
    );
    const presentation = pageSource.slice(
      pageSource.indexOf('const applyBotAnimationPresentation ='),
      pageSource.indexOf('const captureBotDeathJoint ='),
    );
    assert.match(
      presentation,
      /presentBotAnimation\([\s\S]*?simulationNowMs \/ 1000,\s*\);/,
    );
    assert.doesNotMatch(
      pageSource,
      /createCharacterLimbDeformationController|writeCharacterLimbFootPlanting/,
    );
    const inputs = [
      {
        ...current.bots[0].input,
        dtSeconds: 1 / 60,
        velocity: { x: 2.4, z: 0.3 },
        grounded: true,
        phase: 0.7,
      },
      {
        ...current.bots[0].input,
        dtSeconds: 1 / 60,
        velocity: { x: 4.1, z: -0.4 },
        grounded: true,
        phase: 1.2,
        actions: { fire: 0.8 },
      },
      {
        ...current.bots[0].input,
        dtSeconds: 1 / 60,
        velocity: { x: 0, z: 0 },
        grounded: true,
        phase: 1.6,
        actions: { reload: 0.7 },
      },
    ];
    for (let frame = 0; frame < inputs.length; frame += 1) {
      for (let botIndex = 0; botIndex < current.bots.length; botIndex += 1) {
        const currentBot = current.bots[botIndex];
        const legacyBot = legacy.bots[botIndex];
        const input = {
          ...inputs[frame],
          bodyYaw: frame * 0.2 + botIndex * 0.1,
          aimYaw: frame * 0.4 + botIndex * 0.1,
        };
        currentBot.authorityRoot.position.set(botIndex * 0.7, 0, frame * -0.2);
        legacyBot.authorityRoot.position.copy(
          currentBot.authorityRoot.position,
        );
        currentBot.authorityRoot.rotation.y = input.bodyYaw;
        legacyBot.authorityRoot.rotation.y = input.bodyYaw;
        currentBot.input = input;
        legacyBot.input = input;
        applyCurrentFrame(currentBot, input, frame / 60);
        const relativeAimYaw =
          THREE.MathUtils.euclideanModulo(
            input.aimYaw - input.bodyYaw + Math.PI,
            Math.PI * 2,
          ) - Math.PI;
        runLegacyBotPresentationFrame(
          legacyBot,
          input,
          relativeAimYaw,
          frame / 60,
        );
      }
      assertFixtureOutputsMatch(current, legacy);
    }

    for (let botIndex = 0; botIndex < current.bots.length; botIndex += 1) {
      const currentBot = current.bots[botIndex];
      const legacyBot = legacy.bots[botIndex];
      applyResetWithoutRetiredBuffers(currentBot, 4.25);
      applyLegacyReset(legacyBot, 4.25);
    }
    assertFixtureOutputsMatch(current, legacy);

    for (let botIndex = 0; botIndex < current.bots.length; botIndex += 1) {
      applyCrouchPresentation(current.bots[botIndex], 4.3);
      applyCrouchPresentation(legacy.bots[botIndex], 4.3);
    }
    assertFixtureOutputsMatch(current, legacy);

    for (const elapsedSeconds of [0.1, 0.35, 0.7, 1.1]) {
      for (let botIndex = 0; botIndex < current.bots.length; botIndex += 1) {
        applyDeathContinuation(
          current.bots[botIndex],
          elapsedSeconds,
          (botIndex % 4) as 0 | 1 | 2 | 3,
          false,
        );
        applyDeathContinuation(
          legacy.bots[botIndex],
          elapsedSeconds,
          (botIndex % 4) as 0 | 1 | 2 | 3,
          true,
        );
      }
      assertFixtureOutputsMatch(current, legacy);
    }

    for (const fixture of [current, legacy]) {
      fixture.bots.forEach((bot) =>
        resetSkinnedCharacterDeathPose(bot.skinned),
      );
    }
  } finally {
    current.dispose();
    legacy.dispose();
  }
});
