import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../workflows/codex-review.yml', import.meta.url), 'utf8');

// Read only checkout step text; no YAML parser or candidate code is needed.
test('every review checkout uses the trusted workflow commit with full history and no persisted credentials', () => {
  const checkoutSteps = [...workflow.matchAll(/^      - (?:uses: actions\/checkout@[^\n]+|name:[^\n]+\n        uses: actions\/checkout@[^\n]+)\n(?:(?!      - |  \S)[^\n]*\n)*/gm)];
  assert.equal(checkoutSteps.length, 3);

  for (const [step] of checkoutSteps) {
    const refs = [...step.matchAll(/^          ref: (.+)$/gm)].map((match) => match[1]);
    assert.deepEqual(refs, ['${{ github.sha }}']);
    assert.doesNotMatch(step, /ref:.*(?:pull_request\.base\.sha|head)/);
    assert.match(step, /^          fetch-depth: 0$/m);
    assert.match(step, /^          persist-credentials: false$/m);
  }
});

// Keep the checkout identity separate from the immutable review identities.
test('each review job validates the trusted checkout, both review commits and base ancestry', () => {
  for (const jobName of ['plan', 'reviewer', 'review-gate']) {
    const job = workflow.split(`\n  ${jobName}:\n`)[1].split(/\n  [\w-]+:\n/)[0];
    assert.match(job, /TRUSTED_SHA: \$\{\{ github\.sha \}\}/);
    assert.ok(job.includes('test "$(git rev-parse HEAD)" = "$TRUSTED_SHA"'));
    assert.ok(job.includes('git cat-file -e "$REVIEW_BASE^{commit}"'));
    assert.ok(job.includes('git cat-file -e "$REVIEW_HEAD^{commit}"'));
    assert.ok(job.includes('git merge-base --is-ancestor "$REVIEW_BASE" "$TRUSTED_SHA"'));
    assert.match(job, /REVIEW_BASE: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
    assert.match(job, /REVIEW_HEAD: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  }
});
