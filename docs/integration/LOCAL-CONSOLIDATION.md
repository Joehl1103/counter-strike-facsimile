# Local consolidation record — 2026-09-16

Path update after consolidation: the former source checkout and all its ignored
evidence/worktrees now live under `.local-archive/counter-strike/` at the root
of the kept repository. [CHECKOUT.md](../../CHECKOUT.md) records verified relocation.
Historical SHA-based acceptance below is unchanged.

Historical phase: finish reconciliation before CI/CD automatic-merge setup.
Automatic-merge work was paused and excluded from the snapshot reviewed below.
Joseph subsequently authorized workflow definition; current setup is in
[AUTO_MERGE_SETUP.md](../../AUTO_MERGE_SETUP.md). This candidate is a local,
history-free snapshot consolidation under JKH-119, informed by JKH-126 and the
accepted JKH-144 technical spine.

| Item | Recorded value |
| --- | --- |
| Candidate branch | `integration/jkh-119-local-consolidation` |
| Preparation clone | `/private/tmp/counter-strike-reconciliation-19Nfv9/repo` |
| Delivery checkout | `/Users/josephshomefolder/development/games/counter-strike-facsimile` |
| Destination base | `b15c1a9f329edd000fe7cec7f3fc5ed220f19ec4` |
| Imported source | `integration/jkh-144-glock` at `94b2f4ef79c9c97c4d17eca04427a0b7947e8108` |
| Original root `main` | `0e99b59fbbb358b94f11fe64fff8673094775519` |
| Builder | `/root/consolidation_docs` |
| Reviewer | `/root/consolidation_final_review`; exact-SHA report retained separately |

Of 380 source paths, 375 remain byte-identical. The four overlap files
`.gitignore`, `AGENTS.md`, `CLAUDE.md`, and `README.md` are reconciled, and
`CODEX_PLAN_LINEAR_EXECUTION.md` gains a current-authority preamble while retaining
its historical body. Destination `.github/`, `.linear/`, and `AGENT_WORKFLOW.md`
remain byte-identical to destination base. `.openai/hosting.json` comes unchanged
from source `94b2f4e`; its SHA-256 is
`7ff7370c296e3c365ab89e2ec71bc6e4f2068a7f9b27a91dadac040720474852`.
Source history, original worktrees, branch refs and remotes are not imported.
Existing ignored evidence stays in the original checkout. Raw asset sources in
the selected snapshot remain local; this consolidation does not publish them.

The imported [factory method](../../FACTORY_METHOD.md) and
[facsimile plan](../../CODEX_PLAN_CS16_FACSIMILE.md) govern product scope and
acceptance. The current original handoff is an uncommitted working file at
`/Users/josephshomefolder/development/games/counter-strike-facsimile/.local-archive/counter-strike/CODEX_PLAN_LINEAR_EXECUTION.md`,
not part of `94b2f4e`. Its captured SHA-256 is
`00e940457a63abd44cfeda20260d173896549f397782aa73fe8d06da4866a650`; a
dated copy is retained at `outputs/local-consolidation-2026-09-16/current-source-execution-handoff.md`
in the original checkout.
The source audit is `outputs/branch-merge-audit-2026-09-16-gSeWpV/REPORT.md`; the
remote-worker limits are `outputs/remote-browser-check-2026-09-16/WORKER_RUNBOOK.md`.
Those are retained-source references, not candidate paths.

Evidence root (in the original checkout):
`outputs/local-consolidation-2026-09-16/`. The source manifest is
[LOCAL-CONSOLIDATION-MANIFEST.json](LOCAL-CONSOLIDATION-MANIFEST.json).

| Gate | Result / evidence |
| --- | --- |
| Exact import hashes and Git modes | 375 unchanged paths; five declared documentation/ignore exceptions; `source-verification.json` |
| Protected destination scaffold | Seven paths byte-identical to `b15c1a9`; hosting identical to `94b2f4e` |
| Source preservation and local installation | `preservation.json` and `delivery.json` record the actual guarded activation |
| Independent import/documentation review | `independent-review.md` records verdict against the exact candidate SHA |
| Remote install, repository fixtures/policy, lint, type checking | Passed; `remote-final/evidence/report.json` and logs |
| Remote regression suite | 675 passed, zero failed/skipped |
| Remote performance test | Failed: 8-bot presentation p95 1.6230 ms versus 0.5 ms; `npm test` failed overall |
| Remote production build | Passed retry; `remote-final/evidence/build-retry.json` and log |
| Browser smoke, full CT/T rounds, 60 FPS, visual acceptance | Not run; CPU-only worker cannot establish full-round/FPS gates |
| PR checks, remote enforcement, merge/deploy, Linear closure | Not run; outside reconciliation |

Remote validation used Node 22.23.2/npm 10.9.8 on the dedicated 2-CPU, 4-GiB
Linux worker. Its archive contains the exact game/configuration/asset bytes from
`94b2f4e` and retained destination CI policy; routing documentation is inspected
separately. The archive SHA-256 is
`274401417a3dd7130da74bf028741cdeda4f7cca098eaab1d91775ebcfabe997`.
After the initial build failed because the archive had no Git metadata, a private
validation-only snapshot was committed as
`37966d91f4efc9a56672ae114f3d8790fe84247f`; the build then passed. This SHA is
not the upstream or delivered candidate SHA. All 390 archive file hashes were
unchanged after checks and the retry. No game fix, threshold relaxation or cause
attribution accompanies the performance failure.

Historical JKH-144 evidence (675 regressions and p95 0.2900 ms) remains
historical. It does not newly test this tree; the retained T natural-route miss
remains open. Complete-product acceptance still requires final independent CT/T
rounds and Joseph's visual approval.

The independent-review and delivery records identify the reviewed commit and
actual destination activation separately from the immutable source baseline.
This historical record does not authorize publication, PR delivery, merge,
deployment or Linear Done; later workflow definition has its own evidence.
