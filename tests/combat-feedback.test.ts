import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BODY_IMPACT_COOLDOWN_MS,
  BOT_DEATH_HEARING_RADIUS,
  BOT_DEATH_THUD_COOLDOWN_MS,
  DECISIVE_IMPACT_BODY_GATE_MS,
  getCombatFeedbackSoundProfile,
  selectPlayerImpactCue,
  shouldEmitBotDeathThud,
  type PlayerImpactCue,
} from '../app/combat-feedback.ts';
import { chooseHitConfirmation } from '../app/game-rules.ts';

void test('body impact cue follows its simulation-time cooldown boundary', () => {
  const first = selectPlayerImpactCue({
    confirmation: 'body',
    nowMs: 1000,
    nextBodyImpactAtMs: 0,
  });
  assert.deepEqual(first, {
    cue: 'body-impact',
    nextBodyImpactAtMs: 1000 + BODY_IMPACT_COOLDOWN_MS,
  });
  assert.equal(
    selectPlayerImpactCue({
      confirmation: 'body',
      nowMs: first.nextBodyImpactAtMs - 1,
      nextBodyImpactAtMs: first.nextBodyImpactAtMs,
    }).cue,
    null,
  );
  assert.equal(
    selectPlayerImpactCue({
      confirmation: 'body',
      nowMs: first.nextBodyImpactAtMs,
      nextBodyImpactAtMs: first.nextBodyImpactAtMs,
    }).cue,
    'body-impact',
  );
});

void test('decisive impact cues bypass body cooldown and preserve priority', () => {
  const aggregate = chooseHitConfirmation([
    'body',
    'headshot',
    'kill',
    'headshot-kill',
    'body',
  ]);
  const decision = selectPlayerImpactCue({
    confirmation: aggregate,
    nowMs: 500,
    nextBodyImpactAtMs: 2000,
  });
  assert.equal(decision.cue, 'headshot-kill-impact');
  assert.equal(decision.nextBodyImpactAtMs, 2000);

  const freshDecision = selectPlayerImpactCue({
    confirmation: 'kill',
    nowMs: 500,
    nextBodyImpactAtMs: 0,
  });
  assert.equal(
    freshDecision.nextBodyImpactAtMs,
    500 + DECISIVE_IMPACT_BODY_GATE_MS,
  );
});

void test('null and invalid impact timing stay silent and safe', () => {
  assert.deepEqual(
    selectPlayerImpactCue({
      confirmation: null,
      nowMs: 100,
      nextBodyImpactAtMs: 40,
    }),
    { cue: null, nextBodyImpactAtMs: 40 },
  );
  assert.deepEqual(
    selectPlayerImpactCue({
      confirmation: 'body',
      nowMs: Number.NaN,
      nextBodyImpactAtMs: Number.POSITIVE_INFINITY,
    }),
    { cue: null, nextBodyImpactAtMs: 0 },
  );
});

void test('combat feedback profiles are brief, finite, and restrained', () => {
  const cues: PlayerImpactCue[] = [
    'body-impact',
    'head-impact',
    'kill-impact',
    'headshot-kill-impact',
  ];
  cues.forEach((cue) => {
    const profile = getCombatFeedbackSoundProfile(cue);
    assert.ok(Object.values(profile).every(Number.isFinite));
    assert.ok(profile.durationSeconds > 0 && profile.durationSeconds <= 0.115);
    assert.ok(profile.highpassHz > 0);
    assert.ok(profile.lowpassHz > profile.highpassHz);
    assert.ok(profile.noiseGain > 0 && profile.noiseGain <= 0.075);
    assert.ok(profile.toneGain >= 0 && profile.toneGain <= 0.022);
  });
  assert.equal(getCombatFeedbackSoundProfile('body-impact').toneGain, 0);
  assert.ok(
    getCombatFeedbackSoundProfile('kill-impact').durationSeconds >
      getCombatFeedbackSoundProfile('body-impact').durationSeconds,
  );
});

void test('bot death thuds require active audible living-listener timing', () => {
  const valid = {
    active: true,
    listenerAlive: true,
    audible: true,
    nowMs: 1000,
    nextDeathThudAtMs: 1000,
  };
  assert.equal(shouldEmitBotDeathThud(valid), true);
  assert.equal(shouldEmitBotDeathThud({ ...valid, active: false }), false);
  assert.equal(
    shouldEmitBotDeathThud({ ...valid, listenerAlive: false }),
    false,
  );
  assert.equal(shouldEmitBotDeathThud({ ...valid, audible: false }), false);
  assert.equal(shouldEmitBotDeathThud({ ...valid, nowMs: 999 }), false);
  assert.equal(shouldEmitBotDeathThud({ ...valid, nowMs: Number.NaN }), false);
  assert.equal(BOT_DEATH_THUD_COOLDOWN_MS, 90);
  assert.equal(BOT_DEATH_HEARING_RADIUS, 26);
});
