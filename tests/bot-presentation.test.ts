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
    `${label}: ${actual.toArray()} vs ${expected.toArray()}`,
  );
}

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
    assert.equal(currentBot.weaponKind, legacyBot.weaponKind);

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
        bone.quaternion.angleTo(legacyBones[boneIndex].quaternion) <=
          COMPARE_TOLERANCE,
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

void test('retiring hidden deformation buffers preserves current visible bot presentation', async () => {
  const current = await createBotPresentationFixture();
  const legacy = await createBotPresentationFixture({
    retainLegacyBuffers: true,
  });

  try {
    assert.deepEqual(current.assetEvidence, legacy.assetEvidence);
    const pageSource = readFileSync(
      new URL('../app/page.tsx', import.meta.url),
      'utf8',
    );
    assert.match(pageSource, /presentBotAnimation\(/);
    assert.doesNotMatch(
      pageSource,
      /createCharacterLimbDeformationController|writeCharacterLimbFootPlanting/,
    );
    assert.match(pageSource, /elapsedSeconds: simulationNowMs \/ 1000/);
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
