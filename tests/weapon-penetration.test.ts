import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { tracePenetratingBullet, PENETRATION, PENETRATION_MATERIALS, type BulletTraceHit } from '../app/weapon-penetration.ts';
import { FIREARMS, getFirearmDamage, type FirearmKind } from '../app/game-rules.ts';
const target = (distance: number): BulletTraceHit<string> => ({kind:'target', distance, hitGroup:'torso', target:'enemy'});
const wall = (distance: number, thickness = 0.1, material: keyof typeof PENETRATION_MATERIALS = 'wood'): BulletTraceHit<string> => ({kind:'world', distance, exitDistance: distance + thickness, material, collider:{}});
function fire(kind: FirearmKind, hits: BulletTraceHit<string>[]) {
  return tracePenetratingBullet(kind, false, (near, far) => hits.find(h => h.distance >= near && h.distance <= far) ?? null);
}
void test('all direct bullets retain reference damage and count-one weapons cannot exit cover', () => {
  for (const kind of Object.keys(FIREARMS) as FirearmKind[]) {
    assert.equal(fire(kind, [target(10)])?.damage, getFirearmDamage(kind,10,'torso'));
    if (PENETRATION[kind][0] === 1) assert.equal(fire(kind,[wall(2),target(4)]), null);
  }
  for (const kind of ['rifle','carbine','deagle'] as const) {
    assert.equal(fire(kind,[wall(2),target(4)])?.exits,1);
    assert.equal(fire(kind,[wall(2),wall(4),target(6)]),null);
  }
  assert.equal(fire('sniper',[wall(2),wall(4),target(6)])?.exits,2);
  assert.equal(fire('sniper',[wall(2),wall(4),wall(6),target(8)]),null);
});
void test('material power and damage use fixed reconstructed values', () => {
  assert.deepEqual(PENETRATION_MATERIALS, {metal:[.15,.2],concrete:[.25,null],wood:[1,.6],grate:[.5,.4],vent:[.5,.45],tile:[.65,.3],computer:[.4,.45],default:[1,null]});
  assert.equal(fire('rifle',[wall(2,.5),target(5)])?.damage,20);
  assert.equal(fire('rifle',[wall(2,1),target(5)]),null);
  assert.equal(fire('rifle',[wall(2,.13,'metal'),target(5)]),null); // floor(39*.15)/40=.125
  assert.equal(fire('rifle',[wall(2,.1,'metal'),target(5)])?.damage,6);
  assert.equal(fire('deagle',[wall(26),target(28)]),null); // .50 class limit25 scene units
});
void test('multi-wall state compounds and truncates rather than resetting per wall', () => {
  assert.equal(fire('sniper',[wall(2,.5),wall(4,.1,'concrete'),target(6)])?.damage,39);
  assert.equal(fire('sniper',[wall(2,.1,'metal'),wall(4,.03,'concrete'),target(6)]),null); // power45→6→1
  assert.equal(fire('sniper',[wall(2,.1,'metal'),wall(4,.02,'concrete'),target(6)])?.damage,3);
});
void test('bad exits, repeated colliders and reduced remaining range stop the trace', () => {
  for (const exitDistance of [null,NaN,Infinity,1,2]) {
    assert.equal(fire('rifle',[{...wall(2),exitDistance} as BulletTraceHit<string>,target(4)]),null);
  }
  const shared={};
  assert.equal(fire('sniper',[{...wall(2),collider:shared} as BulletTraceHit<string>,{...wall(4),collider:shared} as BulletTraceHit<string>,target(6)]),null);
  assert.equal(fire('rifle',[wall(2),target(110)]),null);
  assert.equal(tracePenetratingBullet('rifle',false,()=>target(NaN)),null);
});

void test('page routes each firearm through material traces and restores ray bounds', () => {
  const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /resolveWoodPenetrationImpact|WOOD_PENETRATION/);
  assert.match(source, /tracePenetratingBullet\(firearmKind/);
  assert.match(source, /raycaster.near = near/);
  assert.match(source, /raycaster.far = far/);
  assert.match(source, /targetHit.distance < surfaceHit.distance/);
  assert.match(source, /getAxisAlignedBoxExitDistance\(raycaster.ray.origin, raycaster.ray.direction, box.min, box.max\)/);
  assert.match(source, /getPenetrationMaterial\(getSurfaceImpactKind/);
  assert.match(source, /finally \{\s*raycaster.near = savedNear;\s*raycaster.far = savedFar;/);
  assert.match(source, /bulletDamage = result\?\.damage/);
});
