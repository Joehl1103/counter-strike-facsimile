import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveBlast, type BlastTarget } from '../app/grenade-effects.ts';
import { getFlashBlindDuration, getPlayerKillReward } from '../app/game-rules.ts';

const actor: BlastTarget = {
  id: 'player', side: 'ct', alive: true, health: 100, armor: 0, helmet: false,
  distance: 2, covered: false,
};

void test('HE treats self and opposing actors equally, protects teammates on either side', () => {
  for (const side of ['ct', 't'] as const) {
    const targets = [
      { ...actor, id: 'self', side },
      { ...actor, id: 'teammate', side },
      { ...actor, id: 'opponent', side: side === 'ct' ? 't' as const : 'ct' as const },
    ];
    const results = resolveBlast('frag', { id: 'self', side }, targets);
    assert.equal(results[0].health, results[2].health);
    assert.ok(results[0].healthDamage > 50);
    assert.equal(results[1].healthDamage, 0);
    assert.deepEqual(targets[0], { ...actor, id: 'self', side });
  }
});

void test('HE cover, armor and radius use one shared numeric path', () => {
  const owner = { id: 'enemy', side: 't' as const };
  const [open, covered, armored, edge, outside] = resolveBlast('frag', owner, [
    { ...actor, distance: 0 },
    { ...actor, distance: 0, covered: true },
    { ...actor, distance: 0, armor: 100 },
    { ...actor, distance: 9 },
    { ...actor, distance: 12 },
  ]);
  assert.equal(open.health, 0);
  assert.equal(covered.healthDamage, 115 * 0.35);
  assert.ok(armored.healthDamage < open.healthDamage);
  assert.ok(armored.armor < 100);
  assert.equal(edge.healthDamage, 0);
  assert.equal(outside.healthDamage, 0);
});

void test('C4 resolves the whole population after human death, with no personal credit', () => {
  const targets = [
    { ...actor, id: 'player', alive: false, health: 0 },
    { ...actor, id: 'ct', side: 'ct' as const },
    { ...actor, id: 't', side: 't' as const },
    { ...actor, id: 'far', distance: 24 },
  ];
  const before = structuredClone(targets);
  const result = resolveBlast('bomb', null, targets);
  assert.deepEqual(result.map(r => r.killed), [false, true, true, false]);
  assert.deepEqual(result.map(r => r.creditId), [null, null, null, null]);
  assert.equal(result[1].health, result[2].health);
  assert.deepEqual(targets, before);
});

void test('one blast snapshots simultaneous casualties and only opposing HE deaths receive grenade credit', () => {
  const source = { id: 'thrower', side: 't' as const };
  const targets = [
    { ...actor, id: 'thrower', side: 't' as const, distance: 0 },
    { ...actor, id: 'one', distance: 0 },
    { ...actor, id: 'two', distance: 0 },
  ];
  const result = resolveBlast('frag', source, targets);
  assert.deepEqual(result.map(r => r.killed), [true, true, true]);
  assert.deepEqual(result.map(r => r.creditId), [null, 'thrower', 'thrower']);
  assert.equal(result.filter(r => r.creditId).length * getPlayerKillReward('grenade'), 600);
  const repeated = resolveBlast('frag', source, targets.map(t => ({ ...t, alive: false, health: 0 })));
  assert.ok(repeated.every(r => !r.killed && r.creditId === null));
  // The thrower's life state is not consulted: a thrown HE can earn posthumous credit.
  assert.equal(resolveBlast('frag', source, [targets[1]])[0].creditId, 'thrower');
});

void test('invalid blast distances and dead targets cannot take new damage', () => {
  const results = resolveBlast('bomb', null, [
    ...[NaN, Infinity, -1].map(distance => ({ ...actor, distance })),
    { ...actor, alive: false },
  ]);
  assert.ok(results.every(r => r.healthDamage === 0 && !r.killed));
  assert.equal(resolveBlast('frag', null, [actor])[0].healthDamage, 0);
});

void test('shared flash exposure includes looking away and full world occlusion', () => {
  const facing = getFlashBlindDuration({ distance: 0, viewDot: 1, hasLineOfSight: true });
  const away = getFlashBlindDuration({ distance: 0, viewDot: -1, hasLineOfSight: true });
  assert.equal(facing, 3.2);
  assert.equal(away, 0.8);
  assert.equal(getFlashBlindDuration({ distance: 0, viewDot: 1, hasLineOfSight: false }), 0);
});

void test('page applies shared blasts to both squads and player, then settles the complete HE outcome', () => {
  const source = readFileSync(process.env.CS16_EXPLOSIVE_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /const results = resolveBlast\(kind, source, targets.map/);
  assert.match(source, /\.\.\.bots.map\(bot => \(\{ id:/);
  assert.match(source, /1.1 - PLAYER_HULL.eyeHeight/);
  assert.match(source, /applyBlastToActors\('frag', blastPosition, grenadeOwner\);\s*const roundResolved = resolveTeamElimination\(\)/);
  assert.match(source, /eliminateEnemy\(target, 'grenade', 'FRAG', false\)/);
  assert.match(source, /eliminateBotWithCredit\(target, owner\?\.kind === 'bot' \? owner.bot : null, false,/);
  const bomb = source.slice(source.indexOf('const detonateBomb ='), source.indexOf('const raycaster = new THREE.Raycaster();', source.indexOf('const detonateBomb =')));
  assert.match(bomb, /applyBlastToActors\('bomb', blastPosition, null\)/);
  assert.doesNotMatch(bomb, /playerAlive|resolveTeamElimination/);
  assert.doesNotMatch(source, /getCoveredBlastDamage|flashTargets|grenadeOwner ===/);
});

void test('all flash recipients use shared exposure with authoritative aim', () => {
  const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const flash = source.slice(source.indexOf("      if (grenadeKind === 'flash')"), source.indexOf("      applyBlastToActors('frag'"));
  assert.match(flash, /bots.forEach\(\(target\) =>/);
  assert.match(flash, /playerCombatEyePosition.clone\(\)/);
  assert.match(flash, /Math.sin\(target.aimYaw\)/);
  assert.doesNotMatch(flash, /2.6|flashTargets|root.rotation.y/);
});
