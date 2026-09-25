import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIREARMS, type FirearmKind } from '../app/game-rules.ts';
import { beginBotReload, stepBotReload, constrainBotShotDelay } from '../app/bot-weapon-actions.ts';
import { createBotInventory, switchExhaustedBotInventory, prepareBotInventory } from '../app/bot-economy.ts';

void test('bot shot scheduling never undercuts the shared weapon interval', () => {
  for (const kind of Object.keys(FIREARMS) as FirearmKind[]) for (const request of [-1,0,0.01,0.1,1,NaN]) {
    const delay = constrainBotShotDelay(kind,request);
    assert.ok(delay >= FIREARMS[kind].fireIntervalMs / 1000);
    if (request > delay) assert.fail('AI request was shortened');
  }
});
void test('empty primary switches once to owned pistol without losing inventory, and survival restores it', () => {
  const prior = {...createBotInventory('ct',0),weapon:'rifle' as const,ammo:{magazine:0,reserve:0}};
  const before=structuredClone(prior);
  const switched=switchExhaustedBotInventory(prior)!;
  assert.equal(switched.weapon,'usp');assert.equal(switched.ammo.magazine,12);
  assert.deepEqual(switched.stowedPrimary,{weapon:'rifle',ammo:{magazine:0,reserve:0}});
  assert.equal(switchExhaustedBotInventory(switched),null);
  switched.ammo.magazine=7;
  const prepared=prepareBotInventory(switched,{side:'ct',survived:true,resetMoney:null,roundIndex:2,rosterRoundIndex:2,botId:0,lossStreak:0,assignedDefuseKit:false});
  assert.equal(prepared.weapon,'rifle');assert.equal(prepared.ammo.magazine,0);assert.equal(prepared.stowedPrimary,null);assert.equal(prepared.secondaryAmmo.magazine,7);
  assert.deepEqual(prior,before);
  assert.equal(switchExhaustedBotInventory({...prior,ammo:{magazine:0,reserve:1}}),null);
  assert.equal(switchExhaustedBotInventory({...prior,secondaryAmmo:{magazine:0,reserve:0}}),null);
});
void test('magazine reload commits once at its deadline and empty reserves never start', () => {
  for (const kind of Object.keys(FIREARMS) as FirearmKind[]) {
    assert.equal(beginBotReload(kind,{magazine:0,reserve:0},0),null);
    if(kind==='shotgun') continue;
    const ammo={magazine:0,reserve:3};const state=beginBotReload(kind,ammo,100)!;
    assert.equal(stepBotReload(kind,ammo,state,state.deadline-1).ammo.magazine,0);
    const completed=stepBotReload(kind,ammo,state,state.deadline);
    assert.deepEqual(completed,{ammo:{magazine:3,reserve:0},state:null});
  }
});
void test('M3 reload enforces 550ms start, 450ms shell insertion, and 1500ms final pump', () => {
  const ammo={magazine:6,reserve:2};const start=beginBotReload('shotgun',ammo,0)!;
  assert.deepEqual(start,{phase:'start',deadline:550});
  const insert=stepBotReload('shotgun',ammo,start,550);
  assert.equal(insert.ammo.magazine,6);assert.equal(insert.state!.deadline,1000);
  const first=stepBotReload('shotgun',insert.ammo,insert.state!,1000);
  assert.equal(first.ammo.magazine,7);assert.equal(first.state!.deadline,1450);
  const final=stepBotReload('shotgun',first.ammo,first.state!,1450);
  assert.deepEqual(final.ammo,{magazine:8,reserve:0});assert.deepEqual(final.state,{phase:'pump',deadline:2950});
  assert.notEqual(stepBotReload('shotgun',final.ammo,final.state!,2949).state,null);
  assert.equal(stepBotReload('shotgun',final.ammo,final.state!,2950).state,null);
});
void test('both squads use shared action adapters and preserve primary drops after switching', () => {
  const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  for(const bot of ['enemy','ally']) {
    assert.match(source,new RegExp(`advanceBotWeapon\\(${bot}\\)`));
    assert.match(source,new RegExp(`${bot}\\.fireCooldown = constrainBotShotDelay`));
    assert.match(source,new RegExp(`botReloads.delete\\(${bot}\\)`));
  }
  assert.match(source,/WEAPON_HANDLING\[bot.primaryWeapon\].equipMs/);
  assert.match(source,/enemy.stowedPrimary\?\.weapon \?\? enemy.primaryWeapon/);
  assert.doesNotMatch(source,/reloadEnemyPrimary\(/);
});
