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
const output = resolve(values.out ?? join(projectRoot, 'outputs/jkh-130', `runtime-input-${runId}`));
await mkdir(dirname(output), { recursive: true });
await mkdir(output);
const expectedIdentity = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
  pageSha256: createHash('sha256').update(await readFile(join(projectRoot, 'app/page.tsx'))).digest('hex'),
};
const report = {
  scope: 'Ordinary keyboard START, W, F, and Escape input against the running page. Visual tools are read-only snapshots only; no replay prepare/dispatch API is used.',
  expectedIdentity, errors: [], status: 'incomplete', started: null, moved: null, fired: null, paused: null, laterPaused: null,
};
let browser;
let context;
let page;
try {
  browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  context = await browser.newContext({ viewport: { width: 960, height: 720 } });
  page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') report.errors.push(message.text());
  });
  const url = new URL(origin);
  url.searchParams.set('visual-tools', '1');
  url.searchParams.set('keyboard-playtest', '1');
  await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.dustlineVisualTools), null, { timeout: 60_000 });
  await page.getByRole('button', { name: 'START KEYBOARD PLAYTEST' }).click();
  await page.waitForFunction(
    () => window.dustlineVisualTools.snapshot().runtime.simulationNowMs >= 5_000,
    null,
    { timeout: 60_000 },
  );
  report.started = await page.evaluate(() => window.dustlineVisualTools.snapshot());
  assert.equal(report.started.buildIdentity.revision, expectedIdentity.revision);
  assert.equal(report.started.buildIdentity.pageSha256, expectedIdentity.pageSha256);
  assert.equal(report.started.runtime.status, 'active');
  assert.equal(report.started.runtime.player.alive, true);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyW');
  report.moved = await page.evaluate(() => window.dustlineVisualTools.snapshot());
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(60);
  report.fired = await page.evaluate(() => window.dustlineVisualTools.snapshot());
  assert.ok(
    Math.hypot(
      ...report.moved.runtime.player.position.map(
        (value, index) => value - report.started.runtime.player.position[index],
      ),
    ) > 0.1,
  );
  assert.equal(
    report.fired.runtime.player.ammo.magazine,
    report.started.runtime.player.ammo.magazine - 1,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  report.paused = await page.evaluate(() => window.dustlineVisualTools.snapshot());
  await page.waitForTimeout(150);
  report.laterPaused = await page.evaluate(() => window.dustlineVisualTools.snapshot());
  assert.equal(report.paused.runtime.simulationNowMs, report.laterPaused.runtime.simulationNowMs);
  assert.deepEqual(report.paused.runtime.player, report.laterPaused.runtime.player);
  assert.deepEqual(report.errors, []);
  await page.locator('canvas').first().screenshot({ path: join(output, 'paused-after-real-input.png'), animations: 'disabled' });
  report.status = 'passed';
} catch (error) {
  report.errors.push(String(error));
  report.status = 'failed';
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await context?.close();
  await browser?.close();
}
console.log(join(output, 'report.json'));
if (report.status !== 'passed') process.exitCode = 1;
