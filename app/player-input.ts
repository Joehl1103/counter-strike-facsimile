export interface MovementControls {
  strafe: number;
  forward: number;
  yaw: number;
  walking: boolean;
  crouching: boolean;
}
type InputEvent = { atSeconds: number; sequence: number } &
  ({ kind: 'controls'; controls: MovementControls } | { kind: 'jump' });
const idle = (): MovementControls => ({ strafe: 0, forward: 0, yaw: 0, walking: false, crouching: false });

export function createPlayerInputTimeline() {
  let events: InputEvent[] = [];
  let controls = idle();
  let sequence = 0;
  const enqueue = (event: InputEvent) => {
    if (!Number.isFinite(event.atSeconds) || event.atSeconds < 0) return false;
    events.push(event);
    events.sort((a, b) => a.atSeconds - b.atSeconds || a.sequence - b.sequence);
    return true;
  };
  return {
    current() { return { ...controls }; },
    controls(atSeconds: number, next: MovementControls) {
      if (![next.strafe, next.forward, next.yaw].every(Number.isFinite)) return false;
      return enqueue({ kind: 'controls', atSeconds, sequence: sequence++, controls: { ...next } });
    },
    jump(atSeconds: number) { return enqueue({ kind: 'jump', atSeconds, sequence: sequence++ }); },
    sample(tickStartSeconds: number) {
      let jumpRequested = false;
      while (events.length && events[0].atSeconds <= tickStartSeconds + 1e-12) {
        const event = events.shift()!;
        if (event.kind === 'controls') controls = event.controls;
        else jumpRequested = true;
      }
      return { ...controls, jumpRequested };
    },
    reset() { events = []; controls = idle(); sequence = 0; },
  };
}
