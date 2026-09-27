export const MOVEMENT_STEP_SECONDS = 0.01;
export const MAX_MOVEMENT_FRAME_SECONDS = 0.05;

// Player physics only. Other simulation clocks migrate in subsequent slices.
export function createFixedMovementClock() {
  let remainderSeconds = 0;
  return {
    getAlpha() { return remainderSeconds / MOVEMENT_STEP_SECONDS; },
    reset() {
      remainderSeconds = 0;
    },
    advance(frameSeconds: number, step: (dtSeconds: number) => void) {
      const elapsed = Number.isFinite(frameSeconds)
        ? Math.max(0, Math.min(MAX_MOVEMENT_FRAME_SECONDS, frameSeconds))
        : 0;
      remainderSeconds += elapsed;
      // Epsilon compensates only for accumulation rounding at a tick boundary.
      const steps = Math.min(5, Math.floor((remainderSeconds + 1e-12) / MOVEMENT_STEP_SECONDS));
      remainderSeconds = Math.max(0, remainderSeconds - steps * MOVEMENT_STEP_SECONDS);
      for (let index = 0; index < steps; index++) step(MOVEMENT_STEP_SECONDS);
      return steps;
    },
  };
}
