# Automated PR reconciliation

The coordinator updates clean stale PR branches, waits for current checks and
independent review, and squash-merges validated candidates one at a time.
Every Acceptance Criteria entry must be checked before the coordinator acts;
unchecked criteria produce a human notice. A blocked PR does not stop later ready PRs. A new commit or changed main requires
fresh evidence. Published branches are updated by merging main, never force-pushed.

## What uses a model

| Situation | Action |
| --- | --- |
| Draft | Wait until its owner marks it ready. |
| Clean branch behind main | GitHub update-branch with the expected head SHA. |
| CI/review running | Wait; no Jev call. |
| All required evidence passes on current head/base | Validated squash merge; no Jev call. |
| Cancelled/timed-out CI | Jev may select one retry per head/base/run; new checks still must pass. |
| Conflicts, code/test/performance failure, review findings, uncertainty | Mention @Joehl1103 with the candidate and reason. |

Jev classifies a small record of check conclusions and conflict state. It receives
no source, raw logs, PR prose, private assets or credentials. Its current model
alias is `jev-latest`; a local live connectivity probe returned `jev-1.13.0`.
The API returns typed choices, not code, so this implementation does not attempt
model-generated conflict patches. The human handoff identifies cases requiring
repair or a decision; an implementation agent can resolve them and push a new
candidate, after which normal automatic processing resumes.

A retry needs both probability >= 0.95 and confidence >= 0.8, plus deterministic
proof that the failed job was cancelled/timed out. These are conservative initial
routing thresholds, not an empirical accuracy claim. Jev cannot approve a merge,
mark a failed check passed, change acceptance criteria, or bypass review.
Invalid/unavailable provider output goes to the human path. At most three API
attempts are made for a classification, with bounded backoff for 429/529.

## GitHub operation and credentials

[merge-coordinator.yml](.github/workflows/merge-coordinator.yml) wakes after CI or
review completes, after a main push, on manual dispatch and every five minutes.
GitHub schedules can be delayed. One concurrency group serializes decisions;
periodic reconciliation recovers dropped/coalesced events. A tick changes at most
one branch or main; blocked PR notifications are deduplicated using comments from
the configured automation identity. A retry attempt is recorded before dispatch,
so an interrupted tick cannot retry forever.

The workflow always checks out trusted main with credentials disabled. It does
not consume workflow-run artifacts or execute PR files. Its write credential is
an environment-only fine-grained token scoped to this repository, with Contents,
Pull requests and Actions read/write. Set `MERGE_BOT_TOKEN` and the matching
`MERGE_BOT_LOGIN` environment variable in the `merge-coordinator` environment.
Restrict that environment to branch `main` only; store `TYPESAFE_API` there too.
An installation token can also satisfy this adapter, provided its issuing process
refreshes it and `MERGE_BOT_LOGIN` matches the app's bot account.

Do not use the workflow's GITHUB_TOKEN for branch updates: generated events do not
provide unattended propagation into all required workflows. Do not store a broad
personal CLI token just to avoid provisioning the repository-scoped credential.
The separate `codex-review` environment needs its own `OLLAMA_CLOUD_API`; TypeSafe
is not a replacement for independent code review.

The coordinator resolves effective main rules before every mutation and verifies
all three checks. Nonempty rules use strict `github_rules` validation. A 403 with
the exact GitHub plan-upgrade message, or empty rules with a confirmed private
repository, selects `self_enforced`; other errors or malformed rules fail closed.
Each tick reports `rulesMode` and logs `Rules mode: github_rules` or
`Rules mode: self_enforced` with an explanation of coordinator enforcement.

CI checks must come from GitHub Actions' CI PR workflow for the current head; test-merge
checks supersede head checks. The Codex status includes both immutable head and
base. Review threads and changes-requested decisions must be resolved. Before
merging, a fresh snapshot must still show a ready, non-draft PR, all three checks
passing, exact passing review, and PR base equal to live main with no commits
behind. In `github_rules` mode, GitHub's strict native rules remain the last
enforcement point.

In `self_enforced` mode, the coordinator's checks are the only enforcement.
The merge helper rechecks rules (validating strictly if available), verifies live
main still equals the reviewed base as its last lookup immediately before direct
`gh pr merge --squash --match-head-commit` with the expected head, never `--auto`.
It requires a completed merge, unchanged head, and a single-parent squash commit
whose parent equals the reviewed base. It never uses an administrator bypass.

Private Free repositories do not block direct pushes, force pushes, deletion of
main, or human merges that skip checks. Environment deployment-branch restrictions
may also be unenforced on this plan. A concurrent main change between the final
lookup and merge cannot be blocked by this fallback. Exploiting that residual
window requires someone who can already push directly to main, which this plan
does not block. Parent verification detects it and escalates with a
`merged_against_unreviewed_base` notice mentioning @Joehl1103 on the closed PR.
The tick stops with `merged_unverified_base` and the merge commit; if rules
validation or comment delivery refuses the notice, `noticeOutcome: blocked`
retains that failure in the result. Inspect the merge commit and rerun CI there.
Upgrading to Pro or making the repository public restores native
rules and strict `github_rules` mode automatically when effective rules return;
missing or weakened rules still refuse.

## Human handoff and recovery

Comments mention @Joehl1103 only for an actionable hold, with exact candidate
identity and a fixed reason. Provider output and arbitrary PR text are not copied
into comments. Repeated ticks do not repeat the same notification. Repair the
branch or configuration and push the change; a changed candidate is reconsidered.
A current branch whose PR base metadata still names an older main commit is held
with one `stale_base_metadata` notice for human inspection; the coordinator does
not merge it against the mismatched base.
A spent retry requires inspection rather than repeatedly pressing rerun.

This is a trusted-collaborator repository model. A writer can change workflow
files or fabricate same-named Actions statuses; app IDs and names do not replace
control over who may write repository code. Fork PRs require maintainer handling.
No issue is automatically closed and no hosting deployment is included.

## Activation and verification

This bootstrap excludes game code, raw assets, private history and local archives.
When the repository plan supports rules, apply
[.github/main-ruleset.json](.github/main-ruleset.json) after initial main is
created. Permit squash merges only, prevent main deletion/force pushes, require
PRs and all three checks without bypass actors. Enable repository auto-merge;
keep automatic branch deletion disabled. Initial publication and end-to-end
verification must be recorded separately from local fixture results.

Configure the two main-only environments and their credentials. Verify with
approved linked PRs: clean stale update starts fresh CI/review; failed/missing
checks hold; a rebased SHA invalidates prior review; conflict/repeated failure
produces one mention; a blocked PR does not starve a ready one; a fully validated
PR merges to the observed main SHA. Retain actual run/PR URLs. Until those live
checks pass, end-to-end automation remains unverified.

Sources: [TypeSafe API](https://docs.typesafe.ai/api),
[confidence semantics](https://docs.typesafe.ai/confidence),
[GitHub branch update API](https://docs.github.com/en/rest/pulls/pulls#update-a-pull-request-branch),
[workflow event propagation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

## Review provider

The pinned Codex Action runs independent read-only chunk sessions using Ollama
Cloud's `gpt-oss:120b` through `https://ollama.com/v1/responses`. Its input is
named `openai-api-key` by the Action. The trusted relay holds `OLLAMA_CLOUD_API`
from the main-only `codex-review` environment; the Action's proxy receives only
a local placeholder. It does not use desktop authentication
or download a model on the runner.

The `pull_request_target` workflow checks out the event's immutable base SHA in
the planning, reviewer and gate jobs. Workflow, planner, prompt template, proxy/relay and validator come from
that trusted checkout. **Reviewer workflow/script changes take effect only after
they reach main**; the PR proposing them is still reviewed by the old workflow.
Forks are refused. Candidate code is never checked out at the workspace root,
executed or installed in a key-bearing job. Drop-sudo, the read-only permission
profile and disabled web search remain in force.

[review-plan.mjs](.github/scripts/review-plan.mjs) reads git objects, starting with
`git diff --numstat -z --find-renames BASE...HEAD`. It embeds the exact
`git diff --no-color --find-renames BASE...HEAD` text for each assigned file/part
in a generated `prompt-file`, inside explicit untrusted-data delimiters. Full
copies of changed reviewable HEAD text files (up to 2 MiB each) go only under
`.codex-review-input/head/`. HEAD `AGENTS.md`, `.codex/` and symlink blobs are
inert data there; symlinks are written as ordinary files. Missing large context
copies are listed, while their complete diff still gets chunked. Other changed
files' copies are available for cross-file context, but each reviewer reports
only on its assigned chunk. Unchanged callers are not copied; insufficient
context must be reported as a limitation or an incomplete review.

Planning orders workflow/CI changes, source, tests, scripts/config, docs/data,
then full-text lockfiles without structured summarizers.
Chunks default to **100,000 diff characters**, with a **60-chunk cap** and up to
**four concurrent reviewers**. Large file diffs split at hunk boundaries, then
line ranges for oversized hunks (character fragments for an oversized single
line); labels identify file, part and HEAD lines. Split parts concatenate to the
original diff. `REVIEW_CHUNK_BUDGET` and `REVIEW_MAX_CHUNKS` can tune these limits;
set them identically in all jobs if configuring the workflow. A digest mismatch
fails closed. The manifest records base/head, files/parts, skipped files, lock
summaries, context availability, uncovered parts and a SHA-256 digest. Every
matrix leg and the gate regenerate that same manifest from git objects. Overflow
skips model calls and produces `complete:false`, listing uncovered parts; it never
silently drops code or publishes a passing status.

For `package-lock.json` and `npm-shrinkwrap.json`, the trusted planner compares
base and HEAD `packages` maps and reviews structured summaries instead of raw
lockfiles. Added/removed/changed entries include package paths, versions, resolved
hosts, before/after integrity values, an `integrityChanged` flag and changed field
names. Any resolved URL whose host is not exactly `registry.npmjs.org` is included
in full and explicitly flagged `NON_REGISTRY_RESOLVED`, even when that package's
entry is otherwise unchanged. Invalid JSON or a missing supported `packages` map
fails planning. These summaries do not substitute for a dependency audit.
`yarn.lock`, `pnpm-lock.yaml` and other unsummarized lockfiles receive full-diff
review at lowest priority and size-capped HEAD copies, just like other text.
There are no line-count-only lock summaries.

Only files reported as binary by Git's numstat can be skipped, and only when
their extension appears in this explicit asset allowlist:

- Images: `png`, `jpg`, `jpeg`, `gif`, `webp`, `ico`, `bmp`, `avif`.
- Audio: `mp3`, `wav`, `ogg`, `flac`, `m4a`; video: `mp4`, `webm`, `mov`.
- Fonts: `woff`, `woff2`, `ttf`, `otf`, `eot`.
- Models/textures: `glb`, `gltf-bin`, `fbx`, `obj`, `blend`, `dae`, `ktx2`, `hdr`, `exr`.

Files under `.github/` are never eligible for this skip. Both old and new paths
must qualify for a binary rename. `.bin` is not allowed, even under `assets/`;
neither archives nor SVG qualify. An allowlisted filename that Git reports as
text is reviewed normally. Every other binary-detected file is listed in
`uncovered` with reason `unreviewable_binary`, sets `overflow: true`, skips the
model matrix and fails the gate/status. This also prevents a NUL byte in code
from turning a source-only PR into a passing zero-chunk review.

All text changes count toward the chunk budget/cap, including `dist/`, `build/`,
`coverage/`, `*.min.js`, `*.map`, and deletion diffs of any size. Large deletions
split normally; nothing is omitted because it exceeds 200 lines. There is no
generated-file exclusion. A zero-chunk PR may pass only when **every changed file
is an allowlisted binary asset**, with an explicit summary naming those skipped
files. Empty PRs cannot pass. This status is not asset/provenance or game
acceptance.

Cloud does not support structured-output requests. Each reviewer returns JSON
with exact head, base and chunk ID, completeness, verdict, summary, findings and
limitations. Reports use seven-day `codex-review-<chunk id>` artifacts. Rerunning
a reviewer leg overwrites its previous artifact; the gate still rejects duplicate
or extra chunk IDs. Downloads use `merge-multiple: true`, so both single-artifact
and multi-artifact runs produce a flat directory of `chunk-NNN.json` reports.
The reader rejects directories, symlinks and every other filename; the filename
ID must equal the report's `chunk_id`, and the set must equal the plan exactly.
[review-gate.mjs](.github/scripts/review-gate.mjs), on a fresh runner without model
secrets, requires a successful plan and reviewer matrix, no overflow, exactly one
report per planned chunk and no extra IDs. Each report must pass the existing
base `validateReview` plus chunk identity: complete, pass, no findings, summary
and limitations. Missing, duplicated, malformed, adverse or stale reports fail.
The reports and skipped/uncovered lists are HTML-escaped in the run summary.

The gate retains the unchanged-head/base recheck and publishes the same single
commit status: context `Independent Codex review`, success description exactly
`Reviewed <head> against <base>`. The coordinator depends on this format.

Sizing supplied for PR #9: 302 files and 3.6 MB of non-lock diff exceeded the old
60,000-character/40-chunk limits, leaving 117 files uncovered. The revised limits
previously estimated about 37 chunks. Recalculate with the stricter coverage
policy: build outputs, large deletions and full unsummarized locks now count.
A 100,000-character diff is roughly 25,000 tokens,
leaving room for instructions and context within the supplied 128k-token
`gpt-oss:120b` context capacity; actual token use varies with content.

Runner-minute planning estimate: **chunks × roughly 3 minutes**. The earlier
37-chunk estimate for PR #9 corresponds to about **110 minutes**, plus
planning/gate overhead, against the private Free
repository's supplied **2,000-minute monthly quota**. At the 60-chunk cap, estimate
180 reviewer minutes. Four-way parallelism reduces elapsed time, not total
minutes. The unchanged 20-minute reviewer timeout permits up to 1,200 reviewer
minutes at the cap, before overhead; retries consume more. These are sizing and
cost estimates, not measured end-to-end provider timings. Overflow still skips
the reviewer matrix and publishes failure, with uncovered files in the step
summary. Provider latency, review quality and live Actions execution remain
unverified by offline tests. This remains a Codex CLI review; TypeSafe Jev only
classifies retry/human-handoff cases.

Provider contract checked 2026-09-17: [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility),
[Codex integration](https://docs.ollama.com/integrations/codex), and
[structured outputs](https://docs.ollama.com/capabilities/structured-outputs).
