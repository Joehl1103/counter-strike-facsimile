import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canEnemyFire, getBotReactionTime, getBotActiveBurstLimit } from '../app/game-rules.ts';

const ready = { playerAlive: true, hasLineOfSight: true, blinded: false, inRange: true,
  facingPlayer: true, sightSeconds: 1, reactionSeconds: 0.2, fireCooldown: 0,
  reloadSeconds: 0, utilitySeconds: 0, hasMagazineAmmo: true, burstShotsRemaining: 0,
  activeShooters: 0, carrierPlanting: false };

void test('each difficulty admits exactly its shared number of simultaneous opening bursts', () => {
  for (const [difficulty, expected] of [['recruit', 2], ['standard', 2], ['veteran', 3]] as const) {
    const limit = getBotActiveBurstLimit(difficulty);
    let activeShooters = 0, admitted = 0;
    for (let actor = 0; actor < 5; actor++) {
      if (canEnemyFire({ ...ready, activeShooters, activeBurstLimit: limit })) {
        activeShooters++; admitted++;
      }
    }
    assert.equal(admitted, expected);
    assert.equal(canEnemyFire({ ...ready, activeShooters, activeBurstLimit: limit }), false);
    assert.equal(canEnemyFire({ ...ready, activeShooters, activeBurstLimit: limit, burstShotsRemaining: 1 }), true);
  }
});

void test('shared reaction deadline preserves weapon and difficulty tuning without bypassing other gates', () => {
  for (const difficulty of ['recruit', 'standard', 'veteran'] as const) {
    for (const weapon of ['rifle', 'usp', 'sniper'] as const) {
      const reactionSeconds = getBotReactionTime(weapon, 0.2, difficulty);
      const input = { ...ready, reactionSeconds, sightSeconds: reactionSeconds, activeBurstLimit: getBotActiveBurstLimit(difficulty) };
      assert.equal(canEnemyFire({ ...input, sightSeconds: reactionSeconds - 0.00001 }), false);
      assert.equal(canEnemyFire(input), true);
      for (const blocked of [{ playerAlive: false }, { hasLineOfSight: false }, { blinded: true },
        { inRange: false }, { facingPlayer: false }, { reloadSeconds: 0.1 },
        { utilitySeconds: 0.1 }, { hasMagazineAmmo: false }, { carrierPlanting: true }])
        assert.equal(canEnemyFire({ ...input, ...blocked }), false);
    }
  }
});

void test('page applies the same difficulty rules to both squads and every target type', () => {
  const page = readFileSync(process.env.CS16_BOT_DIFFICULTY_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  for (const bot of ['enemy', 'ally'])
    assert.match(page, new RegExp(`reactionSeconds: getBotReactionTime\\(\\s*${bot}\\.primaryWeapon, ${bot}\\.profile\\.reactionTime, roundBotDifficulty,\\s*\\)`));
  assert.equal((page.match(/activeBurstLimit: getBotActiveBurstLimit\(roundBotDifficulty\)/g) ?? []).length, 2);
  assert.match(page, /activeShooters: activeAllyShooters,/);
  assert.doesNotMatch(page, /getEnemyPlayerReactionTime|getEnemyPlayerActiveBurstLimit|activeAllyShooters \+ 1|reactionSeconds: targetBot|activeBurstLimit: targetBot/);
  assert.equal((page.match(/burstShotsRemaining > 0 \|\| (?:enemy|ally).special.snapshot\(\).burstDeadlines.length > 0\),/g) ?? []).length, 2);
  assert.equal((page.match(/glockAction.canOpen &&\s*botScope.canFire &&\s*canEnemyFire/g) ?? []).length, 2);
});
