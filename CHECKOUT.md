# Active checkout and consolidated baseline

Use **local `main` in this repository** for ongoing development. It contains the
preserved game snapshot plus JKH-163/164/165 recovery fixes and the reconciled
baseline, delivery and agent instructions. See
[MAIN-BASELINE.md](docs/integration/MAIN-BASELINE.md) for the merge record.
Public `origin/main` remains the workflow scaffold; do not push this private game
baseline to that public remote.

## Preserved original baseline

Original game revision `94b2f4ef79c9c97c4d17eca04427a0b7947e8108` remains clean in
`.local-archive/counter-strike/.worktrees/jkh-144-glock/`. It contains the integrated
Glock, approved M4, shared runtime, movement work and character-sampling fix.
It is historical evidence; use local main for current work. Inspect it read-only:

```sh
git -C .local-archive/counter-strike/.worktrees/jkh-144-glock rev-parse HEAD
git -C .local-archive/counter-strike/.worktrees/jkh-144-glock status --short
```

The first command should print the original revision; the second should print
nothing. Other archived worktrees remain unfinished candidates, not alternative
baselines. Preserve them and their evidence.

## Retained checkout and evidence

Use `/Users/josephshomefolder/development/games/counter-strike-facsimile` for
ongoing development. Its `origin` remains
`https://github.com/Joehl1103/counter-strike-facsimile.git`.

The former sibling `/Users/josephshomefolder/development/games/counter-strike`
has been removed from that location. Its entire directory was moved atomically
into ignored `.local-archive/counter-strike/` here. This preserves unique work;
it does not merge unfinished candidates into the accepted game or free their
disk space. Never add or publish the archive.

The retained source Git history, all branch refs, all 20 worktree states
(including the root), index contents, staged/unstaged changes and remotes are
unchanged. The move retained 493,395 file/symlink entries by inode, size, timestamp
and mode, except the required worktree-pointer repairs and 13 internal absolute
symlink repairs. No unique work was deleted. The measured pre-move size was
about 21 GiB.

Current coordination and evidence:

- [Latest original handoff](.local-archive/counter-strike/CODEX_PLAN_LINEAR_EXECUTION.md).
- [Outstanding branch map](docs/integration/BRANCH-HANDOFF.md).
- [Local consolidation evidence](.local-archive/counter-strike/outputs/local-consolidation-2026-09-16/PLAN.md).
- [Dedicated testing-worker runbook](.local-archive/counter-strike/outputs/remote-browser-check-2026-09-16/WORKER_RUNBOOK.md).
- Relocation evidence: `outputs/checkout-retirement-2026-09-16/retirement.json`,
  worktree before/after records, metadata inventory and repair log.

Historical reports retain their recorded old paths. Resolve an old
`.../games/counter-strike/` prefix under `.local-archive/counter-strike/` here;
do not rewrite historical evidence or mistake its old timestamp for a new check.
Reopen existing terminals, editors and agent sessions in the active checkout.
The archive is for retained unfinished work and evidence, not the default workspace.

## Run the game on the existing worker

Browser simulations, builds, load tests and Blender captures stay off the local
Mac. Use the already provisioned private worker. Its connection instructions are
in the local-only file:

```text
.local-archive/counter-strike/outputs/remote-browser-check-2026-09-16/WORKER_RUNBOOK.md
```

The latest tested worker copy is `~/runs/recovery-integration-2026-09-18/source`,
with its identity mapping and logs retained in `outputs/recovery-2026-09-18/`.
Its validation snapshot `8e0d4cd5df975655c327584a20350d97830cc26c` maps to upstream
recovery commit `bf80f8f43cf4d053534a6fa3f442dfc15a354087`. Inspect that mapping
before use; a worker Git revision is not the local main revision.

From that source directory **on the worker**, use Node 22.13+ and npm:

```sh
npm ci --no-audit --no-fund
flock -n "$HOME/.counter-strike-browser-job.lock" npm run dev -- --host 127.0.0.1 --port 3040
```

The development URL is `http://localhost:3040` on the worker. Use the remote
browser procedure in its runbook; keep the server private. Stop the server before
running other jobs. The current worker supports basic smoke checks but its
software renderer cannot establish full-round or 60-FPS acceptance.

The game checks, also run on the worker, are:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Latest retained results: 693 regression tests, lint, type checking and production
build passed. Bounded gameplay smoke passed with two console 404 diagnostics.
The presentation performance test failed at p95 **1.4530 ms** against **0.5 ms**;
`npm test` failed overall. Evidence: `outputs/recovery-2026-09-18/REPORT.md`.
These are checks of the unchanged recovery game source, not a fresh test of this
Git/documentation consolidation or complete-product acceptance.

Historical baseline results (675 regressions; p95 1.6230 ms) remain under
`.local-archive/counter-strike/outputs/local-consolidation-2026-09-16/remote-final/evidence/`.
The earlier baseline guide and source inspection remain at
`outputs/baseline-reset-2026-09-17/BASELINE.md`. Public GitHub scaffold CI has no
game source and is separate from these private game checks.
