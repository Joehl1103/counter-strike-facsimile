export const SIMULATION_STEP_SECONDS = 0.01;

// Integer tick identity avoids cumulative timer drift. Pause clears only debt:
// dead-player rounds and freeze time continue advancing the global clock.
export function createSimulationClock() {
  let tick = 0;
  let remainder = 0;
  let generation = 0;
  return {
    getTimeSeconds: () => tick / 100,
    getAlpha: () => remainder / SIMULATION_STEP_SECONDS,
    resetDebt() {
      remainder = 0;
      generation++;
    },
    advance(
      frameSeconds: number,
      step: (dt: number, start: number, end: number) => boolean | void,
    ) {
      remainder += Number.isFinite(frameSeconds)
        ? Math.max(0, Math.min(0.05, frameSeconds))
        : 0;
      const count = Math.min(
        5,
        Math.floor((remainder + 1e-12) / SIMULATION_STEP_SECONDS),
      );
      const frameGeneration = generation;
      let completed = 0;
      for (let i = 0; i < count; i++) {
        remainder = Math.max(0, remainder - SIMULATION_STEP_SECONDS);
        const start = tick / 100;
        tick++;
        completed++;
        if (
          step(SIMULATION_STEP_SECONDS, start, tick / 100) === false ||
          generation !== frameGeneration
        ) {
          remainder = 0;
          break;
        }
      }
      return completed;
    },
  };
}

export type GameplayAction = 'fire' | 'secondary' | 'reload';
export function createGameplayActions() {
  const events: { at: number; action: GameplayAction; order: number }[] = [];
  let order = 0;
  return {
    enqueue(action: GameplayAction, at: number) {
      if (!Number.isFinite(at) || at < 0) return;
      events.push({ action, at, order: order++ });
      events.sort((a, b) => a.at - b.at || a.order - b.order);
    },
    drain(tickEndSeconds: number, commit: (action: GameplayAction) => void) {
      while (events.length && events[0].at <= tickEndSeconds + 1e-12)
        commit(events.shift()!.action);
    },
    clear() {
      events.length = 0;
    },
  };
}
