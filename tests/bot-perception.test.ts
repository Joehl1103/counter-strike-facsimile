import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canAcquireBotContact, nearestVisibleContact } from '../app/bot-perception.ts';

const clear = { alive: true, blinded: false, distance: 10, range: 30, viewDot: 1, clearLine: true, smokeBlocked: false };

void test('contact requires every visibility gate, including the unturned 120-degree cone', () => {
  assert.equal(canAcquireBotContact(clear), true);
  for (const obstruction of [
    { alive: false }, { blinded: true }, { clearLine: false }, { smokeBlocked: true },
    { distance: 30 }, { distance: -1 }, { distance: NaN }, { viewDot: 0.49 }, { viewDot: -1 },
  ]) assert.equal(canAcquireBotContact({ ...clear, ...obstruction }), false, JSON.stringify(obstruction));
  assert.equal(canAcquireBotContact({ ...clear, viewDot: Math.cos(Math.PI / 3) }), true);
});

void test('a nearer occluded contact cannot mask a visible farther contact; none stays absent', () => {
  const candidates = [
    { id: 'near', distance: 2, visible: canAcquireBotContact({ ...clear, clearLine: false }) },
    { id: 'far', distance: 10, visible: canAcquireBotContact(clear) },
  ];
  assert.equal(nearestVisibleContact(candidates)?.id, 'far');
  assert.equal(nearestVisibleContact(candidates.map(c => ({ ...c, visible: false }))), null);
  assert.equal(nearestVisibleContact([]), null);
  assert.equal(nearestVisibleContact([{id:'b',distance:2,visible:true},{id:'a',distance:2,visible:true}])?.id, 'a');
});

void test('both live squads select visible contacts before turning and clear absent contact', () => {
  const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  for (const bot of ['enemy', 'ally']) {
    const selection = source.indexOf(`const contact = findVisibleOpponent(${bot},`);
    assert.ok(selection > 0);
    assert.match(source, new RegExp(`${bot}\\.aimYaw = Math.atan2\\(initialLook.x`));
    assert.match(source.slice(selection), new RegExp(`stepBotAimYaw\\(\\s*${bot},`));
  }
  assert.match(source, /const targetAlive = contact !== null/);
  assert.match(source, /if \(targetAlive && distance > 0\.001\)/);
  assert.match(source, /const target = contact\?\.bot \?\? undefined/);
  assert.match(source, /allyPreviousDirectContactIds\[ally.id\] = directContactId/);
  assert.doesNotMatch(source, /chooseEnemyCombatTarget\(/);
  assert.match(source, /if \(!seesPlayer && enemy.movementSpeed > 0.08\)/);
  assert.match(source, /if \(!seesTarget && ally.movementSpeed > 0.08\)/);
});
