import test from 'node:test';
import assert from 'node:assert/strict';
import { createBotInventory, prepareBotInventory } from '../app/bot-economy.ts';
import { settlePlayerRoundMoney, addMoney, getPlayerKillReward, OBJECTIVE_REWARDS, FIREARMS } from '../app/game-rules.ts';
import { readFileSync } from 'node:fs';
const options = {side:'ct' as const,survived:false,resetMoney:null,roundIndex:0,rosterRoundIndex:0,botId:0,lossStreak:0,assignedDefuseKit:false};
void test('opening bots pay for armor and ammo from the shared 800 bank', () => {
  const first=prepareBotInventory(createBotInventory('ct'),options);
  assert.equal(first.weapon,'usp'); assert.equal(first.armor,100);
  assert.equal(first.money,0); assert.equal(first.ammo.magazine,12); assert.equal(first.ammo.reserve,96);
  assert.equal(first.hasDefuseKit,false);
  assert.equal(first.grenades+first.smokes+first.flashes,0);
  const poor=prepareBotInventory(createBotInventory('ct',0),options);
  assert.equal(poor.money,0);assert.equal(poor.armor,0);assert.equal(poor.ammo.reserve,24);
  assert.equal(poor.weapon,'usp');
});
void test('survivors keep magazines and armor while deaths discard equipment but retain bank', () => {
  const prior={...createBotInventory('ct',100),weapon:'carbine' as const,ammo:{magazine:7,reserve:90},armor:67,helmet:true,hasDefuseKit:true,grenades:1};
  const before=structuredClone(prior);
  const survivor=prepareBotInventory(prior,{...options,survived:true,roundIndex:2});
  assert.equal(survivor.weapon,'carbine');assert.equal(survivor.ammo.magazine,7);assert.equal(survivor.armor,67);assert.equal(survivor.helmet,true);assert.equal(survivor.hasDefuseKit,true);assert.equal(survivor.grenades,1);
  assert.deepEqual(prior,before);
  survivor.ammo.magazine=0;survivor.secondaryAmmo.magazine=0;
  assert.deepEqual(prior,before);
  const dead=prepareBotInventory(prior,{...options,roundIndex:2});
  assert.equal(dead.weapon,'usp');assert.equal(dead.armor,0);assert.equal(dead.hasDefuseKit,false);assert.equal(dead.grenades,0);
  assert.ok(dead.money>=0 && dead.money<=100);
});
void test('half and overtime resets replace inventory and bank, with no cross-bot ammo alias', () => {
  const prior={...createBotInventory('ct',16000),weapon:'carbine' as const,armor:100,helmet:true,hasDefuseKit:true};
  const half=prepareBotInventory(prior,{...options,side:'t',resetMoney:800,roundIndex:15,survived:true});
  assert.equal(half.weapon,'glock18');assert.equal(half.hasDefuseKit,false);assert.ok(half.money<=800);
  const overtime=prepareBotInventory(prior,{...options,side:'t',resetMoney:10000,roundIndex:30,survived:true});
  assert.notEqual(overtime.weapon,'carbine');assert.ok(overtime.money<10000);assert.equal(overtime.hasDefuseKit,false);
  const a=createBotInventory('ct'),b=createBotInventory('ct');
  a.ammo.magazine=0;assert.equal(a.secondaryAmmo.magazine,12);assert.equal(b.ammo.magazine,12);
});
void test('bot policy can never grant unaffordable primaries or exceed the wallet cap', () => {
  for(const side of ['ct','t'] as const) for(let botId=0;botId<5;botId++) for(const money of [0,650,1500,3100,10000,16000]) {
    const bought=prepareBotInventory(createBotInventory(side,money),{...options,side,botId,roundIndex:2,rosterRoundIndex:2});
    assert.ok(bought.money>=0 && bought.money<=16000);
    if(bought.weapon!=='usp'&&bought.weapon!=='glock18') assert.ok(money>=FIREARMS[bought.weapon].price);
    assert.ok(bought.ammo.reserve<=FIREARMS[bought.weapon].maxReserve);
  }
  assert.equal(settlePlayerRoundMoney({currentMoney:100,playerWon:false,event:'bomb-detonated',lossStreak:1}),1500);
  assert.equal(settlePlayerRoundMoney({currentMoney:100,playerWon:true,event:'bomb-detonated',lossStreak:0}),3600);
  assert.equal(addMoney(15900,getPlayerKillReward('rifle')),16000);
  assert.equal(addMoney(100,OBJECTIVE_REWARDS.plant),400);
  assert.equal(addMoney(100,OBJECTIVE_REWARDS.defuse),400);
});
void test('live bots prepare paid inventory before reviving and receive shared rewards', () => {
  const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/getBotRoundFirearm|createEnemyPrimaryAmmo|shouldIssueBotDefuseKit/);
  for(const bot of ['enemy','ally']) {
    assert.ok(source.indexOf(`applyBotInventory(${bot}, prepareBotInventory`)<source.indexOf(`${bot}.health = 100;`,source.indexOf('const resetRound')));
  }
  assert.match(source, /completePlantedBombDefuse\(bot\)/);
  const defuseCompletion = source.slice(source.indexOf('const completePlantedBombDefuse ='), source.indexOf('const resetRound ='));
  assert.match(defuseCompletion, /status !== 'active' \|\| bombState !== 'planted'/);
  assert.match(defuseCompletion, /defuser.money = addMoney\(defuser.money, OBJECTIVE_REWARDS.defuse\)/);
  assert.match(defuseCompletion, /else player.money = addMoney\(player.money, OBJECTIVE_REWARDS.defuse\)/);
  for(const bot of ['enemy','ally']) assert.match(source,new RegExp(`moveBotObjective\\(${bot},`));
  assert.equal((source.match(/killer.money = addMoney\(killer.money, getPlayerKillReward/g)??[]).length,2);
  assert.match(source,/bombCarrier.money = addMoney\(bombCarrier.money, OBJECTIVE_REWARDS.plant/);
  assert.match(source,/bot.money = settlePlayerRoundMoney/);
  assert.match(source,/suppression: bot.suppression, inventory: bot/);
  assert.match(source,/\(kind, target\) => throwBotUtility\(bot, kind, target\)/);
});
