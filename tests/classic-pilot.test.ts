import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getClassicStatusMessage, getClassicRoundAssignment } from '../app/classic-hud.ts';
import { createClassicUspSamples, CLASSIC_USP_EVENT_SECONDS, type ClassicUspEvent } from '../app/classic-usp-audio.ts';
import { getGraphicsQaPreset } from '../app/graphics-qa.ts';
import { getMapSupportHeight } from '../app/dust2-map.ts';

void test('classic status conceals hidden action/site intel while preserving own actions and global result', () => {
  for (const message of ['BOMB BEING PLANTED AT A — 55%', 'VIPER PLANTING AT A',
    'DEFENDER DEFUSING — 20%', 'ATTACKERS MOVING TOWARD SITE B', 'ROOK RECOVERED THE BOMB'])
    assert.equal(getClassicStatusMessage(message, false, false), '');
  assert.equal(getClassicStatusMessage('PLANTING C4 — 20%', true, false), 'PLANTING C4 — 20%');
  assert.equal(getClassicStatusMessage('DEFUSING — 10%', false, true), 'DEFUSING — 10%');
  assert.equal(getClassicStatusMessage('BOMB PLANTED AT B', false, false), 'The bomb has been planted.');
  assert.equal(getClassicStatusMessage('FREEZE 4 — DIRECT HOLD B', false, false), 'FREEZE 4');
  assert.equal(getClassicStatusMessage('CT SQUAD ELIMINATED', false, false), 'CT SQUAD ELIMINATED');
  assert.equal(getClassicStatusMessage('C4 PICKED UP — PRESS 5 TO EQUIP', false, false), 'C4 PICKED UP — PRESS 5 TO EQUIP');
});

void test('five authored USP samples are deterministic, distinct, finite and tapered at both sample rates', () => {
  for (const rate of [44100, 48000]) {
    const hashes = new Set<string>();
    for (const event of Object.keys(CLASSIC_USP_EVENT_SECONDS) as ClassicUspEvent[]) {
      const a = createClassicUspSamples(event, rate), b = createClassicUspSamples(event, rate);
      assert.deepEqual(a, b);
      assert.equal(a.length, Math.ceil(rate * CLASSIC_USP_EVENT_SECONDS[event]));
      assert.equal(Math.abs(a[0]), 0);
      assert.equal(Math.abs(a[a.length - 1]), 0);
      let energy = 0;
      for (const sample of a) { assert.ok(Number.isFinite(sample) && Math.abs(sample) <= 1); energy += sample * sample; }
      assert.ok(energy / a.length > 0.00001);
      hashes.add(createHash('sha256').update(new Uint8Array(a.buffer)).digest('hex'));
    }
    assert.equal(hashes.size, 5);
  }
  assert.notDeepEqual(createClassicUspSamples('fire', 48000, 0.18, 0), createClassicUspSamples('fire', 48000, 0.18, 1));
  for (const rate of [NaN, Infinity, 0, 200000]) assert.throws(() => createClassicUspSamples('fire', rate), RangeError);
});

void test('pilot camera poses remain on the actual long route and are localhost-only', () => {
  for (const name of ['dust2-long-doors', 'dust2-long', 'dust2-a']) {
    const pose = getGraphicsQaPreset(`?visual-qa=${name}`, 'localhost')!;
    assert.ok(pose);
    const [x,y,z] = pose.position;
    assert.ok(Math.abs(y - 1.68 - getMapSupportHeight(x,z,y)) < 1e-12);
    assert.equal(getGraphicsQaPreset(`?visual-qa=${name}`, 'example.com'), null);
  }
});

void test('page removes enemy radar/hit-marker presentation and uses shared pilot assets without changing physical materials', () => {
  const page = readFileSync(process.env.CS16_PILOT_PAGE ?? new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /radarSpottedUntilMs|radarLastKnownPosition|hit-confirmation|showHitConfirmation|hitConfirmationTimer|setHitConfirmation/);
  assert.match(page, /radarContacts: bots\.filter\(bot => shouldShowRadarContact\(bot\)\)/);
  assert.doesNotMatch(page, /Radar showing[^\n]*hostiles/);
  assert.match(page, /hud\.playerAlive && hud\.playerHasBomb && hud\.bombState === 'planting'/);
  assert.match(page, /\[DUST2_GEOMETRY\.walls, sand, cutStone\]/);
  assert.match(page, /\[DUST2_GEOMETRY\.floors, darkSand, sand\]/);
  assert.match(page, /new THREE\.Mesh\(proxyGeometry, material\)/);
  assert.match(page, /new THREE\.Mesh\(shellGeometry, visualMaterial\)/);
  assert.match(page, /getInteractionBuffer\(`\$\{weaponKind\}\.fire`, profile\.duration, 0\)/);
  assert.match(page, /getInteractionBuffer\(`\$\{weaponKind\}\.\$\{action\}`, profile\.duration\)/);
  assert.match(page, /getClassicUspBuffer\('bodyImpact'/);
  assert.match(page, /\(silenced \? 0\.35 : 1\)/);
});

void test('next-round assignment never discloses the attacker plan to defenders', () => {
  for (const site of ['A', 'B']) {
    for (const approach of ['direct', 'split']) {
      assert.equal(getClassicRoundAssignment('ct', approach, site), 'DEFEND SITES A AND B');
      assert.equal(getClassicRoundAssignment('t', approach, site), `${approach.toUpperCase()} · SITE ${site}`);
    }
  }
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /getClassicRoundAssignment\(hud.roundTransition.next.playerSide/);
  assert.doesNotMatch(page, /: hud\.message}/);
});
