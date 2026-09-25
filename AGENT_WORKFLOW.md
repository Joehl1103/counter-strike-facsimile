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
