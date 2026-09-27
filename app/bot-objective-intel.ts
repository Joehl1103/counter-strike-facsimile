import type { Side } from './game-rules.ts';

export type ObjectivePosition = Readonly<{ x: number; y: number; z: number }>;
export type ObjectiveKind = 'dropped' | 'planted' | 'carrier';
export type ObjectiveSource = 'sight' | 'hearing' | 'own';
export const OBJECTIVE_SIGHT_RANGE = 28;
export const OBJECTIVE_DROP_HEARING_RADIUS = 10;
export const OBJECTIVE_BEEP_HEARING_RADIUS = 18;
export const OBJECTIVE_MEMORY_MS = { dropped: 15000, planted: 45000, carrier: 3000 } as const;
export type ObjectiveIntel = Readonly<{
  kind: ObjectiveKind;
  position: ObjectivePosition;
  observedAtMs: number;
  expiresAtMs: number;
  source: ObjectiveSource | 'squad';
  origin: ObjectiveSource;
  observerId: string;
}>;
export type ObjectiveListener = Readonly<{
  id: string; side: Side; alive: boolean; position: ObjectivePosition; hearsObjectives?: boolean;
}>;
export type ObjectiveObservation = Readonly<{
  observerId: string; kind: ObjectiveKind; position: ObjectivePosition;
  source: ObjectiveSource; observedAtMs: number;
}>;
const finitePosition = (p: ObjectivePosition) => [p.x, p.y, p.z].every(Number.isFinite);
const copyPosition = (p: ObjectivePosition) => Object.freeze({ x: p.x, y: p.y, z: p.z });
const sourceRank = { own: 0, sight: 1, hearing: 2 } as const;

/** One objective, observed in a batch before either squad makes decisions. */
export function createBotObjectiveIntel() {
  const memories = new Map<string, ObjectiveIntel>();
  let sounds: Array<{ kind: ObjectiveKind; position: ObjectivePosition; emittedAtMs: number; radius: number }> = [];
  let reports: ObjectiveObservation[] = [];
  return {
    clear() { memories.clear(); sounds = []; reports = []; },
    forget(id: string) { memories.delete(id); },
    get(id: string, nowMs: number): ObjectiveIntel | null {
      const memory = memories.get(id);
      if (!memory || !Number.isFinite(nowMs) || memory.observedAtMs > nowMs || memory.expiresAtMs <= nowMs) return null;
      return memory;
    },
    report(observation: ObjectiveObservation) {
      if (!finitePosition(observation.position) || !Number.isFinite(observation.observedAtMs)) return;
      reports.push(Object.freeze({ ...observation, position: copyPosition(observation.position) }));
    },
    emitSound(kind: ObjectiveKind, position: ObjectivePosition, nowMs: number, radius: number) {
      if (!finitePosition(position) || !Number.isFinite(nowMs) || !Number.isFinite(radius) || radius <= 0) return;
      sounds.push({ kind, position: copyPosition(position), emittedAtMs: nowMs, radius });
    },
    update(nowMs: number, listeners: readonly ObjectiveListener[], direct: readonly ObjectiveObservation[]) {
      if (!Number.isFinite(nowMs)) return;
      const living = listeners.filter(listener => listener.alive && finitePosition(listener.position));
      const byId = new Map(living.map(listener => [listener.id, listener]));
      for (const [id, memory] of memories) {
        if (!byId.has(id) || memory.expiresAtMs <= nowMs) memories.delete(id);
      }
      const observations = [...direct, ...reports.filter(report => report.observedAtMs < nowMs)];
      reports = reports.filter(report => report.observedAtMs >= nowMs);
      for (const sound of sounds) {
        if (sound.emittedAtMs >= nowMs) continue;
        for (const listener of living) {
          if (listener.hearsObjectives === false) continue;
          if (Math.hypot(listener.position.x - sound.position.x,
            listener.position.y - sound.position.y, listener.position.z - sound.position.z) >= sound.radius) continue;
          observations.push({ observerId: listener.id, kind: sound.kind, position: sound.position,
            source: 'hearing', observedAtMs: sound.emittedAtMs });
        }
      }
      // A sound is sampled once on the next tick, never replayed for a late arrival.
      sounds = sounds.filter(sound => sound.emittedAtMs >= nowMs);
      const ordered = observations.filter(observation => byId.has(observation.observerId) &&
        finitePosition(observation.position) && Number.isFinite(observation.observedAtMs) &&
        observation.observedAtMs <= nowMs && observation.observedAtMs + OBJECTIVE_MEMORY_MS[observation.kind] > nowMs)
        .sort((a, b) => b.observedAtMs - a.observedAtMs || sourceRank[a.source] - sourceRank[b.source] || a.observerId.localeCompare(b.observerId));
      for (const side of ['ct', 't'] as const) {
        const report = ordered.find(observation => byId.get(observation.observerId)?.side === side);
        if (!report) continue;
        const position = copyPosition(report.position);
        for (const listener of living) {
          if (listener.side !== side) continue;
          const previous = memories.get(listener.id);
          if (previous && previous.observedAtMs > report.observedAtMs) continue;
          memories.set(listener.id, Object.freeze({ kind: report.kind, position,
            observedAtMs: report.observedAtMs, expiresAtMs: report.observedAtMs + OBJECTIVE_MEMORY_MS[report.kind],
            source: listener.id === report.observerId ? report.source : 'squad',
            origin: report.source, observerId: report.observerId }));
        }
      }
    },
  };
}

/** Selection has no access to the world's bomb or carrier. */
export function selectObjectiveResponder<T extends {
  id: string; alive: boolean; position: ObjectivePosition; intel: ObjectiveIntel | null; actionSeconds: number;
}>(candidates: readonly T[], kind: 'dropped' | 'planted', nowMs: number, speed: number): T | null {
  if (!Number.isFinite(speed) || speed <= 0) return null;
  const cost = (candidate: T) => Math.hypot(candidate.position.x - candidate.intel!.position.x,
    candidate.position.z - candidate.intel!.position.z) / speed + candidate.actionSeconds;
  return candidates.filter(candidate => candidate.alive && finitePosition(candidate.position) &&
    Number.isFinite(candidate.actionSeconds) && candidate.actionSeconds >= 0 && candidate.intel?.kind === kind &&
    candidate.intel.observedAtMs <= nowMs && candidate.intel.expiresAtMs > nowMs)
    .sort((a, b) => cost(a) - cost(b) || a.id.localeCompare(b.id))[0] ?? null;
}
