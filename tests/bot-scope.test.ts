import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stepBotScope } from '../app/bot-weapon-actions.ts';
import { createWeaponSpecialActions } from '../app/weapon-special-actions.ts';

const ready = { weapon: 'sniper' as const, now: 0, active: true, alive: true, direct: true,
  blinded: false, sightSeconds: 0.25, distance: 8, speed: 0.08, reloadSeconds: 0,
  utilityActive: false, objectiveLocked: false, fireCooldown: 0 };

void test('scope intent holds for settling and waits the shared 300ms adjustment', () => {
  const actions = createWeaponSpecialActions();
  assert.deepEqual(stepBotScope(actions, { ...ready, speed: 1.3 }), { hold: true, canFire: false });
  assert.equal(actions.snapshot().zoom, 0);
  assert.deepEqual(stepBotScope(actions, ready), { hold: true, canFire: false });
  assert.equal(actions.snapshot().zoom, 1);
  assert.equal(stepBotScope(actions, { ...ready, now: 299 }).canFire, false);
  assert.equal(stepBotScope(actions, { ...ready, now: 300 }).canFire, true);
  assert.equal(actions.snapshot().zoom, 1);
});

void test('scope initiation respects direct sight, role, range, and weapon action locks', () => {
  for (const condition of [{ direct: false }, { active: false }, { alive: false },
    { blinded: true }, { sightSeconds: 0.249 }, { distance: 7.999 }, { distance: NaN },
    { reloadSeconds: 0.1 }, { reloadSeconds: NaN }, { utilityActive: true },
    { objectiveLocked: true }, { weapon: 'rifle' as const }]) {
    const actions = createWeaponSpecialActions();
    assert.equal(stepBotScope(actions, { ...ready, ...condition }).hold, false);
    assert.equal(actions.snapshot().zoom, 0);
  }
  for (const condition of [{ fireCooldown: 0.001 }, { fireCooldown: NaN }, { speed: 0.081 }, { speed: NaN }]) {
    const actions = createWeaponSpecialActions();
    const state = stepBotScope(actions, { ...ready, ...condition });
    assert.equal(state.hold, true);
    assert.equal(state.canFire, false);
    assert.equal(actions.snapshot().zoom, 0);
  }
});

void test('committed AWP shot unzooms, cannot be preempted, and restores at the shared 1450ms deadline', () => {
  const actions = createWeaponSpecialActions();
  stepBotScope(actions, ready);
  assert.equal(stepBotScope(actions, { ...ready, now: 300 }).canFire, true);
  actions.committedShot('sniper', 300);
  assert.deepEqual(actions.snapshot().resumeZoom, { stage: 1, at: 1750 });
  assert.equal(actions.snapshot().zoom, 0);
  for (const now of [301, 600, 1749]) {
    assert.equal(stepBotScope(actions, { ...ready, now }).canFire, false);
    assert.deepEqual(actions.snapshot().resumeZoom, { stage: 1, at: 1750 });
    assert.equal(actions.snapshot().zoom, 0);
  }
  assert.equal(stepBotScope(actions, { ...ready, now: 1750 }).canFire, true);
  assert.equal(actions.snapshot().zoom, 1);
  assert.equal(actions.snapshot().resumeZoom, null);
});

void test('lost contact releases the hold without discarding completed scope or inventing a target', () => {
  const actions = createWeaponSpecialActions();
  stepBotScope(actions, ready);
  assert.equal(stepBotScope(actions, { ...ready, now: 300, direct: false }).hold, false);
  assert.equal(actions.snapshot().zoom, 1);
  actions.committedShot('sniper', 300);
  stepBotScope(actions, { ...ready, now: 1750, direct: false });
  assert.equal(actions.snapshot().zoom, 1);
  assert.equal(stepBotScope(actions, { ...ready, now: 1800, distance: 4 }).hold, false);
});

void test('interruption and round reset remove pending scope and autoresume', () => {
  for (const committed of [false, true]) {
    const actions = createWeaponSpecialActions();
    stepBotScope(actions, ready);
    if (committed) actions.committedShot('sniper', 300);
    actions.cancelPending(400);
    actions.advance(3000, 'sniper');
    assert.equal(actions.snapshot().zoom, 0);
    assert.equal(actions.snapshot().resumeZoom, null);
    stepBotScope(actions, { ...ready, now: 3000 });
    actions.reset();
    assert.equal(actions.snapshot().zoom, 0);
    assert.equal(actions.snapshot().resumeZoom, null);
    assert.equal(actions.ready('sniper', 0), true);
  }
});

void test('page gives both squads a scope clock, aim hold, shared readiness and cancellation', () => {
  const page = readFileSync(process.env.CS16_BOT_SCOPE_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /special: createWeaponSpecialActions\(\)/);
  assert.match(page, /updateBotScope\(enemy, seesPlayer, distance, preparingUtility\)/);
  assert.match(page, /updateBotScope\(ally, seesTarget, distance, preparingUtility\)/);
  assert.equal((page.match(/botScope.canFire &&/g) ?? []).length, 2);
  assert.equal((page.match(/preparingUtility \|\| botScope.hold/g) ?? []).length, 2);
  assert.match(page, /scoped: bot.special.snapshot\(\).zoom !== 0/);
  assert.equal((page.match(/bot.special.committedShot\(bot.primaryWeapon, simulationNowMs, continuation\)/g) ?? []).length, 1);
  assert.equal((page.match(/(?:bot|enemy|victim).special.cancelPending\(simulationNowMs\)/g) ?? []).length, 4);
  assert.equal((page.match(/(?:enemy|ally).special.reset\(\)/g) ?? []).length, 2);
  const allyHold = page.indexOf('const botScope = updateBotScope(ally');
  const aim = page.lastIndexOf('stepBotAimYaw(ally, Math.atan2', allyHold);
  assert.ok(aim > page.indexOf('allies.forEach((ally) => {', page.indexOf('let activeAllyShooters')));
});
