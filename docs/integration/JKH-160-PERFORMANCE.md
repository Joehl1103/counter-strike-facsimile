# JKH-160 current-workload cleanup/rebaseline (2026-09-27)

This section supersedes the prior faceted-only benchmark as the current timing
oracle. Historical entries below remain unchanged evidence and are not directly
comparable with this corrected workload.

## Scope and preserved behavior

The candidate removes four CPU deformation-buffer controllers and their normal,
reset, death and graphics-QA writes from `app/page.tsx`. It retains the hidden
faceted limb meshes, procedural rig joints, authority hit proxies, every weapon
branch, muzzle/socket attachment, grip solver, death joint capture, and all
visible GLB sampling. The normal live pose seam is `app/bot-presentation.ts`,
shared by `app/page.tsx` and the current benchmark. Reset keeps both the zero-time
and current simulation-time skin samples; no time-dependent presentation step
was removed.

The comparison oracle is test-only `runLegacyBotPresentationFrame` in
`tests/helpers/bot-presentation-fixture.ts`. It reproduces the pre-cleanup normal
sequence, including four controller writes and two foot-plant calls. Run the
same corrected workload for each side with:

```sh
JKH160_PRESENTATION_MODE=legacy node --test tests/movement-presentation-performance.test.ts
node --test tests/movement-presentation-performance.test.ts
```

The first command measures the retained-buffer predecessor; the second measures
the candidate. Each keeps the historical test title, eight bots, 240 warmup
frames, 320 individually timed frames, renderer-equivalent final scene traversal,
skeleton updates, socket/proxy queries, and strict p95 `< 0.5 ms` gate. The
320 individual frame timings, p95, mode and exact source-asset hashes are printed
as JSON before the assertion, so failed thresholds leave usable paired-run
evidence. The default mode is candidate;
the legacy mode is only a paired rebaseline oracle.

## Exact fixture inputs and limits

- Authored CT GLB `public/assets/characters/ct-mpfb.glb`, SHA-256
  `e85a0dd18270caee23a12ef4970868323ac0be1bf7cd21b823af49158e6cf1f8`;
  2 skinned meshes, 11,348 position vertices and 9,254 triangles.
- Classic T GLB `public/assets/characters/vanguard.glb`, SHA-256
  `dfb230fc1f942f259dd00281a1186953ad602fc5d69067ce63e24b2aa439736b`;
  2 skinned meshes, 7,434 position vertices and 11,376 triangles.
- Each fixture bot retains the current 11 primary/secondary world-model factory
  branches, four hidden faceted meshes and an old procedural rig. Eleven simple
  sphere hit-proxy stand-ins preserve authority-tree traversal load; they are not
  the exact production hitgroup shapes. The shared production world-firearm
  factory retains outer groups, material remapping, transforms, primary batching,
  shadow flags and secondary muzzle callbacks. Its shared muzzle constructor
  builds the same light-plus-sprite hierarchy, profile metadata and render
  callback; the CPU fixture passes a null texture because Node does not decode
  browser canvas textures. The primary/secondary world-model factories and
  current selected grip targets are real and asserted against both rig paths.
- GLB source bytes are hash-recorded before parsing. Only material texture
  references are stripped from a fixture copy because Node has no browser image
  decoder; original geometry, skin, animation and binary chunks are retained.
  No texture decode, renderer, browser, collision simulation, or actual game
  round is included. This fixture is a deterministic CPU presentation workload,
  not complete-game or visual acceptance.

The equivalence test compares normal pose, a reset ending at nonzero elapsed
simulation time, explicit crouch sampling, and a finite death-continuation trace.
It checks local rig pose/grip, current skeleton transforms and sampled skin
vertices, weapon and muzzle sockets, authority transforms and hit proxies. It
intentionally ignores the deleted hidden-buffer contents. It is finite module
coverage; it does not invoke the browser page's full QA/corpse orchestration.

## Candidate handoff

Starting checkout was branch `feature/jkh-119-game-baseline-snapshot` at
`e01b6c2`, with eight unpushed commits and retained in-progress edits in
`app/page.tsx` plus new `app/bot-presentation.ts`. Exact ownership/restart
record: `/Users/josephshomefolder/development/games/counter-strike-facsimile/outputs/jkh-160-resume-2026-09-27/OWNERSHIP.md`. No local Mac game tests,
builds, browser or performance checks are permitted. Coordinator must run, on
the dedicated worker, in serialized immutable snapshots:

```sh
npm run test:regression
JKH160_PRESENTATION_MODE=legacy node --test tests/movement-presentation-performance.test.ts
node --test tests/movement-presentation-performance.test.ts
npm run lint
npm run typecheck
npm run build
```

Record paired raw frame timings and host/Node identity. A failed p95 leaves
JKH-160 In Progress; do not tune the threshold. Root owns remote execution,
commit, tracker integration and delivery. A fresh independent reviewer must
inspect the exact final diff and evidence before any PR delivery. This work does
not establish the separate 1080p60, full CT/T round, or visual acceptance gates.

---

# JKH-160 / JKH-119 presentation optimization

## Round 3: final builder round

Coordinator measurements, exact Linux x86_64 / Node 22.23.2 trees:
`0a01ac7` median p95 0.6635 ms, p50 approximately 0.51–0.56 ms;
`f66744e` median p95 0.6064 ms; `b18cf72` median p95 0.6037 ms,
min 0.488, max 0.777, official passes 2/10, p50 approximately 0.43–0.45 ms,
p99 approximately 0.64–0.70 ms. Linux regressions pass 693/693. Each benchmark
rig contains 93 nodes / 43 meshes. Target remains box p95 approximately 0.30 ms
or less against the unchanged official 0.5 ms gate; Actions baseline was 1.05 ms.

Base `b18cf72`; owned files: limb deformation and this record. Final plan:
fuse the passes **inside** foot planting while keeping `write()` immediately
observable. Measure virtual swing at unique boot vertices, preserve original
anchor reduction order, then write swing/correction/normals together. Preserve
each intermediate Float32 rounding step. Audit constant rig transforms, but
skip freezing public joints if their standalone world queries could go stale.
No analytic bounding-box approximation, deferred public output, test changes,
or local performance run. Latest Linear project and issue/parent/dependency
activity reread; coordinator retains review, timing and remote updates.

Round 3 result:

- Swing is evaluated virtually for boot contact, then swing, ground correction
  and normal correction share one representative-vertex pass and one expansion
  pass. A three-component scratch attribute preserves the intermediate storage
  rounding. Invalid contacts still leave the swing-only result visible.
- Each unique boot corner is transformed once into retained Float64 scratch.
  Contact reduction still visits every original corner in original order, with
  the same tolerance and repeated-corner weighting; no bounding approximation.
- Bind-to-joint offsets are precomputed in Float64, and each hinge's sin/cos is
  calculated once when its actual angle changes and shared by its segments.
  Standalone deformation writes still restore complete current output before
  returning; attribute identities and revision increments remain intact.
- Further rig freezing was skipped: Three.js `updateWorldMatrix` can leave a
  constant-local child's world matrix stale after an ancestor update unless a
  forced traversal occurs. Public socket queries must continue working between
  render traversals. No rig, weapon, pose or scene topology change in this round.
- Final local Node v24.5.0 checks: **693/693 regressions**, typecheck and lint
  pass; `git diff --check` passes. Logs: `outputs/jkh-160-performance/round-3/`.
  Intermediate setup-syntax and lint failures were corrected; their logs remain
  as `*-before-*-fix.log`. No tests, gates, scripts or CI files changed, and no
  performance command, build, browser, server or push was run.
- Expected effect: fewer full-leg reads/writes and matrix-vector evaluations,
  plus less repeated hinge arithmetic. Extra retained scratch uses setup memory.
  No behavior regression detected by the existing tests; exhaustive differential
  equivalence and the approximately 0.30 ms p95 target remain unverified.
  This is the final authorized builder round; next action is coordinator timing
  and independent review of the exact new local commit, with no user decision
  needed. Remote activity publication remains the coordinator's responsibility.

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

JKH-160 / JKH-119 final round-3 optimization delivered as a new local commit on
`feature/jkh-119-game-baseline-snapshot`; no push. Regression 693/693,
typecheck and lint pass. Frozen benchmark and CI unchanged. Candidate performance
and independent review are unverified. Next: measure the exact commit on the
reference Linux x86_64 / Node 22.23.2 box with the unchanged performance command;
target p95 approximately 0.25–0.30 ms, required gate strictly below 0.5 ms.
Retain raw runs, arrange independent review, and keep PR #9 draft until its
required evidence passes. This completes the assigned local builder segment;
no Joseph decision is needed. Coordinator owns tracker reconciliation and
posting this activity update; no remote status change is claimed by the builder.
