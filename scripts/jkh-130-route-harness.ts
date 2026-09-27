import { DUST2_COLLISION_WORLD, DUST2_MAP, getMapGroundHeight } from '../app/dust2-map.ts';
import { getWeaponMoveSpeed, type WeaponKind } from '../app/game-rules.ts';
import { createPlayerInputTimeline, type MovementControls } from '../app/player-input.ts';
import { type PlayerPhysicsState } from '../app/player-physics.ts';
import { PLAYER_HULL, hullBlocked } from '../app/player-collision.ts';
import { createMovementHarness } from './player-movement-harness.ts';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

export const ROUTE_RENDER_RATES = [30, 60, 144] as const;
export const ROUTE_REFERENCE_RATE = 100;
export const ROUTE_POSITION_TOLERANCE = 1e-9;
export const ROUTE_TICK_BLOCK = 50;

export const DUST2_ROUTE_RECORDINGS = {
  'T-long-A': ['t', 'longDoors', 'outsideLong', 'long', 'longRamp', 'a'],
  'T-mid-short-A': ['t', 'topMid', 'mid', 'catEntry', 'catwalk', 'short', 'a'],
  'T-upper-tunnel-B': ['t', 'tunnelEntry', 'tunnelApproach', 'upper', 'bTunnel', 'b'],
  'mid-lower-upper-tunnel': ['mid', 'lower', 'tunnelStairs', 'upper'],
  'mid-doors-CT': ['mid', 'midDoors', 'ct'],
  'CT-B-doors-B': ['ct', 'bDoors', 'b'],
  'CT-ramp-A': ['ct', 'ctRamp', 'a'],
} as const;

export type RouteName = keyof typeof DUST2_ROUTE_RECORDINGS;
export type RecordedControl = Readonly<{ atSeconds: number; controls: MovementControls }>;
export type RouteStateSample = Readonly<{
  position: Readonly<{ x: number; y: number; z: number }>;
  velocity: Readonly<{ x: number; z: number }>;
  verticalVelocity: number;
  grounded: boolean;
  crouched: boolean;
}>;
export type RecordedRoute = Readonly<{
  name: RouteName;
  nodeIds: readonly string[];
  weapon: WeaponKind;
  scoped: boolean;
  controls: readonly RecordedControl[];
  tickCount: number;
  trace: readonly RouteStateSample[];
}>;
export type RouteReplay = Readonly<{
  recorded: RecordedRoute;
  rateHz: number;
  trace: readonly RouteStateSample[];
  interpolationFrames: number;
}>;

const idleControls = (): MovementControls => ({
  strafe: 0,
  forward: 0,
  yaw: 0,
  walking: false,
  crouching: false,
});

function makeState(nodeId: string): PlayerPhysicsState {
  const point = DUST2_MAP.nodes[nodeId];
  if (!point) throw new Error(`missing Dust II node ${nodeId}`);
  const feet = getMapGroundHeight(...point);
  return {
    position: { x: point[0], y: feet + PLAYER_HULL.eyeHeight, z: point[1] },
    velocity: { x: 0, z: 0 },
    verticalVelocity: 0,
    grounded: true,
    crouched: false,
    landingRecoverySeconds: 0,
  };
}

function copyState(state: PlayerPhysicsState): RouteStateSample {
  return {
    position: { ...state.position },
    velocity: { ...state.velocity },
    verticalVelocity: state.verticalVelocity,
    grounded: state.grounded,
    crouched: state.crouched,
  };
}

function controlsToward(
  state: PlayerPhysicsState,
  target: readonly [number, number],
): MovementControls {
  const x = target[0] - state.position.x;
  const z = target[1] - state.position.z;
  const length = Math.hypot(x, z);
  if (length === 0) return idleControls();
  return {
    strafe: x / length,
    forward: -z / length,
    yaw: 0,
    walking: false,
    crouching: false,
  };
}

function reachedSegmentEnd(
  state: PlayerPhysicsState,
  start: readonly [number, number],
  end: readonly [number, number],
) {
  const segmentX = end[0] - start[0];
  const segmentZ = end[1] - start[1];
  const traveledX = state.position.x - start[0];
  const traveledZ = state.position.z - start[1];
  return Math.hypot(end[0] - state.position.x, end[1] - state.position.z) <= 0.5 ||
    traveledX * segmentX + traveledZ * segmentZ >= segmentX * segmentX + segmentZ * segmentZ;
}

function assertRouteState(state: PlayerPhysicsState, name: RouteName, tick: number) {
  for (const value of [
    state.position.x,
    state.position.y,
    state.position.z,
    state.velocity.x,
    state.velocity.z,
    state.verticalVelocity,
  ]) {
    if (!Number.isFinite(value)) throw new Error(`${name} produced a non-finite state at tick ${tick}`);
  }
  const feet = state.position.y - PLAYER_HULL.eyeHeight;
  if (!state.grounded) throw new Error(`${name} left support at tick ${tick}`);
  if (hullBlocked(DUST2_COLLISION_WORLD, state.position.x, feet, state.position.z, PLAYER_HULL.standingHeight)) {
    throw new Error(`${name} entered blocked geometry at tick ${tick}`);
  }
}

function movementInput(controls: MovementControls, weapon: WeaponKind, scoped: boolean) {
  const maxSpeed = getWeaponMoveSpeed({ weapon, scoped, walking: controls.walking, crouching: controls.crouching });
  return {
    wishDirection: { x: controls.strafe, z: -controls.forward },
    maxSpeed,
    jumpMaxSpeed: maxSpeed,
    crouching: controls.crouching,
  };
}

/**
 * Records a deterministic control timeline by following the actual map nodes
 * through production player physics. The resulting timeline, not this guide,
 * is what the 30/60/144 Hz replays consume.
 */
export function recordDust2Route(name: RouteName, weapon: WeaponKind = 'rifle', scoped = false): RecordedRoute {
  const nodeIds = DUST2_ROUTE_RECORDINGS[name];
  const points = nodeIds.map(nodeId => DUST2_MAP.nodes[nodeId]);
  const movement = createMovementHarness();
  const state = makeState(nodeIds[0]);
  const controls: RecordedControl[] = [];
  const trace: RouteStateSample[] = [];
  let segment = 1;
  let stopping = false;
  for (let tick = 0; tick < 10_000; tick++) {
    while (segment < points.length && reachedSegmentEnd(state, points[segment - 1], points[segment])) segment++;
    if (segment === points.length) stopping = true;
    const currentControls = stopping ? idleControls() : controlsToward(state, points[segment]);
    controls.push({ atSeconds: tick / 100, controls: currentControls });
    movement.advance(0.01, state, movementInput(currentControls, weapon, scoped), DUST2_COLLISION_WORLD);
    assertRouteState(state, name, tick);
    trace.push(copyState(state));
    const stopped = Math.hypot(state.velocity.x, state.velocity.z) === 0;
    if (stopping && stopped && (tick + 1) % ROUTE_TICK_BLOCK === 0) {
      return { name, nodeIds, weapon, scoped, controls, tickCount: tick + 1, trace };
    }
  }
  throw new Error(`${name} did not finish within the fixed replay limit`);
}

function between(value: number, first: number, second: number) {
  return value >= Math.min(first, second) - ROUTE_POSITION_TOLERANCE &&
    value <= Math.max(first, second) + ROUTE_POSITION_TOLERANCE;
}

export function replayDust2Route(recorded: RecordedRoute, rateHz: number): RouteReplay {
  if (rateHz !== ROUTE_REFERENCE_RATE &&
    !ROUTE_RENDER_RATES.includes(rateHz as (typeof ROUTE_RENDER_RATES)[number])) {
    throw new Error(`unsupported render rate ${rateHz}`);
  }
  const timeline = createPlayerInputTimeline();
  for (const event of recorded.controls) timeline.controls(event.atSeconds, event.controls);
  const movement = createMovementHarness();
  const state = makeState(recorded.nodeIds[0]);
  const trace: RouteStateSample[] = [];
  let interpolationFrames = 0;
  let interpolationStart = copyState(state);
  const frames = (recorded.tickCount * rateHz) / 100;
  if (!Number.isInteger(frames)) throw new Error(`route tick count must align with ${rateHz} Hz`);
  for (let frame = 0; frame < frames; frame++) {
    movement.advance(1 / rateHz, state, tickStart => {
      const controls = timeline.sample(tickStart);
      return { ...movementInput(controls, recorded.weapon, recorded.scoped), jumpRequested: controls.jumpRequested };
    }, DUST2_COLLISION_WORLD, () => {
      interpolationStart = trace.at(-1) ?? interpolationStart;
      assertRouteState(state, recorded.name, trace.length);
      trace.push(copyState(state));
    });
    const authoritative = copyState(state);
    const render = movement.getRenderPosition(state);
    if (!between(render.x, interpolationStart.position.x, state.position.x) ||
      !between(render.y, interpolationStart.position.y, state.position.y) ||
      !between(render.z, interpolationStart.position.z, state.position.z)) {
      throw new Error(`${recorded.name} interpolation left its production snapshots at ${rateHz} Hz frame ${frame}`);
    }
    if (JSON.stringify(copyState(state)) !== JSON.stringify(authoritative)) {
      throw new Error(`${recorded.name} interpolation mutated authority at ${rateHz} Hz frame ${frame}`);
    }
    interpolationFrames++;
  }
  if (trace.length !== recorded.tickCount) throw new Error(`${recorded.name} produced ${trace.length} ticks, expected ${recorded.tickCount}`);
  return { recorded, rateHz, trace, interpolationFrames };
}

export function replayDust2RouteAtRenderRates(name: RouteName, weapon: WeaponKind = 'rifle', scoped = false) {
  const recorded = recordDust2Route(name, weapon, scoped);
  return ROUTE_RENDER_RATES.map(rateHz => replayDust2Route(recorded, rateHz));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const routes = (Object.keys(DUST2_ROUTE_RECORDINGS) as RouteName[]).map(name => {
    const recorded = recordDust2Route(name);
    const reference = replayDust2Route(recorded, ROUTE_REFERENCE_RATE);
    const replays = ROUTE_RENDER_RATES.map(rateHz => replayDust2Route(recorded, rateHz));
    const terminal = reference.trace.at(-1)!;
    return {
      name,
      nodeIds: recorded.nodeIds,
      controls: recorded.controls.length,
      tickCount: recorded.tickCount,
      renderSchedules: replays.map(replay => ({ rateHz: replay.rateHz, interpolationFrames: replay.interpolationFrames })),
      terminal,
      recorded,
      reference,
      replays,
    };
  });
  const report = {
    kind: 'jkh-130-production-module-route-replay',
    units: 'scene units; seconds',
    originalFidelity: 'unverified',
    graphicsFpsEvidence: 'not-measured',
    fixedSimulationHz: 100,
    positionTolerance: ROUTE_POSITION_TOLERANCE,
    routes,
  };
  const artifactArgument = process.argv.find(argument => argument.startsWith('--artifact='));
  if (artifactArgument) {
    writeFileSync(resolve(artifactArgument.slice('--artifact='.length)), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify({
    ...report,
    routes: routes.map(({ recorded: _recorded, reference: _reference, replays: _replays, ...summary }) => summary),
  }, null, 2));
}
