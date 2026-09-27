import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

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

void test('completed-round receipt snapshots only authoritative end-round facts', () => {
  const endRound = sourceBetween(
    'const endRound =',
    'const resolveRoundEvent =',
  );
  const scoreRecordedAt = endRound.indexOf(
    'matchState = recordRoundWinner(matchState, winnerTeam);',
  );
  const receiptRecordedAt = endRound.indexOf('completedRoundReceipt = {');
  const hudPublishedAt = endRound.indexOf('publishHud(0);');

  assert.ok(scoreRecordedAt >= 0);
  assert.ok(receiptRecordedAt > scoreRecordedAt);
  assert.ok(hudPublishedAt > receiptRecordedAt);
  assert.match(
    endRound,
    /roundNumber:\s*getCompletedRounds\(matchState\.scores\)/,
  );
  assert.match(endRound, /reason,/);
  assert.match(endRound, /score:\s*sideScores,/);
  assert.match(endRound, /playerWon,/);
});

void test('automatic preparation preserves the receipt until play actually starts', () => {
  const resetRound = sourceBetween(
    'const resetRound =',
    'restartRef.current = (newMatch, snapshotReason',
  );
  assert.doesNotMatch(resetRound, /completedRoundReceipt\s*=\s*null/);

  const clockStart = sourceBetween(
    'const clock =',
    'let activeDirectionalKeys:',
  );
  assert.match(
    clockStart,
    /if \(isPlaying && !wasPlaying && completedRoundReceipt\)/,
  );
  assert.match(
    clockStart,
    /completedRoundReceipt = null;\s*publishHud\(0\);\s*}\s*wasPlaying = isPlaying;/,
  );

  assert.match(pageSource, /const ROUND_RESULT_REVIEW_MS = 3000;/);
  assert.match(
    pageSource,
    /window\.setTimeout\([\s\S]*?restartRef\.current\(false, 'round-prepared'\);[\s\S]*?ROUND_RESULT_REVIEW_MS/,
  );
});

void test('compact freeze briefing exposes visible result and matching DOM proof', () => {
  const briefingStart = pageSource.indexOf(
    '<div className="briefing-kicker">DUSTLINE · de_dust2</div>',
  );
  const receipt = pageSource.indexOf(
    'aria-label="Previous round result"',
    briefingStart,
  );
  const title = pageSource.indexOf('<h1>{overlayTitle}</h1>', briefingStart);
  assert.ok(briefingStart >= 0);
  assert.ok(receipt > briefingStart && receipt < title);

  const visibleReceipt = sourceBetween(
    "{hud.status === 'active' &&",
    '<h1>{overlayTitle}</h1>',
  );
  assert.match(visibleReceipt, /hud\.freezeSeconds > 0/);
  assert.match(visibleReceipt, /<output/);
  assert.match(visibleReceipt, /PREVIOUS RESULT · ROUND/);
  assert.match(visibleReceipt, /ROUND SECURED/);
  assert.match(visibleReceipt, /ROUND LOST/);
  assert.match(visibleReceipt, /completedRoundReceipt\.reason/);
  assert.match(visibleReceipt, /completedRoundReceipt\.score\.ct/);
  assert.match(visibleReceipt, /completedRoundReceipt\.score\.t/);

  assert.match(pageSource, /data-playtest-last-result=/);
  assert.match(pageSource, /data-playtest-last-result-score=/);
  assert.match(pageSource, /data-playtest-last-result-reason=/);
});
