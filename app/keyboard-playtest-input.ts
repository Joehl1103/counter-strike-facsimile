/** Input bridging for localhost QA tools that can emit only atomic keypresses. */

export const KEYBOARD_PLAYTEST_MINIMUM_TAP_MS = 75;

export const KEYBOARD_PLAYTEST_LATCHED_CODES = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
] as const;

export type KeyboardPlaytestLatchedCode =
  (typeof KEYBOARD_PLAYTEST_LATCHED_CODES)[number];

export type KeyboardPlaytestTapLatch = Readonly<{
  expiresAtMs: number;
  pendingFrame: boolean;
}>;

export type KeyboardPlaytestTapLatches = Readonly<
  Partial<Record<KeyboardPlaytestLatchedCode, KeyboardPlaytestTapLatch>>
>;

export function createKeyboardPlaytestTapLatches(): KeyboardPlaytestTapLatches {
  return {};
}

export function clearKeyboardPlaytestTapLatches(): KeyboardPlaytestTapLatches {
  return {};
}

export function isKeyboardPlaytestLatchedCode(
  code: string,
): code is KeyboardPlaytestLatchedCode {
  return (KEYBOARD_PLAYTEST_LATCHED_CODES as readonly string[]).includes(code);
}

export function latchKeyboardPlaytestTap(
  latches: KeyboardPlaytestTapLatches,
  code: string,
  nowMs: number,
): KeyboardPlaytestTapLatches {
  if (!isKeyboardPlaytestLatchedCode(code) || !Number.isFinite(nowMs))
    return latches;
  const expiresAtMs = nowMs + KEYBOARD_PLAYTEST_MINIMUM_TAP_MS;
  return {
    ...latches,
    [code]: {
      expiresAtMs: Math.max(
        latches[code]?.expiresAtMs ?? Number.NEGATIVE_INFINITY,
        expiresAtMs,
      ),
      pendingFrame: true,
    },
  };
}

export function sampleKeyboardPlaytestInputs({
  heldKeys,
  latches,
  nowMs,
}: Readonly<{
  heldKeys: ReadonlySet<string>;
  latches: KeyboardPlaytestTapLatches;
  nowMs: number;
}>) {
  const activeCodes = new Set<KeyboardPlaytestLatchedCode>();
  const nextLatches: Partial<
    Record<KeyboardPlaytestLatchedCode, KeyboardPlaytestTapLatch>
  > = {};
  const validClock = Number.isFinite(nowMs);

  KEYBOARD_PLAYTEST_LATCHED_CODES.forEach((code) => {
    const latch = latches[code];
    const held = heldKeys.has(code);
    const withinMinimumWindow =
      validClock && Boolean(latch && nowMs < latch.expiresAtMs);
    if (held || latch?.pendingFrame || withinMinimumWindow)
      activeCodes.add(code);
    if (latch && withinMinimumWindow) {
      nextLatches[code] = {
        expiresAtMs: latch.expiresAtMs,
        pendingFrame: false,
      };
    }
  });

  return {
    activeCodes: activeCodes as ReadonlySet<KeyboardPlaytestLatchedCode>,
    latches: nextLatches as KeyboardPlaytestTapLatches,
  };
}
