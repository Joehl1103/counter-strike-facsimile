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

/**
 * Keep these checks resilient to formatting and line movement. The page is a
 * deliberately large client component, so named declaration boundaries are a
 * more useful contract seam than exact source line numbers.
 */
function sourceBetween(startMarker: string, endMarker: string): string {
  const start = pageSource.indexOf(startMarker);
  assert.ok(start >= 0, `missing source marker: ${startMarker}`);
  const end = pageSource.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing source marker: ${endMarker}`);
  return pageSource.slice(start, end);
}

function indexOfOrFail(source: string, marker: string): number {
  const index = source.indexOf(marker);
  assert.ok(index >= 0, `missing block marker: ${marker}`);
  return index;
}

void test('renderer has one presentation-only render seam', () => {
  const renderCalls = [
    ...pageSource.matchAll(
      /renderer\.render\(\s*scene\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g,
    ),
  ].map((match) => match[1]);

  assert.deepEqual(renderCalls, []);
  assert.equal(
    (
      pageSource.match(
        /renderWorldWithViewmodelOverlay\(renderer, scene, presentationCamera\)/g,
      ) ?? []
    ).length,
    1,
  );
  const renderFrame = sourceBetween(
    'const renderFrame =',
    'syncRenderResolution();',
  );
  assert.match(renderFrame, /syncPresentationCamera\(\)/);
  assert.match(renderFrame, /applyPlayerPresentationCamera\(\)/);
  assert.match(
    renderFrame,
    /renderWorldWithViewmodelOverlay\(renderer, scene, presentationCamera\)/,
  );
});

void test('player hitscan and grenade aim read the gameplay camera', () => {
  const shoot = sourceBetween('const shoot =', 'let persistentMarkSpawned');
  const throwGrenade = sourceBetween(
    'const throwGrenade =',
    'const detonateBomb',
  );

  assert.match(shoot, /raycaster\.setFromCamera\(new THREE\.Vector2\(0, 0\), camera\)/);
  assert.doesNotMatch(shoot, /setFromCamera\([^)]*presentationCamera/);
  assert.match(
    throwGrenade,
    /camera\.getWorldPosition\(new THREE\.Vector3\(\)\)/,
  );
  assert.match(
    throwGrenade,
    /camera\.getWorldDirection\(new THREE\.Vector3\(\)\)/,
  );
  assert.doesNotMatch(throwGrenade, /presentationCamera\./);
});

void test('normal bot presentation syncs the sibling rig before each team traversal', () => {
  const animation = sourceBetween(
    'const applyBotAnimationPresentation =',
    'const captureBotDeathPresentation =',
  );
  assert.match(animation, /presentBotAnimation\(/);
  assert.match(
    presentationSource,
    /bot\.skinned\.visualRoot\.position\.copy\(bot\.root\.position\)/,
  );
  assert.match(presentationSource, /applyCharacterRigPose\(bot\.rig, bot\.animationPose\)/);
  assert.match(presentationSource, /applyCharacterRigWeaponAim\(bot\.rig,/);

  for (const bot of ['enemy', 'ally']) {
    const loop = sourceBetween(
      `const ${bot}Speed = ${bot}.movementSpeed;`,
      bot === 'enemy'
        ? 'const allyHorizontalDistance ='
        : 'const allyFacingTarget =',
    );
    const legacyPose = indexOfOrFail(loop, `getBotLocomotionPose({`);
    const leftLeg = indexOfOrFail(loop, `${bot}.leftLeg.rotation.x`);
    const rightLeg = indexOfOrFail(loop, `${bot}.rightLeg.rotation.x`);
    const presentation = indexOfOrFail(
      loop,
      `applyBotAnimationPresentation(${bot}, dt);`,
    );
    const matrixUpdate = indexOfOrFail(
      loop,
      `${bot}.root.updateMatrixWorld(true);`,
    );

    assert.ok(leftLeg > legacyPose);
    assert.ok(rightLeg > legacyPose);
    assert.ok(presentation > rightLeg);
    assert.ok(matrixUpdate > presentation);
    assert.doesNotMatch(loop, new RegExp(`${bot}\\.root\\.position\\.y\\s*=\\s*getMapGroundHeight\\(${bot}\\.root\\.position\\.x, ${bot}\\.root\\.position\\.z\\);`));
    assert.match(loop, new RegExp(`grounded: ${bot}\\.grounded,`));
    assert.match(loop, new RegExp(`${bot}\\.root\\.rotation\\.x\\s*=\\s*0;`));
    assert.match(loop, new RegExp(`${bot}\\.root\\.rotation\\.z\\s*=\\s*0;`));
  }
});

void test('bot death pose mutates only the visual sibling and preserves the authority root contract', () => {
  const deathPose = sourceBetween(
    'const applyBotDeathVisualPose =',
    'const resetBotVisualPose =',
  );
  assert.match(deathPose, /bot\.rig\.visualRoot\.position\.set\(/);
  assert.match(deathPose, /start\.visualRootOffsetY \+ pose\.rootY/);
  assert.match(deathPose, /bot\.rig\.visualRoot\.rotation\.set\(/);
  assert.match(deathPose, /start\.visualRootPitch \+ pose\.rootPitch/);
  assert.match(deathPose, /start\.visualRootRoll \+ pose\.rootRoll/);
  assert.doesNotMatch(
    deathPose,
    /bot\.root\.position\.(?:set|x|y|z)\s*(?:=|\()/,
  );
  assert.doesNotMatch(
    deathPose,
    /bot\.root\.rotation\.(?:set|x|y|z)\s*(?:=|\()/,
  );

  for (const marker of [
    'const resetBotVisualPose =',
    'const beginBotDeathPose =',
  ]) {
    const block = sourceBetween(
      marker,
      marker === 'const resetBotVisualPose ='
        ? 'const beginBotDeathPose ='
        : 'const updateBotDeathPoses =',
    );
    assert.match(block, /bot\.root\.position\.y\s*=\s*getMapGroundHeight\(bot\.root\.position\.x, bot\.root\.position\.z\);/);
    assert.match(block, /bot\.root\.rotation\.x\s*=\s*0;/);
    assert.match(block, /bot\.root\.rotation\.z\s*=\s*0;/);
  }
});

void test('normal bot animation retains the shared grip output and samples the visible skeleton', () => {
  const pose = indexOfOrFail(presentationSource, 'writeBotAnimationPose(');
  const rig = indexOfOrFail(presentationSource, 'applyCharacterRigPose(');
  const aim = indexOfOrFail(presentationSource, 'applyCharacterRigWeaponAim(');
  const grip = indexOfOrFail(
    presentationSource,
    'applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);',
  );
  const sample = indexOfOrFail(
    presentationSource,
    'sampleSkinnedCharacterPose(bot.skinned, bot.animationPose,',
  );

  assert.ok(rig > pose);
  assert.ok(aim > rig);
  assert.ok(grip > aim);
  assert.ok(sample > grip);
  assert.match(pageSource, /weaponGripOutput:\s*CharacterRigWeaponGripOutput/);
  assert.doesNotMatch(
    pageSource,
    /createCharacterLimbDeformationController|writeCharacterLimbFootPlanting/,
  );

  const enemyCreation = sourceBetween(
    'const enemy: Enemy = {',
    'enemyHitGroups.forEach',
  );
  assert.match(enemyCreation, /weaponGripOutput:\s*\{/);
});

void test('movement visual QA is wired through the localhost-gated preset', () => {
  const qaSetup = sourceBetween(
    'const graphicsQaMotionPreset =',
    'const interruptPlayerPlant =',
  );
  assert.match(
    qaSetup,
    /getGraphicsQaMotionPreset\(\s*window\.location\.search,\s*window\.location\.hostname,?\s*\)/,
  );
  assert.match(qaSetup, /if \(graphicsQaMotionPreset\)/);
  assert.match(qaSetup, /applyGraphicsQaMotionPose\(bot, pose, index\)/);
  assert.match(qaSetup, /touchPlaying\s*=\s*false/);
  assert.match(qaSetup, /window\.queueMicrotask\(\(\) => setLocked\(true\)\)/);

  const motionPose = sourceBetween(
    'const applyGraphicsQaMotionPose =',
    'const combatOccluders',
  );
  assert.match(motionPose, /bot\.root\.visible\s*=\s*false/);
  assert.match(motionPose, /bot\.skinned\.visualRoot\.visible\s*=\s*true/);
  assert.match(motionPose, /bot\.skinned\.visualRoot\.position\.set\(/);
});
