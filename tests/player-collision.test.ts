import assert from 'node:assert/strict';
import test from 'node:test';
import { hullBlocked, PLAYER_HULL, resolvePlayerMotion, type PlayerCollisionWorld } from '../app/player-collision.ts';
import { stepPlayerPhysics, type PlayerPhysicsState } from '../app/player-physics.ts';

const empty: PlayerCollisionWorld = { boxes: [], ramps: [], floorHeight: 0, actorBlocks: () => false };
const idle = { wishDirection: { x: 0, z: 0 }, maxSpeed: 4.55, jumpMaxSpeed: 4.55, crouching: false };
const box = (min: [number, number, number], max: [number, number, number]) =>
  ({ min: { x: min[0], y: min[1], z: min[2] }, max: { x: max[0], y: max[1], z: max[2] } });
function player(feet = 0): PlayerPhysicsState {
  return { position: { x: 0, y: feet + PLAYER_HULL.eyeHeight, z: 0 },
    velocity: { x: 0, z: 0 }, verticalVelocity: 0, grounded: feet === 0,
    crouched: false, landingRecoverySeconds: 0 };
}

void test('fall lands on highest crossed box exactly once', () => {
  const world = { ...empty, boxes: [box([-2, 0, -2], [2, 0.5, 2]), box([-1, 0.5, -1], [1, 1, 1])] };
  const state = player(3);
  let landings = 0;
  for (let i = 0; i < 150; i++) landings += Number(stepPlayerPhysics(state, idle, false, world).landed);
  assert.equal(state.position.y, 1 + PLAYER_HULL.eyeHeight);
  assert.equal(state.verticalVelocity, 0);
  assert.equal(state.grounded, true);
  assert.equal(landings, 1);
});

void test('swept vertical movement stops at a thin ceiling without reporting a landing', () => {
  const world = { ...empty, boxes: [box([-2, 2, -2], [2, 2.01, 2])] };
  const result = resolvePlayerMotion(world, { x: 0, feet: 0, z: 0 },
    { x: 0, y: 3, z: 0 }, PLAYER_HULL.standingHeight, false);
  assert.ok(Math.abs(result.feet - 0.2) < 1e-9);
  assert.equal(result.hitCeiling, true);
  assert.equal(result.grounded, false);
  assert.equal(hullBlocked(world, result.x, result.feet, result.z, PLAYER_HULL.standingHeight), false);
});

void test('overhead clearance is based on height rather than XZ overlap alone', () => {
  const world = { ...empty, boxes: [box([-2, 2, -2], [2, 3, 2])] };
  const result = resolvePlayerMotion(world, { x: 0, feet: 0, z: 0 },
    { x: 0.04, y: -0.001, z: 0 }, 1.8, true);
  assert.equal(result.x, 0.04);
  assert.equal(result.grounded, true);
});

void test('0.3 step is climbable but 0.5 ledge and low headroom are not', () => {
  for (const [rise, ceiling, expectedX, expectedFeet] of [
    [0.3, 4, 0.7, 0.3], [0.5, 4, 0.57, 0], [0.3, 2, 0.57, 0],
  ]) {
    const world = { ...empty, boxes: [box([1, 0, -2], [3, rise, 2]), box([-2, ceiling, -2], [4, ceiling + 1, 2])] };
    const result = resolvePlayerMotion(world, { x: 0.5, feet: 0, z: 0 },
      { x: 0.2, y: -0.001, z: 0 }, 1.8, true);
    assert.ok(Math.abs(result.x - expectedX) < 1e-9);
    assert.ok(Math.abs(result.feet - expectedFeet) < 1e-9);
  }
});

void test('horizontal sweep cannot skip a thin wall and still allows Z sliding', () => {
  const world = { ...empty, boxes: [box([1, 0, -5], [1.01, 3, 5])] };
  const result = resolvePlayerMotion(world, { x: 0, feet: 0, z: 0 },
    { x: 4, y: -0.001, z: 0.1 }, 1.8, true);
  assert.ok(Math.abs(result.x - 0.57) < 1e-9);
  assert.equal(result.blockedX, true);
  assert.equal(result.z, 0.1);
});

void test('linear ramp follows the same surface uphill and downhill', () => {
  const world: PlayerCollisionWorld = { ...empty, ramps: [{ minX: 0, maxX: 2, minZ: -2, maxZ: 2,
    axis: 'x', startHeight: 0, endHeight: 1, baseHeight: 0 }] };
  let position = { x: -PLAYER_HULL.radius, feet: 0, z: 0 };
  for (const direction of [1, -1]) {
    for (let i = 0; i < 20; i++) {
      const result = resolvePlayerMotion(world, position, { x: 0.1 * direction, y: -0.001, z: 0 }, 1.8, true);
      assert.ok(Math.abs(result.feet - Math.max(0, Math.min(1, (result.x + PLAYER_HULL.radius) / 2))) < 1e-9);
      assert.equal(result.grounded, true);
      position = result;
    }
  }
});

void test('leaving a high platform releases ground immediately and falls on the next tick', () => {
  const world = { ...empty, boxes: [box([-2, 0, -2], [0, 1, 2])] };
  const result = resolvePlayerMotion(world, { x: 0.4, feet: 1, z: 0 },
    { x: 0.1, y: -0.001, z: 0 }, 1.8, true);
  assert.equal(result.grounded, false);
  const next = resolvePlayerMotion(world, result, { x: 0, y: -0.003, z: 0 }, 1.8, false);
  assert.ok(next.feet < result.feet);
});

void test('crouched hull fits a low tunnel and standing waits for head clearance', () => {
  const world = { ...empty, boxes: [box([-2, 1.3, -2], [2, 2, 2])] };
  const state = player();
  state.crouched = true;
  stepPlayerPhysics(state, { ...idle, crouching: true }, false, world);
  assert.equal(state.crouched, true);
  assert.equal(hullBlocked(world, 0, 0, 0, 1.2), false);
  stepPlayerPhysics(state, idle, false, world);
  assert.equal(state.crouched, true);
  state.position.x = 3;
  stepPlayerPhysics(state, idle, false, world);
  assert.equal(state.crouched, false);
});

void test('actor obstruction is queried with occupied height and does not become a floor', () => {
  const heights: number[] = [];
  const world: PlayerCollisionWorld = { ...empty, actorBlocks: (_x, feet, _z, height) => {
    heights.push(height);
    return feet < 1.8;
  } };
  const blocked = resolvePlayerMotion(world, { x: 0, feet: 0, z: 0 }, { x: 0.1, y: -0.01, z: 0 }, 1.2, true);
  assert.equal(blocked.x, 0);
  const above = resolvePlayerMotion(world, { x: 0, feet: 2, z: 0 }, { x: 0.1, y: -0.01, z: 0 }, 1.8, false);
  assert.equal(above.x, 0.1);
  assert.equal(above.grounded, false);
  assert.ok(heights.includes(1.2));
  assert.ok(heights.includes(1.8));
});

void test('actors do not force a standing player into crouch', () => {
  const state = player();
  stepPlayerPhysics(state, idle, false, { ...empty, actorBlocks: () => true });
  assert.equal(state.crouched, false);
});

void test('an elevated ramp underside is a swept ceiling', () => {
  const world: PlayerCollisionWorld = { ...empty, ramps: [{ minX: -2, maxX: 2, minZ: -2, maxZ: 2,
    axis: 'x', startHeight: 3, endHeight: 4, baseHeight: 2 }] };
  const result = resolvePlayerMotion(world, { x: 0, feet: 0, z: 0 },
    { x: 0, y: 3, z: 0 }, 1.8, false);
  assert.ok(Math.abs(result.feet - 0.2) < 1e-9);
  assert.equal(result.hitCeiling, true);
  assert.equal(hullBlocked(world, 0, result.feet, 0, 1.8), false);
});

void test('a horizontal sweep cannot tunnel through a narrow ramp side', () => {
  const world: PlayerCollisionWorld = { ...empty, ramps: [{ minX: 1, maxX: 1.01, minZ: -2, maxZ: 2,
    axis: 'z', startHeight: 2, endHeight: 3, baseHeight: 0 }] };
  const result = resolvePlayerMotion(world, { x: 0, feet: 0, z: 0 },
    { x: 4, y: -0.01, z: 0 }, 1.8, true);
  assert.ok(Math.abs(result.x - 0.57) < 1e-9);
  assert.equal(result.blockedX, true);
  assert.equal(hullBlocked(world, result.x, 0, 0, 1.8), false);
});

void test('ramp underside collision includes the hull radius at its edge', () => {
  const world: PlayerCollisionWorld = { ...empty, ramps: [{ minX: 1, maxX: 2, minZ: -2, maxZ: 2,
    axis: 'z', startHeight: 3, endHeight: 4, baseHeight: 2 }] };
  const result = resolvePlayerMotion(world, { x: 0.8, feet: 0, z: 0 },
    { x: 0, y: 3, z: 0 }, 1.8, false);
  assert.ok(Math.abs(result.feet - 0.2) < 1e-9);
  assert.equal(result.hitCeiling, true);
});
