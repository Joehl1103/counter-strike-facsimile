import { createMovementHarness as createPlayerMovement } from '../scripts/player-movement-harness.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { PlayerCollisionWorld } from '../app/player-collision.ts';
import { stepPlayerPhysics, type PlayerPhysicsState } from '../app/player-physics.ts';

const idle = { wishDirection: { x: 0, z: 0 }, maxSpeed: 4.55, jumpMaxSpeed: 4.55, crouching: false };
const openSpace: PlayerCollisionWorld = { boxes: [], ramps: [], floorHeight: 0, actorBlocks: () => false };
function initialState(): PlayerPhysicsState {
  return { position: { x: 0, y: 1.68, z: 0 }, velocity: { x: 0, z: 0 },
    verticalVelocity: 0, grounded: true, crouched: false, landingRecoverySeconds: 0 };
}

void test('a jump changes state only on its first eligible simulation tick', () => {
  const movement = createPlayerMovement();
  const state = initialState();
  assert.equal(movement.requestJump(true), true);
  assert.equal(movement.requestJump(true), false);
  assert.deepEqual(state, initialState());
  assert.equal(movement.advance(0.005, state, idle, openSpace), 0);
  assert.deepEqual(state, initialState());
  const events: boolean[] = [];
  movement.advance(0.045, state, idle, openSpace, event => events.push(event.jumped));
  assert.deepEqual(events, [true, false, false, false, false]);
  assert.equal(state.grounded, false);
  assert.ok(state.position.y > 1.68);
});

void test('reset discards pending jump and time; rejected input cannot jump after resume', () => {
  for (const interruption of ['pause', 'death', 'freeze', 'spawn']) {
    const movement = createPlayerMovement();
    const state = initialState();
    movement.requestJump(true);
    movement.advance(0.009, state, idle, openSpace);
    movement.reset();
    assert.equal(movement.requestJump(false), false, interruption);
    assert.equal(movement.advance(0.001, state, idle, openSpace), 0);
    movement.advance(0.009, state, idle, openSpace, e => assert.equal(e.jumped, false));
    assert.deepEqual(state, initialState());
  }
});

function jumpReplay(rate: number) {
  const movement = createPlayerMovement();
  const state = initialState();
  const trace: Array<{ height: number; velocity: number; grounded: boolean }> = [];
  let jumps = 0;
  let landings = 0;
  movement.requestJump(true);
  for (let frame = 0; frame < rate * 2; frame++) {
    movement.advance(1 / rate, state, idle, openSpace, event => {
      jumps += Number(event.jumped);
      landings += Number(event.landed);
      trace.push({ height: state.position.y, velocity: state.verticalVelocity,
        grounded: state.grounded });
    });
  }
  return { trace, jumps, landings, state };
}

void test('one scheduled jump has the same complete trajectory at 30/60/144 Hz', () => {
  const reference = jumpReplay(100);
  assert.equal(reference.trace.length, 200);
  assert.equal(reference.jumps, 1);
  assert.equal(reference.landings, 1);
  assert.deepEqual(reference.state, initialState());
  assert.ok(reference.trace.some(sample => sample.height > 2.5));
  for (const rate of [30, 60, 144]) assert.deepEqual(jumpReplay(rate), reference);
});

void test('wall collision stops the blocked axis and preserves sliding on the other axis', () => {
  const state = initialState();
  stepPlayerPhysics(state, { ...idle, wishDirection: { x: 1, z: 1 } }, false, {
    ...openSpace, boxes: [{min:{x:0.43,y:0,z:-10}, max:{x:1,y:3,z:10}}],
  });
  assert.equal(state.position.x, 0);
  assert.equal(state.velocity.x, 0);
  assert.ok(state.position.z > 0);
  assert.ok(state.velocity.z > 0);
});

void test('airborne jump request is consumed without a second impulse or delayed landing jump', () => {
  const movement = createPlayerMovement();
  const state = initialState();
  movement.requestJump(true);
  movement.advance(0.01, state, idle, openSpace);
  const upwardVelocity = state.verticalVelocity;
  // Eligibility is rechecked at tick consumption even if an adapter errs.
  movement.requestJump(true);
  movement.advance(0.01, state, idle, openSpace, e => assert.equal(e.jumped, false));
  assert.ok(state.verticalVelocity < upwardVelocity);
  for (let i = 0; i < 150; i++) movement.advance(0.01, state, idle, openSpace);
  assert.deepEqual(state, initialState());
});

void test('page queues jump and clears the same controller on ineligible lifecycle paths', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const handler = page.slice(page.indexOf('const tryPlayerJump ='), page.indexOf('const onKeyDown ='));
  assert.match(handler, /playerInput\.jump\(movementEventTime\(\)\)/);
  assert.match(handler, /player\.grounded && playerAlive && simulationNowMs >= freezeEnds/);
  assert.match(handler, /pointerLockElement === renderer\.domElement \|\| touchPlaying/);
  assert.doesNotMatch(handler, /player\.(?:verticalVelocity|grounded)\s*=(?!=)/);
  assert.match(page, /playerMovement\.reset\(\);\s+playerInput\.reset\(\);[\s\S]*?player\.position\.set\(spawnX/);
  assert.match(page, /playerMovement\.reset\(\);\s+playerInput\.reset\(\);[\s\S]*?if \(pauseTouch\)/);
  assert.match(page, /if \(!isPlaying \|\| !playerAlive \|\| simulationNowMs < freezeEnds\) \{\s+playerMovement\.reset\(\);/);
});
