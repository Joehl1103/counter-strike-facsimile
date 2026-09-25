import { createMovementHarness as createPlayerMovement } from '../scripts/player-movement-harness.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createPlayerInputTimeline, type MovementControls } from '../app/player-input.ts';
import { type PlayerPhysicsState } from '../app/player-physics.ts';

const emptyWorld = { boxes: [], ramps: [], floorHeight: 0, actorBlocks: () => false };
const controls: MovementControls = { strafe: 0, forward: 0, yaw: 0, walking: false, crouching: false };
const makeState = (): PlayerPhysicsState => ({ position: { x: 0, y: 1.68, z: 0 },
  velocity: { x: 0, z: 0 }, verticalVelocity: 0, grounded: true, crouched: false, landingRecoverySeconds: 0 });

export function replay(rate: number) {
  const timeline = createPlayerInputTimeline();
  const movement = createPlayerMovement();
  const state = makeState();
  const trace: Array<PlayerPhysicsState & { jumped: boolean; landed: boolean }> = [];
  timeline.controls(0.013, { ...controls, forward: 1 });
  timeline.controls(0.337, { ...controls, strafe: 1 });
  timeline.controls(0.483, { ...controls, strafe: -1, walking: true });
  timeline.jump(0.713);
  timeline.controls(0.931, { ...controls, forward: 1, crouching: true });
  timeline.controls(1.137, { ...controls, crouching: true });
  timeline.controls(1.543, controls);
  for (let frame = 0; frame < rate * 2; frame++) {
    movement.advance(1 / rate, state, tick => {
      const input = timeline.sample(tick);
      return { wishDirection: { x: input.strafe, z: -input.forward },
        maxSpeed: input.crouching ? 1.5 : input.walking ? 2.5 : 4.55,
        jumpMaxSpeed: 4.55, crouching: input.crouching, jumpRequested: input.jumpRequested };
    }, emptyWorld, event => trace.push({ ...structuredClone(state), ...event }));
  }
  return { trace, state, movement };
}

void test('dynamic timestamped direction, walk, crouch and jump traces agree at 30/60/144Hz', () => {
  const reference = replay(100);
  assert.equal(reference.trace.length, 200);
  for (const rate of [30, 60, 144]) {
    const result = replay(rate);
    assert.deepEqual(result.trace, reference.trace);
    assert.deepEqual(result.movement.getRenderPosition(result.state), reference.movement.getRenderPosition(reference.state));
  }
  assert.equal(reference.trace.filter(item => item.jumped).length, 1);
  assert.equal(reference.trace.filter(item => item.landed).length, 1);
});

void test('events wait for tick start, equal timestamps retain order and jumps are single edges', () => {
  const timeline = createPlayerInputTimeline();
  timeline.controls(0.013, { ...controls, forward: 1 });
  timeline.controls(0.013, { ...controls, forward: -1 });
  timeline.jump(0.013);
  assert.equal(timeline.sample(0.01).forward, 0);
  assert.deepEqual(timeline.sample(0.02), { ...controls, forward: -1, jumpRequested: true });
  assert.equal(timeline.sample(0.03).jumpRequested, false);
  assert.equal(timeline.jump(NaN), false);
  timeline.jump(1);
  timeline.reset();
  assert.deepEqual(timeline.sample(2), { ...controls, jumpRequested: false });
});

void test('interpolation is bounded, does not mutate authority, and resets across teleport', () => {
  const movement = createPlayerMovement();
  const state = makeState();
  const input = { wishDirection: { x: 1, z: 0 }, maxSpeed: 4.55, jumpMaxSpeed: 4.55, crouching: false };
  movement.advance(0.015, state, input, emptyWorld);
  const authority = structuredClone(state);
  const render = movement.getRenderPosition(state);
  assert.ok(render.x > 0 && render.x < state.position.x);
  assert.deepEqual(state, authority);
  movement.reset();
  state.position.x = 50;
  assert.deepEqual(movement.getRenderPosition(state), state.position);
  assert.equal(movement.getTimeSeconds(), 0);
});

void test('page captures key and look transitions and applies interpolation only to presentation', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  for (const [start, end] of [
    ['const onKeyDown =', 'const onKeyUp ='], ['const onKeyUp =', 'const onMouseMove ='],
    ['const onMouseMove =', 'const onMouseDown ='], ['const onCanvasPointerMove =', 'const onCanvasPointerUp ='],
  ]) assert.match(page.slice(page.indexOf(start), page.indexOf(end)), /enqueueMovementControls\(\)/);
  assert.match(page, /playerInput\.sample\(tickStartSeconds\)/);
  assert.match(page, /presentationCamera\.position\.add\(playerInterpolationOffset\)/);
  assert.doesNotMatch(page, /(?:player\.position|camera\.position)\.add\(playerInterpolationOffset\)/);
});
