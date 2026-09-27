import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { FIREARMS, type FirearmKind } from '../app/game-rules.ts';
import { createClassicInteractionSamples, getInteractionSampleDuration, INTERACTION_SAMPLE_KEYS } from '../app/classic-interaction-audio.ts';
import { createClassicUspSamples } from '../app/classic-usp-audio.ts';

void test('required firearm and equipment source bank is complete at both audio rates', () => {
  assert.equal(INTERACTION_SAMPLE_KEYS.length, 58);
  for (const weapon of Object.keys(FIREARMS) as FirearmKind[]) {
    for (const action of ['fire', 'dryFire', 'reloadStart', 'reloadCommit'] as const) {
      assert.ok(INTERACTION_SAMPLE_KEYS.includes(`${weapon}.${action}`));
    }
  }
  for (const sampleRate of [44100, 48000]) {
    const hashes = new Set<string>();
    for (const key of INTERACTION_SAMPLE_KEYS) {
      const samples = createClassicInteractionSamples(key, sampleRate);
      assert.deepEqual(samples, createClassicInteractionSamples(key, sampleRate), `${key} repeatability`);
      assert.equal(samples.length, Math.ceil(sampleRate * getInteractionSampleDuration(key)));
      assert.equal(Math.abs(samples[0]), 0);
      assert.equal(Math.abs(samples[samples.length - 1]), 0);
      let energy = 0;
      for (const sample of samples) {
        assert.ok(Number.isFinite(sample) && Math.abs(sample) <= 1, `${key} finite/peak bound`);
        energy += sample * sample;
      }
      assert.ok(energy / samples.length > 0.000001, `${key} must be audible source energy`);
      hashes.add(createHash('sha256').update(new Uint8Array(samples.buffer)).digest('hex'));
    }
    assert.equal(hashes.size, INTERACTION_SAMPLE_KEYS.length, 'every event has a distinct source');
  }
});

void test('USP pilot bytes and runtime durations survive generalized sample dispatch', () => {
  for (const sampleRate of [44100, 48000]) {
    for (const action of ['fire', 'dryFire', 'reloadStart', 'reloadCommit'] as const) {
      for (const variant of [0, 1]) {
        const key = `usp.${action}` as const;
        assert.deepEqual(createClassicInteractionSamples(key, sampleRate, undefined, variant),
          createClassicUspSamples(action, sampleRate, getInteractionSampleDuration(key), variant));
      }
    }
  }
  for (const sampleRate of [0, NaN, Infinity, 7999, 192001]) {
    assert.throws(() => createClassicInteractionSamples('rifle.fire', sampleRate), RangeError);
  }
  for (const duration of [0, NaN, Infinity, -1, 1.1]) {
    assert.throws(() => createClassicInteractionSamples('rifle.fire', 48000, duration), RangeError);
  }
});

void test('page uses cached shared authored sources at real weapon and equipment boundaries', () => {
  const page = readFileSync(process.env.CS16_INTERACTION_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  const slice = (start: string, end: string) => {
    const startIndex = page.indexOf(start);
    const endIndex = page.indexOf(end, startIndex);
    assert.ok(startIndex >= 0 && endIndex > startIndex, `missing ${start}`);
    return page.slice(startIndex, endIndex);
  };
  for (const [start, end] of [
    ['const prepareShotSoundBuffers =', 'const createSeededNoiseBuffer ='],
    ['const playEnemyShotSound =', 'const showEnemyTracer ='],
    ['const playExplosionSound =', 'const playFootstep ='],
  ]) {
    assert.match(slice(start, end), /getInteractionBuffer/);
    assert.doesNotMatch(slice(start, end), /Math.random\(|createBuffer\(/);
  }
  assert.match(slice('const playWeaponActionSound =', 'const emitOpponentReloadCue ='), /getInteractionBuffer/);
  assert.match(slice('const playObjectiveActionCue =', 'const emitBotObjectiveActionCue ='), /getInteractionBuffer/);
  assert.match(slice('const tryInsertGrenadeProjectile =', 'const throwGrenade ='), /playEquipmentSound\(`\$\{kind\}\.throw`, origin\)/);
  assert.match(page, /playEquipmentSound\(knifeStab \? 'knife.stab' : 'knife.swing'\)/);
  assert.match(slice('const detonateBomb =', 'const raycaster ='), /playExplosionSound\('bomb'\)/);
  assert.match(page, /: classicStatusMessage}/);
});
