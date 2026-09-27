import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3036' },
    out: { type: 'string' },
    actor: { type: 'string' },
    fixture: { type: 'string' },
  },
});
const origin = new URL(values.url);
if (!['localhost', '127.0.0.1'].includes(origin.hostname))
  throw new Error('fall fixture verification requires localhost');
const runId = new Date().toISOString().replaceAll(':', '-');
const output = resolve(values.out ?? join(projectRoot, 'outputs/jkh-130', `fall-fixtures-${runId}`));
await mkdir(dirname(output), { recursive: true });
await mkdir(output);

const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: projectRoot,
  encoding: 'utf8',
}).trim();
const pageSha256 = createHash('sha256')
  .update(await import('node:fs/promises').then(({ readFile }) => readFile(join(projectRoot, 'app/page.tsx'))))
  .digest('hex');
const allFixtures = [
  ...['player', 'enemy', 'ally'].flatMap((actor) =>
    ['safe', 'damaging', 'lethal'].map((fixture) => ({ actor, fixture }))),
  { actor: 'carrier', fixture: 'lethal' },
  { actor: 'last-enemy', fixture: 'lethal' },
];
if (values.actor && !['player', 'enemy', 'ally', 'carrier', 'last-enemy'].includes(values.actor))
  throw new Error('actor must be player, enemy, ally, carrier, or last-enemy');
if (values.fixture && !['safe', 'damaging', 'lethal'].includes(values.fixture))
  throw new Error('fixture must be safe, damaging, or lethal');
const fixtures = allFixtures.filter(
  ({ actor, fixture }) =>
    (!values.actor || actor === values.actor) &&
    (!values.fixture || fixture === values.fixture),
);
if (!fixtures.length) throw new Error('no named fall fixtures selected');
const report = {
  scope: 'Controlled localhost setup followed by one ordinary production runSimulationTick; not normal-play fall evidence.',
  revision,
  expectedPageSha256: pageSha256,
  fixtures: [],
  errors: [],
  status: 'incomplete',
};
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist'],
});

try {
  for (const fixture of fixtures) {
    const context = await browser.newContext({ viewport: { width: 960, height: 720 } });
    const page = await context.newPage();
    const entry = { ...fixture, errors: [] };
    page.on('pageerror', (error) => entry.errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') entry.errors.push(message.text());
    });
    try {
      const url = new URL(origin);
      url.searchParams.set('visual-tools', '1');
      await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60_000 });
      await page.waitForFunction(() => Boolean(window.dustlineVisualTools), null, { timeout: 60_000 });
      entry.afterLanding = await page.evaluate(async (options) =>
        window.dustlineVisualTools.runFallFixture(options), fixture);
      entry.afterSettled = await page.evaluate(() =>
        window.dustlineVisualTools.advanceReplayTo(20));
      await page.locator('canvas').first().screenshot({
        path: join(output, `${fixture.actor}-${fixture.fixture}.png`),
        animations: 'disabled',
      });
      const runtime = entry.afterLanding.runtime;
      const controlled = runtime.controlledFallFixture;
      assert.equal(entry.afterLanding.buildIdentity.revision, revision);
      assert.equal(entry.afterLanding.buildIdentity.pageSha256, pageSha256);
      assert.equal(controlled.controlled, true);
      assert.equal(controlled.name, fixture.fixture);
      assert.ok(['player', 'enemy', 'ally'].includes(controlled.team));
      assert.equal(controlled.before.health, 100);
      assert.equal(controlled.after.armor, controlled.before.armor);
      assert.equal(controlled.after.helmet, controlled.before.helmet);
      assert.equal(controlled.fallCount, 1);
      assert.equal(entry.afterSettled.runtime.controlledFallFixture.fallCount, 1);
      const receipts = controlled.receipts;
      if (fixture.fixture === 'safe') {
        assert.deepEqual(receipts, []);
        assert.equal(controlled.after.health, 100);
        assert.equal(controlled.after.alive, true);
      } else if (fixture.fixture === 'damaging') {
        assert.equal(receipts.length, 1);
        assert.equal(receipts[0].healthDamage, 50);
        assert.equal(controlled.after.health, 50);
        assert.equal(controlled.after.alive, true);
      } else {
        assert.equal(receipts.length, 1);
        assert.equal(receipts[0].healthDamage, 100);
        assert.equal(controlled.after.health, 0);
        assert.equal(controlled.after.alive, false);
      }
      for (const receipt of receipts) {
        assert.equal(receipt.cause, 'fall');
        assert.equal(receipt.killerId, null);
        assert.deepEqual(receipt.creditLedger.after, receipt.creditLedger.before);
        assert.deepEqual(receipt.creditLedger.playerDelta, { kills: 0, money: 0 });
        assert.ok(receipt.creditLedger.botDeltas.every(
          (delta) => delta.kills === 0 && delta.money === 0,
        ));
        assert.deepEqual(receipt.buildIdentity, entry.afterLanding.buildIdentity);
      }
      if (fixture.actor === 'carrier') {
        assert.equal(receipts.length, 1);
        assert.equal(receipts[0].bombDropped, true);
      }
      if (fixture.actor === 'last-enemy') {
        assert.equal(receipts.length, 1);
        assert.equal(receipts[0].roundResult, 'T SQUAD ELIMINATED');
      }
      assert.deepEqual(entry.errors, []);
      entry.status = 'passed';
    } catch (error) {
      entry.status = 'failed';
      entry.error = String(error);
      report.errors.push(`${fixture.actor}:${fixture.fixture}: ${entry.error}`);
    } finally {
      report.fixtures.push(entry);
      await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
      await page.goto('about:blank', { waitUntil: 'load', timeout: 5_000 }).catch(() => undefined);
      await context.close();
    }
  }
  report.status = report.errors.length ? 'failed' : 'passed';
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(join(output, 'report.json'));
if (report.status !== 'passed') process.exitCode = 1;
