# Linear, pull requests and independent Codex review

## Start from an existing Linear issue

Use the [Counter-Strike 1.6 backlog](https://linear.app/jkhl1103-personal/project/counter-strike-16-7c7dc1369cb9)
in team `JKH`. Read the issue, parent epic, blockers and acceptance card before
editing. Linear owns scope and progress; GitHub owns code, PRs and CI results.
The native integration creates Linear issues from GitHub, not the reverse.
Do not mirror existing Linear issues into new GitHub issues.

Record a claim with issue/epic, worker identity, branch/worktree, base SHA,
owned paths, shared interfaces, independent reviewer and evidence directory.
Use `In Progress` once authorized implementation starts. Assign separate
worktrees to independent workers under the existing parallel-work policy;
serialize shared-file edits and integration. Preserve inherited dirty work.

## Build and open a reviewable PR

1. Fetch current remote refs and confirm the correct repository, base and
   checkout. Use an issue branch such as `chore/jkh-126-baseline`; keep work
   bounded to its acceptance card and do not commit directly to the default branch.
2. Run checks appropriate to the change on authorized infrastructure. Current
   project restrictions keep game builds, browser/load tests and Blender off the
   local Mac; use the dedicated testing worker and its recorded capacity limits.
   Game changes require
   `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
   on a frozen candidate, plus the execution method's relevant runtime/visual
   evidence. Documentation-only work requires consistency and link checks.
3. Open a PR against the designated repository using its template. Include the
   exact `JKH-<number>` in the title and the matching Linear issue URL in the
   body. Describe the outcome, Acceptance Criteria, actual checks, evidence,
   limitations and candidate SHA. Link an existing GitHub issue if one exists.
4. Record the PR on the Linear issue and move it to `In Review`. Treat this as
   pending verification, not completion. The coordinator performs remote updates.
5. Keep incomplete work as a draft. Once the approved issue-scope criteria and
   relevant acceptance evidence are satisfied, mark the PR ready. The trusted merge coordinator updates clean stale branches and merges after
   current checks and independent review pass; no additional merge-approval round is needed.

This project requires PRs for authorized implementation; do not replace them
with direct default-branch pushes. Joseph's explicit 2026-09-17 instruction
removes the separate approval step for creating/editing PRs and their Acceptance
Criteria in this project. Within already-authorized task scope, agents may
prepare and push issue branches, create/update PRs and write verifiable criteria
without another confirmation. This project-specific instruction supersedes the
general PR/checklist approval requirement in `~/.claude/rules/github.md`.

Record actual scope and evidence. CI, independent code review and protected
merge gates still apply. This exception does not expand task scope or authorize
publication of excluded game/source history, issue closure or hosting deployment.

## CI checks

[ci.yml](.github/workflows/ci.yml) runs on PR creation, updates, reopening,
ready-for-review and metadata edits, plus pushes to `main` and manual runs.
Do not use path filters that leave required checks permanently pending.

| Required check | What it establishes |
| --- | --- |
| `Repository checks` | Project metadata and entry points exist; CI gate fixtures pass; PR has a matching Linear reference and Acceptance Criteria. |
| `Game checks` | Once game source exists: lockfile install, lint, TypeScript, full regression/performance tests and production build. While this is a documentation scaffold, explicitly reports that gameplay was not checked. |
| `Independent Codex review` | A separate read-only Codex run reviewed the exact PR head and base and returned a complete, clean structured verdict. Missing credentials/output, findings, stale SHAs and failed/skipped reviewer jobs fail the gate. |

Game source without a package manifest fails instead of taking the scaffold
path. Missing required npm scripts/lockfile also fail. The game job always runs
when a manifest exists, including documentation PRs, to keep its required check
unambiguous. Use the project's unchanged performance thresholds; investigate
runner failures and retain evidence rather than weakening a gate.

## Independent review and repair loop

[codex-review.yml](.github/workflows/codex-review.yml) uses `pull_request_target`
to run the trusted `main` workflow, so a PR cannot replace its own reviewer.
It launches a new Codex session on each PR candidate. It receives the immutable
base/head SHAs and
repository diff, without the builder's conversation or self-review. Only trusted
base files are checked out; candidate files are read with `git show <head>:<path>`.
Never check out, install, source or execute PR-head code in this workflow. It runs
read-only with no dependency install or PR-code execution, no write token and
no credentials persisted in Git. A separate gate validates the result and
publishes it in the Actions job summary, accessible from the PR's required
`Independent Codex review` commit status. That status is marked pending before
review and is attached explicitly to the head SHA, not the base workflow SHA.
Only the separate status jobs receive status-write permission; they do not run
candidate code. The final status also rechecks live head/base to reject races.

The API key belongs only to the `codex-review` GitHub environment, restricted
to `main`. Do not put it in a repository-wide secret: ordinary same-repository
PR workflows could otherwise reference it. The environment restriction and
protected base branch are required for this trust boundary.

After installing Codex, the review job starts a root-owned local relay from
trusted main files. That relay sends the unchanged Ollama environment secret
only to Ollama's Responses endpoint. The Codex Action's proxy receives a local
placeholder key, then drops sudo before inspecting the PR. The relay and
reviewer never execute candidate code.

Review input is a trusted packet generated from exact `BASE...HEAD` git objects,
with the assigned diff embedded in the prompt and whole-HEAD text context under
`.codex-review-input/head/`. Chunk reviewers return separate reports; the base
aggregate gate requires every planned chunk to pass, reading flat `chunk-NNN.json`
envelopes bound to the current run ID, attempt and independently verified plan
digest. Use **Re-run all jobs**: partial failed-job reruns cannot reuse prior-attempt
artifacts and fail closed if any current report is missing. All locks receive full-diff review at lowest priority. All text, including
build outputs and deletions of any size, counts toward the budget/cap. Asset
binary skips require an allowlisted signature, HEAD mode `100644`, and a path
outside `.github/`; uncertainty and code-like payload heuristics fail closed.
Every prompt lists skipped asset paths, sizes, detected formats and blob SHA-256
hashes. Reviewers must flag code/config/loaders that could execute an asset or a
matching path/glob as code. Whole-tree context includes unchanged
callers: regular text only, copied read-only, with 2 MiB per-file and 100 MiB total
caps. Symlinks are text listings, submodules and other omissions are listed.
Missing context needed for a decision requires `complete=false`. Zero chunks
always fail with `asset-only change requires human review`. Overflow fails closed.
The status remains `Independent Codex review` with
`Reviewed <head> against <base>`. Default 100k-character chunks, cap 60, four in
parallel: estimate chunks × roughly 3 runner minutes, up to 20 per chunk at
timeout, against the 2,000-minute monthly quota. PR #9's earlier estimate of
37 chunks/110 minutes needs recalculation under the stricter coverage policy. See the
Review provider section in MERGE_COORDINATOR.md for limits and exclusions.
Reviewer workflow/script changes activate only after reaching main because
`pull_request_target` uses the base workflow.

The output must identify both SHAs, declare the review complete, have verdict
`pass`, and contain no unresolved findings. All findings require repair or an
evidence-backed resolution followed by a fresh independent review. Limitations
remain visible. A running/requested review, an empty response, a builder's own
review, or an earlier commit's review never satisfies this gate.

After every push or base change, require current checks and another review.
Before merge, fetch the latest base, bring the candidate up to date and confirm
all three checks cover it. If the base advances during review, update/rerun;
never reuse the older result. Strict required checks should enforce this remotely.

Fork PRs deliberately fail the Codex gate. After human inspection, a maintainer
can place the candidate on a
trusted repository branch and open a new PR; do not use `pull_request_target`
to execute fork code with secrets or waive the independent-review requirement.

Local fallback evidence can come from a fresh read-only Codex reviewer using
`codex review --base <base-ref>`, with the resolved base/head SHA and report
saved. It supports offline work but does not replace the required remote check.

## Automatic merge and Linear handoff

Joseph’s 2026-09-16 instruction to resolve merging at repository level establishes
standing merge authorization, once this defined workflow is explicitly activated,
for authorized issue work that meets its approved
scope and acceptance evidence. It supersedes the previous per-merge permission
requirement. Public game/source/history publication, issue closure and deployment remain
separate boundaries. PR-body/checklist confirmation was removed for this project
by Joseph on 2026-09-17; it is not a delivery prerequisite.

The trusted [merge coordinator](.github/workflows/merge-coordinator.yml) is the
sole automatic merge writer. It wakes on completed validation and periodically,
updates clean stale branches, waits for current validation, and merges one
candidate at a time. [MERGE_COORDINATOR.md](MERGE_COORDINATOR.md) defines its
TypeSafe Jev routing, bounded retry, exact-head/base evidence, deduplicated
human handoff, and environment-scoped automation credential. The reviewer and
status publishers remain on separate runners without the merge credential.
Current enforcement modes and their limits are recorded in
[MERGE_COORDINATOR.md](MERGE_COORDINATOR.md). Verify live rules and coordinator
receipts; this document does not activate an enforcement mode or waive stronger
task-specific protection requirements.

[main-ruleset.json](.github/main-ruleset.json) specifies the intended native
policy: a PR, resolved conversations, an up-to-date branch and all three checks,
with no force-push/deletion or bypass actors. The file alone does not establish
that GitHub enforces those rules. Current main also implements the private-plan
`self_enforced` mode documented in MERGE_COORDINATOR.md; it is not native branch
protection and retains the stated direct-write and race limitations. All three
current checks and independent review remain required in either mode. Local
configuration, an auto-merge setting or a past activation record is not evidence
that the current remote enforcement and credentials work. The personal-repository
trust model assumes trusted collaborators; check names and an Actions app ID do
not protect against a malicious writer creating a same-named status.

Keep incomplete work in draft and do not mark it ready until its relevant
runtime/visual evidence passes. A clean source review is not a substitute for
that evidence. When another PR advances `main`, bring the next issue branch up
to date without rewriting published history and let checks/review run again.
The coordinator updates clean stale branches with expected-head protection.
Conflicts are routed to a deduplicated maintainer handoff; published history is
never rewritten and ambiguous conflict resolution is not silently chosen. No automatic branch deletion is enabled.

After GitHub confirms an authorized merge, the coordinator records the PR, merge
SHA, checks and evidence in Linear. Move an issue to `Done` only with the required
acceptance/closure authorization. An epic remains open until its integrated
criteria pass. Preserve the factory method’s two independent normal-speed CT/T
rounds and Joseph’s complete-product visual acceptance.

## Activation record and current verification

The workflow-only bootstrap was published on 2026-09-17; it is a historical
step, not an empty-remote prerequisite still waiting to happen. See
[AUTO_MERGE_SETUP.md](AUTO_MERGE_SETUP.md) for that dated activation evidence and
[MERGE_COORDINATOR.md](MERGE_COORDINATOR.md) for current enforcement modes,
private-plan limitations and credential requirements. The curated game import
uses the existing issue-linked draft PR; it does not repeat bootstrap or permit
publication of excluded source/history/assets.

Before delivery, verify the live main/head refs, actual repository visibility,
current rules mode and credential access. Keep the API credential in the
`codex-review` environment and the separate automation credential in
`merge-coordinator`; do not place them in source, comments or repository-wide
secrets. Verify the actual environment restrictions rather than assuming the
plan enforces configured settings. Desktop sign-in is not the review API key.

Inspect all three required checks on the current candidate and base. The
independent result is in `Publish independent review result`; failed, missing,
stale or incomplete results hold delivery. When native rules are supported,
verify the exact required checks, resolved conversations and up-to-date branch
policy with no bypass actors. When the coordinator reports `self_enforced`,
record the limits documented in MERGE_COORDINATOR.md explicitly; do not call it
native protection or use it to waive a stronger instruction.

End-to-end automatic merging remains unverified until actual linked-PR evidence
shows missing/failed checks hold the merge, new commits invalidate old results,
and an authorized ready candidate merges against the exact reviewed base. No
settings, credential or enforcement change is authorized merely by this checklist.

Sources checked 2026-09-16:
[OpenAI Codex Action documentation](https://learn.chatgpt.com/docs/github-action)
and the [pinned action implementation](https://github.com/openai/codex-action/tree/f367b1e9572fd064ea71ef925ca24ee0f01080af);
[GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target)
and [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

Native behavior: [GitHub auto-merge documentation](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request).

## Publishing an authorized issue branch

Read [AUTO_MERGE_SETUP.md](AUTO_MERGE_SETUP.md) first. Its public-bootstrap and
source-publication prerequisites must be resolved before using these commands;
the current local consolidation branch must not be pushed wholesale.

After the branch content and PR criteria are authorized, commit the bounded
change, then push the current issue branch with `git push -u origin HEAD`.
Open the issue-linked PR against `main` using the approved criteria. Use a draft
until scope-specific acceptance evidence is complete. Further commits pushed to
the branch automatically rerun CI and independent review. The trusted coordinator waits for current checks/review and merges validated
candidates. If `main` advances, it updates clean issue branches automatically.
For conflicts, resolve the reported files, push and obtain fresh checks/review
without force-pushing.

Delivery here ends at a confirmed authorized merge to `main`, with current
checks and enforcement evidence recorded. Stronger protection requirements must
be verified separately and are not waived here. Hosting deployment is separate. The coordinator uses a dedicated repository-scoped credential so updates and
merges trigger fresh workflows. A separate manual merge made with GITHUB_TOKEN
may not trigger a new push workflow; verify actual runs.
When a separate main validation run is needed, explicitly dispatch the existing
CI workflow (`gh workflow run ci.yml --ref main`) and retain the actual result.
See [GitHub workflow-trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
