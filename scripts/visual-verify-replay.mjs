import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
const { values } = parseArgs({
  options: { manifest: { type: 'string' }, help: { type: 'boolean' } },
});
if (values.help || !values.manifest) {
  console.log(
    'npm run visual:verify-replay -- --manifest outputs/visual-tools/RUN/manifest.json\nChecks actual ammo, reload completion, movement and pause outcomes in the default replay captures.',
  );
  process.exit(values.help ? 0 : 1);
}
const manifestPath = resolve(values.manifest);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const checks = [];
function check(name, verify) {
  try {
    verify();
    checks.push({ name, status: 'passed' });
  } catch (error) {
    checks.push({ name, status: 'failed', reason: error.message });
  }
}
function sample(time) {
  const frame = manifest.frames.find((frame) => frame.timestampMs === time);
  assert.ok(
    frame,
    `Required sample ${time}ms is missing; run the default replay timeline.`,
  );
  return frame.metadata;
}
check('Capture finished without browser errors', () => {
  assert.equal(manifest.status, 'captured');
  assert.deepEqual(manifest.errors, []);
  assert.ok(!manifest.console.some((message) => message.type === 'error'));
});
check('Both equips are visible in runtime state', () => {
  assert.equal(sample(6000).runtime.player.activeWeapon, 'knife');
  assert.equal(sample(6370).runtime.player.activeWeapon, 'usp');
});
check('Accepted first shot consumes one round', () => {
  assert.equal(
    sample(6800).runtime.player.ammo.magazine,
    sample(6370).runtime.player.ammo.magazine - 1,
  );
});
check('Reload starts and later replenishes ammunition', () => {
  assert.ok(sample(7200).viewmodel.action.reload);
  assert.equal(sample(9900).viewmodel.action.reload, null);
  assert.equal(sample(9900).runtime.player.ammo.magazine, 12);
  assert.equal(sample(9900).runtime.player.ammo.reserve, 23);
});
check('Firing after reload consumes a round', () =>
  assert.equal(sample(10050).runtime.player.ammo.magazine, 11),
);
check('Forward movement covers at least one scene unit', () => {
  const before = sample(7700).runtime.player.position;
  const after = sample(8210).runtime.player.position;
  assert.ok(
    Math.hypot(...after.map((value, index) => value - before[index])) > 1,
  );
});
check('Pause retains simulation time and player position', () => {
  const paused = sample(11000),
    later = sample(11500);
  assert.equal(paused.scenarioState.paused, true);
  assert.equal(later.runtime.simulationNowMs, paused.runtime.simulationNowMs);
  assert.deepEqual(later.runtime.player, paused.runtime.player);
  assert.deepEqual(later.camera, paused.camera);
});
const report = {
  scope:
    'Engineering outcomes only; no visual approval or real-time performance verdict',
  manifest: manifestPath,
  checks,
  status: checks.every((check) => check.status === 'passed')
    ? 'passed'
    : 'failed',
};
await writeFile(
  join(dirname(manifestPath), 'replay-checks.json'),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (report.status === 'failed') process.exitCode = 1;
