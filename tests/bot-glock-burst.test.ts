import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stepBotGlock, constrainBotShotDelay, type BotGlockBurst } from '../app/bot-weapon-actions.ts';
import { createWeaponSpecialActions } from '../app/weapon-special-actions.ts';

const ready = { weapon: 'glock18' as const, now: 0, active: true, alive: true, direct: true,
  targetId: 'ally:2', facing: true, blinded: false, distance: 10, sightSeconds: 0.25,
  reloadSeconds: 0, utilityActive: false, objectiveLocked: false, fireCooldown: 0, magazine: 20 };
function burst() {
  const actions = createWeaponSpecialActions(), state: BotGlockBurst = { targetId: null };
  stepBotGlock(actions, state, ready);
  state.targetId = ready.targetId;
  actions.committedShot('glock18', 300);
  return { actions, state };
}

void test('both bot modes wait the shared adjustment and retain burst once selected', () => {
  const actions = createWeaponSpecialActions(), state = { targetId: null };
  assert.equal(stepBotGlock(actions, state, ready).canOpen, false);
  assert.equal(actions.snapshot().burst, true);
  assert.equal(stepBotGlock(actions, state, { ...ready, now: 299 }).canOpen, false);
  assert.equal(stepBotGlock(actions, state, { ...ready, now: 300, distance: 25 }).canOpen, true);
  assert.equal(actions.snapshot().burst, true);
  assert.equal(constrainBotShotDelay('glock18', 0, true), 0.5);
  assert.equal(constrainBotShotDelay('glock18', 0.8, true), 0.8);
});

void test('mode entry requires a usable Glock, direct contact, and no competing action', () => {
  for (const condition of [{ active: false }, { alive: false }, { direct: false },
    { targetId: null }, { blinded: true }, { distance: 4.99 }, { distance: 18.01 },
    { distance: NaN }, { sightSeconds: 0.249 }, { sightSeconds: NaN },
    { reloadSeconds: 0.1 }, { utilityActive: true }, { objectiveLocked: true },
    { fireCooldown: 0.1 }, { magazine: 0 }, { weapon: 'usp' as const }]) {
    const actions = createWeaponSpecialActions();
    stepBotGlock(actions, { targetId: null }, { ...ready, ...condition });
    assert.equal(actions.snapshot().burst, false, JSON.stringify(condition));
  }
});

void test('a committed trigger schedules exactly two rounds despite opening cooldown', () => {
  const { actions, state } = burst();
  assert.deepEqual(actions.snapshot().burstDeadlines, [400, 500]);
  for (const [now, expected] of [[399, false], [400, true], [499, false], [500, true]] as const) {
    const next = stepBotGlock(actions, state, { ...ready, now, fireCooldown: 0.5 });
    assert.equal(next.canOpen, false);
    assert.equal(next.continuation, expected);
    if (next.continuation) actions.committedShot('glock18', now, true);
  }
  assert.deepEqual(actions.snapshot().burstDeadlines, []);
  assert.equal(state.targetId, null);
});

void test('one and two remaining cartridges cannot produce a phantom third shot', () => {
  for (const total of [1, 2]) {
    const { actions, state } = burst();
    let ammo = total - 1, shots = 1;
    for (const now of [400, 500, 600]) {
      const next = stepBotGlock(actions, state, { ...ready, now, magazine: ammo });
      if (next.continuation) { ammo--; shots++; actions.committedShot('glock18', now, true); }
    }
    assert.equal(ammo, 0);
    assert.equal(shots, total);
    assert.equal(state.targetId, null);
    assert.deepEqual(actions.snapshot().burstDeadlines, []);
  }
});

void test('invalid or changed direct targets cancel the remainder without later reacquisition fire', () => {
  for (const condition of [{ targetId: 'player' }, { targetId: null }, { active: false },
    { alive: false }, { direct: false }, { facing: false }, { blinded: true },
    { reloadSeconds: 0.01 }, { utilityActive: true }, { objectiveLocked: true },
    { magazine: 0 }, { weapon: 'rifle' as const }]) {
    const { actions, state } = burst();
    assert.deepEqual(stepBotGlock(actions, state, { ...ready, now: 350, ...condition }),
      { canOpen: false, continuation: false });
    assert.deepEqual(actions.snapshot().burstDeadlines, []);
    assert.equal(state.targetId, null);
    assert.equal(stepBotGlock(actions, state, { ...ready, now: 600 }).continuation, false);
    assert.equal(actions.snapshot().burst, true);
  }
});

void test('fixed-tick burst replay produces the same ammunition and shot times across frame batches', () => {
  function replay(batches: number[]) {
    const { actions, state } = burst();
    let now = 300, ammo = 19; const shots = [300];
    for (const ticks of batches) for (let tick = 0; tick < ticks; tick++) {
      now += 10;
      const next = stepBotGlock(actions, state, { ...ready, now, magazine: ammo, fireCooldown: 0.5 });
      if (next.continuation) { ammo--; shots.push(now); actions.committedShot('glock18', now, true); }
    }
    return { ammo, shots, pending: actions.snapshot().burstDeadlines };
  }
  const result = { ammo: 17, shots: [300, 400, 500], pending: [] };
  assert.deepEqual(replay([30]), result);
  assert.deepEqual(replay([4, 8, 1, 17]), result);
});

void test('page routes both squads through shared Glock decisions and geometric continuations', () => {
  const page = readFileSync(process.env.CS16_BOT_GLOCK_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /burst: bot.special.snapshot\(\).burst/);
  assert.match(page, /bot.special.committedShot\(bot.primaryWeapon, simulationNowMs, continuation\)/);
  assert.match(page, /stepBotGlock\(bot.special, bot.glockBurst/);
  for (const bot of ['enemy', 'ally']) {
    assert.match(page, new RegExp(`const glockAction = updateBotGlock\\(${bot}, contact\\?\\.id \\?\\? null,`));
    assert.match(page, new RegExp(`${bot}\\.ammo.magazine -= 1;\\s*commitBotShot\\(${bot}, targetPosition, ${bot}Speed, true\\)`));
    assert.match(page, new RegExp(`${bot}\\.alive && \\(${bot}\\.burstShotsRemaining > 0 \\|\\| ${bot}\\.special.snapshot\\(\\).burstDeadlines.length > 0\\)`));
  }
  assert.equal((page.match(/glockAction.canOpen &&/g) ?? []).length, 2);
  assert.equal((page.match(/glockBurst.targetId = null/g) ?? []).length, 6);
  assert.match(page, /direct, targetId, facing, distance/);
  assert.match(page, /objectiveLocked: \(bot === bombCarrier && bombState === 'planting'\) \|\|\s*\(bot === enemyDefuser && bombState === 'planted'\)/);
});
