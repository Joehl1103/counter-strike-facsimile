import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { aggregateReviews, readReports, renderSummary } from './review-gate.mjs';

const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const runId = '123456';
const runAttempt = '2';
const planDigest = 'c'.repeat(64);
const plan = { digest: planDigest, files: [], head, base, overflow: false, chunks: [{ id: 'chunk-001' }, { id: 'chunk-002' }], skipped: [], uncovered: [] };
const reportText = (chunkId, changes = {}) => JSON.stringify({
  reviewed_head: head, reviewed_base: base, chunk_id: chunkId, complete: true,
  verdict: 'pass', summary: 'Inspected assigned changes.', findings: [], limitations: [], ...changes,
});
const report = (chunkId, changes = {}, envelopeChanges = {}) => JSON.stringify({
  run_id: runId, run_attempt: runAttempt, plan_digest: planDigest, chunk_id: chunkId,
  report_text: reportText(chunkId, changes), ...envelopeChanges,
});
const reports = () => plan.chunks.map((chunk) => ({ id: chunk.id, text: report(chunk.id) }));
const aggregate = (changes = {}) => aggregateReviews({ runId, runAttempt, planDigest, plan, reports: reports(), head, base, reviewerResult: 'success', planResult: 'success', ...changes });

describe('aggregate independent review gate', () => {
  test('passes exactly one clean report per planned chunk', () => {
    const result = aggregate();
    assert.equal(result.complete, true);
    assert.equal(result.verdict, 'pass');
    assert.equal(result.reports.length, 2);
  });

  for (const [name, invalidReports] of [
    ['missing chunk', () => reports().slice(0, 1)],
    ['extra chunk id', () => [...reports(), { id: 'chunk-003', text: report('chunk-003') }]],
    ['duplicated id', () => [...reports(), reports()[0]]],
    ['mismatched chunk_id', () => [{ id: 'chunk-001', text: report('chunk-002') }, reports()[1]]],
    ['malformed JSON', () => [{ id: 'chunk-001', text: '```not JSON' }, reports()[1]]],
  ]) {
    test(`fails closed for ${name}`, () => {
      const result = aggregate({ reports: invalidReports() });
      assert.equal(result.complete, false);
      assert.equal(result.verdict, 'changes_requested');
      assert.ok(result.limitations.length);
    });
  }

  for (const [name, changes] of [
    ['wrong head', { reviewed_head: base }], ['wrong base', { reviewed_base: head }],
    ['complete false', { complete: false }], ['changes requested', { verdict: 'changes_requested' }],
    ['findings', { findings: ['P1 app.ts:1 broken'] }], ['empty summary', { summary: '' }],
    ['missing limitations', { limitations: undefined }],
  ]) {
    test(`fails closed for report with ${name}`, () => {
      assert.equal(aggregate({ reports: [{ id: 'chunk-001', text: report('chunk-001', changes) }, reports()[1]] }).complete, false);
    });
  }

  test('fails closed on overflow, failed planning/review, or a stale plan', () => {
    for (const changes of [
      { plan: { ...plan, overflow: true, uncovered: [{ path: 'uncovered.ts' }] } },
      { reviewerResult: 'failure' }, { reviewerResult: 'cancelled' },
      { reviewerResult: 'skipped' }, { planResult: 'failure' }, { plan: { ...plan, head: base } },
    ]) {
      assert.equal(aggregate(changes).complete, false);
    }
    assert.match(JSON.stringify(aggregate({ plan: { ...plan, overflow: true, uncovered: [{ path: 'uncovered.ts' }] } })), /uncovered.ts/);
  });

  test('zero chunks always fail and require human review, even with verified assets', () => {
    const skipped = [{ path: 'photo.png', oldPath: 'photo.png', reason: 'asset_binary',
      size: 20, added: null, removed: null, headMode: '100644', headPrefixHex: '89504e470d0a1a0a' }];
    for (const files of [skipped, []]) {
      const result = aggregate({ plan: { ...plan, chunks: [], files, skipped: files },
        reports: [], reviewerResult: 'skipped' });
      assert.equal(result.complete, false);
      assert.equal(result.verdict, 'changes_requested');
      assert.equal(result.summary, 'asset-only change requires human review');
    }
  });

  for (const [name, changes] of [
    ['prior attempt', { run_attempt: '1' }], ['wrong run', { run_id: '987' }],
    ['wrong digest', { plan_digest: 'd'.repeat(64) }],
    ['wrong envelope chunk', { chunk_id: 'chunk-002' }],
    ['wrong inner report chunk', { report_text: reportText('chunk-002') }],
    ['malformed report text', { report_text: '{not json' }],
    ['non-string report text', { report_text: {} }],
    ...['run_id', 'run_attempt', 'plan_digest', 'chunk_id', 'report_text'].map((key) =>
      [`missing ${key}`, { [key]: undefined }]),
  ]) {
    test(`rejects envelope with ${name}`, () => {
      const result = aggregate({ reports: [{ id: 'chunk-001', text: report('chunk-001', {}, changes) }, reports()[1]] });
      assert.equal(result.complete, false);
      assert.equal(result.verdict, 'changes_requested');
    });
  }

  test('rejects missing trusted provenance and a plan inconsistent with the expected digest', () => {
    for (const changes of [{ runId: undefined }, { runAttempt: undefined }, { planDigest: undefined },
      { plan: { ...plan, digest: 'd'.repeat(64) } }]) {
      assert.equal(aggregate(changes).complete, false);
    }
  });

  test('escapes model output and skipped paths in the step summary', () => {
    const result = aggregate({ reports: [{ id: 'chunk-001', text: report('chunk-001', { summary: '<script>&unsafe</script>' }) }, reports()[1]],
      plan: { ...plan, skipped: [{ path: '<img>.png', reason: 'asset' }] } });
    const summary = renderSummary(result);
    assert.ok(!summary.includes('<script>'));
    assert.ok(!summary.includes('<img>'));
    assert.match(summary, /&lt;script&gt;&amp;unsafe/);
    assert.match(summary, /&lt;img&gt;/);
  });
});


describe('downloaded artifact structure', () => {
  test('trusted workflow persistence wraps the untouched provider message with current provenance', (context) => {
    const workflow = readFileSync(new URL('../workflows/codex-review.yml', import.meta.url), 'utf8');
    const persistStep = workflow.slice(workflow.indexOf('      - name: Persist chunk report as data'),
      workflow.indexOf('      - uses: actions/upload-artifact@'));
    assert.match(persistStep, /REVIEW_DIGEST: \$\{\{ needs.plan.outputs.digest \}\}/);
    const script = persistStep.split("node --input-type=module <<'JS'\n")[1].split('          JS')[0]
      .split('\n').map((line) => line.slice(10)).join('\n');
    const directory = mkdtempSync(join(tmpdir(), 'review-persist-'));
    context.after(() => rmSync(directory, { recursive: true, force: true }));
    const providerText = reportText('chunk-001');
    execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: {
      ...process.env, RUNNER_TEMP: directory, GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: runAttempt,
      REVIEW_CHUNK: 'chunk-001', REVIEW_DIGEST: planDigest, REVIEW_REPORT: providerText,
    } });
    const envelope = JSON.parse(readFileSync(join(directory, 'codex-review-report/chunk-001.json'), 'utf8'));
    assert.deepEqual(envelope, { run_id: runId, run_attempt: runAttempt, plan_digest: planDigest,
      chunk_id: 'chunk-001', report_text: providerText });
  });

  test('reviewer uploads isolate run attempts and allow same-attempt replacement', () => {
    const workflow = readFileSync(new URL('../workflows/codex-review.yml', import.meta.url), 'utf8');
    const uploadStep = workflow.match(/      - uses: actions\/upload-artifact@[\s\S]*?(?=\n  review-gate:)/)?.[0];
    assert.ok(uploadStep, 'Workflow must upload per-chunk reports.');
    assert.match(uploadStep, /          overwrite: true/);
    assert.match(uploadStep, /          name: codex-review-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}-\$\{\{ matrix.chunk \}\}/);
  });

  test('workflow downloads all chunk reports into one flat directory', () => {
    const workflow = readFileSync(new URL('../workflows/codex-review.yml', import.meta.url), 'utf8');
    const downloadStep = workflow.match(/      - uses: actions\/download-artifact@[\s\S]*?(?=\n      - name:)/)?.[0];
    assert.ok(downloadStep);
    assert.match(downloadStep, /          merge-multiple: true/);
    assert.match(downloadStep, /pattern: codex-review-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}-\*/);
  });

  for (const count of [1, 2]) {
    test(`validates a flat download containing ${count} chunk report(s)`, (context) => {
      const directory = mkdtempSync(join(tmpdir(), 'review-gate-'));
      context.after(() => rmSync(directory, { recursive: true, force: true }));
      const chunks = plan.chunks.slice(0, count);
      for (const chunk of chunks) {
        writeFileSync(join(directory, chunk.id + '.json'), report(chunk.id));
      }
      const downloaded = readReports(directory);
      assert.equal(aggregate({ plan: { ...plan, chunks }, reports: downloaded }).complete, true);
      writeFileSync(join(directory, 'chunk-999.json'), report('chunk-999'));
      assert.equal(aggregate({ plan: { ...plan, chunks }, reports: readReports(directory) }).complete, false);
      rmSync(join(directory, 'chunk-999.json'));
      rmSync(join(directory, chunks[0].id + '.json'));
      assert.equal(aggregate({ plan: { ...plan, chunks }, reports: readReports(directory) }).complete, false);
    });
  }

  test('a report chunk_id must match its flat filename', (context) => {
    const directory = mkdtempSync(join(tmpdir(), 'review-gate-'));
    context.after(() => rmSync(directory, { recursive: true, force: true }));
    writeFileSync(join(directory, 'chunk-001.json'), report('chunk-002'));
    assert.equal(aggregate({ plan: { ...plan, chunks: [plan.chunks[0]] }, reports: readReports(directory) }).complete, false);
  });

  for (const name of ['extra.json', 'chunk-01.json', 'chunk-001.json.bak', 'chunk-001.json\n', 'chunk-x.json']) {
    test(`rejects unexpected flat report filename ${JSON.stringify(name)}`, (context) => {
      const directory = mkdtempSync(join(tmpdir(), 'review-gate-'));
      context.after(() => rmSync(directory, { recursive: true, force: true }));
      writeFileSync(join(directory, name), report('chunk-001'));
      assert.throws(() => readReports(directory), /Unexpected report/);
    });
  }

  test('refuses artifact directories and correctly named symlinks instead of following them', (context) => {
    const directory = mkdtempSync(join(tmpdir(), 'review-gate-'));
    context.after(() => rmSync(directory, { recursive: true, force: true }));
    const nested = join(directory, 'codex-review-chunk-001');
    mkdirSync(nested);
    writeFileSync(join(nested, 'chunk-001.json'), report('chunk-001'));
    assert.throws(() => readReports(directory), /Unexpected report/);
    rmSync(nested, { recursive: true });
    symlinkSync('../outside.json', join(directory, 'chunk-001.json'));
    assert.throws(() => readReports(directory), /Unexpected report/);
  });
});
