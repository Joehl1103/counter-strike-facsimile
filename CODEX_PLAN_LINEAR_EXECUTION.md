# Counter-Strike Linear execution routing — 2026-09-16

## Current authority

This imported 77-line handoff is historical and must not supersede the original
checkout's newer 553-line uncommitted working-file record, captured on
2026-09-16 (America/Chicago), SHA-256
`00e940457a63abd44cfeda20260d173896549f397782aa73fe8d06da4866a650`:
`/Users/josephshomefolder/development/games/counter-strike-facsimile/.local-archive/counter-strike/CODEX_PLAN_LINEAR_EXECUTION.md`.
It is not contained in the imported source commit. A dated copy is retained in
the original checkout at `outputs/local-consolidation-2026-09-16/current-source-execution-handoff.md`.
Read the current original record and live Linear before dispatching work. Its paths/evidence are
retained-source references, not a claim that they are copied into this snapshot.

The imported baseline is JKH-144 `94b2f4e`, locally accepted only for its
recorded scope and still In Review. JKH-131 `c2b4bd5` (hit-group/multi-wall/action
coverage), JKH-140 `8cac6b1` (mixed-support 100 Hz geometry coverage), and
JKH-149 `63a6eeb` (export/renderer pilot) remain unfinished in the original
checkout and are excluded. The dedicated `counter-strike-testing` worker supports
static/unit/build/basic-smoke work only; it cannot qualify full CT/T or 60 FPS.
Pipeline definition was subsequently authorized; activation remains pending in
[AUTO_MERGE_SETUP.md](AUTO_MERGE_SETUP.md). See
[docs/integration/BRANCH-HANDOFF.md](docs/integration/BRANCH-HANDOFF.md).

## Historical imported handoff

# Counter-Strike Linear execution

Started 2026-09-16 after Joseph said “Start work”. Scope and quality gates remain
in CODEX_PLAN_LINEAR_PRODUCT.md, CODEX_PLAN_CS16_FACSIMILE.md and FACTORY_METHOD.md.
Independent workers use separate issue worktrees, with root coordinating Linear,
source acquisition requiring account access, review and common integration.

## Current assignments

Latest verified handoff: JKH-126 local candidate `9fe8dd5` passed independent
review after corrections. Its preservation/closure criteria are accepted for
offline dependent work; Linear remains In Review under the newly added project
PR/CI/closure workflow. JKH-127 is awaiting independent local review in
`.worktrees/jkh-127-maintenance`, branch `chore/jkh-127-maintenance`, worker
`/root/jkh127_maintenance`, base `98b50c96`. Its isolated dependency installation
matches the base lockfile. Frozen candidate `91b307b` passed the validator CLI
regression (2 tests), affected model tests (25), lint, typecheck and build.
Fresh reviewer `/root/jkh127_review` passed its exact maintenance diff with no
unresolved code findings and reran the 27 focused tests and typecheck. Its
historical Buzz documentation is reconciled by the common-baseline follow-up.

JKH-128 is now In Progress from locally accepted `91b307b`, branch
`integration/jkh-128-common-baseline` in `.worktrees/jkh-128-common-baseline`,
worker `/root/jkh128_baseline`, preview port 3032. It reuses and verifies existing
shared source rather than rebuilding the same code. Existing map/gameplay remain
inherited behavior; later Glock/character/sampling deltas remain separate.
The issue owns closure records, current workflow metadata and demonstrated
shared-prerequisite fixes only, with frozen M4 and actual renderer/runtime checks.

JKH-139 received the 42-frame Walking animation after Joseph restored Mixamo
sign-in. The animation-only export lacks canonical bind data; its inferred rest
mismatch is not proof of a different character. The preserved invalid units
measurement and failed direct-attachment result remain historical evidence.
The same selection's With Skin export, SHA-256
`2ff0922fd9bbbe1018a965b122357813ba944506ae6ebfcf13fa027d4b7d3521`,
matches native neutral/hold mesh positions, topology, weights and 65-bone hierarchy
exactly. World-rest translation/scale deltas are zero; rotation is within the
unchanged numerical threshold. Root canceled the character-replacement dialog;
replacement is unnecessary and the pending replacement question is obsolete.
Source report candidate `d0db50f` records this identity pass and a valid complete
42-frame fixed-mount inspection. The fixture now refreshes animated bounds and
resets action state before each seek; failed/invalid earlier runs are retained.
The known-hold control passes. Walking right-hand contact passes, but left
support normals and distal glove contact fail (maximum 3.9301 cm against 3 cm).
The complete source assembly is improved-but-failing with no rig/mount/threshold
change. Fresh reviewer `/root/jkh139_review` is checking the evidence before root
selects the next bounded source/adapter route. JKH-140 is not started.

Local preservation: `snapshot/jkh-126-local-source` at `00539d3`; the original
source/index were unchanged by capture. Raw bytes, including four text files
Git normalizes, are preserved and independently verified in
`outputs/linear-execution-2026-09-16/source-snapshot-original-bytes.tar.gz`.
Later workflow setup changed original AGENTS.md/README.md and added CLAUDE.md; these are
preserved separate metadata updates, not part of the historical source freeze.

| Issue / epic | Worker | Worktree / branch | Initial scope |
| --- | --- | --- | --- |
| JKH-126 / JKH-119 | /root/jkh126_baseline (Terra) | .worktrees/jkh-126-baseline / docs/jkh-126-baseline | Preserve and inventory source, assets, M4 evidence and integration prerequisites |
| JKH-127 / JKH-119 | /root/jkh127_maintenance (Terra); /root/jkh127_review (fresh Terra verifier) | .worktrees/jkh-127-maintenance / chore/jkh-127-maintenance | Isolate historical maintenance and verify exact candidate |
| JKH-139 / JKH-122 | /root/jkh139_source (Terra) | .worktrees/jkh-139-walking-source / feature/jkh-139-walking-source | Locate and qualify complete native walking source; root handles service access |

Reserve available capacity for independent review and ready dependent work.
Follow accepted JKH-126 with maintenance JKH-127, then common baseline JKH-128.
Follow qualified JKH-139 with locomotion JKH-140. Do not claim dependencies
complete from dispatch or historical isolated passes.

Before editing, workers record acceptance cards and owned paths. They return
exact commits, checks, artifacts, blockers and next action. Root independently
inspects evidence and updates Linear; reviews can reject or require revision.
Serialize shared-code integration and rerun affected checks. Final integrated
visual acceptance remains a separate Joseph gate.

The original dirty checkout remains preserved. Origin/main was freshly fetched
at 0e99b59fbbb358b94f11fe64fff8673094775519 before worktree creation. Work begins
locally in the existing private history; publishing to the new public repository
still requires the outstanding initial-content decision. No automatic scheduler,
push, deployment or default-branch merge is part of this launch.
