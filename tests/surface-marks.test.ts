import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBulletMarkPlacement,
  getPersistentBulletMarkKind,
  getPersistentBulletMarkSize,
  getPersistentBulletMarkSlot,
  PERSISTENT_BULLET_MARK_CAPACITY,
  shouldSpawnPersistentBulletMark,
} from '../app/surface-marks.ts';

void test('persistent marks accept solid surfaces and reject loose ground', () => {
  assert.equal(getPersistentBulletMarkKind('plaster'), 'plaster');
  assert.equal(getPersistentBulletMarkKind('wood'), 'wood');
  assert.equal(getPersistentBulletMarkKind('metal'), 'metal');
  assert.equal(getPersistentBulletMarkKind('sand'), null);
  assert.equal(getPersistentBulletMarkKind('glass'), null);
});

void test('persistent marks only follow the first firearm world hit', () => {
  const eligible = {
    impact: 'world' as const,
    firearmKind: 'rifle' as const,
    surface: 'plaster',
    alreadySpawned: false,
  };
  assert.equal(shouldSpawnPersistentBulletMark(eligible), true);
  assert.equal(
    shouldSpawnPersistentBulletMark({ ...eligible, impact: 'target' }),
    false,
  );
  assert.equal(
    shouldSpawnPersistentBulletMark({ ...eligible, firearmKind: null }),
    false,
  );
  assert.equal(
    shouldSpawnPersistentBulletMark({ ...eligible, surface: 'sand' }),
    false,
  );
  assert.equal(
    shouldSpawnPersistentBulletMark({ ...eligible, alreadySpawned: true }),
    false,
  );
});

void test('mark placement normalizes the surface normal and clears the face', () => {
  assert.deepEqual(getBulletMarkPlacement([1, 2, 3], [0, 0, 4], 0.01), {
    normal: [0, 0, 1],
    position: [1, 2, 3.01],
  });
  assert.equal(getBulletMarkPlacement([1, 2, 3], [0, 0, 0]), null);
  assert.equal(getBulletMarkPlacement([1, Number.NaN, 3], [0, 1, 0]), null);
  assert.equal(getBulletMarkPlacement([1, 2, 3], [0, 1, 0], 0), null);
});

void test('bounded mark batches wrap deterministically and stay lightweight', () => {
  assert.deepEqual(PERSISTENT_BULLET_MARK_CAPACITY, {
    plaster: 24,
    wood: 12,
    metal: 12,
  });
  assert.equal(
    Object.values(PERSISTENT_BULLET_MARK_CAPACITY).reduce(
      (sum, capacity) => sum + capacity,
      0,
    ),
    48,
  );
  assert.equal(getPersistentBulletMarkSlot(0, 24), 0);
  assert.equal(getPersistentBulletMarkSlot(23, 24), 23);
  assert.equal(getPersistentBulletMarkSlot(24, 24), 0);
  assert.equal(getPersistentBulletMarkSlot(-1, 24), null);
  assert.equal(getPersistentBulletMarkSlot(0, 0), null);
});

void test('weapon-specific marks remain restrained and readable', () => {
  const firearms = [
    'glock18',
    'usp',
    'p228',
    'deagle',
    'elite',
    'fiveseven',
    'smg',
    'rifle',
    'carbine',
    'shotgun',
    'sniper',
  ] as const;
  const sizes = firearms.map((firearm) => getPersistentBulletMarkSize(firearm));
  assert.ok(sizes.every((size) => size >= 0.05 && size <= 0.09));
  assert.ok(
    getPersistentBulletMarkSize('sniper') >
      getPersistentBulletMarkSize('glock18'),
  );
});
