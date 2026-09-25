import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);

void test('bots retain one visual limb controller per faceted limb', () => {
  const createEnemySource = pageSource.slice(
    pageSource.indexOf('const createEnemy ='),
    pageSource.indexOf('const backupCallTargets ='),
  );
  assert.equal(
    (
      createEnemySource.match(/createCharacterLimbDeformationController\(/g) ??
      []
    ).length,
    4,
  );
  for (const [mesh, kind] of [
    ['facetedLeftLeg', 'leg'],
    ['facetedRightLeg', 'leg'],
    ['facetedLeftArm', 'arm'],
    ['facetedRightArm', 'arm'],
  ]) {
    assert.match(
      createEnemySource,
      new RegExp(
        `createCharacterLimbDeformationController\\(${mesh}, '${kind}'\\)`,
      ),
    );
  }
  for (const controller of [
    'leftLegDeformationController',
    'rightLegDeformationController',
    'leftArmDeformationController',
    'rightArmDeformationController',
  ])
    assert.match(createEnemySource, new RegExp(`\\b${controller}\\b`));

  assert.doesNotMatch(
    createEnemySource,
    /createCharacterLimbDeformationController\([^)]*hit-proxy/,
  );
});

void test('bot presentation writes pose before the four deformation writers', () => {
  const applySource = pageSource.slice(
    pageSource.indexOf('const applyBotAnimationPresentation ='),
    pageSource.indexOf('const captureBotDeathPresentation ='),
  );
  const poseIndex = applySource.indexOf('writeBotAnimationPose(');
  const rigIndex = applySource.indexOf('applyCharacterRigPose(');
  const deformationIndex = applySource.indexOf(
    'bot.leftLegDeformationController.write(',
  );
  assert.ok(poseIndex >= 0);
  assert.ok(rigIndex > poseIndex);
  assert.ok(deformationIndex > rigIndex);
  assert.equal(
    (applySource.match(/DeformationController\.write\(/g) ?? []).length,
    4,
  );
});

void test('limb output clones are explicitly owned and shared bases are released', () => {
  assert.match(
    pageSource,
    /!characterLimbOutputGeometries\.has\(object\.geometry\)/,
  );
  assert.match(
    pageSource,
    /characterLimbOutputGeometries\.forEach\(\(geometry\) => geometry\.dispose\(\)\)/,
  );
  assert.equal(
    (pageSource.match(/facetedLegGeometry\.dispose\(\)/g) ?? []).length,
    1,
  );
  assert.equal(
    (pageSource.match(/facetedArmGeometry\.dispose\(\)/g) ?? []).length,
    1,
  );
});
