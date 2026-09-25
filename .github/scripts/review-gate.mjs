import assert from 'node:assert/strict';
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReview } from './ci-policy.mjs';
import { buildPlan, DEFAULT_BUDGET, DEFAULT_MAX_CHUNKS } from './review-plan.mjs';

// Collect every failure so the summary explains all missing or adverse evidence.
export function aggregateReviews({ plan, reports, head, base, reviewerResult, planResult, runId, runAttempt, planDigest }) {
  const limitations = [];
  const parsedReports = [];
  function requireCondition(condition, message) {
    if (!condition) {
      limitations.push(message);
    }
  }
  requireCondition(typeof runId === 'string' && /^[0-9]+$/.test(runId), 'Missing or invalid trusted run id.');
  requireCondition(typeof runAttempt === 'string' && /^[0-9]+$/.test(runAttempt), 'Missing or invalid trusted run attempt.');
  requireCondition(typeof planDigest === 'string' && /^[a-f0-9]{64}$/.test(planDigest) && plan.digest === planDigest,
    'Regenerated plan digest differs from plan job.');
  requireCondition(planResult === 'success', 'Review planning failed or did not run.');
  requireCondition(plan.head === head && plan.base === base, 'Plan identities do not match the candidate.');
  requireCondition(plan.overflow === false, 'Plan overflow: chunk cap or unreviewable binary content prevents a complete review.');
  requireCondition(plan.uncovered.length === 0, 'Plan contains uncovered changes.');
  const expectedIds = new Set(plan.chunks.map((chunk) => chunk.id));
  requireCondition(expectedIds.size === plan.chunks.length, 'Plan contains duplicate chunk ids.');
  const observedIds = new Set();
  for (const report of reports) {
    requireCondition(expectedIds.has(report.id), `Unexpected chunk report: ${report.id}`);
    requireCondition(!observedIds.has(report.id), `Duplicate chunk report: ${report.id}`);
    observedIds.add(report.id);
    try {
      const envelope = JSON.parse(report.text);
      assert.ok(envelope && typeof envelope === 'object' && !Array.isArray(envelope), 'Expected a report envelope.');
      assert.equal(envelope.run_id, runId, 'Envelope run_id differs from gate run.');
      assert.equal(envelope.run_attempt, runAttempt, 'Envelope run_attempt differs from gate attempt.');
      assert.equal(envelope.plan_digest, planDigest, 'Envelope plan_digest differs from plan job.');
      assert.equal(envelope.chunk_id, report.id, 'Envelope chunk_id does not match its filename.');
      assert.equal(typeof envelope.report_text, 'string', 'Envelope report_text must be a string.');
      const parsed = JSON.parse(envelope.report_text);
      parsedReports.push({ id: report.id, report: parsed });
      assert.equal(parsed.chunk_id, report.id, 'Report chunk_id does not match its filename.');
      validateReview(parsed, head, base);
    } catch (error) {
      limitations.push(`${report.id}: ${error.message}`);
      // Retain malformed provider output as escaped data in the summary too.
      if (!parsedReports.some((entry) => entry.id === report.id)) {
        parsedReports.push({ id: report.id, raw: report.text });
      }
    }
  }
  for (const id of expectedIds) {
    requireCondition(observedIds.has(id), `Missing chunk report: ${id}`);
  }

  let summary = `Planned ${plan.chunks.length} chunks; ${plan.skipped.length} files excluded by policy.`;
  if (plan.chunks.length > 0) {
    requireCondition(reviewerResult === 'success', 'Independent reviewer job failed or did not run.');
  } else {
    summary = 'asset-only change requires human review';
    requireCondition(false, summary);
  }
  const complete = limitations.length === 0;
  return { reviewed_head: head, reviewed_base: base, complete,
    verdict: complete ? 'pass' : 'changes_requested', summary, reports: parsedReports,
    skipped: plan.skipped, uncovered: plan.uncovered.map(({ diff, ...item }) => item), limitations };
}

export function renderSummary(result) {
  const escaped = JSON.stringify(result, null, 2)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<h2>Independent Codex review</h2><pre>${escaped}</pre>\n`;
}

// merge-multiple downloads one or many artifacts into the same flat directory.
// Never recurse or follow symlinks. The aggregate validator binds each filename
// to both the planned id set and the report's own chunk_id.
export function readReports(directory) {
  const reports = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const match = entry.name.match(/^(chunk-\d{3,})\.json$/);
    // The equality also rejects a trailing newline, which JS's $ can otherwise allow.
    assert.ok(entry.isFile() && match && match[0] === entry.name, 'Unexpected report file; require flat chunk-NNN.json regular files.');
    reports.push({ id: match[1], text: readFileSync(resolve(directory, entry.name), 'utf8') });
  }
  return reports;
}

async function cli() {
  const head = process.env.REVIEW_HEAD;
  const base = process.env.REVIEW_BASE;
  let result;
  try {
    assert.equal(process.env.GATE_PREPARATION_RESULT, 'success', 'Gate checkout, setup or artifact download failed.');
    const plan = await buildPlan({ repoDir: process.cwd(), base, head,
      budget: Number(process.env.REVIEW_CHUNK_BUDGET ?? DEFAULT_BUDGET),
      maxChunks: Number(process.env.REVIEW_MAX_CHUNKS ?? DEFAULT_MAX_CHUNKS),
    });
    assert.equal(plan.digest, process.env.REVIEW_DIGEST, 'Regenerated plan digest differs from plan job.');
    const reports = readReports(process.env.REVIEW_REPORTS);
    result = aggregateReviews({ plan, reports, head, base,
      reviewerResult: process.env.REVIEW_RESULT, planResult: process.env.PLAN_RESULT,
      runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      planDigest: process.env.REVIEW_DIGEST });
  } catch (error) {
    result = { reviewed_head: head, reviewed_base: base, complete: false,
      verdict: 'changes_requested', limitations: [error.message] };
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(result));
  }
  console.log(`Independent review: ${result.verdict}; complete=${result.complete}`);
  if (!result.complete) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await cli();
}
