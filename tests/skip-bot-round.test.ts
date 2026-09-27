import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canSkipBotRoundWait } from '../app/skip-bot-round.ts';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);

function sourceBetween(startMarker: string, endMarker: string): string {
  const start = pageSource.indexOf(startMarker);
  assert.ok(start >= 0, `missing source marker: ${startMarker}`);
  const end = pageSource.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing source marker: ${endMarker}`);
  return pageSource.slice(start, end);
}

const eligible = {
  botMatch: true,
  roundActive: true,
  playerAlive: false,
  freezeSeconds: 0,
  alreadyRequested: false,
};

void test('skip is available only for a dead player spectating an active bot round', () => {
  assert.equal(canSkipBotRoundWait(eligible), true);
  assert.equal(canSkipBotRoundWait({ ...eligible, botMatch: false }), false);
  assert.equal(canSkipBotRoundWait({ ...eligible, roundActive: false }), false);
  assert.equal(canSkipBotRoundWait({ ...eligible, playerAlive: true }), false);
  assert.equal(canSkipBotRoundWait({ ...eligible, freezeSeconds: 0.1 }), false);
  assert.equal(
    canSkipBotRoundWait({ ...eligible, freezeSeconds: Number.NaN }),
    false,
  );
  assert.equal(
    canSkipBotRoundWait({ ...eligible, alreadyRequested: true }),
    false,
  );
});

void test('button and N shortcut share one idempotent skip request', () => {
  const request = sourceBetween(
    'const requestSkipBotRoundWait =',
    'skipBotRoundRef.current = requestSkipBotRoundWait;',
  );
  assert.match(request, /alreadyRequested: skipBotRoundRequested/);
  assert.match(request, /skipBotRoundRequested = true/);
  assert.match(request, /if \(pendingRoundResult\)/);
  assert.match(
    request,
    /endRound\(pending\.winnerSide, pending\.reason, pending\.event\)/,
  );
  assert.doesNotMatch(request, /recordRoundWinner|settlePlayerRoundMoney/);

  const keyboard = sourceBetween('const onKeyDown =', 'const onKeyUp =');
  assert.match(
    keyboard,
    /event\.code === 'KeyN'[\s\S]*?!event\.repeat && requestSkipBotRoundWait\(\)/,
  );
  assert.match(pageSource, /onClick=\{\(\) => skipBotRoundRef\.current\(\)\}/);
  assert.match(pageSource, /disabled=\{hud\.skippingBotRound\}/);
  assert.match(pageSource, /aria-keyshortcuts="N"/);
  assert.match(pageSource, /SKIP TO NEXT ROUND/);
});

void test('fast-forward yields after bounded normal simulation steps', () => {
  const scheduler = sourceBetween('const scheduleNextFrame =', 'const clock =');
  assert.match(scheduler, /skipBotRoundRequested/);
  assert.match(scheduler, /status === 'active'/);
  assert.match(scheduler, /!playerAlive/);
  assert.match(scheduler, /window\.setTimeout/);
  assert.match(scheduler, /clock\(lastFrame \+ 50\)/);
  assert.match(scheduler, /if \(fastForwardClockActive\)/);
  assert.match(scheduler, /requestAnimationFrame\(clock\)/);

  const spectatorGate = sourceBetween(
    'if (isPlaying && !playerAlive) {',
    'if (isPlaying && simulationNowMs < freezeEnds)',
  );
  assert.match(
    spectatorGate,
    /pendingRoundResult &&[\s\S]*?skipBotRoundRequested[\s\S]*?endRound\(/,
  );
});

void test('authoritative settlement runs once before skip enters the next freeze', () => {
  const endRound = sourceBetween(
    'const endRound =',
    'const resolveRoundEvent =',
  );
  assert.match(endRound, /if \(status !== 'active'\) return/);
  assert.equal((endRound.match(/recordRoundWinner\(/g) ?? []).length, 1);
  assert.equal((endRound.match(/player.money = settlePlayerRoundMoney\(/g) ?? []).length, 1);
  assert.equal((endRound.match(/bot.money = settlePlayerRoundMoney\(/g) ?? []).length, 1);
  assert.match(endRound, /bots.forEach\(\(bot\) =>/);
  assert.match(endRound, /completedRoundReceipt = \{/);
  assert.match(endRound, /skipRoundReview \? 0 : ROUND_RESULT_REVIEW_MS/);
  assert.match(endRound, /shouldAutoPrepareNextRound\(matchWinner\)/);

  const resetRound = sourceBetween(
    'const resetRound =',
    'restartRef.current = (newMatch, snapshotReason',
  );
  assert.match(resetRound, /skipBotRoundRequested = false/);
  assert.match(resetRound, /freezeEnds = simulationNowMs \+ 5000/);
  assert.match(resetRound, /playerAlive = true/);
  assert.doesNotMatch(resetRound, /completedRoundReceipt\s*=\s*null/);
});
