import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  createBotUtilityState, cancelBotUtility, stepBotUtility, chooseBotUtility,
  consumeInsertedUtility, canInsertUtility, getBotUtilityVelocity,
  GRENADE_GRAVITY, GRENADE_FUSE_SECONDS,
} from '../app/bot-utility.ts';

const inventory = () => ({ grenades: 1, smokes: 1, flashes: 2 });
const origin = { x: 0, y: 1.55, z: 0 };
const contact = { position: { x: 10, y: 0.16, z: 0 }, direct: true, sightSeconds: 0.55, memorySeconds: 2 };
const input = () => ({ dt: 0.01, active: true, alive: true, blinded: false, reloadSeconds: 0,
  objectiveLocked: false, origin, contact: structuredClone(contact), suppression: 0, inventory: inventory() });

void test('owned utility policy selects HE, smoke and flash at declared contact boundaries', () => {
  assert.equal(chooseBotUtility(inventory(), origin, contact, 0), 'frag');
  assert.equal(chooseBotUtility({ ...inventory(), grenades: 0 }, origin, contact, 0), 'flash');
  assert.equal(chooseBotUtility({ ...inventory(), grenades: 0 }, origin, contact, 0.35), 'smoke');
  assert.equal(chooseBotUtility(inventory(), origin, { ...contact, position: { x: 20, y: 0, z: 0 } }, 0.35), 'smoke');
  assert.equal(chooseBotUtility(inventory(), origin, { ...contact, direct: false, sightSeconds: 0 }, 0), 'frag');
  assert.equal(chooseBotUtility({ ...inventory(), grenades: 0 }, origin, { ...contact, direct: false }, 0), 'smoke');
  assert.equal(chooseBotUtility({ grenades: 0, smokes: 0, flashes: 0 }, origin, contact, 1), null);
  for (const x of [4.999, 20.001, Number.NaN, Infinity])
    assert.equal(chooseBotUtility(inventory(), origin, { ...contact, position: { x, y: 0, z: 0 } }, 1), null);
  assert.equal(chooseBotUtility(inventory(), origin, { ...contact, sightSeconds: 0.549 }, 1), null);
  assert.equal(chooseBotUtility(inventory(), origin, { ...contact, direct: false, memorySeconds: 0 }, 1), null);
  assert.equal(chooseBotUtility({ grenades: 0, smokes: 0, flashes: 2 }, origin, { ...contact, direct: false }, 1), null);
});

void test('windup snapshots the selected position and consumes once on successful insertion', () => {
  const state = createBotUtilityState();
  const data = input();
  const launched: unknown[] = [];
  const launch = (kind: string, target: unknown) => { launched.push({ kind, target }); return true; };
  assert.equal(stepBotUtility(state, data, launch), true);
  assert.equal(data.inventory.grenades, 1);
  assert.ok(Object.isFrozen(state.pending?.target));
  data.contact.position.x = 18;
  data.contact.memorySeconds = 0;
  data.contact.direct = false;
  assert.equal(stepBotUtility(state, { ...data, dt: 0.379 }, launch), true);
  assert.equal(launched.length, 0);
  assert.equal(stepBotUtility(state, { ...data, dt: 0.001 }, launch), true);
  assert.deepEqual(launched, [{ kind: 'frag', target: contact.position }]);
  assert.equal(data.inventory.grenades, 0);
  assert.equal(state.pending, null);
  assert.equal(state.cooldownSeconds, 4);
  stepBotUtility(state, data, launch);
  assert.equal(launched.length, 1);
});

void test('death, blindness, reload, inactive state and objective action cancel without spending', () => {
  for (const condition of [{ alive: false }, { blinded: true }, { reloadSeconds: 0.01 },
    { reloadSeconds: Number.NaN }, { active: false }, { objectiveLocked: true }]) {
    const state = createBotUtilityState();
    const data = input();
    stepBotUtility(state, data, () => { throw new Error('not launched during start'); });
    assert.equal(stepBotUtility(state, { ...data, ...condition, dt: 0.4 }, () => {
      throw new Error('cancelled throw launched');
    }), false);
    assert.equal(state.pending, null);
    assert.equal(data.inventory.grenades, 1);
    assert.equal(state.cooldownSeconds, 1);
  }
});

void test('successful and failed launches respect four-second and one-second retry boundaries', () => {
  for (const accepted of [false, true]) {
    const state = createBotUtilityState(); const data = input();
    stepBotUtility(state, data, () => accepted);
    stepBotUtility(state, { ...data, dt: 0.38 }, () => accepted);
    assert.equal(data.inventory.grenades, accepted ? 0 : 1);
    assert.equal(stepBotUtility(state, { ...data, dt: (accepted ? 4 : 1) - 0.001 }, () => accepted), false);
    assert.equal(stepBotUtility(state, { ...data, dt: 0.002 }, () => accepted), true);
    assert.equal(state.pending?.kind, accepted ? 'flash' : 'frag');
  }
});

void test('insertion transaction preserves every inventory kind on failure and spends exactly one on success', () => {
  for (const [kind, key] of [['frag', 'grenades'], ['smoke', 'smokes'], ['flash', 'flashes']] as const) {
    const data = inventory();
    assert.equal(consumeInsertedUtility(data, kind, () => false), false);
    assert.deepEqual(data, inventory());
    assert.equal(consumeInsertedUtility(data, kind, () => true), true);
    assert.equal(data[key], inventory()[key] - 1);
    data[key] = 0;
    assert.equal(consumeInsertedUtility(data, kind, () => { throw new Error('empty inventory insertion'); }), false);
  }
});

void test('all actors share two projectile slots and smoke reservations include flying smoke', () => {
  assert.equal(canInsertUtility('frag', ['flash'], 2), true);
  for (const kind of ['frag', 'smoke', 'flash'] as const)
    assert.equal(canInsertUtility(kind, ['frag', 'flash'], 0), false);
  assert.equal(canInsertUtility('smoke', [], 2), false);
  assert.equal(canInsertUtility('smoke', ['smoke'], 1), false);
  assert.equal(canInsertUtility('smoke', ['frag'], 1), true);
  assert.equal(canInsertUtility('smoke', ['smoke'], 0), true);
  // A reservation becomes a cloud, preserving the occupied smoke-slot count.
  assert.equal(canInsertUtility('smoke', [], 1), true);
});

void test('ballistic lob lands near an uncapped target and stays finite and capped at long range', () => {
  const target = { x: 7, y: 0.16, z: 0 };
  const velocity = getBotUtilityVelocity(origin, target)!;
  const t = (4.1 + Math.sqrt(4.1 ** 2 - 2 * GRENADE_GRAVITY * (target.y - origin.y))) / GRENADE_GRAVITY;
  assert.ok(Math.abs(velocity.x * t - target.x) < 1e-9);
  assert.ok(Math.abs(origin.y + velocity.y * t - GRENADE_GRAVITY * t * t / 2 - target.y) < 1e-9);
  const far = getBotUtilityVelocity(origin, { x: 20, y: 0.16, z: 0 })!;
  assert.equal(far.x, 12.5); // Cap-limited throws can bounce or detonate short.
  assert.equal(getBotUtilityVelocity(origin, { x: 10, y: 20, z: 0 }), null);
  assert.equal(getBotUtilityVelocity(origin, origin), null);
  assert.equal(getBotUtilityVelocity(origin, { x: NaN, y: 0, z: 0 }), null);
  assert.deepEqual(GRENADE_FUSE_SECONDS, { frag: 1.85, smoke: 1.45, flash: 1.5 });
});

void test('death cancellation and fresh round state contain no pending target', () => {
  const state = createBotUtilityState();
  stepBotUtility(state, input(), () => true);
  cancelBotUtility(state);
  assert.equal(state.pending, null);
  assert.deepEqual(createBotUtilityState(), { pending: null, cooldownSeconds: 0 });
});

void test('page wires both squads to memory-only owned utility and a shared insertion/effect path', () => {
  const page = readFileSync(process.env.CS16_UTILITY_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /updateBotUtility\(enemy, seesPlayer, dt\)/);
  assert.match(page, /updateBotUtility\(ally, seesTarget, dt\)/);
  const adapter = page.slice(page.indexOf('const updateBotUtility ='), page.indexOf('const deploySmoke ='));
  assert.match(adapter, /bot\.lastKnownOpponentPosition/);
  assert.match(adapter, /memorySeconds: bot\.combatMemory/);
  assert.doesNotMatch(adapter, /playerAlive|player\.position|target\.root|camera\./);
  assert.equal((page.match(/utilitySeconds: preparingUtility \? BOT_UTILITY_WINDUP_SECONDS : 0/g) ?? []).length, 2);
  assert.equal((page.match(/if \(preparingUtility \|\| botScope.hold\) \{/g) ?? []).length, 2);
  assert.equal((page.match(/\.utility = createBotUtilityState\(\)/g) ?? []).length, 2);
  assert.equal((page.match(/cancelBotUtility\((enemy|victim)\.utility\)/g) ?? []).length, 2);
  assert.match(page, /consumeInsertedUtility\(player, kind, \(\) => tryInsertGrenadeProjectile/);
  assert.match(page, /canInsertUtility\(kind, Array.from\(grenadeProjectiles, item => item.kind\), smokeClouds.size\)/);
  assert.match(page, /fuseRemaining: GRENADE_FUSE_SECONDS\[kind\]/);
  assert.match(page, /velocity.y -= GRENADE_GRAVITY \* dt/);
  assert.doesNotMatch(page, /shouldEnemyThrowFlash|throwEnemyFlash|flashAvailable|flashTargetPosition|flashWindupSeconds/);
});
