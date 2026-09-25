import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPlanLimitedRulesError, runAutoMerge, validateEffectiveRules } from './auto-merge.mjs';
import { coordinate } from './merge-coordinator.mjs';

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
  rulesError = null, mainSha = expected.base, repositoryData = { private: true },
  mergeError = null, mergeCommit = { sha: 'c'.repeat(40), parents: [{ sha: expected.base }] } } = {}) {
  const calls = [];
  let pullRequestLookups = 0;
  return {
    calls,
    runGh: async (argumentsForGh) => {
      calls.push(argumentsForGh);
      if (argumentsForGh[1] === `repos/${expected.repository}/branches/main`) {
        return { stdout: JSON.stringify({ commit: { sha: mainSha } }) };
      }
      if (argumentsForGh[1] === `repos/${expected.repository}`) {
        return { stdout: JSON.stringify(repositoryData) };
      }
      if (argumentsForGh[1]?.endsWith('/rules/branches/main') && rulesError) {
        throw rulesError;
      }
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

const upgradeMessage = 'Upgrade to GitHub Pro or make this repository public to enable this feature.';
const planLimitedError = Object.assign(new Error('gh command failed'), {
  code: 1,
  stdout: JSON.stringify({ message: upgradeMessage,
    documentation_url: 'https://docs.github.com/rest/repos/rules#get-rules-for-a-branch', status: '403' }),
  stderr: `gh: ${upgradeMessage} (HTTP 403)\n`,
});
const mergedPullRequest = {
  ...qualifyingPullRequest, state: 'closed', merged: true, merge_commit_sha: 'c'.repeat(40),
};

test('self-enforced plan fallback checks live main then immediately squash merges the exact head', async () => {
  const runner = createGhRunner({ rulesError: planLimitedError, postMerge: mergedPullRequest });
  const result = await runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' });

  assert.equal(result.outcome, 'merged');
  assert.deepEqual(runner.calls.slice(2, 4), [
    ['api', `repos/${expected.repository}/branches/main`],
    ['pr', 'merge', '119', '--repo', expected.repository, '--squash', '--match-head-commit', expected.head],
  ]);
});

test('only the structured real gh plan-limit response authorizes fallback', async () => {
  assert.equal(isPlanLimitedRulesError(planLimitedError), true);
  assert.equal(isPlanLimitedRulesError({ status: 403, planLimited: true }), true);
  assert.equal(isPlanLimitedRulesError({ status: 500, planLimited: true }), false);

  const ambiguousDiagnostics = [
    { stderr: `${planLimitedError.stderr}Extra content\n` },
    { stderr: `gh: HTTP 500 after an earlier error: ${planLimitedError.stderr}` },
    { stdout: 'not JSON' },
    { stdout: JSON.stringify({ message: upgradeMessage, status: '500' }) },
    { stdout: JSON.stringify({ message: 'Permission denied', status: '403' }) },
    { stdout: undefined, stderr: undefined, message: `gh: ${upgradeMessage} (HTTP 403)` },
  ];
  for (const diagnostic of ambiguousDiagnostics) {
    const rulesError = Object.assign(new Error('gh command failed'), {
      stdout: planLimitedError.stdout, stderr: planLimitedError.stderr, ...diagnostic,
    });
    assert.equal(isPlanLimitedRulesError(rulesError), false);

    const runner = createGhRunner({ rulesError, postMerge: mergedPullRequest });
    await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' }));
    assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);

    const github = {
      actor: 'github-actions[bot]',
      effectiveRules: async () => { throw rulesError; },
    };
    for (const method of ['listPulls', 'snapshot', 'update', 'merge', 'rerun', 'comments', 'comment']) {
      github[method] = async () => assert.fail(`Unexpected call: ${method}`);
    }
    await assert.rejects(coordinate({ github, repository: expected.repository }), (error) => error === rulesError);
  }
});

test('a self-enforced merge against an unreviewed parent identifies the completed merge for escalation', async () => {
  const runner = createGhRunner({ rulesError: planLimitedError, postMerge: mergedPullRequest,
    mergeCommit: { sha: 'c'.repeat(40), parents: [{ sha: 'd'.repeat(40) }] },
  });
  await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' }), (error) => {
    assert.equal(error.code, 'merged_against_unreviewed_base');
    assert.equal(error.mergeCommit, 'c'.repeat(40));
    return true;
  });
  const mergeIndex = runner.calls.findIndex((call) => call[0] === 'pr');
  assert.deepEqual(runner.calls[mergeIndex - 1], ['api', `repos/${expected.repository}/branches/main`]);
});

test('self-enforced fallback refuses a different live main without merging', async () => {
  const runner = createGhRunner({ rulesError: planLimitedError, mainSha: 'd'.repeat(40) });
  await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' }), /main/);
  assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);
});

test('self-enforcement requires an explicit immediate merge request', async () => {
  for (const options of [{}, { allowQueue: false }, { rulesMode: 'self_enforced' },
    { rulesMode: 'self_enforced', allowQueue: true }]) {
    const runner = createGhRunner({ rulesError: planLimitedError, postMerge: mergedPullRequest });
    await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh, ...options }));
    assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);
  }
  // Reject the invalid option combination even when native rules are available.
  const runner = createGhRunner({ postMerge: mergedPullRequest });
  await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh, rulesMode: 'self_enforced', allowQueue: true }));
  assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);
});

test('other gh failures never authorize self-enforced merging', async () => {
  for (const rulesError of [
    new Error('gh: permission denied (HTTP 403)'),
    new Error(`gh: ${upgradeMessage} (HTTP 500)`),
    new Error(`gh: ${upgradeMessage} (HTTP 404)`),
    new Error(upgradeMessage),
    new Error('network unavailable'),
  ]) {
    const runner = createGhRunner({ rulesError, postMerge: mergedPullRequest });
    await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' }));
    assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);
  }
});

test('available rules remain strict even when self-enforced mode was requested', async () => {
  for (const rules of [{}, [effectiveRules[0]]]) {
    const runner = createGhRunner({ rules, postMerge: mergedPullRequest });
    await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' }));
    assert.equal(runner.calls.some((call) => call[0] === 'pr'), false);
  }
  const runner = createGhRunner({ postMerge: mergedPullRequest });
  assert.equal((await runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' })).outcome, 'merged');
  assert.equal(runner.calls.some((call) => call[1]?.endsWith('/branches/main') && !call[1].includes('/rules/')), false);
});

test('empty rules require private visibility and explicit self-enforced immediate mode', async () => {
  const runner = createGhRunner({ rules: [], postMerge: mergedPullRequest });
  assert.equal((await runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' })).outcome, 'merged');
  assert.deepEqual(runner.calls.slice(2, 4), [
    ['api', `repos/${expected.repository}`],
    ['api', `repos/${expected.repository}/branches/main`],
  ]);
  for (const repositoryData of [{ private: false }, {}, null]) {
    const denied = createGhRunner({ rules: [], repositoryData, postMerge: mergedPullRequest });
    await assert.rejects(runAutoMerge({ expected, runGh: denied.runGh, allowQueue: false, rulesMode: 'self_enforced' }));
    assert.equal(denied.calls.some((call) => call[0] === 'pr'), false);
  }
  const standalone = createGhRunner({ rules: [], postMerge: mergedPullRequest });
  await assert.rejects(runAutoMerge({ expected, runGh: standalone.runGh }));
  assert.equal(standalone.calls.some((call) => call[0] === 'pr'), false);
});

test('self-enforced mode retains post-merge identity and squash-parent verification and never reports armed', async () => {
  for (const overrides of [
    { postMerge: { ...qualifyingPullRequest, auto_merge: { merge_method: 'squash' } } },
    { postMerge: { ...mergedPullRequest, head: { sha: 'd'.repeat(40) } } },
    { mergeCommit: { sha: 'c'.repeat(40), parents: [{ sha: 'd'.repeat(40) }] } },
    { mergeCommit: { sha: 'c'.repeat(40), parents: [{ sha: expected.base }, { sha: expected.head }] } },
  ]) {
    const runner = createGhRunner({ rulesError: planLimitedError, postMerge: mergedPullRequest, ...overrides });
    await assert.rejects(runAutoMerge({ expected, runGh: runner.runGh, allowQueue: false, rulesMode: 'self_enforced' }));
  }
});
