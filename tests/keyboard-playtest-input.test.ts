import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearKeyboardPlaytestTapLatches,
  createKeyboardPlaytestTapLatches,
  KEYBOARD_PLAYTEST_MINIMUM_TAP_MS,
  latchKeyboardPlaytestTap,
  sampleKeyboardPlaytestInputs,
} from '../app/keyboard-playtest-input.ts';

const sample = (
  heldKeys: ReadonlySet<string>,
  latches: ReturnType<typeof createKeyboardPlaytestTapLatches>,
  nowMs: number,
) => sampleKeyboardPlaytestInputs({ heldKeys, latches, nowMs });

void test('atomic movement and aim keypresses remain active for one QA input window', () => {
  let latches = createKeyboardPlaytestTapLatches();
  latches = latchKeyboardPlaytestTap(latches, 'KeyW', 1_000);
  latches = latchKeyboardPlaytestTap(latches, 'ArrowLeft', 1_000);

  const releasedKeys = new Set<string>();
  const activeFrame = sample(releasedKeys, latches, 1_000);
  assert.equal(activeFrame.activeCodes.has('KeyW'), true);
  assert.equal(activeFrame.activeCodes.has('ArrowLeft'), true);
  const finalFrame = sample(
    releasedKeys,
    activeFrame.latches,
    1_000 + KEYBOARD_PLAYTEST_MINIMUM_TAP_MS,
  );
  assert.equal(finalFrame.activeCodes.has('ArrowLeft'), false);
});

void test('a pending atomic press is consumed once after a late frame', () => {
  const latches = latchKeyboardPlaytestTap(
    createKeyboardPlaytestTapLatches(),
    'KeyS',
    1_000,
  );
  const lateFrame = sample(new Set(), latches, 1_500);
  assert.equal(lateFrame.activeCodes.has('KeyS'), true);

  const followingFrame = sample(new Set(), lateFrame.latches, 1_516);
  assert.equal(followingFrame.activeCodes.has('KeyS'), false);
});

void test('repeated atomic keypresses extend the active window', () => {
  let latches = latchKeyboardPlaytestTap(
    createKeyboardPlaytestTapLatches(),
    'KeyD',
    2_000,
  );
  latches = latchKeyboardPlaytestTap(latches, 'KeyD', 2_050);

  const extendedFrame = sample(new Set(), latches, 2_075);
  assert.equal(extendedFrame.activeCodes.has('KeyD'), true);
  assert.equal(
    sample(
      new Set(),
      extendedFrame.latches,
      2_050 + KEYBOARD_PLAYTEST_MINIMUM_TAP_MS,
    ).activeCodes.has('KeyD'),
    false,
  );
});

void test('physical holds outlive tap expiry and clearing removes every tap', () => {
  const latches = latchKeyboardPlaytestTap(
    createKeyboardPlaytestTapLatches(),
    'ArrowRight',
    3_000,
  );
  const heldKeys = new Set(['ArrowRight']);

  assert.equal(
    sample(heldKeys, latches, 9_000).activeCodes.has('ArrowRight'),
    true,
  );
  assert.equal(
    sample(new Set(), clearKeyboardPlaytestTapLatches(), 3_001).activeCodes.has(
      'ArrowRight',
    ),
    false,
  );
});

void test('the QA latch ignores gameplay action keys and invalid clocks', () => {
  const empty = createKeyboardPlaytestTapLatches();
  assert.equal(latchKeyboardPlaytestTap(empty, 'KeyF', 1_000), empty);
  assert.equal(latchKeyboardPlaytestTap(empty, 'KeyW', Number.NaN), empty);
  assert.equal(sample(new Set(['KeyF']), empty, 1_001).activeCodes.size, 0);
  assert.equal(sample(new Set(), empty, Number.NaN).activeCodes.size, 0);
});
