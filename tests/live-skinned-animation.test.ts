import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
const sharedPresentationSource = readFileSync(
  new URL('../app/bot-presentation.ts', import.meta.url),
  'utf8',
);

const presentationStart = 'const applyBotAnimationPresentation =';
const presentationEnd = 'const captureBotDeathJoint =';
const simulationStart = 'const clock = (wallNow: number) =>';
const simulationEnd = 'const loadedBudgetTimer =';

function sourceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `missing ${start}`);
  assert.notEqual(endIndex, -1, `missing ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertVisibleSkeletonSampling(
  source: string,
  presentationSource: string,
): void {
  assert.match(
    presentationSource,
    /applyCharacterRigPose\(bot\.rig, bot\.animationPose\);[\s\S]*?sampleSkinnedCharacterPose\(bot\.skinned, bot\.animationPose, \{\s*elapsedSeconds,\s*\}\);/,
  );

  const presentation = sourceBetween(source, presentationStart, presentationEnd);
  assert.match(
    presentation,
    /presentBotAnimation\([\s\S]*?simulationNowMs \/ 1000,\s*\);/,
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
  const callStart = source.indexOf('sampleSkinnedCharacterPose(');
  const callEnd = source.indexOf('});', callStart) + 3;
  assert.ok(callStart >= 0, 'presentation sampling call missing');
  assert.ok(callEnd > callStart, 'presentation sampling call end missing');
  return source.slice(0, callStart) + source.slice(callEnd);
}

void test('live common bot presentation samples the visible skinned body for both teams', () => {
  assertVisibleSkeletonSampling(pageSource, sharedPresentationSource);
});

void test(
  'regression controls reject missing sampling, delegation, or team loops',
  () => {
    const frozenSkeletonControl = removePresentationSampling(
      sharedPresentationSource,
    );
    assert.throws(() => {
      assertVisibleSkeletonSampling(pageSource, frozenSkeletonControl);
    });

    const missingDelegationControl = removeOnce(
      pageSource,
      'presentBotAnimation(',
    );
    assert.throws(() => {
      assertVisibleSkeletonSampling(
        missingDelegationControl,
        sharedPresentationSource,
      );
    });

    const missingEnemyLoopControl = removeOnce(
      pageSource,
      'applyBotAnimationPresentation(enemy, dt);',
    );
    assert.throws(() => {
      assertVisibleSkeletonSampling(
        missingEnemyLoopControl,
        sharedPresentationSource,
      );
    });

    const missingAllyLoopControl = removeOnce(
      pageSource,
      'applyBotAnimationPresentation(ally, dt);',
    );
    assert.throws(() => {
      assertVisibleSkeletonSampling(
        missingAllyLoopControl,
        sharedPresentationSource,
      );
    });
  },
);
