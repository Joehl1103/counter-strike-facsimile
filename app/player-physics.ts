import { stepCharacterMotion } from './character-motion.ts';
import { hullGeometryBlocked, PLAYER_HULL, type PlayerCollisionWorld } from './player-collision.ts';
import { MOVEMENT_STEP_SECONDS } from './fixed-movement-clock.ts';
import {
  advanceLandingRecovery, limitBunnyHopVelocity,
  PLAYER_LANDING_RECOVERY_SECONDS, stepHorizontalVelocity,
  type HorizontalVelocity,
} from './game-rules.ts';

export interface PlayerPhysicsState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; z: number };
  verticalVelocity: number;
  grounded: boolean;
  crouched: boolean;
  landingRecoverySeconds: number;
}

export interface PlayerPhysicsInput {
  wishDirection: HorizontalVelocity;
  maxSpeed: number;
  jumpMaxSpeed: number;
  crouching: boolean;
  jumpRequested?: boolean;
}

// Mutates only the supplied simulation state. No Three, DOM, audio, or rendering.
// The world adapter supplies solid volumes and walkable ramp surfaces.
export function stepPlayerPhysics(
  state: PlayerPhysicsState,
  input: PlayerPhysicsInput,
  jumpRequested: boolean,
  world: PlayerCollisionWorld,
) {
  const dt = MOVEMENT_STEP_SECONDS;
  const feet = state.position.y - PLAYER_HULL.eyeHeight;
  state.crouched = input.crouching || hullGeometryBlocked(world, state.position.x, feet,
    state.position.z, PLAYER_HULL.standingHeight);
  const height = state.crouched ? PLAYER_HULL.crouchedHeight : PLAYER_HULL.standingHeight;
  const jumped = jumpRequested && state.grounded;
  if (jumped) {
    const cropped = limitBunnyHopVelocity(state.velocity, input.jumpMaxSpeed);
    state.velocity.x = cropped.x;
    state.velocity.z = cropped.z;
    state.verticalVelocity = 5.15;
    state.grounded = false;
  }
  const movement = stepHorizontalVelocity({
    velocity: state.velocity, wishDirection: input.wishDirection,
    maxSpeed: input.maxSpeed, dtSeconds: dt, grounded: state.grounded,
  });
  state.velocity.x = movement.x;
  state.velocity.z = movement.z;
  const wasGrounded = state.grounded;
  const resolved = stepCharacterMotion({ x: state.position.x, feet, z: state.position.z,
    velocity: state.velocity, verticalVelocity: state.verticalVelocity, grounded: wasGrounded },
  height, world, dt);
  state.position.x = resolved.x;
  state.position.y = resolved.feet + PLAYER_HULL.eyeHeight;
  state.position.z = resolved.z;
  state.grounded = resolved.grounded;
  state.verticalVelocity = resolved.verticalVelocity;
  state.velocity.x = resolved.velocity.x;
  state.velocity.z = resolved.velocity.z;
  const landed = resolved.landed;
  state.landingRecoverySeconds = advanceLandingRecovery(
    state.landingRecoverySeconds, dt, wasGrounded, state.grounded,
    PLAYER_LANDING_RECOVERY_SECONDS,
  );
  return { jumped, landed, impactDownwardSpeed: resolved.impactDownwardSpeed };
}

export function createPlayerMovement() {
  let previousPosition: PlayerPhysicsState['position'] | null = null;
  return {
    getRenderPosition(state: PlayerPhysicsState, renderAlpha: number) {
      const previous = previousPosition ?? state.position;
      const alpha = Math.max(0, Math.min(1, renderAlpha));
      return {
        x: previous.x + (state.position.x - previous.x) * alpha,
        y: previous.y + (state.position.y - previous.y) * alpha,
        z: previous.z + (state.position.z - previous.z) * alpha,
      };
    },
    step(state: PlayerPhysicsState, input: PlayerPhysicsInput, world: PlayerCollisionWorld) {
      previousPosition = { ...state.position };
      return stepPlayerPhysics(state, input, Boolean(input.jumpRequested), world);
    },
    reset() { previousPosition = null; },
  };
}
