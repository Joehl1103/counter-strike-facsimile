import assert from 'node:assert/strict';
import { test } from 'node:test';

// Intentional activation negative control; this branch must never merge.
test('activation negative control blocks an invalid candidate', () => {
  assert.fail('Intentional activation fixture: required Repository checks must fail.');
});
