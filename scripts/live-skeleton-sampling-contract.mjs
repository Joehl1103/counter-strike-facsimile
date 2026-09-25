import assert from 'node:assert/strict';

const EXPECTED_POPULATION = Object.freeze({
  enemiesLiving: 5,
  alliesLiving: 4,
  totalLiving: 9,
});

export function assertSnapshotBuildIdentity(snapshot, expectedIdentity) {
  assert.deepEqual(
    snapshot.buildIdentity,
    expectedIdentity,
    'running application identity differs from the frozen capture source',
  );
}

export function assertNoBrowserErrors(errors) {
  assert.deepEqual(errors, [], 'browser/page errors invalidate renderer evidence');
}

function recordsFrom(snapshot) {
  const records = snapshot.runtime?.botSkeletons;
  assert.ok(Array.isArray(records), 'snapshot is missing bot skeleton diagnostics');
  assert.deepEqual(snapshot.runtime?.botPopulation, EXPECTED_POPULATION);
  assert.equal(records.length, EXPECTED_POPULATION.totalLiving);
  return records;
}

function validateRecord(record) {
  assert.ok(typeof record.ownerId === 'string' && record.ownerId.length > 0);
  assert.ok(record.team === 'enemy' || record.team === 'ally');
  assert.equal(record.alive, true, `${record.ownerId} is not living`);
  assert.equal(record.visible, true, `${record.ownerId} skeleton is not visible`);
  assert.ok(typeof record.skeletonId === 'string' && record.skeletonId.length > 0);
  assert.ok(Array.isArray(record.boneNames) && record.boneNames.length > 1);
  assert.equal(new Set(record.boneNames).size, record.boneNames.length);
  assert.ok(Array.isArray(record.pose));
  assert.deepEqual(
    record.pose.map((bone) => bone.name),
    record.boneNames,
    `${record.ownerId} pose does not match its ordered bone names`,
  );
  record.pose.forEach((bone) => {
    assert.ok(
      Array.isArray(bone.worldPosition) &&
        bone.worldPosition.length === 3 &&
        bone.worldPosition.every(Number.isFinite),
      `${record.ownerId} has an invalid bone position`,
    );
  });
}

function byOwner(records) {
  const owners = new Map();
  const skeletonOwners = new Map();
  for (const record of records) {
    validateRecord(record);
    assert.equal(owners.has(record.ownerId), false, `duplicate owner ${record.ownerId}`);
    assert.equal(
      skeletonOwners.has(record.skeletonId),
      false,
      `duplicate skeleton ${record.skeletonId} for ${record.ownerId} and ${skeletonOwners.get(record.skeletonId)}`,
    );
    owners.set(record.ownerId, record);
    skeletonOwners.set(record.skeletonId, record.ownerId);
  }
  const teamCounts = records.reduce(
    (counts, record) => ({ ...counts, [record.team]: counts[record.team] + 1 }),
    { enemy: 0, ally: 0 },
  );
  assert.deepEqual(teamCounts, { enemy: 5, ally: 4 });
  return owners;
}

/** Verify one-to-one living bot ownership and stable skeleton identity. */
export function assertStableLivingBotSubjects(firstSnapshot, secondSnapshot) {
  const firstByOwner = byOwner(recordsFrom(firstSnapshot));
  const secondByOwner = byOwner(recordsFrom(secondSnapshot));
  assert.deepEqual(
    [...secondByOwner.keys()].sort((first, second) => first.localeCompare(second)),
    [...firstByOwner.keys()].sort((first, second) => first.localeCompare(second)),
    'bot owners differ between renderer samples',
  );
  return [...firstByOwner.keys()]
    .sort((first, second) => first.localeCompare(second))
    .map((ownerId) => {
    const first = firstByOwner.get(ownerId);
    const second = secondByOwner.get(ownerId);
    assert.equal(second.team, first.team, `${ownerId} changed team`);
    assert.equal(second.alive, true, `${ownerId} died between samples`);
    assert.equal(
      second.skeletonId,
      first.skeletonId,
      `${ownerId} changed skeleton identity`,
    );
    assert.deepEqual(
      second.boneNames,
      first.boneNames,
      `${ownerId} changed ordered bone names`,
    );
      return { ownerId, team: first.team, first, second };
    });
}
