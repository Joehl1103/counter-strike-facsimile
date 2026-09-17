import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validatePullRequest(pullRequest) {
  const issue = pullRequest.title.match(/\bJKH-[1-9]\d*\b/)?.[0];
  assert.ok(issue, 'PR title must identify its Linear issue (JKH-<number>).');
  const body = (pullRequest.body ?? '').replace(/<!--[\s\S]*?-->/g, '');
  const issueLink = new RegExp(
    `https://linear\\.app/jkhl1103-personal/issue/${issue}(?:[/?#\\s)]|$)`,
    'i',
  );
  assert.ok(issueLink.test(body), `PR body must link the matching Linear issue ${issue}.`);
  const criteria = body.match(/^## Acceptance Criteria\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1];
  assert.ok(criteria?.match(/^- \[[ xX]\] \S.+/m), 'PR needs an Acceptance Criteria checklist.');
  assert.ok(!criteria.includes('Replace with an approved, verifiable criterion.'),
    'Replace the template placeholder with actual approved acceptance criteria.');
}

export function validateReview(report, expectedHead, expectedBase) {
  assert.match(expectedHead, /^[a-f0-9]{40}$/);
  assert.match(expectedBase, /^[a-f0-9]{40}$/);
  assert.equal(report.reviewed_head, expectedHead, 'Review is for a different PR head.');
  assert.equal(report.reviewed_base, expectedBase, 'Review is for a different base.');
  assert.equal(report.complete, true, 'Independent review did not complete.');
  assert.equal(report.verdict, 'pass', 'Independent reviewer requested changes.');
  assert.ok(typeof report.summary === 'string' && report.summary.trim(), 'Review needs a summary.');
  assert.ok(Array.isArray(report.findings), 'Review must explicitly report findings.');
  assert.equal(report.findings.length, 0, 'Resolve all review findings and request a new review.');
  assert.ok(Array.isArray(report.limitations) && report.limitations.every(
    (limitation) => typeof limitation === 'string'), 'Review must report its limitations.');
}

export function inspectProject(directory) {
  for (const file of ['AGENTS.md', 'CLAUDE.md', 'AGENT_WORKFLOW.md', 'README.md', '.linear/project.json']) {
    assert.ok(existsSync(resolve(directory, file)), `Required project file missing: ${file}`);
  }
  const metadata = JSON.parse(readFileSync(resolve(directory, '.linear/project.json'), 'utf8'));
  assert.equal(metadata.repository, 'https://github.com/Joehl1103/counter-strike-facsimile');
  assert.equal(metadata.linear.team, 'JKH');
  assert.equal(metadata.linear.projectId, '448d0461-1894-4bf9-93fb-d6282b961274');
  assert.equal(metadata.linear.githubIssueCreationDirection, 'github-to-linear');

  if (!existsSync(resolve(directory, 'package.json'))) {
    const gamePaths = ['app', 'src', 'public', 'assets', 'tests', 'scripts', 'package-lock.json'];
    assert.ok(!gamePaths.some((path) => existsSync(resolve(directory, path))),
      'Game files exist without package.json; refusing to skip game checks.');
    return false;
  }

  const manifest = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
  assert.ok(existsSync(resolve(directory, 'package-lock.json')), 'Game CI requires package-lock.json.');
  for (const script of ['lint', 'typecheck', 'test', 'build']) {
    assert.ok(typeof manifest.scripts?.[script] === 'string' && manifest.scripts[script].trim(),
      `Game CI requires npm run ${script}.`);
  }
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hasGame = inspectProject(process.cwd());
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    validatePullRequest(event.pull_request);
  }
  console.log(hasGame ? 'Game manifest and required commands present.' :
    'Documentation scaffold only: gameplay, performance and build remain unverified.');
}
