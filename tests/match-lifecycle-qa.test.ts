import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isMatchLifecycleQaEnabled, MATCH_LIFECYCLE_SCENARIOS } from '../app/match-lifecycle-qa.ts';
import { getMatchWinner } from '../app/game-rules.ts';

void test('lifecycle fixtures require both explicit opt-in and an exact loopback hostname', () => {
  for (const hostname of ['localhost', '127.0.0.1']) {
    assert.equal(isMatchLifecycleQaEnabled('?lifecycle-qa=1', hostname), true);
    assert.equal(isMatchLifecycleQaEnabled('', hostname), false);
    assert.equal(isMatchLifecycleQaEnabled('?lifecycle-qa=0', hostname), false);
  }
  for (const hostname of ['example.com', 'localhost.example.com', '192.168.1.1']) {
    assert.equal(isMatchLifecycleQaEnabled('?lifecycle-qa=1', hostname), false);
  }
});

void test('all three winner scripts remain legal until their last round', () => {
  for (const scenario of MATCH_LIFECYCLE_SCENARIOS) {
    const scores = { player: 0, opponent: 0 };
    for (const [roundIndex, winner] of scenario.winners.entries()) {
      assert.equal(getMatchWinner(scores), null, `${scenario.name} ended before round ${roundIndex + 1}`);
      scores[winner] += 1;
    }
    assert.deepEqual([scores.player, scores.opponent], scenario.finalScore);
    assert.notEqual(getMatchWinner(scores), null);
  }
});

void test('page replay reaches real settlement and timer paths without a second scoring implementation', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const replayStart = page.indexOf('let lifecycleReplayCancelled = false;');
  const replayEnd = page.indexOf('    scheduleNextFrame();', replayStart);
  const bridge = page.slice(replayStart, replayEnd);
  assert.ok(replayStart > 0 && replayEnd > replayStart);
  assert.match(bridge, /dispatchActualRoundStart\(status, restartRef.current\)/);
  assert.match(bridge, /resolveRoundEvent\(event,/);
  assert.match(bridge, /commitPlant\('A'\)/);
  assert.match(bridge, /detonateBomb\(simulationNowMs\)/);
  assert.match(bridge, /completePlantedBombDefuse\(null\)/);
  assert.doesNotMatch(bridge, /recordRoundWinner|settlePlayerRoundMoney|resetRound\(|matchState\s*=/);
  assert.match(page, /const ROUND_RESULT_REVIEW_MS = 3000;/);
  assert.match(page, /skipRoundReview \? 0 : ROUND_RESULT_REVIEW_MS/);
  assert.equal((page.match(/completePlantedBombDefuse\(bot\)/g) ?? []).length, 1);
  assert.equal((page.match(/completePlantedBombDefuse\(null\)/g) ?? []).length, 2);
});
