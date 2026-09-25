import { PLAYER_MOVEMENT_MAX_STEP_SECONDS, didPlayerLand } from './game-rules.ts';
import { resolvePlayerMotion, type PlayerCollisionWorld } from './player-collision.ts';

export const CHARACTER_GRAVITY = 14.5;
export interface CharacterMotionState {
  x: number;
  feet: number;
  z: number;
  velocity: { x: number; z: number };
  verticalVelocity: number;
  grounded: boolean;
}

/** Shared body motion after the actor has chosen its horizontal velocity. Pure. */
export function stepCharacterMotion(
  input: CharacterMotionState, height: number, world: PlayerCollisionWorld, dtSeconds: number,
) {
  const finite = (value: number) => Number.isFinite(value) ? value : 0;
  const dt = Math.min(PLAYER_MOVEMENT_MAX_STEP_SECONDS, Math.max(0, finite(dtSeconds)));
  const velocity = { x: finite(input.velocity.x), z: finite(input.velocity.z) };
  const position = { x: finite(input.x), feet: finite(input.feet), z: finite(input.z) };
  const verticalVelocity = finite(input.verticalVelocity) - CHARACTER_GRAVITY * dt;
  if (dt === 0) return { ...position, velocity, verticalVelocity,
    grounded: input.grounded, landed: false, hitCeiling: false, impactDownwardSpeed: 0 };
  const resolved = resolvePlayerMotion(world, position,
    { x: velocity.x * dt, y: verticalVelocity * dt, z: velocity.z * dt }, height, input.grounded);
  const landed = didPlayerLand(input.grounded, resolved.grounded);
  return {
    x: resolved.x, feet: resolved.feet, z: resolved.z,
    velocity: { x: resolved.blockedX ? 0 : velocity.x, z: resolved.blockedZ ? 0 : velocity.z },
    verticalVelocity: resolved.grounded || resolved.hitCeiling ? 0 : verticalVelocity,
    grounded: resolved.grounded, landed,
    hitCeiling: resolved.hitCeiling,
    // The collision resolver clears vertical velocity on support. Preserve the
    // post-gravity value only for an actual airborne-to-ground transition.
    impactDownwardSpeed: landed ? Math.max(0, -verticalVelocity) : 0,
  };
}
