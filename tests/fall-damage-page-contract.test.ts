import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

function between(startMarker: string, endMarker: string) {
  const start = page.indexOf(startMarker);
  assert.ok(start >= 0, `missing ${startMarker}`);
  const end = page.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing ${endMarker}`);
  return page.slice(start, end);
}

void test('the production page charges only accepted player and bot movement, never bot probes', () => {
  const probe = between('const probeBotMotion =', 'const writeBotLocomotionVelocity =');
  const commit = between('const commitBotMotion =', 'const applyBotLocomotionDisplacement =');
  const playerMovement = between(
    'const movementEvent = playerMovement.step(player, tickInput, playerCollisionWorld);',
    'player.crouchOffset =',
  );

  assert.doesNotMatch(probe, /commitBotFallDamage|resolveFallDamage/);
  assert.match(commit, /commitBotFallDamage\(enemy, motion\.impactDownwardSpeed\)/);
  assert.match(playerMovement, /commitPlayerFallDamage\(movementEvent\.impactDownwardSpeed\)/);
  assert.match(playerMovement, /if \(!commitPlayerFallDamage\(movementEvent\.impactDownwardSpeed\)\)/);
});

void test('fall deaths reuse existing death machinery without rewards and stop the same actor loop', () => {
  const playerDeath = between('const beginSpectating =', 'const eliminateEnemy =');
  const botDeath = between('const eliminateBotWithCredit =', 'const applyFallDamage =');
  const enemyLoop = between('if (!enemy.alive) return;', 'const enemySpeed = enemy.movementSpeed;');
  const allyLoop = between('if (!ally.alive) return;', 'const allySpeed = ally.movementSpeed;');

  assert.match(playerDeath, /cause === 'fall'/);
  assert.match(playerDeath, /cause !== 'bomb' && cause !== 'fall'/);
  assert.match(botDeath, /cause !== 'bomb' && cause !== 'fall'/);
  assert.match(botDeath, /cause === 'fall' \? 'WORLD' : 'BOMB'/);
  assert.match(page, /eliminateBotWithCredit\(bot, null, false, 'fall'\)/);
  assert.match(page, /beginSpectating\(null, 'fall', false\)/);
  assert.match(enemyLoop, /if \(!enemy\.alive\) return;/);
  assert.match(allyLoop, /if \(!ally\.alive\) return;/);
  assert.match(page, /resolveTeamElimination\(\);\n\s*recordFallRoundResolution\(\);\n\s*emitNextBotFootstep\(\);/);
});

void test('the localhost fixture is named, records served identity, and reports controlled setup separately', () => {
  const setup = between('const setupControlledFallFixture =', 'let visualPreviewWeapon:');
  const snapshot = between('controlledFallFixture: controlledFallFixture', 'botSkeletons:');

  assert.match(setup, /safe: 12\.5/);
  assert.match(setup, /damaging: 18\.5/);
  assert.match(setup, /lethal: 24\.5/);
  assert.match(setup, /options\.actor === 'carrier'/);
  assert.match(setup, /options\.actor === 'last-enemy'/);
  assert.match(setup, /freezeEnds = 0;/);
  assert.match(setup, /verticalVelocity = -\(impactDownwardSpeed - CHARACTER_GRAVITY \* 0\.01\)/);
  assert.match(snapshot, /controlled: true/);
  assert.match(snapshot, /fallDamageReceipts/);
  assert.match(page, /buildIdentity: JKH129_BUILD_IDENTITY/);
  assert.match(page, /killerId: null/);
  assert.match(page, /captureFallCreditLedger/);
  assert.match(page, /creditLedgerBefore/);
  assert.match(page, /fallCreditDeltas/);
});
