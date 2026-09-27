import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getMapGroundHeight } from '../app/dust2-map.ts';
import {
  getGraphicsQaCloseCharacterReview,
  getGraphicsQaEquipmentReview,
  getGraphicsQaMotionPreset,
  getGraphicsQaPistolViewmodelReview,
  getGraphicsQaPrimaryViewmodelReview,
  getGraphicsQaPreset,
  SECONDARY_VIEWMODEL_QA_BOARD,
} from '../app/graphics-qa.ts';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);

void test('visual QA exposes only tested localhost review presets', () => {
  const names = [
    'lane',
    'site-a',
    'site-b',
    'character',
    'pistol',
    'primary',
    'secondary',
    'equipment',
  ] as const;
  names.forEach((name) => {
    const preset = getGraphicsQaPreset(`?visual-qa=${name}`, 'localhost');
    assert.equal(preset?.name, name);
    assert.ok(preset);
    const [x, y, z] = preset.position;
    assert.ok(Math.abs(y - getMapGroundHeight(x, z) - 1.68) < 1e-12);
    assert.equal(preset?.pitch, 0);
  });
  assert.equal(getGraphicsQaPreset('?visual-qa=spawn', 'localhost'), null);
  assert.equal(getGraphicsQaPreset('?visual-qa=mid', 'localhost'), null);
  assert.equal(getGraphicsQaPreset('?visual-qa=lane', 'example.com'), null);
  assert.equal(
    getGraphicsQaPreset('?visual-qa=site-a', '127.0.0.1')?.name,
    'site-a',
  );
});

void test('primary viewmodel QA selects every long gun and bounded action', () => {
  const names = ['rifle', 'carbine', 'smg', 'shotgun', 'sniper'] as const;
  names.forEach((weapon) => {
    const review = getGraphicsQaPrimaryViewmodelReview(
      `?visual-qa=primary&weapon=${weapon}&action=reload`,
      'localhost',
    );
    assert.deepEqual(review, {
      name: 'primary',
      weapon,
      action: 'reload',
      timeSeconds: 1,
    });
    assert.ok(Object.isFrozen(review));
  });
  assert.deepEqual(
    getGraphicsQaPrimaryViewmodelReview(
      '?visual-qa=primary&weapon=unknown&action=fire',
      '127.0.0.1',
    ),
    { name: 'primary', weapon: 'rifle', action: 'fire', timeSeconds: 0.04 },
  );
  assert.deepEqual(
    getGraphicsQaPrimaryViewmodelReview(
      '?visual-qa=primary&weapon=sniper&action=equip&time=0.35',
      'localhost',
    ),
    { name: 'primary', weapon: 'sniper', action: 'equip', timeSeconds: 0.35 },
  );
  assert.equal(
    getGraphicsQaPrimaryViewmodelReview(
      '?visual-qa=primary&weapon=shotgun&action=fire&time=99',
      'localhost',
    )?.timeSeconds,
    4,
  );
  assert.equal(
    getGraphicsQaPrimaryViewmodelReview('?visual-qa=primary', 'example.com'),
    null,
  );
});

void test('primary QA and live presentation retain movable pump and bolt actions', () => {
  assert.match(
    pageSource,
    /const applyPrimaryActionParts = \([\s\S]*?shotgunPump[\s\S]*?Math\.sin\(pumpProgress \* Math\.PI\) \* 0\.19[\s\S]*?sniperBolt[\s\S]*?writeSniperBoltCyclePose\(/,
  );
  assert.match(
    pageSource,
    /player\.activeWeapon === 'shotgun'[\s\S]*?simulationNowMs - lastShotgunShotAt[\s\S]*?simulationNowMs - lastSniperShotAt[\s\S]*?applyPrimaryActionParts\(/,
  );
  const reviewStart = pageSource.indexOf(
    'const {\n          weapon: reviewWeapon,\n          action,\n          timeSeconds,',
  );
  const reviewEnd = pageSource.indexOf(
    "} else if (graphicsQaPreset.name === 'pistol')",
    reviewStart,
  );
  assert.ok(reviewStart >= 0 && reviewEnd > reviewStart);
  const reviewBlock = pageSource.slice(reviewStart, reviewEnd);
  assert.match(reviewBlock, /applyPrimaryActionParts\(/);
  assert.match(reviewBlock, /action === 'equip'/);
});

void test('visual QA preset is immutable and finite', () => {
  const preset = getGraphicsQaPreset('?visual-qa=secondary', 'localhost');
  assert.ok(preset);
  assert.ok(Object.isFrozen(preset));
  assert.ok(Object.isFrozen(preset.position));
  assert.ok(preset.position.every(Number.isFinite));
  assert.ok(Number.isFinite(preset.yaw));
  assert.ok(Number.isFinite(preset.pitch));
});

void test('secondary visual QA board is fixed, compact, and finite', () => {
  assert.ok(Object.isFrozen(SECONDARY_VIEWMODEL_QA_BOARD));
  Object.values(SECONDARY_VIEWMODEL_QA_BOARD).forEach((value) =>
    assert.ok(Number.isFinite(value)),
  );
  assert.ok(SECONDARY_VIEWMODEL_QA_BOARD.scale < 0.5);
  assert.ok(SECONDARY_VIEWMODEL_QA_BOARD.scale <= 0.35);
  assert.ok(SECONDARY_VIEWMODEL_QA_BOARD.rowSpacing > 0);
  assert.ok(SECONDARY_VIEWMODEL_QA_BOARD.columnSpacing > 0);
  assert.ok(SECONDARY_VIEWMODEL_QA_BOARD.columnStartX < -0.45);
  assert.ok(SECONDARY_VIEWMODEL_QA_BOARD.rowSpacing < 0.36);
});

void test('close character review uses full-scale play distances and deterministic poses', () => {
  const defaultReview = getGraphicsQaCloseCharacterReview(
    '?visual-qa=character-close',
    'localhost',
  );
  assert.deepEqual(defaultReview, {
    name: 'character-close',
    distanceMeters: 3,
    subject: 'both',
    angle: 'front',
    pose: 'idle',
    timeSeconds: 0,
    rootTravelMeters: 0,
    stridePhase: 0,
    deathVariant: 0,
  });
  assert.ok(Object.isFrozen(defaultReview));

  const review = getGraphicsQaCloseCharacterReview(
    '?visual-qa=character-close&distance=6&angle=three-quarter&pose=crouch&time=1.25',
    '127.0.0.1',
  );
  assert.equal(review?.distanceMeters, 6);
  assert.equal(review?.angle, 'three-quarter');
  assert.equal(review?.pose, 'crouch');
  assert.equal(review?.timeSeconds, 1.25);
  assert.equal(review?.rootTravelMeters, 0);
  assert.equal(review?.deathVariant, 0);
  const isolated = getGraphicsQaCloseCharacterReview(
    '?visual-qa=character-close&subject=ct&distance=1.5', 'localhost',
  );
  assert.equal(isolated?.subject, 'ct');
  assert.equal(isolated?.distanceMeters, 1.5);
  assert.ok(review && review.stridePhase > 0 && review.stridePhase < 1);
  assert.equal(
    getGraphicsQaCloseCharacterReview(
      '?visual-qa=character-close',
      'example.com',
    ),
    null,
  );
});

void test('close character death review selects every variant and transition time', () => {
  for (const variant of [0, 1, 2, 3] as const) {
    const review = getGraphicsQaCloseCharacterReview(
      `?visual-qa=character-close&pose=death&variant=${variant}&time=0.29`,
      'localhost',
    );
    assert.equal(review?.pose, 'death');
    assert.equal(review?.deathVariant, variant);
    assert.equal(review?.timeSeconds, 0.29);
  }
  assert.equal(
    getGraphicsQaCloseCharacterReview(
      '?visual-qa=character-close&pose=death&variant=99&time=99',
      '127.0.0.1',
    )?.deathVariant,
    0,
  );
});

void test('locomotion review moves roots across exact time samples', () => {
  const beginning = getGraphicsQaCloseCharacterReview(
    '?visual-qa=locomotion&distance=3&time=0',
    'localhost',
  );
  const middle = getGraphicsQaCloseCharacterReview(
    '?visual-qa=locomotion&distance=3&time=2',
    'localhost',
  );
  const end = getGraphicsQaCloseCharacterReview(
    '?visual-qa=locomotion&distance=3&time=4',
    'localhost',
  );
  assert.equal(beginning?.pose, 'walk');
  assert.equal(beginning?.rootTravelMeters, -1.1);
  assert.equal(middle?.rootTravelMeters, 0);
  assert.equal(end?.rootTravelMeters, 1.1);
  assert.notEqual(beginning?.stridePhase, middle?.stridePhase);
  assert.notEqual(middle?.stridePhase, end?.stridePhase);

  const clamped = getGraphicsQaCloseCharacterReview(
    '?visual-qa=locomotion&time=99',
    'localhost',
  );
  assert.equal(clamped?.timeSeconds, 4);
  assert.equal(clamped?.rootTravelMeters, 1.1);
});

void test('close character page review moves visual rigs without moving authority roots', () => {
  const declaration = pageSource.indexOf(
    'const graphicsQaCloseCharacterReview =',
  );
  const setupStart = pageSource.indexOf(
    'if (graphicsQaCloseCharacterReview)',
    declaration,
  );
  const setupEnd = pageSource.indexOf(
    '} else if (graphicsQaMotionPreset)',
    setupStart,
  );
  assert.ok(
    declaration >= 0 && setupStart > declaration && setupEnd > setupStart,
  );
  const setup = pageSource.slice(setupStart, setupEnd);
  assert.match(setup, /bots\.find\(\(bot\) => bot\.side === 't'\)/);
  assert.match(setup, /bots\.find\(\(bot\) => bot\.side === 'ct'\)/);
  assert.match(setup, /applyGraphicsQaCloseCharacterPose/);
  assert.doesNotMatch(setup, /bot\.root\.position\.(set|copy)\(/);
  assert.doesNotMatch(setup, /bot\.root\.rotation\.(set|copy)\(/);

  const poseStart = pageSource.indexOf(
    'const applyGraphicsQaCloseCharacterPose =',
  );
  const poseEnd = pageSource.indexOf('const combatOccluders:', poseStart);
  const poseWriter = pageSource.slice(poseStart, poseEnd);
  assert.match(poseWriter, /visualRoot\.scale\.setScalar\(1\)/);
  assert.match(poseWriter, /GRAPHICS_QA_REVIEW_POSITION\[2\] - review\.distanceMeters/);
  assert.match(poseWriter, /GRAPHICS_QA_REVIEW_POSITION\[1\] - 1\.68/);
  assert.match(setup, /player\.position\.set\(\.\.\.GRAPHICS_QA_REVIEW_POSITION\)/);
  assert.match(poseWriter, /baseX \+ review\.rootTravelMeters/);
});

void test('pistol review samples authored Glock clips while procedural pistols retain their mount writer', () => {
  const setupStart = pageSource.indexOf("graphicsQaPreset.name === 'pistol'");
  const setupEnd = pageSource.indexOf(
    "graphicsQaPreset.name === 'secondary'",
    setupStart,
  );
  assert.ok(setupStart >= 0 && setupEnd > setupStart);
  const setup = pageSource.slice(setupStart, setupEnd);
  assert.match(setup, /const pistolView = weaponViews\[pistolReview\.weapon\]/);
  assert.match(setup, /position\.copy\(pistolView\.basePosition\)/);
  assert.match(setup, /rotation\.copy\(pistolView\.baseRotation\)/);
  assert.match(setup, /if \(!pistolView\.authoredAnimation\)/);
  assert.match(setup, /pistolView\.authoredAnimation\?\.sample\(/);
  assert.match(setup, /SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS\[/);
  assert.match(setup, /pistolReview\.weapon as ProceduralSecondaryFirstPersonKind/);
  assert.match(setup, /pistolReview\.action === 'reload' && !pistolView\.authoredAnimation/);
  assert.match(setup, /applyWeaponReloadVisualPose\(/);
});

void test('pistol and equipment QA selectors are local, bounded, and explicit', () => {
  assert.deepEqual(
    getGraphicsQaPistolViewmodelReview(
      '?visual-qa=pistol&weapon=usp&action=reload&time=1.35',
      'localhost',
    ),
    { name: 'pistol', weapon: 'usp', action: 'reload', timeSeconds: 1.35 },
  );
  assert.deepEqual(
    getGraphicsQaPistolViewmodelReview(
      '?visual-qa=pistol&weapon=bad&action=bad&time=99',
      '127.0.0.1',
    ),
    { name: 'pistol', weapon: 'usp', action: 'idle', timeSeconds: 4 },
  );
  assert.equal(
    getGraphicsQaPistolViewmodelReview('?visual-qa=pistol', 'example.com'),
    null,
  );
  for (const weapon of [
    'knife',
    'grenade',
    'smoke',
    'flash',
    'bomb',
  ] as const) {
    assert.deepEqual(
      getGraphicsQaEquipmentReview(
        `?visual-qa=equipment&weapon=${weapon}`,
        'localhost',
      ),
      { name: 'equipment', weapon },
    );
  }
  assert.deepEqual(
    getGraphicsQaEquipmentReview(
      '?visual-qa=equipment&weapon=bad',
      'localhost',
    ),
    { name: 'equipment', weapon: 'knife' },
  );
});

void test('movement visual QA exposes a deterministic pose grid on localhost only', () => {
  const preset = getGraphicsQaMotionPreset('?visual-qa=movement', 'localhost');
  assert.ok(preset);
  assert.equal(preset.name, 'movement');
  assert.deepEqual(
    preset.poses.map((pose) => pose.label),
    [
      'run-contact-left',
      'run-mid-left',
      'run-contact-right',
      'run-mid-right',
      'strafe-left',
      'strafe-left-recover',
      'strafe-right',
      'strafe-right-recover',
      'aim-center',
      'aim-high-right',
      'aim-low-left',
      'death-start',
      'death-collapse',
      'death-fall',
      'death-rest',
    ],
  );
  assert.equal(
    getGraphicsQaMotionPreset('?visual-qa=movement', 'example.com'),
    null,
  );
  assert.equal(
    getGraphicsQaMotionPreset('?visual-qa=character', 'localhost'),
    null,
  );
});

void test('movement pose grid is immutable, finite, and normalized', () => {
  const preset = getGraphicsQaMotionPreset('?visual-qa=movement', '127.0.0.1');
  assert.ok(preset);
  assert.ok(Object.isFrozen(preset));
  assert.ok(Object.isFrozen(preset.poses));
  preset.poses.forEach((pose) => {
    assert.ok(Object.isFrozen(pose));
    assert.ok(Object.isFrozen(pose.velocity));
    assert.ok(Object.isFrozen(pose.aim));
    assert.ok(pose.velocity.every(Number.isFinite));
    assert.ok(pose.aim.every(Number.isFinite));
    assert.ok(Number.isFinite(pose.timeSeconds));
    assert.ok(Number.isFinite(pose.stridePhase));
    assert.ok(Number.isFinite(pose.deathProgress));
    assert.ok(pose.stridePhase >= 0 && pose.stridePhase <= 1);
    assert.ok(pose.deathProgress >= 0 && pose.deathProgress <= 1);
  });
});
