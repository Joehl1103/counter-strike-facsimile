# Counter-Strike delivery workflow

[Factory Control for Mac](factory-control/README.md) adds a native menu-bar utility
for independent project factories. Add folders and work instructions, then toggle
projects On or Off. It starts Off and lets existing workers finish after Off.

This initial repository contains the PR validation and merge workflow only.
Game code, raw assets, original history and local archives are not included.
Game checks explicitly report scaffold mode until an authorized game import.

See [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) and [MERGE_COORDINATOR.md](MERGE_COORDINATOR.md).
The coordinator updates clean stale PR branches, requires current CI and
independent review, merges validated PRs, and tags @Joehl1103 for unresolved work.
The independent reviewer uses a trusted local relay so valid Ollama Cloud keys
can authenticate without becoming visible to PR code or the Codex subprocess.

Reviewers receive exact PR diffs in bounded chunks plus nested text context from
the entire HEAD tree.
Defaults allow 100,000 diff characters per chunk and up to 60 chunks.
A trusted aggregate gate requires every chunk report to pass for the same head
and base, with report envelopes bound to the run attempt and plan digest. Use
**Re-run all jobs**; missing current-attempt reports fail closed. All text, lockfiles and deletion diffs count toward the review budget.
Asset binary skips require a matching signature, HEAD mode `100644`, and an
allowlisted path outside `.github/`, plus code-payload heuristics. Prompts list
asset hashes and require findings for code that could execute skipped assets.
Asset-only changes require human review and receive a failing status. Context copies are capped at 2 MiB per file
and 100 MiB total; symlinks/submodules are listed, never followed. The allowlist
and overflow policy are in MERGE_COORDINATOR.md.
