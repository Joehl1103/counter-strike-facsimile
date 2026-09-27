import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { PLAN_LIMIT_MESSAGE, runAutoMerge } from './auto-merge.mjs';
import { execFile as executeFile } from 'node:child_process';
import { promisify } from 'node:util';
import { appendFileSync } from 'node:fs';
import { triage } from './jev-triage.mjs';
const execFile = promisify(executeFile);
export const required = ['Repository checks', 'Game checks', 'Independent Codex review'];
const sha = /^[0-9a-f]{40}$/;

export function createApi({ token, fetcher = fetch }) {
  assert.ok(token, 'MERGE_BOT_TOKEN is required; GITHUB_TOKEN does not provide unattended event propagation.');
  return async (path, method = 'GET', body) => {
    assert.ok(path.startsWith('/repos/') || path === '/graphql', 'Unexpected GitHub API path.');
    const response = await fetcher(`https://api.github.com${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const error = new Error(`GitHub ${method} failed (${response.status}); response omitted.`);
      error.status = response.status;
      if (response.status === 403) {
        try {
          const body = await response.json();
          if (body?.message === PLAN_LIMIT_MESSAGE) {
            error.planLimited = true;
          }
        } catch {
          // Invalid error bodies must not replace or weaken the sanitized failure.
        }
      }
      throw error;
    }
    return response.status === 204 ? null : response.json();
  };
}

async function pages(api, path, property) {
  const result = [];
  for (let page = 1; page <= 100; page++) {
    const data = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    const values = property ? data[property] : data;
    assert.ok(Array.isArray(values), 'GitHub pagination response is invalid.');
    result.push(...values);
    if (values.length < 100) return result;
  }
  throw new Error('GitHub pagination limit exceeded; refusing partial evidence.');
}

export function selectChecks({ headChecks, mergeChecks, statuses, head, base, mergeSha, runs }) {
  const checks = [];
  for (const name of required.slice(0, 2)) {
    const matching = (list) => list.filter((check) => check.name === name && check.app?.id === 15368)
      .sort((a, b) => b.id - a.id);
    // A test-merge check, when present, takes precedence over the head check.
    const mergeCheck = matching(mergeChecks)[0];
    const check = mergeCheck ?? matching(headChecks)[0];
    const target = mergeCheck ? mergeSha : head;
    const run = check && runs.get(check.id);
    const valid = sha.test(target ?? '') && check?.head_sha === target &&
      [head, target].includes(run?.head_sha) && run?.event === 'pull_request' &&
      run?.path === '.github/workflows/ci.yml';
    const conclusion = valid ? check.conclusion : null;
    checks.push({ name, state: !valid || check.status !== 'completed' ? 'pending' : conclusion === 'success' ? 'success' : 'failure',
      ...(valid ? { runId: run.id, kind: ['cancelled', 'timed_out'].includes(conclusion) ? 'infrastructure' : 'code',
        summary: `CI conclusion: ${conclusion ?? 'pending'}` } : {}) });
  }
  const reviewStatus = statuses.filter((status) => status.context === required[2] && status.creator?.login === 'github-actions[bot]')
    .sort((a, b) => b.id - a.id)[0];
  const match = reviewStatus?.description?.match(/^Reviewed ([a-f0-9]{40}) against ([a-f0-9]{40})$/);
  const passed = reviewStatus?.state === 'success' && match?.[1] === head && match?.[2] === base;
  checks.push({ name: required[2], state: passed ? 'success' : reviewStatus?.state === 'failure' || reviewStatus?.state === 'error' ? 'failure' : 'pending',
    kind: 'review', summary: passed ? 'Exact head and base reviewed' : 'Fresh independent review required' });
  return { checks, review: { head: match?.[1], base: match?.[2], passed } };
}

export function createGitHub({ repository, api, runGh, notifyLogin = 'github-actions[bot]' }) {
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  const root = `/repos/${repository}`;
  const [owner, name] = repository.split('/');
  async function snapshot(number) {
    assert.ok(Number.isSafeInteger(number) && number > 0);
    const pr = await api(`${root}/pulls/${number}`);
    const base = await api(`${root}/branches/main`);
    const baseSha = base.commit.sha;
    assert.match(pr.head.sha, sha); assert.match(baseSha, sha);
    if (pr.head.repo?.full_name !== repository || pr.state !== 'open' || pr.draft) {
      return { pr, baseSha, checks: [], review: {passed:false}, behind:false, files:[], conversationsResolved:false };
    }
    const [comparison, headChecks, mergeChecks, statuses, files] = await Promise.all([
      api(`${root}/compare/${baseSha}...${pr.head.sha}`),
      pages(api, `${root}/commits/${pr.head.sha}/check-runs`, 'check_runs'),
      pr.mergeable === true && sha.test(pr.merge_commit_sha ?? '')
        ? pages(api, `${root}/commits/${pr.merge_commit_sha}/check-runs`, 'check_runs') : [],
      pages(api, `${root}/commits/${pr.head.sha}/statuses`),
      pages(api, `${root}/pulls/${number}/files`),
    ]);
    assert.ok(Number.isSafeInteger(comparison.behind_by) && comparison.behind_by >= 0, 'Missing branch ancestry evidence.');
    const runs = new Map();
    const runCache = new Map();
    for (const check of [...headChecks, ...mergeChecks]) {
      if (check.app?.id !== 15368 || !required.includes(check.name)) continue;
      const prefix = `https://github.com/${repository}/actions/runs/`;
      if (!check.details_url?.startsWith(prefix)) continue;
      const runId = check.details_url.slice(prefix.length).match(/^(\d+)(?:\/|$)/)?.[1];
      if (!runId) continue;
      if (!runCache.has(runId)) runCache.set(runId, await api(`${root}/actions/runs/${runId}`));
      runs.set(check.id, runCache.get(runId));
    }
    let cursor = null;
    let conversationsResolved = true;
    let finished = false;
    for (let page = 0; page < 100; page++) {
      const result = await api('/graphql', 'POST', {
        query: 'query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewDecision reviewThreads(first:100,after:$cursor){nodes{isResolved}pageInfo{hasNextPage endCursor}}}}}',
        variables: { owner, name, number, cursor },
      });
      assert.ok(!result.errors && result.data?.repository?.pullRequest, 'Review conversation lookup failed.');
      const pull = result.data.repository.pullRequest;
      if (pull.reviewDecision === 'CHANGES_REQUESTED') conversationsResolved = false;
      const threads = pull.reviewThreads;
      assert.ok(Array.isArray(threads?.nodes), 'Review threads are unavailable.');
      if (threads.nodes.some((thread) => thread.isResolved !== true)) conversationsResolved = false;
      if (!threads.pageInfo.hasNextPage) { finished = true; break; }
      assert.ok(threads.pageInfo.endCursor && threads.pageInfo.endCursor !== cursor);
      cursor = threads.pageInfo.endCursor;
    }
    assert.ok(finished, 'Incomplete review thread evidence.');
    return { pr, baseSha, behind: comparison.behind_by > 0,
      ...selectChecks({ headChecks, mergeChecks, statuses, head: pr.head.sha, base: baseSha, mergeSha: pr.merge_commit_sha, runs }),
      files: files.map((file) => file.filename), conversationsResolved };
  }
  return {
    actor: notifyLogin,
    snapshot,
    listPulls: () => pages(api, `${root}/pulls?state=open&base=main&sort=created&direction=asc`),
    effectiveRules: () => api(`${root}/rules/branches/main`),
    repository: () => api(root),
    update: (pr, expectedHead) => api(`${root}/pulls/${pr.number}/update-branch`, 'PUT', { expected_head_sha: expectedHead }),
    merge: (pr, expectedHead, expectedBase, { rulesMode = 'github_rules' } = {}) => runAutoMerge({
      expected: { repository, number: pr.number, head: expectedHead, base: expectedBase }, runGh, allowQueue: false,
      rulesMode,
    }),
    rerun: (runId) => { assert.ok(Number.isSafeInteger(runId) && runId > 0); return api(`${root}/actions/runs/${runId}/rerun-failed-jobs`, 'POST'); },
    comments: async (number) => (await pages(api, `${root}/issues/${number}/comments`))
      // Accept only this installation's/credential's identity as persisted coordinator state.
      .filter((comment) => comment.user?.login === notifyLogin),
    comment: (number, body) => api(`${root}/issues/${number}/comments`, 'POST', { body }),
  };
}

async function main() {
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main', 'Coordinator runs only on trusted main.');
  const token = process.env.MERGE_BOT_TOKEN;
  const api = createApi({ token });
  const github = createGitHub({ repository: process.env.GITHUB_REPOSITORY, api,
    notifyLogin: process.env.MERGE_BOT_LOGIN,
    runGh: (args) => execFile('gh', args, { env: { ...process.env, GH_TOKEN: token }, encoding: 'utf8' }),
  });
  assert.ok(process.env.MERGE_BOT_LOGIN, 'Configure MERGE_BOT_LOGIN to match the automation credential.');
  const { coordinate } = await import('./merge-coordinator.mjs');
  const result = await coordinate({ github, triage, repository: process.env.GITHUB_REPOSITORY, owner: 'Joehl1103' });
  const modeExplanation = result.rulesMode === 'self_enforced'
    ? ' (GitHub rules API unavailable on private Free plan; coordinator enforces required checks itself)' : '';
  console.log(`Rules mode: ${result.rulesMode}${modeExplanation}`);
  const summary = JSON.stringify(result, null, 2);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nCoordinator results\n\n\`\`\`json\n${summary}\n\`\`\`\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Coordinator failed closed. Inspect GitHub access, required rules and environment configuration. Provider responses and credentials are omitted.'); process.exitCode = 1; });
}
