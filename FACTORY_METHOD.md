# CS1.6 factory method

This document defines how work is selected, built, measured, reviewed, and
reported. The linked [CS1.6 facsimile project plan](./CODEX_PLAN_CS16_FACSIMILE.md)
defines what the project is trying to reproduce: scope, dependency nodes,
reference decisions, and the progress record. If an older project document
conflicts with this method, this method governs the workflow while preserving
the proof gates and performance ceilings below.

## Decide reuse, adaptation, custom work, or deferral first

Before assigning a production builder, establish whether new custom work is
necessary. Inspect existing project code/dependencies, available tools and
relevant reusable assets or established workflows. Compare reuse, adaptation,
custom implementation and deferral against the same player-visible target.
The coordinator records the decision; this is not an extra user-approval gate.
An explicit user pause still governs implementation.

Choose the next package by the largest unresolved player-visible defect it can
credibly change. Prefer a coherent character/rig/clip or gun/hand/animation
assembly over independently attractive pieces that require specialist repair
to fit together. Name the complete visual outcome before listing subtasks.
Small regression fixes remain worthwhile, but their completion does not replace
that outcome or justify indefinite polish on an incompatible source.

Check critical access at selection time: local files, required tool capability,
service sign-in, and permitted import/export path. Keep unavailable access
separate from demonstrated asset incompatibility. A service blocker blocks
that route; select another ready package only when it advances the same visual
priority or removes a demonstrated setup cost. Do not manufacture busywork or
repeat an unchanged search. Recheck access after an actual state change or at
resumption, rather than polling it throughout unrelated work.

Keep the search proportional. A small fix can use a one-line rationale. For a
specialist subsystem or asset, declare a search budget and stop rule, inspect a
few credible candidates, and select one representative pilot. Do not search
indefinitely or collect alternatives after a suitable solution is qualified.
“We can implement it” and “this library exists” are not sufficient decisions.

Evaluate the complete cost: quality/behavior fit, exact asset and code licenses,
editable source, rig/data compatibility, local tool access, integration and
adapter work, runtime load/memory/frame costs, maintenance, reproducibility and
the custom responsibilities that would actually disappear. Distinguish offline
authoring tools, build-time processors and runtime dependencies. Prefer existing
capabilities and thin adapters; do not add a framework without a concrete gain.
For browser-delivered assets, establish that their terms cover the delivered
mesh, textures and clips. Preserve the project's exclusion of original game art.

Record the following with the acceptance card:

```text
Need / player-visible target:
Options inspected: reuse, adapt, custom, defer; sources and reasons
Choice and evidence: proposed, qualified, rejected, or deferred
Tool/asset version and license; access and compatibility unknowns:
Custom code/work retired; retained responsibilities and adapter cost:
Representative pilot, frozen baseline, checks, search/attempt stop rule:
```

These are solution-selection states, separate from the QA verdicts below. A
documentation claim or successful export makes a candidate eligible for a pilot,
not qualified for production. For visual work, inspect the offline asset first,
then prove its materials and representative animation inside the actual renderer
before expanding to an asset family. A whole-image comparison must demonstrate
improvement; component counts cannot grant visual acceptance.

Select standard authoring, animation and format-processing operations before
writing their equivalents. Record exact versions, source provenance, commands
and retained outputs. Process copies, preserve editable originals, and retire
superseded custom paths after qualification. Do not retain an unused fallback.
Current project candidates and bounded experiments are recorded in
[the tool reuse plan](CODEX_PLAN_TOOL_REUSE.md); that list is not an installation
order or a claim that its candidates have passed a pilot.

## Freeze an acceptance card before implementation

Before editing, record one card in the plan containing:

- ID and a player-visible criterion.
- Reference, build, settings, and provenance.
- Reproducible inputs and seeds.
- Metric units, threshold, and noise rule.
- Dependencies, files owned, tests/evidence, baseline, and candidate revision.
- Reuse decision, custom-work rationale and deliverable-specific validation stage.

When original material is unavailable, use an explicitly labelled approximation
card with an independently checkable target. This can accept project behavior;
it cannot establish original equivalence. Record the oracle change in the plan
and preserve old results. Lack of an original installation alone is not a blocker.

If the baseline or reference has not yet been measured, say **baseline/reference
not yet measured**. Do not infer a pass from an unmeasured comparison. Establish
that the planned test catches the known defect against the baseline, then make
the change and measure the identical setup again. For a new capability, show
that the baseline lacks the expected behavior. Keep the comparison paired:
same route, viewport, settings, seed, capture rule, and metric units unless the
card explicitly declares a change.

At chunk entry, freeze the acceptance card, dependency assumptions, reference
set, thresholds, evidence paths, and owned-file boundary. A scope or threshold
change requires a visible reason in the plan and a fresh baseline/rebaseline;
never silently move the goalposts.

## Build, verify, and accept

Chunk completion is a progress checkpoint, not a stop or permission boundary.
Continue to the next ready package under the user's existing implementation
authorization. End execution only when the agreed scope is complete, the user
asks to stop, or a concrete blocker requires external input. Report progress
in commentary while continuing; do not require another "go" after each chunk.

The coordinator chooses ready issues that contribute to a named epic, each with
a recorded solution choice. Assign one accountable Luna builder per bounded
issue, or a Terra subsystem worker when the work is a contained subsystem.
Use a fresh verifier, ideally Terra for complex checks. The coordinator uses
frontier reasoning for ambiguous architecture, difficult visual judgments, and
final acceptance. Do not nest spawning.

Joseph's 2026-09-16 direction removes the fixed two-builder limit and authorizes
independent issue agents in their own Git worktrees. Expand parallel work when
dependencies, disjoint file ownership and agreed interfaces make the issues
independent. Respect the active platform's concurrency limit and available
review capacity; queue additional ready issues when those slots are occupied.
This policy applies within authorized implementation scope and does not restart
paused work or authorize publication, merges or deployment.

Before dispatch, record the epic/issue, worker/session, worktree path, branch,
base revision, owned files, interface contract, reviewer and acceptance card.
Each worker uses its own worktree, preview port and evidence directory. Worktree
isolation does not resolve shared-code conflicts: give common runtime modules,
registries and interface changes one owner, or sequence their edits through the
coordinator. Serialize integration into the common candidate and rerun affected
checks after each accepted integration.

Independent issues may have visual candidates in parallel. Freeze each exact
issue candidate while it is reviewed; invalidate affected review evidence if
its source or dependencies change. Retain one frozen integrated candidate for
epic or final product acceptance. Workers report the exact revision, changed
files, checks and raw evidence, blockers and next action to the coordinator.
The coordinator evaluates those results, records the Linear verdict and reports
accepted progress and remaining gaps to Joseph; a worker's completion report
alone does not mark an issue or epic Done.

Give a worker only the objective, selected reusable tool/asset and integration
boundary, relevant files, invariants, check commands, and expected evidence
paths. For a repair, reuse the focused worker; on an
approach change, use a fresh worker. Set `fork_turns: none` for this focused
context. Workers return concise results with raw artifact references. Do not
wholesale re-feed logs or source; use deterministic script checks and named
evidence paths. Fresh workers still receive shared system/tool instructions;
context isolation is not zero overhead. Nothing here implies an automatic scheduler.

Match validation to the deliverable and its stage:

| Deliverable | Required evidence before advancing |
| --- | --- |
| Documentation/research only | Source support, links, decision/status consistency; no gameplay tests or build. |
| Offline asset or processing experiment | Inspect mesh/materials/deformation or output data; validate exported formats, provenance and resource counts. Reject visibly poor assets before gameplay integration. |
| Asset inside the renderer | Actual materials and representative motion at fixed views; sockets, contact, grounding, ownership and resource limits; affected regression checks. |
| Runtime integration | Targeted and affected accepted checks plus start/input/fire/pause/round-transition smoke evidence. |
| Integration milestone / final product acceptance | Full regression suite and build; final acceptance also requires the independent normal rounds below. |

Use that sequence to reject poor candidates cheaply. First establish the
native appearance and reference-frame contract; then inspect a few decisive
whole-asset views before producing the complete frozen capture set. Reuse the
existing preview/replay tools. When a missing fixture repeatedly forces manual
setup, scope one small extension around the production renderer and measured
missing state. Label controlled previews honestly; they do not replace normal
gameplay or the final independent rounds.

Finish the bounded source/adapter changes before normal integration smoke so
hot reload does not repeatedly discard the same setup. Reuse evidence only
while its candidate hash, code dependencies and setup remain valid. Run affected
checks once per stable candidate; repeat them for new changes, failures or
unresolved concerns. The table's required checks, full regression/build gates
and two independent final rounds remain in force.

When an asset enters the running game, both renderer and runtime integration
requirements apply. Standard format validation does not replace game-specific
checks or visual judgment. Preserve before/after exports and validator reports;
resolve errors and record dispositions for warnings. Verify any optimization
preserves required sockets, rigs, clips, morphs, UVs and metadata. Compressed
formats require compatible loader support and a measured benefit.

For an asset adapter, verify its coordinate and rest-pose contract before using
a failed measurement to reject the source. Check units, proper rotation bases,
exactly-once parent/world conversion, homologous bind-frame dimensions, and
achieved versus requested joint positions. Compare the same interaction in the
native source. Preserve implementation failures separately from demonstrated
source incompatibility; neither a corrected transform nor a copied component
accepts the complete visual assembly.

For humanoid animation, compare actual limb directions and palm planes in the
source and target reference poses. A constant rest-relative matrix error can
preserve an A-pose/T-pose mismatch throughout an otherwise exact transfer. If
grounding needs an unexpected whole-body shift, identify the lowest evaluated
skin vertex and its bone influences before assigning the cause to body shape.
Passing pelvis/head limits does not accept a body propped up by an unintended
arm contact.

For cross-format rig checks, establish each API property's coordinate space
before comparing it. Blender `Bone.head` is parent-relative; `head_local` and
`matrix_local` are armature-relative. Use actual world rest/pose transforms and
evaluated vertices with verified correspondence. Report translation in metres,
rotation in radians, and scale separately. A mixed 4x4 component difference is
not a distance. Preserve an invalid verifier's evidence and record the corrected
oracle explicitly before changing a source asset to satisfy its measurements.

Record exactly what was rechecked and what remains unchecked. An offline export
does not justify a full-round test, and a passing full round cannot rescue a
failed offline or in-renderer visual comparison.

The verifier reruns the known-defect test on the candidate and measures the
same setup after the edit. A builder's success narrative is not evidence. For
browser checks, confirm the preview serves the candidate checkout and use the
active server's actual URL; do not reuse historical ports without verification.

Before a costly capture set, validate the measurement itself against the known
failure and a separately justified control where available. Confirm object
identity, coordinate spaces, units, expected hashes and executable threshold
assertions. A measurement fault is repaired in the verifier while the source
stays frozen; it is not evidence for another asset deformation attempt. Preserve
invalid results and link the corrected verdict explicitly.

For final acceptance, the candidate must be immutable while two independent
reviewers each perform a complete normal real-time round from briefing through
a visible result, in fresh tabs or browser sessions. They must not read the
other reviewer's report, screenshots, route outcomes, or verdict. Each reviewer
records its own inputs, limitations, original screenshots, visible-DOM status
proof, diagnostics, and report. The root inspects both sets of raw originals
and makes the final decision; reviewer verdicts are evidence claims, not
acceptance.

Retain the existing full-round proof: real keyboard-playtest simulation,
visible movement and accepted fire, a living teammate or opponent, death or
close contact when encountered, and the round-result evidence paired with the
same capture's visible DOM record. Preserve both presets' graphics ceilings,
listed in the plan and grounded in `app/graphics-budget.ts`. Transition budget
snapshots must remain labeled by reason (`play-start` and `round-prepared`),
identify the weapon and visible viewmodel, and include nonzero viewmodel draw
proxy and triangle fields. These snapshots are transition evidence, not
per-frame claims. Old accepted snapshots are historical context only.

## Status and reporting

Use these QA verdicts: **accepted**, **improved-but-failing**,
**unchanged**, **regressed**, **unverified**, or **blocked**. For every chunk,
report accepted/frozen total, passes gained, passes lost, failed and rechecked
regression cases, and unchecked cases explicitly. Never invent totals. Unit-test
counts, self-scored fidelity percentages, and commits are not product progress.
Report runtime evidence only when execution actually happened.

Keep known-good work without destructive git reset. A regression is immediate:
stop, preserve the last known-good candidate, identify the affected case, and
recheck it before further scope expands.

## Plateau and routing rules

If the same target has two attempts without a newly accepted criterion or a
predeclared, repeatable error reduction, diagnose input, reference, context,
and approach. Reopen the reuse decision: inspect the chosen tool, source asset,
authoring workflow and integration boundary, and identify which assumption
failed. Switching models/workers alone is not a revised production strategy.
For specialist visual failures, reconsider sourced meshes, compatible rigs,
authored clips and materials before another numerical geometry repair.
Make one revised bounded attempt; if it still cannot establish
progress, report **blocked** with the evidence. Unrelated easy passes never
reset a plateau. Routing is provisional after observed rework; after two failed
assignments, root reassigns to a stronger or better-matched worker.

## Token and cost accounting

For comparable accepted packages, objective spend is actual coordinator,
worker, reviewer, and failure input/output tokens divided by accepted packages.
Cost is not a token count. The current collaboration tool has no per-agent
token totals; mark them unavailable unless actual telemetry exists. Attempts and
elapsed time are not proxies. With zero accepted packages, the denominator is
undefined: report spend only and compare matched workload.

## Handoff and attempt record

Persist each handoff with source revision, acceptance evidence, unresolved
questions, and the next action. The linked plan's progress record is the
authoritative summary. When execution occurs, retain ignored output artifacts
at their stated location with provenance; if that evidence is unavailable when
work resumes, mark the result **unverified**. Create runtime artifacts only
when the runtime is executed; this method document creates none.

Give each candidate one evidence entry point containing its identity, known
failure, final verdict, raw checks/captures and unchecked cases. Link worker and
reviewer evidence beneath it rather than copying their narratives into several
plans. Keep the current work queue near the top of the reuse plan; older attempt
records remain historical. Report current visual outcome and next dependency
first, with test totals as supporting evidence.

Use this compact record in the plan or an execution report when work occurs:

```text
Attempt: <chunk ID / attempt>
Solution choice: <reuse/adapt/custom/defer; decision and provenance link>
Card: <criterion, setup, threshold, baseline state>
Owner/reviewer: <agent and independent reviewer>
Candidate: <immutable revision/checksum>
Known-defect baseline: <test + result>
Repeat measurement: <same setup + result + units/noise rule>
Evidence: <raw originals, DOM records, logs, source paths>
Validation stage; custom work retired/retained: <scope and remaining work>
Status: <one allowed status>
Accepted/frozen total; gained; lost; failed/rechecked; unchecked: <explicit values>
Unresolved / next bounded action: <text>
```

Optional background reading: [Anthropic, Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
and [Cursor, Agent swarm model economics](https://cursor.com/blog/agent-swarm-model-economics).
