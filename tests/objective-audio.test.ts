import assert from 'node:assert/strict';
import test from 'node:test';
import {
  didObjectiveActionStart,
  getObjectiveActionSoundProfile,
  OBJECTIVE_ACTION_HEARING_RADIUS,
  OBJECTIVE_ACTION_SHARED_COOLDOWN_MS,
  shouldEmitBotObjectiveCue,
  type ObjectiveActionCue,
} from '../app/objective-audio.ts';

void test('objective action starts only on an inactive-to-active transition', () => {
  assert.equal(didObjectiveActionStart(false, true), true);
  assert.equal(didObjectiveActionStart(false, false), false);
  assert.equal(didObjectiveActionStart(true, true), false);
  assert.equal(didObjectiveActionStart(true, false), false);
});

void test('objective sound profiles remain short and distinguish each transition', () => {
  const cues: ObjectiveActionCue[] = [
    'plant-start',
    'plant-complete',
    'defuse-start',
    'defuse-complete',
  ];
  const profiles = cues.map(getObjectiveActionSoundProfile);
  profiles.forEach((profile) => {
    assert.ok(profile.durationSeconds > 0);
    assert.ok(profile.durationSeconds <= 0.2);
    assert.ok(profile.frequencyHz > 0);
    assert.ok(profile.highpassHz > 0);
    assert.ok(profile.lowpassHz > profile.highpassHz);
    assert.ok(profile.noiseGain > 0);
    assert.ok(profile.toneGain > 0);
  });
  assert.equal(new Set(profiles.map(({ frequencyHz }) => frequencyHz)).size, 4);
});

void test('bot objective cues require a live in-range listener and shared cooldown', () => {
  const allowed = {
    cue: 'plant-start' as const,
    active: true,
    sourceAlive: true,
    listenerAlive: true,
    distance: 12,
    nowMs: 1_000,
    nextCueAtMs: 1_000,
  };
  assert.equal(OBJECTIVE_ACTION_HEARING_RADIUS, 20);
  assert.equal(OBJECTIVE_ACTION_SHARED_COOLDOWN_MS, 550);
  assert.equal(shouldEmitBotObjectiveCue(allowed), true);
  assert.equal(shouldEmitBotObjectiveCue({ ...allowed, active: false }), false);
  assert.equal(
    shouldEmitBotObjectiveCue({ ...allowed, sourceAlive: false }),
    false,
  );
  assert.equal(
    shouldEmitBotObjectiveCue({ ...allowed, listenerAlive: false }),
    false,
  );
  assert.equal(shouldEmitBotObjectiveCue({ ...allowed, distance: 20 }), false);
  assert.equal(
    shouldEmitBotObjectiveCue({ ...allowed, nextCueAtMs: 1_001 }),
    false,
  );
  assert.equal(
    shouldEmitBotObjectiveCue({
      ...allowed,
      cue: 'plant-complete',
      nextCueAtMs: 1_001,
    }),
    true,
  );
  assert.equal(
    shouldEmitBotObjectiveCue({ ...allowed, nowMs: Number.NaN }),
    false,
  );
  assert.equal(
    shouldEmitBotObjectiveCue({ ...allowed, distance: Number.NaN }),
    false,
  );
});
