import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import * as THREE from 'three';
import { presentBotAnimation } from '../app/bot-presentation.ts';
import type { BotAnimationInput } from '../app/bot-animation.ts';
import {
  createBotPresentationFixture,
  PRESENTATION_FIXTURE_WEAPONS,
  runLegacyBotPresentationFrame,
  type PresentationFixture,
} from './helpers/bot-presentation-fixture.ts';

const BOT_COUNT = 8;
const WARMUP_FRAMES = 240;
const MEASURED_SAMPLES = 320;
const TARGET_P95_MILLISECONDS = 0.5;
const FRAME_SECONDS = 1 / 60;

type SceneIdentity = {
  nodes: readonly THREE.Object3D[];
  meshes: readonly {
    mesh: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    material: THREE.Material | THREE.Material[];
  }[];
};

const FIRE_ACTION = Object.freeze({ fire: 1 });
const RELOAD_ACTION = Object.freeze({ reload: 1 });
const HIT_ACTION = Object.freeze({ hit: 1 });
const WORLD_POSITION = new THREE.Vector3();
const PRESENTATION_MODE = process.env.JKH160_PRESENTATION_MODE ?? 'candidate';
if (PRESENTATION_MODE !== 'candidate' && PRESENTATION_MODE !== 'legacy') {
  throw new Error(`Unsupported JKH160_PRESENTATION_MODE: ${PRESENTATION_MODE}`);
}

function makeTrace(): readonly (readonly BotAnimationInput[])[] {
  return Array.from(
    { length: WARMUP_FRAMES + MEASURED_SAMPLES },
    (_, frame) => {
      const time = frame * FRAME_SECONDS;
      return PRESENTATION_FIXTURE_WEAPONS.map((_, botIndex) => {
        const phaseOffset = botIndex * 0.73;
        const heading = phaseOffset + time * (0.23 + botIndex * 0.01);
        const speed = 2.3 + 1.25 * Math.sin(time * 0.83 + phaseOffset);
        const velocityAngle = heading + 0.28 * Math.sin(time * 0.47 + botIndex);
        const velocity = {
          x: Math.cos(velocityAngle) * speed,
          z: Math.sin(velocityAngle) * speed,
        };
        const acceleration = {
          x: Math.cos(time * 1.1 + phaseOffset) * 4.2,
          z: Math.sin(time * 0.91 + phaseOffset) * 4.2,
        };
        const actions =
          frame % 181 === botIndex * 7
            ? FIRE_ACTION
            : frame % 257 === botIndex * 11
              ? RELOAD_ACTION
              : frame % 313 === botIndex * 13
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
          actions,
        };
      });
    },
  );
}

function captureSceneIdentity(scene: THREE.Scene): SceneIdentity {
  const nodes: THREE.Object3D[] = [];
  const meshes: SceneIdentity['meshes'][number][] = [];
  scene.traverse((object) => {
    nodes.push(object);
    if (object instanceof THREE.Mesh) {
      meshes.push({
        mesh: object,
        geometry: object.geometry,
        material: object.material,
      });
    }
  });
  return { nodes, meshes };
}

function assertStableSceneIdentity(
  before: SceneIdentity,
  scene: THREE.Scene,
): void {
  const current = captureSceneIdentity(scene);
  assert.equal(
    current.nodes.length,
    before.nodes.length,
    'scene node count changed',
  );
  assert.equal(
    current.meshes.length,
    before.meshes.length,
    'scene mesh count changed',
  );
  before.nodes.forEach((node, index) =>
    assert.equal(current.nodes[index], node),
  );
  before.meshes.forEach((item, index) => {
    assert.equal(current.meshes[index].mesh, item.mesh);
    assert.equal(current.meshes[index].geometry, item.geometry);
    assert.equal(current.meshes[index].material, item.material);
  });
}

function setAuthorityFrame(
  fixture: PresentationFixture,
  inputs: readonly BotAnimationInput[],
): void {
  for (let index = 0; index < fixture.bots.length; index += 1) {
    const bot = fixture.bots[index];
    const input = inputs[index];
    bot.authorityRoot.position.set(
      input.velocity.x * 0.1,
      0,
      input.velocity.z * 0.1,
    );
    bot.authorityRoot.rotation.set(0, input.bodyYaw, 0);
    bot.input = input;
  }
}

function updateVisiblePresentation(
  fixture: PresentationFixture,
  inputs: readonly BotAnimationInput[],
  frame: number,
): void {
  for (let index = 0; index < fixture.bots.length; index += 1) {
    const bot = fixture.bots[index];
    const input = inputs[index];
    const relativeAimYaw =
      THREE.MathUtils.euclideanModulo(
        input.aimYaw - input.bodyYaw + Math.PI,
        Math.PI * 2,
      ) - Math.PI;
    if (PRESENTATION_MODE === 'legacy') {
      runLegacyBotPresentationFrame(
        bot,
        input,
        relativeAimYaw,
        frame * FRAME_SECONDS,
      );
    } else {
      presentBotAnimation(bot, input, relativeAimYaw, frame * FRAME_SECONDS);
    }
  }

  // Renderer-equivalent final traversal is part of the measured production workload.
  fixture.scene.updateMatrixWorld(true);
  for (const bot of fixture.bots) {
    for (const mesh of bot.skinnedMeshes) {
      mesh.skeleton.update();
    }
    bot.skinned.weaponSocket.getWorldPosition(WORLD_POSITION);
    bot.hitProxy.getWorldPosition(WORLD_POSITION);
    bot.muzzleFlash.getWorldPosition(WORLD_POSITION);
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

void test('8-bot movement presentation stays allocation-stable and under the 60 Hz p95 gate', async () => {
  const fixture = await createBotPresentationFixture({
    retainLegacyBuffers: PRESENTATION_MODE === 'legacy',
  });
  assert.equal(fixture.bots.length, BOT_COUNT);
  const trace = makeTrace();
  const sceneIdentity = captureSceneIdentity(fixture.scene);
  const frameMilliseconds: number[] = [];

  try {
    for (let frame = 0; frame < WARMUP_FRAMES; frame += 1) {
      setAuthorityFrame(fixture, trace[frame]);
      updateVisiblePresentation(fixture, trace[frame], frame);
    }

    assertStableSceneIdentity(sceneIdentity, fixture.scene);
    for (const bot of fixture.bots) {
      assert.ok(Number.isFinite(bot.weaponGripOutput.leftElbowPitch));
      assert.ok(Number.isFinite(bot.weaponGripOutput.rightElbowPitch));
    }

    for (let sample = 0; sample < MEASURED_SAMPLES; sample += 1) {
      const frame = WARMUP_FRAMES + sample;
      setAuthorityFrame(fixture, trace[frame]);
      const startedAt = performance.now();
      updateVisiblePresentation(fixture, trace[frame], frame);
      frameMilliseconds.push(performance.now() - startedAt);
    }

    const p95Milliseconds = percentile(frameMilliseconds, 0.95);
    console.log(
      `[movement performance evidence] ${JSON.stringify({
        mode: PRESENTATION_MODE,
        assets: fixture.assetEvidence,
        botCount: BOT_COUNT,
        warmupFrames: WARMUP_FRAMES,
        measuredFrames: MEASURED_SAMPLES,
        targetP95Milliseconds: TARGET_P95_MILLISECONDS,
        p95Milliseconds,
        frameMilliseconds,
      })}`,
    );
    assertStableSceneIdentity(sceneIdentity, fixture.scene);
    fixture.bots.forEach((bot) => {
      assert.ok(Number.isFinite(bot.animationPose.leftKneePitch));
      assert.ok(Number.isFinite(bot.animationPose.rightKneePitch));
      assert.equal(
        bot.skinned.visualRoot.position.x,
        bot.authorityRoot.position.x,
      );
      assert.equal(
        bot.skinned.visualRoot.position.y,
        bot.authorityRoot.position.y,
      );
      assert.equal(
        bot.skinned.visualRoot.position.z,
        bot.authorityRoot.position.z,
      );
      assert.equal(
        bot.skinned.visualRoot.rotation.y,
        bot.authorityRoot.rotation.y,
      );
      assert.equal(bot.skinned.visualRoot.visible, bot.authorityRoot.visible);
    });
    assert.ok(
      p95Milliseconds < TARGET_P95_MILLISECONDS,
      `8-bot live skinned presentation p95 ${p95Milliseconds.toFixed(4)} ms >= ${TARGET_P95_MILLISECONDS} ms`,
    );
  } finally {
    fixture.dispose();
  }
});
