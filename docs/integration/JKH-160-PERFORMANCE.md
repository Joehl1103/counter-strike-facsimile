# JKH-160 / JKH-119 presentation optimization

## Round 2: coordinator measurements and next candidate

Coordinator-reported Linux x86_64 / Node 22.23.2 measurements, ten runs per
exact tree: `0a01ac7` median p95 0.6635 ms, max 0.7228 ms, official passes
0/10; `f66744e` median 0.6064 ms, max 0.6587 ms, min 0.4965 ms, official
passes 0/10. These are the supplied results, including the reported minimum
and pass count. The approximately 9% gain is insufficient. GitHub Actions
baseline p95 was 1.0514 ms. The new desired reference-box target is
approximately 0.25–0.30 ms; the official 0.5 ms gate is unchanged.

Round 2 builder base: `f66744e`. Owned files expand to the deformation module,
`app/secondary-weapon-models.ts`, and this record. Plan: replace nested vertex
groups with flat retained buffers, cache each segment by its exact angle inputs,
and freeze factory-owned static merged weapon meshes after auditing transform
writes. Keep per-frame output, rounding, topology and public buffer identities.
Run the same permitted checks, retain separate round-2 logs, and commit locally.
Live Linear activity and issue/parent/dependency timelines were reread; no
scope/status change supersedes the coordinator's current optimization request.
Independent review, Linux timing and tracker publication remain coordinator work.

Round 2 implementation and validation:

- Replaced per-vertex-group array objects/nested loops with flat representative
  and copy-offset buffers. Foot translation and normal correction use the same
  flat layout, with no per-frame allocation or topology changes.
- Each segment retains its shape before planting, keyed by its exact sanitized
  hinge angle(s), including signed zero. Unchanged segments reuse this output;
  every call bulk-copies all positions/normals back to the public attributes,
  so previous foot corrections and resets cannot leave stale geometry.
- The retained buffers keep position X and normal X at bind because every
  hinge rotates around X. Changed Y/Z components preserve the original ordered
  knee/ankle calculations and Float32 writes, then share one flat expansion loop.
- `secondary-weapon-models.ts` composes each newly merged static mesh's identity
  local matrix once and disables its automatic local composition. World updates
  still run normally. Audit: consolidated meshes are newly created after source
  transforms are baked; `app/page.tsx` moves weapon roots and muzzle lights;
  `viewmodel-reload-visuals.ts` moves only excluded magazines/support hands.
  Named/tagged mesh references across `app/` contain no local transform writers
  for these merged meshes. Roots, helper nodes and supplied effects remain dynamic.
- Local Node v24.5.0: regression **693 passed, 0 failed/skipped** (11.360 s),
  typecheck and lint exit 0, diff whitespace check passed. Focused existing
  limb/secondary checks passed 26/26 before the final X-component optimization;
  the full regression suite above includes that optimization.
- Logs: `outputs/jkh-160-performance/round-2/`. Tests, package files and `.github/`
  remain unchanged. No performance command, build, browser or server ran.
- Candidate timing is **unverified**. Expected benefit is fewer small-array
  traversals/scalar writes, no recomputation for unchanged hinges, and fewer
  local matrix compositions. Added caches cost setup memory. Existing checks
  detect no behavior regression; exhaustive previous-versus-current output
  comparison and reference-box p95 remain coordinator validation.

## Frozen builder plan and acceptance card

- Worker: Codex builder, 2026-09-24; coordinator owns Linux measurement,
  independent review, Linear updates and PR delivery.
- Checkout: `/Users/josephshomefolder/development/games/csf-wt/jkh-119-snapshot`;
  branch `feature/jkh-119-game-baseline-snapshot`; base `0a01ac7`.
- Scope: optimize the production limb presentation code without changing any
  vertex, normal, matrix or pose beyond existing floating-point tolerances.
- Owned files: `app/character-limb-deformation.ts` and this record. Tests,
  package scripts, CI, thresholds, sampling and benchmark inputs are frozen.
- Reference: unchanged `tests/movement-presentation-performance.test.ts`,
  eight bots, 240 warmup frames, 320 measured frames, p95 strictly below 0.5 ms.
  User-reported Linux x86_64 / Node 22.23.2 baseline: 0.60, 0.64, 0.70, 0.79,
  0.84 ms. Candidate target approximately 0.35 ms or lower on that same box.
- Reuse decision: adapt the existing CPU deformation implementation. The
  non-indexed geometry repeats identical bind vertices; setup-time grouping can
  reuse arithmetic without changing render geometry or adding a dependency.
- Plan: group identical bind positions/normals within each deformation range;
  reuse deformation and influence calculations while writing every output;
  run allowed regression, typecheck and lint; commit locally for measurement.
- Validation: `npm run test:regression` (expected 693), `npm run typecheck`,
  `npm run lint`; raw logs in `outputs/jkh-160-performance/`. No Mac performance
  tests, build, browser, Blender or load tests. No push or external file edits.
- Startup reconciliation: latest project activity and JKH-119 comment retrieved
  live; draft PR #9 contains this base and reports the same failing gate.
  JKH-160 and its parent JKH-125 remain Backlog; JKH-159 blocks complete-product
  acceptance, not this explicitly authorized optimization. JKH-119 currently
  says Done despite the comment retaining an incomplete draft PR. Coordinator
  must reconcile statuses; this builder does not claim issue completion.
- Memory lookup failed because its helper attempts to change permissions outside
  the authorized worktree. Direct personal-vault search found no matching note.
  Durable findings will remain here; external memory capture is not authorized.

## Round 1 results (f66744e; historical)

Implemented in `app/character-limb-deformation.ts`:

1. Setup-time groups share hinge arithmetic for bit-identical bind positions
   and normals within the same segment. Every original triangle corner is still
   written; indexed topology, geometry/attribute identity and rendering do not
   change. Bit keys distinguish signed zero. No frame inputs are cached.
2. The fixed upper segment restores its bind position/normal views with typed
   array bulk copies. It is restored every frame, including after foot planting.
3. Foot translation and inverse-transpose normal correction reuse those groups.
   Zero-influence groups are excluded at setup; their old loops did no work.
   Each translation still writes Float32 output before the next stage reads it;
   the original arithmetic and normalization safeguards are retained.
4. Boot measurement evaluates world Y first and computes X/Z only for corners
   that contribute to the contact. Matrix arithmetic, traversal order, repeated
   corners, minimum tolerance and anchor averaging remain unchanged.

Expected effect: fewer repeated transforms, weighted additions, normal divisions
and square roots; fewer world-coordinate calculations. No measured speedup or
candidate p95 is claimed. Matrix updates, animation poses and grip solving are
unchanged. Grouping relies on the existing immutable bind snapshot and sole
controller ownership of deformation buffers; repository callers honor this.

Validation on local macOS arm64, Node v24.5.0:

- `npm run test:regression`: 693 passed, 0 failed, 0 skipped (9.807 s).
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `git diff --check`: passed.
- Focused existing limb checks passed before the final bulk-copy/bounds changes;
  the full regression run above includes those changes and the same limb checks.
- Existing limb tests cover pivot deformation, resets, sanitization, shared
  geometry isolation, stable buffers, grounded/swinging feet and unit normals.
  They do not compare every output against the previous implementation.
- No tests, package scripts or CI files changed. The authorized regression
  command retains its original skip pattern. No `test:performance`, build,
  server, browser or Blender command was run.

Raw logs: `outputs/jkh-160-performance/{regression,typecheck,lint,limb-tests}.log`.
External memory capture remains incomplete under the worktree-only restriction;
the source-backed implementation findings are retained in this record.

## Coordinator handoff / project activity draft

JKH-160 / JKH-119 round-2 optimization delivered as a new local commit on
`feature/jkh-119-game-baseline-snapshot`; no push. Regression 693/693,
typecheck and lint pass. Frozen benchmark and CI unchanged. Candidate performance
and independent review are unverified. Next: measure the exact commit on the
reference Linux x86_64 / Node 22.23.2 box with the unchanged performance command;
target p95 approximately 0.25–0.30 ms, required gate strictly below 0.5 ms.
Retain raw runs, arrange independent review, and keep PR #9 draft until its
required evidence passes. This completes the assigned local builder segment;
no Joseph decision is needed. Coordinator owns tracker reconciliation and
posting this activity update; no remote status change is claimed by the builder.
