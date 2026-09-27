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
  throw new Error('runtime lifecycle smoke requires localhost');
const runId = new Date().toISOString().replaceAll(':', '-');
const output = resolve(values.out ?? join(projectRoot, 'outputs/jkh-130', `runtime-lifecycle-${runId}`));
await mkdir(dirname(output), { recursive: true });
await mkdir(output);
const expectedIdentity = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
  pageSha256: createHash('sha256').update(await readFile(join(projectRoot, 'app/page.tsx'))).digest('hex'),
};
const report = {
  scope: 'Controlled lifecycle-QA setup: one production endRound/resetRound transition and timer. It does not establish an ordinary natural round transition.',
  expectedIdentity, errors: [], status: 'incomplete', before: null, transition: null,
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
  url.searchParams.set('lifecycle-qa', '1');
  await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.dustlineVisualTools), null, { timeout: 60_000 });
  await page.getByRole('button', { name: 'RUN MATCH LIFECYCLE REPLAY' }).click();
  await page.waitForFunction(() => {
    const text = document.querySelector('details pre')?.textContent;
    if (!text) return false;
    try {
      return JSON.parse(text).checkpoints?.some((checkpoint) =>
        checkpoint.scenario === 'regulation-16-14' &&
        checkpoint.round === 1 &&
        checkpoint.stage === 'prepared');
    } catch {
      return false;
    }
  }, null, { timeout: 30_000 });
  report.before = await page.evaluate(() => window.dustlineVisualTools.snapshot());
  report.transition = await page.evaluate(() => ({
    snapshot: window.dustlineVisualTools.snapshot(),
    evidence: JSON.parse(document.querySelector('details pre')?.textContent ?? '{}'),
    output: document.querySelector('output')?.textContent ?? '',
  }));
  assert.equal(report.transition.snapshot.buildIdentity.revision, expectedIdentity.revision);
  assert.equal(report.transition.snapshot.buildIdentity.pageSha256, expectedIdentity.pageSha256);
  const prepared = report.transition.evidence.checkpoints.find((checkpoint) =>
    checkpoint.scenario === 'regulation-16-14' &&
    checkpoint.round === 1 &&
    checkpoint.stage === 'prepared');
  assert.ok(prepared, 'missing regulation-16-14 round 1 prepared checkpoint');
  assert.equal(prepared.state.status, 'active');
  assert.equal(prepared.state.health, 100);
  assert.equal(prepared.state.roundSeconds, 105);
  assert.equal(prepared.state.freezeSeconds, 5);
  assert.match(report.transition.output, /regulation-16-14: round [12]\/30/);
  assert.deepEqual(report.errors, []);
  await page.locator('canvas').first().screenshot({ path: join(output, 'after-round-one-prepared.png'), animations: 'disabled' });
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
