# Linear and agent CI setup

Follow-up: [AUTO_MERGE_SETUP.md](AUTO_MERGE_SETUP.md) defines the subsequently
authorized PR-to-main automatic merge workflow and its current activation status.
The setup history below remains the record of the original scaffold phase.

Requested by Joseph on 2026-09-16: reflect the Linear integration in local
agent instructions and require a PR with an independent Codex review.

## Scope and acceptance

- Document the verified JKH team, Counter-Strike project, native GitHub link,
  issue lifecycle and repository migration boundary in agent entry points.
- Require issue-scoped branches, a linked PR, automated validation and a fresh
  independent Codex review of the final head and base before merging.
- Add GitHub Actions for repository checks and conditional game checks, plus
  a separate read-only Codex reviewer and a fail-closed review gate.
- Validate workflow syntax and exercise rejection paths with local fixtures;
  obtain an independent Codex review of these changes.
- Preserve the dirty legacy checkout. Do not import/publish the game, change
  remotes, close Linear issues, merge or deploy as part of setup.

## Activation boundary

On inspection, the destination GitHub repository has no commits, no Actions
secrets and no rulesets. Local setup can be completed now. Remote activation
requires the outstanding initial-publication decision, an `OPENAI_API_KEY`
secret in the `codex-review` environment restricted to `main`, and the
required-check rules described in AGENT_WORKFLOW.md.
Local validation does not establish a successful GitHub-hosted review run.

## Local validation — 2026-09-16

- Both workflows passed `actionlint`; the three CI-policy fixture groups passed.
- Five fixtures exercised the actual status-publishing script: clean verdict,
  validation failure, skipped review, changed PR head and changed base.
- Local Markdown links were checked. No game source, tests or build ran here.
- A fresh independent Terra Codex verifier found an initial workflow-definition
  bypass. The final design uses the trusted base's `pull_request_target`
  workflow, reads candidate Git objects, separates review credentials from
  status-writing jobs, and requires provenance verification before merging.
- Independent re-review reported no remaining concrete findings within the
  documented trusted-collaborator model. GitHub-hosted execution and enforced
  branch/environment behavior remain unverified until activation.
- Local evidence is in ignored `outputs/agent-ci-2026-09-16/`. The legacy
  checkout's AGENTS.md and CLAUDE.md were updated locally without staging any
  inherited game changes. No remote content was published by this setup.
