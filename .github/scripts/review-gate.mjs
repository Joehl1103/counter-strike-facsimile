import assert from 'node:assert/strict';
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReview } from './ci-policy.mjs';
import { buildPlan, DEFAULT_BUDGET, DEFAULT_MAX_CHUNKS } from './review-plan.mjs';

// Collect every failure so the summary explains all missing or adverse evidence.
export function aggregateReviews({ plan, reports, head, base, reviewerResult, planResult }) {
  const limitations = [];
  const parsedReports = [];
  function requireCondition(condition, message) {
    if (!condition) {
      limitations.push(message);
    }
  }
  requireCondition(planResult === 'success', 'Review planning failed or did not run.');
  requireCondition(plan.head === head && plan.base === base, 'Plan identities do not match the candidate.');
  requireCondition(plan.overflow === false, 'Plan overflow: not all changed content can be covered.');
  const expectedIds = new Set(plan.chunks.map((chunk) => chunk.id));
  requireCondition(expectedIds.size === plan.chunks.length, 'Plan contains duplicate chunk ids.');
  const observedIds = new Set();
  for (const report of reports) {
    requireCondition(expectedIds.has(report.id), `Unexpected chunk report: ${report.id}`);
    requireCondition(!observedIds.has(report.id), `Duplicate chunk report: ${report.id}`);
    observedIds.add(report.id);
    try {
      const parsed = JSON.parse(report.text);
      parsedReports.push({ id: report.id, report: parsed });
      assert.equal(parsed.chunk_id, report.id, 'Report chunk_id does not match its artifact.');
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

  let summary = `Reviewed ${plan.chunks.length} planned chunks; ${plan.skipped.length} files excluded by policy.`;
  if (plan.chunks.length > 0) {
    requireCondition(reviewerResult === 'success', 'Independent reviewer job failed or did not run.');
  } else {
    requireCondition(reviewerResult === 'skipped', 'Zero-chunk reviewer must be skipped.');
    const onlyBinaryOrAssets = plan.skipped.length > 0 &&
      plan.skipped.every((entry) => ['binary', 'asset'].includes(entry.reason));
    requireCondition(onlyBinaryOrAssets && plan.lockSummaries.length === 0,
      'Zero chunks may pass only for binary/asset-only changes, never locks, large deletions or generated-only changes.');
    summary = `No model review: only binary/assets excluded by policy: ${plan.skipped.map((entry) => entry.path).join(', ')}.`;
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

// Download artifacts into separate directories. Inspect all files, not a glob
// that could conceal extra reports. Artifact folder AND filename bind the id.
export function readReports(directory) {
  const reports = [];
  for (const artifact of readdirSync(directory, { withFileTypes: true })) {
    assert.ok(artifact.isDirectory() && /^codex-review-chunk-\d{3,}$/.test(artifact.name), 'Unexpected review artifact.');
    const id = artifact.name.slice('codex-review-'.length);
    const files = readdirSync(resolve(directory, artifact.name), { withFileTypes: true });
    assert.equal(files.length, 1, `Artifact ${id} must contain exactly one report.`);
    assert.ok(files[0].isFile() && files[0].name === `${id}.json`, `Unexpected report file for ${id}.`);
    reports.push({ id, text: readFileSync(resolve(directory, artifact.name, files[0].name), 'utf8') });
  }
  return reports;
}

function cli() {
  const head = process.env.REVIEW_HEAD;
  const base = process.env.REVIEW_BASE;
  let result;
  try {
    assert.equal(process.env.GATE_PREPARATION_RESULT, 'success', 'Gate checkout, setup or artifact download failed.');
    const plan = buildPlan({ repoDir: process.cwd(), base, head,
      budget: Number(process.env.REVIEW_CHUNK_BUDGET ?? DEFAULT_BUDGET),
      maxChunks: Number(process.env.REVIEW_MAX_CHUNKS ?? DEFAULT_MAX_CHUNKS),
    });
    assert.equal(plan.digest, process.env.REVIEW_DIGEST, 'Regenerated plan digest differs from plan job.');
    const reports = readReports(process.env.REVIEW_REPORTS);
    result = aggregateReviews({ plan, reports, head, base,
      reviewerResult: process.env.REVIEW_RESULT, planResult: process.env.PLAN_RESULT });
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
  cli();
}
