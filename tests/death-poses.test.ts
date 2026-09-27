import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  applyCharacterRigPose,
  createCharacterRig,
} from '../app/character-rig.ts';
import { createFacetedTorsoGeometry } from '../app/character-visuals.ts';
import { CHARACTER_RENDERED_FOOT_PLANT_HEIGHT } from '../app/character-limb-deformation.ts';
import {
  createBotAnimationPose,
  createBotAnimationState,
  writeBotAnimationPose,
} from '../app/bot-animation.ts';
import {
  BOT_DEATH_DURATION_SECONDS,
  getConservativeTorsoBottomY,
  getBotDeathPose,
  getBotDeathVariant,
  LIVING_BOT_POSE,
  shouldAdvanceBotDeathPose,
  writeBotDeathPose,
  type BotDeathVariant,
} from '../app/death-poses.ts';

void test('death variants are deterministic and vary by squad identity', () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((id) => getBotDeathVariant(id, 'enemy')),
    [0, 1, 2, 3],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((id) => getBotDeathVariant(id, 'ally')),
    [1, 2, 3, 0],
  );
  assert.equal(getBotDeathVariant(Number.NaN, 'enemy'), 0);
});

void test('death falls begin at the exact living pose', () => {
  ([0, 1, 2, 3] as BotDeathVariant[]).forEach((variant) => {
    assert.deepEqual(getBotDeathPose(0, variant), LIVING_BOT_POSE);
    assert.deepEqual(getBotDeathPose(-1, variant), LIVING_BOT_POSE);
    assert.deepEqual(getBotDeathPose(Number.NaN, variant), LIVING_BOT_POSE);
  });
});

void test('death falls settle low with mirrored forward and side variation', () => {
  const poses = ([0, 1, 2, 3] as BotDeathVariant[]).map((variant) =>
    getBotDeathPose(BOT_DEATH_DURATION_SECONDS, variant),
  );
  assert.ok(poses[0].rootPitch > 1.2);
  assert.ok(poses[1].rootPitch > 1.2);
  assert.ok(poses[2].rootPitch < -1.2);
  assert.ok(poses[3].rootPitch < -1.2);
  assert.ok(poses[0].rootRoll < 0);
  assert.ok(poses[1].rootRoll > 0);
  assert.ok(poses.every((pose) => pose.rootY === 0.39));
  assert.ok(poses.every((pose) => getConservativeTorsoBottomY(pose) >= 0));
});

void test('death poses clamp after settling and remain finite', () => {
  ([0, 1, 2, 3] as BotDeathVariant[]).forEach((variant) => {
    const settled = getBotDeathPose(BOT_DEATH_DURATION_SECONDS, variant);
    assert.deepEqual(getBotDeathPose(99, variant), settled);
    assert.ok(Object.values(settled).every(Number.isFinite));
    assert.ok(Math.abs(settled.rootPitch) < Math.PI / 2);
    assert.ok(Math.abs(settled.rootRoll) < 0.2);
  });
});

void test('articulated settle keeps four variants rate-bounded and visibly hinged', () => {
  const fields = [
    'leftHipPitch',
    'rightHipPitch',
    'leftKneePitch',
    'rightKneePitch',
    'leftAnklePitch',
    'rightAnklePitch',
    'leftForearmPitch',
    'rightForearmPitch',
  ] as const;
  ([0, 1, 2, 3] as BotDeathVariant[]).forEach((variant) => {
    const settled = getBotDeathPose(BOT_DEATH_DURATION_SECONDS, variant);
    assert.ok(
      fields.filter((field) => Math.abs(settled[field]) >= 0.25).length >= 3,
    );
    let previous = getBotDeathPose(0, variant);
    for (let frame = 1; frame <= 18; frame += 1) {
      const current = getBotDeathPose(
        (BOT_DEATH_DURATION_SECONDS * frame) / 18,
        variant,
      );
      for (const field of Object.keys(current) as Array<keyof typeof current>)
        assert.ok(
          Math.abs(current[field] - previous[field]) <= 0.18,
          `${variant}:${field} exceeded 30Hz settle delta`,
        );
      previous = current;
    }
  });
});

void test('death falls pause with active play but finish during result review', () => {
  assert.equal(shouldAdvanceBotDeathPose(true, 'active'), true);
  assert.equal(shouldAdvanceBotDeathPose(false, 'active'), false);
  assert.equal(shouldAdvanceBotDeathPose(false, 'briefing'), false);
  assert.equal(shouldAdvanceBotDeathPose(false, 'round-won'), true);
  assert.equal(shouldAdvanceBotDeathPose(false, 'round-lost'), true);
  assert.equal(shouldAdvanceBotDeathPose(false, 'match-won'), true);
  assert.equal(shouldAdvanceBotDeathPose(false, 'match-lost'), true);
});

void test('death matrix transforms real rig joints from every clean origin', () => {
  const origins = [
    { name: 'neutral', velocity: { x: 0, z: 0 }, phase: 0, actions: {} },
    {
      name: 'left-contact',
      velocity: { x: 0, z: -4.2 },
      phase: 0,
      actions: {},
    },
    {
      name: 'right-contact',
      velocity: { x: 0, z: -4.2 },
      phase: Math.PI,
      actions: {},
    },
    {
      name: 'strafe',
      velocity: { x: -3.2, z: 0 },
      phase: Math.PI,
      actions: {},
    },
    {
      name: 'reload',
      velocity: { x: 0, z: 0 },
      phase: 0,
      actions: { reload: 0.85 },
    },
  ] as const;
  const progressSamples = [0, 0.33, 0.66, 1] as const;
  const jointNames = [
    'leftThigh',
    'leftShin',
    'leftFoot',
    'leftForearm',
    'rightThigh',
    'rightShin',
    'rightFoot',
    'rightForearm',
  ] as const;
  const transformedTorsoVertex = new THREE.Vector3();

  for (const origin of origins) {
    for (const variant of [0, 1, 2, 3] as BotDeathVariant[]) {
      const scene = new THREE.Scene();
      const authorityRoot = new THREE.Group();
      authorityRoot.position.set(3, 0, -4);
      authorityRoot.rotation.y = 0.37;
      const hitProxy = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4));
      authorityRoot.add(hitProxy);
      scene.add(authorityRoot);
      const authorityPosition = authorityRoot.position.clone();
      const authorityRotation = authorityRoot.rotation.clone();
      const torso = new THREE.Mesh(createFacetedTorsoGeometry());
      torso.position.set(0, -0.05, 0);
      torso.scale.z = 0.92;
      const rig = createCharacterRig({
        authorityRoot,
        authoritativeHitMeshes: [hitProxy],
        fallbackVisuals: false,
        visualParts: { upperBody: torso },
      });
      const animationState = createBotAnimationState();
      const animationPose = createBotAnimationPose();
      writeBotAnimationPose(
        {
          dtSeconds: 0,
          velocity: origin.velocity,
          acceleration: { x: 0, z: 0 },
          bodyYaw: 0,
          aimYaw: 0,
          grounded: true,
          phase: origin.phase,
          actions: origin.actions,
        },
        animationState,
        animationPose,
      );
      applyCharacterRigPose(rig, animationPose);
      const starts = new Map(
        jointNames.map((name) => [
          name,
          {
            position: rig[name].position.clone(),
            rotation: rig[name].rotation.clone(),
          },
        ]),
      );

      for (const progress of progressSamples) {
        const pose = getBotDeathPose(
          progress * BOT_DEATH_DURATION_SECONDS,
          variant,
        );
        rig.visualRoot.position.set(0, pose.rootY, 0);
        rig.visualRoot.rotation.set(pose.rootPitch, 0, pose.rootRoll);
        for (const name of jointNames) {
          const start = starts.get(name);
          assert.ok(start);
          rig[name].position.copy(start.position);
          rig[name].rotation.copy(start.rotation);
        }
        if (progress === 0) {
          for (const name of jointNames) {
            const start = starts.get(name);
            assert.ok(start);
            assert.deepEqual(
              rig[name].position.toArray(),
              start.position.toArray(),
            );
            assert.deepEqual(
              rig[name].rotation.toArray(),
              start.rotation.toArray(),
            );
          }
        }
        rig.leftThigh.rotation.x += pose.leftLegPitch + pose.leftHipPitch;
        rig.leftThigh.rotation.y += pose.leftHipYaw;
        rig.leftShin.rotation.x += pose.leftKneePitch;
        rig.leftFoot.rotation.x += pose.leftAnklePitch;
        rig.rightThigh.rotation.x += pose.rightLegPitch + pose.rightHipPitch;
        rig.rightThigh.rotation.y += pose.rightHipYaw;
        rig.rightShin.rotation.x += pose.rightKneePitch;
        rig.rightFoot.rotation.x += pose.rightAnklePitch;
        rig.leftForearm.rotation.x += pose.leftForearmPitch;
        rig.rightForearm.rotation.x += pose.rightForearmPitch;
        rig.visualRoot.updateMatrixWorld(true);

        assert.deepEqual(
          authorityRoot.position.toArray(),
          authorityPosition.toArray(),
        );
        assert.deepEqual(
          authorityRoot.rotation.toArray(),
          authorityRotation.toArray(),
        );

        assert.equal(
          rig.visualRoot.position.y,
          pose.rootY,
          `${origin.name}/v${variant}/p${progress} root offset`,
        );
        const torsoPositions = torso.geometry.getAttribute('position');
        let minimumTorsoY = Number.POSITIVE_INFINITY;
        for (let vertex = 0; vertex < torsoPositions.count; vertex += 1) {
          transformedTorsoVertex
            .fromBufferAttribute(torsoPositions, vertex)
            .applyMatrix4(torso.matrixWorld);
          minimumTorsoY = Math.min(minimumTorsoY, transformedTorsoVertex.y);
        }
        assert.ok(
          minimumTorsoY >= -0.02,
          `${origin.name}/v${variant}/p${progress} torso penetrated ${minimumTorsoY}`,
        );
      }

      let previous = getBotDeathPose(0, variant);
      for (let frame = 1; frame <= 18; frame += 1) {
        const current = getBotDeathPose(
          (BOT_DEATH_DURATION_SECONDS * frame) / 18,
          variant,
        );
        for (const key of Object.keys(current) as Array<keyof typeof current>)
          assert.ok(
            Math.abs(current[key] - previous[key]) <= 0.18,
            `${origin.name}/v${variant}/${key} exceeded 30Hz delta`,
          );
        previous = current;
      }
      assert.equal(
        animationState.reloadPulse,
        origin.name === 'reload' ? 0.85 : 0,
      );
      assert.equal(animationState.firePulse, 0);

      const rest = getBotDeathPose(BOT_DEATH_DURATION_SECONDS, variant);
      const changedJoints = [
        rest.leftHipPitch - LIVING_BOT_POSE.leftHipPitch,
        rest.rightHipPitch - LIVING_BOT_POSE.rightHipPitch,
        rest.leftKneePitch - LIVING_BOT_POSE.leftKneePitch,
        rest.rightKneePitch - LIVING_BOT_POSE.rightKneePitch,
        rest.leftForearmPitch - LIVING_BOT_POSE.leftForearmPitch,
        rest.rightForearmPitch - LIVING_BOT_POSE.rightForearmPitch,
      ].filter((delta) => Math.abs(delta) >= 0.25);
      assert.ok(
        changedJoints.length >= 3,
        `${origin.name}/v${variant} lost articulated rest joints`,
      );
      torso.geometry.dispose();
      hitProxy.geometry.dispose();
      (hitProxy.material as THREE.Material).dispose();
    }
  }
});

void test('settled death keeps torso and a separate planted limb within ground tolerance', () => {
  const ground = 0;
  const torsoContactHeights: number[] = [];
  const plantedLimbContact = CHARACTER_RENDERED_FOOT_PLANT_HEIGHT;
  for (const variant of [0, 1, 2, 3] as BotDeathVariant[]) {
    const pose = getBotDeathPose(BOT_DEATH_DURATION_SECONDS, variant);
    const torsoBottom = getConservativeTorsoBottomY(pose);
    torsoContactHeights.push(torsoBottom);
    assert.ok(torsoBottom - ground <= 0.04);
    assert.ok(plantedLimbContact - ground <= 0.04);
    assert.ok(torsoBottom >= -0.02);
  }
  assert.ok(Math.max(...torsoContactHeights) <= 0.04);
});

void test('death sampling reuses the retained pose output', () => {
  const output = { ...LIVING_BOT_POSE };
  const outputIdentity = output;
  for (let frame = 0; frame <= 18; frame += 1)
    assert.equal(
      writeBotDeathPose(
        (BOT_DEATH_DURATION_SECONDS * frame) / 18,
        (frame % 4) as BotDeathVariant,
        output,
      ),
      outputIdentity,
    );
  assert.ok(Object.values(output).every(Number.isFinite));
});
