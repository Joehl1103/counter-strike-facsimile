import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
const presentationSource = readFileSync(
  new URL('../app/bot-presentation.ts', import.meta.url),
  'utf8',
);

function sourceBetween(startMarker: string, endMarker: string): string {
  const start = pageSource.indexOf(startMarker);
  assert.ok(start >= 0, `missing source marker: ${startMarker}`);
  const end = pageSource.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing source marker: ${endMarker}`);
  return pageSource.slice(start, end);
}

void test('bot creation retains hidden faceted meshes without deformation controllers', () => {
  const createEnemySource = sourceBetween(
    'const createEnemy =',
    'const backupCallTargets =',
  );
  for (const meshName of [
    'facetedLeftLeg',
    'facetedRightLeg',
    'facetedLeftArm',
    'facetedRightArm',
  ]) {
    assert.match(createEnemySource, new RegExp(`const ${meshName} = new THREE\\.Mesh\\(`));
    assert.match(createEnemySource, new RegExp(`${meshName},`));
  }
  assert.match(createEnemySource, /createCharacterRig\(/);
  assert.match(createEnemySource, /leftThigh: facetedLeftLeg/);
  assert.match(createEnemySource, /rightThigh: facetedRightLeg/);
  assert.match(createEnemySource, /leftShoulder: facetedLeftArm/);
  assert.match(createEnemySource, /rightShoulder: facetedRightArm/);
  assert.doesNotMatch(
    createEnemySource,
    /createCharacterLimbDeformationController|writeCharacterLimbFootPlanting|DeformationController/,
  );
});

void test('shared normal presentation preserves pose, aim, grip and skinned sampling order', () => {
  const poseIndex = presentationSource.indexOf('writeBotAnimationPose(');
  const rigIndex = presentationSource.indexOf('applyCharacterRigPose(');
  const aimIndex = presentationSource.indexOf('applyCharacterRigWeaponAim(');
  const gripIndex = presentationSource.indexOf(
    'applyCharacterRigWeaponGripTargets(',
  );
  const sampleIndex = presentationSource.indexOf('sampleSkinnedCharacterPose(');

  assert.ok(poseIndex >= 0);
  assert.ok(rigIndex > poseIndex);
  assert.ok(aimIndex > rigIndex);
  assert.ok(gripIndex > aimIndex);
  assert.ok(sampleIndex > gripIndex);
  assert.match(presentationSource, /bot\.skinned\.visualRoot\.position\.copy\(bot\.root\.position\)/);
  assert.match(presentationSource, /bot\.skinned\.visualRoot\.rotation\.set\(0, bot\.root\.rotation\.y, 0\)/);
  assert.match(presentationSource, /bot\.skinned\.visualRoot\.visible = bot\.root\.visible/);
  assert.match(presentationSource, /bot\.rig\.visualRoot\.visible = false/);
  assert.doesNotMatch(
    presentationSource,
    /createCharacterLimbDeformationController|writeCharacterLimbFootPlanting/,
  );
});

void test('generic scene cleanup disposes shared faceted mesh geometry', () => {
  assert.doesNotMatch(
    pageSource,
    /createCharacterLimbDeformationController|writeCharacterLimbFootPlanting|characterLimbOutputGeometries/,
  );
  const cleanupStart = pageSource.lastIndexOf('scene.traverse((object) => {');
  const cleanupEnd = pageSource.indexOf(
    'texturedViewmodelArmFactory.dispose();',
    cleanupStart,
  );
  assert.ok(cleanupStart >= 0, 'missing generic scene cleanup');
  assert.ok(cleanupEnd > cleanupStart, 'missing viewmodel factory cleanup');
  const cleanup = pageSource.slice(cleanupStart, cleanupEnd);

  assert.match(
    cleanup,
    /if \(!\(object instanceof THREE\.Mesh\)\) return;/,
  );
  assert.match(
    cleanup,
    /!texturedViewmodelArmFactory\.ownsGeometry\(object\.geometry\)[\s\S]*object\.geometry\.dispose\(\);/,
  );
  assert.doesNotMatch(cleanup, /faceted(?:Leg|Arm)Geometry\.dispose\(\)/);

  const createEnemySource = sourceBetween(
    'const createEnemy =',
    'const backupCallTargets =',
  );
  assert.match(
    createEnemySource,
    /new THREE\.Mesh\(\s*facetedLegGeometry,/,
  );
  assert.match(
    createEnemySource,
    /new THREE\.Mesh\(\s*facetedArmGeometry,/,
  );
});
