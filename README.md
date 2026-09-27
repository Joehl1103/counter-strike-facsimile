# Dustline Tactical FPS

Dustline is a local browser-based tactical first-person shooter and documented
Counter-Strike 1.6 approximation, built around a recreated Dust II map and a
5v5 match. Local `main` is the consolidated development baseline: the preserved
`94b2f4ef79c9c97c4d17eca04427a0b7947e8108` game snapshot plus recovery fixes
from `bf80f8f` and the current delivery and agent guidance. This is the one active checkout. The former top-level `counter-strike`
directory is retained under ignored `.local-archive/counter-strike/`, including
its separate Git history, unfinished branches, dirty work and evidence.
See [CHECKOUT.md](CHECKOUT.md) for current paths and preservation details.

See [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) and [MERGE_COORDINATOR.md](MERGE_COORDINATOR.md).
The coordinator updates clean stale PR branches, requires current CI and
independent review, merges validated PRs, and tags @Joehl1103 for unresolved work.
The independent reviewer uses a trusted local relay so valid Ollama Cloud keys
can authenticate without becoming visible to PR code or the Codex subprocess.

Overlapping firearm pickups select the nearest in-range weapon whose inventory
slot is empty; the HUD prompt and pickup action use that same selection. Visual
capture records hashes of assets actually served during capture and retains
failed startup attempts with their stage and original errors. See the
[visual tools guide](visual-tools/README.md) for the evidence fields.

## Project tracking

- [Linear project and issue backlog](https://linear.app/jkhl1103-personal/project/counter-strike-16-7c7dc1369cb9)
- [Product plan and epic breakdown](https://linear.app/jkhl1103-personal/document/counter-strike-16-product-plan-and-epic-breakdown-d0e2622183ec)
- [Agent execution method and task template](https://linear.app/jkhl1103-personal/document/counter-strike-execution-method-and-task-template-3805da2924b6)

Linear holds the current backlog and status. Agent collaboration is the execution method for delivering the game.

## Repository status

The imported snapshot is locally accepted only for its recorded issue scopes;
it is not complete-product acceptance. [LOCAL-CONSOLIDATION.md](docs/integration/LOCAL-CONSOLIDATION.md)
records the exact import boundary, preserved source references, validation status,
and remaining delivery gates. [BRANCH-HANDOFF.md](docs/integration/BRANCH-HANDOFF.md)
maps every unmerged original branch and its disposition.

This repository's game source arrives through the JKH-119 curated snapshot PR:
fresh commits containing selected content from private baseline `250871b`,
without its commit history. Raw authoring packs (`assets/source/`), the ignored
archive, `outputs/` evidence, historical pilot/comparison assets and session
notes stay outside GitHub; authoring scripts that reference them are retained
for provenance but are not needed by runtime, tests or the build.
Asset redistribution terms recorded in the adjacent `SOURCE.md` notes remain
open for some runtime assets. See [AUTO_MERGE_SETUP.md](AUTO_MERGE_SETUP.md)
for delivery-workflow status.

The recorded baseline checks cover recovery commit `bf80f8f`: 693 regression
tests, lint, type checking, repository checks and production build passed on the
existing private Linux worker. Bounded gameplay smoke passed with two unresolved
console 404 diagnostics. The separate performance test failed at p95 1.4530 ms
against the unchanged 0.5 ms limit, so `npm test` failed overall. This consolidated
baseline preserves those tested game/configuration/asset bytes; documentation and
Git consolidation do not establish a fresh runtime or full-product acceptance.
See [the baseline record](docs/integration/MAIN-BASELINE.md) and
[CHECKOUT.md](CHECKOUT.md) for source identity, evidence and worker instructions.

## Authorized validation

Current execution restrictions keep browser simulations, builds, load tests, and
Blender captures off the local Mac. Package the exact candidate and run validation
on the authorized `counter-strike-testing` worker under the retained source
runbook. Use `npm ci` for a frozen dependency install, then run `npm test`,
`npm run typecheck`, `npm run lint`, and `npm run build` there. Retain source
identity, screenshots, logs, request failures, and failed outputs; a dispatch or
successful package install does not establish a pass.

The current movement benchmark uses the production skinned-character path and
world-firearm factory, with a matched legacy sequence for paired measurements.
See [the JKH-160 workload and limits](docs/integration/JKH-160-PERFORMANCE.md).
The [JKH-131 runtime verifier](docs/integration/JKH-131-RUNTIME.md) checks direct
unarmored damage numerically and rejects unsupported armor or wall-damage
verdicts; a bounded passing case does not establish the complete firearm matrix.

## Linear connection

The GitHub repository is linked to the Jkhl1103-Personal team (JKH) in Linear. GitHub-created issues flow into Linear; existing Linear issues are not automatically copied to GitHub.

For authorized future branches and pull requests, include the relevant issue identifier (for example, JKH-126) and link the Linear issue. Record verification evidence in the issue before declaring the work complete.

## Agent workflow

Read [AGENTS.md](AGENTS.md) and [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md).
Implementation requires a linked PR, CI checks and an independent Codex review
of the final candidate. The workflow guide records the remaining GitHub
publication, credential, enforcement, and authorized-merge setup.
