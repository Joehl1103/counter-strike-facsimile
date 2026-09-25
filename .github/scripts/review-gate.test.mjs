import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { aggregateReviews, readReports, renderSummary } from './review-gate.mjs';

const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const plan = { head, base, overflow: false, chunks: [{ id: 'chunk-001' }, { id: 'chunk-002' }], skipped: [], lockSummaries: [], uncovered: [] };
const report = (chunkId, changes = {}) => JSON.stringify({
  reviewed_head: head, reviewed_base: base, chunk_id: chunkId, complete: true,
  verdict: 'pass', summary: 'Inspected assigned changes.', findings: [], limitations: [], ...changes,
});
const reports = () => plan.chunks.map((chunk) => ({ id: chunk.id, text: report(chunk.id) }));
const aggregate = (changes = {}) => aggregateReviews({ plan, reports: reports(), head, base, reviewerResult: 'success', planResult: 'success', ...changes });

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

  test('only binary/asset-only skipped review can pass without a model, with explicit summary', () => {
    const skipped = [{ path: 'photo.png', reason: 'asset', size: 20 }, { path: 'blob.bin', reason: 'binary', size: 30 }];
    const emptyPlan = { ...plan, chunks: [], skipped };
    const result = aggregate({ plan: emptyPlan, reports: [], reviewerResult: 'skipped' });
    assert.equal(result.complete, true);
    assert.match(result.summary, /photo.png/);
    assert.match(result.summary, /blob.bin/);
    for (const reason of ['deleted-large', 'generated']) {
      assert.equal(aggregate({ plan: { ...emptyPlan, skipped: [{ path: 'other', reason }] }, reports: [], reviewerResult: 'skipped' }).complete, false);
    }
    assert.equal(aggregate({ plan: { ...emptyPlan, lockSummaries: [{ path: 'yarn.lock' }] }, reports: [], reviewerResult: 'skipped' }).complete, false);
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
  test('reviewer uploads replace the prior artifact when rerunning a leg', () => {
    const workflow = readFileSync(new URL('../workflows/codex-review.yml', import.meta.url), 'utf8');
    const uploadStep = workflow.match(/      - uses: actions\/upload-artifact@[\s\S]*?(?=\n  review-gate:)/)?.[0];
    assert.ok(uploadStep, 'Workflow must upload per-chunk reports.');
    assert.match(uploadStep, /          overwrite: true/);
    assert.match(uploadStep, /          name: codex-review-\$\{\{ matrix.chunk \}\}/);
  });

  test('requires one correctly named report per artifact directory and rejects extra files', (context) => {
    const directory = mkdtempSync(join(tmpdir(), 'review-gate-'));
    context.after(() => rmSync(directory, { recursive: true, force: true }));
    const artifact = join(directory, 'codex-review-chunk-001');
    mkdirSync(artifact);
    writeFileSync(join(artifact, 'chunk-001.json'), report('chunk-001'));
    assert.deepEqual(readReports(directory), [{ id: 'chunk-001', text: report('chunk-001') }]);
    writeFileSync(join(artifact, 'extra.json'), report('chunk-001'));
    assert.throws(() => readReports(directory), /exactly one/);
  });

  test('rejects unexpected artifact names and report filenames', (context) => {
    const directory = mkdtempSync(join(tmpdir(), 'review-gate-'));
    context.after(() => rmSync(directory, { recursive: true, force: true }));
    mkdirSync(join(directory, 'codex-review-unplanned'));
    assert.throws(() => readReports(directory), /Unexpected review artifact/);
    rmSync(join(directory, 'codex-review-unplanned'), { recursive: true });
    const artifact = join(directory, 'codex-review-chunk-001');
    mkdirSync(artifact);
    writeFileSync(join(artifact, 'chunk-002.json'), report('chunk-002'));
    assert.throws(() => readReports(directory), /Unexpected report file/);
  });
});
