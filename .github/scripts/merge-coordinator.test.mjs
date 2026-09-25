import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coordinate } from './merge-coordinator.mjs';

const repository = 'Joehl1103/counter-strike-facsimile';
const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const REQUIRED_CHECKS = ['Repository checks', 'Game checks', 'Independent Codex review'];

const effectiveRules = [
  { type: 'deletion' },
  { type: 'non_fast_forward' },
  { type: 'pull_request', parameters: {
    required_review_thread_resolution: true, allowed_merge_methods: ['squash'],
  } },
  { type: 'required_status_checks', parameters: {
    strict_required_status_checks_policy: true,
    required_status_checks: REQUIRED_CHECKS.map((context) => ({ context, integration_id: 15368 })),
  } },
];

function pullRequest(number, changes = {}) {
  return {
    number, state: 'open', draft: false, mergeable: true,
    title: `chore: JKH-${number} coordinator fixture`,
    body: `https://linear.app/jkhl1103-personal/issue/JKH-${number}/fixture\n\n## Acceptance Criteria\n- [x] The fixture is valid.\n\n## Validation\nDone`,
    base: { ref: 'main', sha: base }, head: { sha: head, repo: { full_name: repository } },
    ...changes,
  };
}

function snapshot(number, changes = {}) {
  const { pr: prChanges, ...snapshotChanges } = changes;
  const pr = pullRequest(number, prChanges);
  return {
    pr, baseSha: pr.base.sha,
    checks: REQUIRED_CHECKS.map((name) => ({ name, state: 'success' })),
    review: { head: pr.head.sha, base: pr.base.sha, passed: true },
    behind: false, files: [], conversationsResolved: true,
    ...snapshotChanges,
  };
}

function createGithub(snapshots, changes = {}) {
  const calls = [];
  const comments = changes.comments ?? new Map();
  return {
    calls, actor: 'github-actions[bot]',
    async listPulls() { calls.push(['listPulls']); return snapshots.map((item) => item.pr); },
    async snapshot(number) {
      calls.push(['snapshot', number]);
      const source = changes.snapshotSequence?.shift() ?? snapshots.find((item) => item.pr.number === number);
      return structuredClone(source);
    },
    async effectiveRules() { calls.push(['effectiveRules']); return changes.rules ?? effectiveRules; },
    async repository() { return { private: false }; },
    async update(pr, expectedHead) { calls.push(['update', pr.number, expectedHead]); },
    async merge(pr, expectedHead, expectedBase) {
      calls.push(['merge', pr.number, expectedHead, expectedBase]);
      return { outcome: 'merged', mergeCommit: 'c'.repeat(40) };
    },
    async rerun(runId) { calls.push(['rerun', runId]); },
    async comments(number) { calls.push(['comments', number]); return comments.get(number) ?? []; },
    async comment(number, body) {
      calls.push(['comment', number, body]);
      const current = comments.get(number) ?? [];
      comments.set(number, [...current, { id: current.length + 1, body, user: { login: 'github-actions[bot]', type: 'Bot' } }]);
    },
  };
}

test('an empty PR queue has no candidate to inspect or mutate', async () => {
  const github = createGithub([]);

  const result = await coordinate({ github, repository });

  assert.deepEqual(result.results, []);
  assert.equal(github.calls.some((call) => ['update', 'merge', 'comment'].includes(call[0])), false);
});

test('merges the first fully current candidate with exact expected identity', async () => {
  const github = createGithub([snapshot(1)]);
  const result = await coordinate({ github, repository, triage: async () => assert.fail('green PRs never need triage') });
  assert.deepEqual(result.results, [{ number: 1, outcome: 'merged', mergeCommit: 'c'.repeat(40) }]);
  assert.deepEqual(github.calls.find((call) => call[0] === 'merge'), ['merge', 1, head, base]);
});

test('drafts, forks, and malformed candidates do not starve a later green PR', async () => {
  const fork = snapshot(2, { pr: { head: { sha: head, repo: { full_name: 'outside/fork' } } } });
  const malformed = snapshot(3, { pr: { body: pullRequest(3).body.replace('- [x]', '- [ ]') } });
  const github = createGithub([snapshot(1, { pr: { draft: true } }), fork, malformed, snapshot(4)]);
  const result = await coordinate({ github, repository });
  assert.equal(result.results.at(-1).outcome, 'merged');
  assert.deepEqual(github.calls.find((call) => call[0] === 'merge'), ['merge', 4, head, base]);
  assert.equal(github.calls.filter((call) => call[0] === 'comment').length, 2);
});

test('updates one clean behind candidate and returns before attempting a merge', async () => {
  const github = createGithub([snapshot(1, { behind: true }), snapshot(2)]);
  const result = await coordinate({ github, repository });
  assert.equal(result.results.at(-1).outcome, 'updated');
  assert.deepEqual(github.calls.find((call) => call[0] === 'update'), ['update', 1, head]);
  assert.equal(github.calls.some((call) => call[0] === 'merge'), false);
});

test('updates a behind branch even when GitHub retains its old PR base SHA', async () => {
  const currentMainSha = 'd'.repeat(40);
  const staleBranch = snapshot(1, { baseSha: currentMainSha, behind: true });
  const github = createGithub([staleBranch]);

  const result = await coordinate({ github, repository });

  assert.deepEqual(result.results, [{ number: 1, outcome: 'updated', head }]);
  assert.deepEqual(github.calls.find((call) => call[0] === 'update'), ['update', 1, head]);
  assert.equal(github.calls.some((call) => call[0] === 'merge'), false);
});

test('refuses a stale-branch update if main changes between snapshots', async () => {
  const firstSnapshot = snapshot(1, { baseSha: 'd'.repeat(40), behind: true });
  const changedMainSnapshot = snapshot(1, { baseSha: 'e'.repeat(40), behind: true });
  const github = createGithub([firstSnapshot], {
    snapshotSequence: [firstSnapshot, changedMainSnapshot],
  });

  const result = await coordinate({ github, repository });

  assert.equal(result.results[0].reasonCode, 'stale_before_update');
  assert.equal(github.calls.some((call) => call[0] === 'update'), false);
});

test('reports a current branch with stale PR base metadata instead of merging', async () => {
  const currentMainSha = 'd'.repeat(40);
  const staleMetadata = snapshot(1, { baseSha: currentMainSha });
  const github = createGithub([staleMetadata]);

  const firstResult = await coordinate({ github, repository });
  const secondResult = await coordinate({ github, repository });

  assert.deepEqual(firstResult.results, [{
    number: 1,
    outcome: 'blocked',
    reasonCode: 'stale_base_metadata',
  }]);
  assert.deepEqual(secondResult.results, firstResult.results);
  assert.equal(github.calls.filter((call) => call[0] === 'comment').length, 1);
  assert.equal(github.calls.some((call) => ['update', 'merge'].includes(call[0])), false);
});

test('pending checks wait quietly and do not call the model', async () => {
  const github = createGithub([snapshot(1, { checks: [{ name: 'Repository checks', state: 'pending' }] })]);
  const result = await coordinate({ github, repository, triage: async () => assert.fail('pending check called triage') });
  assert.deepEqual(result.results, [{ number: 1, outcome: 'waiting', reasonCode: 'checks_pending' }]);
  assert.equal(github.calls.some((call) => call[0] === 'comment'), false);
});

test('retries one trusted infrastructure failure, persists the marker first, then still merges another PR', async () => {
  const failed = snapshot(1, { checks: [
    { name: 'Repository checks', state: 'failure', runId: 42, kind: 'infrastructure' },
    { name: 'Game checks', state: 'success' }, { name: 'Independent Codex review', state: 'success' },
  ] });
  const github = createGithub([failed, snapshot(2)]);
  const result = await coordinate({ github, repository,
    triage: async () => ({ route: 'retry_ci', confidence: 0.9, probability: 0.99, reasonCode: 'runner_timeout' }),
  });
  assert.equal(result.results[0].outcome, 'rerun');
  assert.equal(result.results[1].outcome, 'merged');
  const attemptIndex = github.calls.findIndex((call) => call[0] === 'comment' && !call[2].includes('@Joehl1103'));
  assert.ok(attemptIndex >= 0);
  assert.ok(attemptIndex < github.calls.findIndex((call) => call[0] === 'rerun'));
});

test('a retry marker limits that head/base/run to one rerun and tags a human once', async () => {
  const failed = snapshot(1, { checks: [
    { name: 'Repository checks', state: 'failure', runId: 42, kind: 'infrastructure' },
  ] });
  const comments = new Map([[1, [{ id: 1, body: '<!-- merge-coordinator:v1:retry:already -->', user: { type: 'Bot' } }]]]);
  // Use an exact marker generated by a first tick, then exercise the second tick.
  const firstGithub = createGithub([failed], { comments });
  await coordinate({ github: firstGithub, repository,
    triage: async () => ({ route: 'retry_ci', confidence: 1, probability: 1, reasonCode: 'runner_timeout' }),
  });
  const secondGithub = createGithub([failed], { comments });
  const result = await coordinate({ github: secondGithub, repository,
    triage: async () => ({ route: 'retry_ci', confidence: 1, probability: 1, reasonCode: 'runner_timeout' }),
  });
  assert.equal(result.results[0].reasonCode, 'retry_limit_reached');
  assert.equal(secondGithub.calls.some((call) => call[0] === 'rerun'), false);
  assert.equal(secondGithub.calls.filter((call) => call[0] === 'comment').length, 1);
});

test('non-infrastructure failures and invalid model responses fail closed to a deduplicated human notice', async () => {
  const failed = snapshot(1, { checks: [{ name: 'Repository checks', state: 'failure', runId: 88, kind: 'test' }] });
  const github = createGithub([failed]);
  const first = await coordinate({ github, repository,
    triage: async () => ({ route: 'retry_ci', confidence: 1, probability: 1, reasonCode: 'bad_test' }),
  });
  const second = await coordinate({ github, repository, triage: async () => null });
  assert.equal(first.results[0].reasonCode, 'retry_not_permitted');
  assert.equal(second.results[0].reasonCode, 'triage_unavailable');
  assert.equal(github.calls.filter((call) => call[0] === 'comment').length, 2);
});

test('a changed head or base after the action decision prevents the write and allows another green PR', async () => {
  const stale = snapshot(1);
  const changed = snapshot(1, { pr: { head: { sha: 'd'.repeat(40), repo: { full_name: repository } } } });
  const github = createGithub([stale, snapshot(2)], { snapshotSequence: [stale, changed, snapshot(2), snapshot(2)] });
  const result = await coordinate({ github, repository });
  assert.equal(result.results[0].reasonCode, 'stale_before_merge');
  assert.equal(result.results[1].outcome, 'merged');
  assert.equal(github.calls.some((call) => call[0] === 'merge' && call[1] === 1), false);
});

test('refuses a final merge if the PR base metadata changes between snapshots', async () => {
  const firstSnapshot = snapshot(1);
  const changedBaseSnapshot = snapshot(1, {
    pr: { base: { ref: 'main', sha: 'd'.repeat(40) } },
  });
  const github = createGithub([firstSnapshot], {
    snapshotSequence: [firstSnapshot, changedBaseSnapshot, changedBaseSnapshot],
  });

  const result = await coordinate({ github, repository });

  assert.equal(result.results[0].reasonCode, 'stale_before_merge');
  assert.equal(github.calls.some((call) => call[0] === 'merge'), false);
});

test('weakened effective rules prevent all writes', async () => {
  const github = createGithub([snapshot(1)], { rules: [] });
  await assert.rejects(coordinate({ github, repository }), /main must require pull requests/);
  assert.equal(github.calls.some((call) => ['merge', 'update', 'rerun', 'comment'].includes(call[0])), false);
});

test('conflicting stale branch goes to one human notice and does not starve green PR',async()=>{
 const blocked=snapshot(1,{behind:true,pr:{mergeable:false}});const github=createGithub([blocked,snapshot(2)]);let count=0;
 const triage=async()=>{count++;return {route:'retry_ci',confidence:1,probability:1,reasonCode:'unsafe_model'};};
 await coordinate({github,repository,triage});await coordinate({github,repository,triage});
 assert.equal(count,2);assert.equal(github.calls.filter(c=>c[0]==='comment').length,1);
 assert.ok(!github.calls.some(c=>c[0]==='update'));assert.equal(github.calls.filter(c=>c[0]==='merge').length,2);
});
test('exact actor identity required for retry records; another bot cannot suppress a notice',async()=>{
 const blocked=snapshot(1,{pr:{mergeable:false}});const comments=new Map();const github=createGithub([blocked],{comments});
 await coordinate({github,repository});const record=comments.get(1)[0];record.user.login='imposter[bot]';
 await coordinate({github,repository});assert.equal(github.calls.filter(c=>c[0]==='comment').length,2);
});
test('main lookup race, unknown mergeability, and draft race refuse mutation',async()=>{
 for(const changes of [{baseSha:'d'.repeat(40)},{pr:{mergeable:null}}]){
  const github=createGithub([snapshot(1,changes)]);await coordinate({github,repository});
  assert.ok(!github.calls.some(c=>['update','merge','rerun'].includes(c[0])));
 }
 const first=snapshot(1),next=snapshot(1,{pr:{draft:true}});
 const github=createGithub([first],{snapshotSequence:[first,next]});await coordinate({github,repository});
 assert.ok(!github.calls.some(c=>c[0]==='merge'));
});
test('low confidence and mixed substantive/infrastructure failures cannot be retried',async()=>{
 for(const mixed of [false,true]){
 const checks=[{name:'Repository checks',state:'failure',runId:42,kind:'infrastructure'}];
 if(mixed)checks.push({name:'Game checks',state:'failure',runId:42,kind:'code'});
 const github=createGithub([snapshot(1,{checks})]);await coordinate({github,repository,triage:async()=>({route:'retry_ci',confidence:mixed?1:.4,probability:1,reasonCode:'retry_ci'})});
 assert.ok(!github.calls.some(c=>c[0]==='rerun'));assert.ok(github.calls.some(c=>c[0]==='comment'));
 }
});
test('permission refusal produces a human notice and allows the next green PR',async()=>{
 const github=createGithub([snapshot(1,{behind:true}),snapshot(2)]);
 github.update=async()=>{const e=new Error('denied');e.status=403;throw e;};
 const result=await coordinate({github,repository});assert.equal(result.results.at(-1).outcome,'merged');
 assert.ok(github.calls.some(c=>c[0]==='comment'&&c[2].includes('branch_update_refused')));
});

test('snapshot read failure mentions the observed candidate and continues to another PR',async()=>{
 const github=createGithub([snapshot(1),snapshot(2)]);const original=github.snapshot;
 github.snapshot=async(number)=>{if(number===1)throw new Error('read denied');return original(number);};
 const result=await coordinate({github,repository});
 assert.equal(result.results[0].reasonCode,'snapshot_unavailable');assert.equal(result.results[1].outcome,'merged');
 assert.ok(github.calls.some(c=>c[0]==='comment'&&c[1]===1&&c[2].includes('@Joehl1103')&&c[2].includes('snapshot_unavailable')));
});
test('persistent merge refusal tags once and does not starve another validated PR',async()=>{
 const github=createGithub([snapshot(1),snapshot(2)]);const original=github.merge;
 github.merge=async(pr,...args)=>{if(pr.number===1)throw new Error('permission denied');return original(pr,...args);};
 await coordinate({github,repository});await coordinate({github,repository});
 assert.equal(github.calls.filter(c=>c[0]==='comment'&&c[2].includes('merge_refused')).length,1);
 assert.equal(github.calls.filter(c=>c[0]==='merge'&&c[1]===2).length,2);
});

function planLimitedGithub(candidate = snapshot(1), changes = {}) {
  const github = createGithub([candidate], changes);
  github.effectiveRules = async () => {
    github.calls.push(['effectiveRules']);
    throw Object.assign(new Error('GitHub GET failed (403); response omitted.'), {
      status: 403, planLimited: true,
    });
  };
  const originalMerge = github.merge;
  github.merge = async (pr, expectedHead, expectedBase, options) => {
    github.mergeOptions = options;
    return originalMerge(pr, expectedHead, expectedBase);
  };
  return github;
}

test('plan-limited rules reuse all green gates and pass self_enforced to the merge', async () => {
  const github = planLimitedGithub();
  const result = await coordinate({ github, repository });

  assert.equal(result.rulesMode, 'self_enforced');
  assert.equal(result.results[0].outcome, 'merged');
  assert.deepEqual(github.mergeOptions, { rulesMode: 'self_enforced' });
  assert.deepEqual(github.calls.find((call) => call[0] === 'merge'), ['merge', 1, head, base]);
  assert.equal(github.calls.at(-2)[0], 'effectiveRules');
});

const unsafeCandidates = [
  ...REQUIRED_CHECKS.flatMap((name) => [
    [`missing ${name}`, { checks: snapshot(1).checks.filter((check) => check.name !== name) }],
    [`failed ${name}`, { checks: snapshot(1).checks.map((check) => ({
      ...check, state: check.name === name ? 'failure' : 'success',
    })) }],
  ]),
  ['stale review head', { review: { passed: true, head: 'd'.repeat(40), base } }],
  ['stale review base', { review: { passed: true, head, base: 'd'.repeat(40) } }],
  ['behind main', { behind: true }],
  ['main differs from PR base', { baseSha: 'd'.repeat(40) }],
  ['draft', { pr: { draft: true } }],
  ['unresolved thread', { conversationsResolved: false }],
];

for (const [reason, changes] of unsafeCandidates) {
  test(`self-enforced mode never merges with ${reason}`, async () => {
    const github = planLimitedGithub(snapshot(1, changes));
    const result = await coordinate({ github, repository });

    assert.equal(result.rulesMode, 'self_enforced');
    assert.equal(github.calls.some((call) => call[0] === 'merge'), false);
  });

  test(`self-enforced final snapshot refuses a race to ${reason}`, async () => {
    const original = snapshot(1);
    const changed = snapshot(1, changes);
    const github = planLimitedGithub(original, { snapshotSequence: [original, changed, changed] });
    await coordinate({ github, repository });

    assert.equal(github.calls.some((call) => call[0] === 'merge'), false);
  });
}

test('rules errors and malformed responses refuse before every kind of mutation', async () => {
  for (const candidate of [snapshot(1), snapshot(1, { behind: true }),
    snapshot(1, { conversationsResolved: false }),
    snapshot(1, { checks: [{ name: 'Game checks', state: 'failure', kind: 'infrastructure', runId: 42 }] })]) {
    for (const status of [500, 403, 404, undefined]) {
      const github = createGithub([candidate]);
      github.effectiveRules = async () => {
        throw Object.assign(new Error('Rules unavailable'), { status });
      };
      await assert.rejects(coordinate({ github, repository }));
      assert.equal(github.calls.some((call) => ['merge', 'update', 'rerun', 'comment'].includes(call[0])), false);
    }
    const github = createGithub([candidate], { rules: { message: 'malformed' } });
    await assert.rejects(coordinate({ github, repository }));
    assert.equal(github.calls.some((call) => ['merge', 'update', 'rerun', 'comment'].includes(call[0])), false);
  }
});

test('empty rules fall back only after confirmed private visibility', async () => {
  for (const isPrivate of [true, false, undefined]) {
    const github = createGithub([snapshot(1)], { rules: [] });
    github.repository = async () => ({ private: isPrivate });
    if (isPrivate === true) {
      const result = await coordinate({ github, repository });
      assert.equal(result.rulesMode, 'self_enforced');
      assert.equal(result.results[0].outcome, 'merged');
    } else {
      await assert.rejects(coordinate({ github, repository }), /main must require pull requests/);
      assert.equal(github.calls.some((call) => ['merge', 'update', 'rerun', 'comment'].includes(call[0])), false);
    }
  }
  const github = createGithub([snapshot(1)], { rules: [] });
  github.repository = async () => { throw new Error('Visibility unavailable'); };
  await assert.rejects(coordinate({ github, repository }), /Visibility unavailable/);
});

test('available rules keep strict validation and report github_rules', async () => {
  const github = createGithub([snapshot(1)]);
  github.repository = async () => assert.fail('Available rules must not consult visibility');
  const result = await coordinate({ github, repository });
  assert.equal(result.rulesMode, 'github_rules');
  assert.equal(result.results[0].outcome, 'merged');
});

test('self-enforced updates, notices, retry records and reruns re-resolve rules before each write', async () => {
  const retryCandidate = snapshot(1, { checks: [
    { name: 'Repository checks', state: 'failure', runId: 42, kind: 'infrastructure' },
  ] });
  for (const [candidate, expectedWrites] of [
    [snapshot(1, { behind: true }), ['update']],
    [snapshot(1, { conversationsResolved: false }), ['comment']],
    [retryCandidate, ['comment', 'rerun']],
  ]) {
    const github = planLimitedGithub(candidate);
    const result = await coordinate({ github, repository,
      triage: async () => ({ route: 'retry_ci', confidence: 1, probability: 1, reasonCode: 'runner_timeout' }),
    });
    const writes = github.calls.filter((call) => ['update', 'merge', 'comment', 'rerun'].includes(call[0]));
    assert.equal(result.rulesMode, 'self_enforced');
    assert.deepEqual(writes.map((call) => call[0]), expectedWrites);
    for (const write of writes) {
      const writeIndex = github.calls.indexOf(write);
      assert.equal(github.calls[writeIndex - 1][0], 'effectiveRules');
    }
  }
});

test('losing rules access after the initial decision prevents updates, comments, retries and merges', async () => {
  for (const candidate of [snapshot(1), snapshot(1, { behind: true }),
    snapshot(1, { conversationsResolved: false }),
    snapshot(1, { checks: [{ name: 'Game checks', state: 'failure', runId: 42, kind: 'infrastructure' }] })]) {
    const github = createGithub([candidate]);
    let rulesReads = 0;
    github.effectiveRules = async () => {
      rulesReads += 1;
      if (rulesReads > 1) {
        throw Object.assign(new Error('Rules access lost'), { status: 403 });
      }
      return effectiveRules;
    };
    try {
      await coordinate({ github, repository,
        triage: async () => ({ route: 'retry_ci', confidence: 1, probability: 1, reasonCode: 'runner_timeout' }),
      });
    } catch (error) {
      assert.equal(error.message, 'Rules access lost');
    }
    assert.ok(rulesReads > 1);
    assert.equal(github.calls.some((call) => ['update', 'merge', 'comment', 'rerun'].includes(call[0])), false);
  }
});

test('the mode passed to merge is resolved immediately before the merge', async () => {
  for (const finalMode of ['self_enforced', 'github_rules']) {
    const github = planLimitedGithub();
    const planLimitedRules = github.effectiveRules;
    let rulesReads = 0;
    github.effectiveRules = async () => {
      rulesReads += 1;
      const useFallback = finalMode === 'self_enforced' ? rulesReads > 1 : rulesReads === 1;
      if (useFallback) {
        return planLimitedRules();
      }
      return effectiveRules;
    };
    const result = await coordinate({ github, repository });
    assert.equal(result.results[0].outcome, 'merged');
    assert.equal(result.rulesMode, finalMode);
    assert.deepEqual(github.mergeOptions, { rulesMode: finalMode });
  }
});
