import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateEffectiveRules } from './auto-merge.mjs';
import { validatePullRequest } from './ci-policy.mjs';

const REQUIRED_CHECKS = [
  'Repository checks',
  'Game checks',
  'Independent Codex review',
];

const SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const RUN_ID = /^[1-9]\d*$/;

function markerFor(kind, identity) {
  const digest = createHash('sha256').update(JSON.stringify({ kind, ...identity })).digest('hex').slice(0, 20);
  return `merge-coordinator:v1:${kind}:${digest}`;
}

function candidateIdentity(snapshot) {
  return {
    number: snapshot.pr.number,
    head: snapshot.pr.head.sha,
    base: snapshot.pr.base.sha,
  };
}

function sameIdentity(left, right) {
  return left.pr.number === right.pr.number &&
    left.pr.head.sha === right.pr.head.sha && left.pr.base.sha === right.pr.base.sha &&
    left.baseSha === right.baseSha && right.baseSha === right.pr.base.sha;
}

function validIdentity(snapshot) {
  return snapshot?.pr && Number.isSafeInteger(snapshot.pr.number) && snapshot.pr.number > 0 &&
    SHA.test(snapshot.pr.head?.sha ?? '') && SHA.test(snapshot.pr.base?.sha ?? '');
}

function acceptanceCriteriaAreChecked(body) {
  const visibleBody = (body ?? '').replace(/<!--[\s\S]*?-->/g, '');
  const criteria = visibleBody.match(/^## Acceptance Criteria\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1];
  const entries = criteria?.match(/^- \[([ xX])\] \S.+/gm) ?? [];
  return entries.length > 0 && entries.every((entry) => /^- \[[xX]\]/.test(entry));
}

function hasRequiredChecks(snapshot) {
  return REQUIRED_CHECKS.every((name) =>
    snapshot.checks.filter((check) => check.name === name && check.state === 'success').length === 1);
}

function hasExactPassingReview(snapshot) {
  return snapshot.review?.passed === true && snapshot.review.head === snapshot.pr.head.sha &&
    snapshot.review.base === snapshot.pr.base.sha;
}

function hasPendingChecks(snapshot) {
  return snapshot.checks.some((check) => check.state === 'pending');
}

function failedChecks(snapshot) {
  return snapshot.checks.filter((check) => check.state === 'failure');
}

function isRetryableFailure(check) {
  return check?.kind === 'infrastructure' && RUN_ID.test(String(check.runId ?? ''));
}

function isTriageDecision(value) {
  return value && (value.route === 'retry_ci' || value.route === 'needs_human') &&
    Number.isFinite(value.confidence) && value.confidence >= 0 && value.confidence <= 1 &&
    Number.isFinite(value.probability) && value.probability >= 0 && value.probability <= 1 &&
    typeof value.reasonCode === 'string' && /^[a-z0-9_]{1,80}$/.test(value.reasonCode);
}

function isCoordinatorAuthored(comment, actor) {
  return comment?.user?.login === actor && typeof comment.body === 'string';
}

function hasBotMarker(comments, marker, actor) {
  return comments.some((comment) => isCoordinatorAuthored(comment, actor) && comment.body.includes(`<!-- ${marker} -->`));
}

function safeRunUrl(repository, runId) {
  return REPOSITORY.test(repository) && RUN_ID.test(String(runId))
    ? `https://github.com/${repository}/actions/runs/${runId}` : null;
}

function validateReadyCandidate(snapshot, repository) {
  assert.equal(snapshot.pr.state, 'open', 'PR is closed.');
  assert.equal(snapshot.pr.draft, false, 'PR is draft.');
  assert.equal(snapshot.pr.base.ref, 'main', 'Only main PRs are coordinated.');
  assert.equal(snapshot.pr.head.repo?.full_name, repository, 'Fork PRs are never coordinated.');
  validatePullRequest(snapshot.pr);
  assert.ok(acceptanceCriteriaAreChecked(snapshot.pr.body),
    'Every Acceptance Criteria checklist entry must be checked before coordination.');
}

async function validateRulesBeforeWrite(github) {
  validateEffectiveRules(await github.effectiveRules());
}

async function freshSnapshot(github, priorSnapshot) {
  const currentSnapshot = await github.snapshot(priorSnapshot.pr.number);
  assert.ok(validIdentity(currentSnapshot), 'GitHub returned a malformed live PR snapshot.');
  assert.ok(sameIdentity(priorSnapshot, currentSnapshot), 'PR head or base changed during coordination.');
  return currentSnapshot;
}

const humanReasons = {
  fork_requires_human: 'Inspect this fork and place an accepted candidate on a repository branch.',
  candidate_evidence_invalid: 'Verify the matching Linear link and mark each approved Acceptance Criteria item complete with evidence.',
  conflict_requires_repair: 'Resolve the conflicting changes and push the repair; fresh checks and independent review will run.',
  branch_update_refused: 'GitHub refused the branch update. Inspect branch permissions or resolve the conflict, then push a repaired candidate.',
  triage_unavailable: 'The blocker could not be classified. Inspect the failed checks and model configuration.',
  triage_needs_human: 'Inspect the failed checks and repair the code or configuration; the evidence did not justify an automatic retry.',
  retry_not_permitted: 'A substantive failure needs a repair. An infrastructure retry cannot resolve every failing check.',
  retry_limit_reached: 'The automatic retry was already used. Inspect the retained failure before another attempt.',
  checks_stalled_24h: 'Required checks have not completed for at least 24 hours. Inspect workflow triggers, runner access and credentials.',
  conversations_unresolved: 'Resolve the outstanding review conversations or changes-requested review after addressing its findings.',
  review_or_checks_not_current: 'Obtain all required checks and independent review for this exact head and current main.',
  snapshot_unavailable: 'The coordinator could not read complete PR evidence. Inspect repository/API permissions and workflow access.',
  merge_refused: 'GitHub refused the validated merge. Inspect live branch rules, required approvals and automation permissions.',
};

async function leaveHumanNotice({ github, snapshot, repository, owner, reasonCode, runId }) {
  const identity = candidateIdentity(snapshot);
  const marker = markerFor('human', { ...identity, reasonCode });
  const comments = await github.comments(snapshot.pr.number);
  if (hasBotMarker(comments, marker, github.actor)) return { outcome: 'already_notified', reasonCode };

  await validateRulesBeforeWrite(github);
  const runUrl = safeRunUrl(repository, runId);
  const details = runUrl ? `\nCI run: ${runUrl}` : '';
  await github.comment(snapshot.pr.number,
    `@${owner}\n<!-- ${marker} -->\n${humanReasons[reasonCode] ?? 'Inspect this candidate before continuing.'}\nReason: ${reasonCode}.\n` +
    `Candidate: head ${identity.head}, base ${identity.base}.${details}`);
  return { outcome: 'needs_human', reasonCode };
}

function blockedResult(number, reasonCode) {
  return { number, outcome: 'blocked', reasonCode };
}

/**
 * Coordinates at most one branch update or native merge in a tick. It never
 * turns a model decision into merge authority; triage only chooses CI retry
 * versus a human notice after a failed check.
 */
export async function coordinate({ github, triage, repository, owner = 'Joehl1103' }) {
  assert.ok(REPOSITORY.test(repository ?? ''), 'repository must be owner/name.');
  assert.match(github.actor ?? '', /^[A-Za-z0-9_-]+(?:\[bot\])?$/, 'Exact automation identity is required.');
  assert.match(owner, /^[A-Za-z0-9_-]+$/, 'Invalid notification login.');
  for (const method of ['listPulls', 'snapshot', 'effectiveRules', 'update', 'merge', 'rerun', 'comments', 'comment']) {
    assert.equal(typeof github?.[method], 'function', `github.${method} is required.`);
  }

  // Refuse every mutation when the protected-main policy is absent or weakened.
  await validateRulesBeforeWrite(github);
  const results = [];
  const pulls = await github.listPulls();
  assert.ok(Array.isArray(pulls), 'listPulls must return an array.');

  for (const pullRequest of pulls) {
    const number = pullRequest?.number;
    if (!Number.isSafeInteger(number) || number <= 0) {
      results.push({ number, outcome: 'skipped', reasonCode: 'malformed_pull_request' });
      continue;
    }

    let snapshot;
    try { snapshot = await github.snapshot(number); }
    catch {
      if (validIdentity({pr:pullRequest})) await leaveHumanNotice({ github, snapshot:{pr:pullRequest}, repository, owner, reasonCode:'snapshot_unavailable' });
      results.push(blockedResult(number, 'snapshot_unavailable')); continue;
    }
    if (!validIdentity(snapshot)) {
      results.push(blockedResult(number, 'malformed_snapshot'));
      continue;
    }
    if (snapshot.pr.state !== 'open' || snapshot.pr.draft === true) {
      results.push({ number, outcome: 'waiting', reasonCode: 'draft_or_closed' });
      continue;
    }
    if (snapshot.pr.base.ref !== 'main') {
      results.push({ number, outcome: 'skipped', reasonCode: 'non_main_target' });
      continue;
    }
    if (snapshot.pr.head.repo?.full_name !== repository) {
      await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'fork_requires_human' });
      results.push(blockedResult(number, 'fork_requires_human'));
      continue;
    }

    try {
      validateReadyCandidate(snapshot, repository);
    } catch {
      await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'candidate_evidence_invalid' });
      results.push(blockedResult(number, 'candidate_evidence_invalid'));
      continue;
    }

    if (snapshot.baseSha !== snapshot.pr.base.sha || snapshot.pr.mergeable == null) {
      results.push({ number, outcome: 'waiting', reasonCode: 'mergeability_pending' });
      continue;
    }
    if (snapshot.pr.mergeable === false) {
      // Jev may classify evidence but cannot choose conflicting code for us.
      try { await triage?.(snapshot); } catch { /* deterministic human path */ }
      await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'conflict_requires_repair' });
      results.push(blockedResult(number, 'conflict_requires_repair'));
      continue;
    }

    if (snapshot.behind === true) {
      try {
        const current = await freshSnapshot(github, snapshot);
        validateReadyCandidate(current, repository);
        assert.equal(current.behind, true, 'PR is no longer behind main.');
        await validateRulesBeforeWrite(github);
        assert.equal(current.pr.mergeable, true, 'Branch now conflicts.');
        await github.update(current.pr, current.pr.head.sha);
        results.push({ number, outcome: 'updated', head: current.pr.head.sha });
        return { results };
      } catch (error) {
        if ([403, 409, 422].includes(error.status)) {
          await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'branch_update_refused' });
        }
        results.push(blockedResult(number, 'stale_before_update'));
        continue;
      }
    }

    const failures = failedChecks(snapshot);
    if (failures.length > 0) {
      let decision;
      try {
        decision = await triage?.(snapshot);
      } catch {
        decision = null;
      }
      if (!isTriageDecision(decision)) {
        await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'triage_unavailable', runId: failures[0].runId });
        results.push(blockedResult(number, 'triage_unavailable'));
        continue;
      }
      if (decision.route !== 'retry_ci' || decision.confidence < 0.8 || decision.probability < 0.95) {
        await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'triage_needs_human', runId: failures[0].runId });
        results.push(blockedResult(number, 'triage_needs_human'));
        continue;
      }

      const retryable = failures.find(isRetryableFailure);
      if (!retryable || !failures.every(isRetryableFailure)) {
        await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'retry_not_permitted', runId: failures[0].runId });
        results.push(blockedResult(number, 'retry_not_permitted'));
        continue;
      }
      const retryMarker = markerFor('retry', { ...candidateIdentity(snapshot), runId: String(retryable.runId) });
      const comments = await github.comments(number);
      if (hasBotMarker(comments, retryMarker, github.actor)) {
        await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'retry_limit_reached', runId: retryable.runId });
        results.push(blockedResult(number, 'retry_limit_reached'));
        continue;
      }

      // Persist the attempt before rerunning. The marker has no mention and its
      // only purpose is to make retry limits survive separate coordinator ticks.
      await validateRulesBeforeWrite(github);
      await github.comment(number, `<!-- ${retryMarker} -->`);
      try {
        const current = await freshSnapshot(github, snapshot);
        validateReadyCandidate(current, repository);
        assert.equal(current.pr.mergeable, true);
        assert.ok(failedChecks(current).every(isRetryableFailure));
        const currentRun = current.checks.find((check) => check.state === 'failure' && String(check.runId ?? '') === String(retryable.runId));
        assert.ok(currentRun?.state === 'failure' && isRetryableFailure(currentRun),
          'The failed infrastructure run changed before rerun.');
        await validateRulesBeforeWrite(github);
        await github.rerun(retryable.runId);
        results.push({ number, outcome: 'rerun', runId: retryable.runId });
      } catch {
        results.push(blockedResult(number, 'stale_before_rerun'));
      }
      continue;
    }

    if (hasPendingChecks(snapshot)) {
      const idleMs = Date.now() - Date.parse(snapshot.pr.updated_at);
      if (Number.isFinite(idleMs) && idleMs >= 24 * 60 * 60 * 1000) {
        await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'checks_stalled_24h' });
      }
      results.push({ number, outcome: 'waiting', reasonCode: 'checks_pending' });
      continue;
    }
    if (!snapshot.conversationsResolved) {
      await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'conversations_unresolved' });
      results.push(blockedResult(number, 'conversations_unresolved'));
      continue;
    }
    if (!hasRequiredChecks(snapshot) || !hasExactPassingReview(snapshot)) {
      await leaveHumanNotice({ github, snapshot, repository, owner, reasonCode: 'review_or_checks_not_current' });
      results.push(blockedResult(number, 'review_or_checks_not_current'));
      continue;
    }

    try {
      const current = await freshSnapshot(github, snapshot);
      validateReadyCandidate(current, repository);
      assert.equal(current.behind, false, 'PR is behind main.');
      assert.equal(current.pr.mergeable, true, 'PR has conflicts.');
      assert.ok(current.conversationsResolved, 'Review conversations are unresolved.');
      assert.ok(hasRequiredChecks(current), 'Required checks are no longer successful.');
      assert.ok(hasExactPassingReview(current), 'Independent review is no longer exact and passing.');
      await validateRulesBeforeWrite(github);
      const merged = await github.merge(current.pr, current.pr.head.sha, current.pr.base.sha);
      results.push({ number, outcome: merged.outcome, mergeCommit: merged.mergeCommit });
      return { results };
    } catch {
      const after = await github.snapshot(number);
      if (validIdentity(after) && sameIdentity(snapshot, after) && after.pr.state === 'open' && !after.pr.draft) {
        await leaveHumanNotice({github, snapshot:after, repository, owner, reasonCode:'merge_refused'});
      }
      results.push(blockedResult(number, 'stale_before_merge'));
    }
  }
  return { results };
}

export const __testables = {
  acceptanceCriteriaAreChecked,
  hasBotMarker,
  hasExactPassingReview,
  hasRequiredChecks,
  isRetryableFailure,
  markerFor,
};
