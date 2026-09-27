import assert from 'node:assert/strict';
import { execFile as executeFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validatePullRequest } from './ci-policy.mjs';

const execFile = promisify(executeFile);
const REQUIRED_CHECKS = [
  'Repository checks',
  'Game checks',
  'Independent Codex review',
];
const GITHUB_ACTIONS_INTEGRATION_ID = 15368;
export const PLAN_LIMIT_MESSAGE = 'Upgrade to GitHub Pro or make this repository public to enable this feature.';

// REST errors carry a sanitized flag; gh must provide matching JSON and stderr.
export function isPlanLimitedRulesError(error) {
  if (error?.status !== undefined) {
    return error.status === 403 && error.planLimited === true;
  }
  const expectedStderr = `gh: ${PLAN_LIMIT_MESSAGE} (HTTP 403)`;
  if (typeof error?.stdout !== 'string' || typeof error?.stderr !== 'string' ||
      error.stderr.trim() !== expectedStderr) {
    return false;
  }
  try {
    const body = JSON.parse(error.stdout);
    return body?.message === PLAN_LIMIT_MESSAGE && String(body.status) === '403';
  } catch {
    return false;
  }
}

// Only the known plan limitation or confirmed private empty rules can fall back.
export async function resolveRulesMode({ effectiveRules, repository }) {
  let rules;
  try {
    rules = await effectiveRules();
  } catch (error) {
    if (isPlanLimitedRulesError(error)) {
      return 'self_enforced';
    }
    throw error;
  }

  if (Array.isArray(rules) && rules.length === 0) {
    const repositoryDetails = await repository();
    if (repositoryDetails?.private === true) {
      return 'self_enforced';
    }
  }
  validateEffectiveRules(rules);
  return 'github_rules';
}

function requireValue(value, name) {
  assert.ok(value, `${name} is required.`);
  return value;
}

export function validateCandidate(pullRequest, expected) {
  assert.match(expected.head, /^[a-f0-9]{40}$/, 'Expected head must be a commit SHA.');
  assert.match(expected.base, /^[a-f0-9]{40}$/, 'Expected base must be a commit SHA.');
  assert.equal(pullRequest.state, 'open', 'PR is no longer open.');
  assert.equal(pullRequest.draft, false, 'Draft PRs are never armed for merge.');
  assert.equal(pullRequest.base.ref, 'main', 'Only PRs targeting main are eligible.');
  assert.equal(pullRequest.base.sha, expected.base, 'PR base changed after review started.');
  assert.equal(pullRequest.head.sha, expected.head, 'PR head changed after review started.');
  assert.equal(pullRequest.head.repo?.full_name, expected.repository,
    'Fork PRs are never armed for merge.');
  validatePullRequest(pullRequest);
}

export function validateEffectiveRules(effectiveRules) {
  assert.ok(Array.isArray(effectiveRules), 'Effective branch rules are unavailable.');
  const pullRequestRule = effectiveRules.find((rule) => rule.type === 'pull_request');
  assert.ok(pullRequestRule, 'main must require pull requests.');
  assert.equal(pullRequestRule.parameters?.required_review_thread_resolution, true,
    'main must require resolved review conversations.');
  assert.deepEqual(pullRequestRule.parameters?.allowed_merge_methods, ['squash'],
    'main must permit only squash merges.');
  for (const ruleType of ['deletion', 'non_fast_forward']) {
    assert.ok(effectiveRules.some((rule) => rule.type === ruleType),
      `main must enforce the ${ruleType} rule.`);
  }

  const statusRule = effectiveRules.find((rule) => rule.type === 'required_status_checks');
  assert.ok(statusRule, 'main must require status checks.');
  const parameters = statusRule.parameters ?? {};
  assert.equal(parameters.strict_required_status_checks_policy, true,
    'main must require an up-to-date branch.');
  const checks = parameters.required_status_checks;
  assert.ok(Array.isArray(checks), 'main must list required status checks.');

  for (const name of REQUIRED_CHECKS) {
    const matchingChecks = checks.filter((check) => check.context === name);
    assert.equal(matchingChecks.length, 1, `main must require exactly one ${name} check.`);
    assert.equal(matchingChecks[0].integration_id, GITHUB_ACTIONS_INTEGRATION_ID,
      `${name} must come from GitHub Actions.`);
  }
}

function parseJson(commandResult, description) {
  try {
    return JSON.parse(commandResult.stdout);
  } catch {
    throw new Error(`${description} did not return JSON.`);
  }
}

export async function runAutoMerge({ expected, runGh, allowQueue = true, rulesMode = 'github_rules' }) {
  assert.ok(['github_rules', 'self_enforced'].includes(rulesMode), 'Unknown rules mode.');
  if (rulesMode === 'self_enforced') {
    assert.equal(allowQueue, false, 'Self-enforced mode requires allowQueue: false.');
  }
  const pullRequest = parseJson(await runGh([
    'api', `repos/${expected.repository}/pulls/${expected.number}`,
  ]), 'Pull request lookup');
  validateCandidate(pullRequest, expected);

  const currentRulesMode = await resolveRulesMode({
    effectiveRules: async () => parseJson(await runGh([
      'api', `repos/${expected.repository}/rules/branches/main`,
    ]), 'Effective main rules lookup'),
    repository: async () => parseJson(await runGh([
      'api', `repos/${expected.repository}`,
    ]), 'Repository visibility lookup'),
  });
  if (currentRulesMode === 'self_enforced') {
    assert.equal(rulesMode, 'self_enforced', 'Plan-limited rules require coordinator self-enforcement.');
  }

  if (pullRequest.auto_merge && allowQueue) {
    assert.equal(pullRequest.auto_merge.merge_method, 'squash',
      'Existing auto-merge must use squash.');
    return { outcome: 'armed', message: 'Native GitHub squash auto-merge is already armed.' };
  }

  // Keep this the last lookup before the merge; GitHub cannot match the base atomically.
  if (currentRulesMode === 'self_enforced') {
    const main = parseJson(await runGh([
      'api', `repos/${expected.repository}/branches/main`,
    ]), 'Live main lookup');
    assert.equal(main.commit?.sha, expected.base, 'Live main changed from the reviewed base.');
  }
  await runGh([
    'pr', 'merge', String(expected.number), '--repo', expected.repository,
    ...(allowQueue ? ['--auto'] : []), '--squash', '--match-head-commit', expected.head,
  ]);

  const updatedPullRequest = parseJson(await runGh([
    'api', `repos/${expected.repository}/pulls/${expected.number}`,
  ]), 'Post-merge pull request lookup');
  assert.equal(updatedPullRequest.head.sha, expected.head,
    'PR head changed during the native merge request; outcome is stale.');
  if (updatedPullRequest.merged === true) {
    const mergeCommitSha = updatedPullRequest.merge_commit_sha;
    assert.match(mergeCommitSha ?? '', /^[a-f0-9]{40}$/, 'Merged PR must identify its merge commit.');
    const mergeCommit = parseJson(await runGh([
      'api', `repos/${expected.repository}/git/commits/${mergeCommitSha}`,
    ]), 'Merge commit lookup');
    assert.equal(mergeCommit.sha, mergeCommitSha, 'GitHub returned a different merge commit.');
    assert.equal(mergeCommit.parents?.length, 1, 'The merged result must be a squash commit.');
    if (currentRulesMode === 'self_enforced' && mergeCommit.parents[0].sha !== expected.base) {
      const error = new Error('The completed merge used a different base from the independent review.');
      error.code = 'merged_against_unreviewed_base';
      error.mergeCommit = mergeCommitSha;
      throw error;
    }
    assert.equal(mergeCommit.parents[0].sha, expected.base,
      'The completed merge used a different base from the independent review.');
    return { outcome: 'merged', mergeCommit: mergeCommitSha,
      message: 'Native GitHub squash merge completed against the reviewed base.' };
  }
  if (allowQueue && updatedPullRequest.state === 'open' && updatedPullRequest.auto_merge) {
    validateCandidate(updatedPullRequest, expected);
    assert.equal(updatedPullRequest.auto_merge.merge_method, 'squash',
      'Post-request auto-merge must use squash.');
    return { outcome: 'armed', message: 'Native GitHub squash auto-merge is armed and waiting for required checks.' };
  }
  throw new Error('GitHub neither merged nor armed native auto-merge; inspect the PR state.');
}

async function main() {
  const expected = {
    repository: requireValue(process.env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY'),
    number: Number(requireValue(process.env.PR_NUMBER, 'PR_NUMBER')),
    head: requireValue(process.env.EXPECTED_HEAD, 'EXPECTED_HEAD'),
    base: requireValue(process.env.EXPECTED_BASE, 'EXPECTED_BASE'),
  };
  assert.ok(Number.isSafeInteger(expected.number) && expected.number > 0, 'PR_NUMBER must be positive.');

  const result = await runAutoMerge({
    expected,
    runGh: (argumentsForGh) => execFile('gh', argumentsForGh, { encoding: 'utf8' }),
  });
  console.log(`${result.outcome}: ${result.message}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`auto-merge refused: ${error.message}`);
    process.exitCode = 1;
  });
}
