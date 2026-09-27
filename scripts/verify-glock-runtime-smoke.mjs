import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: {
  url: { type: 'string', default: 'http://localhost:3036' }, out: { type: 'string' },
} });
const origin = new URL(values.url);
if (!['localhost', '127.0.0.1'].includes(origin.hostname))
  throw new Error('runtime input smoke requires localhost');
const runId = new Date().toISOString().replaceAll(':', '-');
const output = resolve(values.out ?? join(projectRoot, 'outputs/jkh-144', `runtime-input-${runId}`));
await mkdir(dirname(output), { recursive: true });
await mkdir(output);
const frozenProductRevision = '3c378cde6623ba446f5cfc2142e12cf3a19dfb3e';
const productPaths = [
  'app/authored-pistol-viewmodel.ts',
  'app/page.tsx',
  'app/secondary-weapon-models.ts',
  'assets/source/glock-reference',
  'public/assets/viewmodels/glock18.glb',
];
const productDiffPaths = execFileSync(
  'git', ['diff', '--name-only', frozenProductRevision, 'HEAD', '--', ...productPaths],
  { cwd: projectRoot, encoding: 'utf8' },
).trim().split('\n').filter(Boolean);
assert.deepEqual(productDiffPaths, [], 'the runtime harness must not change frozen product or asset inputs');
const expectedIdentity = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
  pageSha256: createHash('sha256').update(await readFile(join(projectRoot, 'app/page.tsx'))).digest('hex'),
};
const report = {
  scope: 'Ordinary bundled Chromium keyboard START, buy, equip, W, F, V, R, Digit3, Digit2, and Escape input against the running page. Visual tools are read-only snapshots only; no replay prepare/dispatch API or fixture/state injection is used.',
  expectedIdentity,
  productEquivalence: { frozenProductRevision, productPaths, productDiffPaths },
  errors: [], diagnostics: [], responses: [], responseDisposition: [], diagnosticDisposition: [],
  status: 'incomplete', started: null, moved: null,
  singleShot: null, burstMode: null, burstLockReleased: null, burstShot: null,
  reloadStarted: null, reload: null, equipped: null, stowed: null, reequipped: null,
  paused: null, laterPaused: null, terminal: null,
};
let browser;
let context;
let page;
const readState = () => page.evaluate(() => ({
  snapshot: window.dustlineVisualTools.snapshot(),
  visibleDom: document.body.innerText,
}));
const captureTerminal = async (name) => {
  if (!page) return;
  const stateFile = join(output, `${name}.json`);
  const imageFile = join(output, `${name}.png`);
  try {
    const state = await readState();
    await writeFile(stateFile, JSON.stringify(state, null, 2));
    report.terminal = { name, stateFile, imageFile, screenshotError: null };
    try {
      const dataUrl = await page.locator('canvas').first().evaluate((canvas) => canvas.toDataURL('image/png'));
      await writeFile(imageFile, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
    } catch (screenshotError) {
      report.terminal.screenshotError = String(screenshotError);
    }
  } catch (captureError) {
    report.errors.push(`terminal capture: ${String(captureError)}`);
  }
};
try {
  browser = await chromium.launch({
    headless: false,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  context = await browser.newContext({ viewport: { width: 960, height: 720 } });
  page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') report.diagnostics.push({
      text: message.text(),
      location: message.location(),
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) report.responses.push({ url: response.url(), status: response.status() });
  });
  const url = new URL(origin);
  url.searchParams.set('visual-tools', '1');
  url.searchParams.set('keyboard-playtest', '1');
  await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.dustlineVisualTools), null, { timeout: 60_000 });
  await page.bringToFront();
  await page.getByRole('button', { name: 'START KEYBOARD PLAYTEST' }).click();
  await page.waitForFunction(
    () => window.dustlineVisualTools.snapshot().runtime.simulationNowMs >= 5_000,
    null,
    { timeout: 60_000 },
  );
  report.started = await readState();
  assert.equal(report.started.snapshot.buildIdentity.revision, expectedIdentity.revision);
  assert.equal(report.started.snapshot.buildIdentity.pageSha256, expectedIdentity.pageSha256);
  assert.equal(report.started.snapshot.runtime.status, 'active');
  assert.equal(report.started.snapshot.runtime.player.alive, true);
  await page.keyboard.press('KeyB');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Digit1');
  await page.keyboard.up('Shift');
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyY');
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(100);
  await page.keyboard.press('Digit2');
  // Let the real Glock equip lock expire in simulation time before firing.
  await page.waitForFunction(
    () => window.dustlineVisualTools.snapshot().runtime.simulationNowMs >= 5_500,
    null,
    { timeout: 60_000 },
  );
  report.equipped = await readState();
  assert.equal(report.equipped.snapshot.runtime.player.activeWeapon, 'glock18');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyW');
  report.moved = await readState();
  const magazineBeforeSingle = report.moved.snapshot.runtime.player.ammo.magazine;
  await page.keyboard.down('KeyF');
  await page.waitForTimeout(100);
  await page.keyboard.up('KeyF');
  await page.waitForTimeout(60);
  report.singleShot = await readState();
  assert.ok(
    Math.hypot(
      ...report.moved.snapshot.runtime.player.position.map(
        (value, index) => value - report.started.snapshot.runtime.player.position[index],
      ),
    ) > 0.05,
  );
  assert.equal(report.singleShot.snapshot.runtime.player.ammo.magazine, magazineBeforeSingle - 1);
  await page.keyboard.press('KeyV');
  await page.waitForFunction(
    () => document.body.innerText.includes('BURST-FIRE MODE'),
    null,
    { timeout: 60_000 },
  );
  report.burstMode = await readState();
  assert.match(report.burstMode.visibleDom, /BURST-FIRE MODE/);
  const burstToggleAtMs = report.burstMode.snapshot.runtime.simulationNowMs;
  await page.waitForFunction(
    (atMs) => window.dustlineVisualTools.snapshot().runtime.simulationNowMs >= atMs + 300,
    burstToggleAtMs,
    { timeout: 60_000 },
  );
  report.burstLockReleased = await readState();
  assert.ok(report.burstLockReleased.snapshot.runtime.simulationNowMs >= burstToggleAtMs + 300);
  const magazineBeforeBurst = report.burstLockReleased.snapshot.runtime.player.ammo.magazine;
  await page.keyboard.down('KeyF');
  await page.waitForTimeout(100);
  await page.keyboard.up('KeyF');
  await page.waitForFunction(
    (magazineBeforeBurst) => window.dustlineVisualTools.snapshot().runtime.player.ammo.magazine === magazineBeforeBurst - 3,
    magazineBeforeBurst,
    { timeout: 60_000 },
  );
  report.burstShot = await readState();
  assert.equal(report.burstShot.snapshot.runtime.player.activeWeapon, 'glock18');
  assert.equal(report.burstShot.snapshot.runtime.player.ammo.magazine, magazineBeforeBurst - 3);
  const reloadMagazine = report.burstShot.snapshot.runtime.player.ammo.magazine;
  const reloadReserve = report.burstShot.snapshot.runtime.player.ammo.reserve;
  await page.keyboard.press('KeyR');
  await page.waitForFunction(() => document.body.innerText.includes('RELOADING'), null, { timeout: 60_000 });
  report.reloadStarted = await readState();
  assert.match(report.reloadStarted.visibleDom, /RELOADING/);
  await page.waitForFunction(
    ({ magazine, reserve }) => {
      const ammo = window.dustlineVisualTools.snapshot().runtime.player.ammo;
      return ammo?.magazine === 20 && ammo.reserve === reserve - (20 - magazine);
    },
    { magazine: reloadMagazine, reserve: reloadReserve },
    { timeout: 60_000 },
  );
  report.reload = await readState();
  assert.equal(report.reload.snapshot.runtime.player.activeWeapon, 'glock18');
  assert.equal(report.reload.snapshot.runtime.player.ammo.magazine, 20);
  assert.equal(report.reload.snapshot.runtime.player.ammo.reserve, reloadReserve - (20 - reloadMagazine));
  await page.keyboard.press('Digit3');
  await page.waitForFunction(() => window.dustlineVisualTools.snapshot().runtime.player.activeWeapon === 'knife', null, { timeout: 60_000 });
  report.stowed = await readState();
  assert.equal(report.stowed.snapshot.runtime.player.activeWeapon, 'knife');
  await page.keyboard.press('Digit2');
  await page.waitForFunction(() => window.dustlineVisualTools.snapshot().runtime.player.activeWeapon === 'glock18', null, { timeout: 60_000 });
  report.reequipped = await readState();
  assert.equal(report.reequipped.snapshot.runtime.player.activeWeapon, 'glock18');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  report.paused = await readState();
  await page.waitForTimeout(150);
  report.laterPaused = await readState();
  assert.equal(report.paused.snapshot.runtime.simulationNowMs, report.laterPaused.snapshot.runtime.simulationNowMs);
  assert.deepEqual(report.paused.snapshot.runtime.player, report.laterPaused.snapshot.runtime.player);
  report.responseDisposition = report.responses.map((response) => ({
    ...response,
    disposition: response.url.endsWith('/favicon.ico')
      ? 'pre-existing optional favicon request'
      : 'unexpected HTTP failure',
  }));
  assert.deepEqual(report.responseDisposition.filter((response) => response.disposition === 'unexpected HTTP failure'), []);
  report.diagnosticDisposition = report.diagnostics.map((diagnostic) => ({
    ...diagnostic,
    disposition: diagnostic.text === 'Failed to load resource: the server responded with a status of 404 (Not Found)' &&
      diagnostic.location.url.endsWith('/favicon.ico')
      ? 'pre-existing optional favicon request'
      : 'unexpected console error',
  }));
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.diagnosticDisposition.filter((diagnostic) => diagnostic.disposition === 'unexpected console error'), []);
  await page.locator('canvas').first().screenshot({ path: join(output, 'paused-after-real-input.png'), animations: 'disabled' });
  report.status = 'passed';
} catch (error) {
  report.errors.push(String(error));
  await captureTerminal('terminal-failure');
  report.status = 'failed';
} finally {
  if (!report.responseDisposition.length) report.responseDisposition = report.responses.map((response) => ({
    ...response,
    disposition: response.url.endsWith('/favicon.ico')
      ? 'pre-existing optional favicon request'
      : 'unexpected HTTP failure',
  }));
  if (!report.diagnosticDisposition.length) report.diagnosticDisposition = report.diagnostics.map((diagnostic) => ({
    ...diagnostic,
    disposition: diagnostic.text === 'Failed to load resource: the server responded with a status of 404 (Not Found)' &&
      diagnostic.location.url.endsWith('/favicon.ico')
      ? 'pre-existing optional favicon request'
      : 'unexpected console error',
  }));
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await context?.close();
  await browser?.close();
}
console.log(join(output, 'report.json'));
if (report.status !== 'passed') process.exitCode = 1;
