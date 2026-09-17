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
| All required evidence passes on current head/base | Protected squash merge; no Jev call. |
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

The coordinator verifies effective main rules and all three checks. CI checks
must come from GitHub Actions' CI PR workflow for the current head; test-merge
checks supersede head checks. The Codex status includes both immutable head and
base. Review threads and changes-requested decisions must be resolved. GitHub's
strict native rules remain the last enforcement point. The merge helper uses the
expected head and confirms the actual squash commit parent. It does not queue
an unvalidated merge or use an administrator bypass.

## Human handoff and recovery

Comments mention @Joehl1103 only for an actionable hold, with exact candidate
identity and a fixed reason. Provider output and arbitrary PR text are not copied
into comments. Repeated ticks do not repeat the same notification. Repair the
branch or configuration and push the change; a changed candidate is reconsidered.
A spent retry requires inspection rather than repeatedly pressing rerun.

This is a trusted-collaborator repository model. A writer can change workflow
files or fabricate same-named Actions statuses; app IDs and names do not replace
control over who may write repository code. Fork PRs require maintainer handling.
No issue is automatically closed and no hosting deployment is included.

## Activation and verification

This bootstrap excludes game code, raw assets, private history and local archives.
Apply [.github/main-ruleset.json](.github/main-ruleset.json) after initial main is
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

The pinned Codex Action runs an independent read-only session using Ollama
Cloud's `gpt-oss:120b` through `https://ollama.com/v1/responses`. Its input is
named `openai-api-key` by the Action, but receives `OLLAMA_CLOUD_API` from the
main-only `codex-review` environment. It does not use desktop authentication
or download a model on the runner.

Cloud does not support structured-output requests. The reviewer is prompted
for JSON and the separate trusted-base gate parses and validates it strictly;
malformed, stale, incomplete or adverse reports fail. This is still a Codex
CLI review; TypeSafe Jev only classifies bounded retry/human-handoff cases.

Provider contract checked 2026-09-17: [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility),
[Codex integration](https://docs.ollama.com/integrations/codex), and
[structured outputs](https://docs.ollama.com/capabilities/structured-outputs).
