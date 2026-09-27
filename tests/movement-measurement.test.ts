import assert from 'node:assert/strict';
import test from 'node:test';
import { measureMovement, movementReport, RATES } from '../scripts/measure-movement.ts';

void test('measurement repeats identically and covers the scheduled input edges', () => {
  for (const rate of RATES) {
    const row = measureMovement(rate);
    assert.deepEqual(row, measureMovement(rate));
    assert.equal(row.samples.length, rate * 2);
    assert.equal(row.samples[rate - 1].phase, 'run');
    assert.equal(row.samples[rate].phase, 'release');
    assert.equal(row.samples.at(-1)?.timeSeconds, 2);
    assert.equal(row.samples.at(-1)?.speed, 0);
    assert.ok(row.releaseSeconds !== null);
    for (const sample of row.samples) {
      assert.ok(Number.isFinite(sample.distance));
      assert.ok(sample.speed >= 0 && sample.speed <= row.maxSpeed);
    }
  }
});

void test('report preserves raw differences without claiming reference acceptance', () => {
  const report = movementReport();
  assert.equal(report.referenceStatus, 'unmeasured');
  assert.equal(report.fidelityVerdict, 'unverified');
  assert.equal(report.setup.originalUnitConversion, null);
  for (const [index, delta] of report.differencesFrom144Hz.entries()) {
    assert.equal(delta.runDistance, report.rows[index].runDistance - report.rows[2].runDistance);
    assert.equal(delta.releaseDistance, report.rows[index].releaseDistance - report.rows[2].releaseDistance);
  }
  for (const hash of Object.values(report.sources)) assert.match(hash, /^[a-f0-9]{64}$/);
});

void test('unsupported update rates cannot silently invoke the production dt clamp', () => {
  for (const rate of [0, 19, 30.5, NaN, Infinity, 1001]) {
    assert.throws(() => measureMovement(rate));
  }
});
