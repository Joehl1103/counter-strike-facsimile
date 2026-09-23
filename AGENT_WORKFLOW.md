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
