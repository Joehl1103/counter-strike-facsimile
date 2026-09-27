import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBotHearing, getSoundInvestigation } from '../app/bot-hearing.ts';

const sound = {
  side: 't' as const, kind: 'shot' as const, position: { x: 0, y: 0, z: 0 },
  nowMs: 100, radius: 18, memorySeconds: 1.15,
};
const listener = {
  side: 'ct' as const, alive: true, position: { x: 10, y: 0, z: 0 },
  nowMs: 110, afterId: 0,
};

void test('hearing applies the same opposing-side rule in CT and T configurations', () => {
  for (const side of ['ct', 't'] as const) {
    const hearing = createBotHearing();
    const opponent = side === 'ct' ? 't' : 'ct';
    const event = hearing.emit({ ...sound, side: opponent });
    hearing.emit({ ...sound, side, nowMs: 105 });
    assert.equal(hearing.hear({ ...listener, side }), event);
    assert.equal(hearing.hear({ ...listener, side, alive: false }), null);
  }
});

void test('sounds become audible on the next tick and stop at exact radius/expiry boundaries', () => {
  const hearing = createBotHearing();
  const event = hearing.emit(sound)!;
  for (const nowMs of [0, 99, 100, 1250, 1251, Infinity, NaN])
    assert.equal(hearing.hear({ ...listener, nowMs }), null);
  assert.equal(hearing.hear({ ...listener, nowMs: 101 }), event);
  assert.equal(hearing.hear({ ...listener, nowMs: 1249 }), event);
  assert.equal(hearing.hear({ ...listener, position: { x: 18 - 1e-6, y: 0, z: 0 } }), event);
  for (const position of [{ x: 18, y: 0, z: 0 }, { x: 0, y: 18, z: 0 }, { x: 0, y: 0, z: 18.1 }, { x: NaN, y: 0, z: 0 }])
    assert.equal(hearing.hear({ ...listener, position }), null);
});

void test('a later quiet footstep supersedes an earlier long-lived shot at its own location', () => {
  const hearing = createBotHearing();
  hearing.emit({ ...sound, memorySeconds: 5 });
  const step = hearing.emit({ ...sound, kind: 'footstep', nowMs: 105,
    position: { x: 12, y: 0, z: 1 }, radius: 9, memorySeconds: 0.7 });
  assert.equal(hearing.hear(listener), step);
  assert.equal(hearing.hear({ ...listener, afterId: step!.id }), null);
  // New out-of-range sounds do not mask an older audible one.
  hearing.emit({ ...sound, nowMs: 106, position: { x: 100, y: 0, z: 0 } });
  assert.equal(hearing.hear(listener), step);
});

void test('simultaneous sounds prefer the nearer one, then a stable latest ID', () => {
  const hearing = createBotHearing();
  hearing.emit(sound);
  const near = hearing.emit({ ...sound, position: { x: 9, y: 0, z: 0 } });
  assert.equal(hearing.hear(listener), near);
  const same = hearing.emit({ ...sound, position: { x: 11, y: 0, z: 0 } });
  assert.equal(hearing.hear(listener), same);
});

void test('emission snapshots survive source movement/death and investigation has bounded expiry/error', () => {
  const hearing = createBotHearing();
  const position = { x: 4, y: 1, z: 2 };
  const event = hearing.emit({ ...sound, position })!;
  position.x = 500;
  assert.deepEqual(event.position, { x: 4, y: 1, z: 2 });
  assert.ok(Object.isFrozen(event.position));
  assert.ok(Object.isFrozen(event));
  for (let botId = 0; botId < 5; botId++) {
    const memory = getSoundInvestigation(event, botId, 110);
    assert.equal(memory.memorySeconds, 1.14);
    assert.ok(Math.hypot(memory.position.x - 4, memory.position.z - 2) <= 1.44000001);
  }
  assert.equal(getSoundInvestigation(event, 0, 1250).memorySeconds, 0);
});

void test('invalid sounds cannot enter the event queue', () => {
  const hearing = createBotHearing();
  for (const field of ['nowMs', 'radius', 'memorySeconds'] as const)
    for (const value of [NaN, Infinity, -1])
      assert.equal(hearing.emit({ ...sound, [field]: value }), null);
  assert.equal(hearing.emit({ ...sound, radius: 0 }), null);
  assert.equal(hearing.emit({ ...sound, memorySeconds: 0 }), null);
  assert.equal(hearing.emit({ ...sound, position: { x: 0, y: Infinity, z: 0 } }), null);
  assert.equal(hearing.hear(listener), null);
});

void test('round clear and pruning remove old information without recycling IDs', () => {
  const hearing = createBotHearing();
  const old = hearing.emit(sound)!;
  hearing.prune(1250);
  assert.equal(hearing.hear(listener), null);
  hearing.emit(sound);
  hearing.clear();
  assert.equal(hearing.hear(listener), null);
  const next = hearing.emit({ ...sound, nowMs: 200 })!;
  assert.ok(next.id > old.id);
  assert.equal(hearing.hear({ ...listener, nowMs: 210, afterId: old.id }), next);
});

void test('page wires both squads to simulation hearing independently of player audio and visibility', () => {
  const source = readFileSync(process.env.CS16_HEARING_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /playerNoise|registerPlayerNoise/);
  for (const bot of ['enemy', 'ally']) {
    assert.match(source, new RegExp(`commitBotShot\\(${bot}, targetPosition, ${bot}Speed\\)`));
    assert.match(source, new RegExp(`emitBotHearingFootstep\\(${bot}\\)`));
    assert.match(source, new RegExp(`hearOpponent\\(${bot},`));
  }
  assert.match(source, /emitActorSound\(bot.side, 'shot'/);
  assert.match(source, /emitActorSound\(matchState.playerSide, 'shot'/);
  assert.match(source, /emitActorSound\(matchState.playerSide, 'footstep'/);
  const footstepStart = source.indexOf('const emitBotHearingFootstep =');
  const footsteps = source.slice(footstepStart, source.indexOf('\n    };', footstepStart));
  assert.doesNotMatch(footsteps, /playerAlive|player.position|audioContext|volume|nextAudible/);
  const memory = source.slice(source.indexOf('const hearOpponent ='), source.indexOf('const emitBotHearingFootstep ='));
  assert.match(memory, /getSoundInvestigation\(sound/);
  assert.doesNotMatch(memory, /targetPosition|player\.position|fireCooldown|combatTargetId|sightTime/);
  assert.match(source, /botHearing.clear\(\);\s*botHearingCursors.clear\(\);\s*nextBotHearingStep.clear\(\)/);
  assert.match(source, /const targetAlive = contact !== null/);
  assert.match(source, /const seesTarget =\s*Boolean\(target\)/);
});
