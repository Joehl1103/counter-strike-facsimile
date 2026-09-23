# Clean stale-branch verification

This harmless fixture starts from the initial workflow-only main. When another
PR advances main, the coordinator must merge that base into this branch and
require fresh CI plus independent review of the new candidate before merging.

No game, runtime, credential or protection configuration is changed.
