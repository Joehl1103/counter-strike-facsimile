import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

void test('page routes all five bot steering and braking sites through shared grounded movement', () => {
  const page = readFileSync(process.env.CS16_BOT_GROUND_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  const calls = [...page.matchAll(/stepBotGroundVelocity\(\{([\s\S]*?)\n\s*\}\);/g)];
  assert.equal(calls.length, 5);
  for (const [, body] of calls) {
    assert.match(body, /weapon: (enemy|ally).primaryWeapon, scoped: \1.special.snapshot\(\).zoom !== 0/);
    assert.match(body, /velocity: \{\s*x: (enemy|ally).locomotionVelocityX,\s*z: \1.locomotionVelocityZ/);
    assert.match(body, /dtSeconds: dt/);
  }
  assert.equal(calls.filter(([, body]) => body.includes('desiredVelocity: { x: 0, z: 0 }')).length, 4);
  assert.doesNotMatch(page, /stepBotHorizontalVelocity/);
  assert.match(page, /getMapNavigationPath\(\[startX, startZ\]/);
  assert.match(page, /getBotMovementDirections\(\{/);
  assert.match(page, /applyBotLocomotionDisplacement\(enemy, braking.velocity, dt\)/);
  assert.match(page, /applyBotLocomotionDisplacement\(ally, braking.velocity, dt\)/);
});

void test('bot adapter imports live player physics and removes the independent physical rate controls', () => {
  const source = readFileSync(new URL('../app/bot-locomotion.ts', import.meta.url), 'utf8');
  const physics = readFileSync(new URL('../app/player-physics.ts', import.meta.url), 'utf8');
  assert.match(source, /import \{ getWeaponMoveSpeed, stepHorizontalVelocity, type FirearmKind \} from '.\/game-rules.ts'/);
  assert.match(source, /Math.min\(requestedSpeed, weaponSpeed\)/);
  assert.match(source, /const velocity = stepHorizontalVelocity\(/);
  assert.match(physics, /const movement = stepHorizontalVelocity\(/);
  assert.match(physics, /const resolved = stepCharacterMotion\(/);
  assert.doesNotMatch(source, /BOT_LOCOMOTION_(MAX_SPEED|ACCELERATION|BRAKING)|stepBotHorizontalVelocity|acceleration\?:|braking\?:/);
});
