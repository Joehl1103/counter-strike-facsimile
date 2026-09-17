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
