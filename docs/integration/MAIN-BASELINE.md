# Consolidated local main — 2026-09-18

Joseph requested all five non-main branches consolidated into `main` for one
working baseline. Local `main` is now the active baseline. This is a private
local consolidation, not a public release or complete-product acceptance.

## Included work

| Previous branch | Included revision | Result |
| --- | --- | --- |
| `chore/linear-agent-ci` | `25d323d` | Ancestor of consolidated game history |
| `docs/jkh-126-checkout-reconciliation` | `b15c1a9` | Ancestor of consolidated game history |
| `integration/jkh-119-local-consolidation` | `b606b13` | Game snapshot, delivery scaffold and evidence routing |
| `fix/jkh-163-164-165-recovery` | `bf80f8f`, then `b38930f` | Three recovery fixes and requested agent activity rules |
| `docs/jkh-126-baseline-guide` | `08b6ee9` | Worker instructions and preserved baseline guidance, updated to current main |

Merge `4660d0b` joined the separate public-scaffold and private-game histories.
Its tree exactly matched `b38930f`; the six add/add conflicts were documentation
and ignore files resolved to the richer consolidated versions. Merge `0fddc98`
integrated the remaining baseline guide, reconciling README/CHECKOUT so agents
start from current local main rather than the historical archived snapshot.
No branch history was rewritten.

The retained stash `f3de6ed` contained four documentation changes. Its delta from
its original base was restored without deleting the newer activity rules. The
stash remains intact. These restored records include the previously documented
project PR authorization and actual reviewer-pilot failure; they do not authorize
publication of private game assets/history or waive required delivery gates.

The full pre-operation refs, rule patch, stash patch, plan and final verification
are retained under `outputs/main-consolidation-2026-09-18/`. The separate original
repository and its unfinished candidates remain under `.local-archive/`; they
are not among these five active-repository branches. Their dispositions remain
in [BRANCH-HANDOFF.md](BRANCH-HANDOFF.md). Diagnostic controls and unfinished
asset candidates were not silently promoted into this baseline.

## Validation and remaining gates

Game source, tests, scripts, assets, dependency/configuration files and CI workflows
remain byte-identical to the tested recovery candidate `bf80f8f`. This operation
changes Git ancestry and documentation. Exact content/ancestry checks and a Terra
review are retained in the evidence directory; no local game workload is run.

The existing Linux results for `bf80f8f` are 693 passing regressions, passing
lint/typecheck/build, and a bounded gameplay smoke with two unresolved console
404 diagnostics. The separate performance gate failed at 1.4530 ms p95 against
the unchanged 0.5 ms limit, so `npm test` failed overall. See
`outputs/recovery-2026-09-18/REPORT.md`. These historical source checks are not
a fresh CI run or full-round, hardware-performance or visual acceptance.

Public `origin/main` remains `2d5ff1e26a0922bfc8218899c27fdc4d7e757598`, the
workflow-only scaffold. Local main now contains private source and raw/editable
asset material; do not push it wholesale to the public remote. Publication
review, remote CI/reviewer success, protected delivery and final acceptance
remain separate. No issue is closed by this consolidation.

Next implementation work: diagnose the retained JKH-160 performance failure on
the existing Linux worker, then identify the console 404 resource URLs. JKH-119
reviewer startup remains a separate delivery blocker. Read current Linear
project/issue activity before resuming.
