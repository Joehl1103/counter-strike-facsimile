# Counter-Strike delivery workflow

This initial repository contains the PR validation and merge workflow only.
Game code, raw assets, original history and local archives are not included.
Game checks explicitly report scaffold mode until an authorized game import.

See [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) and [MERGE_COORDINATOR.md](MERGE_COORDINATOR.md).
The coordinator updates clean stale PR branches, requires current CI and
independent review, merges validated PRs, and tags @Joehl1103 for unresolved work.
The independent reviewer uses a trusted local relay so valid Ollama Cloud keys
can authenticate without becoming visible to PR code or the Codex subprocess.
