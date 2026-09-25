import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { aggregateReviews } from './review-gate.mjs';
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
  test('defaults to a 100000-character budget and 60 chunks for larger PRs', (context) => {
    const input = fixture(context, {}, { 'large.ts': 'const value = true;\n'.repeat(4000) });
    const plan = buildPlan(input);
    assert.equal(plan.budget, 100_000);
    assert.equal(plan.maxChunks, 60);
    assert.equal(plan.chunks.length, 1);
    assert.equal(plan.overflow, false);
  });

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
    assert.deepEqual(plan.skipped, []);
    assert.equal(plan.overflow, true);
    assert.equal(plan.uncovered.find((file) => file.path === 'binary.bin').reason, 'unreviewable_binary');
    for (const path of ['photo.png', 'large.ts', 'dist/app.js', 'build/app.js', 'coverage/report.txt', 'app.min.js', 'app.js.map']) {
      assert.ok(items(plan).some((item) => item.path === path), `Missing review for ${path}`);
    }
    assert.equal(plan.files.find((file) => file.path === 'large.ts').size, 1400);
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
    assert.equal(items(plan).find((item) => item.path === 'package-lock.json').kind, 'lock-summary');
    assert.ok(items(plan).map((item) => item.diff).join('').includes('https://new.example/pkg.tgz'));
    assert.equal(items(plan).find((item) => item.path === 'yarn.lock').kind, 'diff');
    assert.equal(plan.lockSummaries.find((entry) => entry.path === 'yarn.lock'), undefined);
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
  test('overflow with a skipped matrix fails the gate and published status, listing uncovered files', async (context) => {
    const input = fixture(context, {}, {
      'first.ts': 'const first = true;\n'.repeat(30),
      'second.ts': 'const second = true;\n'.repeat(30),
    });
    const plan = buildPlan({ ...input, budget: 300, maxChunks: 1 });
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


describe('adversarial review coverage', () => {
  function skipMatrix(plan) {
    return aggregateReviews({ plan, head: plan.head, base: plan.base,
      reports: [], planResult: 'success', reviewerResult: 'skipped' });
  }

  test('a NUL byte in JavaScript cannot turn a code-only PR into a passing binary-only PR', (context) => {
    const input = fixture(context, {}, { 'authorize.js': 'grantAdmin();\0\n' });
    const plan = buildPlan(input);
    assert.equal(plan.chunks.length, 0);
    assert.equal(plan.overflow, true);
    assert.deepEqual(plan.skipped, []);
    assert.equal(plan.uncovered[0].path, 'authorize.js');
    assert.equal(plan.uncovered[0].reason, 'unreviewable_binary');
    assert.equal(skipMatrix(plan).complete, false);
  });

  test('all non-allowlisted binaries and all .github binaries remain explicitly uncovered', (context) => {
    const paths = ['app.js', 'app.ts', 'tool.py', 'tool.sh', 'data.json', 'ci.yml', 'icon.svg',
      'unknown', 'unknown.xyz', '.png', 'archive.zip', 'archive.tar', 'assets/model.bin', 'model.gltf',
      '.github/actions/image.png', '.github/asset.glb', '.github/workflows/ci.yml',
      'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml'];
    const files = Object.fromEntries(paths.map((path) => [path, 'binary\0data\n']));
    const input = fixture(context, {}, files);
    const plan = buildPlan(input);
    assert.equal(plan.overflow, true);
    assert.equal(plan.skipped.length, 0);
    assert.deepEqual(plan.uncovered.map((file) => file.path).sort(), [...paths].sort());
    assert.ok(plan.uncovered.every((file) => file.reason === 'unreviewable_binary'));
    assert.equal(skipMatrix(plan).complete, false);
  });

  test('only explicit binary asset extensions outside .github can pass without model chunks', (context) => {
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif',
      'mp3', 'wav', 'ogg', 'flac', 'm4a', 'mp4', 'webm', 'mov',
      'woff', 'woff2', 'ttf', 'otf', 'eot', 'glb', 'gltf-bin', 'fbx', 'obj', 'blend', 'dae', 'ktx2', 'hdr', 'exr'];
    const files = Object.fromEntries(extensions.map((extension) => [`assets/item.${extension}`, 'binary\0data']));
    const input = fixture(context, {}, files);
    const plan = buildPlan(input);
    assert.equal(plan.overflow, false);
    assert.equal(plan.chunks.length, 0);
    assert.equal(plan.skipped.length, extensions.length);
    assert.ok(plan.skipped.every((file) => file.reason === 'asset_binary'));
    assert.equal(skipMatrix(plan).complete, true);
  });

  test('allowlisted filenames containing text are reviewed with full HEAD context', (context) => {
    const files = { 'script.png': 'grantAdmin();\n', 'model.obj': 'execDangerousCommand();\n' };
    const input = fixture(context, {}, files);
    const plan = buildPlan(input);
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

  test('renaming a binary source file to an asset extension cannot hide its deletion', (context) => {
    const payload = 'grantAdmin();\0\n'.repeat(30);
    const input = fixture(context, { '.github/actions/check.js': payload }, {
      '.github/actions/check.js': null, 'asset.png': payload,
    });
    const plan = buildPlan(input);
    assert.equal(plan.files[0].oldPath, '.github/actions/check.js');
    assert.equal(plan.overflow, true);
    assert.equal(plan.skipped.length, 0);
    assert.equal(plan.uncovered[0].reason, 'unreviewable_binary');
  });

  test('build directories, bundled scripts and map/coverage text all consume review budget', (context) => {
    const paths = ['.github/actions/build/index.js', 'src/build/authorize.ts', 'runtime.min.js',
      'dist/authorize.js', 'coverage/check.js', 'runtime.js.map'];
    const content = 'grantAdmin();\n'.repeat(50);
    const input = fixture(context, {}, Object.fromEntries(paths.map((path) => [path, content])));
    const plan = buildPlan({ ...input, budget: 400 });
    assert.equal(plan.overflow, false);
    assert.equal(plan.skipped.length, 0);
    assert.ok(plan.chunks.length > paths.length);
    for (const path of paths) {
      const reviewed = items(plan).filter((item) => item.path === path).map((item) => item.diff).join('');
      assert.equal(reviewed, input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`, '--', path));
    }
    assert.equal(items(plan)[0].path, '.github/actions/build/index.js');
    assert.equal(buildPlan({ ...input, budget: 400, maxChunks: 1 }).overflow, true);
  });

  test('large deletions are split and fully reviewed, or fail closed at the chunk cap', (context) => {
    const input = fixture(context, { 'authorize.ts': 'enforcePermissions();\n'.repeat(300) }, { 'authorize.ts': null });
    const plan = buildPlan({ ...input, budget: 400 });
    assert.equal(plan.skipped.length, 0);
    assert.equal(plan.overflow, false);
    assert.ok(plan.chunks.length > 1);
    assert.ok(items(plan).every((item) => item.kind === 'deletion'));
    assert.equal(items(plan).map((item) => item.diff).join(''), input.git('diff', '--no-color', '--find-renames', `${input.base}...${input.head}`));
    const capped = buildPlan({ ...input, budget: 400, maxChunks: 1 });
    assert.equal(capped.overflow, true);
    assert.ok(capped.uncovered.every((item) => item.path === 'authorize.ts'));
    assert.equal(skipMatrix(capped).complete, false);
  });

  test('unsummarized locks retain their full malicious diff at lowest priority and in HEAD copies', (context) => {
    const paths = ['yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'composer.lock', 'custom.lock.json'];
    const content = 'resolved: https://attacker.example/install.tgz\nintegrity: changed\n'.repeat(5);
    const files = Object.fromEntries(paths.map((path) => [path, content]));
    const input = fixture(context, {}, { ...files, 'README.md': 'context\n' });
    const plan = buildPlan({ ...input, budget: 400 });
    assert.equal(plan.lockSummaries.length, 0);
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

  for (const path of ['package-lock.json', 'npm-shrinkwrap.json']) {
    test(`${path} exposes integrity changes and flags non-registry URLs, even in unchanged packages`, (context) => {
      const lock = (packages) => JSON.stringify({ lockfileVersion: 3, packages });
      const unchanged = { version: '1', resolved: 'https://mirror.example/unchanged.tgz', integrity: 'sha512-same' };
      const input = fixture(context, { [path]: lock({
        'node_modules/changed': { version: '1', resolved: 'https://registry.npmjs.org/pkg.tgz', integrity: 'sha512-before' },
        'node_modules/unchanged': unchanged,
      }) }, { [path]: lock({
        'node_modules/changed': { version: '1', resolved: 'https://registry.npmjs.org.evil.example/pkg.tgz', integrity: 'sha512-after' },
        'node_modules/unchanged': unchanged,
      }) });
      const plan = buildPlan(input);
      const summary = plan.lockSummaries[0];
      const changed = summary.entries[0];
      assert.equal(changed.integrityChanged, true);
      assert.equal(changed.before.integrity, 'sha512-before');
      assert.equal(changed.after.integrity, 'sha512-after');
      assert.equal(changed.before.nonRegistryResolvedUrl, null);
      assert.equal(changed.after.nonRegistryResolvedUrl, 'https://registry.npmjs.org.evil.example/pkg.tgz');
      assert.deepEqual(summary.nonRegistryResolutions.map((entry) => entry.name), ['node_modules/changed', 'node_modules/unchanged']);
      const diff = items(plan).map((item) => item.diff).join('');
      assert.match(diff, /sha512-before/);
      assert.match(diff, /sha512-after/);
      assert.match(diff, /NON_REGISTRY_RESOLVED/);
      assert.match(diff, /https:\/\/mirror.example\/unchanged.tgz/);
    });
  }
});
