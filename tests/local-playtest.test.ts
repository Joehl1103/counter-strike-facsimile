import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getLocalPlaytestSide, isLocalFrameProfileEnabled, LocalFrameProfileCollector } from '../app/local-playtest.ts';

void test('starting side requires an explicit local keyboard playtest and defaults safely to CT', () => {
  assert.equal(getLocalPlaytestSide('?keyboard-playtest=1&playtest-side=t', 'localhost'), 't');
  assert.equal(getLocalPlaytestSide('?keyboard-playtest=1&playtest-side=t', '127.0.0.1'), 't');
  for (const search of ['', '?playtest-side=t', '?keyboard-playtest=1&playtest-side=invalid']) {
    assert.equal(getLocalPlaytestSide(search, 'localhost'), 'ct');
  }
  assert.equal(getLocalPlaytestSide('?keyboard-playtest=1&playtest-side=t', 'example.com'), 'ct');
  assert.equal(isLocalFrameProfileEnabled('?frame-profile=1', 'example.com'), false);
  assert.equal(isLocalFrameProfileEnabled('?frame-profile=1', 'localhost'), true);
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.equal(page.match(/createMatchState\(startingPlayerSide\)/g)?.length, 2);
});

void test('frame profiling measures uncapped real intervals and excludes inactive gaps', () => {
  const collector = new LocalFrameProfileCollector();
  let timestamp = 0;
  for (let interval = 0; interval <= 120; interval += 1) {
    assert.equal(collector.observe(timestamp, true), null);
    timestamp += 1000 / 60;
  }
  assert.equal(collector.observe(timestamp, false), null);
  timestamp += 5000;
  assert.equal(collector.observe(timestamp, true), null);
  let profile = null;
  for (let interval = 0; interval < 300; interval += 1) {
    timestamp += interval === 0 ? 100 : 1000 / 60;
    profile = collector.observe(timestamp, true);
  }
  assert.ok(profile);
  assert.equal(profile.intervalsMs.length, 300);
  assert.equal(profile.intervalsMs[0], 100);
  assert.ok(profile.meanFramesPerSecond < 59.5);
  assert.equal(profile.meetsTarget, false);
  assert.equal(collector.observe(timestamp + 100, true), null);
});
