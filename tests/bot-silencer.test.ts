import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stepBotSilencer, stepBotScope } from '../app/bot-weapon-actions.ts';
import { createWeaponSpecialActions } from '../app/weapon-special-actions.ts';
import { tracePenetratingBullet } from '../app/weapon-penetration.ts';

const quiet = { weapon: 'usp' as const, now: 0, active: true, alive: true, direct: false,
  memorySeconds: 0, reloadSeconds: 0, utilityActive: false, objectiveLocked: false, fireCooldown: 0 };

void test('USP and M4 attachment use exact shared action locks, including contact arriving mid-adjustment', () => {
  for (const [weapon, deadline] of [['usp', 3000], ['carbine', 2000]] as const) {
    const actions = createWeaponSpecialActions();
    assert.equal(stepBotSilencer(actions, { ...quiet, weapon }), true);
    assert.equal(actions.isSilenced(weapon), true);
    for (const now of [1, deadline - 1]) {
      assert.equal(stepBotSilencer(actions, { ...quiet, weapon, now, direct: true }), false);
      assert.equal(actions.ready(weapon, now), false);
      assert.equal(stepBotScope(actions, { ...quiet, weapon, now, direct: true,
        blinded: false, sightSeconds: 2, distance: 10, speed: 1 }).canFire, false);
    }
    assert.equal(actions.ready(weapon, deadline), true);
    assert.equal(stepBotSilencer(actions, { ...quiet, weapon, now: deadline + 1 }), false);
    assert.equal(actions.isSilenced(weapon), true);
  }
});

void test('quiet-contact policy excludes active combat, competing actions, and unsupported weapons', () => {
  for (const condition of [{ active: false }, { alive: false }, { direct: true },
    { memorySeconds: 0.01 }, { memorySeconds: NaN }, { reloadSeconds: 0.01 },
    { reloadSeconds: NaN }, { utilityActive: true }, { objectiveLocked: true },
    { fireCooldown: 0.001 }, { fireCooldown: NaN }, { weapon: 'glock18' as const }]) {
    const actions = createWeaponSpecialActions();
    assert.equal(stepBotSilencer(actions, { ...quiet, ...condition }), false, JSON.stringify(condition));
    assert.equal(actions.isSilenced('usp'), false);
  }
});

void test('interrupted attachments revert, completed attachments survive stow, and round reset clears them', () => {
  for (const weapon of ['usp', 'carbine'] as const) {
    const actions = createWeaponSpecialActions();
    stepBotSilencer(actions, { ...quiet, weapon });
    actions.cancelPending(500);
    assert.equal(actions.isSilenced(weapon), false);
    stepBotSilencer(actions, { ...quiet, weapon, now: 1000 });
    actions.cancelPending(5000);
    actions.advance(5001, 'glock18');
    assert.equal(actions.isSilenced(weapon), true);
    assert.equal(stepBotSilencer(actions, { ...quiet, weapon, now: 6000 }), false);
    actions.reset();
    assert.equal(actions.isSilenced(weapon), false);
  }
});

void test('shared silenced bullet branches apply once at close range and after range falloff', () => {
  for (const weapon of ['usp', 'carbine'] as const) {
    for (const distance of [0, 20]) {
      const silenced = tracePenetratingBullet(weapon, true,
        () => ({ kind: 'target', distance, hitGroup: 'torso', target: 'opponent' }));
      const base = weapon === 'usp' ? 30 : 33;
      const modifier = weapon === 'usp' ? 0.79 : 0.95;
      assert.equal(silenced?.damage, Math.floor(base * Math.pow(modifier, distance * 40 / 500)));
    }
  }
});

void test('page connects both bot silencer policies to one shot mode and aligned cosmetic models', () => {
  const page = readFileSync(process.env.CS16_BOT_SILENCER_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  for (const [bot, direct] of [['enemy', 'seesPlayer'], ['ally', 'seesTarget']])
    assert.match(page, new RegExp(`updateBotSilencer\\(${bot}, ${direct}, preparingUtility\\);\\s*const botScope = updateBotScope`));
  const shot = page.slice(page.indexOf('const commitBotShot ='), page.indexOf('const tryInsertGrenadeProjectile ='));
  assert.match(shot, /const silenced = bot.special.isSilenced\(bot.primaryWeapon\)/);
  assert.match(shot, /scoped: bot.special.snapshot\(\).zoom !== 0, silenced, burst:/);
  assert.match(shot, /tracePenetratingBullet\(bot.primaryWeapon, silenced,/);
  assert.match(shot, /emitBotMuzzleFlash\(bot, silenced\)/);
  assert.match(shot, /playEnemyShotSound\(bot.root.position, bot.primaryWeapon, silenced\)/);
  assert.match(shot, /noiseRadius \* \(silenced \? 0.45 : 1\)/);
  assert.match(page, /engineSettingsRef.current.volume \* \(silenced \? 0.35 : 1\)/);
  const flash = page.slice(page.indexOf('const emitBotMuzzleFlash ='), page.indexOf('const setEnemyPrimaryModel ='));
  assert.match(flash, /if \(silenced\) \{[\s\S]*bot.muzzleFlash.intensity = 0;[\s\S]*muzzle.intensity = 0;[\s\S]*return;/);
  assert.match(page, /root.userData.silencerSocket = root.children\[0\].userData.silencerSocket/);
  assert.match(page, /model.worldToLocal\(object.getWorldPosition\(new THREE.Vector3\(\)\)\)/);
  assert.match(page, /bot.silencerModels\[kind\].visible = bot.special.isSilenced\(kind\)/);
  assert.match(page, /mesh.raycast = \(\) => undefined/);
  assert.match(page, /dataset.botWeaponModes = JSON.stringify/);
});
