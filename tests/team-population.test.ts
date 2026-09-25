import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DUST2_MAP } from '../app/dust2-map.ts';
import { getRoundPlan, getBotRoundFirearm, ENEMY_COMBAT_PROFILES, FIREARMS } from '../app/game-rules.ts';

void test('every match phase assigns the bomb to an existing attacker', () => {
  for (const side of ['ct', 't'] as const) for (let round = 0; round < 40; round++) {
    const plan = getRoundPlan(round, side);
    const count = side === 'ct' ? 5 : 4;
    assert.deepEqual(plan.assignments.map(a => a.botId), [0, 1, 2, 3, 4]);
    const present = plan.assignments.slice(0, count);
    if (plan.carrier.kind === 'bot') {
      assert.ok(plan.carrier.botId < count);
      assert.equal(present.filter(a => a.role === 'carrier').length, 1);
      assert.equal(present[plan.carrier.botId].role, 'carrier');
    } else {
      assert.equal(side, 't');
      assert.equal(present.filter(a => a.role === 'carrier').length, 0);
    }
    for (let id = 0; id < 5; id++) {
      assert.ok(ENEMY_COMBAT_PROFILES[id]);
      assert.ok(FIREARMS[getBotRoundFirearm({matchRoundIndex: round, rosterRoundIndex: round, botId: id, lossStreak: 0, side})]);
    }
  }
});

void test('page creates five opponents and four teammates with no human spawn overlap', () => {
  const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /T_ATTACKER_SPAWNS[^=]*= DUST2_MAP.teamSpawns.t.map/);
  assert.match(source, /T_ATTACKER_SPAWNS.forEach\(\(\[x, z\], index\) =>\s*createEnemy\(index, x, z, 'enemy'\)/);
  assert.match(source, /CT_DEFENDER_ASSIGNMENTS.slice\(1\).forEach\(\{?\(?/);
  const reset = source.slice(source.indexOf('allies.forEach((ally, index) => {\n        const assignment'));
  assert.match(reset, /CT_DEFENDER_ASSIGNMENTS\[index \+ 1\]/);
  assert.match(reset, /T_ATTACKER_SPAWNS\[index \+ 1\]/);
  assert.match(source, /enemies: 5,\s*allies: 4,\s*friendlyAlive: 5/);
  assert.match(source, /allyRoster: BOT_NAMES.ct.slice\(0, 4\).map/);
  for (const side of ['ct', 't'] as const) {
    const slots = DUST2_MAP.teamSpawns[side];
    assert.equal(slots.length, 5);
    assert.equal(new Set(slots.map(p => p.join(','))).size, 5);
    assert.deepEqual(slots[0], DUST2_MAP.spawns[side]);
    assert.equal(slots.slice(1).length, 4);
  }
});
