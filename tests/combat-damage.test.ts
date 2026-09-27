import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBulletDamage } from '../app/combat-damage.ts';
import { FIREARMS, getFirearmDamage, applyArmorDamage, type FirearmKind } from '../app/game-rules.ts';
import { readFileSync } from 'node:fs';
void test('shared connected-shot resolver preserves all weapon and armor cases', () => {
  for (const weapon of Object.keys(FIREARMS) as FirearmKind[]) for (const hitGroup of ['head','torso','stomach','leg'] as const) for (const armor of [0,1,100]) {
    const initial={health:100,armor,helmet:true};
    const expected=applyArmorDamage({...initial,rawDamage:getFirearmDamage(weapon,10,hitGroup),source:'bullet',weapon,hitGroup});
      const actual=resolveBulletDamage(initial,weapon,hitGroup,getFirearmDamage(weapon,10,hitGroup));
      assert.equal(actual.health,expected.health);
      assert.equal(actual.armor,expected.armor);
      assert.equal(actual.helmet,expected.helmet);
  }
  assert.equal(resolveBulletDamage({health:100,armor:0,helmet:false},'deagle','torso',getFirearmDamage('deagle',0,'torso')).health,46);
});
void test('traced shotgun pellets deplete armor sequentially and invalid damage grants no hit', () => {
  const target={health:100,armor:1,helmet:true};
  const one=resolveBulletDamage(target,'shotgun','head',getFirearmDamage('shotgun',0,'head'));
  const two=resolveBulletDamage(one,'shotgun','head',getFirearmDamage('shotgun',0,'head'));
  assert.equal(one.health,22);
  assert.equal(one.armor,0);
  assert.equal(one.helmet,false);
  assert.equal(two.health,0);
  assert.equal(resolveBulletDamage(target,'shotgun','head',NaN).health,100);
  assert.equal(resolveBulletDamage(target,'shotgun','head',0).health,100);
});
void test('live combat contains no actor-dependent damage scalars or direct bot bullet subtraction', () => {
  const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/getEnemyShotDamage|ENEMY_BODY_DAMAGE_SCALE|ENEMY_PLAYER_BODY_DAMAGE_SCALE|ALLY_BODY_DAMAGE_SCALE/);
  assert.match(source,/resolveBulletDamage\(before, bot.primaryWeapon, hitGroup, result.damage\)/);
  assert.match(source,/commitBotShot\(enemy, targetPosition, enemySpeed\)/);
  assert.match(source,/commitBotShot\(ally, targetPosition, allySpeed\)/);
  assert.match(source,/resolveBulletDamage\(before, firearmKind!, hitGroup, bulletDamage \?\? 0\)/);
  assert.match(source,/health: previous\?\.health \?\? enemy.health/);
  assert.match(source,/enemy.armor = impact.armor/);
});
