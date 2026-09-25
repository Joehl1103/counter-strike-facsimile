import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = process.env.LIVE_SKINNED_PAGE_REVISION
  ? execFileSync(
      'git',
      ['show', `${process.env.LIVE_SKINNED_PAGE_REVISION}:app/page.tsx`],
      { encoding: 'utf8' },
    )
  : readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

const presentationStart = 'const applyBotAnimationPresentation =';
const presentationEnd = 'const captureBotDeathJoint =';
const simulationStart = 'const clock = (wallNow: number) =>';
const simulationEnd = 'const loadedBudgetTimer =';
const samplingCall = `sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
        elapsedSeconds: simulationNowMs / 1000,
      });`;

function sourceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `missing ${start}`);
  assert.notEqual(endIndex, -1, `missing ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertVisibleSkeletonSampling(source: string): void {
  const presentation = sourceBetween(source, presentationStart, presentationEnd);
  assert.match(
    presentation,
    /applyCharacterRigPose\(bot\.rig, bot\.animationPose\);[\s\S]*?sampleSkinnedCharacterPose\(bot\.skinned, bot\.animationPose, \{\s*elapsedSeconds: simulationNowMs \/ 1000,\s*\}\);/,
  );

  const liveSimulation = sourceBetween(source, simulationStart, simulationEnd);
  assert.equal(
    (liveSimulation.match(/applyBotAnimationPresentation\(enemy, dt\);/g) ?? [])
      .length,
    1,
    'enemy team must use the common visible skinned presentation path',
  );
  assert.equal(
    (liveSimulation.match(/applyBotAnimationPresentation\(ally, dt\);/g) ?? [])
      .length,
    1,
    'ally team must use the common visible skinned presentation path',
  );
}

function removeOnce(source: string, target: string): string {
  const index = source.indexOf(target);
  assert.notEqual(index, -1, `control target missing: ${target}`);
  return source.slice(0, index) + source.slice(index + target.length);
}

function removePresentationSampling(source: string): string {
  const startIndex = source.indexOf(presentationStart);
  const endIndex = source.indexOf(presentationEnd, startIndex);
  const callIndex = source.indexOf(samplingCall, startIndex);
  assert.ok(
    callIndex >= startIndex && callIndex < endIndex,
    'presentation sampling call missing',
  );
  return source.slice(0, callIndex) + source.slice(callIndex + samplingCall.length);
}

void test('live common bot presentation samples the visible skinned body for both teams', () => {
  assertVisibleSkeletonSampling(pageSource);
});

void test(
  'regression controls reject the frozen skeleton and either missing team loop',
  {
    skip: !sourceBetween(pageSource, presentationStart, presentationEnd).includes(
      samplingCall,
    ),
  },
  () => {
  const frozenSkeletonControl = removePresentationSampling(pageSource);
  assert.throws(() => assertVisibleSkeletonSampling(frozenSkeletonControl));

  const missingEnemyLoopControl = removeOnce(
    pageSource,
    'applyBotAnimationPresentation(enemy, dt);',
  );
  assert.throws(() => assertVisibleSkeletonSampling(missingEnemyLoopControl));

  const missingAllyLoopControl = removeOnce(
    pageSource,
    'applyBotAnimationPresentation(ally, dt);',
  );
  assert.throws(() => assertVisibleSkeletonSampling(missingAllyLoopControl));
  },
);
