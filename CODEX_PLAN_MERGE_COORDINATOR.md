# Automatic PR coordinator — 2026-09-16

## Acceptance card and ownership

User objective: automatically merge as many validated PRs as possible, consider
TypeSafe Jev for decisions, and tag Joseph for cases needing human input.
Parent: JKH-119 (live In Progress); repository delivery extension, not epic closure.
Existing CI search found no matching child (JKH-103 belongs to another project).
Coordinator: /root. Branch: integration/jkh-119-local-consolidation.
Checkout: counter-strike-facsimile. Frozen base: 29255e065f6bf7ba120132d9681a5357c4ef07b2.
Owned paths: .github/scripts/, .github/workflows/, workflow documentation and this plan.
Game/source/assets/archive/hosting identity remain outside this change.
Independent verifier: fresh Terra reviewer after the implementation is frozen.
Evidence: outputs/merge-coordinator-2026-09-16/ (ignored).

## Reuse decision

Adapt the existing protected merge helper and GitHub update-branch/rerun APIs.
GitHub merge queue is unavailable for this personal repository. Use a serialized
trusted-main coordinator with scheduled reconciliation and event wakeups.
Use Jev only for bounded blocker routing; it cannot generate conflict repairs
or establish that tests/review passed. Preserve independent Codex review.
No model call is needed to identify green checks, update clean branches, wait
for running checks, or merge a validated candidate.

## Required behavior

- Inspect all open main PRs; drafts wait, blocked PRs do not starve ready PRs.
- Update clean stale same-repository branches with expected-head protection;
  never force push/rebase published history. Every new SHA gets new CI/review.
- Merge only current head/base with strict live rules, successful required
  checks, independent review and resolved conversations. Never bypass a gate.
- Bound automatic retries/repair attempts per head/base. Use typed Jev routing
  only for ambiguous blockers. Invalid/missing model output fails closed.
- Notify @Joehl1103 with a deduplicated PR comment when a human decision,
  credentials or unsupported repair is necessary. Never alter PR criteria.
- Keep credentials in main-restricted environments, execute only trusted-main
  coordinator code, and keep candidate execution separate from write tokens.
- Preserve publication boundaries: prepare workflow-only bootstrap without
  game files, raw assets, local archive or original history before activation.
- Verify deterministic routing, stale/racing SHAs, failures, idempotent notices,
  API authorization, actual TypeSafe integration, and independent review.
- End-to-end activation requires a real remote base, appropriate credentials,
  enforced rules and observed hold/update/review/merge/notification behavior.
  Local fixtures alone cannot establish this final acceptance.

## Progress

- Baseline: only post-review native auto-merge exists; no updating/coordinator.
- TypeSafe credential name exists locally; its value has not been exposed.
- Remote activation and reviewer/automation credentials require verification.

- Implemented core (/root/merge_coordinator_builder, completed by /root),
  trusted GitHub adapter, TypeSafe adapter, event/schedule workflow and docs.
- Live TypeSafe connectivity HTTP 200, model jev-1.13.0. Synthetic conflict and
  assertion cases routed to human; bare timeout remained uncertain and held.
- Completed criteria are an explicit automation gate. Comment records require
  the exact configured author. An earlier broad edit was rejected by automatic
  approval review; the narrower identity check was accepted.
- No public push, GitHub settings write, PR, merge or issue closure has occurred.

- Independent reviewer /root/coordinator_review identified merge-ref check SHA
  handling and stale bootstrap inclusion. Both were repaired; exact selected
  check SHA is now required and the 22-file bootstrap uses an exact allowlist.
- Attempted remote environment preparation was rejected by automatic approval
  review for missing explicit activation/credential-disclosure authorization.
  No environment or secret changed. A specific user approval request is pending.
- Production activation and end-to-end verification remain open; local completion
  is not completion of the user's active workflow objective.

## Activation continuation — 2026-09-17

Joseph's latest “go” approves the previously presented workflow-only public
bootstrap, credential/environment setup and linked test PRs. The game import
and archive remain unpublished. Base: d113b88b75aea0c287fa6c1a718f160b71ec5732.
Root owns workflow/configuration/docs; /root/ollama_contract researched the
provider contract read-only; a fresh Terra reviewer will inspect the candidate.

1. Adapt the pinned Codex Action to Ollama Cloud gpt-oss:120b with the existing
   read-only sandbox, separate status gate and strict JSON validation. Ollama
   does not support structured-output requests; require JSON in the prompt.
2. Verify both main-only environments, TypeSafe and the supplied merge token.
   Joseph must add OLLAMA_CLOUD_API in codex-review and remove its repository
   copy: automatic approval rejected a proposed encrypted-artifact transfer;
   that rejected attempt made no changes. A concise request is pending.
3. Refresh the exact workflow-only bootstrap, run policy fixtures/actionlint,
   obtain fresh independent review, and publish a new root main.
4. Apply strict main rules and verify real review/hold/update/merge behavior
   with approved test PRs once the review credential is in its environment.
5. Record run URLs and candidate identities in project evidence and Linear.
   JKH-166 (High) remains the separate queued agent-wiki implementation issue.

Environment preparation completed: codex-review allows branch main only;
merge-coordinator has MERGE_BOT_TOKEN, MERGE_BOT_LOGIN and TYPESAFE_API.
Remote enforcement and end-to-end acceptance remain unverified at this point.

### Published checkpoint

- Fresh independent /root/ollama_bootstrap_review: PASS, no actionable findings.
  Both source and bootstrap fixture suites passed 39 tests; actionlint and
  whitespace checks passed. Direct Ollama catalog confirms gpt-oss:120b.
- Published exactly 22 workflow-only files as a new root commit on main:
  2d5ff1e26a0922bfc8218899c27fdc4d7e757598. No game/source history was included.
- Ruleset 23595815 is active, no bypass, all three strict checks required.
  Initial CI run 35218368367 and coordinator runs 35218368393/35218393209 passed.
- There are no test PRs yet. Credential placement is still pending; remote
  independent review, clean stale updates, conflict notices and merges have
  not been demonstrated. Do not mark the workflow objective complete.

### Reviewer credential ready; test-PR approval pending

Joseph confirmed secret setup with “Done”. Metadata verified OLLAMA_CLOUD_API
in main-only codex-review. Root removed the remaining repository-level copy
and verified environment presence/repository absence without retrieving values.

Automatic approval review rejected the attempted test branch push and draft PR
creation because exact PR Acceptance Criteria approval was required by the
global GitHub rules. That rejected command did not execute. Root prepared the
harmless fixture and a concrete PR body locally, and asked for explicit approval.
Fixture readiness is separated from live experiment outcomes to avoid claiming
a completed merge before the test PR can become eligible. No PR exists yet.

### Test execution authorized; project ceremony exception

Joseph said “go,” then explicitly removed the separate approval requirement
“for this project.” AGENTS.md and AGENT_WORKFLOW.md now state this specific
override for PR/checklist creation and editing within already-authorized scope.
It does not remove CI, independent review, protected merges or publication bounds.

Draft PR #1 publishes the instruction exception and a harmless documentation
fixture: https://github.com/Joehl1103/counter-strike-facsimile/pull/1, head
13aedd8c30106dfa0cbd6eb05f2245983ca23ef7, base
2d5ff1e26a0922bfc8218899c27fdc4d7e757598. GitHub CI run 35229614589 passed;
review run 35229614487 failed before contacting Ollama; see the credential-
format/provider-compatibility diagnosis below. Current root owns delivery; reviewer is the
independent trusted-main Codex Action. Keep failed/conflicting fixtures blocked
and close them after captured evidence; never mark experiment outcomes passed
before the corresponding live behavior is observed.

### Live pilot observations

- PRs #1–#4 now exist: project ceremony/docs positive control (#1), required
  Repository-check failure (#2), future add/add conflict (#3), and clean stale
  update (#4). Initially only #2 was ready; all four are now draft. After
  capturing #2 hold/notification evidence, root paused it to avoid repeated
  paid triage calls while the reviewer is blocked. Re-mark it ready for the
  remaining blocked-PR/nonstarvation test once the reviewer works.
- PR #1 reviewer run 35229614487 failed before provider contact. The pinned
  Codex Action's responses proxy accepts only ASCII letters/digits/-/_ and
  rejected the saved key format. This is not an Ollama model/auth verdict.
  Root requested format-only clarification; /root/ollama_contract researches
  official provider/proxy compatibility read-only. No key value was read.
- PR #2 Repository checks failed intentionally (run 35229882459), Game checks
  passed in scaffold mode, and GitHub reports the PR blocked. The coordinator
  successfully routed the failure through Jev to triage_needs_human, emitted
  one actionable owner mention and did not duplicate it over subsequent runs.
- Run 35229988961 confirms the coordinator continues examining the other PRs
  after #2 is blocked. They are drafts; starvation-free successful merge has
  not yet been demonstrated. Main and protections remain unchanged.

### Documentation follow-up limitation

The project-specific PR/checklist exception was explicitly requested by Joseph
and was written to AGENTS.md, the primary AGENT_WORKFLOW.md policy paragraph
and public PR #1. Automatic approval review subsequently rejected removal of
two older “authorized/approved PR criteria” phrases in AGENT_WORKFLOW.md and
AUTO_MERGE_SETUP.md, citing the prior AGENTS.md approval boundary despite the
new user instruction. A second narrow attempt with quoted authorization was
also rejected. Those two phrases remain unchanged; do not claim their removal.
The explicit exception states that no separate confirmation is required within
already-authorized work. Independent documentation review flagged the remaining
phrases; its resolution is still pending. No workflow/protection gate was changed.
