/**
 * Capture two production-renderer snapshots and verify that every initially
 * living bot's served skeleton changes by an internal pairwise-bone distance.
 *
 * This harness uses only the existing localhost visual-tool adapter. It does
 * not write bot, pose, or renderer state; the adapter resets and advances the
 * production fixed-step simulation exactly as visual replay already does.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  assertNoBrowserErrors,
  assertSnapshotBuildIdentity,
  assertStableLivingBotSubjects,
} from './live-skeleton-sampling-contract.mjs';
import { withBrowserPage } from './live-skeleton-capture-lifecycle.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3003' },
    out: { type: 'string' },
    seed: { type: 'string', default: '1947' },
    'expect-articulation': { type: 'string', default: 'present' },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(
    'Capture live production-renderer bot skeleton snapshots. Example:\n' +
      '  node scripts/verify-live-skeleton-sampling.mjs --url http://localhost:3003 --out outputs/jkh-129/live-skeleton',
  );
  process.exit(0);
}

const origin = new URL(values.url);
if (
  !['localhost', '127.0.0.1'].includes(origin.hostname) ||
  !['http:', 'https:'].includes(origin.protocol)
)
  throw new Error('Live skeleton capture requires a localhost URL.');

const seed = Number(values.seed);
if (!Number.isInteger(seed) || seed < 0 || seed > 4_294_967_295)
  throw new Error('seed must be an unsigned 32-bit integer.');
if (!['present', 'absent'].includes(values['expect-articulation']))
  throw new Error('expect-articulation must be present or absent.');

const output = resolve(
  values.out ??
    join(
      projectRoot,
      'outputs/jkh-129',
      `live-skeleton-${new Date().toISOString().replaceAll(':', '-')}`,
    ),
);
await mkdir(dirname(output), { recursive: true });
await mkdir(output);

const captureTimesMs = [6000, 7000];
const expectedBuildIdentity = Object.freeze({
  schemaVersion: 1,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim(),
  pageSha256: createHash('sha256')
    .update(await readFile(join(projectRoot, 'app/page.tsx')))
    .digest('hex'),
});
const errors = [];
const cleanupErrors = [];
const snapshots = new Map();

function pairwiseBoneDistances(subject) {
  assert.ok(subject.pose.length > 1, `${subject.ownerId} has no articulated bones`);
  const distances = new Map();
  for (let firstIndex = 1; firstIndex < subject.pose.length; firstIndex += 1) {
    const first = subject.pose[firstIndex];
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < subject.pose.length;
      secondIndex += 1
    ) {
      const second = subject.pose[secondIndex];
      distances.set(
        `${first.name}\u0000${second.name}`,
        Math.hypot(
          first.worldPosition[0] - second.worldPosition[0],
          first.worldPosition[1] - second.worldPosition[1],
          first.worldPosition[2] - second.worldPosition[2],
        ),
      );
    }
  }
  return distances;
}

function maximumPairwiseBoneDistanceDelta(first, second) {
  const firstDistances = pairwiseBoneDistances(first);
  const secondDistances = pairwiseBoneDistances(second);
  let maximum = 0;
  for (const [pair, firstDistance] of firstDistances) {
    const secondDistance = secondDistances.get(pair);
    if (secondDistance === undefined) continue;
    const delta = Math.abs(firstDistance - secondDistance);
    maximum = Math.max(maximum, delta);
  }
  return maximum;
}

const report = {
  schemaVersion: 1,
  purpose:
    'Observe production-renderer skeleton articulation without writing pose or bot state.',
  source: {
    served: {
      expected: expectedBuildIdentity,
      observed: null,
    },
    harness: null,
  },
  settings: {
    url: origin.href,
    viewport: { width: 1280, height: 720 },
    quality: 'high',
    seed,
    captureTimesMs,
    articulationThreshold: 0.0001,
    expectedArticulation: values['expect-articulation'],
  },
  captures: [],
  verdict: 'incomplete',
  errors,
};

try {
  await withBrowserPage({
    launchBrowser: () =>
      chromium.launch({
        headless: true,
        args: ['--enable-webgl', '--ignore-gpu-blocklist'],
      }),
    createContext: (browser) =>
      browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
      }),
    createPage: (context) => context.newPage(),
    onCleanupError: (message) => {
      cleanupErrors.push(message);
      errors.push(message);
    },
    run: async (page) => {
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });

      const route = new URL(origin);
      route.searchParams.set('visual-tools', '1');
      route.searchParams.set('keyboard-playtest', '1');
      await page.goto(route.href, { waitUntil: 'networkidle', timeout: 60_000 });
      await page.waitForFunction(() => Boolean(window.dustlineVisualTools), null, {
        timeout: 60_000,
      });
      await page.evaluate((replaySeed) =>
        window.dustlineVisualTools.prepareReplay({ seed: replaySeed }), seed);

      for (const timestampMs of captureTimesMs) {
        const snapshot = await page.evaluate((targetMs) =>
          window.dustlineVisualTools.advanceReplayTo(targetMs), timestampMs);
        const id = `${String(timestampMs).padStart(5, '0')}ms`;
        const imagePath = join(output, `${id}.png`);
        await page.locator('canvas').first().screenshot({ path: imagePath });
        await writeFile(join(output, `${id}.snapshot.json`), JSON.stringify(snapshot, null, 2));
        snapshots.set(timestampMs, snapshot);
        report.captures.push({
          id,
          timestampMs,
          image: `${id}.png`,
          snapshot: `${id}.snapshot.json`,
          botSkeletons: snapshot.runtime?.botSkeletons ?? null,
        });
      }

      const firstSnapshot = snapshots.get(captureTimesMs[0]);
      const secondSnapshot = snapshots.get(captureTimesMs[1]);
      assert.ok(firstSnapshot, 'missing first live renderer snapshot');
      assert.ok(secondSnapshot, 'missing second live renderer snapshot');
      assertSnapshotBuildIdentity(firstSnapshot, expectedBuildIdentity);
      assertSnapshotBuildIdentity(secondSnapshot, expectedBuildIdentity);
      report.source.served.observed = firstSnapshot.buildIdentity;
      const subjects = assertStableLivingBotSubjects(firstSnapshot, secondSnapshot);
      const articulation = subjects.map(({ ownerId, team, first, second }) => {
        return {
          ownerId,
          team,
          maximumPairwiseBoneDistanceDelta:
            maximumPairwiseBoneDistanceDelta(first, second),
        };
      });
      for (const subject of articulation) {
        const articulated =
          subject.maximumPairwiseBoneDistanceDelta >
          report.settings.articulationThreshold;
        assert.equal(
          articulated,
          report.settings.expectedArticulation === 'present',
          `${subject.ownerId} articulation did not match ${report.settings.expectedArticulation}`,
        );
      }
      assertNoBrowserErrors(errors);
      report.articulation = articulation;
    },
  });
  assert.deepEqual(cleanupErrors, [], 'browser setup cleanup failed');
  report.verdict = 'pass';
} catch (error) {
  report.errors.push(String(error));
  report.verdict = 'fail';
} finally {
  report.source.harness = {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim(),
    scriptSha256: createHash('sha256')
      .update(await readFile(fileURLToPath(import.meta.url)))
      .digest('hex'),
  };
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(join(output, 'report.json'));
if (report.verdict !== 'pass') process.exitCode = 1;
