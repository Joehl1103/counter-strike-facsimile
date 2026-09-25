# Counter-Strike 1.6 facsimile: active execution plan

## Status and authority

**Resumed through Linear, 2026-09-16:** Joseph directed “Start work” after
authorizing independent issue agents in their own worktrees. The product scope
below remains active; [the Linear backlog](CODEX_PLAN_LINEAR_PRODUCT.md) and
[current execution handoffs](CODEX_PLAN_LINEAR_EXECUTION.md) govern issue order,
ownership and current evidence. Earlier pause statements below are historical.
Preserve the approved M4 and inherited dirty work. Local implementation does
not authorize public-history migration, PR criteria changes, merge or deployment.

**Resumed for Glock and hands, 2026-09-15:** the user explicitly requests coordinated agents to match the supplied Glock close-up and continue until achieved. [Glock reference plan](CODEX_PLAN_GLOCK_REFERENCE.md) governs this focused work; the historical pause below is superseded for this scope. Preserve user-approved M4.

**Execution paused, 2026-09-15:** the user requested a good checkpoint and
session reflection. The verified M4 correction is that checkpoint; no further
implementation is authorized until the user resumes. See
[project memory](PROJECT_MEMORY.md) and [handoff](HANDOFF_CS16.md).

The subsequent user-authorized strategy revision is recorded at the top of
[the reuse plan](CODEX_PLAN_TOOL_REUSE.md#strategy-adjustment--2026-09-15):
qualify a complete compatible CT/rig/animation pairing, expose access blockers
early, and use bounded existing-tool improvements for demonstrated setup costs.
That queue governs the next resumed work; it changes no acceptance totals or
frozen visual/performance criteria and does not resume implementation.

**Latest user visual verdict, 2026-09-15:** “By the way the m4 looks great.
The other guns still look pretty bad.” Preserve the current M4 appearance and
use it as the reference quality for other firearm work. Earlier M4-specific
restyling/rejection conclusions are superseded by this feedback. Character
acceptance and complete multi-weapon/action acceptance remain outstanding;
the implementation pause remains in force.

**Current direction — restart with reuse-first asset qualification, 2026-09-14.** The user reports
that the map is improving but characters and first-person hands/guns are getting
worse, and explicitly requested a stop and plan reevaluation. P7b and P7c were
**regressed / user-rejected** at that point; the later M4-only approval is above.
Engineering checks and earlier internal visual
reviews do not override that verdict. Follow
[the visual recovery plan](CODEX_PLAN_VISUAL_RECOVERY.md) before any resumed visual
implementation. The user resumed the revised pilots, then explicitly put them
on hold again. A subsequent documentation-only reassessment adds
[a reuse-before-building decision](CODEX_PLAN_TOOL_REUSE.md) before more asset
production. The user then directed “Once you are done, start over.” The reuse-first asset
approach is now active; preserve map/gameplay and prior comparison evidence.
Historical completion entries remain superseded.


This is the active plan for converting **Dustline Tactical FPS** into a faithful
Counter-Strike 1.6 look-and-play facsimile, while retaining the Dustline wrapper
name and CT/T team labels. It supersedes the scope and direction of every older
`CODEX_PLAN*.md` for this work. Older plans are historical evidence, not
acceptance criteria.

[FACTORY_METHOD.md](FACTORY_METHOD.md) defines the repeatable workflow,
checklists, evidence naming, source provenance, review roles, and freeze rules.
This plan defines the deliverables and dependency order. P0 measurement tooling
is implemented. The user has no original installation or recordings; the active
oracle is now a documented approximation. Exact original fidelity remains unverified.

| Item | Current status | Measured baseline / acceptance score |
| --- | --- | --- |
| P0: working reference | revised oracle established; original fidelity unverified | Previous original-reference checklist preserved below |
| P1: movement | player slices P1a–d accepted; global clock accepted in P4a | P1a3/3; P1b4/4; P1c4/4; P1d4/4 |
| P2: Dust II and navigation | topology/navigation baseline retained; user sees map improvement | 7/7 route evidence is engineering history; no new final visual acceptance |
| P3: weapons and buying | special states, numeric tuning, recoil and penetration accepted | P3a7/7; P3b4/4; P3c4/4; P3d4/4 |
| P4: bots and rounds | bounded bot/round approximation accepted; capability limits recorded | P4a4/4; P4b3/3; P4c3/3; P4d4/4; P4e3/3; P4f3/3; P4g4/4; P4h4/4; P4i4/4; P4j4/4; P4k3/3; P4l4/4; P4m4/4; P4n4/4; P4o3/3; P4p4/4; P4q5/5; P4r5/5; P4s5/5 |
| P5: appearance and sound | previous review is historical; character/viewmodel visual acceptance superseded by user rejection | Prior engineering/audio evidence retained; not a current product completion claim |
| P6: complete-match acceptance | engineering baseline only; user rejects product fidelity as incomplete | P6a4/4; P6b exactness/timing pass; final decision below |
| P7a: map and menu | map improving per user; preserve progress | Internal bounded visual checks retained; overall product still incomplete |
| P7b: characters | regressed / user-rejected; strategy replaced | 0/4 visual criteria accepted; functional tests are separate |
| P7c: first-person hands and weapons | M4 appearance user-approved; other guns still user-rejected | 0/4 complete multi-weapon criteria established; M4-specific positive visual verdict recorded separately |

Here, **— means unmeasured; the checklist denominator is not frozen yet**.
At chunk entry, add the method's acceptance cards and record the actual baseline.
After each attempt, update this table and append the method's attempt record
with gained/lost passes, regression coverage, evidence, and the next action.
User visual acceptance remains a separate, explicitly recorded decision.

## Product boundary

Deliver a single local Dust II match: five per side, with the player plus four
allies against five enemies. Recreate assets; do not import or redistribute
original game art, audio, models, or maps. Required firearms are AK-47, M4A1,
AWP, MP5, M3, Glock 18, USP, P228, Desert Eagle, Elite, and Five-SeveN; required
equipment is knife, HE, smoke, flash, armor, helmet, defuse kit, and C4.

The target has stock 1.6 Dust II route structure: T/CT spawns, long, short,
mid, doors, upper/lower tunnels, A/B sites, cover, and the route-critical height
changes. It uses clear CT/T character models, low-poly painted textures, hands
and viewmodel framing that read as the reference, a classic amber/green HUD and
numbered buy menu. Remove hit confirmation and enemy-spot radar; use licensed or
originally recorded/recreated audio samples.

Out of scope: the full arsenal, shield, other maps, hostage rescue, online
multiplayer, and deployment. Preserve the existing Three/React/Vinext Sites
project and its existing Sites project identity.

The present baseline is a custom flat 2D-collision arena, generic primary
weapons, and a 5-versus-4 game in a 13,924-line `app/page.tsx`, with game rules
and round/objective tests. It is an observation, not a fidelity claim; this plan
asserts no current test count or quality-gate result.

## Reference and measurement gate

The user confirmed on 2026-09-13 that original installations and recordings are
unavailable. The previous original-capture gate is superseded: implement a
**documented approximation**, without representing it as measured equivalence.
Original capture remains an optional future validation path, not a blocker.

Use three distinct oracles: (1) deterministic engineering invariants and explicit
project rules; (2) sourced mechanics, with Valve Half-Life source labelled engine
background and ReGameDLL labelled a reconstruction with changes; (3) public or
user-supplied visual references with provenance and visible-comparison criteria.
Unknown details require a stated project choice before implementation. Never turn
an unknown into a fidelity pass. Freeze a source revision before copying numeric
behavior into a card; do not import original art/audio/models/maps.

For the first movement slice, retain current scene units and tuning while removing
update-rate dependence. This is an engineering target and requires no invented
GoldSrc conversion. Later hull/map dimensions need one explicit project conversion
with its source or approximation recorded. Existing visual files are reference
material, not a complete map specification.

Before changing a measured behavior, record and freeze its unit definition,
capture method, input sequence, display/FOV, build identity, and numerical
tolerance. Derive tolerances from repeatable measurements; the previous 5%
proposal is not validated truth. Values requiring source validation before port
include 3-second planting and 5/10-second defusing. Use first to 16 wins,
15-round halves, MR3 overtime, a 105-second round, 5-second freeze, 15-second
buy window, and 35-second bomb timer as the planned **project preset**, not as a
universal vanilla-default claim. MR3 means three rounds per overtime half.

## Architecture target

Incrementally split the monolithic page into simulation, rendering, and UI
boundaries. Simulation advances at fixed 100 Hz; rendering interpolates snapshots.
Adopt one unit conversion and a height-aware hull model for floors, ramps,
stairs, ceilings, jump, crouch, and fall. Define data-driven `MapDefinition`,
`WeaponDefinition`, `MatchRules`, input/event streams, and `HUDSnapshot`.

Replace the arena with a Dust II definition and navgraph. Bots pathfind, locally
avoid, and obey the same movement, weapons, damage, economy, and visibility rules
as the player. Difficulty changes aim/reaction and the documented simultaneous-burst allowance
(P4o preserves the existing project presets); weapon constants remain shared. Objective decisions use
limited sight and hearing, never omniscient state.

Weapon work replaces the present fixed spray with classic-style recoil and states:
armor, range, penetration, Glock burst, USP/M4 silencers, AWP scope stages, M3
shell reload, knife secondary attack, and classic-style prices, ammo, rewards,
and objective flow. Each behavior requires its own frozen source/approximation card before
its working-target acceptance; P0 establishes the method and first slice only.

## Ordered work packages

The rows below are chunks, not single agent assignments. Each numbered
subpackage is scoped into a bounded work package using an acceptance card from
[FACTORY_METHOD.md](FACTORY_METHOD.md). Start each chunk with a fixed checklist;
freeze and review each candidate independently. No evidence quantity is invented.

| Package | Depends on | Ordered subpackages | Exit evidence |
| --- | --- | --- | --- |
| P0: working reference + first slice | — | 1) source/provenance ledger; 2) measurement harness; 3) classify original, reconstructed, or project-choice targets; 4) freeze a bounded baseline comparison | Source-labelled working targets and repeatable baseline; original equivalence remains unverified without original measurements. See oracle revision below. |
| P1: movement simulation | P0 units/slice | 1) extract input/events and 100 Hz step; 2) hull/floor/ceiling; 3) ramps/stairs; 4) jump/crouch/fall; 5) interpolation | Deterministic replay plus measured 30/60/144 fps movement comparisons, frozen tolerances. |
| P2: Dust II + navigation | P1 hull/units | 1) `MapDefinition` and spawns; 2) routes/height volumes; 3) collision/line-of-sight; 4) navgraph; 5) path and avoidance | Route traversals for long/short/mid/doors/tunnels/sites, spawn validation, nav and collision evidence. |
| P3: weapons + buy | P0 weapon references, P1 shared interfaces | 1) definitions/inventory; 2) pistol states; 3) primary states; 4) equipment/C4; 5) buy/economy | Per-weapon state traces and repeated recoil trials, measured comparisons, purchases and objective receipts. Use a small test scene before the full map is ready. |
| P4: bots + rounds | P2, P3 | 1) equal-rule bot adapter; 2) sight/hearing/reaction; 3) objective roles; 4) 5v5 economy and match transitions | Replayable full-round scenarios showing limited knowledge, plant/defuse, halves and MR3 preset. |
| P5: appearance + audio pilot | P0 first slice; then P2/P3 assets | 1) early pilot: one route, one CT/T pair, one firearm/HUD/audio set; 2) map texture/model system; 3) remaining roster and sounds; 4) remove prototype UI cues | Pilot review before broad visual production; asset/provenance ledger; viewmodel/HUD/audio captures within budgets. |
| P6: full-match acceptance | P1–P5 | 1) freeze candidate; 2) full-match scenarios; 3) normal play reviews; 4) performance and regression; 5) decision record | Two independent reviewers run the same candidate as CT and T, plus full-match scenario and normal-play raw evidence with candidate identity. User visual acceptance is recorded separately. |

## Verification and performance

For final acceptance, run `npm test`, `npm run lint`, and `npm run build` on the
exact candidate. During work, use the focused and regression checks required by
the method. Add a project TypeScript check covering application and tests while
excluding old ignored diagnostics in `outputs/` and `work/`; report its scope.
Do not relax thresholds to make a candidate pass.

At 30/60/144 fps, verify movement against the frozen P0 metrics. At 1080p on
recorded hardware, repeat each route and target 60 FPS. High must remain within
150 draws, 180k triangles, 64 textures, 96 MiB, two lights, one 2048 shadow map;
Performance must remain within 90 draws, 130k triangles, 40 textures, 64 MiB,
two lights, and no shadows. Evidence records raw captures, commands, hardware,
route, settings, build/candidate identity, and reviewer identity. Visual fidelity
is judged by evidence, not a promise of hard pixel equality.

## Reference work package brief

**Inputs:** available public or user-supplied references, explicitly labelled
by provenance and confidence; existing Dustline source and tests; the method document.

**Deliverables:** reference ledger, capture specification, unit-conversion note,
measurement sheet with unknowns, one chosen movement slice and a bounded baseline
comparison.

**Evidence:** immutable source IDs, raw captures, scripted input/replay, measured
values and derived tolerances, reviewer notes, and a written decision whether P1
may start. Report the file location and decisions at completion.

## P0 execution card — 2026-09-13, attempt 1

Frozen checklist (four deliverables, not a fidelity score):

1. Inventory local reference availability and record provenance/unknowns.
2. Provide a reproducible current-build acceleration/release measurement command.
3. Acquire original-build recordings and measurements; freeze conversion and tolerance.
4. Compare the identical movement slice against the original and detect mismatch.

Player-visible target: running from rest and stopping on release. For deliverable
2, invoke the production horizontal-velocity function with rifle, forward input
for one second, then no input for one second, grounded, no collision. Repeat at
30/60/144 updates per second. Measure distance in **scene units**, speed in scene
units/second, and first stopped sample in seconds. No conversion to GoldSrc units
is asserted. These are isolated velocity-function measurements, not browser FPS
or full player simulation. Determinism requires identical traces on repeated runs;
finite samples and exact two-second coverage are harness validity checks. Cross-rate
differences are observations with no fidelity pass threshold. Original tolerances
remain unmeasured. No random input is used.

Known missing baseline: no retained repeatable measurement command or original
movement recording was found. Existing 442 tests passed on the pre-edit baseline
using `node --test --test-concurrency=1 tests/*.test.ts` (6.648 seconds); these
are regression checks, not product acceptance.

Owned files: `scripts/measure-movement.ts`, `tests/movement-measurement.test.ts`,
`CS16_REFERENCE.md`, this plan, and generated `outputs/cs16/p0/` evidence.
Application behavior is not changed by this package. Review validates the script's
scope, raw samples, repeatability, and missing-reference handling. Gameplay smoke
is deferred to a gameplay candidate; this tooling package cannot accept gameplay.
Candidate identity will be recorded using SHA-256 of the measured module and tool.
Historical gate at attempt 1: P1 depended on deliverables 3–4. Superseded by
the oracle revision below after the user confirmed no original material.

### Attempt 1 result

**Status: blocked** on original-build acquisition and comparison. Deliverables
1–2 accepted: reference inventory and repeatable current-build harness.
Accepted/frozen: **2/4**; gained **2**, lost **0**. Remaining **2 blocked**;
no original comparison was executed. This is deliverable completion, not “50%
faithful.” P1–P6 remain not started because their reference dependency is unmet.

The default Steam library has no installed apps; the repository's available
references are still images with unknown build/settings. User was asked for an
original installation or recordings with provenance. Do not repeatedly retry
the same search; next action is to obtain that input and execute the capture
specification in [CS16_REFERENCE.md](CS16_REFERENCE.md).

Owner: root; measurement design: Terra `p0_measurement_design`; independent
review: Terra `review_p0_harness`. Root implemented the small tool; workers
performed read-only analysis/review under the Sites checkout ownership rule.
Per-agent token counts and savings are unavailable; no efficiency claim made.

Candidate: Git base `cf2a2829b5b295e8a3688c7bde815dc50edc5512` plus
uncommitted source checksums in `outputs/cs16/p0/attempt-1/manifest.json`.
Tool SHA-256: `6e9f5b1afcc05d0a32a9c1ea1b316640d695c985030e918a952ab48d236f4ed6`.
Measured module SHA-256: `5e51b5ebd86b289ad371133f9f0f35aea27085e4f96285624939b96cd23ce35e`.
Runtime: Node v26.0.0, macOS arm64; exact platform in manifest.

| Update rate (Hz) | One-second run (scene units) | Release distance (scene units) | First stopped sample after release (s) |
| --- | --- | --- | --- |
| 30 | 4.369752593 | 0.788116692 | 0.466666667 |
| 60 | 4.321536743 | 0.849333333 | 0.483333333 |
| 144 | 4.291133277 | 0.884722222 | 0.479166667 |

Two CLI runs were byte-identical. The observed 30-to-144 Hz release-distance
difference is -0.096605530 scene units (about -10.92% relative to 144 Hz).
This exposes update-rate sensitivity in the current integration; it does not
identify the original game's correct distance. Reviewer independently confirmed
fresh CLI repeatability, input edges, sample counts, production function use,
source identity and limits; no blocking implementation findings.

Validation: 445/445 serial tests passed, comprising all 442 baseline regressions
and 3 harness tests; regression failures **0/442 rechecked**, unchecked existing
unit cases **0**. Lint including the new script passed. Initial test-call lint
errors were corrected before final validation. Build, browser smoke, and
original fidelity checks were **not run** for this standalone tooling change;
they are required when gameplay implementation begins. No application behavior
was changed or accepted.

Raw evidence: `outputs/cs16/p0/attempt-1/measurement.json`,
`measurement-repeat.json`, `regression-tests.txt`, `harness-tests.txt`,
`lint.txt`, `manifest.json`, and `review.md`. Paths after the first share that
directory. Output artifacts are ignored; if unavailable, rerun the documented
command and mark historical evidence unverified until reproduced.


## Oracle revision and P1a card — 2026-09-13

Reason for visible rebaseline: user has no original build/captures. Earlier P0
2/4 result remains historical, not retroactively relabelled 4/4. New working
oracle: source-labelled approximation plus independent correctness checks.
The first ready implementation is P1a; this does not accept the whole P1 package.

Frozen P1a checklist (three criteria):

1. Same one-second forward/one-second release sequence at 30/60/144 render
   updates executes 200 fixed 10 ms movement steps; run/release distances and
   final velocity agree within 1e-9 scene units (floating-point tolerance, not a
   fidelity tolerance). Baseline release spread: 0.096605530 scene units.
2. Paused/dead/frozen/round-reset movement accrues no stale step debt; large
   frame gaps execute at most five steps. Tests cover remainder/reset and gaps.
3. Production integration smoke: start, move, accepted fire, pause/resume,
   round transition, with no new test/lint/build regression.

Owned files: `app/fixed-movement-clock.ts`, movement integration in `app/page.tsx`,
`tests/fixed-movement-clock.test.ts`, related evidence and these docs.
Boundary amendment: `tests/camera-presentation-contract.test.ts` needs whitespace-
tolerant matching because the unchanged assignments moved into a callback.
Its order/presentation requirements remain unchanged.
This slice substeps player physics only. Bots, weapon clocks, timestamped input,
height-aware hull and render interpolation remain explicit later P1 work; no
claim that the entire simulation is fixed-step. Same current physics parameters
and collision order are retained. Raw measurements go in `outputs/cs16/p1a/`.


### P1a attempt 1 result

**Accepted: 3/3 frozen criteria; gained 3; lost 0.** This accepts the first
engineering slice, not CS 1.6 equivalence or all of P1. Run/release distances
are respectively 4.3010104535382485 / 0.8735999999999997 scene units at
30/60/144 updates per second, 200 ticks each. Cross-rate release spread fell
from 0.096605530 scene units to zero for this exact input sequence.

Production now substeps horizontal velocity, gravity, landing recovery and X/Z
collision at 100 Hz. Fractional time resets on pause/input release, inactive,
dead, frozen and round-spawn boundaries; a frame executes at most five ticks.
Live inputs still sample at render/input-event timing; jump edges and presentation
are not yet a deterministic input replay. No original-value tuning is claimed.

Root's frozen-candidate live smoke passed: keyboard-playtest start; visible
strafe/forward displacement; USP magazine 12 to 11 after F; pause at 1:29
with unchanged timer on recheck; resume; natural bomb detonation and round-two
preparation with previous-result receipt `lost:1`. This is a smoke run, not the
two independent final P6 reviews. High graphics snapshots passed at start and
round preparation, with nonzero viewmodel geometry; Performance preset and
continuous frame-rate/per-route GPU measurements remain unchecked.

Final source hashes and Node version: `outputs/cs16/p1a/attempt-1/manifest.json`.
Raw evidence in that directory: `measurement.json`, `final-start.*`,
`final-active.*`, `final-pause.txt`, `final-resume.txt`, `final-round-result.*`,
`start-budget.json`, `round-transition.json`, `regression-final.txt`,
`build-final.txt`, `performance-isolated.txt`, `review.md`.
Commands: `node scripts/measure-fixed-movement.ts`; `node --test
--test-concurrency=1 tests/*.test.ts`; `npx oxlint app tests scripts`;
`npm run build`. Final tests: **448/448 pass**; baseline regression cases
**445/445 rechecked, zero final failures, zero unchecked unit cases**. Lint,
build and diff whitespace check pass. Build retains a bundle-size warning.

Attempt history retained: one test assumed positive zero rather than accepting
negative zero at rest; changed to assert zero speed. One existing source-contract
regex assumed fixed indentation; it now tolerates whitespace without weakening
its ordering checks. Reviewer found trailing whitespace, corrected before final
smoke. Reviewer performance run failed p95 0.7538 ms against 0.5 ms; isolated
follow-up passed 0.2930 ms and final full serial suite passed. The timing failure
is recorded as observed variability, not proven pre-existing or hidden by a
changed threshold. No functional defect was identified by independent Terra
review; root inspected raw smoke evidence and made acceptance decision.

Next P1 slice: extract the player physics state/input seam, queue jump/input
edges against ticks, then height-aware collision and interpolation. Establish
new cards and engineering checks before that work. Do not restart the old
original-installation search. Per-agent token totals remain unavailable.

## P1b card — physics boundary and queued jump

Frozen checklist, four engineering criteria (not original fidelity):

1. Jump requests do not mutate player physics between ticks, execute once on
   the next eligible tick, and cannot survive pause/reset or queue while
   paused/dead/frozen. Repeated input must not create automatic repeat jumping.
2. Extracted physics preserves fixed-step run/release distances (1e-9 scene
   units), gravity, one landing event, and X-before-Z wall sliding. These run
   headlessly through the same physics function used by the page.
3. A scheduled jump from rest has identical per-tick height/velocity traces at
   30/60/144 render rates (1e-9 scene units, 200 ticks over two seconds). The
   test starts the jump at tick zero; arbitrary timestamped input remains later
   work and is not implied by this trace.
4. Frozen-candidate smoke passes start/move/jump/fire/pause/resume/round
   preparation; affected regressions, lint, build and preserved budgets pass.

Baseline: P1a accepted 3/3, 448 tests passed. `tryPlayerJump` currently writes
vertical velocity 5.15 and grounded=false synchronously in the input handler;
there is no queued jump/isolated physics seam. Capture this source before edit
as the missing-capability baseline. Keep tuning: gravity 14.5, ground eye height
1.68 scene units, jump impulse 5.15; these are retained project values, not
original measurements. Files: `app/player-physics.ts`, `app/page.tsx`,
`tests/player-physics.test.ts`, existing camera contract test (replace the old
inline-physics ordering assertion with the new boundary), movement measurement
script and plan. Root owns edits, Luna supplies bounded design, Terra reviews.
Evidence directory: `outputs/cs16/p1b/attempt-1/`; initial score 0/4.


### P1b attempt 1 result

**Accepted 4/4; gained 4; lost 0.** Exact original equivalence remains unverified.
Root extracted mutable player physics into `app/player-physics.ts`; the page
passes its live player state and collision adapter, and keeps sound/rendering
outside the physics function. Input queues a single jump instead of mutating
state immediately. Controller reset clears pending input and fractional time.
No obsolete inline physics path remains.

Measurement: 200-tick scheduled jump traces match exactly at 30/60/144 Hz;
apex eye height 2.569000000000001 scene units, one jump and one landing each.
The unchanged horizontal run/release values remain 4.3010104535382485 /
0.8735999999999997 scene units at every tested rate. New checks cover no
between-tick mutation, duplicate request suppression, pending-jump reset,
invalid input rejection, airborne consumption, wall sliding and page wiring.
These are project invariants; arbitrary event timestamps and held direction
changes are still sampled at render/input boundaries, not fully replayable.

Root live smoke on the manifest candidate: start, ground/jump/landing captures,
movement, F reduced USP 12 to 11, pause at 1:21, Space while paused, resume
without an unsolicited jump, natural bomb detonation and round-two preparation,
then round-two entry. This is one CT smoke run, not final P6 acceptance.
High `round-prepared` and round-two `play-start` snapshots passed with USP
viewmodel visible, seven draw proxies and 3,737 triangles. Performance preset
live sampling, full dynamic input replay, hull heights, and interpolation are
unchecked/outside this slice. Original game references remain unavailable.

Validation: full serial suite **454/454 passed** (all **448 prior cases
rechecked**, zero failures in root's full run, zero unchecked prior unit cases).
Focused independent Terra review passed 17/17 and found no blocking issue;
Luna supplied read-only design review. Lint, build and diff whitespace checks
passed. Build still warns about bundle size. Initial lint caught a readonly
velocity type on intentionally mutable state; corrected before frozen review.
Luna also ran a full suite with a timing outlier (p95 0.5567 ms vs unchanged
0.5 ms); isolated follow-up after browser closure passed at 0.3034 ms. Both
results are retained as reported; this is not proof the outlier is pre-existing.
No threshold was widened. Per-agent token totals remain unavailable.

Evidence: `outputs/cs16/p1b/attempt-1/` contains `baseline.json`, `manifest.json`,
`movement.json`, `jump-traces.json`, `measure-jump.mjs`, `tests.txt`, `build.txt`,
`performance-isolated.txt`, `review.md`, ground/jump/landed/resume screenshots,
start/active/pause/resume/round-two-entry text, round-result screenshot, and
both budget JSON files. `round-result.txt` is an unchanged-AX response, not a
standalone result transcript; use the screenshot and round-two evidence.
Commands: `node scripts/measure-fixed-movement.ts`,
`node outputs/cs16/p1b/attempt-1/measure-jump.mjs`,
`node --test --test-concurrency=1 tests/*.test.ts`, `npx oxlint app tests scripts`,
`npm run build`. SHA-256 verification after smoke confirmed unchanged sources.

Next ready work: a height-aware player hull/collision adapter, with explicit
project dimensions and fixture-based floor/ceiling/stair checks. Preserve P1a/b
checks. Tick-stamped dynamic inputs and render interpolation remain separate
unfinished parts of P1; do not report the full movement package complete.

## P1c card — height-aware hull

Continue directly into later ready chunks after acceptance (user correction:
chunk completion is not a stopping point). Frozen P1c criteria:

1. Solid boxes block the player's occupied height only; a player can land on
   a box and walk under an overhead box where the hull fits. Vertical sweeps
   stop at floors/ceilings without tunnelling in the bounded tick.
2. Grounded movement climbs a 0.3-scene-unit stair, rejects a 0.5-unit ledge,
   and follows a bounded linear ramp in both directions. Walking off support
   begins a fall; landing emits once and does not remain falsely grounded.
3. Crouch reduces the occupied height, and standing is refused under a low
   ceiling until clear. Camera stance follows actual hull stance. This is a
   project approximation: radius 0.43, standing hull 1.8, crouched hull 1.2,
   standing eye 1.68, crouch eye reduction 0.55, maximum step 0.36 scene units.
   Future source/map coordinates use one explicit project scale of 40 GoldSrc
   units per scene unit; that uncalibrated conversion is a layout convention,
   not a claim that retained legacy tuning is original-accurate.
4. Open-floor P1a/b checks still pass. Freeze the integrated candidate and run
   start/move/jump/fire/pause/round-transition smoke, regression/lint/build.

Fixtures use known box/ramp coordinates; no capture noise. Assert positions
within 1e-9 scene units at 100 Hz. Baseline lacks height-aware collision: page
checks only X/Z and physics clamps every landing to eye Y=1.68. Owned files:
`app/player-collision.ts`, `app/player-physics.ts`, `app/page.tsx`, new collision
tests, affected physics/measurement fixtures and plan. Evidence in
`outputs/cs16/p1c/attempt-1/`; initial 0/4. Bots' shared elevated movement is P4;
this slice does not accept bot parity or Dust II layout.


### P1c result

Accepted **4/4**, gained4/lost0. Full serial **467/467 passed**, including all454
prior cases; zero final failures/unchecked prior unit cases. Lint/build pass
(bundle-size warning retained). Independent review repaired four real cases:
ramp underside, actor-triggered crouch, ramp side tunnelling, and missing radius
at ramp edges. Added direct checks; final focused review30/30, no blockers.
Ramp solid contact now uses the radius-expanded footprint and highest point
under that footprint, consistently uphill/downhill. Geometry stands clear of
actors; actual crouch drives camera and spread. No imported original assets.

Root smoke passed start, visible movement/jump, fire12→11, pause/resume and
natural bomb loss/round2 preparation. High play-start/round-prepared snapshots
pass, with nonzero viewmodel geometry. Evidence in `outputs/cs16/p1c/attempt-1/`:
source `manifest.json`, movement JSON, final tests/build, original screenshots,
AX start/active/pause/resume/result and budget JSON, independent `review.md`.
Manifest hashes verified after smoke. Ramps/stairs/ceiling/low-crouch behavior
are fixture-tested through the live physics seam; the old map has no ramp data.
Performance-preset live sampling, arbitrary input timing and interpolation remain
unchecked. Continue directly into P2 (its hull/unit prerequisite is ready).

## P2 card — recreated layout and navigation pilot

Source: public overview linked in CS16_REFERENCE; coordinates below are original
project geometry inferred from topology, not extracted map data. Freeze seven
route cases: T-long-A, T-mid-short-A, T-upper-tunnel-B, mid-lower-upper-tunnel,
mid-doors-CT, CT-B-doors-B, CT-ramp-A. Each must have an unobstructed traversable
node path with bounded step/ramp changes using the P1c hull, plus separated
spawns and A/B sites. Record pass/fail for each; graph connectivity alone is
insufficient. A/B must be north of T spawn on opposite sides of CT/mid.

Map convention: scene X east/Z south, 72×72 extent, CT near(0,-22), T near(0,26),
A near(24,-26), B near(-26,-22). Approximate elevations: CT/mid/lower tunnel0,
upper tunnel/B/long1, T/catwalk/A2, pit0.5. Ramps connect these; footprint contact
uses the same collision module. Render original low-poly geometry with existing
recreated textures, replace old arena geometry, and attach navigation to the
same map definition. No downloaded map/art is shipped.

Integration gate after seven route checks: live screenshot confirms route/height
pilot, player/bots sit on their declared floors, gameplay smoke and prior checks
pass inside unchanged graphics ceilings. Initial route score0/7; integration
unverified. Owned files: new `app/dust2-map.ts`, map/render/nav integration in
page and game rules, associated new tests/updated old-location fixtures, plan.
Do not call the whole facsimile complete on map-only progress. Evidence at
`outputs/cs16/p2/attempt-1/`.

### P2 integration checkpoint (not acceptance)

Seven required routes traverse both directions through the real hull. Additional
checks cover every graph edge, B window, five clear spawn slots per side, doors,
tunnel ceilings, crate support, and paths from each spawn to each site. Geometry
is shared by renderer/collision/navigation; old arena route fixtures were replaced
with the new geometry without weakening the traversal requirement. Added original
project roofs, door panels, site crates, and a raised A platform after review.

First integration run: 468/475 tests passed. Seven failures were old map/source
contracts (old arena boxes, old site coordinates, flat bot root, removed panorama
and site decals). Panorama support was retained; revised map-specific contracts
now assert current geometry and non-interactive site paint. Review also fixed
round-reset navigation caches, braking height updates, and item support on crates.
Final development candidate: 478/478 serial tests, lint and build pass. No final
acceptance yet: immutable live smoke is running. Evidence under
`outputs/cs16/p2/attempt-1/`, candidate hashes in `manifest.json`. Token telemetry
unavailable. This is a topology approximation, not original geometric equivalence.

### P2 accepted result

Accepted **7/7 frozen routes**, gained7/lost0; integration gate passed. Root's
immutable-candidate smoke passed start, movement/jump, fire12→11, pause1:38 with
unchanged recheck, resume, combat damage/death/spectating, natural time-expired
CT win, and round2 preparation with receipt. High start/prepared budgets pass:
start70 draw proxies/123,541 triangles/22 textures/35,966,487 bytes, two lights,
one2048 shadow. Both transitions retain visible USP viewmodel7draws/3,737tris.
No claim of continuous FPS, Performance-preset capture, complete-match acceptance,
or exact original proportions. Bots still use prototype combat/decision rules;
P4 will establish equal rules and five opponents. Final visual detailing is P5.

Final478/478 tests pass (all467 prior cases rechecked,0final failures/unchecked
unit cases); lint/build and diff whitespace pass. The seven initial failures and
subsequent real integration repairs are retained above. Source hashes verified
unchanged after smoke. Raw `result.png` and `result.txt` both show round2 and the
previous round1 CT win; `prepared-budget.json` captures the same transition.
Root inspected original start/active/result screenshots. No blocker remains for
later ready work; proceed without another user approval.

## P1d card — timestamped movement inputs and interpolation

Frozen engineering criteria (four): (1) non-frame-aligned direction, stance,
walk and jump events replay identical per-tick position/velocity/stance traces at
30/60/144Hz (1e-9 scene units); (2) ordered equal-time events, single jump edges,
and pause/reset clearing are deterministic; (3) interpolation stays between the
last two positions, never mutates authoritative collision/combat position, and
reset cannot interpolate across a teleport; (4) live start/move/jump/fire/pause/
round transition, prior regressions/lint/build and budgets pass.

Inputs use monotonic seconds on the movement clock. Events affect the first tick
whose start is at or after their timestamp. Same-time events use insertion order.
Page key/touch/mouse changes enqueue control snapshots; per-tick weapon/tag speed
uses current gameplay state. Stalls retain the existing50ms bound and clamp event
offsets into that bounded frame; this is a project policy, not exact wall-time
replay across stalls. Baseline lacks timestamped direction/stance input and
position interpolation; P1a–c static/scheduled traces remain regression targets.
Owned: player-input.ts, player-physics.ts, fixed-movement-clock.ts, page integration,
new input replay tests and related source contracts. Evidence outputs/cs16/p1d/
attempt-1. Initial0/4. Root edits; Luna bounded design; Terra review. Weapon/bot
clock migration remains separate architecture work before final P6 acceptance.

P1d implementation checkpoint:482/482 tests, lint/build pass; dynamic200-tick
traces are identical at30/60/144Hz. Independent Terra24 focused checks pass,
no blocker. Important scope distinction: the localhost75ms atomic-keypress
adapter still re-enqueues sampled tap latches at render cadence; its smoke proves
integration, not deterministic dynamic input. The normal key/touch/mouse path
records timestamped events. Full bot/weapon clocks and associated replay remain
unfinished. Candidate frozen for normal smoke; acceptance pending transition.

## P3a card — special weapon states

Ready after P1d integration acceptance. Frozen reference is ReGameDLL-CS commit
781a68ae1c6fb652cf4fbc894970b4fb4dde19f9, numeric ledger in CS16_REFERENCE.md.
Engineering/reconstruction criteria (seven):
1. Glock semi/burst toggles; one burst trigger commits at most3 shots,100ms apart;
   empty clip/switch/reload/death/reset cancels pending rounds, no held auto-repeat.
2. USP/M4A1 silencer states lock firing during adjustment, change their damage
   branch and suppress muzzle flash; toggles cannot overlap.
3. AWP cycles unzoomed/40/10/unzoomed, briefly unzooms after a committed shot,
   restores the prior stage after1450ms unless switch/reload/death cancels it.
4. M3 uses550ms start,450ms inserts and1500ms finish; reserve transfers only at
   insert deadlines and a loaded shell permits fire interruption.
5. Knife has distinct swing/stab range/damage/cooldown; dead/paused/frozen input
   cannot attack. Forty source units per scene unit remains explicit approximation.
6. Required primaries identify AK-47/M4A1/MP5/M3/AWP, preserving inventory/buy/drop
   behavior; weapon states reset at correct lifecycle boundaries.
7. Focused traces plus prior regressions, live special-action smoke and a normal
   round transition pass within graphics limits. Record unexercised live cases.

No random input in state-machine fixtures: scripted millisecond deadlines,
exact ammo/count assertions, floating tolerance1e-9 for numeric transforms.
Baseline: no burst/silencer/stab state; one boolean scope; shell reload has no
explicit start/finish. Existing recoil/range/armor tuning is not accepted here.
Owned app/weapon-special-actions.ts, game-rules.ts, page wiring, affected tests,
plan/reference ledger. Evidence outputs/cs16/p3a/attempt-1. Initial0/7. Root edits,
Terra source/design/review. P4 later routes bot weapons through the same rules.

### P1d accepted result

Accepted4/4, gained4/lost0. Full482/482 tests pass, all478 previous cases rechecked,
zero final failures or unchecked prior unit cases. Lint/build pass; immutable
source manifest verified after smoke. Dynamic raw traces at30/60/144Hz each have
200ticks, one jump/landing, identical states; no original fidelity percentage.
Independent Terra24 focused checks pass. One initial source-contract test referred
to the old jump queue name; updated to assert timestamped input and lifecycle
reset, preserving the active/alive/freeze gate.

Root live smoke: start, W/Space/F with USP12→11, visible movement/jump, pause1:20,
Space while paused with unchanged clock, resume, natural timeout CT win/round2
preparation. Original active/result screenshots inspected. High start/prepared
budgets pass, each with visible USP7draws/3,737triangles. Raw evidence in
outputs/cs16/p1d/attempt-1 includes source manifest, dynamic-traces.json, tests,
build, focused review, start/active/pause/pause-confirm/resume/result and budgets.
The keyboard-playtest latch limitation above remains explicit; it does not
invalidate the pure production timeline comparison or constitute original input
latency equivalence. Proceed directly to P3a weapon states.


### P3a review checkpoint

488/488 serial unit tests passed before the final drop-path repair; seven focused
cases pass afterward. Independent Terra review found adjustment locks survived
interruption and the direct drop selection bypassed cancellation. Both repaired;
unfinished attachment changes revert, completed attachments persist, locks clear.
The new page contract checks reload/selection/drop/death/input release. Appended
silencer geometry now explicitly uses the viewmodel render layer. Final review
reports no blocker. Live smoke underway; no acceptance claimed from tests alone.

## P3b card — firearm numeric definitions and range damage

Frozen reconstructed-source targets: ReGameDLL commit 781a68ae1c6fb652cf4fbc894970b4fb4dde19f9,
weapontype.h/cpp, weapons.h and each wpn_shared firearm file. Baseline contains
prototype primary prices/reload/capacities/damage, nonuniform head multipliers and
linear range falloff. Freeze four criteria: (1) all eleven firearm definitions
match independently audited prices, ammo pack/capacities, base damage, reload and
cadence; (2) exponential range modifiers at 0/500/1000 source units and four hit
regions match explicit reference calculations, including M4 silencer branch;
(3) purchases/reload/armor conservation and C4 3s plant/5s kit/10s bare defuse
retain source-consistent outcomes; (4) regression checks and normal smoke pass.
One scene unit is the existing declared 40-source-unit project convention.
M3 uses the sourced nine-pellet linear buckshot formula recorded in the
pre-edit refinement below; it does not use exponential rifle falloff.
Movement speeds and recoil/penetration remain separate cards so P1 baseline is
not silently redefined. Owned game-rules.ts, damage call integration, focused
numeric tests and affected old fixtures. Initial 0/4, evidence outputs/cs16/p3b/
attempt-1. Do not edit candidate until P3a smoke freeze ends.


### P3a result — improved, timing criterion still pending

Accepted6/7 criteria, gained6/lost0. Criterion1 has correct pure scheduled deadlines
and live single-trigger ammo20→17, but actual follow-ups are render-cadenced;
100ms delivery is not accepted until P4. Criteria2–7 accepted against labelled
reconstruction/project targets: pure state tests plus USP live lock/fire/switch,
paused input, normal CT timeout/round2 receipt and graphics transitions. AWP/M3
and knife damage were fixture-tested, not directly measured in this live run.

488/488 full tests before final drop fix;7/7 focused after it, no final focused
failures; other481 cases not rerun after that localized repair. Lint/build and
scoped TypeScript check pass. Terra finalreview7/7 no blockers. High start and
prepared budgets pass, both USP visible7draw proxies/3737triangles. Root inspected
silencer/transition originals and verified unchanged manifest. Evidence in
outputs/cs16/p3a/attempt-1: transition.* is the actual round2 receipt; earlier
result.* and round-result.* captured pre-result spectating and are not result proof.
P3b proceeds; P4 must close the explicit pending clock criterion before P6.

### P3b pre-edit source refinement

Follow-up source audit found M3's exact legacy buckshot formula: nine pellets,
3000-unit maximum, floor(20*(1-distance/3000)) before hitgroup multipliers.
Replace the proposed .7 approximation before implementation; retain this change
record instead of calling an invented modifier a reference. Other firearms use
integer-truncated baseDamage*pow(rangeModifier,distance/500), head×4, torso×1,
stomach×1.25,leg×.75. Maximum trace ranges8192units except USP/P228/Deagle/Five-SeveN
4096. Existing single-wood penetration model remains explicitly unaccepted until
its own card; this slice only replaces base/direct-hit range behavior.


### P3b attempt1 live failure / P3a acceptance correction

502/502 tests passed, but live expired-cooldown F while paused consumed Deagle
7→6 at unchanged1:04. Evidence pause.txt/pause-confirm.txt. Prior P3a paused fire
check was masked by nextShot cooldown. Withdraw P3a criterion5 (5/7 accepted,
lost1) pending repair; P3b criterion4 remains failed. Stop expansion and preserve
attempt1 evidence. Repair adds a shared commit guard checking active controls,
buy menu, alive, freeze, equip and special lock on every attack, including burst
continuations. New regression uses expired cooldown specifically. Repeat same
purchase/fire/reload/pause/round setup in attempt2; thresholds unchanged.


## P4a card — one gameplay clock

Ready after P3b repaired integration; P3 recoil/penetration remain independent
unfinished nodes. Frozen engineering criteria four: (1) one100Hz owner advances
weapon/burst/reload, grenade/fuse, objective/round and bot updates at30/60/144Hz,
200 ticks over2s with identical scripted trace; (2) player physics gets exactly
one step per gameplay tick, preserving P1 dynamic replay, with render interpolation
only; (3) pause clears debt and queued action edges, dead-player rounds/freeze
continue their global timers, round transition aborts remaining old-round ticks;
(4) render executes once per RAF, regression/smoke/budgets pass. Deliberate50ms
catch-up bound retained. No full-match/difficulty/bot-parity acceptance implied.
Initial0/4. Evidence outputs/cs16/p4a/attempt-1. Root owns simulation clock module,
player one-tick seam, page loop/actions, tests. Input edges must queue before the
commit function, secondary/reload/drop included; buy/selection UI actions may
remain explicit project UI transactions until full input-event migration.
Pure tests use scripted action timestamps and exact counters/deadlines with1e-9
float tolerance. No claim deterministic whole AI from unseeded Math.random.


### P3b attempt2 accepted

Accepted4/4,gained4/lost0 within P3b; restored P3a paused-action criterion5,
returning P3a6/7 (burst timing still pending). Full503/503 pass, all502 prior
cases rechecked, zero final failures/unchecked unit cases; lint/build/scoped
TypeScript pass. Independent numeric review20/20 plus focused guard review8/8
passed with no blockers. Initial failing live proof remains in attempt1.

Repeat CT/High/Recruit smoke: Deagle650 +7reserve40 leaves110; F7→6; reload
6/7→7/6. After cooldown expiry, Escape at1:03 then F/V leaves7/6 and1:03.
Resume, natural combat death, enemy plant, bomb detonation/Twin andround2 receipt.
High start/prepared budgets pass with visible USP7/3737 at both transitions.
Source manifest verified unchanged. Raw evidence outputs/cs16/p3b/attempt-2.
Exact source behavior beyond labelled reconstruction remains unverified; P3c
recoil and penetration, P4 bot parity/sharedclock, P5 visuals/audio and P6 remain.
Continue into ready sharedclock work while recoil source audit is available.

## P3c card — stateful weapon accuracy and punch

Ready after shared-clock integration. Frozen source is the recoil/accuracy ledger
in CS16_REFERENCE (pinned ReGameDLL reconstruction; separately pinned compatible
Valve engine punch decay, not original-binary equivalence). Baseline fixed points
saturate and do not implement source shots-fired/recovery/stance branches.
Four criteria: (1) AK/M4/MP5 accuracy, branch precedence and capped randomized
KickBack match fixed numeric fixtures with seeded direction changes; (2) pistol
accuracy/stance, AWP states and M3 cone use source-specific formulas; (3) release
recovery, reload/deploy resets and engine-background punch decay work at100Hz
without mutating render-only state into movement authority; (4) repeated seeded
sprays/recovery at30/60/144 give matching traces, live smoke and regressions pass.
Use explicit project conversion40units/sceneunit; cone projects into world ray
basis, not arbitrary screen offsets. Root owns new weapon ballistics module,
page integration and replacement of obsolete fixed spray helpers/tests. Do not
silently preserve unused old ballistic fallback. Head/armor/range already P3b;
wall penetration still a separate missing source behavior. Initial0/4; evidence
outputs/cs16/p3c/attempt-1. Recreated audio/viewmodel animation stays presentation.


### P4a accepted result

Accepted4/4,gained4/lost0; closes P3a scheduled-delivery criterion (P3a7/7).
506/506 full regressions pass (all503 prior rechecked,0 failures/unchecked unit
cases), lint/build/scoped TypeScript pass. Independent Terra15focusedpass,
no live blocker. Pure production-clock replay200ticks at30/60/144Hz has identical
movement/fuse/objective/ammo traces and shots320/420/520ms. This does not assert
seeded wholeAI equivalence: page AI still calls unseeded randomness. Global
callback includes existing bot movement/AI timers; player movement steps once,
one render after each RAF. UI purchases/selection remain explicit transactions;
fire/secondary/reload edges queue, drop already processes per tick.

Live CT/High/Recruit: buyGlock, W/Space,V thenF20→17 (first capture18mid-burst),
pause1:23, F/Vunchanged17 andclock, resume, contactdamage100→66, normal timeout
CTwin andround2 retainedGlock17. Dead-player global-timer behavior is guarded by
source/lifecycle fixtures; this particular player survived, so no new live-death
claim. High start/prepared budgets pass with nonzero weapon viewmodel; source
manifest unchanged after smoke. Raw outputs/cs16/p4a/attempt-1/transition.*,
pause*,active*,budgets,logs and review. Root inspected originals.

Review follow-up: isolate the measurement-only movement accumulator from the
production controller to remove dormant second-clock construction. The measurement
script currently uses it, so preserve the benchmark via a harness adapter.
Continue P3c ballistic state and remaining P4/P5/P6 work without stopping.

## P4b card — correct full-team population

Baseline live HUD and source create player+4 allies versus4 opponents. Map has
five valid slots per side already. Freeze3 criteria: (1) one human+4 allied bots
and5 opposing bots on either side, each squad occupying five distinct own-side
slots; (2) attack plans assign all present attacking bots, exactly one existing
carrier unless the human carries, including round/halftime/overtime transitions;
(3) all bots have valid names/profiles/loadouts, full regressions and normal live
round/graphics transition evidence pass. Population is an exact project invariant,
not a measured original-image fidelity score. Tests cover CT/T and round indices
0–39; no stochastic tolerance for counts/IDs. Root owns roster helper, page setup/
reset, round plan and affected tests. Baseline0/3. Evidence outputs/cs16/p4b/attempt-1.
P4c economy/damage/perception parity is separate and remains unfinished.

### P3c accepted result

Accepted4/4, gained4/lost0. Full511/511 pass (three obsolete fixed-pattern/spread
cases retired with replacement formulas; source-contract fixtures updated);
zero final failures/skips. Independent final12 focused pass after fixing shared
lethal-path reset; lint/build/scoped TypeScript pass. Seeded spray/recovery traces
match30/60/144Hz in tests, not a claim of original engine RNG equivalence.
Production movement controller now has no dormant accumulator; benchmark adapter
preserves historical measurement behavior. Live CT/High/Recruit W/Space/F:USP12→11,
paused1:32 F/V leaves11/24 andclock unchanged, resume/F10, contact100→36→21,
normal CT timeout win and round2 receipt. Both transition budgets pass, USPvisible
7draw/3737tri. Root inspected original active/result images; manifest unchanged.
Evidence outputs/cs16/p3c/attempt-1. Live recoil magnitude not instrumented against
an original capture; numeric oracle is labelled reconstruction fixtures.
Continue P4b population then remaining P3d/P4 parity/P5/P6.

### P4b attempt1 regressed — graphics repair required

513/513 tests, build/scoped TypeScript passed; independent127/127 no population
blocker. Live Performance start measures135519tri,72draw: fails130000tri ceiling.
No acceptance awarded (0/3), despite corrected5v5 counts. Raw failed budget and
screenshot retained in outputs/cs16/p4b/attempt-1. Reassess rendering method:
structural visual shells use two rounded-box subdivisions across every volume;
reduce to one facet subdivision for the recreated low-poly architecture. Keep
exact collision proxies unchanged and retain visible micro-bevels. Same limits,
repeat same Performance start; affected visual shell contract gets reviewed.

## P3d card — material penetration

Freeze4 criteria using CS16_REFERENCE P3d: (1) count1/M3 stop at first wall;
AK/M4/Deagle at most one exit, AWP two; (2) material power/damage table and finite
AABB thickness/distance guards match fixed numeric fixtures; (3) range/damage
carry sequentially between entries and target, no double full-distance falloff,
nonfinite/repeated/too-thick exit stops; (4) page uses the resolver for all
materials with target-first occlusion ordering, regressions/live smoke pass.
Baseline single wooden exit grants pistols/MP5 continuation and cannot handle
multiple walls. Project AABB approximation is frozen, not original equivalence.
Root owns new penetration module/page integration/obsolete wood helper removal
and replacement tests. Initial0/4; outputs/cs16/p3d/attempt-1. Keep geometry and
thresholds unchanged. Execution after P4b candidate acceptance.

### P4b attempt2 improved but failing

0/3 accepted;513/513 full tests pass and independent127focused+delta review
pass. Performance start122847tri, High122975 pass, but round2 preparation
measures130541tri and fails130000 limit as bots equip primaries. Normal round
W/Space/F, pause, Cobra killed human, plant/detonation and5v5 reset verified.
Root inspected result originals; no acceptance awarded. Both failed attempts
retained. Reassess after two nonaccepted candidates: start-only geometry forecast
missed round2 weapon costs. Third bounded repair removes rounded bevels from
horizontal floor slabs only (flat floors need no rounded tessellation), keeping
wall/door bevels, exact proxies and unchanged130000 threshold. Verify both start
and prepared budgets before claiming acceptance. outputs/cs16/p4b/attempt-3.

### P4b attempt3 accepted

3/3 accepted,gained3/lost0,513/513 tests passed,0fail/skips; build/lint/scoped
TypeScript passed. Independent population127/127 and both rendering-repair
reviews no blockers. Actual Performance start119871tri/prepared127565tri;High
start119999, all pass. Normal CT/Performance/Recruit W/Space/F12→11,pause0:53
F/Vunchanged, resume,Cobra kills player,bomb recovered/planted/detonated,Twin,
round2 five hostiles/five squad, starter12/24. No fast-forward used. Both
Performance transition snapshots show USPvisible7draw/3737tri. Root inspected
raw active/contact/result images and manifest unchanged. Viewport changed with
app layout during final capture; this is functional proof, not pixel comparison.
Halftime roster fixture coversCT/T rounds0–39; full live halftime remainsP6.
Evidence outputs/cs16/p4b/attempt-3.

## P4c card — shared damage and armor resolution

Baseline bot damage uses extra ally/enemy multipliers and random damage variance,
while player shots bypass bot armor entirely. Freeze3 criteria: (1) connected
bullets use the same weapon/range/hitgroup and armor functions for human/ally/
enemy targets, including each M3 pellet; (2) target health/armor/helmet resolve
sequentially before elimination, bot fields initialize/reset honestly to0/false
until separate economy work, frag bot armor uses shared explosion resolver;
(3) no live prototype damage scale/variance helper remains, regression/normal
smoke pass. AI reaction and aiming probabilities remain distinct AI behavior,
not source-perfect spread parity; that remains follow-up. Existing self-frag
modifier and C4 blast population are outside this bounded bullet-damage card.
Use fixed independent fixture inputs across all11 weapons/head/torso/stomach/leg
and armor0/1/100, no count/noise tolerance. Root owns shared damage helper/page
impact paths/tests; baseline0/3; outputs/cs16/p4c/attempt-1.
EOF
### P3d accepted

4/4 accepted,gained4/lost0;515/515 full tests pass,0fail/skips; obsolete wood
shortcut fixtures replaced by material/count/rounding/guard fixtures. Independent
140focused pass; lint/build/scoped TypeScript pass. Normal CT/High/Recruit buy
Deagle650 leaves150; W/Space/F7→6; pause0:56F/V unchanged6/0; resume, contact
health100→44→22, normal timeoutCTwin andround2receipt. No live wall-damage
number is inferred from screenshots; fixed fixtures establish numerical cases.
High transition budgets pass, USPvisible at start/prepared; root inspected
originals and candidate manifest unchanged. outputs/cs16/p3d/attempt-1.
Continue shared damage and bot economy/perception before visual/final gates.

## P4d card — bot economy and survivor inventory

Freeze4 criteria: (1) every bot has a capped wallet; all firearm/ammo/armor/kit/
utility purchases use the same prices/transactions as the human, with no free
primary or kit grant; (2) surviving inventory/ammo/armor persists, death resets
inventory only, halftime/new-match/overtime reset both inventory and bank to
shared prepared values; (3) shared round/kill/plant/defuse rewards apply exactly
once to each eligible bot, no negative bank; (4) fixed economy scenarios and
normal gameplay/transition/regressions pass. Baseline wallets absent and every
round grants free loadouts. Buy policy is deterministic project AI, not original
bot behavior. Starting pistol uses shared starter ammo. Utility deployment and
weapon action/aim parity remain following scope. Root owns bot-economy module,
page bot fields/reset/reward seams and tests. Initial0/4; evidence
outputs/cs16/p4d/attempt-1. Reference existing shared P3b price/reward/round helpers.

### P4c accepted

3/3 accepted,gained3/lost0;517/517 full tests pass,0fail/skips. Independent127
focused pass,0 blockers; build/scoped TypeScript/lint pass after unused test
import cleanup. Old actor-scaled damage expectation retired with shared per-pellet
armor fixtures. Normal CT/High/Recruit buysKevlar650 ($150,armor100), W/Space/F
USP12→11, pause0:51F/Vunchanged, combatdeath witharmor75, normalplant/detonation
T win andround2reset. High transition budgets pass USPvisible7draw/3737tri. Root
inspected originals and manifest unchanged. outputs/cs16/p4c/attempt-1. Bot armor
starts0 pending economy; AI aim/weapon timing and grenade self-damage/C4 population
remain explicit follow-up, not accepted as full combat parity.

## P4e card — fair visual acquisition

Freeze3 criteria: (1) both squads acquire only living opponents within weapon
sight range and120-degree view cone, with clear world/body/smoke line and no
active blindness; no aiming toward current hidden coordinates before acquisition;
(2) nearer hidden targets do not mask farther visible targets, target absence
clears direct-contact state and leaves only expiring remembered/heard/radio
positions; (3) paired occlusion/cone/blind tests and live/regression checks pass.
Baseline hostile aim turns toward the human before LOS and leaves a fallback
human target when visibility resolvesnone; ally chooses nearest without filtering
visibility first. Cone120degrees is an explicit project AI parameter, not a
measured original bot value. Root owns shared contact predicate/selector and
page sight integration/tests; initial0/3; outputs/cs16/p4e/attempt-1. Existing
hearing/radio expiries remain; general team noise and weapon mechanics follow.

### P4d accepted

4/4 accepted,gained4/lost0;522/522 full tests pass,0fail/skips; independent126
focused pass,0 blockers; build/lint/scoped TypeScript pass. Initial single-player
settlement sourcecontract updated to separately require one player payment and
one per-botloop. Normal CT/High/Recruit W/Space/F12→11, pause0:25F/Vunchanged,
contact100→32/death, recoveredC4plant/detonation,Twin,next-round5v5. Initialbots
CTbank0/Tbank90 afterarmor/ammo. Three postbuy ledgers independently checked:
Viper990+3500−1000armor−20ammo−800utility=2670, retained12mag; Mira1400−350helmet
−25ammo−800utility=225; Gale same less200kit=25. The3second payout-only screen
was missed; settled.* contains postbuy data, not an isolated payout observation.
High prepared123035tri passes; start/prepared USPvisible. Root inspectedoriginals
and manifestunchanged. outputs/cs16/p4d/attempt-1/live-ledger-check.json and raw
pre-result/prepared. Exacthalf/overtime wallets proven in fixtures, not live
fullmatch. Weaponfallback/action parity and generalutility deployment remain.

## P4f card — bot ammunition and action timing

Frozen three criteria: (1) both squads schedule shots no faster than the shared
firearm interval, including aggression and burst randomness; (2) exhausting both
primary magazine and reserve switches once to the owned pistol after an equip
lock, preserves primary ownership/ammo through survival, and never creates ammo;
(3) both squads use shared magazine completion and M3 start/insert/pump phases,
with no empty-weapon reload/fire spin. Reference: existing pinned firearm table
and weapon-special-actions timings; equip delay remains project policy. Baseline
semi and burst factors can undershoot the interval; exhausted primaries stall;
M3 reload lacks start/pump phases. Root owns bot-economy, shared bot-weapon helper,
page adapters and tests. Three exact invariants, initial0/3; independent focused
checks, full regression and real-time smoke. outputs/cs16/p4f/attempt-1. This
accepts these weapon constraints, not complete bot recoil/aim or original fidelity.

### P4e accepted

3/3 accepted, gained3/lost0. Review caught stale patrol facing; repaired before
acceptance using initial route direction and actual no-contact velocity. Full525
checks pass; independent135 focused pass; lint/typecheck/build pass. CT High
Recruit normal real-time round: movement/jump/fire12→11→10, pause1:36F/V unchanged,
visible ally, player47→death, bot combat, recovery/plant/detonation, round2receipt
CT0–1T. High start121855/prepared124675tri pass, both visible USP7draw3737tri.
Manifest verified unchanged; root inspected raw originals. Occlusion/cone/blind
boundaries are fixture evidence, not inferred from the live screenshot. Exact
original equivalence unverified; general hearing and remaining bot mechanics
still unchecked. Evidence outputs/cs16/p4e/attempt-1. Continue P4f.

### User-requested stop / handoff

User explicitly requested “Stop and hand off.” Execution stopped. Read
[HANDOFF_CS16.md](HANDOFF_CS16.md) before resuming. Last accepted P4e3/3. P4f
implemented and automated/reviewer checks pass (530full/18focused), but remains
unaccepted pending complete raw live-QA review. Current page paused at round2;
handoff DOM has bomb-detonation receipt, without final screenshot/budget pair.
No completion claim, no automatic continuation or deployment.


### P4f accepted on resume — 2026-09-14

User resumed implementation. 126/126 source hashes match the frozen prior
candidate before and after runtime QA. Independent Terra p4f_verify reran18
focused checks:18pass,0fail/skips, no source blockers. Prior530 full checks and
lint/scoped TypeScript/build retained on the unchanged candidate, not rerun.
Normal CT/Performance/Recruit1280x720: W/Space, F USP12→11→10→9, R9/24→12/21;
pause1:33 F/V unchanged12/24 and clock. Close living ally captured; bot-on-bot
kills observed. Human survived, no new human damage/death claim. Plant/detonation
and round2 CT0–1T receipt captured in paired originals/DOM; Performance budgets
play-start119871tri/72draw, round-prepared recorded in transition-budget.json,
both within ceilings with visible USP7draw/3737tri. Root inspected originals;
console clean. Accepted3/3, gained3/lost0,0failed/18rechecked focused cases.
Evidence outputs/cs16/p4f/resume-1 plus unchanged attempt-1. Full fidelity,
1080p FPS and fullmatch remain unchecked. Continue P4g.

## P4g card — opposing-team sound memory

Freeze four criteria. Project approximation, retaining existing scene-unit noise
radii/lifetimes; no original bot claim. (1) Committed player and both squads'
shots and non-silent footsteps emit finite snapshots of position/side/time;
bot emission is independent of human proximity, volume, or survival. (2) Both
squads receive only opposing-side sounds strictly inside radius after emission
and before expiry, newest audible event wins (distance then event ID break ties),
invalid/future/expired and already-consumed events ignored. At100Hz sounds become
available on the next tick. (3) Hearing supplies expiring search memory only;
no hidden current coordinates or fire permission, and reaching the remembered
point does not re-arm the same sound. (4) Round reset clears events and per-bot
hearing state; sight, player audio, weapon timing, and normal-round regressions
pass. Preserve player defuse sound as an objective event. Bot objective emission
is included at action start to avoid player-only sound behavior.

Baseline0/4: only playerNoise globals/registerPlayerNoise; enemies consult them,
allies lack sound investigation; bot steps are player-audio-only. Later quiet
sounds can be discarded while longer player memory remains. Preserve baseline
page in outputs/cs16/p4g/attempt-1 for paired source-contract checks. Inputs:
CT/T-swapped fixture positions, distance radius−epsilon/equal/+epsilon,
emission/expiry boundaries, movement/death of source after emission, repeated
poll and reset. Exact outcomes, no stochastic tolerance. Footsteps retain18
run/9walk scene units,1.15/.7s; bot speed>0.45 emits at existing cadence with a
separate AI clock. Root owns app/bot-hearing.ts, page adapters, hearing tests,
reference/plan/evidence. Terra independent review; targeted perception/audio/
weapon/round tests plus normal live smoke, then milestone full checks. Candidate
identity is source manifest; evidence outputs/cs16/p4g/attempt-1. Utilities,
recoil/aim parity, and complete-match scenarios follow separately.


### P4g accepted — 2026-09-14

Accepted4/4, gained4/lost0. Known-defect integration test fails preserved baseline
0/1, passes candidate. Full538/538pass, independent Terra151/151focused pass,
0fail/skips, lint/scoped TypeScript/build pass. Normal CT/High/Recruit1280x720
W/Space/F12→11, pause1:27F/Vunchanged11/24, player killed by Mako, living ally and
continued spectator simulation, plant/detonation and round2CT0–1Treceipt.
High start119999tri/76draw and prepared123035tri/76draw pass; both visible
USP7draw/3737tri. Root inspected raw originals/DOM; manifest unchanged. Evidence
outputs/cs16/p4g/attempt-1. Specific hearing branches use fixture/source evidence;
no acoustic fidelity or1080pFPS claim. Continue shared explosive effects.

Evidence correction: capture helper retained the prior directory binding,
overwriting some P4f originals with P4g captures. Moved those captures to P4g,
recorded exact impact in p4f/resume-1/evidence-correction.md, and changed helper
to explicit destination plus exclusive-create files. Do not cite missing P4f
filesystem originals. P4f3/3 revalidated on this P4g candidate: weapon adapters
unchanged,538full/151independent checks include P4f, complete new live round
and original transition evidence now retained correctly.

## P4h card — shared explosive effects and death settlement

Freeze four project-invariant criteria. (1) HE uses one damage/cover/armor path
for player and both bot squads: opponents and source self can be hit, other
same-side actors cannot (friendly fire off). Remove human-only0.58self scale.
(2) Flash affects every living actor with shared24radius/3.2smaximum exposure,
facing and world occlusion; no bot-only2.6cap or teammate immunity. (3) C4 affects
all living actors with shared24radius/500max damage even after human death,
with no personal kill/reward. (4) Each affected actor dies/drops/credits once;
settle team elimination only after the entire HE blast; C4 retains bomb-detonated
round priority. Source-owned HE credits grenade reward only for opposing victims,
including posthumous throws; self/world kills earn none.

Retain current project falloff exponent1.35, HE9radius/115maximum and cover0.35;
these are approximations, not sourced original blast equivalence. Damage points
use1.1scene units above feet for all actors; flash uses authoritative player aim
and bot aimYaw. Initial0/4: playerHE self scale, only enemies in HE list,
owner-selected bot flash list and human-only C4 path. Freeze paired baseline
page at outputs/cs16/p4h/attempt-1/baseline-page.tsx. Exact CT/T-swapped equal-pose
fixtures, self/friendly/opponent/dead cases, cover/radius/armor and simultaneous
casualty cases; no stochastic tolerance. Root owns app/grenade-effects.ts,
page effect/death/owner adapters and tests. Preserve current projectile cap/
AI throw behavior until P4i owned-utility package. Independent Terra review,
affected combat/round/economy/perception checks plus real-time smoke, graphics
budgets. Candidate source manifest; outputs p4h/attempt-1. General utility
deployment, bot aim/physics parity, P5 and P6 remain separate.


### P4h accepted — 2026-09-14

4/4accepted,gained4/lost0; known-defect baseline0/1 fails, candidatepasses.
Full546/546pass, independentTerra143/143pass, lint/scopedTypeScript/buildpass.
Two obsolete death-route source contracts initiallyfailed: updated to require
bullet/HE/C4 converge on one cleanup instead of three duplicated paths; all
rechecked pass. CT/Performance/Recruit1280x720 live: buyHE/flash500total, W/Space/
F12→11, pauseF/Vunchanged, flashthrow/detonation (peakblindness uncaptured),
HEself health100→8, later opponentkill/spectator, timeoutCT1–0T/round2reset.
start 119871tri/72draw; transition 125751tri/72draw; both pass with visible USP7draw/3737tri.
No live C4 detonation in this round; complete-population/credit/priority criteria
use fixture/source evidence with general live integration. Root inspected
originals, console clean, manifest unchanged; outputs/cs16/p4h/attempt-1.
All546regressions rechecked,0failed/skipped; originalfidelity/fullmatch unchecked.

## P4i card — owned utility deployment for both squads

Freeze four exact project criteria. (1) Both squads choose owned HE/smoke/flash
from a visible or expiring remembered position; no human-survival/proximity or
hidden-current-position input. (2) A380ms windup snapshots the target; source
death/blindness/reload/objective lock cancels it. Inventory decrements once only
after successful projectile insertion; capacity/invalid-target failures retain
inventory. (3) Both squads and player share at most2active projectiles and at
most2smoke clouds including in-flight smoke reservations; matching grenades share
fuse and physics. A4s successful/1s failed bot retry cooldown prevents rapid
utility spam. (4) Reset clears all pending utility state; weapon fire/movement
respect windup; shared effects/death/economy/perception and live checks pass.

Project AI policy: require finite target distance5–20sceneunits and0.55s direct
sight or positive remembered duration. Use HE first within16; use smoke at7–20
when suppressed>=0.35 or no direct sight; otherwise flash with direct sight at
5–14. All choices require owned inventory. The common lob has verticalspeed4.1,
fixed1.5sflash/1.85sHE/1.45ssmoke fuse; choose horizontal speed from targetdistance
and the ballistic landing time at targetheight, capped12.5. These are explicit
approximation choices, not original bot measurements. Smoke visuals remain
bounded without discarding inventory if the cap is full.

Baseline0/4: only enemy flash, only targethuman, consumption before a rejectable
launch, bot HE/smoke unused, ally utilitiesunused. Root owns app/bot-utility.ts,
page insertion/AI/pending-state integration, replacement tests and obsolete
player-only flash helper/test removal from game-rules. Pure fixtures and saved
baseline page contract, independentTerrareview, affected regression and normal
live play. Evidence outputs/cs16/p4i/attempt-1; manifest freezes candidate before
live review. P4j remaining aim/physics/full-match parity, P5/P6 remain.


### P4i accepted — 2026-09-14

4/4accepted,gained4/lost0. Baseline known-defect0/1expectedfail; full553/553pass,
independentTerra160/160pass, lint/scopedTypeScript/buildpass, manifest136unchanged.
Initial552/553 failed only an obsolete economy source contract expecting
pre-launch flash consumption; replaced with shared inventory/launch contract.
Normal CT/Performance/Recruit1280×720 W/Space/F12→11; playerdeath/livingally,
pause1:37F/Vunchanged; round1timeoutCT1–0T, round2eliminationCT2–0T, round3
eliminationCT3–0T receipts. PlayerHE accepted round2; visible smoke round4.
Bot inventory purchases observed; no bot throw captured, so specific selection/
consumption/cancellation branches use fixture/source evidence. Start119871tri/
72draw; prepared126911 and127927tri/72draw allpass, visibleUSP7draw/3737tri.
Consoleclean. Root raworiginalreview/evidence outputs/cs16/p4i/attempt-1.
Long lobs explicitly cap-limited, may bounce/detonate short. No originalbot,
perframeFPS/fullmatch acceptance. Next P4j geometric botshots, then remaining
weapon/movement parity, P5/P6.


## P4j card — geometric bot shots (project approximation)

Freeze4criteria. (1) Both squads' committed firearm shots sample each pellet
from independent seeded shared weapon-ballistics state using actual aimYaw,
vertical aim at confirmed contact, current speed, recoil and a shared skillcone.
No Bernoulli hit grants or random hitgroup selection. (2) Actual nearest ray
intersection determines world block, character hitgroup and tracer endpoint;
same-side actors block without damage. Existing bot hitproxies retained; human
receives a documented analytical body cylinder/head sphere at authoritative
feet/current crouch height. (3) Pellet damage flows through shared range/armor
resolver, applies all shot casualties once before team elimination; humanalive
is only relevant to human collider, not bot combat. Direct visual acquisition/
fire permission unchanged; remembered positions do not permit shots. (4) Perbot
seed+same shot/tick inputs reproduces rays, resets on round; reload/switch resets
weapon accuracy; full regression, normal live and budget checks pass.

Human proxy approximation: cylinder radius0.30,height0.8×h; spherecenter0.9×h,
radius0.1×h; h standing1.8/crouched1.2, feet from authoritative eye-anchor minus
1.68. Cylinder hitheight/h<0.36leg,<0.54stomach,otherwise torso. Coneadditional
recruit0.055/standard0.025/veteran0.01 plus max(0,1-aimSkill)×0.025 and
clamped suppression×0.035, shared across squads/targets. Bot base pitch aims
0.25unit below observed contact point; no silent auto-scope/silence/burst.
Fidelity is not claimed. Direct world obstruction only in this slice: shared
penetration and bot special-action decisions remain P4k, with movement/difficulty
reaction and shooter-limit parity still remaining. Match-wide random choices
are not made deterministic here.

Baseline0/4: Bernoulli pellets, untraced tracer offsets, actor-type hitgroups.
Root owns app/bot-shot-resolution.ts, page shot/state/trace/death adapters,
obsolete getEnemyHitChance/getEnemyPlayerHitGroup/scaleEnemyPlayerHitChance and
associated test removal/replacement. Baseline page frozen outputs/cs16/p4j/
attempt-1/baseline-page.tsx; seeded ray/proxy/occlusion/FF/pellet fixtures and
integration contracts, independentTerrareview. Source manifest freezes before
runtime. P4i acceptedcandidate retained in its manifest; no thresholds widened.


### P4j accepted — 2026-09-14

4/4accepted,gained4/lost0. Baseline0/1expectedfail; full560/560pass, independent
Terra172/172pass, lint/scopedTypeScript/buildpass; manifest138unchanged. Two
obsolete hearing/deathcall sourcecontracts updated to sharedshot adapter after
initial558/560; allrechecked. Live CT/High/Recruit1280×720 W/Space/F12→11,
alivepause1:38F/Vunchanged, resumedF→10, close livingally, bothsquads' killfeeds,
plant/detonationCT0–1T/round2receipt. Human survived, no humanbulletdeath runtime
claim. Sharedproxy/death fixtures pass. Start119999tri/76draw and transition
124195tri/76draw pass, visibleUSP7draw/3737tri.
Consoleclean, rootraworiginals outputs/cs16/p4j/attempt-1. Originalequivalence,
perframeFPS/fullmatch and remainingparity notaccepted. Continue sharedpenetration.


## P4k card — shared bot bullet penetration

Freeze3criteria, exact project/source reconstruction alreadypinned P3d. (1) Both
bot squads route every pellet through existing tracePenetratingBullet material/
wall-exit/range rules: thinwood successes, count-one/thickmetal/repeatedcollider/
range failures equalplayer. No targetmemory firing permission. (2) Every callback
uses absolute near/far for world/bot/human hits; analyticplayer selects nearest
valid root within interval; localraybounds restored perpellet. Friendlybodies
remain terminal withoutdamage, worldwins ties; firstpellet tracerends atfirst
physicalcontact even if penetration laterhits. (3) Bothplayer/bot armoruse one
rawbulletdamage sink without applyingrange/hitgroup twice; sequentialpelletarmor
and batchdeathsettlement remain, normalreal-time round and regressionpass.

Root owns pagecommitBotShot tracecallback/playerdamagesink, combat-damage raw
primitive replacing obsolete connected-pellet granthelper, analyticalproxyinterval
extension, affected/new tests. Preserve penetrationrules/constants and aim/
perception. Baseline lacksbotpenetration0/3; page saved p4k/attempt-1. Pairedpure
thinwood/metal/thickness/range/FF/walltie/proxyinterval fixtures and known-defect
sourcecontract, independentTerrareview, fulltests/lint/type/build andnormal
CT/Performance/Recruit1280×720 round/budgets. Candidatehashmanifest beforelive.
Botweaponmodes, remainingreaction/shooter/movementparity, P5/P6remain.


### P4k accepted — 2026-09-14

3/3accepted,gained3/lost0. Baseline0/1expectedfail; full565/565, independentTerra
177/177, targeted21/21pass; lint/scopedtype/buildpass. Source139manifestunchanged.
LiveCT/Performance/Recruit1280×720: buyDeagle650, W/Space/F7→6, alivepause1:38F/V
unchanged6/0, additionalF→5, livingally andbothsquadkillfeeds, plant/detonation
CT0–1T/round2receipt. Start119871tri/72drawUSP7draw/3737tri; prepared125715tri/
72drawDeagle7draw/3745tri, bothpass. Human survived; controlledwallbangs rely on
pairedfixtures/sharedsource, notclaimedlive. FourconsoleHMRerrors13:00:08during
module rename predatefreshreload/live-start13:02:11; zeroerrorsduringlive.
Rootoriginalreview outputs/cs16/p4k/attempt-1. Continue AWPscope thenremaining
weapon/difficulty/movementparity andP5/P6.


## P4l card — bot AWP scope and aim hold

Freeze4criteria. (1) Both squads own the shared createWeaponSpecialActions clock:
AWP firststage only,300msreadylock, committedshot unzoom and1450ms auto-resume;
never start a new zoom while resumepending. Scopedstate drives sharedspread.
(2) Approximate AIpolicy: confirmedvisiblecontact≥0.25s at≥8sceneunits requests
an aimhold if active/alive/unblinded and no reload/utility/objectiveaction.
Hold stops movement so the rifle can settle; initiate scope only speed≤0.08 and
fire/equipcooldown≤0. Thisexplicit hold is needed because existing ally movement
rarelystops. Bothsquads continueaimtrackingwhileheld. Withthisscopeintent fire
waits forscoped+ready; at closerange existingunscopedcombatremainspossible.
(3) Scopeisnot targetpermission; no/directlostcontact releaseshold and preserves
completedzoom/normal autoresume. Existingfiring LOS/reaction/ammo gates remain.
Cancelpendingon reloadstart/exhaustedswitch/death; roundreset clearsallmode state.
(4) Deterministicdeadline/policy/resetfixtures, baselinedsourcecontract, affected
regressions andnormalround/budgetcheckspass. No extraparallel timer orinstantzoom.

SharedtimerreferencealreadyP3b/P3d. AIrange/hold/sight thresholds are explicit
projectapproximations, notoriginalbotmeasurements. Rootowns bot-weapon-actions
scopeadapter, page perbotstate/movement/fire/reset/shot adapters andtests. Freeze
baselinepage outputs/cs16/p4l/attempt-1, initial0/4newcapability. IndependentTerra
review, full/lint/scopedtype/build andnormalCT/High/Recruit1280×720 round.
Glockburst/silencerdecisions, generalmovement/difficultyparity andP5/P6remain.


### P4l accepted — 2026-09-14

4/4 accepted; gained4, lost0. Baseline source contract0/1 expected failure,
full571/571, independent196/196, targeted28/28, lint/scoped TypeScript/build pass.
Manifest140 unchanged. Initial full570/571 caught a whitespace-bound perception
contract after ally aim tracking moved; corrected and all rechecked. Normal live
CT/High/Recruit1280×720: W/Space, F12→11, alive pause1:37 unchanged under F/V,
resumed F→10, visible living squad/close ally, both-squad kills, plant/detonation
CT0–1T and automatic round2 receipt. Start119999tri/76draw; prepared123515tri/76draw,
visible USP7draw/3737tri, both pass. Human survived. Bot scope not encountered in
pistol round; specific timing/cancel branches covered by fixtures/source review.
Four historic13:00:08 HMR console errors predate fresh13:10:02 reload; no live errors.
Evidence outputs/cs16/p4l/attempt-1. P4 remaining modes/difficulty/movement, P5/P6
and original equivalence unchecked. Continue Glock burst adapter.

## P4m card — bot Glock burst mode and continuations

Freeze4 criteria. (1) Both squads select Glock burst once on eligible direct
contact at5–18 scene units and sight≥0.25s, alive/active/unblinded, no reload,
utility/objective, with settled fire/equip cooldown; retain selected mode until
round reset, like the player's weapon mode. This AI selection is a project
approximation. Use shared secondary300ms lock; no instant toggle or private timer.
(2) Opening shots use shared committedShot and two continuations at+100/+200ms,
continuation=true never requeues. All shots consume one cartridge, shared burst
spread, penetration/damage/noise/tracer; opening fire cooldown at least500ms.
(3) Continuations require the same living directly visible target ID, current
LOS/range/facing, active/alive/unblinded shooter, no reload/utility/objective,
and ammo. Loss/change/invalidity cancels queue. Continuations bypass opening
reaction/cooldown/quota only after legal burst acquisition; they do not decrement
AI engagement-burst counters. Pending special queue counts as active shooter.
(4) Existing reload/switch/death/reset clear special queue and its target; utility,
objective, lost contact and empty ammo also clear pending queue. Deterministic
mode/deadline/ammo/cancel fixtures, baseline contract, independent review,
affected/full checks and normal CT/Performance/Recruit1280×720 round/budgets pass.

Baseline lacks bot burst mode/follow-ups (0/4), page copied to
outputs/cs16/p4m/attempt-1 before edits. Root owns bot-weapon-actions helper and
page mode/target/shot adapters plus tests. Keep shared special clock unchanged;
AWP and existing rifle AI burst counters remain distinct. Source manifest freezes
before review/runtime. Silencers, difficulty/movement parity and P5/P6 remain.


### P4m accepted — 2026-09-14

4/4 accepted, gained4/lost0. Baseline0/1 expected failure; targeted26/26,
full578/578, independent203/203, lint/scoped TypeScript/build pass. Manifest141
unchanged. Normal CT/Performance/Recruit1280×720 round: buy Glock400, V/W/Space/F
20→17, pause1:38 F/V unchanged17/0, resume/F→14, close living ally, human bullet
damage100→43, bot ammo/reserve consumption, squad elimination CT1–0T and round2
receipt. Human survived. Exact bot burst timing/cancellation fixture/source proof;
player burst captured live. Start119871tri/72draw USP7draw/3737tri; prepared
122959tri/72draw Glock7draw/3689tri, both pass. Four historic13:00:08 HMR errors
predate fresh13:15:33 reload; no live errors. Evidence outputs/cs16/p4m/attempt-1.
Silencers, remaining difficulty/movement parity, P5/P6 and original equivalence
unchecked. Continue silencers.

## P4n card — bot-owned USP/M4 silencers

Freeze4 criteria. (1) Both squads attach an owned USP/M4 silencer once while
active/alive, with no direct contact or positive combat memory, no reload,
utility/objective action, and fire/equip cooldown≤0. Movement remains allowed,
as for the player: a stationary-only policy would starve on the current patrol
routes. This quiet-contact decision is a project approximation. Shared secondary
locks are USP3000ms/M42000ms; completed attachments persist until round reset.
Contact arriving during adjustment cannot bypass the lock. Existing reload,
switch/death/reset paths cancel or clear state with the shared semantics.
(2) One silenced boolean per committed bot shot drives spread, penetration
(including existing USP30/M433/range branches), hearing radius×0.45, local shot
audio×0.35 and zero muzzle flash. Both squads share the same adapter.
(3) Bot USP/M4 models receive a barrel-aligned cylinder using the existing metal
palette, no textures; visibility tracks attachment state after decisions and
lifecycle changes. It is cosmetic and not a hit or world collider. Existing
preset graphics ceilings remain unchanged. (4) Paired baseline/source and
state/deadline/cancellation tests, independent review, full regressions,
CT/High/Recruit1280×720 normal round and transition budgets pass. Root visually
inspects attachment placement; use live read-only diagnostics if necessary.

Root owns bot-weapon-actions silencer policy, page world visual/shot/audio/AI
adapters, tests. Baseline0/4 lacks bot silencers; preserved page under
outputs/cs16/p4n/attempt-1. Shared weapon-special-actions/penetration constants
unchanged. No exact original sound or animation claim. Candidate manifest before
review/runtime. Difficulty/movement parity, P5/P6 remain.


### P4n accepted — 2026-09-14

4/4 accepted, gained4/lost0. Baseline0/1 expected failure; targeted23/23,
full583/583, independent208/208, lint/scoped TypeScript/build pass. Manifest142
unchanged. CT/High/Recruit1280×720 complete round: W/Space/F12→11, pause1:37 F/V
unchanged, resume/F→10, all4allied USP silencers ready/visible in diagnostics,
close side view shows barrel alignment, both-squad kills, timeout CT1–0T/round2
receipt. Start119999tri/76draw; prepared123663tri/76draw, visibleUSP7draw/3737tri,
both pass. Additional partial round2: ally2M4 attachment readyfalse→true, visible
model inspected while spectating GALE, M4 killfeed. Human MP5 death/spectate and
later bot FRAG kill after human death also observed; paused0:51, no second-round
completion claim. Detailed original visuals/acoustic equivalence unchecked.
Four historic13:00:08 HMR errors predate fresh13:21:16reload; no live errors.
Evidence outputs/cs16/p4n/attempt-1. Continue actor-neutral difficulty settings.

## P4o card — actor-neutral difficulty reaction and firing limits

Freeze3 criteria. (1) Both squads and all target actor types use identical
getBotReactionTime/getBotActiveBurstLimit functions. Preserve project difficulty
values: Recruit reaction×1.35/2 simultaneous bursts, Standard×1.10/2,
Veteran×1.00/3. Weapon/profile reaction remains unchanged. Values are existing
project difficulty approximations, not original CS bot measurements.
(2) Remove enemy human-target-only branch, ally fixed+0.12s reaction and
activeAllyShooters+1 offset. An empty squad admits exactly its limit of new
engagement bursts, then rejects the next. Pending Glock continuations retain
occupancy and existing continuation legality. No change to geometric aim,
LOS/memory, blindness, ammo, utility, objective or special-action gates.
(3) Baseline contract must fail against preserved page; numerical and quota
fixtures plus both-loop source contract pass. Independent review, affected/full
regressions and normal CT/Performance/Recruit1280×720 round/budgets pass.

Root owns game-rules helper/tuning names, both page reaction/quota call sites,
updated/new tests. Preserve baseline page at outputs/cs16/p4o/attempt-1 before
edits (0/3 shared-behavior criteria). Retire old actor-specific helper names;
no compatibility wrappers. Manifest freeze before review/runtime. Movement
parity and P5/P6 remain.


### P4o accepted — 2026-09-14

3/3 accepted, gained3/lost0. Baseline0/1 expected failure; targeted121/121,
full586/586, independent211/211, lint/scoped TypeScript/build pass. Manifest143
unchanged. Normal CT/Performance/Recruit1280×720: W/Space/F12→11, alive pause1:27
F/V unchanged, resume/W/F→10, close living ally, both-squad kills, planted bomb
and detonation CT0–1T/round2 receipt. Human survived. Start119871tri/72draw;
prepared124067tri/72draw, USP7draw/3737tri, both pass. Four historic13:00:08 HMR
errors predate fresh13:27:18 reload; no live errors. Exact reaction/quota equality
proven by fixtures and shared call sites, not outcome comparison. Evidence
outputs/cs16/p4o/attempt-1. Architecture wording now explicitly records the
existing2/2/3 simultaneous-burst allowance already frozen in the P4o card;
this is a documented project approximation, not original fidelity. No numeric
threshold changed after freeze. Continue grounded horizontal movement parity.

## P4p card — shared grounded horizontal bot movement

Freeze4 criteria. (1) Replace the independent bot acceleration10/braking14/cap5.8
solver with an adapter calling the live player's stepHorizontalVelocity. Equal
finite velocity, desired direction/requested speed, active weapon/scoped mode,
and timestep produce the same result (absolute component tolerance1e-12).
The player runtime chain is page.playerMovement.step → player-physics →
stepHorizontalVelocity; this is the production primitive, not a historical helper.
(2) Maximum requested speed is min(AI desired-vector magnitude, getWeaponMoveSpeed
for the active weapon/scoped state). Scoped sniper ceiling3.75×0.58=2.175.
Zero desired direction uses shared friction; invalid numbers/deltas are sanitized
with the shared behavior. Test16/33/50ms deltas and fixed100Hz replay. Existing
slower AI route/combat requests remain intentional decisions.
(3) Both squads and all4 steering/braking sites use the adapter. Retain path
selection, waypoint/recovery/collision sliding, blockedSeconds, and authoritative
velocity/acceleration writes for animation/footsteps. Old physical solver and
physical rate overrides are removed; retained pose normalization constants are
explicitly named as visual references. (4) Baseline comparison/source contract,
paired velocity/cap fixtures, affected navigation/animation/physics tests, independent
review, full regressions and CT/High/Recruit1280×720 normal round/budgets pass.

This is a ground-only project approximation; original bot movement reference is
not measured. Root owns bot-locomotion solver adapter and page4 call sites,
replacement movement tests. Baseline page and bot module preserved in
outputs/cs16/p4p/attempt-1 before edits,0/4. Source manifest before review/runtime.
Bot vertical/hull/air/stance behavior remains a separate parity package; no
claim that this horizontal slice completes P4. P5/P6 remain.

### P4p attempt1 regression and bounded attempt2 amendment

Attempt1 is improved-but-failing,3/4 functional criteria provisionally measured;
not accepted while criterion4 performance/live proof is incomplete. Targeted144,
independent159 pass; source144-file manifest unchanged. Known-defect page0/1
expected failure; paired first50ms velocity old0.5/new2/player2, braking
old3.3/new3.2/player3.2. Full suite588/589 twice, single existing8-bot
presentation p95 failure:0.6004ms then0.5743ms vs unchanged<0.5ms. Isolated
0.5250ms also failed; profiled measurement0.5591ms is diagnostic only. Raw
logs retained. Benchmark and its six direct source modules match P4o hashes;
P4p movement solver/page is not invoked by that benchmark. This establishes
unchanged workload, not a claim that the timing failure is harmless.

Reassessment: CPU profile attributes42.271ms self-time to writeFootPlantNormals,
including general Math.hypot at every influenced leg vertex. Expand owned boundary
for attempt2 only to character-limb-deformation.ts normalization arithmetic and
one output-equivalence regression test. Preserve attempt1 manifest/review; fresh
attempt2 manifest/review required. New baseline copied before edits in
outputs/cs16/p4p/attempt-2 (runnable copy changes only local import resolution).
Keep all4 original acceptance criteria and every threshold. Use sqrt of squared
length for ordinary finite nonzero normal lengths, retaining robust hypot for
under/overflow. No geometry topology, positions, normal direction, contacts,
resource counts, or animation policy changes. Paired 240-frame deterministic
leg deformation/planting oracle requires exact position arrays and maximum
normal component deviation<=1e-6, finite unit normals. Existing allocation,
geometry/rig checks and unchanged<0.5ms 8-bot p95 gate must pass, plus original
P4p regression/live setup. First targeted failure in attempt1 was a test-only
weapon name 'glock' corrected to production 'glock18' before freeze.

### P4p runtime setup amendment — native viewport

Before complete-round evidence, reset the runtime capture setup. The retained
in-app tab now has native CSS layout713×1106 at saved90% browser zoom. Forcing
1280×720 with the documented viewport control produced an800×1422 CSS layout
and duplicated/black screenshot regions; corrected CSS1280×720 via device metrics
still produced partial surface captures. These are not accepted runtime evidence.
Initial and emulated partial attempts retained under attempt2; neither finished
a round. Native sizing restoration produces a clean713×1106 screenshot.

For P4p's normal mechanics smoke only, explicitly rebaseline the viewport to
native713×1106 (High/Recruit/CT unchanged), before fresh start/move/fire/pause/
contact/result captures under attempt2/native-round/. Same source145-file manifest,
physics tolerances, performance threshold and graphics ceilings; no pixel-fidelity
claim. The original1280×720 live setup remains unchecked and P6's1920×1080 gate
is not replaced by this amendment. No source edits while this round is reviewed.

### P4p accepted — shared ground motion and performance repair

Attempt2 accepted4/4 against the explicitly amended native-viewport card,
+4/-0; exact original equivalence remainsunverified. Frozen145-file manifest
unchanged afterreview/live. Full590/590 regressioncases pass (586 previous cases
rechecked; affected obsolete physical fixtures replaced with declaredplayeroracle),
zero finalfailures/uncheckedunitcases. Independent179+3 focusedpass. Lint/type/
Sitesbuildpass. All attempt1 failures retained; targetperformance<0.5ms unchanged:
attempt2 targeted0.4435ms/full0.4728ms. Optimized normalmath exactequivalent over
777600components/240frames. Baselinepage0/1expectedfailure and pairedmovement
old/new/player retained. ScopedAWP converges2.175; allfirearm/slowerroute/fixed100Hz
fixturespass. Botsretainrouting/waypointrecovery anduseplayergroundfriction/
acceleration through all4 callsites; visualnormalization constants namedaccordingly.

Root native713x1106High/Recruit/CT normalround: acceptedmove/jump/fire12→11,
pause1:29F/Vunchanged, resume/fire10, close livingally, incomingdamage100→89→25,
bothsquadkills, furtherfireto7, automaticCT1–0T timeout andround2receipt/bank4050.
Human survived. Start119999tri/76draw; prepared127039tri/76draw. USP7draw3737tri
visibleboth. Nonewconsoleerrors after13:43:06UTC;4historicP4k HMRerrors retained.
Evidence:outputs/cs16/p4p/attempt-1 andattempt-2; live-review.md,native-round/,
checks.txt,manifests,pairedphysics/normalresults,rawlogs andindependentreviews.
Unchecked: original1280x720live aftercapturelimitation;Performancepresetlive,
P6 1080p/fullmatch/twoindependentnormalrounds/user acceptance; botvertical/hull/
air/stance. Nextboundedpackage P4q sharedbodycollision/support, with owncard.

## P4q card — shared bot hull, support and falling motion

Freeze5 criteria before edits. Projectapproximation; originalbotmotion notmeasured.
(1) Extract existing player gravity14.5 and resolvePlayerMotion order into pure
sharedcharacter-bodymotion; equal finite state/velocity/world/dt produces identical
standingplayer/botposition,velocity,grounded,landing/ceiling result (componenttol1e-12).
Playerjump/crouch/input ownership stays; fullplayerphysicsregressionsmustpass.
(2) Standingbots usePLAYER_HULL andsharedmapboxes/ramps/floor: climb0.3step,
reject0.5rise, ascend/descendramp, slidealongwall, leaveledge thenfall/land without
Y teleport. Airbornebotsretainmomentum; no AI airwish/jump/crouch policy inthisslice.
(3) Recoveryalternatives arepureprobes fromsamestartstate; atmostonebodycommit perbot
perfixedtick. Missingwaypoint/allblocked/no movementcommand stillstepbraking/gravity.
Retainroute/recoveryorder,blockedSeconds andvelocity-drivenpresentation/footsteps.
(4) Bothsquads useverticaloverlap actorcollision withshared .82 actor-spacing
convention (explicitchange fromoldbot-bot .9), excludeself/deadbodies; groundflag
feedsballistics/stride/animation and groundedfootcontactsusecurrentrootfeetheight.
Spawn/round/death clearvertical/tickstate; livingYsnaps removed, deathplacement
policy retained for now. (5) Known-defectbaseline, pairedphysics/collision/onecommit
fixtures, affectedweapon/movement/animation/navigation regression, independent
review, fullsuite/lint/type/build andnormalCT/Performance/Recruit native713x1106
round withstart/preparedbudget pass. FixedviewportremainsP6openlimitation.

Root owns newcharacter-motion.ts, botmotion helper ifneeded, player-physics.ts
extraction, bot-locomotion.ts groundflag, pageEnemy lifecycle/world/probe/commit/
groundconsumers, affectedtests/sourcecontracts. Baselinefilesbeforeedits in
outputs/cs16/p4q/attempt-1,0/5. Freeze source manifest before review/runtime.
No originalequivalence, botcrouch/jump/aircontrol, orfullP4/P5/P6completion claim.

### P4q accepted — shared body collision, support and falling

Accepted5/5,+5/-0;147-filemanifestunchanged. Full596/596pass (all590previous
casesrechecked; obsoleteYsnapassertionupdatedtothedeclarednewbehavior); independent
101/101pass,lint/type/Sitesbuildpass. Originalplayerstate/eventtracesidenticalfor
1440ticks/3worlds includingjump/crouch. Baselinepage0/1expectedfailure,candidate
pass; groundedhullramp/step/wall/fall/ceiling/invalidstate andpureprobechecks pass.
Initialtargeted60/62failureswere .6floatingpointassertion (nowusesfrozen1e-12)
andobsoleteYsnapcontract; logsretained. Finaltargeted62/62,zerofinalunitfailures,
zerouncheckedpreviousunitcases. Presentationp95 .2877ms<.5ms unchangedgate.

NormalCT/Performance/Recruit/native713x1106round: move/jump/fire12→11,
pause1:23F/Vunchanged,resumemove/fire10,closelivingally,bothsquadkills,plantatA,
fire9,naturalbombdetonationCT0–1Tandround2receipt/$2200. Humanremainedalive100;
deathnotencountered. Start119871tri/72draw/prepared124547tri/72draw;
USP7draw3737tribothpass. Nonewconsoleerrors;historicP4kHMRerrorspreserved.
Evidence:outputs/cs16/p4q/attempt-1/manifest.json,baseline/targeted/fulllogs,
player-equivalence.json,reviewer-p4q*,live-review.md andpairedPNG/DOMcaptures.

P4exit audit identifies objectiveomniscience asnextconcretegap:retriever/defuser
selection readsunobservedbomb.position andalliedescorttracksunseenhumanC4carrier.
P4r willgateobjectiveactions onimmutable observed/heard/radiomemory. Botjump,
crouch,aircontrol,melee andvoluntaryweaponselectionremainexplicitcapability
approximations; donotaddunboundedmicrocardsforthese beforeP5pilot. P6/fullmatch/
1080p/twoindependentreviews/useracceptance remain.


## P4r card — observed objective intelligence

Freeze five criteria before edits; this is an explicit project AI approximation,
not measured original bot behavior. (1) Immutable objective snapshots contain
kind, copied 3D position, observation/expiry time, and sight/hearing/own/squad
provenance. No observation means no retriever, defuser, planted guard or moving
carrier escort target. Memory lasts dropped15s/planted45s/carrier3s; receiving a
radio report never extends its original expiry. Deterministic equality is exact.
(2) Both squads observe with the existing120-degree cone, blindness, solid/body
occlusion and smoke gates, range28 scene units. Drop sound radius10 and planted
beep radius18 are explicit sound approximations (no wall attenuation); each
sound is sampled for all living listeners together on its next fixed tick.
Observation batches share copied reports with living same-side bots, with stable
observer-ID tie breaks; no loop-order advantage or relay refresh. Own carried C4
is intrinsically known only to its carrier. Living planter knows the final planted
location and reports it to its side. No global CT retake route broadcast.
(3) Route/role selection uses valid remembered positions. True bomb position is
read only in perception/events and authoritative physical pickup/defuse checks,
which retain existing1.15/1.25 horizontal radii and action timings/rewards.
Hidden moving carriers do not update escort positions. CT bots without planted
intel keep their assigned home defense; T bots keep assigned attack routes.
Pickup, new drop/plant, round reset/end and dead-listener lifecycle invalidate
obsolete snapshots without granting a location. Existing combat priority stays.
(4) Replace duplicated squad objective routing with one shared handler if needed;
retain navigation, weapon/movement/economy/round rules. Tests cover unseen drop,
seen retrieval, heard plant/radio eligibility, stable snapshots/expiry/death/reset,
role selection and hidden movement, plus a source contract that fails the baseline.
(5) Independent review, full regression/lint/type/build and CT/High/Recruit normal
native713x1106 round start/move/fire/pause/contact/result with transition graphics
budgets pass. Same source frozen by SHA-256 before review/runtime. Original1280x720
and P6 1080p remain open; this card cannot establish visual fidelity.

Root owns app/bot-objective-intel.ts, page objective perception/events/roles/routes,
and tests/bot-objective-intel.test.ts plus directly obsolete page contract assertions
if any. Baseline page preserved in outputs/cs16/p4r/attempt-1 before implementation;
0/5 initially, known-defect measurement pending. Dependencies P4g/P4q and shared
perception/round rules fixed. No optional jump/crouch/melee tactic expansion here.
After this bounded gap, audit P4 exit evidence and begin the P5 appearance pilot.

P4r integration detail, before candidate freeze: objective retakes now send the
remembered coordinate through the existing map pathfinder, replacing the global
selected-site CT_RETAKE_ROUTES broadcast. Assigned pre-plant patrol routes remain.
A human planter may issue the own-location report; human sight/hearing is never
silently relayed. A carrier does not continuously radio its own coordinates;
only actual observations update escort memory. Initial typecheck caught two uses
of the wrong team discriminant, corrected player→ally; log retained.


### P4r measured — objective logic accepted, capture setup incomplete

Accepted4/5,+4/-0; status improved-but-failing on criterion5 fixed native capture
setup. 149-file source manifest unchanged. Targeted142 and independent218+15
pass. Baseline0/1 expectedfailure. Initialfull604/606: obsolete duplicate reward
source assertion (updated to shared handler) and animationp95 .5039ms>.5.
Finalfull606/606, p95 .3865ms; isolated .4628ms. Six direct presentation modules
and benchmark match P4q hashes. No threshold changed. Lint/type/Sitesbuildpass;
all596 prior unit cases rechecked, zero final unit failures/unchecked cases.

NormalHigh/Recruit/CT round moved/jumped/fired12→11; pause1:36 health24 F/V
unchanged; resumed and human killed byViperGlock, close livingAtlas, automatic
Holt/Rook spectator, bothsquadkills, naturalCT0–1T elimination andround2receipt,
bank2200/freshUSP12. No new errors. Preview resized externally midround from
native713x1106 to CSS318x994 and later images became cropped/padded; retain these
as partial mechanics evidence, not a pass for the frozen full-round viewport.
Evidence outputs/cs16/p4r/attempt-1. P4 objectiveknowledge criteria are accepted;
P4 exit replayable plant/defuse/half/MR3 proof and final stable-size runtime remain.
P5 is independently ready from P0/P2/P3; proceed with its pilot while preserving
this explicit pending gate. Do not claim complete P4 or original equivalence.


## P5a card — first appearance/audio pilot

Freeze six criteria before implementation. Oracle: locally retained
outputs/graphics-review/reference/counterstrike-reference.jpg, inspected by root;
build/provenance unknown. Broad stone/sand/timber composition, amber numerals,
circular green radar and dark USP are visual cues, not exact pixel targets.
No original art/audio/model imports. Reuse existing generated/CC0 materials and
licensed local Vanguard CT/T model, retaining their existing provenance ledger.

(1) Route pilot longDoors→outsideLong→long→longRamp→A has sandy walking surfaces,
block masonry walls, timber doors/crates and open sky/horizon. Material assignment
is shared across the current map (explicitly visual-only); geometry/hulls/nav stay
identical. Preserve flat floor geometry and existing static batching. Add fixed
local-only camera poses at[11,3.68,20] yaw−pi/2, [26,2.68,8] yaw0 and
[26,3.68,-24] yaw−.35, pitch0. Baseline lacks these poses; compare source volumes
and retained earlier scene captures. Original dimension/fidelity remainsunknown.
(2) Reuse the current CT/T pair and USP geometry/mounts; capture pair at6m and
USP idle/fire/reload. Existing palette/sidecue/weapon footprint/crosshair-clearance
and triangle/draw regression thresholds remain unchanged. No new character assets.
(3) Classic active HUD: circular green radar; amber health/armor/ammo/timer/money;
no boxed time card or active faction branding. No enemy radar contacts in source
snapshots or ARIA counts, no enemy bomb markers, no hit-marker DOM/timer/state.
Own plant/defuse progress only; omit hidden enemy planting/defusing/site-route
messages from the active status display. Keep accessible health/ammo/round labels,
buy menu, input controls and scoreboard team identities. Remove obsolete enemy
radar freshness state/path/tests outright; player sight-to-squad radio still works.
(4) Five original deterministic USP source events (fire,dryFire,reloadStart,
reloadCommit,bodyImpact), cached in audio buffers, replace generic noise for the
pilot weapon. Player/bot fire share source; existing volume,pan,range,silencer and
action timings stay. Export review WAVs from the same generator. Finite samples,
peak≤1, repeatable bit-identical output, five distinct nonzero signals at44.1/48kHz.
This is an authored audio approximation, no original recording equivalence.
(5) Known-defect source baseline, affected rule/appearance/audio tests, independent
review, full regressions/lint/type/Sitesbuild pass; frozen manifest before runtime.
Both graphics ceilings and nonzeroUSP transition fields remain fixed.
(6) Root pilot pose/USP/CT-T raw images and a normalCT round start/move/fire/reload/
pause/contact/result with no newerrors and start/prepared budgets. Native browser
size is recorded per capture because the app panel resized during P4r; mixed or
cropped captures are flagged, never claimed as fixed1280x720/1080p acceptance.
Those final visual gates and independent full rounds/user acceptance remainP6.

Root owns new classic-usp-audio.ts and classic-hud.ts, page visual/material/audio/
HUD integration, globals.css, graphics-qa preset additions, obsolete radar rules
and affected tests, reviewaudio export script. Baselines saved before edits under
outputs/cs16/p5a/attempt-1. 0/6 initially; exact baseline contract pending. This is
the early pilot, not full P5. Further route detailing/roster/audio follows pilot
review; P4r stable713x1106 setup and P4 exit replay remain explicitly pending.

P5a pre-freeze checks: initial targeted153/154 failed only signedzero at the audio
start sample; zero-amplitude test now usesabsolutevalue. Lint preferredstartsWith.
Both logs retained. First review WAV defaults were longer than the existing live
USP envelopes; keep those diagnostic originals and export a new runtime-duration
bank using actual .085/.027/.070/.052/.045s defaults. Gameplay timings unchanged.
Wall proxy material remains sand while its visible shell uses stone; floor proxy
remains darkSand with visible sand, preserving penetration/impact classification.


### P5a attempt2 bounded performance repair

Attempt1 improved-but-failing: initialfull608/610, obsolete hearing source slice
included the newly adjacent audio helper (fixed to its actual function boundary),
and presentationp95 .6066ms>.5. Isolated .5505ms also failed; profile .4211ms
passed but is diagnostic only. All logs preserved. Profile attributes44.778ms
self time to updateMatrixWorld; the grip solver walks the entire visible tree
before target.getWorldPosition and upperBody.worldToLocal independently refresh
the exact ancestor chains they need. The foot solver also refreshes its own mesh.

Attempt2 keeps all six criteria and thresholds, expanding owned scope only to
character-rig.ts removal of that redundant full-subtree prepass and a regression
fixture. Save fresh baseline before edits. Require before/after equivalence over
240 poses ×11 firearm grips, including translated/rotated/scaled parent transforms:
maximum joint/world-matrix/solver-output deviation≤1e-12 after normal render update.
An unrelated decorative descendant must not be updated during the grip-only solve,
but must receive its correct transform on the render update. Resource identities
unchanged. Freshmanifest/independentreview/fullsuite+normalround stillrequired.


### P5a attempt3 — final bounded grip-matrix reassessment

Attempt2 full610/611, solefailurep95 .5273ms; targeted .5136ms failed and isolated
.3978ms passed. Thus passing isolated runs do not establish acceptance. Exact
pose equivalence passed and redundant descendant traversal is removed; retain
that safe improvement. Build/lint/typepass. Read-only subsystem review recommends
precomputing both local grip targets from one upper-body inverse. Root diagnosis:
remaining repeated getWorldPosition/worldToLocal calls repeatedly refresh shared
ancestors; both grip targets are weaponSocket children independent of the arms.

Final bounded attempt3 adds persistent inverse/two local-target vectors and updates
only upperBody ancestors, weaponSocket and its two target nodes, once per solve.
Keep all IK equations and all six P5a criteria/thresholds. Compare against the
original attempt2 baseline (before either matrix optimization), same2640-pose
and≤1e-12 oracle, plus existing grip/deformation/resource tests. New baseline copy
and freshmanifest/review. No unrelated optimization or threshold change permitted.
If the revised candidate cannot pass the full unchanged gate, report P5a blocked
under the factory plateau rule; retain source/evidence and unfinished visual gates.

### P5a attempt3 measured — blocked on the unchanged performance gate

Candidate: branch `feature/classic-hands-round-2`, uncommitted atop
`cf2a2829b5b295e8a3688c7bde815dc50edc5512`. The 154-file manifest is
`outputs/cs16/p5a/attempt-3/manifest.json`, SHA-256
`db3ab8635561d245fbd936c75a02eaa3375ec441d289c99dc246118e829fb513`.
Root and independent reviewer verified all 154 source hashes. Documentation
updates do not alter that source identity.

Status **blocked** under the frozen final-attempt/plateau rule. Full suite:
610/611 pass, one failure, zero skipped/cancelled/todo. The existing eight-bot
presentation p95 is **0.5959 ms against <0.5000 ms**. Attempts 1/2/3 full runs
measured .6066/.5273/.5959 ms; passing isolated/profile runs do not establish
acceptance. The previously passing performance regression is now failing. No
threshold was relaxed. Preserve this candidate and all three failed attempts;
no further optimization or benchmark retry belongs to this frozen attempt.

Independent `/root/p4f_verify` found no functional blocker and reran219/219
focused checks; baseline source contract0/1 expected failure, candidate1/1 pass.
Both matrix optimizations together exactly match the original solver over2,640
poses,11 grips and2,312,640 compared components: maximum error0, tolerance1e-12.
Lint, scoped TypeScript and the final Sites build passed. Build exit0 was observed
in tool session26985; `outputs/cs16/p5a/attempt-3/checks-record.md` is a root
execution record, not a reconstructed raw build log.

Accepted/frozen **1/6**, gained1/lost0 within this new card. Criterion4's audio
engineering target is accepted from deterministic tests, playback wiring review
and the runtime-duration WAV bank. Criterion5 fails performance and lacks normal
round transition budgets. Criteria1/2/3/6 remain unverified as full criteria:
material/HUD/preset source contracts pass, but required route, complete HUD,
CT/T pair, USP action captures and this candidate's normal round are missing.
All611 unit cases were rechecked; the only failure is the prior performance gate.
No listening comparison or original visual/audio equivalence is claimed.

Root inspected native `long-doors.png`: masonry, sand and green radar are visible.
CSS318x994 at saved90% zoom produced a353x1104 cropped/padded image; USP and bottom
HUD are absent from the captured region. Paired DOM/layout are partial evidence.
Its ready snapshot is120127tri/76draw with viewmodel7draw/3737tri, within High
ceilings; reason `ready` and null weapon are not required `play-start` or
`round-prepared` proof. Error log retains only four historic P4k HMR entries at
13:00:08Z. No P5a normal round was executed. The tab returned to the loaded normal
keyboard-playtest menu and was marked for handoff; `handoff-state.txt` records
the enabled start button. The Codex panel open request was queued, not confirmed
visible.

Next work needs a concrete revised performance diagnosis or controlled measurement
setup, preserving the original oracle and failed evidence; do not resume blind
retries. Then finish four unverified pilot criteria, P4 exit scenarios/stable
capture and P6 full-match,1080p,independent normal rounds and user acceptance.
The overall facsimile remains incomplete.

### Resume clarification — validation can proceed while timing stays blocked

The coordinator incorrectly treated the P5a performance plateau as a stop for
all project work. The user challenged that stop. Preserve the blocked timing
verdict and all frozen thresholds; continue independent validation under the
existing implementation authorization. No benchmark retry, source optimization
or passing unrelated check resets that plateau. This record corrects routing,
not the acceptance card. Current154-file source still matches attempt3 exactly.

Resume scope: finish available P5a visual/normal-round evidence against that
immutable candidate and audit P4/P6 match scenario coverage. Root owns browser
validation; hearing_design performs a read-only scenario audit. Write fresh
evidence under `outputs/cs16/p5a/resume-validation`, never replace earlier files.
The previous server at3003 is gone; the active process at3000 was verified to
have this checkout as its cwd. Use localhost:3000 for new runtime evidence.


## P5b card — readable clock and supported review cameras

New independent visual repair, not another P5a performance attempt. The original
P5a timing plateau stays blocked with unchanged thresholds. Root observed two
concrete defects at the restored1280x720/100% capture setup: timer lacks dark
edge contrast and overlaps its phase caption over sand; legacy review camera
[0,1.68,34] sits outside walkable Dust II and the6m pair is partly hidden behind
raised floor geometry. Baseline captures are under p5a/resume-validation, source
copies under outputs/cs16/p5b/attempt-1. Three frozen criteria, initially0/3:

1. Amber timer and phase caption remain separately readable over the same sand
   background at1280x720; keep transparent HUD, labels, scores and layout behavior.
   Use text contrast/vertical separation, not a new boxed HUD. Paired raw image
   inspection is the oracle; this is no original-game pixel-equivalence claim.
2. A single fixed review origin on the flat T-spawn surface drives the close
   character camera/placement and pistol/primary/secondary/equipment presets.
   Character forward distance remains3/6m, existing local offsets/poses unchanged,
   camera eye1.68m above floor. A map-support fixture must fail the baseline and
   pass the candidate. Re-capture6m CT/T pair and USP idle/fire/reload unobstructed.
   Only localhost review paths change; no authoritative roots/gameplay geometry.
3. Source freeze and independent review, affected non-performance tests, lint,
   scoped type and build, plus normalCT round and required graphics snapshots.
   Retain the failed .5959ms timing result; no benchmark retry or gate relaxation.

Root owns app/globals.css, app/graphics-qa.ts, the close-character QA-only page
setup/writer and directly affected tests. Candidate manifest before review/runtime.
Match scenario production refactoring is outside this card.

### P5b measured — visual repair accepted, timing plateau unchanged

Root accepted3/3,+3/-0 after independent source review and normal runtime. Frozen
155-file manifest: `outputs/cs16/p5b/attempt-1/manifest.json`, SHA-256
`260365187953d0a91ca5c09568172b8eba42c2788fc4511ce4b0c3addf07d08a`.
All155 hashes match after runtime. Only five files differ from P5a: CSS, graphics
QA definitions, QA-only page setup/writer and two QA test files. Gameplay and
performance source are unchanged.

Baseline placement fixture fails0/1 (legacy camera outside walkable map).
Initial targeted16/18 exposed a stale fixed1.68m assertion and sub-1e-15 floating
point support-height roundoff; corrected expected raised surface and use1e-12
geometry tolerance. Final targeted18/18, independent155/155, lint/scoped type/
Sites build pass. Broad filtered run reports612 passes, including one empty file
wrapper:611 assertion tests ran and the known timing test was excluded. It did
not execute or pass the benchmark. `timing-gate-status.json` records this limit.

At1280x720/100% zoom, paired Long views show readable amber time with dark edge
contrast and a measured6px gap to its caption; transparent header and labels
remain. The corrected6m CT/T pair is fully visible with floor contact; USP idle,
fire and reload are captured at production mounts. No original fidelity claim.

Normal High/Recruit CT round moved/jumped/fired12→11, reloaded12/23; paused1:04
health100, F/V unchanged; resumed/W/F11/23, close living teammates and both squads'
kills. Generic plant announcement, natural CT0–1T detonation and automaticround2
receipt with2200bank and survivor11/23. Human survived; no spectator/death claim.
High start119999tri/75draw, prepared124195tri/75draw; both reason-labelled with
visibleUSP7draw/3737tri. Empty error log. Paired raw evidence and exact limitations
are in `outputs/cs16/p5b/attempt-1/live-review.md`. The early file `round-result`
is a preterminal0:01 capture; `round-prepared` is the actual completed receipt.

The resumed P5a source also completed a separate normal High round before edits;
its report is `outputs/cs16/p5a/resume-validation/live-review.md`. Original cropped
images remain evidence, superseded only for new visual decisions by explicit
1280x720 captures. Together with P5b's reviewed repair, P5a now has5/6 criteria
accepted (+4 since the earlier1/6 record): route, pair/USP, active HUD, audio
engineering and root runtime evidence. Criterion5 remains blocked by .5959ms
versus<.5ms; no new performance attempt or gate relaxation occurred.

Read-only match audit found pure rules cover halves/MR3/terminal priority, while
existing page tests inspect closure source rather than executing a full match.
`outputs/cs16/p5a/resume-validation/scenario-audit.md` identifies exact seams.
Full match replay, two independent CT/T rounds,1080p performance, broader P5
assets/audio/UI and user visual acceptance remain. A blocked target must not
again be interpreted as stopping independent authorized work.

## P4s frozen card — real page match lifecycle replay

Player-visible target: complete MR15/MR3 matches settle once, preserve result
receipts and automatically prepare clean rounds with correct sides and economy.
Project approximation oracle; no original-match equivalence claim. Baseline is
the P5b manifest `260365187953d0a91ca5c09568172b8eba42c2788fc4511ce4b0c3addf07d08a`;
`outputs/cs16/p4s/attempt-1/baseline.json` records the missing page replay.

Frozen criteria (5): (1) real page regulation 16–14, halftime after 15, (2)
15–15 to 19–17 MR3 with half/economy reset, (3) repeat overtime to an opponent
22–20 win, terminal result without further preparation, (4) planted elimination
and time expiry remain nonterminal until production detonation/defuse, with
duplicate resolution leaving scores and all actor banks unchanged, (5) actual
3000 ms timer callback prepares rounds, preserves receipts, resets explicitly
dirtied health/velocity/crouch/blindness/input and removes explosion effects.

The localhost-only visible QA runner uses actual-start, settlement and automatic
preparation closures. No global browser bridge, direct score mutation, fast
timer or simulated combat/progress claim. Three deterministic winner sequences
(no random winner seed) exercise 108 results; normal Recruit/High gameplay is
checked separately at 1280×720. Timer minimum 2900 ms allows observation jitter;
10 s is a failure timeout, not a claim about timer precision. Score, side,
receipt, state and money assertions are exact. Actor auto-purchases are observed
separately from gross settlement. Repeatability is logical state, not frame time.

Owned: `app/match-lifecycle-qa.ts`, page QA wiring and shared defuse completion,
`tests/match-lifecycle-qa.test.ts`, affected obsolete source contracts if needed,
this plan and evidence in `outputs/cs16/p4s/attempt-1/`. Root implements; bounded
independent design at `outputs/cs16/p4s/design-lifecycle.md`; fresh read-only
review after candidate freeze. Targeted lifecycle/objective/start/reset tests,
scoped TypeScript, lint, build and normal-round graphics proof. P5a p95 plateau
remains excluded and blocked; no threshold change or blind benchmark rerun.

## P5c frozen card — remaining interaction audio and pause privacy

Root audit confirms ten firearms still use random generic shot buffers, equipment
uses generic/no sound sources, and the pause paragraph renders raw hidden enemy
objective messages. Full CT/T team names are legitimate team labels (desktop
header already hides them); the audit proposal to remove them is rejected as
unnecessary scope. Baseline source is the P4s candidate; audio/HUD production
paths are unchanged from P5b. Root may draft ignored artifacts while P4s runtime
is frozen, then apply source after its replay and review complete.

Frozen approximation checklist (4): (1) active and pause status share the same
privacy filter, with own actions/global results retained; (2) all 11 firearm fire,
reload-start/commit and dry-fire sources are authored deterministic cached samples
shared by player/bots, preserving USP pilot sample bytes and playback policies;
(3) knife swing/stab, grenade throw/HE/smoke/flash detonation and C4 beep/plant/
defuse/detonation have authored deterministic sources; (4) paired known-defect
contracts, 44.1/48 kHz finite/nonzero/peak≤1/repeatability/distinctness tests, WAV
export/provenance, focused regression and independent review plus normal-round
smoke/graphics proof. This is engineering/source coverage, not listening approval
or acoustic equivalence to original CS audio.

Keep existing effect duration/gain/filter/pan/range/silencer policy. New knife
swings use local gain0.10; throw release uses gain0.08 and a12-unit positional
radius for both actor types. Passive armor/helmet/kit have no invented action
sounds. World footsteps/death ambience are existing procedural audio and outside
this interaction-bank card. HUD/radar policy and physical/hearing simulation stay
unchanged. Seeds derive from event keys; variant0/1. Settings High/Recruit, 1280×720.

Owned: new `app/classic-interaction-audio.ts`, `scripts/export-classic-interaction-audio.ts`,
`tests/classic-interaction-audio.test.ts`; page source cache/calls/privacy only,
`tests/classic-pilot.test.ts` obsolete source-wiring contracts, `CS16_REFERENCE.md`,
this plan; evidence `outputs/cs16/p5c/attempt-1/`. No character/map edits in this
card. P5a p95 gate unchanged and blocked. Baseline behavioral audio measurements
unavailable; baseline source coverage is independently checkable.

### P4s attempt1 result — accepted5/5

Gained5,lost0. Browser replay108 results/1283 assertions/105 automatic preparations
(3010–3050.5ms) passed all three match scripts, planted priority, duplicate
settlement and dirty reset checks. Normal1280×720 High/RecruitCT round completed
through natural detonation and prepared receipt; details and originals in
`outputs/cs16/p4s/attempt-1/live-review.md`. Candidate157files manifest
`21d3a155bf2ae8db1a9ededb2a6ad81318c1be1b82ec39143da4dd52686095e9`.
Independent163/163 focused checks passed. Initial obsolete bot-economy regex
failed, then its shared-helper guard/award assertion passed; production source
was unchanged during that test-only refreeze and runtime. Full nonperformance
regression final, lint, scoped typecheck and build recorded. Known presentation
benchmark excluded, still blocked; final CT/T1080p review and audio remain
unverified. Continue P5c under existing authorization.

P5c scope amendment before candidate freeze: root found the result assignment
also renders the next attacker's route/site to CT (`next.approach/targetSite`
unconditionally). Preserve the assignment card but conceal the hostile plan:
CT sees defend both sites; T sees its own plan. Add `app/classic-hud.ts` to
ownership and its pure branch/source assertions to criterion1. Baseline source
was unconditional for both sides; retained P4s result DOM records document this
old assignment. No gameplay/objective state changes or threshold changes.

### P5c attempt 1 result — accepted 4/4

Gained 4, lost 0. Source candidate: 160-file manifest
`e3fb6b8f14cc5484357ad9d668c6b51d65ab9efaca08b029c54ae57d9dde5907`.
Independent rerun: 35/35 focused tests; 160/160 hashes match. Full nonperformance
regression: 618 actual assertions pass plus one empty filtered-file wrapper
(Node reports 619). The presentation benchmark remains excluded and blocked.
Lint, scoped TypeScript and build pass with existing build warnings.

All 58 source samples exported; USP hashes match the accepted pilot. Root normal
round completed through natural detonation and prepared receipt. Player fire,
reload, utility releases and pause/resume executed without console errors;
filtered pause/freeze captions hide the site. Original PNG/DOM evidence and
limits are in `outputs/cs16/p5c/attempt-1/live-review.md`. Listening acceptance,
original acoustic equivalence, broad visual proof and final 1080p CT/T reviews
remain unverified. Continue into the finite visual review package.

## P5d frozen card — complete visual review and legacy labels

Player-visible target: the required map, CT/T pair, 11 firearms and five active
equipment models are reviewable above the real map surfaces, and team labels
consistently read CT/T instead of the retired arena's Blacksite/Raiders names.
The Dustline wrapper stays. Baseline is P5c manifest above. This is an explicit
project approximation review, not measured original CS1.6 equivalence.

Frozen checklist (4): (1) all seven map review cameras are walkable at support
height +1.68 within 1e-12, with B camera actually inside site B; (2) the movement
board's camera and all nine visible actors stand on the T-spawn surface while
authority roots remain unchanged; (3) menu, scoreboard, onboarding and result
labels use CT/T names and preserve prior privacy rules; (4) inspect retained
map, firearm/equipment roster and CT/T pose captures at 1280×720 High, keeping
graphics ceilings, plus focused checks/build and normal-round smoke. Baseline
source has four stale map poses, movement camera/visible roots at old height,
and old faction strings. Record baseline measurements before changes.

Owned: `app/graphics-qa.ts`, page QA placement and visible labels only,
`app/game-rules.ts` onboarding faction labels/types only, `app/classic-hud.ts`
legacy normalization removal once producers migrate; corresponding QA, classic
HUD and game-rule tests. No collision, nav, weapon mechanics or asset geometry
changes. Evidence: `outputs/cs16/p5d/attempt-1/`. Root writes; independent
read-only review after freeze. Capture finite sheet from the read-only visual
audit, with original screenshots and visible DOM. No performance benchmark
rerun or threshold adjustment.

### P5d attempt 1 review and bounded framing repair

Candidate `3e37b7513c6944292cea5e67f711071be76ebab13f0d0b20bc558c3ebdabb7d2`
remained unchanged through a normal High/Recruit CT round: move/jump/fire, reload,
pause at0:29 with F/V leaving ammo12/23 and time unchanged, resume/move/fire11/23,
natural detonation and automatic round2 receipt CT0–1T, bank2200, health100.
`normal-prepared-receipt` is the completed proof; the earlier misleading filename
`normal-round-prepared` records preterminal0:14 and is retained unchanged.
Independent150/150 checks, lint, scoped typecheck and build passed.

Visual criterion4 is improved-but-failing: `map-lane` is occluded by a spawned
actor and `map-tunnel-approach` faces the adjacent wall. Preserve attempt1 images.
Before further review, repair only fixed QA framing: lane/character cameras face
north, and map/viewmodel-only presets hide spawned actors. Dedicated character
and movement presets retain their actors. This changes review presentation only,
with no normal gameplay/collision/AI changes and no threshold change. Refreeze
as attempt2 and recapture the finite map/weapon set against that source.

### P5d attempt 2 result — accepted 4/4 within the review card

Gained4,lost0. Frozen160-file manifest
`dce515fc27dbc11b792b9ccac2e2e3cbdf6f769a73be23a6b5e59277e431bf97`
verified unchanged after normal runtime. Independent16/16 framing checks and raw
images accept repaired lane/tunnel views. Root inspected seven maps, eleven guns,
five equipment models, CT/T poses and movement board. Normal High CT round
completed with input/fire/reload/pause/result proof; graphics ceilings pass.
620 actual nonperformance assertions pass; benchmark excluded, still blocked.
Details in `outputs/cs16/p5d/attempt-2/live-review.md`. Inspection acceptance is
not original fidelity approval; C4 held-angle hides its controls and needs repair.

## P6a frozen integration card — final review preparation

Baseline P5d attempt2 manifest above. Project approximation, unchanged original
reference limits. Root source owner; independent read-only verification.
Four criteria: (1) held C4 exposes its existing display/keypad while both hands
remain attached, paired1280×720 High capture; (2) localhost keyboard playtest can
start an ordinary CT or T match through explicit `playtest-side=t`, preserving
defaultCT and rejecting remote/invalid queries; (3) tracked TypeScript check
covers app/tests/scripts/config and excludes ignored outputs/work, with explicit
normal regression and isolated performance commands; (4) local opt-in frame
profiling records actual rAF intervals, viewport and settings without simulation
mutation, allowing final1080p route timing and honest unavailable/failing status.

Baseline C4 image is `p5d/attempt-2/equipment-bomb.png`; its mount pitches the
control face away. Baseline page creates CT unconditionally; default tsconfig
includes ignored diagnostics; no frame-profile collector exists. New profiling
uses120 warmup intervals+300 measured intervals and records raw intervals and
meanFPS/p95ms; 60FPS target allows rounding only (>=59.5). Paused/static visual
route timing is labelled separately from normal-round timing and is not combatFPS.
Changing route/quality reloads a fresh sample. No claim that drawn geometry
proxies prove actual frame rate. No timer acceleration, hidden browser mutation,
new maps/online/deployment. Owned equipment mount, local QA helpers/page wiring,
package/TypeScript config, targeted tests and evidence `outputs/cs16/p6/`.

## P6b frozen experiment card — paired foot-matrix prepass

Distinct from exhausted P5a grip optimization: refresh common pelvis ancestors
once and the two thigh parents once, then use explicit prepared-parent foot
writes only in normal paired-leg presentation. Default two-argument standalone
API remains for reset/death/QA and existing callers. Baseline is P5d deformation
and normal presentation source; proposal in `outputs/cs16/p6/foot-plant-prepass-proposal.md`.

Before timing, replay the unchanged eight-bot/560-frame benchmark trace against
old ancestor refresh and prepared refresh, comparing every limb position/normal
component, all node world matrices, pose/grip values and retained identities.
Maximum error must equal0; any mismatch rejects candidate. Only then one isolated
benchmark: unchanged8bots,240warmup,320samples,p95<0.5000ms, no other workload.
No blind retry or relaxed gate. Source ownership: character-limb-deformation,
normal page seam, benchmark scheduling only, exact proof artifact. Preserve
all prior failures. A missed target remains blocked while other P6 work continues.

P6a C4 repair measurement: whole mount rotation exposed the control face but
failed the existing minimum visible-arm area. Preserve this failure; correct
the two C4 arm rotations to retain their prior camera-facing forearm direction
under the changed mount. Add only the C4 entries in viewmodel-visuals ownership;
contact and projected-area thresholds remain unchanged.

P6a bounded approach revision after two C4 geometry failures: counter-rotating
the forearms restored their area but the tilted body exceeded its existing
0.18 projected-area ceiling. Reject whole-mount tilt. Restore original body
mount and arm poses exactly, and place the existing display/keys on the visible
front face instead of the hidden top face. This preserves the measured body and
grip footprint; no new geometry/materials, threshold changes or mechanism edits.
This is the single revised bounded repair; visual capture and old gates decide it.

P6 frozen candidate:163-source-file manifest
`40254e41ad6438ba1e61211f4c9d2a7086918f3ea527d20edbe8e84b80198ec8`,
plus `outputs/cs16/p6/attempt-1/asset-manifest.json` for all retained public
assets and provenance. Independent exact comparison repeated successfully:
82,944,000 geometry components and9,523,200 matrix components, error0, retained
identities stable; focused41/41. Build/typecheck/lint pass. Serial `npm test`
passes622 actual regression assertions+one filtered-file wrapper, followed by
the single isolated benchmark p95=0.3884ms<0.5000ms (unchanged8bots/240/320).
P6b timing target gains a pass; old P5a failures remain historical. No retry.
C4 paired capture exposes the keypad/display with original body/hand framing.
Final normal CT/T1080p reviews and full-match replay now run on frozen source.

P6 final-review transport amendment: independent child-browser tabs are throttled
(~2 simulated seconds per30 wall seconds) and Page.bringToFront does not keep
them active. Preserve their partial direct runs. Use fresh root-visible IAB tabs
as a UI transport: each isolated reviewer chooses its own input protocol, reads
only its own raw PNG/DOM/budget/frame evidence, requests adaptive followups and
makes its own verdict. Root executes their UI instructions and inspects originals
for acceptance. No simulation/clock/source change, skip or state injection.
Record this as reviewer-directed live execution, not direct child-browser execution.
The source remains frozen; source/asset identity and acceptance thresholds hold.


## P6 final decision — 2026-09-14

**Accepted for the documented project approximation.** Implementation and the
finite engineering review are complete on the frozen candidate. This decision
accepts the working targets, not measured equivalence to original Counter-Strike
1.6. The user's “looks better” is improvement feedback, not final visual approval.
Original visual/audio fidelity and user visual acceptance remain unverified.

Candidate: source manifest SHA-256
`40254e41ad6438ba1e61211f4c9d2a7086918f3ea527d20edbe8e84b80198ec8`
and public asset/provenance manifest SHA-256
`bb9a314f1cf1d4bd2892f8575ac3bf442943782797e06b7372aec8060c396980`.
All 163 source and 15 asset entries match after runtime and review. No application,
test or configuration file changed during final review. Documentation is outside
the source manifest; original failures and partial captures remain preserved.

Accepted/frozen accounting: P4r **5/5**, gained1/lost0 by the new stable713×1106
normal CT round on this integration candidate; P5a **6/6**, gained1/lost0 via the
new paired-parent experiment; P6a **4/4**, gained4/lost0. P5d **4/4** remains
accepted, no additional gain. P6b's exactness and timing requirements both pass.
No aggregate fidelity percentage or newly invented P6 denominator is asserted.

Validation: `npm test` completes622 actual regression assertions plus one empty
filtered-file wrapper, then the isolated unchanged eight-bot benchmark passes
p95=0.3884ms against<0.5000ms. The same exact proof was independently repeated:
82,944,000 geometry and9,523,200 matrix components, maximum error0, stable object
identities. Independent focused checks41/41; typecheck, lint and Sites production
build pass. Build retains existing module.register deprecation, large-chunk and
route-classification warnings. Old failed performance attempts remain historical;
this distinct experiment did not relax thresholds or change the workload.

The current-candidate production lifecycle replay passes1,283 checks over108
results and105 actual automatic preparations (3012.9–3173.9ms). It covers16–14
regulation,19–17 MR3, repeated overtime20–22, planted priority, duplicate settlement,
side/economy changes, dirty reset and terminal no-preparation. Winners are scripted
through real production closures; this is not108 combat rounds. Its viewport
changed during a separate native review and is not a fixed-resolution timing run.

Two isolated reviewers selected protocols and independently inspected their own
raw originals using the recorded root-visible UI transport amendment. CT High
review includes contact/death, spectator pause invariance, successful reload12/23,
a natural CT3–0 win and automatic round4 receipt. T Performance review includes
alive-player pause invariance, Glock20→19→20/39, C4 drop on death, natural timeout
CT1–0T and automatic round2 receipt. No skip, accelerated timer, scripted winner or
state injection was used in these normal rounds. Direct child-browser attempts
remain unverified because of throttling; they are not credited with these runs.

Both normal profiles are actual1920×1080,300 rAF intervals after warmup: CT High
83.1255 FPS/p95 16.9ms; T Performance71.9994 FPS/p95 25ms. Raw spikes are retained;
these short samples do not prove stable60FPS everywhere. Transition budgets pass:
CT start78draws/126857triangles, prepared75/125019; T start69/119271, prepared71/125703.
Both identify the proper visible weapon and nonzero viewmodel counts. These are
transition snapshots, not per-frame ceilings. Browser error logs are empty.

Seven fixed map views repeated across High/Performance produce14 static1080p
samples at119.957–120.043 FPS and within graphics ceilings. Actors are hidden in
these QA views; this accepts static map-view timing, not combat route traversal.
Hardware: AppleM5Pro,64GiB, Mac17,8, Chromium IAB. Other browser work overlapped
parts of the measurement; no isolated GPU or universal hardware claim is made.

Evidence-format amendment: the browser tool returns original JPEG bytes despite
legacy `.png` paths. Canonical `.jpg` copies preserve exactly the same bytes,
verified in `outputs/cs16/p6/capture-formats.json`; old aliases remain available.
Accept original image/jpeg captures as the representation, without claiming PNG
encoding or changing image content. Reviewers verified the truthful paths.

Evidence: [final review](outputs/cs16/p6/final-review.md),
[CT reviewer](outputs/cs16/p6/ct-review/reviewer.txt),
[T reviewer](outputs/cs16/p6/t-review/relay-verdict.md),
[native review](outputs/cs16/p6/native-review/live-review.md),
[lifecycle review](outputs/cs16/p6/attempt-1/lifecycle-review.md),
[static map timing](outputs/cs16/p6/routes/review.md),
and [final integrity](outputs/cs16/p6/final-integrity.json).

Remaining limitations are explicit project choices: bot jump, crouch, air control,
melee and voluntary weapon selection remain approximations; no claim of complete
human/bot capability parity. Authored audio source coverage is accepted, while
listening approval and original acoustic equivalence are unmeasured. The local
T-only QA entry initially displays the generic CT-first briefing/USP HUD before
deployment; actual T deployment correctly initializes Glock and C4. No online
multiplayer, other maps, deployment, commit or PR is included. A future fidelity
request requires a new bounded reference comparison; these limits are not hidden
behind the engineering acceptance.


## P7 reopened product fidelity — user correction, 2026-09-14

The user explicitly says the facsimile is far from the target and requests continued
work. The previous P6 decision is engineering-baseline acceptance only; its claim
that the finite pass completed the intended product is superseded. Do not equate
passing mechanics tests with visual fidelity or stop at another subpackage checkpoint.

Visual reference: retained user AK/M4 images and counterstrike-reference.jpg from
the ledger, build/settings unknown. Root inspected them this turn. They show human
cloth uniforms, recessed arched openings, articulated masonry, X-braced crates,
rough mixed ground and understated game UI. The current preview instead uses the
Vanguard armored science-fiction mesh, freestanding rectangular door slabs, uniform
six-unit wall boxes, pale flat ground and a modern oversized briefing. Baseline
source is P6 manifest40254e41..., preserved snapshots in outputs/cs16/p7/baseline.

P7a frozen card (world/UI,5 criteria): (1) mid, long and B doors visibly have framed,
braced timber leaves and masonry portal shape; (2) both sites have legible braced
crate cover, parapet/base courses and wall relief/windows placed against solid
walls rather than arbitrary floating decoration; (3) ground visibly combines dusty
terrain and worn paving without texture stretching; (4) game-native compact menu
retains start/settings/result/controls and removes CLASSIFIED/SECTOR prototype copy;
(5) paired seven-map screenshots at1280×720 High, normal CT/T runtime smoke and
existing physics/navigation/weapon checks, High/Performance graphics ceilings.
Collision/nav/weapon data remain the authority; visual decoration cannot shrink
routes or become a new hittable obstruction without an explicit shared hull.
Owned: new dust2-architecture.ts, page construction/menu, globals.css; directly
relevant tests/docs. No fixed pixel-equivalence claim; improvements judged beside
retained baseline and references, not invented similarity percentages.

P7b frozen card (characters,4 criteria): (1) CT reads as navy cloth plus dark tactical
vest/helmet and T as olive/brown cloth with a human face/head covering, replacing
Vanguard's exposed mechanical armor silhouette; (2) existing skeleton animation,
weapon hand contacts, crouch/death ground support remain functional; (3) retain
standing hit-proxy alignment, per-character draw/triangle ceilings and whole-scene
budgets; (4) paired CT/T idle/run/crouch/death captures with independent inspection
and meaningful affected rig checks. Root owns authored geometry/skin adapter;
read-only Terra worker supplies diagnosis. Exact old vertex identity is not an
acceptance target for deliberately replaced visible geometry; physics and rig
contact/grounding invariants remain required. No fallback to the rejected visual.

P7a/P7b baseline criteria not yet measured in a new paired run; known absence is
visible in retained P6 originals and source. Freeze new candidate per package,
retain failed attempts, and continue ready work under the user's authorization.

P7a portal authority refinement before review: overhead portal masonry is new
solid architecture, so its stepped boxes are generated in dust2-map.ts and feed
both collision/shot occlusion and rendering. Existing door leaves and all ground
route coordinates stay unchanged; lowest inner arch is3.25 above local floor.
Add dust2-map.ts to owned files and recheck every ground route, not just visuals.
New physical geometry must not be a visual-only surface that bullets ignore.

P7b attempt record: original primitive uniform failed head/vest overlap and corpse
height; retained initial image at outputs/cs16/p7/characters-idle.jpg. Revisions
make head smaller, round textile/boot edges, flatten back webbing and keep skeleton
normalization independent of replacement clothing. Current nine skinned tests
pass unchanged head/contact/death thresholds; shared geometry test now verifies
shared position/normal/skin buffers plus separate faction color buffers. Paired
current image at outputs/cs16/p7/attempt-2/characters-idle.jpg. Independent Terra
review still calls the surface toy-like; status improved-but-failing,0/4 accepted
pending visual/runtime budget review. All3 failed cases rechecked; normal-round
and all-pose visual inspection remain unchecked. Further material/shape work remains.

P7c frozen card (weapon appearance,4 criteria): (1) AK has a magazine curving in
its longitudinal plane, sheet-metal receiver, appropriate wood grain and braced
front sight; (2) M4 has classic carry-handle, triangular sight and ribbed rounded
handguard; (3) USP has planar slide faces, legible ejection/serrations and clean
frame step; (4) retain hand contacts, action/muzzle/ejection anchors, 4-draw AK/M4
and existing per-weapon triangle/scene ceilings, plus paired1280x720 High views
and fire/reload/suppressor checks. References: retained user-ak-reference.webp,
user-m4-reference-1.jpeg/-2.jpeg, counterstrike-reference.jpg; original build and
FOV unknown. Approximation, not measured pixel equivalence. Root owns primary/
secondary model files, weapon-surface materials/profile and directly related page
materials/tests. Baseline three weapon JPG/DOM/budget captures under p7/baseline;
weapon source is still pre-P7. Current reference mismatch is oversized visible AK
butt stock, sideways magazine, modern M4 rail and smooth pale slab-like receivers.
Weapon framing may be revised to expose the receiver and let rear furniture exit
the lower-right edge as in the supplied reference; the older requirement to keep
all AK furniture inside frame is superseded only if that specific framing change
is made and a new paired/reference check replaces it. Functional muzzle/receiver,
hands and near-plane clearance remain necessary. No mechanics changes authorized
by this card. Continue world/character inspection after this package.

P7c framing/material oracle amendment: paired AK baseline confirms its oversized
butt stock dominates the view. Candidate brings the receiver closer and crops
rear furniture below frame; current functional muzzle/receiver remain within
16:9 and4:3 and retain the0.32m rear clearance. AK clipped visible width/height
are each capped at0.5 of viewport (project readability target), while other
weapons keep existing thresholds. Current visible reference's dark graphite
receiver supersedes the earlier pale mid-gray palette target: raw albedo test
range60–76 replaces86–100, preserving polymer30 levels darker and brighter
hardware separation. These are declared art-direction targets, not measured
original pixel values. No gameplay/budget thresholds changed. Initial candidate
that missed rear clearance was moved back0.03m before acceptance.

P7c scope refinement from pose review: held world rifles still use a separate
obsolete primitive builder, so their sideways magazines/blank modern shapes
survive the foreground fix. The side-by-side failure is visible in attempt-4
characters-idle/walk.jpg. Replace that duplicate path with the same authored
primary geometry, retaining three-draw world limits, owned disposal, existing
weapon-root transforms and explicit silencer sockets. Add world-firearm batching
integration checks to P7c dependencies; no new mechanics or arsenal scope.
The full regression run passed622 cases and failed1 old-copy locator in the
round-result proof. Its CLASSIFIED anchor is updated to the current menu label;
all receipt order/content/DOM assertions remain intact.

P7 candidate CT rejection (2026-09-14): normal CT lifecycle passed through natural
bomb detonation and automatic round-two receipt under manifest-v2 e713c5dd…73e8,
but close operator captures13/14 expose a wide flat face, balloon sleeves and a
slab-like vest. Independent CT review also rejects absent door diagonal bracing,
menu footprint and stale ATTACHING SILENCER status. Candidate is improved-but-failing,
not accepted. Root revises head/jaw/eye visibility, narrows sleeves, curves vest
onto cloth body, adds door diagonal braces, collapses settings into a compact
menu and clears completed silencer status using existing action readiness. This
explicitly adds the observed HUD defect to P7c; no timing/shot rules change. Prior
candidate captures are retained; final visual/runtime acceptance must be repeated.

P7b/P7c reference reassessment: repair-1 independently resolves head/sleeve/vest
failures at paired3m, but lifted boots retain a rectangular sole. Replace their
stacked boxes with one ankle/instep/toe profile and a matching sole; unchanged
ground/death/head/contact gates still apply. Direct root comparison of frozen
M4 to both supplied M4 references reveals stock-heavy forward framing despite
the prior projected-ratio checks. Bring receiver closer, narrow its carry handle
and replace box stock with buffer tube and fitted rear furniture. Extend the
declared AK framing rule to M4: functional receiver/muzzle inside16:9/4:3, clipped
visible footprint≤0.5 each axis, rear furniture may leave lower edge, ≥0.32m
clearance including its existing0.12m forward action envelope. Retain anchors,
hand contacts,4draw and3200triangle ceilings. Supersedes only older all-stock-in-
frame and0.5m M4 clearance targets; this is a visible-reference art-direction
change, not a source-derived numerical equivalence claim.

## User-directed strategy reset — 2026-09-14

The user stopped the active continuation after observing worsening characters and
first-person graphics. Root stopped implementation and reviewer acceptance work,
closed temporary playtest tabs, restored High quality and reset viewport overrides.
The fresh T-side run reached a natural result while being stopped, but its reviewer
did not review it; no final CT/T acceptance is claimed. A fresh final CT run had
not started. Retain the evidence as partial, user-rejected candidate history.

Root directly compared older character/viewmodel captures, the latest candidate,
and supplied weapon references. Runtime primitive assembly lost coherent anatomy
and authored surface detail. Independent edits to mounts, shapes and dark material
values failed to judge the complete hands-and-gun composition. Feature checklists
and revised framing bounds did not establish visual improvement. The strategy is
now an authored asset pipeline with one complete first-person AK/hands pilot and
one CT pilot before expansion. See CODEX_PLAN_VISUAL_RECOVERY.md for recovery
baselines, dependencies, tooling unknowns, scope and acceptance rules.

P7b/P7c remain0/4 each, explicitly regressed by user verdict. Map improvements are
retained. Current source remains the rejected fd2d2c88…05ae7 candidate; no source
rollback or further asset edit occurred during this documentation-only reassessment.
No more gameplay tests/builds are required for this planning update.


## Visual tooling package — 2026-09-14/15

The user requested toolsets built in parallel specifically for Counter-Strike.
[Visual toolkit execution](CODEX_PLAN_VISUAL_TOOLKIT.md) records implemented
capture/replay/comparison, reference ledger, Blender previews and local MCP
integrations, with actual evidence and limitations. Toolkit acceptance is
separate from P7b/P7c, which gain no visual acceptance from these engineering
checks. Use [the guide](visual-tools/README.md) for future asset-review work.


## M4 glove refinement and attachment follow-up — 2026-09-15

One material-only fingerless-glove refinement is accepted locally on the matched
Kuptchi asset. Native topology/weights/UVs/textures/rig/clips are preserved;
three tagged draw leaves replace two, within the existing weapon ceiling.
Public SHA7b0cd03d; provenance in public/assets/viewmodels/M4_SOURCE.md. Root
and independent review inspected15 paired action/aspect frames; standard
Validator, complete static preservation and exact reproduction checks pass.
649 regressions,41 targeted checks, performance1/1, lint/typecheck/build pass.
Normal input/fire/reload/pause and natural next-round receipt pass; interrupted
attempts remain labelled in m4-glove-runtime/REPORT.md.

P7b/P7c remain0/4, gained0/lost0 against their complete cards. Modern M4
silhouette and pale forearms remain unaccepted; this is a scoped improvement.
The same live check found an upright silencer after successful state completion.
The next bounded work is its frame alignment, using the existing Three/socket
contract; baseline and acceptance card are in CODEX_PLAN_TOOL_REUSE.md.
Mixamo full-body character motion still requires sign-in. Earlier stopped
receiver, grip and rest-pose attempts remain stopped.
### M4 attachment-frame correction — 2026-09-15

Accepted locally as a scoped fix: the M4 silencer now follows the authored
barrel. The adapter normalizes one loaded socket frame; GLB, hand/gun motion,
generic attachments and gameplay timing are unchanged. A failing-before test,
independent numerical/source review and actual gameplay images establish the
correction. Unsilenced reload is pixel-identical. Six focused,650 regression
and one performance check pass; lint/typecheck/Sites build pass. The initial
draw card omitted the existing flash Sprite; its explicit corrected metric
is four meshes plus one Sprite, unchanged before/after. Runtime removal is
unchecked after player death. Evidence and precise limits:
outputs/cs16/reuse/m4-silencer-alignment/ROOT_REVIEW.md.

P7b/P7c remain0/4 each, gained0/lost0; the complete character and viewmodel
criteria remain unaccepted. The next selected authored full-body animation
pilot is blocked on Mixamo sign-in. Rechecked tab19 still shows Log In/Sign Up;
the prepared FBX has not been uploaded. Existing map/gameplay work is retained.
