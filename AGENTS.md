# Counter-Strike Facsimile agent instructions

Before implementation, read [FACTORY_METHOD.md](FACTORY_METHOD.md),
[CODEX_PLAN_CS16_FACSIMILE.md](CODEX_PLAN_CS16_FACSIMILE.md), and
[AGENT_WORKFLOW.md](AGENT_WORKFLOW.md). The first two govern product scope,
acceptance cards, evidence, visual QA, and reassessment; the workflow governs
the required Linear → branch → PR → CI → independent Codex review → automatic
merge procedure.

## Linear is the project tracker

- Workspace/team: `jkhl1103-personal` / `JKH` (Jkhl1103-Personal).
- [Counter-Strike 1.6 project](https://linear.app/jkhl1103-personal/project/counter-strike-16-7c7dc1369cb9).
- [Product plan and epics](https://linear.app/jkhl1103-personal/document/counter-strike-16-product-plan-and-epic-breakdown-d0e2622183ec).
- [Execution method and task template](https://linear.app/jkhl1103-personal/document/counter-strike-execution-method-and-task-template-3805da2924b6).
- Exact IDs and the verified native connection are in [.linear/project.json](.linear/project.json).
- Use the available Linear connector to read the existing issue, parent epic,
  dependencies and acceptance criteria. Discover tools by capability; do not
  assume a particular assistant's MCP tool prefix is portable.
- Native GitHub issue creation flows **GitHub → Linear**. Existing Linear
  issues are not exported to GitHub. Do not create duplicate GitHub issues.
- Before implementation, record the issue, worker, branch/worktree, base SHA,
  owned files, reviewer and evidence location. Recheck dependencies and status.
- Move authorized work to `In Progress`, then `In Review` with the PR and
  verification evidence. Once activated, the requested repository workflow
  merges qualifying ready PRs after required checks and relevant acceptance
  evidence pass. No per-merge confirmation is needed. This does not authorize
  `Done`, deployment or complete-product visual acceptance.
- The coordinator owns Linear updates and integration; workers return evidence.
  If access is unavailable, record the blocker and do not claim a remote update.

## Startup check of Linear activity

Every agent, including coordinators, workers and independent reviewers, must
read the latest Counter-Strike 1.6 project activity updates before starting or
resuming work. Also read recent activity on the assigned issue and relevant
parent/dependencies. Include the latest milestone and stopping-point updates,
following linked evidence as needed to establish current state.

Reconcile the timeline with the current request, checkout/commit, task ownership,
completed work, blockers and next action before editing or running checks. Do not
rely solely on inherited conversation, memory or a stale handoff. Coordinators
must include this startup requirement in delegated tasks. If an agent cannot
access Linear, it must report that limitation and obtain freshly retrieved
activity from the coordinator before proceeding with dependent work.

## Milestone and stopping updates in Linear project activity

At each meaningful milestone, the coordinator must post a project status update
in the Counter-Strike 1.6 project's Activity feed before reporting the milestone
complete to Joseph. This is standing authorization to publish these updates.
Issue updates alone do not satisfy this rule.

Before intentionally stopping work or handing the session back to Joseph, post
a project activity update explaining why work is stopping and the exact task to
resume next. State what is complete, what remains unfinished, and any blocker or
decision needed from Joseph; explicitly say when no user decision is needed.
Distinguish a completed work segment from blocked work or a voluntary pause.
Update affected issue timelines when their status or blocker changes. A milestone
update may also serve as the stopping update if it includes this information;
avoid duplicate posts. This reporting rule does not create an approval gate or
justify stopping work that can otherwise continue.

Keep each update concise: outcome, related JKH issues, actual validation results,
remaining blockers or acceptance limits, and the next step. Include the relevant
commit/PR and evidence references when available. Distinguish private integration
from publication, merge, deployment and final acceptance; never publish private
source, raw assets or credentials in an update.

Use the Linear project status-update capability, with the project ID in
`.linear/project.json`. Check recent updates to avoid duplicate milestone posts
and verify the saved update. If posting fails, retain the draft locally and tell
Joseph that the project activity update remains pending.

## Required delivery gates

Every implementation change must have a PR containing its `JKH-<number>` in
the title, the matching Linear issue URL and Acceptance Criteria. This request
establishes the project PR requirement for future authorized implementation.
Read the detailed workflow for the remaining publication and acceptance boundaries.

Require `Repository checks`, `Game checks` and `Independent Codex review` on
the latest PR head. A fresh Codex session must review the actual diff; the
builder cannot act as its own reviewer. Fix findings, rerun checks and obtain
review again after changes. Never bypass a missing or failed review.

The defined trusted review workflow requests native squash auto-merge for ready,
same-repository PRs into protected `main`. Keep incomplete issue evidence in draft.
GitHub must enforce all three current checks, resolved conversations and an
up-to-date branch, with no admin bypass. [.github/main-ruleset.json](.github/main-ruleset.json)
defines the required rules; [AUTO_MERGE_SETUP.md](AUTO_MERGE_SETUP.md) records
activation prerequisites. Local configuration does not mean remote activation.

Code review supplements the execution method's asset, gameplay, performance
and two independent final-round gates. Preserve Joseph's approved M4 and all
frozen visual/performance thresholds. User visual acceptance remains separate.

## Local consolidation boundary

This candidate contains a history-free game snapshot from original revision
`94b2f4ef79c9c97c4d17eca04427a0b7947e8108`; it does not import the original
repository's history, worktrees, ignored evidence, or outstanding branches. Read
[LOCAL-CONSOLIDATION.md](docs/integration/LOCAL-CONSOLIDATION.md) and
[BRANCH-HANDOFF.md](docs/integration/BRANCH-HANDOFF.md) before acting on an
unresolved issue. The original checkout is now retained at ignored `.local-archive/counter-strike/`,
including its latest coordination handoff, unfinished worktrees and evidence.
Read [CHECKOUT.md](CHECKOUT.md) for active paths. Do not publish the archive.

Do not rewrite remotes, publish source/history, or treat local checks as remote
enforcement. The public destination was empty at the recorded audit. Publication,
PR setup, CI enforcement, merging, deployment, final CT/T rounds, and Joseph's
visual acceptance are separate gates. Buzz coordination is retired.

Current execution restrictions prohibit local Mac browser simulations, builds,
load tests and Blender captures. Use the dedicated `counter-strike-testing`
worker and its retained runbook for authorized checks. This location restriction
supersedes older instructions to run game checks locally. The CPU-only worker
does not establish full CT/T-round or 60-FPS acceptance.

## Review guidelines

Review the changes and relevant callers for concrete defects, regressions,
missing acceptance evidence, broken CI and bypasses of the Linear/PR/review
gates. Report actionable findings with file/line evidence. Distinguish what
was inspected or tested from what remains unverified. Do not edit code during
an independent review or treat a builder's checklist as proof.

## Visual evidence

For asset or animation work, use [visual-tools/README.md](visual-tools/README.md)
and `visual:preview`, `visual:replay`, `visual:verify-replay`, and
`visual:compare`. Inspect actual images and runtime outcomes; an export, metadata
match, or dispatched input is not visual acceptance. Keep source and runtime
captures labelled separately and retain failed evidence.

## Project-specific PR authorization

Joseph's 2026-09-17 instruction removes the separate approval requirement for
creating/editing PRs and their Acceptance Criteria in this project. Within work
the user has already authorized, agents may prepare, push and open issue-linked
PRs and write or update verifiable criteria without another confirmation. This
project-specific instruction supersedes the general PR/checklist approval rule.

Record the authorized scope and actual evidence. Required CI, independent review
and protected merge rules still apply. This does not expand a task's scope or
authorize publishing excluded game assets/history, issue closure or hosting.
