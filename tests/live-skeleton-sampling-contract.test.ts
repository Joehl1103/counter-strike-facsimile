import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoBrowserErrors,
  assertSnapshotBuildIdentity,
  assertStableLivingBotSubjects,
} from '../scripts/live-skeleton-sampling-contract.mjs';

const identity = Object.freeze({
  schemaVersion: 1 as const,
  revision: 'candidate',
  pageSha256: 'a'.repeat(64),
});

type BotRecord = {
  ownerId: string;
  team: 'enemy' | 'ally';
  alive: boolean;
  visible: boolean;
  skeletonId: string;
  boneNames: string[];
  pose: Array<{ name: string; worldPosition: [number, number, number] }>;
};

function createBotRecord(team: 'enemy' | 'ally', id: number): BotRecord {
  return {
    ownerId: `${team}:${id}`,
    team,
    alive: true,
    visible: true,
    skeletonId: `${team}-skeleton-${id}`,
    boneNames: ['hips', 'hand'],
    pose: [
      { name: 'hips', worldPosition: [0, 0, 0] },
      { name: 'hand', worldPosition: [0, 1, 0] },
    ],
  };
}

function createSnapshot(records: BotRecord[]) {
  return {
    buildIdentity: identity,
    runtime: {
      botPopulation: { enemiesLiving: 5, alliesLiving: 4, totalLiving: 9 },
      botSkeletons: records,
    },
  };
}

function standardRecords() {
  return [
    ...Array.from({ length: 5 }, (_, id) => createBotRecord('enemy', id)),
    ...Array.from({ length: 4 }, (_, id) => createBotRecord('ally', id)),
  ];
}

void test('capture contract accepts one-to-one living bot ownership', () => {
  const first = createSnapshot(standardRecords());
  const second = createSnapshot(standardRecords());
  assertSnapshotBuildIdentity(first, identity);
  assertNoBrowserErrors([]);
  assert.equal(assertStableLivingBotSubjects(first, second).length, 9);
});

void test('capture contract rejects a stale served identity and browser errors', () => {
  const snapshot = createSnapshot(standardRecords());
  assert.throws(() =>
    assertSnapshotBuildIdentity(snapshot, { ...identity, revision: 'stale' }),
  );
  assert.throws(() => assertNoBrowserErrors(['renderer failed to load']));
});

void test('capture contract rejects duplicate, missing, dead, and changed skeleton controls', () => {
  const first = createSnapshot(standardRecords());

  const duplicate = standardRecords();
  duplicate[1].ownerId = duplicate[0].ownerId;
  assert.throws(() => assertStableLivingBotSubjects(first, createSnapshot(duplicate)));

  const missing = standardRecords().slice(0, 8);
  assert.throws(() => assertStableLivingBotSubjects(first, createSnapshot(missing)));

  const dead = standardRecords();
  dead[0].alive = false;
  assert.throws(() => assertStableLivingBotSubjects(first, createSnapshot(dead)));

  const sharedSkeleton = standardRecords();
  sharedSkeleton[1].skeletonId = sharedSkeleton[0].skeletonId;
  assert.throws(() =>
    assertStableLivingBotSubjects(first, createSnapshot(sharedSkeleton)),
  );

  const changed = standardRecords();
  changed[0].skeletonId = 'replacement-skeleton';
  assert.throws(() => assertStableLivingBotSubjects(first, createSnapshot(changed)));

  const changedBones = standardRecords();
  changedBones[0].boneNames = ['hips', 'elbow', 'hand'];
  changedBones[0].pose = [
    { name: 'hips', worldPosition: [0, 0, 0] },
    { name: 'elbow', worldPosition: [0, 0.5, 0] },
    { name: 'hand', worldPosition: [0, 1, 0] },
  ];
  assert.throws(() =>
    assertStableLivingBotSubjects(first, createSnapshot(changedBones)),
  );
});
