# Counter-Strike checkout reconciliation

Current paths: the separate top-level `counter-strike` directory was retired
after this consolidation. All its contents remain under ignored
`.local-archive/counter-strike/` in this checkout. See [CHECKOUT.md](CHECKOUT.md).

Reconciled locally on 2026-09-16 (America/Chicago). `counter-strike` retains the
original development history, dirty working files, worktrees and ignored evidence.
`counter-strike-facsimile` combines the selected game snapshot with its existing
delivery scaffold. These were complementary repositories, not competing games.

## Selected content

The game source is immutable revision
`94b2f4ef79c9c97c4d17eca04427a0b7947e8108` (`integration/jkh-144-glock`). It
contains the locally accepted maintenance, shared-runtime, sampling, movement and
Glock integration. Historical issue acceptance is bounded; it is not complete
CS 1.6 product acceptance or permission to publish raw asset sources.

The destination base is `b15c1a9f329edd000fe7cec7f3fc5ed220f19ec4`. Of 380
source paths, 375 remain byte-identical. Four overlaps—`.gitignore`, `AGENTS.md`,
`CLAUDE.md`, and `README.md`—are reconciled. The fifth intentional difference adds
a current-authority preamble to `CODEX_PLAN_LINEAR_EXECUTION.md`, preserving its
historical body. Destination `.github/`, `.linear/` and `AGENT_WORKFLOW.md` stay
byte-identical to the base. `.openai/hosting.json` is preserved from the game
snapshot, with its existing Sites identity.

The import is a local snapshot commit; it does not transplant original Git
history, branch refs, worktrees or remotes. Original ignored evidence stays in
place. Local editable assets are retained under their existing publication
restrictions. No source or asset publication is part of this consolidation.

See [the consolidation record](docs/integration/LOCAL-CONSOLIDATION.md),
[the source manifest](docs/integration/LOCAL-CONSOLIDATION-MANIFEST.json), and
[the branch handoff](docs/integration/BRANCH-HANDOFF.md). JKH-131 `c2b4bd5`,
JKH-140 `8cac6b1` and JKH-149 `63a6eeb` remain separate unfinished candidates.
Git ancestry is not the acceptance criterion for including their work.

## Authority and retained evidence

- Product scope and acceptance: [factory method](FACTORY_METHOD.md) and
  [CS 1.6 plan](CODEX_PLAN_CS16_FACSIMILE.md).
- Current coordination: the original checkout's
  [execution handoff](.local-archive/counter-strike/CODEX_PLAN_LINEAR_EXECUTION.md) and
  [live Linear project](https://linear.app/jkhl1103-personal/project/counter-strike-16-7c7dc1369cb9).
  The 553-line handoff is an uncommitted working file, not part of `94b2f4e`;
  its dated hash and retained copy are recorded in the consolidation record.
- Historical JKH-144 scope: [root acceptance](.local-archive/counter-strike/outputs/linear-execution-2026-09-16/jkh-144-root-acceptance.md)
  and [independent review](.local-archive/counter-strike/.worktrees/jkh-144-glock/outputs/jkh-144-review/REVIEW.md).
  JKH-144 remains In Review at the recorded live check.
- Delivery: [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md),
  [.linear/project.json](.linear/project.json), PR template and existing CI.
- Publication: the [Glock card](.local-archive/counter-strike/.worktrees/jkh-144-glock/docs/integration/JKH-144.md)
  records that public redistribution of editable source/raw clips is not
  authorized. Public bootstrap and initial-content selection remain unresolved.

Archive links resolve locally inside the retained checkout. The archive is
ignored and never published; these are not portable GitHub evidence links.

## Validation and limitations

On the dedicated Linux testing worker, the frozen game/configuration/asset bytes
and retained CI policy passed dependency installation, repository fixtures,
repository policy, lint, type checking and all 675 regression tests. The isolated
8-bot presentation performance test failed: p95 **1.6230 ms**, limit **0.5 ms**.
Consequently `npm test` failed overall. No threshold or game code was changed.
The cause of the performance failure has not been established.

The production build passed after the validation archive was given its own
private Git snapshot metadata. The first build's missing-Git failure is retained.
The validation snapshot SHA is distinct from the upstream game SHA; changed
routing documentation is checked separately. This is not a claim that a final
GitHub PR head passed CI. Logs, environment details, source hashes, preservation
checks and independent review are retained under
`.local-archive/counter-strike/outputs/local-consolidation-2026-09-16/`.

No fresh browser smoke, full CT/T rounds, FPS acceptance, visual acceptance,
remote enforcement, PR, main merge, deployment or Linear closure occurred.
The CPU-only worker is not qualified for full-round/60-FPS acceptance. The
performance failure and existing runtime/visual gates remain open.

## Historical inventory

The earlier documentation-only comparison is preserved at destination commit
`b15c1a9`, with ignored evidence in `outputs/reconciliation-2026-09-16/` in this
checkout. Its saved original root was `feature/classic-hands-round-2`/`cf2a282`,
191 tracked paths and 3,993 untracked files, with 19 additional worktrees.
Before this consolidation the user switched the original root to `main` at
`0e99b59`; the new preservation inventory records that state and 3,992 untracked
files. The original README edit and all inherited work are preserved.

The earlier legacy-remote 404 was account-specific: a subsequent authenticated
read using the repository owner's account found the private legacy repository
and its `main` branch. The public destination was still empty at the subsequent
2026-09-16 audit. Neither observation changes publication authorization.

Automatic-merge pipeline work was excluded from the consolidation commit.
Joseph subsequently authorized its definition; see [AUTO_MERGE_SETUP.md](AUTO_MERGE_SETUP.md)
for current status and remaining activation prerequisites.
