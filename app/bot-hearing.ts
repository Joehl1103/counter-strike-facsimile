import type { Side } from './game-rules.ts';

export type SoundPosition = Readonly<{ x: number; y: number; z: number }>;
export type BotSoundKind = 'shot' | 'footstep' | 'objective';
export type BotSoundEvent = Readonly<{
  id: number;
  side: Side;
  kind: BotSoundKind;
  position: SoundPosition;
  emittedAtMs: number;
  expiresAtMs: number;
  radius: number;
}>;

const finitePosition = (position: SoundPosition) =>
  [position.x, position.y, position.z].every(Number.isFinite);

/** Project sound memory, independent of presentation audio and actor references. */
export function createBotHearing() {
  let events: BotSoundEvent[] = [];
  let nextId = 1;
  return {
    emit(input: {
      side: Side; kind: BotSoundKind; position: SoundPosition;
      nowMs: number; radius: number; memorySeconds: number;
    }): BotSoundEvent | null {
      const expiresAtMs = input.nowMs + input.memorySeconds * 1000;
      if (!finitePosition(input.position) ||
        ![input.nowMs, input.radius, input.memorySeconds, expiresAtMs].every(Number.isFinite) ||
        input.nowMs < 0 || input.radius <= 0 || input.memorySeconds <= 0)
        return null;
      const event = Object.freeze({
        id: nextId++, side: input.side, kind: input.kind,
        position: Object.freeze({ x: input.position.x, y: input.position.y, z: input.position.z }),
        emittedAtMs: input.nowMs, expiresAtMs, radius: input.radius,
      });
      events.push(event);
      return event;
    },
    prune(nowMs: number) {
      events = events.filter(event => event.expiresAtMs > nowMs);
    },
    clear() {
      events = [];
      // IDs stay monotonic so a stale listener cursor cannot match a new event.
    },
    hear(input: {
      side: Side; alive: boolean; position: SoundPosition;
      nowMs: number; afterId: number;
    }): BotSoundEvent | null {
      if (!input.alive || !finitePosition(input.position) || !Number.isFinite(input.nowMs))
        return null;
      let newest: BotSoundEvent | null = null;
      let nearestDistance = Infinity;
      for (const event of events) {
        // All sources become audible on the following fixed tick, avoiding
        // an advantage from being processed earlier in a squad's update loop.
        if (event.side === input.side || event.id <= input.afterId ||
          event.emittedAtMs >= input.nowMs || event.expiresAtMs <= input.nowMs)
          continue;
        const distance = Math.hypot(
          event.position.x - input.position.x,
          event.position.y - input.position.y,
          event.position.z - input.position.z,
        );
        if (distance >= event.radius) continue;
        if (!newest || event.emittedAtMs > newest.emittedAtMs ||
          (event.emittedAtMs === newest.emittedAtMs &&
            (distance < nearestDistance || (distance === nearestDistance && event.id > newest.id)))) {
          newest = event;
          nearestDistance = distance;
        }
      }
      return newest;
    },
  };
}

export function getSoundInvestigation(event: BotSoundEvent, listenerId: number, nowMs: number) {
  const uncertainty = Math.min(2.4, event.radius * 0.08);
  return {
    position: {
      x: event.position.x + Math.cos(listenerId * 2.3) * uncertainty,
      y: event.position.y,
      z: event.position.z + Math.sin(listenerId * 2.3) * uncertainty,
    },
    memorySeconds: Math.max(0, (event.expiresAtMs - nowMs) / 1000),
  };
}
