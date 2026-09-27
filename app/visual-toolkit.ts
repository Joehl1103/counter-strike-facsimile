/**
 * Local-only visual inspection and repeatable-input support.
 *
 * This module deliberately owns no renderer or game state. The page supplies a
 * narrow adapter around the production renderer, so visual tools exercise the
 * same viewmodels, action writers, and simulation tick as a normal round.
 */

export const VISUAL_TOOLKIT_VERSION = 1;
export const VISUAL_REPLAY_STEP_MS = 10;
export const VISUAL_REPLAY_DEFAULT_SEED = 1601;
export const VISUAL_REPLAY_MAX_TARGET_MS = 120_000;

export type VisualReplayAction =
  | 'equip'
  | 'fire'
  | 'reload'
  | 'move-start'
  | 'move-stop'
  | 'pause'
  | 'fall-fixture';

/** Local-only named fixture selectors; no arbitrary state or code is accepted. */
export type VisualFallFixtureActor =
  | 'player'
  | 'enemy'
  | 'ally'
  | 'carrier'
  | 'last-enemy';
export type VisualFallFixtureName = 'safe' | 'damaging' | 'lethal';
export type VisualFallFixtureOptions = Readonly<{
  actor: VisualFallFixtureActor;
  fixture: VisualFallFixtureName;
}>;

export type VisualReplayEvent = Readonly<{
  atMs: number;
  action: VisualReplayAction;
  weapon?: string;
  fallFixture?: VisualFallFixtureOptions;
}>;

/**
 * The initial quiet period permits the normal round freeze to expire. It is
 * intentionally part of the timeline, rather than a hidden clock jump.
 */
export const FIXED_VISUAL_REPLAY: readonly VisualReplayEvent[] = Object.freeze([
  Object.freeze({ atMs: 6_000, action: 'equip', weapon: 'knife' }),
  Object.freeze({ atMs: 6_360, action: 'equip', weapon: 'usp' }),
  Object.freeze({ atMs: 6_760, action: 'fire' }),
  Object.freeze({ atMs: 7_120, action: 'reload' }),
  Object.freeze({ atMs: 7_700, action: 'move-start' }),
  Object.freeze({ atMs: 8_200, action: 'move-stop' }),
  Object.freeze({ atMs: 10_000, action: 'fire' }),
  Object.freeze({ atMs: 11_000, action: 'pause' }),
]);

export type VisualCameraMetadata = Readonly<{
  fov: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
}>;

export type VisualReplaySnapshot = Readonly<{
  buildIdentity: Readonly<{
    schemaVersion: 1;
    revision: string;
    pageSha256: string;
  }>;
  timestampMs: number;
  deterministic: Readonly<{
    seed: number;
    fixedStepMs: number;
    /** Input scheduling and weapon RNG are fixed; this does not promise pixel identity. */
    scope: 'scripted-input-and-weapon-rng';
  }>;
  scenarioState: Readonly<{
    prepared: boolean;
    paused: boolean;
    nextEvent: number;
    dispatchedActions: readonly VisualReplayAction[];
  }>;
  camera: VisualCameraMetadata;
  viewport: Readonly<{ width: number; height: number; pixelRatio: number }>;
  renderer: Readonly<{ quality: string; route: string }>;
  /** Actual lights sampled from the live render scene. */
  light: unknown;
  graphicsBudget: unknown;
  viewmodel: unknown;
  skeletons: readonly unknown[];
  materials: readonly unknown[];
  runtime: unknown;
}>;

export type VisualReplayOptions = Readonly<{
  seed?: number;
  stepMs?: number;
}>;

export type VisualReplayResult = Readonly<{
  seed: number;
  stepMs: number;
  final: VisualReplaySnapshot;
  captures: readonly VisualReplaySnapshot[];
}>;

export type VisualAssetPreviewRequest = Readonly<{
  /** A loaded production weapon/viewmodel name, when the current round owns it. */
  weapon?: string;
  /** Draw production skeleton bones over the selected asset. */
  skeleton?: boolean;
  /** Informational only: the existing localhost visual-qa route is never mutated. */
  qaMode?: string;
}>;

export type VisualToolkitRuntime = Readonly<{
  isLocalHost: boolean;
  /** Resolves only after the production assets backing the renderer are ready. */
  ready?: () => Promise<void>;
  /** Reset and arm an ordinary local round without changing route or settings. */
  reset: (seed: number) => void;
  /** Advance the real game tick by this exact amount and render its resulting frame. */
  advance: (milliseconds: number) => void;
  dispatch: (event: VisualReplayEvent) => void;
  previewAsset: (request: VisualAssetPreviewRequest) => void | Promise<void>;
  snapshot: (
    state: Readonly<{
      timestampMs: number;
      seed: number;
      stepMs: number;
      prepared: boolean;
      paused: boolean;
      nextEvent: number;
      dispatchedActions: readonly VisualReplayAction[];
    }>,
  ) => VisualReplaySnapshot;
  dispose?: () => void;
}>;

export type DustlineVisualTools = Readonly<{
  version: number;
  limitations: Readonly<{
    simulation: string;
    rendering: string;
  }>;
  snapshot: () => VisualReplaySnapshot;
  previewAsset: (
    request?: VisualAssetPreviewRequest,
  ) => Promise<VisualReplaySnapshot>;
  prepareReplay: (
    options?: VisualReplayOptions,
  ) => Promise<VisualReplaySnapshot>;
  advanceReplayTo: (targetMs: number) => Promise<VisualReplaySnapshot>;
  replayScenario: (
    options?: VisualReplayOptions &
      Readonly<{ captureAtMs?: readonly number[] }>,
    onFrame?: (frame: VisualReplaySnapshot) => void | Promise<void>,
  ) => Promise<VisualReplayResult>;
  /** Runs a named controlled setup, then one ordinary production 10 ms tick. */
  runFallFixture: (
    options: VisualFallFixtureOptions,
  ) => Promise<VisualReplaySnapshot>;
  disposeReplay: () => void;
}>;

type ReplayState = {
  seed: number;
  stepMs: number;
  timestampMs: number;
  nextEvent: number;
  prepared: boolean;
  paused: boolean;
  dispatchedActions: VisualReplayAction[];
};

function finiteWhole(value: number, fallback: number, minimum: number) {
  return Number.isFinite(value)
    ? Math.max(minimum, Math.floor(value))
    : fallback;
}

function normalizedOptions(options: VisualReplayOptions | undefined) {
  return {
    seed: finiteWhole(
      options?.seed ?? VISUAL_REPLAY_DEFAULT_SEED,
      VISUAL_REPLAY_DEFAULT_SEED,
      0,
    ),
    // The production simulation has a fixed 10 ms tick. Accepting another
    // value would imply a guarantee the adapter cannot make.
    stepMs: VISUAL_REPLAY_STEP_MS,
  };
}

function stateView(state: ReplayState) {
  return Object.freeze({
    timestampMs: state.timestampMs,
    seed: state.seed,
    stepMs: state.stepMs,
    prepared: state.prepared,
    paused: state.paused,
    nextEvent: state.nextEvent,
    dispatchedActions: Object.freeze([...state.dispatchedActions]),
  });
}

/** Installs the browser API only for a localhost adapter, returning cleanup. */
export function installDustlineVisualTools(
  target: Window,
  runtime: VisualToolkitRuntime,
): () => void {
  if (!runtime.isLocalHost) return () => undefined;

  let state: ReplayState = {
    seed: VISUAL_REPLAY_DEFAULT_SEED,
    stepMs: VISUAL_REPLAY_STEP_MS,
    timestampMs: 0,
    nextEvent: 0,
    prepared: false,
    paused: false,
    dispatchedActions: [],
  };
  const read = () => runtime.snapshot(stateView(state));

  const prepareReplay = async (options?: VisualReplayOptions) => {
    await runtime.ready?.();
    const normalized = normalizedOptions(options);
    runtime.reset(normalized.seed);
    state = {
      seed: normalized.seed,
      stepMs: normalized.stepMs,
      timestampMs: 0,
      nextEvent: 0,
      prepared: true,
      paused: false,
      dispatchedActions: [],
    };
    return read();
  };

  const advanceReplayTo = async (rawTargetMs: number) => {
    if (!state.prepared) await prepareReplay();
    const targetMs = Math.min(
      VISUAL_REPLAY_MAX_TARGET_MS,
      finiteWhole(rawTargetMs, state.timestampMs, state.timestampMs),
    );
    while (state.timestampMs < targetMs && !state.paused) {
      const next = FIXED_VISUAL_REPLAY[state.nextEvent];
      const boundary = next ? Math.min(targetMs, next.atMs) : targetMs;
      if (boundary > state.timestampMs)
        runtime.advance(boundary - state.timestampMs);
      state.timestampMs = boundary;
      while (FIXED_VISUAL_REPLAY[state.nextEvent]?.atMs === state.timestampMs) {
        const event = FIXED_VISUAL_REPLAY[state.nextEvent++];
        runtime.dispatch(event);
        state.dispatchedActions.push(event.action);
        if (event.action === 'pause') state.paused = true;
      }
      // A malformed external target or an exhausted timeline must not create a loop.
      if (boundary === targetMs) break;
    }
    return read();
  };

  const replayScenario: DustlineVisualTools['replayScenario'] = async (
    options,
    onFrame,
  ) => {
    await prepareReplay(options);
    const requested = [
      ...new Set(
        options?.captureAtMs ??
          FIXED_VISUAL_REPLAY.map(
            (event) =>
              event.atMs +
              (event.action === 'pause' ? 0 : VISUAL_REPLAY_STEP_MS),
          ),
      ),
    ]
      .filter(Number.isFinite)
      .map((value) => Math.max(0, Math.floor(value)))
      .sort((a, b) => a - b);
    const captures: VisualReplaySnapshot[] = [];
    for (const atMs of requested) {
      const frame = await advanceReplayTo(atMs);
      captures.push(frame);
      await onFrame?.(frame);
    }
    return Object.freeze({
      seed: state.seed,
      stepMs: state.stepMs,
      final: read(),
      captures: Object.freeze(captures),
    });
  };

  const runFallFixture: DustlineVisualTools['runFallFixture'] = async (
    options,
  ) => {
    const actor = options?.actor;
    const fixture = options?.fixture;
    if (!['player', 'enemy', 'ally', 'carrier', 'last-enemy'].includes(actor) ||
      !['safe', 'damaging', 'lethal'].includes(fixture))
      throw new Error('fall fixture requires a named actor and named finite fixture');
    await prepareReplay();
    runtime.dispatch({
      atMs: state.timestampMs,
      action: 'fall-fixture',
      fallFixture: { actor, fixture },
    });
    state.dispatchedActions.push('fall-fixture');
    runtime.advance(VISUAL_REPLAY_STEP_MS);
    state.timestampMs += VISUAL_REPLAY_STEP_MS;
    return read();
  };

  const api: DustlineVisualTools = Object.freeze({
    version: VISUAL_TOOLKIT_VERSION,
    limitations: Object.freeze({
      simulation:
        'The production runSimulationTick advances at fixed 10 ms steps. The scenario fixes input timing and weapon RNG only.',
      rendering:
        'Metadata is captured after a live render. WebGL/browser pixel output can still vary by device and driver.',
    }),
    snapshot: read,
    previewAsset: async (request = {}) => {
      await runtime.previewAsset(request);
      return read();
    },
    prepareReplay,
    advanceReplayTo,
    replayScenario,
    runFallFixture,
    disposeReplay: () => {
      state.prepared = false;
      state.paused = true;
      runtime.dispose?.();
    },
  });
  target.dustlineVisualTools = api;
  return () => {
    if (target.dustlineVisualTools === api) delete target.dustlineVisualTools;
    runtime.dispose?.();
  };
}

declare global {
  interface Window {
    dustlineVisualTools?: DustlineVisualTools;
  }
}
