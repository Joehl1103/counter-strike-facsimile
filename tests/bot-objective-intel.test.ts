import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBotObjectiveIntel, selectObjectiveResponder, OBJECTIVE_MEMORY_MS,
  type ObjectiveListener, type ObjectiveObservation } from '../app/bot-objective-intel.ts';

const origin = { x: 0, y: 0, z: 0 };
const listeners: ObjectiveListener[] = [
  { id: 'ct:0', side: 'ct', alive: true, position: origin },
  { id: 'ct:1', side: 'ct', alive: true, position: { x: 50, y: 0, z: 0 } },
  { id: 't:0', side: 't', alive: true, position: { x: 50, y: 0, z: 0 } },
];
const seen = (overrides: Partial<ObjectiveObservation> = {}): ObjectiveObservation => ({
  observerId: 'ct:0', kind: 'dropped', position: { x: 5, y: 0, z: 0 }, source: 'sight', observedAtMs: 100, ...overrides,
});
const candidates = (memory: ReturnType<typeof createBotObjectiveIntel>, nowMs: number) => listeners.map(listener => ({
  ...listener, intel: memory.get(listener.id, nowMs), actionSeconds: 0,
}));

void test('unseen bomb grants no role; observed positions unlock only the observing side', () => {
  const memory = createBotObjectiveIntel();
  memory.update(100, listeners, []);
  assert.equal(selectObjectiveResponder(candidates(memory, 100), 'dropped', 100, 1), null);
  memory.update(100, listeners, [seen()]);
  assert.equal(selectObjectiveResponder(candidates(memory, 100), 'dropped', 100, 1)?.id, 'ct:0');
  assert.equal(memory.get('ct:1', 100)?.source, 'squad');
  assert.equal(memory.get('t:0', 100), null);
});

void test('carrier snapshots freeze scalar coordinates and expire without relay refresh', () => {
  const memory = createBotObjectiveIntel();
  const position = { x: 5, y: 2, z: 3 };
  memory.update(100, listeners, [seen({ kind: 'carrier', position })]);
  const report = memory.get('ct:1', 100)!;
  position.x = 900;
  memory.update(2000, listeners, []);
  assert.deepEqual(memory.get('ct:1', 2000)?.position, { x: 5, y: 2, z: 3 });
  assert.equal(report.observedAtMs, 100);
  assert.equal(report.expiresAtMs, 3100);
  assert.ok(Object.isFrozen(report) && Object.isFrozen(report.position));
  assert.equal(memory.get('ct:1', 3100), null);
  memory.update(3200, listeners, []);
  assert.equal(memory.get('ct:0', 3200), null);
});

void test('drop and planted sounds sample all living listeners next tick and propagate same-side reports', () => {
  for (const [kind, radius] of [['dropped', 10], ['planted', 18]] as const) {
    const memory = createBotObjectiveIntel();
    const soundPosition = { x: radius - 0.01, y: 0, z: 0 };
    memory.emitSound(kind, soundPosition, 100, radius);
    soundPosition.x = 1000;
    memory.update(100, listeners, []);
    assert.equal(memory.get('ct:0', 100), null);
    memory.update(110, listeners, []);
    assert.equal(memory.get('ct:0', 110)?.source, 'hearing');
    assert.equal(memory.get('ct:1', 110)?.source, 'squad');
    assert.equal(memory.get('ct:1', 110)?.origin, 'hearing');
    assert.equal(memory.get('ct:1', 110)?.expiresAtMs, 100 + OBJECTIVE_MEMORY_MS[kind]);
    assert.equal(memory.get('t:0', 110), null);
    memory.update(120, listeners.map(listener => ({ ...listener, position: origin })), []);
    assert.equal(memory.get('t:0', 120), null, 'a late arrival cannot replay the sound');
  }
});

void test('sound boundary, dead ears and human nonautomatic hearing cannot create a callout', () => {
  for (const listener of [
    { ...listeners[0], position: { x: 10, y: 0, z: 0 } },
    { ...listeners[0], alive: false },
    { ...listeners[0], hearsObjectives: false },
  ]) {
    const memory = createBotObjectiveIntel();
    memory.emitSound('dropped', origin, 100, 10);
    memory.update(110, [listener], []);
    assert.equal(memory.get(listener.id, 110), null);
  }
});

void test('batch results and tie breaks are invariant to squad/observer iteration order', () => {
  const a = createBotObjectiveIntel(), b = createBotObjectiveIntel();
  const observations = [seen({ observerId: 'ct:1', position: { x: 99, y: 0, z: 0 } }), seen()];
  a.update(100, listeners, observations);
  b.update(100, [...listeners].reverse(), [...observations].reverse());
  for (const listener of listeners) assert.deepEqual(a.get(listener.id, 100), b.get(listener.id, 100));
  assert.equal(a.get('ct:1', 100)?.observerId, 'ct:0');
});

void test('explicit own plant reports are copied, delayed, side scoped and reject a dead reporter', () => {
  for (const alive of [true, false]) {
    const memory = createBotObjectiveIntel();
    const position = { x: 25, y: 0, z: 15 };
    memory.report(seen({ kind: 'planted', source: 'own', observerId: 't:0', position }));
    position.x = 999;
    const squad = [...listeners, { id: 't:1', side: 't' as const, alive: true, position: origin }]
      .map(listener => listener.id === 't:0' ? { ...listener, alive } : listener);
    memory.update(100, squad, []);
    assert.equal(memory.get('t:1', 100), null);
    memory.update(110, squad, []);
    assert.equal(memory.get('t:1', 110)?.position.x ?? null, alive ? 25 : null);
    assert.equal(memory.get('ct:0', 110), null);
  }
});

void test('pickup/reset clears queued observations and sounds; death clears personal memory', () => {
  const memory = createBotObjectiveIntel();
  memory.update(100, listeners, [seen()]);
  memory.forget('ct:0');
  assert.equal(memory.get('ct:0', 100), null);
  assert.notEqual(memory.get('ct:1', 100), null, 'survivor retains an already delivered report');
  memory.update(110, listeners.map(listener => ({ ...listener, alive: false })), []);
  assert.equal(memory.get('ct:1', 110), null);
  memory.report(seen({ kind: 'planted' }));
  memory.emitSound('dropped', origin, 100, 10);
  memory.clear();
  memory.update(120, listeners, []);
  assert.equal(memory.get('ct:0', 120), null);
});

void test('fresh observations supersede old kind, stale/future/invalid reports cannot restore it', () => {
  const memory = createBotObjectiveIntel();
  memory.update(100, listeners, [seen()]);
  memory.update(200, listeners, [seen({ kind: 'planted', observedAtMs: 200 })]);
  memory.update(250, listeners, [seen(), seen({ observedAtMs: 300 }), seen({ position: { ...origin, x: NaN } })]);
  assert.equal(memory.get('ct:0', 250)?.kind, 'planted');
  assert.equal(selectObjectiveResponder(candidates(memory, 250), 'dropped', 250, 1), null);
  assert.equal(selectObjectiveResponder(candidates(memory, 45200), 'planted', 45200, 3.4), null);
});

void test('defuser eligibility and ETA use remembered position plus kit duration, never a hidden bomb', () => {
  const memory = createBotObjectiveIntel();
  memory.update(100, listeners, [seen({ kind: 'planted', position: { x: 25, y: 0, z: 0 } })]);
  const actors = candidates(memory, 100).map(actor => ({ ...actor, actionSeconds: actor.id === 'ct:1' ? 5 : 10 }));
  assert.equal(selectObjectiveResponder(actors, 'planted', 100, 3.4)?.id, 'ct:1');
  assert.equal(selectObjectiveResponder(actors.map(actor => ({ ...actor, alive: false })), 'planted', 100, 3.4), null);
  assert.equal(selectObjectiveResponder(actors, 'planted', 100, 0), null);
});

void test('page routes both squads through observed snapshots and keeps true positions in physical gates', () => {
  const page = readFileSync(process.env.CS16_OBJECTIVE_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  const selection = page.slice(page.indexOf('        const objectiveCandidates ='), page.indexOf('        let activeShooters ='));
  assert.match(selection, /selectObjectiveResponder/);
  assert.doesNotMatch(selection, /bomb\.position|selectedBombsite/);
  const loops = page.slice(page.indexOf('        const bombRetriever ='), page.indexOf('          if (!ally.locomotionCommanded)'));
  for (const actor of ['enemy', 'ally']) assert.match(loops, new RegExp(`moveBotObjective\\(${actor},`));
  assert.doesNotMatch(loops, /bomb\.position|player\.position\.[xz] \+ Math\.(cos|sin)\(escortAngle\)/);
  assert.match(loops, /allyObjectiveIntel\.position\.x \+ Math\.cos\(escortAngle\)/);
  assert.doesNotMatch(page, /CT_RETAKE_ROUTES/);
  const observation = page.slice(page.indexOf('    const updateObjectiveObservations ='), page.indexOf('    const canBotPickupDroppedBomb ='));
  assert.match(observation, /canBotObservePosition/);
  assert.match(observation, /objectiveIntel\.update/);
  const shared = page.slice(page.indexOf('    const moveBotObjective ='), page.indexOf('    const runSimulationTick ='));
  assert.match(shared, /intel\.position\.x, intel\.position\.z/);
  assert.match(shared, /canBotPickupDroppedBomb\(bot\)/);
  assert.match(shared, /canBotDefusePlantedBomb\(bot\)/);
  assert.doesNotMatch(shared, /bomb\.position|selectedBombsite/);
  assert.match(page, /const canBotPickupDroppedBomb =[\s\S]*?bombState === 'dropped' &&[\s\S]*?< 1\.15/);
  assert.match(page, /const canBotDefusePlantedBomb =[\s\S]*?bombState === 'planted' &&[\s\S]*?<= 1\.25/);
  assert.match(page, /objectiveIntel\.report\(\{ observerId: planterId, kind: 'planted'/);
});
