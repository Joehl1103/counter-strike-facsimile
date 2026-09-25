export type SpectatorCameraPoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type SpectatorCameraBounds = Readonly<{
  min: SpectatorCameraPoint;
  max: SpectatorCameraPoint;
}>;

export type SpectatorCameraCollider =
  | SpectatorCameraBounds
  | Readonly<{ box: SpectatorCameraBounds }>;

export const SPECTATOR_CAMERA_CLEARANCE = 0.18;
export const SPECTATOR_CAMERA_SURFACE_OFFSET = 0.08;
export const SPECTATOR_CAMERA_MIN_TARGET_DISTANCE = 1.1;

const AXES = ['x', 'y', 'z'] as const;
const SEGMENT_EPSILON = 1e-8;

type SegmentInterval = Readonly<{ enter: number; exit: number }>;

const finiteOr = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

const distanceBetween = (
  first: SpectatorCameraPoint,
  second: SpectatorCameraPoint,
) => Math.hypot(second.x - first.x, second.y - first.y, second.z - first.z);

const getBounds = (collider: SpectatorCameraCollider): SpectatorCameraBounds =>
  'box' in collider ? collider.box : collider;

const normalizeBounds = (
  collider: SpectatorCameraCollider,
): SpectatorCameraBounds | null => {
  const bounds = getBounds(collider);
  if (
    !AXES.every(
      (axis) =>
        Number.isFinite(bounds.min[axis]) && Number.isFinite(bounds.max[axis]),
    )
  ) {
    return null;
  }

  return {
    min: {
      x: Math.min(bounds.min.x, bounds.max.x),
      y: Math.min(bounds.min.y, bounds.max.y),
      z: Math.min(bounds.min.z, bounds.max.z),
    },
    max: {
      x: Math.max(bounds.min.x, bounds.max.x),
      y: Math.max(bounds.min.y, bounds.max.y),
      z: Math.max(bounds.min.z, bounds.max.z),
    },
  };
};

const containsStrictly = (
  point: SpectatorCameraPoint,
  bounds: SpectatorCameraBounds,
) =>
  AXES.every(
    (axis) =>
      point[axis] > bounds.min[axis] + SEGMENT_EPSILON &&
      point[axis] < bounds.max[axis] - SEGMENT_EPSILON,
  );

const segmentInterval = (
  start: SpectatorCameraPoint,
  end: SpectatorCameraPoint,
  bounds: SpectatorCameraBounds,
  expansion: number,
): SegmentInterval | null => {
  let enter = 0;
  let exit = 1;

  for (const axis of AXES) {
    const delta = end[axis] - start[axis];
    const minimum = bounds.min[axis] - expansion;
    const maximum = bounds.max[axis] + expansion;
    if (Math.abs(delta) <= SEGMENT_EPSILON) {
      if (start[axis] < minimum || start[axis] > maximum) return null;
      continue;
    }

    let near = (minimum - start[axis]) / delta;
    let far = (maximum - start[axis]) / delta;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    exit = Math.min(exit, far);
    if (enter > exit) return null;
  }

  return exit < 0 || enter > 1 ? null : { enter, exit };
};

const clipDirectBoom = (
  target: SpectatorCameraPoint,
  desired: SpectatorCameraPoint,
  colliders: readonly SpectatorCameraCollider[],
) => {
  const boomLength = distanceBetween(target, desired);
  if (boomLength <= SEGMENT_EPSILON) return { ...target };

  let allowedFraction = 1;
  for (const collider of colliders) {
    const bounds = normalizeBounds(collider);
    if (!bounds || containsStrictly(target, bounds)) continue;

    const actualHit = segmentInterval(target, desired, bounds, 0);
    const expandedHit = segmentInterval(
      target,
      desired,
      bounds,
      SPECTATOR_CAMERA_CLEARANCE,
    );
    if (!expandedHit || expandedHit.exit <= SEGMENT_EPSILON) continue;

    const startsInsideExpanded = expandedHit.enter <= SEGMENT_EPSILON;
    if (
      startsInsideExpanded &&
      (!actualHit || actualHit.exit <= SEGMENT_EPSILON)
    ) {
      // A watched actor can stand closer to a wall than the camera clearance.
      // Moving away from that wall must remain possible instead of collapsing
      // the boom at its target.
      continue;
    }

    const hitFraction = startsInsideExpanded
      ? (actualHit?.enter ?? 0) -
        (SPECTATOR_CAMERA_CLEARANCE + SPECTATOR_CAMERA_SURFACE_OFFSET) /
          boomLength
      : expandedHit.enter - SPECTATOR_CAMERA_SURFACE_OFFSET / boomLength;
    allowedFraction = Math.min(
      allowedFraction,
      Math.max(0, Math.min(1, hitFraction)),
    );
  }

  return {
    x: target.x + (desired.x - target.x) * allowedFraction,
    y: target.y + (desired.y - target.y) * allowedFraction,
    z: target.z + (desired.z - target.z) * allowedFraction,
  };
};

/**
 * Keeps a third-person spectator camera on the target-facing side of the
 * existing structural colliders. The fixed alternatives handle the one case
 * where ordinary boom clipping would put the camera inside the watched actor.
 */
export function clipSpectatorCameraBoom(
  targetInput: SpectatorCameraPoint,
  desiredInput: SpectatorCameraPoint,
  colliders: readonly SpectatorCameraCollider[],
): SpectatorCameraPoint {
  const target = {
    x: finiteOr(targetInput.x, 0),
    y: finiteOr(targetInput.y, 0),
    z: finiteOr(targetInput.z, 0),
  };
  const desired = {
    x: finiteOr(desiredInput.x, target.x),
    y: finiteOr(desiredInput.y, target.y),
    z: finiteOr(desiredInput.z, target.z),
  };
  const clipped = clipDirectBoom(target, desired, colliders);
  if (
    distanceBetween(target, clipped) >= SPECTATOR_CAMERA_MIN_TARGET_DISTANCE
  ) {
    return clipped;
  }

  const horizontalLength = Math.hypot(
    desired.x - target.x,
    desired.z - target.z,
  );
  const forwardX =
    horizontalLength > SEGMENT_EPSILON
      ? (desired.x - target.x) / horizontalLength
      : 0;
  const forwardZ =
    horizontalLength > SEGMENT_EPSILON
      ? (desired.z - target.z) / horizontalLength
      : 1;
  const fallbackDistance = 2.2;
  const fallbackHeight = 2.2;
  const alternatives = [
    { x: -forwardX, z: -forwardZ },
    { x: -forwardZ, z: forwardX },
    { x: forwardZ, z: -forwardX },
    { x: 0, z: 0 },
  ];
  let best = clipped;

  for (const direction of alternatives) {
    const alternative = clipDirectBoom(
      target,
      {
        x: target.x + direction.x * fallbackDistance,
        y:
          target.y +
          (direction.x === 0 && direction.z === 0
            ? fallbackHeight + 0.8
            : fallbackHeight),
        z: target.z + direction.z * fallbackDistance,
      },
      colliders,
    );
    const alternativeDistance = distanceBetween(target, alternative);
    if (alternativeDistance > distanceBetween(target, best)) best = alternative;
    if (alternativeDistance >= SPECTATOR_CAMERA_MIN_TARGET_DISTANCE) {
      return alternative;
    }
  }

  return best;
}
