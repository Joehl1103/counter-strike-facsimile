export const PLAYER_HULL = Object.freeze({ radius: 0.43, standingHeight: 1.8,
  crouchedHeight: 1.2, eyeHeight: 1.68, stepHeight: 0.36 });
// Uncalibrated project convention for subsequently recreated map coordinates.
export const GOLDSRC_UNITS_PER_SCENE_UNIT = 40;
export interface HullBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}
export interface WalkableRamp {
  minX: number; maxX: number; minZ: number; maxZ: number;
  axis: 'x' | 'z'; startHeight: number; endHeight: number; baseHeight: number;
}
export interface PlayerCollisionWorld {
  boxes: readonly HullBox[];
  ramps: readonly WalkableRamp[];
  floorHeight: number;
  actorBlocks: (x: number, feet: number, z: number, height: number) => boolean;
}
const EPS = 1e-9;
const R = PLAYER_HULL.radius;
function overlapsFoot(x: number, z: number, box: HullBox) {
  return x + R > box.min.x + EPS && x - R < box.max.x - EPS &&
    z + R > box.min.z + EPS && z - R < box.max.z - EPS;
}
function rampHeight(ramp: WalkableRamp, x: number, z: number) {
  if (x < ramp.minX - R - EPS || x > ramp.maxX + R + EPS ||
      z < ramp.minZ - R - EPS || z > ramp.maxZ + R + EPS) return null;
  const low = ramp.axis === 'x' ? ramp.minX : ramp.minZ;
  const high = ramp.axis === 'x' ? ramp.maxX : ramp.maxZ;
  // Highest point under the square footprint: Minkowski expansion of the ramp.
  const coordinate = (ramp.axis === 'x' ? x : z) + Math.sign(ramp.endHeight - ramp.startHeight) * R;
  const t = Math.max(0, Math.min(1, (coordinate - low) / (high - low)));
  return ramp.startHeight + (ramp.endHeight - ramp.startHeight) * t;
}
export function hullGeometryBlocked(world: PlayerCollisionWorld, x: number, feet: number,
  z: number, height: number) {
  return world.boxes.some(box => overlapsFoot(x, z, box) &&
    feet < box.max.y - EPS && feet + height > box.min.y + EPS) ||
    world.ramps.some(ramp => {
      const surface = rampHeight(ramp, x, z);
      return surface !== null && x > ramp.minX - R + EPS && x < ramp.maxX + R - EPS &&
        z > ramp.minZ - R + EPS && z < ramp.maxZ + R - EPS &&
        feet < surface - EPS && feet + height > ramp.baseHeight + EPS;
    });
}
export function hullBlocked(world: PlayerCollisionWorld, x: number, feet: number,
  z: number, height: number) {
  return hullGeometryBlocked(world, x, feet, z, height) || world.actorBlocks(x, feet, z, height);
}
function supportBelow(world: PlayerCollisionWorld, x: number, z: number, ceiling: number) {
  let support = world.floorHeight <= ceiling + EPS ? world.floorHeight : -Infinity;
  for (const box of world.boxes) {
    if (overlapsFoot(x, z, box) && box.max.y <= ceiling + EPS) support = Math.max(support, box.max.y);
  }
  for (const ramp of world.ramps) {
    const surface = rampHeight(ramp, x, z);
    if (surface !== null && surface <= ceiling + EPS) support = Math.max(support, surface);
  }
  return support;
}
function sweepAxis(world: PlayerCollisionWorld, x: number, feet: number, z: number,
  height: number, delta: number, axis: 'x' | 'z') {
  let allowed = delta;
  const start = axis === 'x' ? x : z;
  const other = axis === 'x' ? z : x;
  const perpendicular = axis === 'x' ? 'z' : 'x';
  for (const box of world.boxes) {
    if (feet >= box.max.y - EPS || feet + height <= box.min.y + EPS ||
        other + R <= box.min[perpendicular] + EPS || other - R >= box.max[perpendicular] - EPS) continue;
    if (delta > 0 && start + R <= box.min[axis] + EPS) {
      allowed = Math.min(allowed, Math.max(0, box.min[axis] - R - start));
    } else if (delta < 0 && start - R >= box.max[axis] - EPS) {
      allowed = Math.max(allowed, Math.min(0, box.max[axis] + R - start));
    }
  }
  // Clip the segment against each ramp's side footprint and linear top plane.
  // At the entry plane the hull is touching, not penetrating the ramp volume.
  if (delta !== 0) for (const ramp of world.ramps) {
    if (feet + height <= ramp.baseHeight + EPS) continue;
    const otherMin = (axis === 'x' ? ramp.minZ : ramp.minX) - R;
    const otherMax = (axis === 'x' ? ramp.maxZ : ramp.maxX) + R;
    if (other <= otherMin + EPS || other >= otherMax - EPS) continue;
    const low = (axis === 'x' ? ramp.minX : ramp.minZ) - R;
    const high = (axis === 'x' ? ramp.maxX : ramp.maxZ) + R;
    const t1 = (low - start) / delta;
    const t2 = (high - start) / delta;
    const entry = Math.max(0, Math.min(t1, t2));
    const exit = Math.min(1, Math.max(t1, t2));
    if (entry >= exit - EPS) continue;
    const slopeLow = ramp.axis === 'x' ? ramp.minX : ramp.minZ;
    const slopeHigh = ramp.axis === 'x' ? ramp.maxX : ramp.maxZ;
    const slopeStart = (ramp.axis === 'x' ? x : z) + Math.sign(ramp.endHeight - ramp.startHeight) * R;
    const slope = (ramp.endHeight - ramp.startHeight) / (slopeHigh - slopeLow);
    const surfaceStart = ramp.startHeight + (slopeStart - slopeLow) * slope;
    const surfaceDelta = ramp.axis === axis ? delta * slope : 0;
    if (feet >= Math.max(ramp.startHeight, ramp.endHeight) - EPS) continue;
    let contact = entry;
    const atEntry = Math.max(Math.min(ramp.startHeight, ramp.endHeight),
      Math.min(Math.max(ramp.startHeight, ramp.endHeight), surfaceStart + surfaceDelta * entry));
    if (surfaceDelta > 0) contact = Math.max(entry, (feet - surfaceStart) / surfaceDelta);
    else if (atEntry <= feet + EPS) continue;
    if (contact >= exit - EPS) continue;
    const clipped = delta * Math.max(0, contact);
    allowed = delta > 0 ? Math.min(allowed, clipped) : Math.max(allowed, clipped);
  }
  const targetX = axis === 'x' ? x + allowed : x;
  const targetZ = axis === 'z' ? z + allowed : z;
  if (hullBlocked(world, targetX, feet, targetZ, height)) return 0;
  return allowed;
}

export function resolvePlayerMotion(world: PlayerCollisionWorld,
  position: { x: number; feet: number; z: number },
  displacement: { x: number; y: number; z: number }, height: number, wasGrounded: boolean) {
  let { x, feet, z } = position;
  let grounded = false;
  let hitCeiling = false;
  const nextFeet = feet + displacement.y;
  if (displacement.y <= 0) {
    const support = supportBelow(world, x, z, feet);
    if (nextFeet <= support + EPS) { feet = support; grounded = true; }
    else feet = nextFeet;
  } else {
    let ceiling = Infinity;
    for (const box of world.boxes) {
      if (overlapsFoot(x, z, box) && feet + height <= box.min.y + EPS) {
        ceiling = Math.min(ceiling, box.min.y);
      }
    }
    for (const ramp of world.ramps) {
      if (rampHeight(ramp, x, z) !== null && feet + height <= ramp.baseHeight + EPS) {
        ceiling = Math.min(ceiling, ramp.baseHeight);
      }
    }
    feet = Math.min(nextFeet, ceiling - height);
    hitCeiling = feet < nextFeet - EPS;
  }
  const canStep = wasGrounded && displacement.y <= 0;
  let blockedX = false;
  let blockedZ = false;
  for (const axis of ['x', 'z'] as const) {
    const delta = displacement[axis];
    let allowed = sweepAxis(world, x, feet, z, height, delta, axis);
    if (canStep && Math.abs(allowed - delta) > EPS) {
      const targetX = axis === 'x' ? x + delta : x;
      const targetZ = axis === 'z' ? z + delta : z;
      const step = supportBelow(world, targetX, targetZ, feet + PLAYER_HULL.stepHeight);
      if (step > feet + EPS && !hullBlocked(world, x, step, z, height) &&
          !hullBlocked(world, targetX, step, targetZ, height) &&
          Math.abs(sweepAxis(world, x, step, z, height, delta, axis) - delta) <= EPS) {
        feet = step;
        allowed = delta;
        grounded = true;
      }
    }
    if (axis === 'x') { x += allowed; blockedX = Math.abs(allowed - delta) > EPS; }
    else { z += allowed; blockedZ = Math.abs(allowed - delta) > EPS; }
  }
  // Stay on nearby descending surfaces; a real ledge releases the grounded flag.
  const support = supportBelow(world, x, z, feet);
  if (grounded && feet - support <= PLAYER_HULL.stepHeight + EPS) feet = support;
  grounded = grounded && Math.abs(feet - support) <= EPS;
  return { x, feet, z, grounded, hitCeiling, blockedX, blockedZ };
}
