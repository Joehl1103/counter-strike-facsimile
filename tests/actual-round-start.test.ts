import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  dispatchActualRoundStart,
  type ActualRoundStartStatus,
} from '../app/actual-round-start.ts';

void test('every actual Start dispatches once with the correct new-match flag', () => {
  const cases: ReadonlyArray<
    readonly [status: ActualRoundStartStatus, startsNewMatch: boolean]
  > = [
    ['briefing', true],
    ['active', false],
    ['round-won', false],
    ['round-lost', false],
    ['match-won', true],
    ['match-lost', true],
  ];

  for (const [status, expected] of cases) {
    const calls: boolean[] = [];
    dispatchActualRoundStart(status, (startsNewMatch) => {
      calls.push(startsNewMatch);
    });
    assert.deepEqual(calls, [expected], status);
  }
});

void test('both production Start handlers use the tested dispatcher', () => {
  const pageSource = readFileSync(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  const deployStart = pageSource.slice(
    pageSource.indexOf('const deploy ='),
    pageSource.indexOf('const startKeyboardPlaytest ='),
  );
  const keyboardStart = pageSource.slice(
    pageSource.indexOf('const startKeyboardPlaytest ='),
    pageSource.indexOf('const overlayTitle ='),
  );

  assert.match(
    deployStart,
    /const startRound = \(\) => {\s*dispatchActualRoundStart\(hud\.status, restartRef\.current\);\s*};/,
  );
  assert.match(
    keyboardStart,
    /dispatchActualRoundStart\(hud\.status, restartRef\.current\);/,
  );
  assert.doesNotMatch(deployStart, /hud\.status !== 'active'/);
  assert.doesNotMatch(keyboardStart, /hud\.status !== 'active'/);
});
