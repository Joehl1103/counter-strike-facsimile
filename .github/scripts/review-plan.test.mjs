import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildPlan, classifyFile, manifestDigest, renderPacket, renderPrompt } from './review-plan.mjs';

// Each fixture uses real objects and leaves the checkout at base during rendering.
function fixture(context, before, after) {
  const repoDir = mkdtempSync(join(tmpdir(), 'review-plan-'));
  context.after(() => rmSync(repoDir, { recursive: true, force: true }));
  const git = (...arguments_) => execFileSync('git', arguments_, { cwd: repoDir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Review fixture');
  function writeFiles(files) {
    for (const [path, content] of Object.entries(files)) {
      const target = join(repoDir, path);
      if (content === null) {
        rmSync(target);
      } else {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content);
      }
    }
  }
  writeFiles(before);
  git('add', '.');
  git('commit', '-qm', 'base', '--allow-empty');
  const base = git('rev-parse', 'HEAD').trim();
  writeFiles(after);
  git('add', '.');
  git('commit', '-qm', 'head', '--allow-empty');
  const head = git('rev-parse', 'HEAD').trim();
  git('checkout', '-q', base);
  return { repoDir, base, head, git };
}

function items(plan) {
  return plan.chunks.flatMap((chunk) => chunk.items);
}

describe('trusted git-object planning', () => {
  test('classifies paths and orders workflow, source, tests, scripts/config, docs/data', (context) => {
    const input = fixture(context, { 'small.ts': 'remove\n', 'large.ts': 'remove\n'.repeat(200) }, {
      '.github/workflows/ci.yml': 'name: ci\n', 'src/main.ts': 'export const value = 1;\n',
      'src/main.test.ts': 'test();\n', 'scripts/check.py': 'print(1)\n',
      'config.yaml': 'value: 1\n', 'README.md': 'docs\n', 'data.json': '{}\n',
      'icon.svg': '<svg/>\n', 'package-lock.json': '{"packages":{}}\n',
      'binary.bin': Buffer.from([0, 1, 2]), 'photo.png': 'asset\n',
      'dist/app.js': 'generated\n', 'build/app.js': 'generated\n',
      'coverage/report.txt': 'generated\n', 'app.min.js': 'generated\n', 'app.js.map': '{}\n',
      'small.ts': null, 'large.ts': null,
    });
    const plan = buildPlan(input);
    assert.equal(items(plan)[0].path, '.github/workflows/ci.yml');
    const priorities = items(plan).map((item) => item.priority);
    assert.deepEqual(priorities, [...priorities].sort((left, right) => left - right));
    assert.equal(classifyFile('src/main.ts').category, 'source');
    assert.equal(classifyFile('src/main.test.ts').category, 'tests');
    assert.equal(classifyFile('scripts/check.py').category, 'scripts/config');
    assert.equal(classifyFile('data.json').category, 'docs/data');
    assert.equal(classifyFile('icon.svg').category, 'source');
    assert.ok(items(plan).some((item) => item.path === 'small.ts' && item.kind === 'deletion'));
    assert.ok(items(plan).some((item) => item.path === 'package-lock.json' && item.kind === 'lock-summary'));
    const skipped = Object.fromEntries(plan.skipped.map((file) => [file.path, file]));
    assert.equal(skipped['binary.bin'].reason, 'binary');
    assert.equal(skipped['photo.png'].reason, 'asset');
    assert.equal(skipped['large.ts'].reason, 'deleted-large');
    assert.equal(skipped['large.ts'].size, 1400);
    for (const path of ['dist/app.js', 'build/app.js', 'coverage/report.txt', 'app.min.js', 'app.js.map']) {
      assert.equal(skipped[path].reason, 'generated');
    }
  });

  test('packs small diffs and splits huge hunks without dropping bytes, within budget', (context) => {
    const input = fixture(context, {}, {
      'src/a.ts': 'export const a = 1;\n', 'src/b.ts': 'export const b = 1;\n',
      'src/huge.ts': Array.from({ length: 250 }, (_, index) => `export const value${index} = ${index};\n`).join(''),
    });
    const plan = buildPlan({ ...input, budget: 700 });
    assert.equal(plan.overflow, false);
    assert.ok(plan.chunks.some((chunk) => chunk.items.length === 2));
    assert.ok(plan.chunks.every((chunk) => chunk.characters <= 700));
    const parts = items(plan).filter((item) => item.path === 'src/huge.ts');
    assert.ok(parts.length > 2);
    assert.equal(parts.map((item) => item.diff).join(''), input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`, '--', 'src/huge.ts'));
    assert.ok(parts.every((item) => /part \d+\/\d+, head lines \d+-\d+/.test(item.label)));
    assert.equal(parts.at(-1).headEnd, 250);
  });

  test('prefers hunk boundaries and records correct head ranges', (context) => {
    const lines = Array.from({ length: 100 }, (_, index) => `const value${index} = ${index};\n`);
    const changed = [...lines];
    changed[5] = 'const changedFirst = true;\n';
    changed[90] = 'const changedLast = true;\n';
    const input = fixture(context, { 'app.ts': lines.join('') }, { 'app.ts': changed.join('') });
    const plan = buildPlan({ ...input, budget: 400 });
    const parts = items(plan);
    assert.equal(parts.length, 2);
    assert.match(parts[1].diff, /^@@/);
    assert.equal(parts[1].headStart, 88);
    assert.equal(parts[1].headEnd, 94);
  });

  test('splits an oversized single line without losing text or inventing head lines', (context) => {
    const input = fixture(context, {}, { 'app.ts': 'const text = "' + 'x'.repeat(2000) + '";' });
    const plan = buildPlan({ ...input, budget: 300 });
    assert.ok(plan.chunks.every((chunk) => chunk.characters <= 300));
    assert.equal(items(plan).map((item) => item.diff).join(''),
      input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`));
    assert.equal(items(plan).at(-1).headEnd, 1);
  });

  test('is deterministic, validates SHA inputs and binds all manifest fields in its digest', (context) => {
    const input = fixture(context, {}, { 'app.ts': 'hello\n' });
    const first = buildPlan(input);
    const regenerated = buildPlan(input);
    assert.deepEqual(first, regenerated);
    assert.equal(renderPrompt(first, first.chunks[0]), renderPrompt(regenerated, regenerated.chunks[0]));
    assert.equal(first.digest, manifestDigest(first));
    assert.match(first.digest, /^[a-f0-9]{64}$/);
    assert.notEqual(first.digest, manifestDigest({ ...first, skipped: [{ path: 'other' }] }));
    assert.throws(() => buildPlan({ ...input, head: '--help' }), /SHA/);
    assert.throws(() => buildPlan({ ...input, budget: 0 }), /budget/);
  });

  test('overflow explicitly lists uncovered parts instead of silently dropping code', (context) => {
    const input = fixture(context, {}, { 'app.ts': 'const longValue = true;\n'.repeat(300) });
    const plan = buildPlan({ ...input, budget: 500, maxChunks: 2 });
    assert.equal(plan.overflow, true);
    assert.equal(plan.chunks.length, 2);
    assert.ok(plan.uncovered.length > 0);
    assert.ok(plan.uncovered.every((item) => item.path === 'app.ts'));
    assert.equal([...items(plan), ...plan.uncovered].map((item) => item.diff).join(''),
      input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`));
  });

  test('summarizes added, removed and changed lock packages without embedding raw locks', (context) => {
    const lock = (packages) => JSON.stringify({ lockfileVersion: 3, packages });
    const input = fixture(context, { 'package-lock.json': lock({
      'node_modules/removed': { version: '1', resolved: 'https://registry.npmjs.org/removed.tgz' },
      'node_modules/changed': { version: '1', resolved: 'https://old.example/pkg.tgz' },
    }) }, { 'package-lock.json': lock({
      'node_modules/changed': { version: '2', resolved: 'https://new.example/pkg.tgz', hasInstallScript: true },
      'node_modules/added': { version: '3', resolved: 'https://registry.npmjs.org/added.tgz' },
    }), 'yarn.lock': 'some lock content\n' });
    const plan = buildPlan(input);
    const summary = plan.lockSummaries.find((entry) => entry.path === 'package-lock.json');
    assert.deepEqual(summary.entries.map((entry) => entry.change), ['added', 'changed', 'removed']);
    assert.equal(summary.entries[0].after.version, '3');
    assert.equal(summary.entries[1].before.resolvedHost, 'old.example');
    assert.equal(summary.entries[1].after.resolvedHost, 'new.example');
    assert.ok(summary.entries[1].changedFields.includes('hasInstallScript'));
    assert.ok(items(plan).every((item) => item.kind === 'lock-summary'));
    assert.ok(!items(plan).map((item) => item.diff).join('').includes('https://new.example/pkg.tgz'));
    assert.equal(plan.lockSummaries.find((entry) => entry.path === 'yarn.lock').summarized, true);
  });

  test('handles renames and literal unusual filenames from NUL-delimited numstat', (context) => {
    const input = fixture(context, { 'old name.ts': 'unchanged\n'.repeat(20) }, {
      'old name.ts': null, 'new\tname.ts': 'unchanged\n'.repeat(20), 'colon:[x].ts': 'text\n',
    });
    const plan = buildPlan(input);
    const renamed = plan.files.find((file) => file.path === 'new\tname.ts');
    assert.equal(renamed.oldPath, 'old name.ts');
    assert.ok(items(plan).some((item) => item.diff.includes('rename from old name.ts')));
  });
});

describe('nested untrusted HEAD packet', () => {
  test('embeds only its exact chunk diff and copies full PR head context beneath packet/head', (context) => {
    const input = fixture(context, { 'app.ts': 'base value\n', 'AGENTS.md': 'base instructions\n' }, {
      'app.ts': 'head value\n', 'AGENTS.md': 'untrusted instructions\n',
      '.codex/config.toml': 'untrusted config\n', 'other.ts': 'other head context\n',
      'package-lock.json': '{"packages":{}}\n',
    });
    const plan = buildPlan({ ...input, budget: 200 });
    const packetDir = join(input.repoDir, '.codex-review-input');
    const promptPath = renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(readFileSync(join(packetDir, 'head/app.ts'), 'utf8'), 'head value\n');
    assert.equal(readFileSync(join(packetDir, 'head/AGENTS.md'), 'utf8'), 'untrusted instructions\n');
    assert.equal(readFileSync(join(packetDir, 'head/.codex/config.toml'), 'utf8'), 'untrusted config\n');
    assert.equal(readFileSync(join(packetDir, 'head/other.ts'), 'utf8'), 'other head context\n');
    assert.equal(readFileSync(join(input.repoDir, 'AGENTS.md'), 'utf8'), 'base instructions\n');
    assert.equal(existsSync(join(input.repoDir, '.codex')), false);
    assert.equal(existsSync(join(packetDir, 'head/package-lock.json')), false);
    const prompt = readFileSync(promptPath, 'utf8');
    for (const item of plan.chunks[0].items) {
      assert.ok(prompt.includes(item.diff));
    }
    assert.match(prompt, /NOT the candidate/);
    assert.match(prompt, /chunk_id/);
    assert.match(prompt, /UNTRUSTED/);
    assert.match(prompt, /other.ts/);
    assert.throws(() => renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: 'bad', packetDir }), /digest/i);
  });

  test('caps context copies but retains their complete diff and reports the omission', (context) => {
    const input = fixture(context, {}, { 'large.ts': 'abc\n'.repeat(100) });
    const plan = buildPlan({ ...input, maxCopyBytes: 100 });
    const packetDir = join(input.repoDir, '.codex-review-input');
    const promptPath = renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(existsSync(join(packetDir, 'head/large.ts')), false);
    assert.match(readFileSync(promptPath, 'utf8'), /context-size-cap/);
    assert.ok(items(plan)[0].diff.includes('+abc'));
  });

  test('refuses an existing packet symlink instead of writing outside the packet', (context) => {
    const input = fixture(context, {}, { 'app.ts': 'head\n' });
    const plan = buildPlan(input);
    const packetDir = join(input.repoDir, '.codex-review-input');
    symlinkSync(input.repoDir, packetDir);
    assert.throws(() => renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir }));
  });
});


describe('planner and gate CLI integration', () => {
  test('regenerates an identical manifest across checkouts and validates downloaded artifacts', (context) => {
    const input = fixture(context, {}, { 'app.ts': 'candidate value\n' });
    const plannerPath = fileURLToPath(new URL('./review-plan.mjs', import.meta.url));
    const gatePath = fileURLToPath(new URL('./review-gate.mjs', import.meta.url));
    const manifestPath = join(input.repoDir, 'manifest.json');
    const outputsPath = join(input.repoDir, 'outputs.txt');
    const environment = { ...process.env, REVIEW_MANIFEST: manifestPath, GITHUB_OUTPUT: outputsPath };
    execFileSync(process.execPath, [plannerPath, 'plan', input.base, input.head, input.repoDir], { env: environment });
    const plan = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.match(readFileSync(outputsPath, 'utf8'), /chunks=\["chunk-001"\]/);
    input.git('checkout', '-q', input.head);
    assert.deepEqual(buildPlan(input), plan);
    input.git('checkout', '-q', input.base);
    execFileSync(process.execPath, [plannerPath, 'render', input.base, input.head, input.repoDir, 'chunk-001', plan.digest], { env: environment });
    assert.ok(existsSync(join(input.repoDir, '.codex-review-input/prompt.txt')));

    const reportsDir = join(input.repoDir, 'reports');
    mkdirSync(join(reportsDir, 'codex-review-chunk-001'), { recursive: true });
    writeFileSync(join(reportsDir, 'codex-review-chunk-001/chunk-001.json'), JSON.stringify({
      reviewed_head: input.head, reviewed_base: input.base, chunk_id: 'chunk-001',
      complete: true, verdict: 'pass', summary: 'Checked.', findings: [], limitations: [],
    }));
    const gateEnvironment = { ...process.env, REVIEW_HEAD: input.head, REVIEW_BASE: input.base,
      REVIEW_DIGEST: plan.digest, REVIEW_REPORTS: reportsDir, REVIEW_RESULT: 'success', PLAN_RESULT: 'success',
      GATE_PREPARATION_RESULT: 'success', GITHUB_STEP_SUMMARY: join(input.repoDir, 'summary.txt') };
    const runGate = (changes = {}) => spawnSync(process.execPath, [gatePath], {
      cwd: input.repoDir, env: { ...gateEnvironment, ...changes }, encoding: 'utf8',
    });
    assert.equal(runGate().status, 0);
    assert.match(readFileSync(gateEnvironment.GITHUB_STEP_SUMMARY, 'utf8'), /&quot;|Inspected|Checked/);
    assert.equal(runGate({ REVIEW_DIGEST: 'wrong' }).status, 1);
    assert.equal(runGate({ GATE_PREPARATION_RESULT: 'failure' }).status, 1);
    assert.equal(runGate({ REVIEW_RESULT: 'failure' }).status, 1);
  });

  test('context symlinks become plain files and cannot redirect candidate copies', (context) => {
    const input = fixture(context, {}, { 'app.ts': 'candidate\n' });
    input.git('checkout', '-q', input.head);
    symlinkSync('../outside', join(input.repoDir, 'link'));
    input.git('add', 'link');
    input.git('commit', '-qm', 'symlink as data');
    input.head = input.git('rev-parse', 'HEAD').trim();
    input.git('checkout', '-q', input.base);
    const plan = buildPlan(input);
    const packetDir = join(input.repoDir, '.codex-review-input');
    renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(readFileSync(join(packetDir, 'head/link'), 'utf8'), '../outside');
    assert.equal(existsSync(join(input.repoDir, 'link')), false);
  });

  test('rejects malformed JSON locks rather than silently reviewing an empty summary', (context) => {
    const input = fixture(context, {}, { 'npm-shrinkwrap.json': '{"lockfileVersion":1}' });
    assert.throws(() => buildPlan(input), /packages map/);
  });
});
