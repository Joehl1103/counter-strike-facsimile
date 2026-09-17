import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTriage, triage, triageRequest } from './jev-triage.mjs';
const snapshot = { pr: { mergeable: true, body: 'SECRET_NOT_SENT' }, checks: [{name:'Game checks',state:'failure',kind:'infrastructure',summary:'CI conclusion: timed_out'}], review:{passed:true} };
const answer = (overrides = {}) => ({model:'jev-1.13.0',answers:{route:{type:'choice',choice:'retry_ci',confidence:.96,probabilities:{retry_ci:.98,needs_human:.02},...overrides}}});
test('valid typed choice, uncertainty and malformed answers fail closed', () => {
  assert.equal(parseTriage(answer()).route, 'retry_ci');
  assert.equal(parseTriage(answer({confidence:.2})).route, 'needs_human');
  for(const input of [null, {}, answer({choice:'merge'}),answer({confidence:NaN}),answer({probabilities:{retry_ci:1,needs_human:1}}),answer({choice:'needs_human'})]) assert.throws(()=>parseTriage(input));
});
test('only categorical facts enter request; source and prose excluded', () => {
  const request = JSON.stringify(triageRequest(snapshot));
  assert.ok(!request.includes('SECRET_NOT_SENT'));
  assert.equal(triageRequest(snapshot).questions.route.type, 'choice');
});
test('official endpoint, no redirect, bounded retry on overload, no secret on failure', async () => {
  const calls=[]; let waits=0;
  const fetcher=async (url,opts)=>{calls.push({url,opts});return calls.length<3?{status:529,ok:false}:{status:200,ok:true,json:async()=>answer()};};
  const result=await triage(snapshot,{key:'fake-test-key',fetcher,wait:async()=>{waits++;}});
  assert.equal(result.route,'retry_ci'); assert.equal(calls.length,3);assert.equal(waits,2);
  assert.equal(calls[0].url,'https://api.typesafe.ai/v1/systemone'); assert.equal(calls[0].opts.redirect,'error');
  const failed=await triage(snapshot,{key:'fake-test-key',fetcher:async()=>{throw new Error('fake-test-key');}});
  assert.equal(failed.reasonCode,'typesafe_unavailable');assert.ok(!JSON.stringify(failed).includes('fake-test-key'));
  assert.equal((await triage(snapshot,{key:''})).route,'needs_human');
});
