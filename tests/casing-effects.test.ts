import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPlayerCasingProfile,
  getPooledCasingSlot,
  PLAYER_CASING_CAPACITY,
  stepPlayerCasingMotion,
  type PlayerCasingMotion,
} from '../app/casing-effects.ts';

void test('casings are limited to self-loading player weapons', () => {
  for (const weapon of [
    'glock18',
    'usp',
    'p228',
    'deagle',
    'elite',
    'fiveseven',
  ] as const) {
    assert.ok(getPlayerCasingProfile(weapon));
  }
  assert.ok(getPlayerCasingProfile('smg'));
  assert.ok(getPlayerCasingProfile('rifle'));
  assert.ok(getPlayerCasingProfile('carbine'));
  assert.equal(getPlayerCasingProfile('shotgun'), null);
  assert.equal(getPlayerCasingProfile('sniper'), null);
});

void test('casing profiles stay brief, finite, and visibly energetic', () => {
  (
    [
      'glock18',
      'usp',
      'p228',
      'deagle',
      'elite',
      'fiveseven',
      'smg',
      'rifle',
      'carbine',
    ] as const
  ).forEach((weapon) => {
    const profile = getPlayerCasingProfile(weapon);
    assert.ok(profile);
    assert.ok(Object.values(profile).every(Number.isFinite));
    assert.ok(profile.horizontalSpeed >= 1 && profile.horizontalSpeed <= 2.5);
    assert.ok(profile.upwardSpeed >= 1 && profile.upwardSpeed <= 2);
    assert.ok(profile.spinSpeed >= 10 && profile.spinSpeed <= 18);
    assert.ok(profile.lifetimeSeconds >= 0.6 && profile.lifetimeSeconds <= 1);
  });
});

void test('the fixed casing pool wraps deterministically', () => {
  assert.equal(PLAYER_CASING_CAPACITY, 12);
  assert.equal(getPooledCasingSlot(0, PLAYER_CASING_CAPACITY), 0);
  assert.equal(getPooledCasingSlot(11, PLAYER_CASING_CAPACITY), 11);
  assert.equal(getPooledCasingSlot(12, PLAYER_CASING_CAPACITY), 0);
  assert.equal(getPooledCasingSlot(25.9, PLAYER_CASING_CAPACITY), 1);
  assert.equal(getPooledCasingSlot(-1, PLAYER_CASING_CAPACITY), null);
  assert.equal(getPooledCasingSlot(0, 0), null);
  assert.equal(getPooledCasingSlot(Number.NaN, PLAYER_CASING_CAPACITY), null);
});

const createMotion = (): PlayerCasingMotion => ({
  active: true,
  ageSeconds: 0,
  lifetimeSeconds: 0.82,
  positionX: 0,
  positionY: 1,
  positionZ: 0,
  velocityX: 2,
  velocityY: 1,
  velocityZ: 0.25,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  spinX: 15,
  spinY: 7.5,
  spinZ: -3.75,
  bounced: false,
});

void test('casing motion bounds frame steps and expires without timers', () => {
  const motion = createMotion();
  stepPlayerCasingMotion(motion, 10);
  assert.equal(motion.ageSeconds, 0.05);
  assert.equal(motion.positionX, 0.1);
  assert.ok(motion.positionY > 1);
  assert.ok(
    Object.values(motion).every(
      (value) => typeof value === 'boolean' || Number.isFinite(value),
    ),
  );

  for (let step = 0; step < 20; step += 1) stepPlayerCasingMotion(motion, 0.05);
  assert.equal(motion.active, false);
});

void test('casing motion performs at most one restrained ground bounce', () => {
  const motion = createMotion();
  motion.positionY = 0.05;
  motion.velocityY = -3;
  stepPlayerCasingMotion(motion, 0.05);
  assert.equal(motion.positionY, 0.04);
  assert.equal(motion.bounced, true);
  assert.ok(motion.velocityY > 0 && motion.velocityY < 1.1);
  motion.positionY = 0.04;
  motion.velocityY = -1;
  stepPlayerCasingMotion(motion, 0.05);
  assert.equal(motion.positionY, 0.04);
  assert.equal(motion.velocityY, 0);
  assert.equal(motion.bounced, true);
});
