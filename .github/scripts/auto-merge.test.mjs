import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runAutoMerge, validateEffectiveRules } from './auto-merge.mjs';

const expected = {
  repository: 'Joehl1103/counter-strike-facsimile', number: 119,
  head: 'a'.repeat(40), base: 'b'.repeat(40),
};
const qualifyingPullRequest = {
  state: 'open', draft: false,
  base: { ref: 'main', sha: expected.base },
  head: { sha: expected.head, repo: { full_name: expected.repository } },
  title: 'ci: JKH-119 arm protected auto-merge',
  body: 'https://linear.app/jkhl1103-personal/issue/JKH-119/automatic-merge\n\n' +
    '## Acceptance Criteria\n- [x] GitHub arms only protected qualifying candidates.\n',
};
const effectiveRules = [
  { type: 'pull_request', parameters: {
    required_review_thread_resolution: true, allowed_merge_methods: ['squash'],
  } },
  { type: 'required_status_checks', parameters: {
    strict_required_status_checks_policy: true,
    required_status_checks: [
      { context: 'Repository checks', integration_id: 15368 },
      { context: 'Game checks', integration_id: 15368 },
      { context: 'Independent Codex review', integration_id: 15368 },
    ],
  } },
  { type: 'deletion' },
  { type: 'non_fast_forward' },
];

function createGhRunner({ pullRequest = qualifyingPullRequest, rules = effectiveRules, postMerge = null,
  mergeError = null, mergeCommit = { sha: 'c'.repeat(40), parents: [{ sha: expected.base }] } } = {}) {
  const calls = [];
  let pullRequestLookups = 0;
  return {
    calls,
    runGh: async (argumentsForGh) => {
      calls.push(argumentsForGh);
      if (argumentsForGh[0] === 'api' && argumentsForGh[1].includes('/pulls/')) {
        pullRequestLookups += 1;
        return { stdout: JSON.stringify(pullRequestLookups === 1 ? pullRequest : (postMerge ?? pullRequest)) };
      }
      if (argumentsForGh[0] === 'api' && argumentsForGh[1].includes('/git/commits/')) {
        return { stdout: JSON.stringify(mergeCommit) };
      }
      if (argumentsForGh[0] === 'api') return { stdout: JSON.stringify(rules) };
      if (mergeError) throw mergeError;
      return { stdout: '' };
    },
  };
}

test('effective main rules require all configured protections and current Actions checks', () => {
  assert.doesNotThrow(() => validateEffectiveRules(effectiveRules));
  for (const missingType of ['pull_request', 'required_status_checks', 'deletion', 'non_fast_forward']) {
    assert.throws(() => validateEffectiveRules(effectiveRules.filter((rule) => rule.type !== missingType)));
  }
  for (const mutate of [
    (rules) => { rules[0].parameters.required_review_thread_resolution = false; },
    (rules) => { rules[0].parameters.allowed_merge_methods = ['squash', 'merge']; },
    (rules) => { rules[1].parameters.strict_required_status_checks_policy = false; },
    (rules) => { rules[1].parameters.required_status_checks.pop(); },
    (rules) => { rules[1].parameters.required_status_checks[1].integration_id = 1; },
  ]) {
    const rules = structuredClone(effectiveRules);
    mutate(rules);
    assert.throws(() => validateEffectiveRules(rules));
  }
});

test('refuses stale, draft, fork, and wrong-target PRs before native merge', async () => {
  for (const mutation of [
    { head: { ...qualifyingPullRequest.head, sha: expected.base } },
    { base: { ...qualifyingPullRequest.base, sha: expected.head } },
    { draft: true },
    { head: { ...qualifyingPullRequest.head, repo: { full_name: 'other/fork' } } },
    { base: { ...qualifyingPullRequest.base, ref: 'release' } },
  ]) {
    const runner = createGhRunner({ pullRequest: { ...qualifyingPullRequest, ...mutation } });
    await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh }));
    assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);
  }
});

test('arms native squash auto-merge only for an exact protected candidate', async () => {
  const runner = createGhRunner({ postMerge: { ...qualifyingPullRequest, auto_merge: { merge_method: 'squash' } } });
  const result = await runAutoMerge({ expected, runGh: runner.runGh });
  assert.equal(result.outcome, 'armed');
  assert.deepEqual(runner.calls[2], [
    'pr', 'merge', '119', '--repo', expected.repository,
    '--auto', '--squash', '--match-head-commit', expected.head,
  ]);
  assert.equal(runner.calls[2].includes('--admin'), false);
});

test('refuses a head race through GitHub match-head protection', async () => {
  const runner = createGhRunner({
    mergeError: new Error('pull request head SHA does not match --match-head-commit'),
  });
  await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh }), /match-head-commit/);
  assert.equal(runner.calls.filter((call) => call[0] === 'api').length, 2);
});

test('arms native merge while CI is pending or failing, leaving enforcement to main rules', async () => {
  const pullRequest = { ...qualifyingPullRequest, mergeable_state: 'blocked' };
  const runner = createGhRunner({ pullRequest, postMerge: { ...pullRequest, auto_merge: { merge_method: 'squash' } } });
  const result = await runAutoMerge({ expected, runGh: runner.runGh });
  assert.equal(result.outcome, 'armed');
  assert.equal(runner.calls.some((call) => call[0] === 'pr'), true);
});

test('reports an immediate native merge', async () => {
  const runner = createGhRunner({ postMerge: { ...qualifyingPullRequest, state: 'closed', merged: true, merge_commit_sha: 'c'.repeat(40) } });
  const result = await runAutoMerge({ expected, runGh: runner.runGh });
  assert.equal(result.outcome, 'merged');
});

test('does not re-arm an existing squash auto-merge request', async () => {
  const runner = createGhRunner({
    pullRequest: { ...qualifyingPullRequest, auto_merge: { merge_method: 'squash' } },
  });
  const result = await runAutoMerge({ expected, runGh: runner.runGh });
  assert.equal(result.outcome, 'armed');
  assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);
});

test('refuses an already armed non-squash merge request', async () => {
  const runner = createGhRunner({
    pullRequest: { ...qualifyingPullRequest, auto_merge: { merge_method: 'rebase' } },
  });
  await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh }), /must use squash/);
  assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);
});

test('does not report success for a changed post-request head or armed base', async () => {
  const armed = { ...qualifyingPullRequest, auto_merge: { merge_method: 'squash' } };
  for (const postMerge of [
    { ...armed, head: { ...armed.head, sha: 'c'.repeat(40) } },
    { ...armed, base: { ...armed.base, sha: 'c'.repeat(40) } },
    { ...armed, base: { ...armed.base, ref: 'release' } },
    { ...armed, auto_merge: { merge_method: 'rebase' } },
  ]) {
    const runner = createGhRunner({ postMerge });
    await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh }));
  }
});

test('verifies the actual squash commit parent before reporting a completed merge', async () => {
  const postMerge = { ...qualifyingPullRequest, state: 'closed', merged: true,
    merge_commit_sha: 'c'.repeat(40),
    // The live base ref may already point to the merge; the commit parent is authoritative.
    base: { ...qualifyingPullRequest.base, sha: 'c'.repeat(40) } };
  const valid = createGhRunner({ postMerge });
  assert.equal((await runAutoMerge({ expected, runGh: valid.runGh })).outcome, 'merged');
  for (const mergeCommit of [
    { sha: 'c'.repeat(40), parents: [{ sha: 'd'.repeat(40) }] },
    { sha: 'c'.repeat(40), parents: [{ sha: expected.base }, { sha: expected.head }] },
    { sha: 'd'.repeat(40), parents: [{ sha: expected.base }] },
  ]) {
    const runner = createGhRunner({ postMerge, mergeCommit });
    await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh }));
  }
  const missing = createGhRunner({ postMerge: { ...postMerge, merge_commit_sha: null } });
  await assert.rejects(runAutoMerge({ expected, runGh: missing.runGh }), /merge commit/);
});

test('coordinator immediate mode never arms a queued merge',async()=>{
 const merged={...qualifyingPullRequest,merged:true,merge_commit_sha:'c'.repeat(40)};
 const runner=createGhRunner({postMerge:merged});
 assert.equal((await runAutoMerge({expected,runGh:runner.runGh,allowQueue:false})).outcome,'merged');
 assert.ok(!runner.calls.find(c=>c[0]==='pr').includes('--auto'));
 const waiting=createGhRunner({postMerge:{...qualifyingPullRequest,auto_merge:{merge_method:'squash'}}});
 await assert.rejects(runAutoMerge({expected,runGh:waiting.runGh,allowQueue:false}));
});
