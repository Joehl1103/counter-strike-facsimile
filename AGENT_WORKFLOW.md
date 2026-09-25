# Issue delivery

Use an authorized JKH issue branch. Include its JKH identifier in the PR title,
matching Linear issue URL and approved Acceptance Criteria checklist in the body.
Keep incomplete work in draft. Do not invent acceptance evidence or close Linear
issues automatically. Obtain approval before creating a PR or changing its criteria.

Repository checks, Game checks and Independent Codex review are required.
Independent review must cover the exact candidate and current main. The trusted
coordinator updates clean stale branches and merges validated PRs under strict
main rules. Conflicts and unresolved failures mention @Joehl1103; pushing a repair
starts fresh validation. No force push, administrator bypass or automatic hosting
deployment is allowed. See [MERGE_COORDINATOR.md](MERGE_COORDINATOR.md).

Secrets belong only in environments restricted to main. Candidate code never
runs with merge credentials. Workflow-only scaffold checks are not game acceptance.
After installing Codex, the review job starts a root-owned local relay from
trusted main files. That relay sends the unchanged Ollama environment secret
only to Ollama's Responses endpoint. The Codex Action's proxy receives a local
placeholder key, then drops sudo before inspecting the PR. The relay and
reviewer never execute candidate code.

Review input is a trusted packet generated from exact `BASE...HEAD` git objects,
with the assigned diff embedded in the prompt and HEAD context nested under
`.codex-review-input/head/`. Chunk reviewers return separate reports; the base
aggregate gate requires every planned chunk to pass. Locks use dependency or
line-count summaries; binary/assets, generated files and large deletions are
listed exclusions. Only binary/asset-only PRs can pass without a model review.
Overflow fails closed. The status remains `Independent Codex review` with
`Reviewed <head> against <base>`. Default 60k-character chunks, cap 40, four in
parallel: estimate 3–8 runner minutes per chunk, up to 20 at timeout. See the
Review provider section in MERGE_COORDINATOR.md for limits and exclusions.
Reviewer workflow/script changes activate only after reaching main because
`pull_request_target` uses the base workflow.
