import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixedMovementClock } from '../app/fixed-movement-clock.ts';
import { replayFixedMovement } from '../scripts/measure-fixed-movement.ts';


void test('production velocity replay has identical run and stop distance at 30/60/144 Hz', () => {
  const reference = replayFixedMovement(100);
  for (const rate of [30, 60, 144]) {
    const result = replayFixedMovement(rate);
    assert.equal(result.ticks, 200);
    assert.ok(Math.abs(result.runDistance - reference.runDistance) <= 1e-9);
    assert.ok(Math.abs(result.releaseDistance - reference.releaseDistance) <= 1e-9);
    assert.equal(Math.hypot(result.velocity.x, result.velocity.z), 0);
  }
});

void test('reset discards fractional time instead of carrying it through pause or spawn', () => {
  const clock = createFixedMovementClock();
  let ticks = 0;
  const step = () => { ticks++; };
  assert.equal(clock.advance(0.009, step), 0);
  clock.reset();
  assert.equal(clock.advance(0.001, step), 0);
  assert.equal(clock.advance(0.009, step), 1);
  assert.equal(ticks, 1);
});

void test('stalls are bounded and invalid elapsed times add no debt', () => {
  const clock = createFixedMovementClock();
  const steps: number[] = [];
  for (const elapsed of [-1, NaN, Infinity]) {
    assert.equal(clock.advance(elapsed, dt => steps.push(dt)), 0);
  }
  assert.equal(clock.advance(10, dt => steps.push(dt)), 5);
  assert.deepEqual(steps, [0.01, 0.01, 0.01, 0.01, 0.01]);
  assert.equal(clock.advance(0, () => assert.fail('stale debt')), 0);
});
