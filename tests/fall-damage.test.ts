import assert from 'node:assert/strict';
import test from 'node:test';
import { stepCharacterMotion } from '../app/character-motion.ts';
import {
  FALL_DAMAGE_FATAL_REFERENCE_SPEED,
  FALL_DAMAGE_SAFE_SPEED,
  getFallDamage,
  resolveFallDamage,
} from '../app/game-rules.ts';
import { PLAYER_HULL, type PlayerCollisionWorld } from '../app/player-collision.ts';
import { stepPlayerPhysics, type PlayerPhysicsState } from '../app/player-physics.ts';
import { createMovementHarness } from '../scripts/player-movement-harness.ts';

const openWorld: PlayerCollisionWorld = {
  boxes: [],
  ramps: [],
  floorHeight: 0,
  actorBlocks: () => false,
};
const idleInput = {
  wishDirection: { x: 0, z: 0 },
  maxSpeed: 4.55,
  jumpMaxSpeed: 4.55,
  crouching: false,
};

function airbornePlayer(feet: number, verticalVelocity: number): PlayerPhysicsState {
  return {
    position: { x: 0, y: feet + PLAYER_HULL.eyeHeight, z: 0 },
    velocity: { x: 0, z: 0 },
    verticalVelocity,
    grounded: false,
    crouched: false,
    landingRecoverySeconds: 0,
  };
}

void test('reconstructed fall thresholds convert through the existing scene-unit scale', () => {
  assert.equal(FALL_DAMAGE_SAFE_SPEED, 12.5);
  assert.equal(FALL_DAMAGE_FATAL_REFERENCE_SPEED, 27.5);
  assert.equal(getFallDamage(FALL_DAMAGE_SAFE_SPEED), 0);
  assert.equal(getFallDamage(24.5), 100);
  assert.ok(Math.abs(getFallDamage(FALL_DAMAGE_FATAL_REFERENCE_SPEED) - 125) <= 1e-12);
  for (const speed of [-1, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(getFallDamage(speed), 0);
});

void test('fall damage bypasses armor and resolves one shared finite player/bot health result', () => {
  assert.deepEqual(resolveFallDamage({
    health: 100,
    armor: 100,
    helmet: true,
    impactDownwardSpeed: 24.5,
  }), {
    health: 0,
    armor: 100,
    helmet: true,
    healthDamage: 100,
    armorDamage: 0,
  });
  assert.deepEqual(resolveFallDamage({
    health: 45,
    armor: 70,
    helmet: true,
    impactDownwardSpeed: FALL_DAMAGE_SAFE_SPEED,
  }), {
    health: 45,
    armor: 70,
    helmet: true,
    healthDamage: 0,
    armorDamage: 0,
  });
  assert.deepEqual(resolveFallDamage({
    health: 100,
    armor: 0,
    helmet: true,
    impactDownwardSpeed: FALL_DAMAGE_SAFE_SPEED,
  }), {
    health: 100,
    armor: 0,
    helmet: true,
    healthDamage: 0,
    armorDamage: 0,
  });
  assert.deepEqual(resolveFallDamage({
    health: Number.NaN,
    armor: Number.NaN,
    helmet: true,
    impactDownwardSpeed: Number.NaN,
  }), {
    health: 0,
    armor: Number.NaN,
    helmet: true,
    healthDamage: 0,
    armorDamage: 0,
  });
});

void test('only an airborne landing exposes the post-gravity, pre-clamp downward impact speed', () => {
  const impact = stepCharacterMotion({
    x: 0,
    feet: 0.245,
    z: 0,
    velocity: { x: 0, z: 0 },
    verticalVelocity: -24.355,
    grounded: false,
  }, PLAYER_HULL.standingHeight, openWorld, 0.01);
  assert.equal(impact.landed, true);
  assert.ok(Math.abs(impact.impactDownwardSpeed - 24.5) <= 1e-12);
  assert.equal(impact.verticalVelocity, 0);

  const player = airbornePlayer(0.245, -24.355);
  const playerEvent = stepPlayerPhysics(player, idleInput, false, openWorld);
  assert.equal(playerEvent.landed, true);
  assert.ok(Math.abs(playerEvent.impactDownwardSpeed - impact.impactDownwardSpeed) <= 1e-12);

  const settled = stepCharacterMotion({
    x: 0,
    feet: 0,
    z: 0,
    velocity: { x: 0, z: 0 },
    verticalVelocity: -999,
    grounded: true,
  }, PLAYER_HULL.standingHeight, openWorld, 0.01);
  assert.equal(settled.landed, false);
  assert.equal(settled.impactDownwardSpeed, 0);
});

void test('ceiling contact, jump ascent, and a legal support step never report a fall impact', () => {
  const ceilingWorld: PlayerCollisionWorld = {
    ...openWorld,
    boxes: [{ min: { x: -2, y: 2, z: -2 }, max: { x: 2, y: 3, z: 2 } }],
  };
  const ceiling = stepCharacterMotion({
    x: 0,
    feet: 0.19,
    z: 0,
    velocity: { x: 0, z: 0 },
    verticalVelocity: 5,
    grounded: false,
  }, PLAYER_HULL.standingHeight, ceilingWorld, 0.01);
  assert.equal(ceiling.hitCeiling, true);
  assert.equal(ceiling.impactDownwardSpeed, 0);

  const jumping = airbornePlayer(0, 0);
  jumping.grounded = true;
  const jump = stepPlayerPhysics(jumping, idleInput, true, openWorld);
  assert.equal(jump.jumped, true);
  assert.equal(jump.impactDownwardSpeed, 0);

  const stepWorld: PlayerCollisionWorld = {
    ...openWorld,
    boxes: [{ min: { x: 1, y: 0, z: -2 }, max: { x: 2, y: 0.3, z: 2 } }],
  };
  const support = stepCharacterMotion({
    x: 0.56,
    feet: 0,
    z: 0,
    velocity: { x: 4, z: 0 },
    verticalVelocity: 0,
    grounded: true,
  }, PLAYER_HULL.standingHeight, stepWorld, 0.01);
  assert.equal(support.grounded, true);
  assert.equal(support.impactDownwardSpeed, 0);
});

function replayFallAndRespawn(rateHz: number) {
  const movement = createMovementHarness();
  const state = airbornePlayer(8, 0);
  const impacts: number[] = [];
  for (let frame = 0; frame < rateHz * 2; frame++) {
    movement.advance(1 / rateHz, state, idleInput, openWorld, event => {
      if (event.impactDownwardSpeed > 0) impacts.push(event.impactDownwardSpeed);
    });
  }
  movement.reset();
  state.position.y = PLAYER_HULL.eyeHeight;
  state.velocity.x = 0;
  state.velocity.z = 0;
  state.verticalVelocity = 0;
  state.grounded = true;
  state.crouched = false;
  state.landingRecoverySeconds = 0;
  const respawnImpacts: number[] = [];
  for (let frame = 0; frame < rateHz; frame++) {
    movement.advance(1 / rateHz, state, idleInput, openWorld, event => {
      if (event.impactDownwardSpeed > 0) respawnImpacts.push(event.impactDownwardSpeed);
    });
  }
  return { impacts, respawnImpacts, state: structuredClone(state) };
}

void test('one falling impact and a reset respawn replay identically at 30/60/144 Hz', () => {
  const reference = replayFallAndRespawn(100);
  assert.equal(reference.impacts.length, 1);
  assert.ok(reference.impacts[0] > FALL_DAMAGE_SAFE_SPEED);
  assert.deepEqual(reference.respawnImpacts, []);
  for (const rateHz of [30, 60, 144]) assert.deepEqual(replayFallAndRespawn(rateHz), reference);
});
