import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { canCommitWeaponAction, createWeaponSpecialActions, advanceShotgunReload, getKnifeAttack, SPECIAL_TIMINGS, getSilencerDamageMultiplier } from '../app/weapon-special-actions.ts';

void test('Glock mode lock and exactly two scheduled follow-ups with cancellation', () => {
  const actions = createWeaponSpecialActions();
  assert.equal(actions.secondary('glock18', 0), true);
  assert.equal(actions.ready('glock18', 299), false);
  assert.equal(actions.secondary('glock18', 299), false);
  assert.equal(actions.ready('glock18', 300), true);
  actions.committedShot('glock18', 300);
  assert.equal(actions.takeBurstShot(399, 'glock18', 19), false);
  assert.equal(actions.takeBurstShot(400, 'glock18', 19), true);
  assert.equal(actions.takeBurstShot(499, 'glock18', 18), false);
  assert.equal(actions.takeBurstShot(500, 'glock18', 18), true);
  assert.equal(actions.takeBurstShot(600, 'glock18', 17), false);
  actions.committedShot('glock18', 800);
  assert.equal(actions.takeBurstShot(900, 'glock18', 0), false);
  assert.deepEqual(actions.snapshot().burstDeadlines, []);
  actions.committedShot('glock18', 1300);
  actions.cancelPending(1400);
  assert.equal(actions.takeBurstShot(1600, 'glock18', 10), false);
  actions.reset();
  assert.equal(actions.snapshot().burst, false);
});

void test('silencer adjustment lock is exclusive with sourced damage branches', () => {
  for (const [weapon, duration, base, expected] of [['usp', 3000, 34, 30], ['carbine', 2000, 32, 33]] as const) {
    const actions = createWeaponSpecialActions();
    assert.ok(actions.secondary(weapon, 0));
    assert.equal(actions.isSilenced(weapon), true);
    assert.equal(actions.ready(weapon, duration - 1), false);
    assert.equal(actions.secondary(weapon, duration - 1), false);
    assert.equal(base * getSilencerDamageMultiplier(weapon, true), expected);
    assert.ok(actions.secondary(weapon, duration));
    assert.equal(actions.isSilenced(weapon), false);
  }
});

void test('AWP cycles both zoom stages and restores the saved stage after a shot', () => {
  const actions = createWeaponSpecialActions();
  actions.secondary('sniper', 0);
  assert.equal(actions.snapshot().zoom, 1);
  actions.secondary('sniper', 300);
  assert.equal(actions.snapshot().zoom, 2);
  actions.committedShot('sniper', 600);
  assert.equal(actions.snapshot().zoom, 0);
  assert.equal(actions.advance(2049, 'sniper'), false);
  assert.equal(actions.advance(2050, 'sniper'), true);
  assert.equal(actions.snapshot().zoom, 2);
  actions.secondary('sniper', 2100);
  assert.equal(actions.snapshot().zoom, 0);
  actions.secondary('sniper', 2400);
  actions.committedShot('sniper', 2700);
  actions.cancelPending(2800);
  actions.advance(5000, 'sniper');
  assert.equal(actions.snapshot().zoom, 0);
});

void test('M3 reload transfers shells only at insert deadlines and finishes with pump', () => {
  let result = advanceShotgunReload('start', { magazine: 6, reserve: 2 }, 549, 550);
  assert.deepEqual(result.ammo, { magazine: 6, reserve: 2 });
  result = advanceShotgunReload(result.phase, result.ammo, 550, result.deadline);
  assert.equal(result.phase, 'insert');
  assert.equal(result.deadline, 1000);
  assert.equal(result.inserted, false);
  result = advanceShotgunReload(result.phase, result.ammo, 1000, result.deadline);
  assert.deepEqual(result.ammo, { magazine: 7, reserve: 1 });
  result = advanceShotgunReload(result.phase, result.ammo, 1450, result.deadline);
  assert.deepEqual(result.ammo, { magazine: 8, reserve: 0 });
  assert.equal(result.phase, 'pump');
  assert.equal(result.deadline, 2950);
  assert.equal(advanceShotgunReload(result.phase, result.ammo, 2949, result.deadline).complete, false);
  assert.equal(advanceShotgunReload(result.phase, result.ammo, 2950, result.deadline).complete, true);
  assert.equal(SPECIAL_TIMINGS.m3Cycle, 875);
});

void test('knife swing and stab have distinct range, damage and hit/miss recovery', () => {
  assert.deepEqual(getKnifeAttack(false, false), { range: 1.2, damage: 15, cooldownMs: 350 });
  assert.deepEqual(getKnifeAttack(true, true), { range: 0.8, damage: 65, cooldownMs: 1100 });
  assert.equal(getKnifeAttack(true, true, true).damage, 195);
});

void test('interrupted silencer adjustments revert while completed attachments survive selection', () => {
  for (const weapon of ['usp', 'carbine'] as const) {
    const actions = createWeaponSpecialActions();
    actions.secondary(weapon, 0);
    actions.cancelPending(100);
    assert.equal(actions.isSilenced(weapon), false);
    assert.equal(actions.ready(weapon, 100), true);
    actions.secondary(weapon, 100);
    actions.cancelPending(3200);
    assert.equal(actions.isSilenced(weapon), true);
    actions.secondary(weapon, 3300);
    actions.cancelPending(3400);
    assert.equal(actions.isSilenced(weapon), true);
  }
});

void test('page cancels pending actions on reload, selection, drop, death and input release', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  for (const name of ['commitReload', 'selectWeapon', 'dropPlayerFirearm', 'beginPlayerDeathCamera', 'releaseTransientInput']) {
    const start = page.indexOf(`    const ${name} =`);
    const end = page.indexOf('\n    const ', start + 10);
    const body = page.slice(start, end);
    assert.ok(body.includes('weaponSpecial.cancelPending(simulationNowMs)'), name);
    assert.ok(body.includes('syncSilencerVisuals()'), name);
  }
});

void test('expired cooldown never authorizes paused, dead, buying or frozen fire', () => {
  const ready = { active:true, alive:true, controlsActive:true, buyOpen:false,
    now:10000, freezeEnds:0, equipReadyAt:0, nextShot:0,
    specialReady:true, burstContinuation:false };
  assert.equal(canCommitWeaponAction(ready),true);
  for (const override of [{controlsActive:false},{active:false},{alive:false},
    {buyOpen:true},{freezeEnds:11000},{equipReadyAt:11000},{specialReady:false}]) {
    assert.equal(canCommitWeaponAction({...ready,...override}),false);
    assert.equal(canCommitWeaponAction({...ready,...override,burstContinuation:true}),false);
  }
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url),'utf8');
  const start = page.indexOf('    const shoot =');
  const guard = page.slice(start,page.indexOf('      interruptPlayerPlant();',start));
  assert.ok(guard.includes('canCommitWeaponAction'));
  assert.ok(guard.includes('document.pointerLockElement === renderer.domElement || touchPlaying'));
  assert.ok(guard.includes('buyOpen: buyMenuOpen'));
});
