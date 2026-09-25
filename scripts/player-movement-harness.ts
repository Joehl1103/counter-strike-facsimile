// Isolated benchmark adapter. Runtime has one global simulation clock.
import {
  createPlayerMovement,
  type PlayerPhysicsState,
  type PlayerPhysicsInput,
} from '../app/player-physics.ts';
import {
  createFixedMovementClock,
  MOVEMENT_STEP_SECONDS,
} from '../app/fixed-movement-clock.ts';
import type { PlayerCollisionWorld } from '../app/player-collision.ts';
export function createMovementHarness() {
  const movement = createPlayerMovement();
  const clock = createFixedMovementClock();
  let pendingJump = false,
    elapsedSeconds = 0;
  return {
    getTimeSeconds: () =>
      elapsedSeconds + clock.getAlpha() * MOVEMENT_STEP_SECONDS,
    getRenderPosition: (state: PlayerPhysicsState) =>
      movement.getRenderPosition(state, clock.getAlpha()),
    requestJump(eligible: boolean) {
      if (!eligible || pendingJump) return false;
      pendingJump = true;
      return true;
    },
    reset() {
      movement.reset();
      clock.reset();
      pendingJump = false;
      elapsedSeconds = 0;
    },
    advance(
      frameSeconds: number,
      state: PlayerPhysicsState,
      input: PlayerPhysicsInput | ((start: number) => PlayerPhysicsInput),
      world: PlayerCollisionWorld,
      onTick?: (event: { jumped: boolean; landed: boolean; impactDownwardSpeed: number }) => void,
    ) {
      return clock.advance(frameSeconds, () => {
        const sampled =
          typeof input === 'function' ? input(elapsedSeconds) : input;
        const event = movement.step(
          state,
          { ...sampled, jumpRequested: pendingJump || sampled.jumpRequested },
          world,
        );
        pendingJump = false;
        elapsedSeconds += MOVEMENT_STEP_SECONDS;
        onTick?.(event);
      });
    },
  };
}
