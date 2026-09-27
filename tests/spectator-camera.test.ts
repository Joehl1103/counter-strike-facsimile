import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clipSpectatorCameraBoom,
  SPECTATOR_CAMERA_CLEARANCE,
  SPECTATOR_CAMERA_MIN_TARGET_DISTANCE,
  SPECTATOR_CAMERA_SURFACE_OFFSET,
  type SpectatorCameraBounds,
  type SpectatorCameraPoint,
} from '../app/spectator-camera.ts';

const target = { x: 0, y: 1.4, z: 0 };

const box = (
  min: SpectatorCameraPoint,
  max: SpectatorCameraPoint,
): SpectatorCameraBounds => ({ min, max });

const distance = (first: SpectatorCameraPoint, second: SpectatorCameraPoint) =>
  Math.hypot(second.x - first.x, second.y - first.y, second.z - first.z);

void test('an unobstructed spectator boom preserves its desired position', () => {
  const desired = { x: 4.2, y: 4, z: -3.4 };
  assert.deepEqual(clipSpectatorCameraBoom(target, desired, []), desired);
});

void test('a wall between the target and camera clips the boom before its surface', () => {
  const desired = { x: 10, y: 1.4, z: 0 };
  const wall = box({ x: 4, y: -1, z: -2 }, { x: 5, y: 5, z: 2 });
  const result = clipSpectatorCameraBoom(target, desired, [wall]);

  assert.ok(result.x < wall.min.x - SPECTATOR_CAMERA_CLEARANCE);
  assert.ok(result.x > 3.7);
  assert.equal(result.y, target.y);
  assert.equal(result.z, target.z);
  assert.ok(
    Math.abs(
      result.x -
        (wall.min.x -
          SPECTATOR_CAMERA_CLEARANCE -
          SPECTATOR_CAMERA_SURFACE_OFFSET),
    ) < 1e-9,
  );
});

void test('diagonal interpolation cannot cross an adjacent wall corner', () => {
  const desired = { x: 5, y: 1.4, z: 5 };
  const corner = box({ x: 2, y: -1, z: 2 }, { x: 3, y: 5, z: 3 });
  const result = clipSpectatorCameraBoom(target, desired, [{ box: corner }]);

  assert.ok(result.x < corner.min.x - SPECTATOR_CAMERA_CLEARANCE);
  assert.ok(result.z < corner.min.z - SPECTATOR_CAMERA_CLEARANCE);
  assert.ok(Math.abs(result.x - result.z) < 1e-9);
});

void test('near-wall clipping uses a bounded clear-side view instead of entering the actor', () => {
  const nearbyWall = box({ x: 0.2, y: -1, z: -2 }, { x: 1.2, y: 5, z: 2 });
  const result = clipSpectatorCameraBoom(target, { x: 5.4, y: 4, z: 0 }, [
    nearbyWall,
  ]);

  assert.ok(distance(target, result) >= SPECTATOR_CAMERA_MIN_TARGET_DISTANCE);
  assert.ok(result.x < target.x);
  assert.ok(result.y > target.y);
  assert.ok(Object.values(result).every(Number.isFinite));
});

void test('a target within the clearance shell can move its camera away from the wall', () => {
  const nearbyWall = box({ x: 0.1, y: -1, z: -2 }, { x: 1.1, y: 5, z: 2 });
  const desired = { x: -3, y: 3, z: 0 };

  assert.deepEqual(
    clipSpectatorCameraBoom(target, desired, [nearbyWall]),
    desired,
  );
});

void test('a target on a wall edge moves to a visible fallback when the orbit points inward', () => {
  const wallWithReversedCorners = box(
    { x: 1, y: 5, z: 2 },
    { x: 0, y: -1, z: -2 },
  );
  const result = clipSpectatorCameraBoom(target, { x: 4, y: 3, z: 0 }, [
    wallWithReversedCorners,
  ]);

  assert.ok(result.x < target.x);
  assert.ok(result.y > target.y);
  assert.ok(distance(target, result) >= SPECTATOR_CAMERA_MIN_TARGET_DISTANCE);
  assert.ok(Object.values(result).every(Number.isFinite));
});

void test('a short post-interpolation boom cannot leave the camera inside the actor', () => {
  const result = clipSpectatorCameraBoom(
    target,
    { x: 0.12, y: 1.46, z: -0.08 },
    [],
  );

  assert.ok(distance(target, result) >= SPECTATOR_CAMERA_MIN_TARGET_DISTANCE);
  assert.ok(result.y > target.y);
  assert.ok(Object.values(result).every(Number.isFinite));
});

void test('degenerate and inside-collider starts always return finite positions', () => {
  const zeroLengthFallback = clipSpectatorCameraBoom(target, target, []);
  assert.ok(
    distance(target, zeroLengthFallback) >=
      SPECTATOR_CAMERA_MIN_TARGET_DISTANCE,
  );
  assert.ok(Object.values(zeroLengthFallback).every(Number.isFinite));

  const containingBox = box({ x: -1, y: 0, z: -1 }, { x: 1, y: 3, z: 1 });
  const escaped = clipSpectatorCameraBoom(target, { x: 3, y: 3, z: 0 }, [
    containingBox,
  ]);
  assert.ok(Object.values(escaped).every(Number.isFinite));
  assert.ok(distance(target, escaped) >= SPECTATOR_CAMERA_MIN_TARGET_DISTANCE);

  const sanitized = clipSpectatorCameraBoom(
    { x: Number.NaN, y: 2, z: Number.POSITIVE_INFINITY },
    { x: Number.NaN, y: Number.NEGATIVE_INFINITY, z: 4 },
    [box({ x: Number.NaN, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })],
  );
  assert.ok(Object.values(sanitized).every(Number.isFinite));
});
