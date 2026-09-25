import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPlayerDeathCameraPose,
  getPlayerDeathCameraVariant,
  PLAYER_CAMERA_MIN_PITCH,
  PLAYER_DEATH_CAMERA_DURATION_SECONDS,
  shouldAdvancePlayerDeathCamera,
  shouldUseSpectatorOrbit,
} from '../app/player-death-camera.ts';

const start = { x: 4, y: 1.68, z: -6, pitch: 0.2, yaw: -1.1 };

void test('death camera begins at the exact captured first-person pose', () => {
  assert.deepEqual(getPlayerDeathCameraPose(start, 0, -1), {
    ...start,
    roll: 0,
  });
  assert.deepEqual(getPlayerDeathCameraPose(start, -2, 1), {
    ...start,
    roll: 0,
  });
});

void test('death camera fall is bounded, finite, and never moves laterally', () => {
  const settled = getPlayerDeathCameraPose(
    start,
    PLAYER_DEATH_CAMERA_DURATION_SECONDS,
    1,
  );
  assert.equal(settled.x, start.x);
  assert.equal(settled.z, start.z);
  assert.equal(settled.y, start.y - 0.56);
  assert.ok(Math.abs(settled.pitch - start.pitch) <= 0.1);
  assert.ok(Math.abs(settled.roll) <= 0.14);
  assert.deepEqual(getPlayerDeathCameraPose(start, 99, 1), settled);
  assert.ok(Object.values(settled).every(Number.isFinite));

  const sanitized = getPlayerDeathCameraPose(
    { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: 0, pitch: 0, yaw: 0 },
    Number.NaN,
    -1,
  );
  assert.ok(Object.values(sanitized).every(Number.isFinite));

  const lowerBoundary = getPlayerDeathCameraPose(
    { ...start, pitch: PLAYER_CAMERA_MIN_PITCH },
    PLAYER_DEATH_CAMERA_DURATION_SECONDS,
    1,
  );
  assert.equal(lowerBoundary.pitch, PLAYER_CAMERA_MIN_PITCH);
});

void test('death camera variants deterministically mirror the roll', () => {
  assert.equal(getPlayerDeathCameraVariant(0), -1);
  assert.equal(getPlayerDeathCameraVariant(1), 1);
  assert.equal(getPlayerDeathCameraVariant(2), -1);
  assert.equal(getPlayerDeathCameraVariant(Number.NaN), -1);
  const left = getPlayerDeathCameraPose(start, 1, -1);
  const right = getPlayerDeathCameraPose(start, 1, 1);
  assert.equal(left.roll, -right.roll);
});

void test('death camera pauses with play and completes during result review', () => {
  assert.equal(shouldAdvancePlayerDeathCamera(true, 'active'), true);
  assert.equal(shouldAdvancePlayerDeathCamera(false, 'active'), false);
  assert.equal(shouldAdvancePlayerDeathCamera(false, 'briefing'), false);
  assert.equal(shouldAdvancePlayerDeathCamera(false, 'round-won'), true);
  assert.equal(shouldAdvancePlayerDeathCamera(false, 'round-lost'), true);
  assert.equal(shouldAdvancePlayerDeathCamera(false, 'match-won'), true);
  assert.equal(shouldAdvancePlayerDeathCamera(false, 'match-lost'), true);
});

void test('spectator orbit waits for a completed death fall', () => {
  assert.equal(shouldUseSpectatorOrbit(true, 10), false);
  assert.equal(shouldUseSpectatorOrbit(false, 0), false);
  assert.equal(
    shouldUseSpectatorOrbit(
      false,
      PLAYER_DEATH_CAMERA_DURATION_SECONDS - 0.001,
    ),
    false,
  );
  assert.equal(
    shouldUseSpectatorOrbit(false, PLAYER_DEATH_CAMERA_DURATION_SECONDS),
    true,
  );
  assert.equal(shouldUseSpectatorOrbit(false, Number.NaN), false);
});
