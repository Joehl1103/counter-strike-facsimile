import test from 'node:test';
import assert from 'node:assert/strict';
import { FIREARMS, getFirearmDamage, getDefuseDuration, advanceObjectiveProgress,
  resolveAmmoPurchase, reloadMagazine } from '../app/game-rules.ts';

// Independent numeric ledger from ReGameDLL 781a68ae; distances in source units.
// price, clip, reserve, ammo price/count, base damage, reload ms, fire ms,
// expected integer torso damage at 500 and 1000 source units.
const reference = {
  rifle: [2500,30,90,80,30,36,2450,95.5,35,34],
  carbine: [3100,30,90,60,30,32,3050,87.5,31,30],
  sniper: [4750,10,30,125,10,115,2500,1450,113,112],
  smg: [1500,30,120,20,30,26,2630,75,21,18],
  shotgun: [1700,8,32,65,8,20,450,875,16,13],
  glock18: [400,20,120,20,30,25,2200,150,18,14],
  usp: [500,12,100,25,12,34,2700,150,26,21],
  p228: [600,13,52,50,13,32,2700,200,25,20],
  deagle: [650,7,35,40,7,54,2200,300,43,35],
  elite: [800,30,120,20,30,36,4500,75,27,20],
  fiveseven: [750,20,100,50,50,20,2700,200,17,15],
} as const;

for (const kind of Object.keys(reference) as (keyof typeof reference)[]) {
  void test(`${kind}: pinned economy, reload and direct hit references`, () => {
    const d = FIREARMS[kind];
    const r = reference[kind];
    assert.deepEqual([d.price,d.magazineSize,d.maxReserve,d.ammoPrice,
      d.ammoPurchaseAmount,d.bodyDamage,d.reloadMs,d.fireIntervalMs], r.slice(0,8));
    for (const [distance, damage] of [[0,r[5]],[12.5,r[8]],[25,r[9]]]) {
      for (const [region,multiplier] of [['torso',1],['head',4],['stomach',1.25],['leg',.75]] as const) {
        assert.equal(getFirearmDamage(kind,distance,region), damage*multiplier);
      }
    }
    assert.equal(getFirearmDamage(kind,d.maximumRange+.001,'torso'),0);
    const purchase = resolveAmmoPurchase({kind,money:d.ammoPrice,reserve:d.maxReserve-1});
    assert.equal(purchase.amount,1);
    assert.equal(purchase.money,0);
    assert.equal(purchase.reserve,d.maxReserve);
    const reloaded = reloadMagazine({magazine:0,reserve:d.magazineSize+2},d.magazineSize);
    assert.deepEqual(reloaded,{magazine:d.magazineSize,reserve:2});
  });
}

void test('silencer changes base and range before integer truncation', () => {
  assert.equal(getFirearmDamage('carbine',25,'torso',true),29);
  assert.equal(getFirearmDamage('carbine',25,'head',true),116);
  assert.equal(getFirearmDamage('usp',12.5,'torso',true),23);
  assert.equal(getFirearmDamage('shotgun',0,'torso') * FIREARMS.shotgun.pellets,180);
  assert.equal(getFirearmDamage('shotgun',75,'torso'),0);
});

void test('objective progress reaches completion at sourced durations only', () => {
  assert.equal(getDefuseDuration(true),5);
  assert.equal(getDefuseDuration(false),10);
  for (const duration of [3,getDefuseDuration(true),getDefuseDuration(false)]) {
    assert.ok(advanceObjectiveProgress(0,duration-.01,duration,true)<1);
    assert.equal(advanceObjectiveProgress(0,duration,duration,true),1);
    assert.equal(advanceObjectiveProgress(.5,1,duration,false),0);
  }
});
