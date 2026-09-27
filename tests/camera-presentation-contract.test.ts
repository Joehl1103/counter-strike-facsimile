import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);

void test('camera presentation seam keeps gameplay camera authoritative', () => {
  assert.match(
    pageSource,
    /const camera = new THREE\.PerspectiveCamera\([\s\S]*?\);\n    camera\.rotation\.order = 'YXZ';\n    const presentationCamera = new THREE\.PerspectiveCamera\([\s\S]*?\);\n    presentationCamera\.rotation\.order = 'YXZ';/,
  );
  assert.match(
    pageSource,
    /scene\.add\(camera\);\n    scene\.add\(presentationCamera\);/,
  );

  assert.match(
    pageSource,
    /PRIMARY_WEAPON_KINDS\.map\(\(kind\) => \{[\s\S]*?createPrimaryFirstPersonModel\(kind,[\s\S]*?presentationCamera\.add\(model\.root\);/,
  );
  assert.ok(
    (pageSource.match(/presentationCamera\.add\(model\.root\);/g) ?? [])
      .length >= 2,
  );
  assert.doesNotMatch(
    pageSource,
    /const (?:weapon|carbineView|smgView|shotgunView|sniperView) = new THREE\.Group\(\)/,
  );

  for (const [root, kind] of [
    ['knife', 'knife'],
    ['grenadeView', 'grenade'],
    ['smokeView', 'smoke'],
    ['flashView', 'flash'],
    ['bombView', 'bomb'],
  ] as const) {
    assert.match(
      pageSource,
      new RegExp(`const ${root} = equipmentViewModels\\.${kind}\\.root`),
    );
  }
  assert.match(
    pageSource,
    /Object\.values\(equipmentViewModels\)\.forEach\(\(\{ root \}\) => \{\s*root\.visible = false;\s*presentationCamera\.add\(root\);/,
  );

  assert.equal(
    (
      pageSource.match(
        /renderWorldWithViewmodelOverlay\(renderer, scene, presentationCamera\)/g,
      ) ?? []
    ).length,
    1,
  );
  assert.equal((pageSource.match(/renderer\.render\(scene,/g) ?? []).length, 0);
  assert.match(
    pageSource,
    /const renderFrame = \(displayMutation\?: \(\) => void\) => \{\n      syncPresentationCamera\(\);\n      applyPlayerPresentationCamera\(\);\n      displayMutation\?\.\(\);\n      renderWorldWithViewmodelOverlay\(renderer, scene, presentationCamera\);/,
  );
  assert.match(
    pageSource,
    /presentationCamera\.position\.copy\(camera\.position\);\n      presentationCamera\.rotation\.copy\(camera\.rotation\);/,
  );

  assert.match(
    pageSource,
    /const origin = camera\.getWorldPosition\(new THREE\.Vector3\(\)\);/,
  );
  assert.match(
    pageSource,
    /const direction = camera\.getWorldDirection\(new THREE\.Vector3\(\)\);/,
  );
  assert.match(pageSource, /raycaster\.setFromCamera\(new THREE\.Vector2\(0, 0\), camera\);/);
  assert.match(
    pageSource,
    /x: camera\.position\.x,[\s\S]*?pitch: camera\.rotation\.x,[\s\S]*?yaw: camera\.rotation\.y,/,
  );
  assert.match(pageSource, /camera\.position\.y \+= locomotionPose\.cameraY;/);
  assert.match(
    pageSource,
    /presentationCamera\.position\.y \+=\n        cameraOffset\.y - playerPresentationLegacyCameraY;/,
  );
  assert.match(
    pageSource,
    /presentationCamera\.position\.x \+=\n        cameraOffset\.x \* cosYaw - cameraOffset\.z \* sinYaw;/,
  );
  assert.match(pageSource, /presentationCamera\.rotation\.z \+= cameraRoll;/);
  assert.match(
    pageSource,
    /presentationCamera\.position\.set\(\s*deathPose\.x,\s*deathPose\.y,\s*deathPose\.z,?\s*\);/,
  );
  assert.match(pageSource, /presentationCamera\.lookAt\(target\);/);
  assert.match(
    pageSource,
    /spectatorPresentationPosition\.copy\(presentationCamera\.position\);/,
  );
  assert.match(
    pageSource,
    /spectatorPresentationPosition\.lerp\(\s*desiredCamera,/,
  );
  assert.doesNotMatch(pageSource, /presentationCamera\.position\.lerp\(/);
});

void test('camera optics synchronize on resize, scope, and reset paths', () => {
  assert.match(
    pageSource,
    /camera\.aspect = mount\.clientWidth \/ mount\.clientHeight;\n      camera\.updateProjectionMatrix\(\);\n      syncPresentationCamera\(\);/,
  );
  assert.ok(
    (
      pageSource.match(
        /camera\.fov = [^;]*getWeaponFieldOfView[\s\S]*?syncPresentationCamera\(\);/g,
      ) ?? []
    ).length >= 1,
  );
  assert.ok(
    (
      pageSource.match(
        /camera\.fov = 74;\n      camera\.updateProjectionMatrix\(\);\n      syncPresentationCamera\(\);/g,
      ) ?? []
    ).length >= 1,
  );
  assert.ok(
    (pageSource.match(/spectatorPresentationPosition = null;/g) ?? []).length >=
      2,
  );
});

void test('active player presentation is stepped once after collision and replaces legacy view offsets', () => {
  assert.equal((pageSource.match(/stepPlayerPresentation\(/g) ?? []).length, 1);
  assert.match(
    pageSource,
    /playerMovement\.step\(player, tickInput,[\s\S]*?const finalizedHorizontalVelocity = \{[\s\S]*?const finalizedLocalAcceleration = \{[\s\S]*?const presentationFrame = stepPlayerPresentation\(/,
  );
  assert.match(
    pageSource,
    /grounded: player\.grounded,[\s\S]*?walking,[\s\S]*?crouching,[\s\S]*?landingRecoverySeconds: player\.landingRecoverySeconds,[\s\S]*?authoritativeYawRadians: player\.yaw,[\s\S]*?authoritativePitchRadians: player\.pitch,[\s\S]*?locomotionPhase: locomotionPose\.phase,/,
  );
  assert.doesNotMatch(
    pageSource,
    /locomotionPose\.view[XYZ]|locomotionPose\.viewPitch|locomotionPose\.viewRoll/,
  );
  assert.match(
    pageSource,
    /presentationFrame\.pose\.viewmodelOffset\.x[\s\S]*?presentationFrame\.pose\.viewmodelOffset\.y[\s\S]*?presentationFrame\.pose\.viewmodelOffset\.z[\s\S]*?presentationFrame\.pose\.viewmodelPitch[\s\S]*?presentationFrame\.pose\.viewmodelRoll/,
  );
  assert.match(
    pageSource,
    /presentationFrame\.pose\.viewmodelRoll,[\s\S]*?\);\n          applyRenderedReloadPose\(\);/,
  );
});

void test('presentation state resets at round, QA, death, and input-release handoffs', () => {
  assert.ok(
    (pageSource.match(/resetPlayerPresentation\(\);/g) ?? []).length >= 6,
  );
  assert.match(
    pageSource,
    /player\.velocity\.x = 0;\n      player\.velocity\.z = 0;\n      resetPlayerPresentation\(\);/,
  );
  assert.match(
    pageSource,
    /beginPlayerDeathCamera\(killer\?\.id \?\? \(cause === 'bomb' \? 29 : cause === 'fall' \? 23 : 17\)\);\n      playerAlive = false;\n      resetPlayerPresentation\(\);/,
  );
});

void test('movement visual QA uses paused visual siblings and deterministic capture slices', () => {
  assert.match(pageSource, /getGraphicsQaMotionPreset\(/);
  assert.match(
    pageSource,
    /const motionSamples = graphicsQaMotionPreset\.poses\.slice\(\s*motionStart,\s*motionStart \+ bots\.length,\s*\);/,
  );
  assert.match(pageSource, /bot\.skinned\.visualRoot\.position\.set\(/);
  assert.match(pageSource, /bot\.root\.visible = false;/);
  assert.match(pageSource, /dtSeconds: 0,/);
  assert.match(
    pageSource,
    /if \(pose\.kind === 'death'\)[\s\S]*?applyBotDeathVisualPose\(bot\);/,
  );
  assert.match(
    pageSource,
    /Object\.values\(weaponViews\)\.forEach\(\(view\) =>/,
  );
});
