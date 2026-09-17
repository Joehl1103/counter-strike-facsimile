import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { inspectProject, validatePullRequest, validateReview } from './ci-policy.mjs';

const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const cleanReview = {
  reviewed_head: head, reviewed_base: base, complete: true,
  verdict: 'pass', summary: 'No actionable findings in the inspected diff.',
  findings: [], limitations: ['Gameplay was outside this documentation review.'],
};
const pullRequest = {
  title: 'chore: JKH-126 record the baseline',
  body: 'https://linear.app/jkhl1103-personal/issue/JKH-126/baseline\n\n' +
    '## Acceptance Criteria\n- [ ] The baseline records the exact source SHA.\n\n## Validation\nPending',
};

test('PR must identify and link the same Linear issue with real criteria', () => {
  assert.doesNotThrow(() => validatePullRequest(pullRequest));
  for (const invalid of [
    { ...pullRequest, title: 'No issue' },
    { ...pullRequest, body: pullRequest.body.replace('/JKH-126/', '/JKH-1260/') },
    { ...pullRequest, body: pullRequest.body.replace('## Acceptance Criteria', '## Notes') },
    { ...pullRequest, body: pullRequest.body.replace('The baseline records the exact source SHA.',
      'Replace with an approved, verifiable criterion.') },
    { ...pullRequest, body: '<!-- ' + pullRequest.body + ' -->' },
  ]) assert.throws(() => validatePullRequest(invalid));
});

test('review rejects stale identities, incomplete reviews and unresolved findings', () => {
  assert.doesNotThrow(() => validateReview(cleanReview, head, base));
  for (const mutation of [
    { reviewed_head: base }, { reviewed_base: head }, { complete: false },
    { verdict: 'changes_requested' }, { summary: '' },
    { findings: ['P2: regression in the changed code'] }, { findings: undefined },
    { limitations: undefined },
  ]) assert.throws(() => validateReview({ ...cleanReview, ...mutation }, head, base));
  assert.throws(() => validateReview({}, head, base));
});

test('scaffold mode cannot conceal partial game imports or missing commands', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'counter-strike-ci-'));
  try {
    mkdirSync(resolve(directory, '.linear'));
    for (const file of ['AGENTS.md', 'CLAUDE.md', 'AGENT_WORKFLOW.md', 'README.md', '.linear/project.json']) {
      cpSync(new URL('../../' + file, import.meta.url), resolve(directory, file));
    }
    assert.equal(inspectProject(directory), false);
    mkdirSync(resolve(directory, 'app'));
    assert.throws(() => inspectProject(directory), /Game files exist/);
    const scripts = { lint: 'lint', typecheck: 'typecheck', test: 'test', build: 'build' };
    writeFileSync(resolve(directory, 'package.json'), JSON.stringify({ scripts }));
    assert.throws(() => inspectProject(directory), /package-lock/);
    writeFileSync(resolve(directory, 'package-lock.json'), '{}');
    assert.equal(inspectProject(directory), true);
    delete scripts.typecheck;
    writeFileSync(resolve(directory, 'package.json'), JSON.stringify({ scripts }));
    assert.throws(() => inspectProject(directory), /typecheck/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
