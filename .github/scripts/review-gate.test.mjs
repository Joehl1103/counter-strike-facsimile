import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { aggregateReviews, readReports, renderSummary } from './review-gate.mjs';

const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const plan = { files: [], head, base, overflow: false, chunks: [{ id: 'chunk-001' }, { id: 'chunk-002' }], skipped: [], lockSummaries: [], uncovered: [] };
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

  test('zero chunks pass only when every changed file is a confirmed allowlisted asset binary', () => {
    const skipped = [
      { path: 'photo.png', oldPath: 'photo.png', reason: 'asset_binary', size: 20, added: null, removed: null },
      { path: 'sound.m4a', oldPath: 'sound.m4a', reason: 'asset_binary', size: 30, added: null, removed: null },
    ];
    const emptyPlan = { ...plan, chunks: [], skipped, files: skipped };
    const result = aggregate({ plan: emptyPlan, reports: [], reviewerResult: 'skipped' });
    assert.equal(result.complete, true);
    assert.match(result.summary, /photo.png/);
    assert.match(result.summary, /sound.m4a/);
    for (const changes of [
      { path: 'code.js', oldPath: 'code.js' }, { path: 'assets/model.bin', oldPath: 'assets/model.bin' },
      { path: '.github/photo.png', oldPath: '.github/photo.png' },
      { oldPath: 'code.js' }, { added: 1, removed: 0 }, { reason: 'binary' },
    ]) {
      const forgedSkip = { ...skipped[0], ...changes };
      const invalidPlan = { ...emptyPlan, skipped: [forgedSkip], files: [forgedSkip] };
      assert.equal(aggregate({ plan: invalidPlan, reports: [], reviewerResult: 'skipped' }).complete, false);
    }
    for (const invalidPlan of [
      { ...emptyPlan, files: [...skipped, { path: 'unaccounted.js' }] },
      { ...emptyPlan, files: [{ ...skipped[0], path: 'other.png' }, skipped[1]] },
      { ...emptyPlan, lockSummaries: [{ path: 'package-lock.json' }] },
      { ...emptyPlan, uncovered: [{ path: 'bad.js', reason: 'unreviewable_binary' }] },
      { ...emptyPlan, skipped: [], files: [] },
    ]) {
      assert.equal(aggregate({ plan: invalidPlan, reports: [], reviewerResult: 'skipped' }).complete, false);
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
  test('reviewer uploads replace the prior artifact when rerunning a leg', () => {
    const workflow = readFileSync(new URL('../workflows/codex-review.yml', import.meta.url), 'utf8');
    const uploadStep = workflow.match(/      - uses: actions\/upload-artifact@[\s\S]*?(?=\n  review-gate:)/)?.[0];
    assert.ok(uploadStep, 'Workflow must upload per-chunk reports.');
    assert.match(uploadStep, /          overwrite: true/);
    assert.match(uploadStep, /          name: codex-review-\$\{\{ matrix.chunk \}\}/);
  });

  test('workflow downloads all chunk reports into one flat directory', () => {
    const workflow = readFileSync(new URL('../workflows/codex-review.yml', import.meta.url), 'utf8');
    const downloadStep = workflow.match(/      - uses: actions\/download-artifact@[\s\S]*?(?=\n      - name:)/)?.[0];
    assert.ok(downloadStep);
    assert.match(downloadStep, /          merge-multiple: true/);
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
