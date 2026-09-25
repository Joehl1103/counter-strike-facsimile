import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, selectChecks, createGitHub } from './github-coordinator.mjs';
const head='a'.repeat(40),base='b'.repeat(40),mergeSha='c'.repeat(40);
function fixture(){
 const headChecks=['Repository checks','Game checks'].map((name,i)=>({id:i+1,name,head_sha:head,app:{id:15368},status:'completed',conclusion:'success'}));
 return {head,base,mergeSha,headChecks,mergeChecks:[],statuses:[{id:3,context:'Independent Codex review',creator:{login:'github-actions[bot]'},state:'success',description:`Reviewed ${head} against ${base}`}],runs:new Map(headChecks.map(c=>[c.id,{id:7,head_sha:head,path:'.github/workflows/ci.yml',event:'pull_request'}]))};
}
test('checks must be current trusted PR CI and independently reviewed exact base',()=>{
 assert.ok(selectChecks(fixture()).checks.every(c=>c.state==='success'));
 for(const change of [(f)=>f.statuses[0].description=`Reviewed ${head} against ${'c'.repeat(40)}`,(f)=>f.statuses[0].creator.login='other-bot']){
  const f=fixture();change(f);assert.equal(selectChecks(f).review.passed,false);
 }
 for(const field of ['path','head_sha','event']){const f=fixture();f.runs.get(1)[field]='wrong';assert.equal(selectChecks(f).checks[0].state,'pending');}
});
test('merge check failures supersede old head success and newer retry is authoritative',()=>{
 const f=fixture();f.mergeChecks=[{...f.headChecks[0],id:9,head_sha:mergeSha,conclusion:'failure'}];f.runs.set(9,f.runs.get(1));
 assert.equal(selectChecks(f).checks[0].state,'failure');
 f.mergeChecks.push({...f.mergeChecks[0],id:10,status:'in_progress',conclusion:null});f.runs.set(10,f.runs.get(1));
 assert.equal(selectChecks(f).checks[0].state,'pending');
});
test('untrusted check provider and skipped checks do not pass',()=>{
 const f=fixture();f.headChecks[0].app.id=1;f.headChecks[1].conclusion='skipped';
 assert.equal(selectChecks(f).checks[0].state,'pending');assert.equal(selectChecks(f).checks[1].state,'failure');
});
test('API errors and redirect attempts never expose response bodies or bearer',async()=>{
 const api=createApi({token:'secret',fetcher:async(url,opts)=>{assert.equal(opts.redirect,'error');return {ok:false,status:403,json:async()=>({token:'secret'})};}});
 await assert.rejects(api('/repos/a/b'),e=>e.status===403&&!e.message.includes('secret'));
 await assert.rejects(api('https://evil.example/'));
});
test('update API carries expected SHA, comments are identity-filtered, pagination complete',async()=>{
 const calls=[];const api=async(path,method,body)=>{calls.push({path,method,body});if(path.includes('/comments'))return [{id:1,user:{login:'actor'}},{id:2,user:{login:'imposter'}}];return null;};
 const gh=createGitHub({repository:'a/b',api,notifyLogin:'actor'});
 await gh.update({number:1},head);assert.deepEqual(calls[0].body,{expected_head_sha:head});
 assert.deepEqual((await gh.comments(1)).map(x=>x.id),[1]);
});

test('temporary merge checks accept exact merge SHA or PR head in run metadata, never an unrelated revision',()=>{
 for(const runSha of [head,mergeSha]){
  const f=fixture();f.mergeChecks=f.headChecks.map(c=>({...c,id:c.id+10,head_sha:mergeSha}));
  for(const c of f.mergeChecks) f.runs.set(c.id,{id:7,head_sha:runSha,path:'.github/workflows/ci.yml',event:'pull_request'});
  assert.ok(selectChecks(f).checks.every(c=>c.state==='success'));
  f.mergeChecks[0].head_sha='d'.repeat(40);assert.equal(selectChecks(f).checks[0].state,'pending');
 }
});

const upgradeMessage = 'Upgrade to GitHub Pro or make this repository public to enable this feature.';

test('only an exact 403 upgrade body marks the sanitized API error plan-limited', async () => {
  for (const [status, message, expectedPlanLimited] of [
    [403, upgradeMessage, true],
    [403, 'Permission denied', false],
    [403, `${upgradeMessage} Extra content`, false],
    [500, upgradeMessage, false],
    [404, upgradeMessage, false],
  ]) {
    const api = createApi({ token: 'secret', fetcher: async () => ({
      ok: false, status, json: async () => ({ message }),
    }) });
    await assert.rejects(api('/repos/a/b/rules/branches/main'), (error) => {
      assert.equal(error.status, status);
      assert.equal(error.planLimited === true, expectedPlanLimited);
      assert.equal(error.message, `GitHub GET failed (${status}); response omitted.`);
      return true;
    });
  }
});

test('invalid 403 JSON keeps the original sanitized failure', async () => {
  const api = createApi({ token: 'secret', fetcher: async () => ({
    ok: false, status: 403, json: async () => { throw new Error('body contained secret'); },
  }) });
  await assert.rejects(api('/repos/a/b'), (error) => {
    assert.equal(error.status, 403);
    assert.notEqual(error.planLimited, true);
    assert.equal(error.message, 'GitHub GET failed (403); response omitted.');
    return true;
  });
});

test('repository visibility lookup uses the repository endpoint', async () => {
  const github = createGitHub({ repository: 'a/b', api: async (path) => {
    assert.equal(path, '/repos/a/b');
    return { private: true };
  } });
  assert.deepEqual(await github.repository(), { private: true });
});

test('adapter passes self-enforced mode to the immediate merge helper', async () => {
  const calls = [];
  let pullLookups = 0;
  const pr = {
    number: 171, state: 'open', draft: false, base: { ref: 'main', sha: base },
    head: { sha: head, repo: { full_name: 'a/b' } },
    title: 'fix: JKH-171 fixture',
    body: 'https://linear.app/jkhl1103-personal/issue/JKH-171/fixture\n\n## Acceptance Criteria\n- [x] Fixture passes.',
  };
  const github = createGitHub({ repository: 'a/b', runGh: async (args) => {
    calls.push(args);
    if (args[1] === 'repos/a/b/rules/branches/main') {
      throw new Error(`gh: ${upgradeMessage} (HTTP 403)`);
    }
    if (args[1] === 'repos/a/b/pulls/171') {
      pullLookups += 1;
      return { stdout: JSON.stringify(pullLookups === 1 ? pr : { ...pr, merged: true, merge_commit_sha: mergeSha }) };
    }
    if (args[1] === 'repos/a/b/branches/main') {
      return { stdout: JSON.stringify({ commit: { sha: base } }) };
    }
    if (args[1] === `repos/a/b/git/commits/${mergeSha}`) {
      return { stdout: JSON.stringify({ sha: mergeSha, parents: [{ sha: base }] }) };
    }
    return { stdout: '' };
  } });
  const result = await github.merge(pr, head, base, { rulesMode: 'self_enforced' });
  assert.equal(result.outcome, 'merged');
  assert.deepEqual(calls.find((args) => args[0] === 'pr'), [
    'pr', 'merge', '171', '--repo', 'a/b', '--squash', '--match-head-commit', head,
  ]);
});
