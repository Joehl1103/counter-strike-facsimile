import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIXED_VISUAL_REPLAY,
  VISUAL_REPLAY_STEP_MS,
  installDustlineVisualTools,
  type VisualReplayEvent,
  type VisualToolkitRuntime,
} from '../app/visual-toolkit.ts';

type FakeWindow = Window & {
  dustlineVisualTools?: Window['dustlineVisualTools'];
};

function createRuntime(local = true) {
  const advances: number[] = [];
  const events: VisualReplayEvent[] = [];
  const runtime: VisualToolkitRuntime = {
    isLocalHost: local,
    reset: () => undefined,
    advance: (milliseconds) => advances.push(milliseconds),
    dispatch: (event) => events.push(event),
    previewAsset: () => undefined,
    snapshot: (state) =>
      Object.freeze({
        buildIdentity: {
          schemaVersion: 1 as const,
          revision: 'test',
          pageSha256: '0'.repeat(64),
        },
        timestampMs: state.timestampMs,
        deterministic: {
          seed: state.seed,
          fixedStepMs: state.stepMs,
          scope: 'scripted-input-and-weapon-rng' as const,
        },
        scenarioState: {
          prepared: state.prepared,
          paused: state.paused,
          nextEvent: state.nextEvent,
          dispatchedActions: state.dispatchedActions,
        },
        camera: {
          fov: 74,
          position: [0, 1.68, 0] as const,
          rotation: [0, 0, 0] as const,
        },
        viewport: { width: 800, height: 600, pixelRatio: 1 },
        renderer: { quality: 'high', route: 'normal-round' },
        light: null,
        graphicsBudget: null,
        viewmodel: null,
        skeletons: [],
        materials: [],
        runtime: null,
      }),
  };
  return { runtime, advances, events };
}

void test('fixed visual replay has the requested action sequence and a visible freeze lead-in', () => {
  assert.deepEqual(
    FIXED_VISUAL_REPLAY.map((event) => event.action),
    [
      'equip',
      'equip',
      'fire',
      'reload',
      'move-start',
      'move-stop',
      'fire',
      'pause',
    ],
  );
  assert.equal(FIXED_VISUAL_REPLAY[0].atMs, 6_000);
  assert.equal(VISUAL_REPLAY_STEP_MS, 10);
});

void test('replay advances only to event boundaries and pauses permanently at its terminal event', async () => {
  const { runtime, advances, events } = createRuntime();
  const target = {} as FakeWindow;
  const cleanup = installDustlineVisualTools(target, runtime);
  const api = target.dustlineVisualTools!;
  await api.prepareReplay({ seed: 19, stepMs: 27 });
  const final = await api.advanceReplayTo(12_000);
  assert.deepEqual(events, FIXED_VISUAL_REPLAY);
  assert.deepEqual(advances, [6_000, 360, 400, 360, 580, 500, 1800, 1000]);
  assert.equal(final.timestampMs, 11_000);
  assert.equal(final.deterministic.seed, 19);
  assert.equal(final.deterministic.fixedStepMs, 10);
  assert.equal(final.scenarioState.paused, true);
  cleanup();
  assert.equal(target.dustlineVisualTools, undefined);
});

void test('named fall fixtures use one controlled setup followed by one production tick', async () => {
  const { runtime, advances, events } = createRuntime();
  const target = {} as FakeWindow;
  installDustlineVisualTools(target, runtime);
  const final = await target.dustlineVisualTools!.runFallFixture({
    actor: 'ally',
    fixture: 'damaging',
  });
  assert.deepEqual(events, [{
    atMs: 0,
    action: 'fall-fixture',
    fallFixture: { actor: 'ally', fixture: 'damaging' },
  }]);
  assert.deepEqual(advances, [10]);
  assert.equal(final.timestampMs, 10);
  assert.deepEqual(final.scenarioState.dispatchedActions, ['fall-fixture']);
});

void test('toolkit is absent outside localhost', () => {
  const { runtime } = createRuntime(false);
  const target = {} as FakeWindow;
  installDustlineVisualTools(target, runtime);
  assert.equal(target.dustlineVisualTools, undefined);
});
