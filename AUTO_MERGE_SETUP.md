# PR delivery and automatic merge

Status, 2026-09-17: the workflow-only bootstrap is published on remote `main`
at `2d5ff1e26a0922bfc8218899c27fdc4d7e757598`. Its 22 public files contain no
game source, original history, raw assets or local archive. The keeper remains
on the separate local consolidation branch; do not push that branch wholesale.

The [main ruleset](https://github.com/Joehl1103/counter-strike-facsimile/rules/23595815)
is active with all three required checks, strict branch freshness, resolved
conversations, squash-only merges and no bypass. Native auto-merge is enabled;
branch deletion stays disabled. Both environments allow only branch `main`.
The merge environment has the supplied token, matching login and TypeSafe key.

[Initial CI](https://github.com/Joehl1103/counter-strike-facsimile/actions/runs/35218368367)
and [coordinator startup](https://github.com/Joehl1103/counter-strike-facsimile/actions/runs/35218393209)
succeeded. There were no open PRs, so these runs do not prove review, branch
update or merge behavior. End-to-end automatic merging remains unverified.

Credential placement verified after Joseph's “Done”: `OLLAMA_CLOUD_API` is in
main-only `codex-review`; the leftover repository-level duplicate was removed.
No secret value was retrieved. The authenticated provider pilot remains pending.
Joseph subsequently removed the separate PR/checklist approval requirement for
this project. [PR #1](https://github.com/Joehl1103/counter-strike-facsimile/pull/1)
records that exception and starts the real reviewer pilot as a draft. GitHub CI
passed on candidate `13aedd8c30106dfa0cbd6eb05f2245983ca23ef7`. The reviewer
failed before contacting Ollama: the Codex Action proxy rejected the saved key's
character format. Credential-format/provider compatibility is being diagnosed;
no successful independent review or automatic merge has occurred.
See [MERGE_COORDINATOR.md](MERGE_COORDINATOR.md) for behavior and
[CHECKOUT.md](CHECKOUT.md) for the retained local game/archive paths.

## Defined delivery flow

1. Work on a bounded `JKH-<number>` issue branch. Read Linear scope/dependencies,
   preserve the frozen acceptance criteria and commit the implementation.
2. After publication/content and PR criteria are authorized, push the issue
   branch (`git push -u origin HEAD`) and open a PR against `main`. Include the
   matching Linear URL, approved Acceptance Criteria and actual evidence.
   Keep incomplete issue evidence in draft.
3. [CI](.github/workflows/ci.yml) runs repository policy/fixtures and game
   installation, lint, type checking, regression/performance tests and build.
4. [Independent review](.github/workflows/codex-review.yml) reads the actual
   immutable head/base diff using trusted base code. Missing credentials,
   incomplete/stale review or unresolved findings fail its required status.
5. The trusted coordinator inspects all ready PRs, updates clean stale branches,
   and requires every current check plus exact-head/base review and resolved
   conversations before native squash merge. A blocked PR does not stop the
   queue. Jev can route a bounded infrastructure retry; other blockers tag Joseph.

6. Record the actual merge SHA and evidence in Linear. Issue closure and hosting
   deployment retain their separate acceptance requirements. Updating a PR head
   invalidates its old review; updating from a newer main requires fresh checks.

The required checks are **Repository checks**, **Game checks**, and
**Independent Codex review**, each restricted to GitHub Actions. The
[ruleset template](.github/main-ruleset.json) also prevents force pushes and
branch deletion, requires a PR and conversation resolution, and has no bypass
actors. The independent Codex check supplies review; there is no additional
mandatory human approval count. Ready status must only be used once issue-level
runtime/visual evidence is complete; automation cannot establish visual acceptance.

Reviewer code runs read-only with an environment-scoped API key. Status writers
and the merge coordinator use separate runners. The coordinator executes trusted
main code and uses a repository-scoped credential to generate fresh update/merge
events. Every merge is protected by the checked-in live rules. The helper verifies
the actual squash commit and reviewed parent; this coordinator never arms a
pending merge. See [the implementation guide](MERGE_COORDINATOR.md) for trust
boundaries and TypeSafe's limited role.

## Activation prerequisites

The current consolidation branch includes local editable asset sources whose
public redistribution is not authorized. **Do not push this branch wholesale.**
`.local-archive/` is ignored and must never be published. An approved selection
of public bootstrap/source content must be prepared separately; moving files
locally did not resolve publication rights or authorize original history upload.

The workflow-only selection was approved and published; game publication remains
a separate decision. Activation record and remaining checks:

1. Complete: initial `main` contains the trusted workflow and coordinator.
2. Complete: `codex-review` exists and is restricted to branch `main`.
   `OLLAMA_CLOUD_API` is present there and absent from repository-level secrets.
   No key was read or exposed. An authenticated provider pilot and actual
   feature-branch denial check remain to be demonstrated.
3. Complete: `merge-coordinator` is restricted to branch `main` and has
   `MERGE_BOT_TOKEN`, `TYPESAFE_API` and the matching `MERGE_BOT_LOGIN` variable. See [the credential scope](MERGE_COORDINATOR.md).
4. Complete: native auto-merge, squash merging and the checked-in ruleset
   are active. Verified settings are recorded in `outputs/merge-coordinator-2026-09-16/public-activation.json`.
   Intended settings are `allow_auto_merge=true`, `allow_squash_merge=true`,
   `allow_merge_commit=false`, `allow_rebase_merge=false`, and
   `delete_branch_on_merge=false`. No branch-creation exception is configured.
5. Exercise approved linked PRs: missing/failed review or game check must block merge;
   a new commit must require fresh review; a stale base must stay blocked;
   all required checks plus completed issue acceptance must allow native merge.
   Record the actual GitHub run URLs and merged SHA before claiming activation.

The coordinator requires all gates to pass before requesting a merge. The prior
remote performance failure (p95 1.6230 ms versus 0.5 ms) remains unresolved and
would block Game checks once that game snapshot is published. No threshold was
relaxed; workflow-only scaffold checks do not accept gameplay. The dedicated
CPU-only worker cannot qualify full CT/T rounds or 60 FPS.

A repository-scoped automation token starts ordinary update/main push workflows.
Verify the actual runs; a configuration entry alone is not proof. No hosting
deployment is defined; delivery here is a confirmed protected merge to main.

## Local verification and evidence

The earlier helper/policy definition passed 13 fixture groups and both workflows passed
`actionlint`; its authored changes passed `git diff --check`. No game source,
asset, package, lockfile, performance threshold or hosting identity changes.
The prior 675 regression passes/build pass and failing performance run remain
retained evidence, not newly rerun game acceptance for this workflow definition.

Current coordinator results are recorded in `outputs/merge-coordinator-2026-09-16/`.

`outputs/pipeline-definition-2026-09-16/` holds the fresh GitHub readiness read,
validation logs, source-equivalence checks and exact-SHA independent review.
`outputs/checkout-retirement-2026-09-16/` holds the original-directory preservation
and worktree-repair records. These ignored artifacts remain local.

Sources checked 2026-09-16:
[Codex GitHub Action](https://learn.chatgpt.com/docs/github-action),
[GitHub native auto-merge](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request),
[effective branch-rules API](https://docs.github.com/en/rest/repos/rules#get-rules-for-a-branch),
[GitHub CLI merge options](https://cli.github.com/manual/gh_pr_merge), and
[workflow trigger behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
