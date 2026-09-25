import assert from 'node:assert/strict';
import { assertFirearmRuntimeObservation, assertFirearmEarlyEquipRejection } from './firearm-runtime-observation.mjs';
import { platform, release, arch } from 'node:os';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(scriptPath), '..');
const { values } = parseArgs({ options: {
  url: { type: 'string', default: 'http://localhost:3037' },
  out: { type: 'string' },
  cases: { type: 'string', default: 'glock18-12-5-torso,shotgun-12-5-torso' },
} });
const origin = new URL(values.url);
if (!['localhost', '127.0.0.1'].includes(origin.hostname)) {
  throw new Error('JKH-131 firearm runtime verification requires localhost');
}

const servedIdentity = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
  pageSha256: createHash('sha256').update(await readFile(join(projectRoot, 'app/page.tsx'))).digest('hex'),
};
const sourceHashes = {
  pageTsx: servedIdentity.pageSha256,
  firearmRuntimeFixtureTs: createHash('sha256').update(
    await readFile(join(projectRoot, 'app/firearm-runtime-fixture.ts')),
  ).digest('hex'),
  observationOracle: createHash('sha256').update(await readFile(join(projectRoot, 'scripts/firearm-runtime-observation.mjs'))).digest('hex'),
  verifier: createHash('sha256').update(await readFile(scriptPath)).digest('hex'),
};
const runId = new Date().toISOString().replaceAll(':', '-');
const output = resolve(
  values.out ?? join(projectRoot, 'outputs/jkh-131/runtime', `${runId}-${servedIdentity.revision.slice(0, 12)}`),
);
await mkdir(dirname(output), { recursive: true });
await mkdir(output);

const requestedCases = values.cases.split(',').map((value) => value.trim()).filter(Boolean);
const report = {
  scope: 'Ordinary bundled headed Chromium input. Controlled setup is only the finite localhost fixture. The driver never calls production actions or visual-tool dispatch.',
  command: process.argv,
  origin: origin.href,
  servedIdentity,
  sourceHashes,
  environment: { node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(), platform: platform(), release: release(), arch: arch(), browserExecutable: chromium.executablePath(), browserVersion: null },
  requestedCases,
  viewport: { width: 1280, height: 720 },
  cases: [],
  diagnostics: [],
  responses: [],
  errors: [],
  status: 'incomplete',
};

const writeJson = (name, value) => writeFile(join(output, name), JSON.stringify(value, null, 2));

async function runCase(caseId) {
  const browser = await chromium.launch({
    channel: 'chromium',
    headless: false,
    args: [
      '--use-gl=angle', '--use-angle=gl', '--use-cmd-decoder=passthrough',
      '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });
  report.environment.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: report.viewport });
  const page = await context.newPage();
  const result = { caseId, status: 'incomplete', setup: null, events: [], terminal: null, error: null };
  const readReceipt = () => page.locator('#jkh-131-firearm-runtime-receipt').textContent().then((text) => {
    assert.ok(text, 'missing JKH-131 runtime receipt');
    return JSON.parse(text);
  });
  const readClock = () => page.evaluate(() => window.dustlineVisualTools.snapshot().runtime.simulationNowMs);
  const capture = async (name) => {
    const snapshotReadStartedAt = new Date().toISOString();
    const snapshot = await page.evaluate(() => window.dustlineVisualTools.snapshot());
    const snapshotCapturedAt = new Date().toISOString();
    const domReadStartedAt = new Date().toISOString();
    const receipt = await readReceipt();
    const visibleDom = await page.locator('body').innerText();
    const domCapturedAt = new Date().toISOString();
    const screenshot = join(output, `${caseId}-${name}.png`);
    const screenshotStartedAt = new Date().toISOString();
    await page.screenshot({ path: screenshot, timeout: 60_000 });
    const screenshotCapturedAt = new Date().toISOString();
    const pngSha256 = createHash('sha256').update(await readFile(screenshot)).digest('hex');
    const captureTiming = {
      snapshotReadStartedAt,
      snapshotCapturedAt,
      snapshotSimulationNowMs: snapshot.runtime.simulationNowMs,
      domReadStartedAt,
      domCapturedAt,
      receiptSimulationNowMs: receipt.latest.event.simulationNowMs,
      screenshotStartedAt,
      screenshotCapturedAt,
    };
    await writeJson(`${caseId}-${name}.json`, {
      sourceHashes,
      captureTiming,
      snapshot,
      receipt,
      visibleDom,
      pngSha256,
    });
    return { name, receipt, screenshot, pngSha256, captureTiming };
  };
  try {
    page.on('pageerror', (error) => report.errors.push({ caseId, type: 'pageerror', message: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error') report.diagnostics.push({ caseId, text: message.text(), location: message.location() });
    });
    page.on('response', (response) => {
      if (response.status() >= 400) report.responses.push({ caseId, url: response.url(), status: response.status() });
    });
    const url = new URL(origin);
    url.searchParams.set('keyboard-playtest', '1');
    url.searchParams.set('visual-tools', '1');
    url.searchParams.set('firearm-runtime-fixture', '1');
    url.searchParams.set('case', caseId);
    await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForFunction(() => Boolean(window.dustlineVisualTools), null, { timeout: 60_000 });
    await page.bringToFront();
    await page.getByRole('button', { name: 'START KEYBOARD PLAYTEST' }).click();
    await page.waitForFunction(() => document.querySelector('#jkh-131-firearm-runtime-receipt')?.textContent, null, { timeout: 60_000 });
    result.setup = await capture('setup');
    const setup = result.setup.receipt.latest;
    assert.equal(setup.fixture.seedRequested, 1947);
    assert.equal(setup.fixture.seedObserved, 1947, 'the requested fixture seed must be observed');
    assert.equal(setup.fixture.setupComplete, true);
    assert.equal(setup.buildIdentity.revision, servedIdentity.revision, 'served revision mismatch');
    assert.equal(setup.buildIdentity.pageSha256, servedIdentity.pageSha256, 'served page hash mismatch');
    assert.equal(setup.fixture.caseId, caseId);
    assert.equal(setup.viewport.width, 1280);
    assert.equal(setup.viewport.height, 720);
    assert.equal(setup.viewport.quality, 'high');
    assert.equal(setup.viewport.fixedStepMs, 10);
    const weapon = setup.fixture.weapon;
    const key = ['rifle', 'carbine', 'smg', 'shotgun', 'sniper'].includes(weapon) ? 'Digit1' : 'Digit2';
    await page.waitForFunction(() => window.dustlineVisualTools.snapshot().runtime.simulationNowMs >= 5_000, null, { timeout: 60_000 });
    const selectionSequence = setup.event.sequence;
    await page.keyboard.press(key);
    await page.waitForFunction(
      (sequence) => {
        const text = document.querySelector('#jkh-131-firearm-runtime-receipt')?.textContent;
        return Boolean(text) && JSON.parse(text).latest.event.sequence > sequence;
      },
      selectionSequence,
      { timeout: 60_000 },
    );
    const equipped = { name: 'equipped', receipt: await readReceipt(), screenshot: null };
    await writeJson(`${caseId}-equipped.json`, { receipt: equipped.receipt, visibleDom: await page.locator('body').innerText() });
    result.events.push(equipped);
    assert.equal(equipped.receipt.latest.event.outcome, 'committed');
    const beforeEarlyFire = equipped.receipt.latest;
    const equipSequence = equipped.receipt.latest.event.sequence;
    await page.keyboard.press('KeyF');
    await page.waitForFunction(
      (sequence) => {
        const text = document.querySelector('#jkh-131-firearm-runtime-receipt')?.textContent;
        if (!text) {
          return false;
        }
        const latest = JSON.parse(text).latest.event;
        return latest.sequence > sequence && latest.input === 'KeyF' && latest.outcome !== 'queued';
      },
      equipSequence,
      { timeout: 60_000 },
    );
    const earlyFire = await capture('early-fire');
    result.events.push(earlyFire);
    assertFirearmEarlyEquipRejection(beforeEarlyFire, earlyFire.receipt.latest, weapon, key);
    const equipReadyAtMs = equipped.receipt.latest.player.equipReadyAtMs;
    await page.waitForFunction(
      (readyAt) => window.dustlineVisualTools.snapshot().runtime.simulationNowMs >= readyAt,
      equipReadyAtMs,
      { timeout: 60_000 },
    );
    // AWP's unscoped spread cannot establish a requested hit zone reliably.
    // Scope using the ordinary secondary input, and retain its actual receipt.
    if (weapon === 'sniper') {
      await page.keyboard.press('KeyV');
      await page.waitForFunction(() => {
        const text = document.querySelector('#jkh-131-firearm-runtime-receipt')?.textContent;
        if (!text) {
          return false;
        }
        return JSON.parse(text).latest.player.special.zoom === 1;
      }, null, { timeout: 60_000 });
      const scoped = await capture('scoped');
      result.events.push(scoped);
      const scopeReadyAt = scoped.receipt.latest.event.simulationNowMs + 300;
      await page.waitForFunction(
        (readyAt) => window.dustlineVisualTools.snapshot().runtime.simulationNowMs >= readyAt,
        scopeReadyAt,
        { timeout: 60_000 },
      );
    }
    const clockBeforeShot = await readClock();
    const earlySequence = earlyFire.receipt.latest.event.sequence;
    await page.keyboard.press('KeyF');
    await page.waitForFunction(
      (before) => window.dustlineVisualTools.snapshot().runtime.simulationNowMs > before,
      clockBeforeShot,
      { timeout: 60_000 },
    );
    await page.waitForFunction(
      (sequence) => {
        const text = document.querySelector('#jkh-131-firearm-runtime-receipt')?.textContent;
        if (!text) {
          return false;
        }
        const latest = JSON.parse(text).latest.event;
        return latest.sequence > sequence && latest.input === 'KeyF' && latest.outcome !== 'queued';
      },
      earlySequence,
      { timeout: 60_000 },
    );
    const fired = await capture('fired');
    result.events.push(fired);
    // Automatic firearms can attempt their next held-fire decision in the same
    // tick. That later rejection is evidence, but cannot overwrite the
    // accepted `shoot` receipt being verified here.
    const committedShot = [...fired.receipt.events].reverse().find((event) =>
      event.event.sequence > earlySequence &&
      event.event.outcome === 'committed' &&
      event.details.caller === 'shoot',
    );
    assert.ok(committedShot, 'missing committed production shoot receipt');
    assert.equal(committedShot.details.caller, 'shoot');
    assert.ok(Array.isArray(committedShot.details.rays), 'missing actual ray observations');
    assert.ok(committedShot.details.rays.length > 0, 'the production shot emitted no ray observations');
    result.observation = assertFirearmRuntimeObservation(setup.fixture, beforeEarlyFire.target, committedShot);
    assert.equal(
      committedShot.player.ammo.magazine,
      beforeEarlyFire.player.ammo.magazine - 1,
      'accepted fire did not consume one round',
    );
    result.terminal = fired;
    result.status = 'passed';
  } catch (error) {
    result.error = String(error);
    try { result.terminal = await capture('terminal-failure'); } catch { /* preserve the primary error */ }
    result.status = 'failed';
  } finally {
    await context.close();
    await browser.close();
  }
  return result;
}

try {
  assert.ok(requestedCases.length > 0, 'at least one case is required');
  assert.equal(new Set(requestedCases).size, requestedCases.length, 'duplicate case IDs');
  for (const caseId of requestedCases) {
    report.cases.push(await runCase(caseId));
  }
  report.responses = report.responses.map((response) => ({
    ...response,
    disposition: response.url.endsWith('/favicon.ico') ? 'optional favicon 404' : 'unexpected HTTP failure',
  }));
  report.diagnostics = report.diagnostics.map((diagnostic) => ({
    ...diagnostic,
    disposition: diagnostic.text === 'Failed to load resource: the server responded with a status of 404 (Not Found)' &&
      diagnostic.location.url.endsWith('/favicon.ico') ? 'optional favicon 404' : 'unexpected console error',
  }));
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.responses.filter((response) => response.disposition !== 'optional favicon 404'), []);
  assert.deepEqual(report.diagnostics.filter((diagnostic) => diagnostic.disposition !== 'optional favicon 404'), []);
  assert.ok(report.cases.every((entry) => entry.status === 'passed'), 'one or more runtime cases failed');
  report.status = 'passed';
} catch (error) {
  report.errors.push(String(error));
  report.status = 'failed';
} finally {
  await writeJson('report.json', report);
}
console.log(join(output, 'report.json'));
if (report.status !== 'passed') {
  process.exitCode = 1;
}
