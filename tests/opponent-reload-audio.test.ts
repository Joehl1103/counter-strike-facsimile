import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENEMY_PRIMARY_ROSTER,
  WEAPON_ACTION_SOUNDS,
} from '../app/game-rules.ts';
import {
  OPPONENT_RELOAD_HEARING_RADIUS,
  OPPONENT_RELOAD_SHARED_COOLDOWN_MS,
  shouldEmitOpponentReloadCue,
} from '../app/opponent-reload-audio.ts';

void test('opponent reload cues use a strict audible boundary and shared cooldown', () => {
  const allowed = {
    active: true,
    sourceAlive: true,
    listenerAlive: true,
    distance: OPPONENT_RELOAD_HEARING_RADIUS - 0.01,
    nowMs: 2_000,
    nextCueAtMs: 2_000,
  };
  assert.equal(OPPONENT_RELOAD_HEARING_RADIUS, 16);
  assert.equal(OPPONENT_RELOAD_SHARED_COOLDOWN_MS, 450);
  assert.equal(shouldEmitOpponentReloadCue(allowed), true);
  assert.equal(
    shouldEmitOpponentReloadCue({ ...allowed, active: false }),
    false,
  );
  assert.equal(
    shouldEmitOpponentReloadCue({ ...allowed, sourceAlive: false }),
    false,
  );
  assert.equal(
    shouldEmitOpponentReloadCue({ ...allowed, listenerAlive: false }),
    false,
  );
  assert.equal(
    shouldEmitOpponentReloadCue({
      ...allowed,
      distance: OPPONENT_RELOAD_HEARING_RADIUS,
    }),
    false,
  );
  assert.equal(
    shouldEmitOpponentReloadCue({ ...allowed, nextCueAtMs: 2_001 }),
    false,
  );
});

void test('opponent reload cue gate fails closed for invalid timing and distance', () => {
  const base = {
    active: true,
    sourceAlive: true,
    listenerAlive: true,
    distance: 4,
    nowMs: 1_000,
    nextCueAtMs: 0,
  };
  assert.equal(
    shouldEmitOpponentReloadCue({ ...base, distance: Number.NaN }),
    false,
  );
  assert.equal(shouldEmitOpponentReloadCue({ ...base, distance: -1 }), false);
  assert.equal(
    shouldEmitOpponentReloadCue({ ...base, nowMs: Number.NaN }),
    false,
  );
  assert.equal(
    shouldEmitOpponentReloadCue({ ...base, nextCueAtMs: Number.NaN }),
    false,
  );
});

void test('every opposing primary has short start and commit sound profiles', () => {
  assert.deepEqual(ENEMY_PRIMARY_ROSTER, ['rifle', 'smg', 'shotgun', 'sniper']);
  ([...ENEMY_PRIMARY_ROSTER, 'carbine'] as const).forEach((weapon) => {
    const sounds = WEAPON_ACTION_SOUNDS[weapon];
    for (const action of ['reloadStart', 'reloadCommit'] as const) {
      const profile = sounds[action];
      assert.ok(profile.duration > 0 && profile.duration <= 0.2);
      assert.ok(profile.highpass > 0);
      assert.ok(profile.lowpass > profile.highpass);
      assert.ok(profile.gain > 0);
      assert.ok(profile.toneFrequency > 0);
    }
  });
});
