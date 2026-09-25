import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
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

void test('normal bot presentation uses a sibling rig while legacy leg pivots remain before matrix update', () => {
  const animation = sourceBetween(
    'const applyBotAnimationPresentation =',
    'const captureBotDeathPresentation =',
  );
  assert.match(animation, /syncBotRigToAuthority\(bot\)/);
  assert.match(
    animation,
    /applyCharacterRigPose\(bot\.rig, bot\.animationPose\)/,
  );
  assert.match(animation, /applyCharacterRigWeaponAim\(\s*bot\.rig,/);

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

void test('normal bot animation passes one retained grip output through the grip and deformation APIs', () => {
  const animation = sourceBetween(
    'const applyBotAnimationPresentation =',
    'const captureBotDeathPresentation =',
  );
  const pose = indexOfOrFail(animation, 'applyCharacterRigPose(');
  const aim = indexOfOrFail(animation, 'applyCharacterRigWeaponAim(');
  const grip = indexOfOrFail(
    animation,
    'applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);',
  );
  const leftLeg = indexOfOrFail(
    animation,
    'bot.leftLegDeformationController.write(',
  );
  const rightLeg = indexOfOrFail(
    animation,
    'bot.rightLegDeformationController.write(',
  );
  const leftArm = indexOfOrFail(
    animation,
    'bot.leftArmDeformationController.write(',
  );
  const rightArm = indexOfOrFail(
    animation,
    'bot.rightArmDeformationController.write(',
  );

  assert.ok(aim > pose);
  assert.ok(grip > aim);
  assert.ok(leftLeg > grip);
  assert.ok(rightLeg > leftLeg);
  assert.ok(leftArm > rightLeg);
  assert.ok(rightArm > leftArm);
  assert.match(animation, /elbow:\s*bot\.weaponGripOutput\.leftElbowPitch/);
  assert.match(animation, /elbow:\s*bot\.weaponGripOutput\.rightElbowPitch/);
  assert.doesNotMatch(
    animation,
    /applyCharacterRigWeaponGripTargets\([^,]+,\s*\{/,
  );

  const enemyCreation = sourceBetween(
    'const enemy: Enemy = {',
    'enemyHitGroups.forEach',
  );
  assert.match(enemyCreation, /weaponGripOutput:\s*\{/);
  assert.match(pageSource, /weaponGripOutput:\s*CharacterRigWeaponGripOutput/);
  const preparedPelvis = indexOfOrFail(animation, 'bot.rig.pelvis.updateWorldMatrix(true, false);');
  assert.ok(grip < preparedPelvis && preparedPelvis < leftLeg);
  assert.match(animation, /bot\.rig\.leftThigh\.updateWorldMatrix\(false, false\);/);
  assert.match(animation, /bot\.rig\.rightThigh\.updateWorldMatrix\(false, false\);/);
  assert.match(animation, /toeClearance: bot\.animationPose\.leftToeClearance,\s*}, true\);/);
  assert.match(animation, /toeClearance: bot\.animationPose\.rightToeClearance,\s*}, true\);/);

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
