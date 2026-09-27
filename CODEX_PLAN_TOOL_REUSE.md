# Tool and asset reuse review — 2026-09-14

## Decision and authority

**Current execution state, 2026-09-15: paused by the user at the verified M4
checkpoint.** The implementation history below remains evidence, not a request
to resume. [Session lessons](PROJECT_MEMORY.md) and [handoff](HANDOFF_CS16.md)
record the next-session boundary.

**Latest visual feedback, 2026-09-15:** the user said, “By the way the m4 looks
great. The other guns still look pretty bad.” The current M4 appearance is now
user-approved and is the visual reference to preserve. This supersedes earlier
M4 restyling priorities based on its modern receiver or pale forearms. Other
firearms remain visually rejected. The statement does not approve every action,
the separate world model, other guns, or the complete game. Implementation stays
paused. Current asset SHA7b0cd03d and adapter SHA8fb68ff1 are unchanged.

## Strategy adjustment — 2026-09-15

The user asked to adjust strategy after the checkpoint reflection. This section
sets the next execution order; the older U1/U2/U3 and attempt entries below are
history and background, not a queue to replay. Implementation remains paused.
The existing engine, performance limits and complete multi-weapon checks are
unchanged. The later M4 appearance approval above updates the visual direction
for that weapon; it does not complete the multi-weapon P7c criteria.

### Decisions from the session

- **Work toward one complete visual result.** The next priority is a believable
  armed CT using a compatible body, rig and authored motion. A material fix or
  precise wrist residual is useful evidence but cannot substitute for a proper
  whole-body hold, motion and ground support. Keep the current M4 glove/silencer
  checkpoint stable while this is addressed; no further cosmetic rifle tuning
  merely because the character route is blocked.
- **Qualify the pairing before polishing the pieces.** Inspect the selected
  character's authored rifle hold with the actual carried weapon before adding
  more clips or changing clothing/geometry. If that source cannot meet contact
  and posture requirements after its coordinate contract is verified, revisit
  the complete body/rig/animation pairing. Do not restart the failed numerical
  finger, limb, death or receiver adaptations under a new task name.
- **Test access before investing further.** The reduced-doll FBX is already
  prepared and validated; do not re-export it for lack of Mixamo access. At
  resumption, check Buzz/tool availability and Mixamo access once. A working
  service UI still does not establish a qualified animation or delivery license.
- **Remove measured setup waste with existing tools.** The fixed preview lacks
  silencer selection, while normal rounds require money and can end mid-check.
  Extend that preview only when a selected weapon/attachment package needs it.
  Keep ordinary integration smoke and final independent rounds separate.
- **One candidate, one readable evidence entry point.** Freeze final bytes and
  the code affecting the candidate before the full paired capture set. Verify
  the checker against the known failure before trusting its pass. Keep raw
  evidence, invalid runs and the final verdict linked together; avoid another
  chain of overlapping summary documents.

### Work queue when the user resumes

| Order / state | Bounded work | Exit evidence and stop rule |
| --- | --- | --- |
| 1 — access check | Reuse the prepared MPFB reduced-doll FBX and check the selected Mixamo workflow's actual access. No new preparation. | Record accessible/blocked and the next dependency. A sign-in blocker ends this route's work until access changes. |
| 2a — if accessible | Qualify one character-specific authored rifle hold, first in the source workflow, then an isolated real-renderer CT candidate with the current carried weapon. | Same source/reference proportions and units; complete front/three-quarter body and close grip views, frozen contact/ground/visual limits. Only a qualified hold advances to motion/death integration. Apply the existing attempt/plateau rule. |
| 2b — if blocked | One alternative-source review for a complete licensed body/rig/authored-rifle-animation pairing that avoids the failed cross-rig repairs. Reuse the existing source ledger before searching. | At most three credible candidates or30 minutes, whichever comes first. Name editable source, mesh/texture/clip rights, local access, rest-frame compatibility and whole-assembly preview. No candidate is qualified by this plan. If none qualifies, record the route blocker; no speculative builder assignment. |
| 3 — only after a hold passes | Extend that same coherent CT candidate to walking, crouching and death, using authored clips and existing carried-weapon/drop behavior. | Existing full character criteria, source-to-renderer checks, affected runtime checks and normal smoke. Preserve separate failure evidence if a clip or transition fails. No character-family expansion until the representative CT works. |
| 4 — other firearms, after CT qualification or a concrete CT route blocker | Preserve the user-approved M4 and improve another gun using a complete matched gun/hand/animation source. Inspect suitable existing Kuptchi pack assets first, then other eligible sources if needed; a shared pack is not automatic qualification. | Qualify one representative other weapon before expanding: clear silhouette, convincing hands/materials and authored actions in the actual renderer, using the M4 as a quality reference while retaining weapon-specific requirements. Review at most three credible candidates or30 minutes. No M4 receiver/restyling work is in this queue. |

The alternative review is a changed selection strategy—complete compatible
assemblies instead of more repairs to known mismatched pieces. It does not
retroactively qualify previously rejected sources. One visual candidate is
active at a time; an independent reviewer or a disjoint, necessary tooling
task may run alongside it under the existing factory limits.

If both CT routes are blocked, record that dependency and advance to the
bounded viewmodel selection while the user's resumed authorization remains
active. A source review with no qualifying candidate is a blocker, not visual
progress. If neither route has an eligible next action, report the specific
missing input; do not fill the session with repeated cosmetic or tooling work.

### Conditional preview task, not an implementation started today

If the next selected viewmodel package needs attachment inspection, adapt
`app/visual-toolkit.ts`, the existing `app/page.tsx` preview adapter and
`scripts/visual-capture.mjs` to select attached/detached state explicitly in a
localhost-only asset preview. Render the production attachment and authored
action sample; do not build a second weapon renderer or add production cheats.
Record the selected attachment, actual visible state, action/time and source
identity in the existing manifest. Unsupported combinations must be rejected.
Keep normal page behavior and the user session unchanged.

Acceptance for that one tooling task: reproducible attached/detached captures
through representative Idle/Fire/Reload/Equip samples, fresh output paths,
truthful metadata, unchanged ordinary-game behavior and existing locality
guards. No new package dependency is justified by this missing state. Fixed
poses remain rendering evidence, not completed attachment timers, accepted
shots, real-time FPS, audio sync or final gameplay acceptance. The task is
deferred if no selected visual package needs it.

Likely later integration files are `app/skinned-character-visuals.ts` and the
existing export/clip-processing tools; exact ownership and card inputs are
frozen after source qualification. This strategy revision changes documentation
only. Its evidence is [today's reflection](PROJECT_MEMORY.md), the
[current checkpoint](HANDOFF_CS16.md), the
[actual preview API](app/visual-toolkit.ts) and
[runtime smoke limitations](outputs/cs16/reuse/m4-silencer-alignment/runtime/REPORT.md).

## Original reuse review — 2026-09-14

Revise the factory to decide **reuse, adaptation, custom implementation, or
deferral before assigning production work**. The failure was not lack of access
to Blender: we used it mainly as an execution environment for more custom
modeling. Reusable topology, clothing, skinning, animation and material workflows
need evaluation before more specialist work is coded.

The documentation review is complete. The user subsequently directed “Once you
are done, start over,” authorizing a fresh asset approach under these gates.
Implementation has resumed without resetting the map or accepted gameplay.
Candidates below are evaluation priorities, not qualified integrations. Existing
AK and CT pilots remain unaccepted comparison controls.

## Evidence in this checkout

- [Current factory](FACTORY_METHOD.md) previously began with an acceptance card
  and builder assignment. It had no required comparison with reusable solutions.
  Its blanket gameplay-smoke rule also applied to offline asset candidates.
- [CT authoring](scripts/author-ct-pilot.py) shapes proportions and garment
  surfaces itself. `add_mixamo_weights` assigns weights by coordinate thresholds;
  using two bones at a joint does not establish good deformation. The worker's
  first-render defects remain recorded in [the handoff](HANDOFF_CS16.md).
- [AK authoring](scripts/author-ak-pilot.py) uses Blender operations, but supplies
  its own numerical profiles, wrist extrusion and UV rules. The change established
  editable/exportable assets; it did not eliminate specialist modeling work.
- [Character presentation](app/skinned-character-visuals.ts) already uses Three.js
  `AnimationMixer` and authored locomotion clips. Its arm solver has an explicit
  elbow pole, reach clamping and palm offsets. Those responsibilities must appear
  in any proposed replacement comparison.
- [AK loading](app/authored-rifle-viewmodel.ts) uses a normal GLTFLoader. No Draco,
  Meshopt or KTX2 decoder setup was found in the app/scripts search. Compression
  options therefore require a loader and startup-cost decision.
- [Package manifest](package.json) already includes Three.js. Its installed addon
  contains CCDIKSolver; no additional IK framework is needed merely to try it.
  glTF Transform, Validator, Recast and Rapier are not direct project dependencies.

These are source observations, not new runtime tests or visual verdicts.

## Evaluation priorities

| Candidate | What reuse could replace | Qualification experiment and decision |
| --- | --- | --- |
| **MPFB with compatible character/clothing assets** | Hand-shaped body regions, coordinate-based weights and parts of clothing/material/export preparation. | First priority. Evaluate a clothed CT-like character, native rig and export workflow. Demonstrate actual renderer materials and idle/walk/crouch/weapon-hold motion within existing budgets. Neither a finished SWAT outfit nor compatibility with our retained rig has been established. |
| **Licensed weapon-and-hand source assets or editable templates** | Most numerical weapon profiles, hand modeling, UV authoring and authored action motion. | Same first priority. Shortlist a few identifiable sources, inspect the actual editable asset and exact reuse terms, then choose one AK-plus-hands candidate. No weapon asset has been qualified by this review. Compare against the supplied reference and paused pilot under the same camera/light rules. |
| **Khronos glTF Validator and glTF Transform** | General-purpose format checks, resource inspection, deduplication and selected optimization steps. | Second priority, at the first candidate export. Use local pinned development tools, retain their reports, and validate before and after processing. These tools cannot judge anatomy, costume, grips or composition. |
| **Authored clips, then Three.js CCDIKSolver if needed** | Manual posing/deformation that an appropriate rig and clips can supply; potentially a narrow arm-target solver. | Third priority. Establish a compatible animated asset first. Compare CCD with the current two-bone solver on one arm through reach, aim and crouch extremes. Keep the existing solver if the adapter/constraints cost outweighs the benefit. |
| **Recast Navigation** | Walkable-surface generation and path queries. | Defer until a demonstrated navigation problem warrants a pilot. For this static map, evaluate offline generation plus runtime queries first. Keep tactical choice and the current movement controller; crowd steering is a separate behavior change. |
| **Rapier character controller** | Collision queries, slope/step handling and ground snapping. | Defer. Require a documented collision limitation and paired movement tests before introducing a physics engine. Its controller does not supply the game's acceleration, gravity or Counter-Strike movement tuning. |

The intended division is authoring tools offline, validation/optimization at
build time, and only necessary animation/pathfinding support at runtime. A whole
engine or agent-orchestration framework replacement is not justified by the
current visual failure.

## Important qualifications from primary documentation

MPFB documents character, clothing, skin and rig workflows. Its export-copy
operation can bake selected modifiers and remove helper/hidden geometry while
preserving the editable source. These are concrete alternatives to custom export
preparation. [MPFB](https://static.makehumancommunity.org/mpfb.html),
[export copy](https://static.makehumancommunity.org/mpfb/docs/exporting/export_copy.html).

MPFB's Mixamo workflow uses a specific rig and a reduced export character; it
warns that different character proportions can distort reused animation. It does
not establish automatic compatibility with our Vanguard skeleton. Core assets
are CC0; third-party clothing and other assets need their own license check.
[Mixamo workflow](https://static.makehumancommunity.org/mpfb/docs/rigging_posing/mixamo.html),
[asset licensing](https://static.makehumancommunity.org/mpfb/faq/use_in_closed_source.html).

Validator checks glTF/GLB structure, references, buffers and animation data and
produces a JSON report. glTF Transform supplies reusable processing operations.
Select operations deliberately: preserving a gameplay socket or animation target
matters more than reducing a file's node count. Decoder requirements and actual
GPU texture memory must be measured separately from download size.
[Validator](https://github.com/KhronosGroup/glTF-Validator),
[glTF Transform](https://gltf-transform.dev/).

CCDIKSolver works with a SkinnedMesh and skeleton-indexed targets, effectors and
links, with rotation limits and iteration controls. Our current targets are
Object3D sockets and the two-bone solver explicitly chooses the elbow direction.
An adapter and a visual stability comparison are therefore required; the API
being available does not establish a net simplification.
[Three.js CCDIKSolver](https://threejs.org/docs/pages/CCDIKSolver.html).

Recast's JavaScript port supports offline mesh generation, runtime queries and
optional crowd simulation. Rapier supports slopes, autostep and ground snapping,
but its character controller takes a movement vector from the application,
including application-supplied gravity. These are bounded reuse opportunities,
not evidence for replacing accepted game behavior now.
[Recast](https://github.com/isaac-mason/recast-navigation-js),
[Rapier](https://rapier.rs/docs/user_guides/javascript/character_controller/).

## Next bounded work when implementation is resumed

### U1 — qualify reusable character and viewmodel sources

1. Freeze the existing references, paused asset/source hashes, map, lighting,
   cameras and numerical gameplay/resource limits. Existing pilots are controls,
   not accepted art or an obligation to preserve their construction method.
2. Inspect installed capabilities and official workflows, then compare at most
   three credible candidates per asset family. Record a search budget and stop
   rule before searching. One well-supported existing solution is enough; there
   is no quota to collect alternatives. Include reuse of the current asset only
   where visible evidence supports it.
3. Record the exact source/version, license for the mesh/textures/clips, editable
   files, runtime delivery rights, rig/rest-pose requirements, materials/export
   path, custom work remaining and custom functions that could be retired.
   Asset-store previews and the label “free” do not qualify an asset.
4. Produce one offline textured candidate with a working rig. Inspect full-body
   front/side/three-quarter views and deformations, or the complete first-person
   gun/hand composition. A poor offline result does not enter the main renderer.
5. Once promising offline, load it in the actual Three.js renderer and exercise
   representative motion. Compare fixed 4:3, 16:9 and normal viewport evidence.
   Preserve existing contact, grounding, proxy and resource gates. Record any
   reference-driven criterion change before producing the comparison.
6. Continue to additional assets only after whole-image visual improvement and
   functional integration are demonstrated. If candidates fail, record why and
   choose another source/production method before returning to custom modeling.

U1 output: a short reuse decision, exact source provenance, editable source and
export, original paired screenshots, action evidence and a retained/retired-code
list. Custom implementation is allowed when its need is evidenced; a tool list
or successful export is insufficient.

### U2 — standardize processing for the selected export

Use pinned local development dependencies when implementation resumes. Run
Validator on both the original export and processed output; keep both files and
JSON reports. Resolve errors; assess warnings individually with reasons rather
than suppressing them wholesale. Test the validator gate on a deliberately
invalid disposable fixture so the check demonstrably fails when it should.

Start with inspection and selected conservative operations. Preserve named
sockets, bones, clips, morphs, UVs and required extras. Compare rendering and
resource budgets before/after. Add lossy simplification or compressed extensions
only for a measured benefit with compatible loader support. Never optimize the
only editable/source copy. Thin project wrappers should orchestrate standard
tools, not reproduce their internals.

### U3 — evaluate animation reuse on the qualified rig

Use native/baked clips with AnimationMixer first. If contact still requires
runtime correction, compare one CCD arm chain with the current solver. Freeze
hand-target error, elbow stability, update order and frame cost checks before
running it. Preserve gameplay sockets and hit proxies. Retire superseded solver
code only after the replacement passes; do not keep an unused compatibility path.

## Scope and validation of this review

Owned changes: this plan, FACTORY_METHOD.md, the active recovery/facsimile plans,
and HANDOFF_CS16.md. No application, asset, dependency or worker changes. Check
Markdown links, status consistency and the unchanged implementation hashes in
`outputs/factory-reuse-review/implementation-before.json`. No gameplay tests or
build are required for this documentation-only review. Project completion and
asset visual acceptance remain unchanged.

Review completed: the factory and linked plans/handoff were updated. Local
Markdown links and `git diff --check` passed. All 205 implementation, asset and
configuration file hashes matched the pre-review snapshot. No dependencies were
installed and no gameplay/build or asset-production work ran. Verification:
`outputs/factory-reuse-review/verification.json`.

## U1 entry card — fresh approach authorized

- Need: coherent classic CT costume/anatomy and a convincing AK-plus-hands view.
- Decision: evaluate MPFB's existing character/clothing/rig workflow and licensed
  source assets. Adaptation is proposed; new custom anatomy/weights/profiles are
  not selected as the default. Preserve the previous source/evidence.
- Research bound: up to three credible source candidates per asset family, with
  an initial 30-minute search budget. Stop searching once one source has suitable
  provenance, editable/runtime deliverables and a plausible visual fit; then
  inspect a representative actual asset. Search time is not quality acceptance.
- Retire if successful: numerical CT shaping/weights and numerical weapon mesh
  authoring; retain gameplay state, effects/sockets, map, and relevant tests.
- Frozen gates: prior supplied visual references and fixed 74-degree projection;
  CT <=12000 triangles / 2 draws, AK <=3500 weapon triangles, arms <=4000,
  combined <=6 draws; same map, camera/light poses, 4:3/16:9/native comparisons.
- Pilot first: clothed textured rig in offline poses, then actual renderer motion;
  AK/hand composition idle then fire/equip/reload. No family expansion before
  visual qualification. No engine/navigation/physics changes.
- Status at entry: 0 newly accepted visual criteria. Root selects sources and
  owns integration; fresh bounded workers may evaluate qualified workflows.

### U1 source selection and U2 tooling evidence

- Downloaded and inspected WRAD arms commit `f3987244176c33d2c20d4f9e139980af12684d87`: 1,196 triangles, authored skinning and IK/finger controls, textures, no clips. CC0-1.0 source/license retained. Selected for adaptation; the bare-hand costume and grip remain unqualified.
- Inspected Stein Games v1.1 AK FBX: 16,578 triangles, UVs, textures and a 17-bone parts rig, no clips. CC0-1.0 pack license retained. Selected for a bounded reduction/composition pilot. Correcting imported alpha from zero to one restored its proper opaque material; whole source render is `outputs/cs16/reuse/stein-source.png`.
- Inspected Tabasco AK alternate: 1,108 triangles, no UVs. Its surface-authoring cost is higher, so it is not the first pilot. The third high-poly source is unnecessary after selecting the textured Stein source. No more weapon search before this pilot is judged.
- Downloaded MPFB v2.0.17 and compatible core/suits/gloves/helmets/masks/boots packs with SHA-256 provenance. A fresh Terra asset worker is using MPFB services; another owns AK/WRAD adaptation. Owned paths are disjoint and neither may integrate into the runtime.
- Installed development-only `@gltf-transform/cli@4.5.0` and `gltf-validator@2.0.0-dev.3.10`. Added a thin local report command, `scripts/validate-gltf.mjs`. Actual reports are in `outputs/cs16/reuse/validation/`.
- Validator: old AK control 0 errors/0 warnings; WRAD source 0 errors/1 skin-parenting warning. Dedup copy saves 2,400 bytes and retains node names/extras, skin size, clips, triangles and attributes; warning remains and requires an export disposition. A deliberately malformed file produces exit 1 and a retained failure report, so the command demonstrably rejects bad input.
- Lint/typecheck and the Sites production build passed after adding tooling. The 17 existing rifle/camera regression tests also passed against the unchanged runtime control. Renderer checks for new assets remain pending. Existing dependency audit findings are retained in `outputs/cs16/reuse/npm-audit-after.json`; no reported finding names the newly added tooling packages. No unrelated upgrade performed.
- Source renders are inspection evidence, not frozen game-camera comparisons. The offline pilots, actual renderer materials/motion, and all four user-facing visual targets remain unverified. Accepted visual targets 0/4; gained 0; lost 0. Map/gameplay untouched during source selection.

### U1 first pilot failure and revised method

The first assembled assets failed offline inspection and were not integrated.
MPFB's first costume collapsed under excessive reduction; unmodified MPFB
body/clothing and mask-only diagnostics remain coherent. A 173,880-triangle EMT
coat/M1 helmet outfit is the wrong source for this budget. The revised costume
uses a native long-sleeve outfit, compatible Mindfront tactical vest, full cloth
hood and MPFB Mixamo rig. Source-material preservation precedes reduction.

The initial AK/WRAD assembly used mixed coordinates and treated bone-local control
locations as world positions. Failed passes are retained under
`outputs/cs16/reuse/ak-arms/attempt-1-hard-fail/` and `attempt-2-no-arms/`.
Reassessment found that WRAD already faces Blender +Y while Stein faces -Y;
rotating both swaps the arms. A single Blender Z-up scene, only the gun's 180°
rotation, correct native control matrices, and an explicitly vertical 74° camera
produce a coherent new render. Its support forearm enters from the bottom center;
stock framing and final palm contact still fail. Next bounded step aligns the
source muzzle to the existing mount, poses native hand controls against actual
surfaces, and exports a baked qualification copy with its editable rig retained.
This is measurable repair of the import/pose defects, not a visual product pass.

Game-camera controls are now captured in `outputs/cs16/reuse/baseline/` at 4:3 and
16:9, with source hashes. The old asset remains served. Targeted baseline checks:
17 passed; 0 failed. Sites build, lint and typecheck pass with new development
tooling. No runtime asset replacement yet; motion, final visual comparisons and
full normal-round acceptance remain unchecked.

### U2 independent review and source-art checkpoint

Independent tooling review accepted valid embedded GLB and local external-buffer
inputs, rejected malformed inputs, and verified dedup preservation and source
hashes. A resource-containment defect was fixed using resolved real paths; parent
and symlink escapes now fail with retained reports. Existing lockfile package
versions, resolved URLs and integrity values were unchanged. Evidence:
`outputs/cs16/reuse/tooling-review/REVIEW.md`. This accepts the bounded tooling
scope only; visual targets remain 0/4 accepted.

The revised AK composition fixes swapped/missing arms and enlarges the receiver
with a muzzle-aligned source transform. Native controls place the palm landmarks
at their targets; actual mesh contact and an exported round trip still require
inspection. The MPFB coveralls/vest source has coherent anatomy and garment fit,
but root rejected a faceless hood and over-dark material tint before reduction.
Its 120,005 source triangles are not a budget pass. Small edits to the sourced
hood and imported materials precede further processing; native body/weights stay
intact. No family expansion or runtime replacement has occurred at this point.

### U1 actual renderer pilot and headgear source reassessment

The AK/WRAD static pilot is now loaded locally through the normal rifle loader,
with native UV textures and game sockets. glTF Transform converts source socket
metadata into normal nodes and preserves the source arm tint that Blender's
shader export omitted. Independent processing review verified unchanged geometry,
UVs, indices, textures and existing transforms. Runtime grouping tests now inspect
all draw primitives. The first actual camera check caught hidden stock geometry
beyond the frozen clearance: all 62 affected triangles are offscreen at both
aspects through 41 reload samples. The corrected static-copy crop passes the
17 rifle/camera checks without changing their numerical limits. Source and failed
crop evidence are preserved. In-game inspection still finds insufficient receiver
mass and an unnaturally vertical/thin support forearm. This is a functional pilot,
not a whole-image visual pass; further asset-family production remains gated.

MPFB body, coveralls, vest, gloves and boots are coherent after native fitting.
The generic superhero hood is rejected after repeated eye-opening/coverage
adaptations produced exposed skin or floating-looking eyes. Reopen only headgear
selection: inspect one already compatible authored gas mask from the official
`masks02` pack, with a 15-minute source-inspection bound, then a native fitted
render. The pack page attributes it to Mathias_Gredal under CC-BY; its files carry
CC0/unknown-author headers. Preserve both records and the named attribution.
No further cuts to the rejected hood. This source swap tests whether authored
tactical face geometry removes the failing specialist adaptation work.

### U1 AK framing correction card

The first 4:3 renderer pilot is frozen at
`outputs/cs16/reuse/integration/runtime-v1/ak-idle-4x3.jpg`; the 16:9 view is
beside it. Whole-image status: improved authored surface detail, but failing
support-arm pose and receiver mass. These are separate from the 17 passing
engineering checks. The retained user reference is
`outputs/hands-qa/references/user-ak-reference.webp` (centered 4:3 game region).

Bounded adaptation: use a uniform 1.22 source-gun enlargement around the already
aligned muzzle, moving its authored contact targets with it; use WRAD's native
rig at .20 scale and solve its controls to those surfaces. This brings the hand
closer without changing the camera or modeling new anatomy. The reference's
support palm is approximately at normalized x .67/y .77; the frozen candidate
is higher. A .66–.70 / .76–.80 target band makes the next framing check repeatable,
with whole-image hand shape/contact still required. Preserve muzzle position,
74-degree vertical FOV, numerical resource/clearance limits and the source UVs.
One native pose/transform revision, followed by actual renderer comparison;
no additional weapon-family work until this passes.

### U1 framing verdict and U3 animation control

The single 1.22-scale/native-pose AK revision lands the palm at normalized
(.67794, .77782) in the frozen 4:3 camera and preserves the muzzle. Offline
whole-image inspection rejects the support grip: fingers hang downward away
from the fore-end. This is not fixed by a point-contact residual. Preserve this
candidate and the prior served runtime-v1; request a read-only native wrist-axis
and contact-orientation diagnosis before more pose work. The revised receiver
mass is improved, but the viewmodel target remains failing, 0/4 accepted.

The authored MPFB gas-mask source replaces the failed hood and passes the
source-art inspection. Native fit, body, coveralls, vest, gloves and boots are
retained; budget reduction and atlas export remain pending. The first reduced
copy showed slivers from Decimate running after Armature; preserve that failed
copy and correct the operation order before another export.

The new standard Three/glTF Transform animation adapter is tested against a
neutral copy of the same Vanguard source. Explicit 30 FPS shifted running keys
(up to 14.34 degrees). Keeping the standard sampler's source-key count reduces
sampled self-target rotation differences below 0.00004 degrees for Idle/Walk/Run.
Ordinary glTF node tracks bind through the existing Group mixer. The source has
1315 validator errors; stripping its old animations leaves 65 non-normalized
weight errors, and the retargeted control retains those same 65. No production
source was repaired or replaced. This proves the control plumbing, not the MPFB
conversion or a clean source asset. Independent preservation/control review and
native target deformation are pending. Evidence: `outputs/cs16/reuse/animation-control/`.

### U1 measured grip-frame repair and CT binding gate

Read-only AK diagnosis established a concrete failed assumption: the evaluated
wrist socket has a rest-frame roll not represented by the nominal palm basis;
manual negative local-X finger bends turn the tips downward. The native WRAD
rig has the required wrist Copy Rotation and finger joints. Authorize one
measured-frame repair in `outputs/cs16/reuse/ak-arms/contact-frame-pilot/`, with
palm surface distance/normal and several distal finger contacts, plus whole-image
views. Keep the source mesh/UV/weights, 1.22 gun scale and camera fixed. This
replaces the failed orientation method; no further arbitrary Euler tuning.

The newly reduced MPFB export is 9,252 triangles, two skinned draws and 52 bones,
with coherent costume surfaces. Before retargeting, root found that hand bones
sit outside the mesh's X bounds: gloves appear in an A pose while the skeleton
reports a T pose. Native-source versus derived-export binding is under review;
this is not a usable animated target yet. The provenance's earlier roundtrip
bounds accidentally included studio objects; actual GLB bounds are separately
measured. No new character has entered the game.

Independent retarget processing review accepts deterministic output, preserved
inputs/geometry/images/hierarchy, normalized rotations and Group mixer binding.
Evidence: `outputs/cs16/reuse/retarget-processing-review/REVIEW.md`. Native-target
bind/root/scale/grounding requirements remain open. The current served rifle
passes 45 affected rifle/camera/primary/world/viewmodel tests and lint/typecheck.
Full-suite/build and fresh normal rounds remain pending for final integration.

### U1 authored-animation source reassessment

The measured WRAD contact-frame repair is rejected and stopped. It produced
separated fingers after assigning child-bone pose matrices without retaining
parent-relative rest transforms. Palm distance improved while four finger
contacts remained 7–19 cm away; whole-image and roundtrip are hard failures.
Do not integrate or continue numerical finger repairs. Evidence is frozen in
`outputs/cs16/reuse/ak-arms/contact-frame-pilot/FAILURE.md`. The selected assembly
method is blocked on a believable authored grip; source search is reopened for
a complete arms/weapon animation asset, with a 15-minute bound and at most three
credible source candidates before selection. Prefer a matched rig/weapon/clip
that removes hand posing work, even if the first qualified family pilot changes.
The AK target itself is retained; a pilot change requires its own baseline.

Independent CT review confirms the hand-bone mismatch already exists in the
unoptimized MPFB source, with native A-pose meshes and neutral T-like Mixamo
bones. Export matrices preserve that mismatch. Correct the documented upstream
MPFB body/rig rest workflow before more reduction or animation; no manual skin
weight or vertex patch. Evidence: `outputs/cs16/reuse/mpfb-bind-review/REVIEW.md`.

### U1 new matched animation source selected for inspection

Kuptchi's complete RetroWeaponPack_V1 was selected after inspecting three credible
source directions: DavidFalke's AK reload demonstration (author calls it rushed
and not intended for direct game use), Cransh's attributed AK-74M/FP-arms set
(40k triangles and multiple source authors), and Kuptchi's complete retro pack
(Blender sources, matching weapon/arm animation scenes, game-ready pixel textures).
The last option is under native source inspection; stop further catalog search.
Its author page and included Readme.pdf explicitly permit personal/commercial
projects with no attribution requirement; the page asks that the assets not be
resold. These are custom source permissions, not CC0. Original PDF and source
manifest are in `assets/source/kuptchi-weapons/`. No purchase or account used.

The zip is 506,061,250 bytes, SHA256
`482545570e279f5b3c238067c2e8c15904bcaf2a704a17cfe85525c50615cb35`,
file ID 13635597 from <https://kuptchi.itch.io/f>. Only editable Blender sources,
textures and documentation were extracted (23 MB), not engine projects. Source
inspection must establish the exact weapon identity, coherent native grips,
clips, source camera and resource cost before a new paired pilot is assigned.
No new family or runtime acceptance is implied.

### U1 MPFB helper fix and renderer integration card

Root found the exact upstream rig problem in the pinned MPFB source:
`create_human(detailed_helpers=False)` omits `joint-*` groups. Mixamo's CUBE fitting
strategy then falls back to JSON default positions; the LeftHand fallback exactly
matches the misplaced exported wrist. Restore native detailed helper and extra
groups before rig fitting, retaining helper masking for later export. Worker
confirms the regenerated native wrist now matches the glove region without any
pose conversion or coordinate/weight patch. Rerun source+export binding proof.

Once the corrected neutral CT passes, integrate one native CT with the existing
T model retained as a live faction dependency. Before animation transfer, align
its forward direction to the game's -Z convention; preserve editable source.
Retarget Idle/Walk/Run via the qualified standard processor. Derive palm position
from native finger roots and pelvis-lift units/direction from its actual parent
transform; never copy Vanguard's `7` centimetre palm or `100` unit scalar. Reset
bind hip translation each sample because rotation-only clips do not reset it.
Review bone-axis-dependent crouch/aim/death corrections against the target rest
frame. Keep existing contact, 2cm ground, head, 12k triangle and 2-draw gates,
instance-owned skeletons/materials, shared geometry/textures, and unchanged hit
proxies. CT/T side changes must swap the correct live faction asset while carrying
weapon children; no dead fallback. Fixed 3m/6m front/three-quarter idle/walk/crouch/
death views and actual normal-play smoke precede family expansion.

### U1 matched M4/carbine pilot card

Kuptchi native inspection identifies Rifle_01 as an AR/M4-style carbine, with
matched 63-bone arms and 9-bone gun, two materials, and native paired idle/fire/
reload/draw actions. Source renders retain coherent hand contact throughout the
shown reload. Select it for the **carbine** pilot; it does not replace or qualify
the AK. The carbine baseline will be captured before the runtime asset changes.
The prior first-person camera remains 74 degrees vertical, with 4:3 and 16:9
views. The source camera supplies the authored relative pose, not a new gameplay
camera. Freeze geometry limits at 3500 gun / 4000 arms triangles and six draws.
The native 7469-triangle weapon requires conservative derived-copy reduction;
preserve its full source and compare silhouette/material/clip results first.

Use Blender's evaluated animation baking and glTF export, preserving paired
arm/gun tracks as Idle, Fire, Reload and Equip. Add measured muzzle/ejection
sockets on the animated weapon. Export a full-quality control first, then one
budget copy; inspect idle, fire, mid-reload and equip round trips before runtime
integration. Do not pose fingers, generate new anatomy, or fabricate clips.
The root owns app integration and paired renderer checks; the offline worker
owns only its export script and outputs. This replaces the rejected assembly
method, not the original visual goal. New visual targets remain 0/4 accepted.

### Native CT runtime defects and support-method reassessment

The corrected rig and standard retarget preserve finite connected limbs. The
first runtime adapter review exposed 6.5–12.4 cm floating in living poses;
rotation-only native clips need the ground-support pass on each sample. A
repeated identical crouch also exposed accumulated procedural corrections in
AnimationMixer's unchanged-track optimization. Restoring the last clean sampled
transforms before each update removes the drift; the known-defect probe changes
from 429 source units to zero and legacy checks pass.

The fixed-direction support approximation then missed a rigidly weighted lower
trouser vertex by 2.85 cm in a crouch/run transition. Adding edge directions
still misses the 2 cm ceiling. Reassess the method: reuse Three.js's existing
QuickHull ConvexHull at geometry-cache creation to retain per-bone surface hull
vertices, instead of expanding a bespoke direction grid. The measured native
hulls retain 1974/11776 vertices; the live classic T hull retains1559/19446, below
its existing one-tenth read ceiling. Construction takes17ms native in this local
probe and is cached per shared geometry. Require paired full-skin ground checks
and runtime performance before accepting this replacement.

The first actual CT material view is too dark under the frozen game lighting.
An initial inference that this was solely a source tint issue was incorrect:
matching baked-native and GLB radiometry only established that export preserved
the already incorrect atlas appearance. One recorded source-material tint
revision followed substitution of clearly CC0 Toigo gloves and ankle boots.
The old culturalibre files' AGPL3 headers conflict with specific CC0 catalog
entries; those failed candidates and both records remain preserved.

### CT atlas coordinates repaired; runtime pilot updated

The atlas texture had an unconnected Vector input and the original UVMap remained
active for rendering. Both EMIT and DIFFUSE bakes therefore looked wrong when
sampled with the old coordinates. Root identified this cause and the worker
proved it in the saved blend. An explicit atlas UV node and active-render flag
remove the blotches without geometry or hand-painted texture edits. The atlas
was regenerated using the corrected UV selection; its pixel hashes changed. Native, GLB and
source comparisons are retained in `gas-mask-pilot/atlas-uv-*` artifacts.

Neutral SHA256 `97b6720408563f113626365a9c2267ca86ae195e07e41283ff4409c590bf2140`
has 9254 triangles, two materials and 52 bones. Standard orientation and retarget
produce `character-integration/cc0-atlas-game-animated.glb`, now the local CT asset.
All 12 native/legacy character tests pass, including full-skin ground bounds,
repeated-pose stability and instance isolation. Validator has zero errors;
two non-root skin warnings arise from the common facing parent shared by mesh
and bones, and two unused original-UV infos retain source data. Native adapter
deformation tests cover the parent behavior; actual renderer review is ongoing.
First corrected front view is readable and coherent, though overall visual
acceptance remains 0/4. Normal gameplay, all-pose review and performance remain.

### M4 source hierarchy and modifier control

Copied/detached export variants had consistent buffers but displaced the rifle
surface by about 20 source units. Freeze them as failed diagnostics. A root
control exporting the original selected hierarchy directly with Blender's SCENE
sampler preserves the gun surface to a maximum 0.0000124 source units in Three.
The original arms have a Mirror modifier; export_apply=False silently omitted
the second arm. Standard export_apply=True restores both arms, with p95 nearest
surface error 0.0000263 source units and worst 0.2147 (2.15mm after cm conversion,
associated with standard four-influence reduction). No anatomical editing.

Select this direct-source pipeline, replacing copied rigs/manual baking. A fresh
worker owns `scripts/export-native-carbine.py` and `outputs/cs16/reuse/native-carbine/`;
the old exporter is frozen diagnostic history. Require all four clips and full/
reduced surface comparisons. Source camera relative placement gains a common
0.01 metres-per-source-unit conversion, preserving the game camera. Correct
Main-local muzzle is [60.016502,16.543610,-0.000022] cm; ejection is
[13.264349,13.212073,3.008369] cm. Prior max-+Y socket inference was wrong: the
gun points along Main +X. Source socket renders and landmarks are preserved.

The isolated Three adapter and merge/camera processor pass twelve sample checks
with zero merge deformation error, <=1.44e-12 camera-wrapper error and zero
repeated-pose drift. These checks validate processing, not source-export quality.
Three pure clock tests, typecheck and lint pass. M4 is still the procedural
model in the served game; source pilot is not wired before visual qualification.

Buzz checked per task cursor between these steps. A separate task released the
visual toolkit; see `visual-tools/README.md`. Its completion is tooling evidence,
not asset acceptance. Continue under existing authorization; this is a progress
checkpoint, not completion or a permission boundary.


### Matched M4 runtime pilot and camera-frame repair

Buzz tooling updates were checked and the released visual toolkit is now used
for source/runtime evidence, fixed action captures and isolated CT views. The
native M4 seam-aware gate passes all 12 full/budget clip-mesh cases. Final GLBs
are consistently 3,596 arms / 3,480 rifle triangles (the evaluated-scene 3,479
count was not the exported mesh). Geometry, texture and oriented topology
correspondence remain required; raw vertex-index comparison was invalid at seams.

The root merges original paired clips with glTF Transform sampler copying and
shifts the common first key, 1/24 second, to zero. The source camera varies for
Equip; retain Idle's fixed camera reference across all actions and record the
unused action-specific reference transforms. The four merged/prepared exports
have zero Validator errors, with two documented non-root skin warnings.

The first actual game capture exposed the camera basis defect: an ordinary
Blender Empty marker lacks the exporter camera-only local RotX(-90 degrees).
Its inverse placed the muzzle behind the game camera. This failure is retained
in `native-final/runtime-idle-4x3/`. The installed Blender exporter and an
independent native Camera projection prove the correction; apply the exact basis
in preparation, then 0.01 metres per source unit. Do not edit the source pose or
geometry to compensate for a camera transform error. Corrected native and Three
muzzle coordinates agree within 0.000003815 cm.

The local carbine now uses authored Idle/Fire/Reload/Equip sampled from simulation
time. Generic root fire/draw/reload offsets are suppressed for this live authored
model; locomotion presentation and gameplay recoil remain. Animated muzzle and
casing sockets follow the gun; metre-sized flash/silencer attachments cancel the
source centimetre scale. Instance skins/materials/geometries/textures are owned
and disposed separately. Source provenance and current served checksum are in
`public/assets/viewmodels/M4_SOURCE.md`.

Root inspected corrected 4:3 idle and 16:9 reload images. Textured receiver and
connected hands improve the former block assembly; the actual magazine/hand
sequence replaces rigid root-only motion. However, modern AR sights/rail and bare
hands differ from the classic M4/glove reference. This is an improved-but-failing
visual pilot, not CS1.6 acceptance or permission to expand the asset family.
New visual accepted totals remain 0/4 for characters and 0/4 for viewmodels.
Focused checks: 32 pass, including a new served-asset test that rejects the known
behind-camera failure, resource limits, animation drift and instance isolation.
Full regression/build, remaining action views and runtime review are in progress.

The CT crouch adapter now uses the supplied hip/knee/ankle pose values and the QA
socket height matches living crouch. The gun-above-head failure is repaired.
Isolated subject/angle/distance previews expose the remaining native glove grip:
fingers remain too open. Death/contact variants, gameplay swaps and performance
remain open; numerical point contact does not accept hand orientation.

### Classic M4 and glove adaptation — frozen pilot card

Need / target: preserve the connected native arms and authored motion while
replacing the modern rail and folding sights with a classic carry handle,
triangular front sight and ribbed fore-end, plus black gloves. Reference remains
the supplied user M4 image; exact original rendering is unmeasured.

Options and choice: the completed local review at
`outputs/cs16/reuse/classic-m4-adaptation-review/REPORT.md` proposes adapting the
CC0 Tabasco M4, retaining Kuptchi arms, rifle rig, constraints and four actions.
Root inspected the source render: the classic silhouette is present, although
the untextured surface may still fail. Reject overlay gloves because of fit and
triangle cost; reject rebuilding procedural pieces. No further catalog search
for this attempt. This is proposed, not qualified.

Frozen control: served modern M4 SHA-256
`aa30cc72de22aea607a6f9a517ae7097272df3186c902e8ef6e3201443c9cbe1`,
with paired captures in `carbine-integration/native-final/` under the reuse
outputs. Never replace the served control until the derived asset passes offline
inspection. Preserve both source originals and their license manifests.

Owner boundary: a fresh Terra subsystem builder owns only
`scripts/adapt-classic-carbine.py` and
`outputs/cs16/reuse/classic-carbine-adaptation/`. Root owns subsequent integration.
Append existing loose donor components into a derived source; map unambiguous
rigid pieces to Main, Magazine and ChargeHandle. One uniform scale and rigid
alignment must establish grip/magwell/muzzle fit without changing hand poses,
arm weights, topology, source constraints or animation. Source socket placements
must remain geometrically correct, not merely retain names. Material-only glove
classification must preserve source skin, UVs and weights. No image editing,
manual cuts, new modeling, retopology, finger posing or weight painting.

Gates: gun <=3,500 triangles, arms <=4,000, combined <=6 draws. Retain native
sampling, proven camera basis and zero-based clip times. Before renderer entry,
inspect source idle at 4:3 and fire/mid-reload/equip at 16:9, including magazine,
charging handle, both grips, muzzle/ejection and glove cuff. Use source/export
equivalence and Validator if exported. A repeatable component-to-bone mapping
and full-action sampled contacts are required; a successful export alone fails
the visual gate. Stop this attempt if mapping is ambiguous, rigid fit breaks
contact/sockets or the cuff breaks in any sampled clip. Preserve the failure and
reopen the source decision rather than numerically compensating anatomy.

Status: unverified. Characters 0/4, viewmodels 0/4 accepted; gained 0, lost 0.
Source render inspected; derived fit, animation, materials and runtime unchecked.

### Runtime checkpoint before the adaptation

The modern authored M4 passes all 650 regression tests, the separate performance
regression, typecheck, lint and Sites build. Normal keyboard gameplay observed
purchase, accepted M4 shots, pause/resume, a real reload from 29/30 to 30/29,
and natural round transitions. Evidence and limits are in
`outputs/cs16/reuse/carbine-integration/native-final/normal-play/REPORT.md`.
Silencer completion, measured movement route, casing/audio synchronization and
two independent final acceptance rounds remain unverified. The recorded 120 FPS
profile belongs to the opening USP phase, not the M4 or all-route performance.

A subsequent CT resource fix disposes each cloned skeleton's bone texture on
instance removal. The known-defect test observed zero disposals before the fix;
13 focused native/classic tests pass afterward. Typecheck, lint and Sites build
also pass after the cleanup; it makes no visual grip acceptance claim.

### Retire the unused procedural M4 first-person entry point

Reuse rationale: the live page already instantiates the authored carbine adapter;
only tests still invoke its former procedural first-person builder. Retire that
unused entry point/mount and its superseded framing assertions. Keep the shared
gun geometry because `createPrimaryWorldModel('carbine')` is a live caller.
This is a bounded cleanup, not a replacement world-weapon pilot or art pass.
Owner may edit primary-weapon-models.ts, directly affected tests and the page's
QA mount selection only. Preserve all live SMG/shotgun/sniper/AK and world-carbine
behavior, authored M4 clocks/geometry/sockets and budgets. Validate affected
tests/typecheck/lint; root reviews the small diff and builds at integration.

### Restore source animation endpoint coverage before further hand adaptation

Read-only diagnosis at `outputs/cs16/reuse/ct-grip-reuse-diagnosis/DIAGNOSIS.md`
measured 31 phases per source/target clip. The 27 surviving finger rotations
match rest-relative source motion within0.0573 degrees, but LeftHandThumb3,
LeftHandPinky3 and RightHandPinky3 are animated source nodes excluded from the
source skin's49 weighted joints. The target52-joint rig weights these bones.
Walk/Run therefore lose source endpoint motion, up to74.1 degrees in Run.
This is a processor coverage defect, not permission to author new finger curls.

Reuse decision: retain Three SkeletonUtils and glTF Transform. Supply the
complete relevant source bone hierarchy to the standard retargeter and require
coverage of all target finger channels; do not replace the retarget algorithm.
Owner may edit `scripts/retarget-character-clips.mjs` plus a focused regression
test and outputs under `outputs/cs16/reuse/ct-endpoint-coverage/`. Root owns any
served asset replacement. Use neutral input `character-integration/cc0-atlas-game-neutral.glb`,
source `public/assets/characters/vanguard.glb`, and a new output file.

Fixed gates: all30 target finger rotations mapped, source-relative error below
0.1 degree at the existing31 phases, no changes to the surviving channels beyond
float noise, no changed mesh/bind/texture data, no Validator errors,52 bones,
9,254 triangles and2 draws retained. Preserve old public CT as baseline; inspect
moving hands in the renderer before replacing it. Stop if including endpoints
changes source rest frames or unrelated pose tracks. No new dependency, manual
pose/weight change or numerical finger target. Restoring the missing motion does
not itself establish a weapon grip; that remains a separate surface-frame pilot.

The held-carbine sideways hypothesis was checked and rejected: createEnemy
overwrites the factory rotation with identity and scale0.64 before attachment.
Actual held +Y is character up and -Z is forward. Preserve that correct frame.
The current palm target quaternion is not a measured fore-end surface normal.

### Isolated candidate loading in the existing visual toolkit

Reuse decision: use Playwright's existing context request routing to inspect a
candidate GLB inside the actual renderer before replacing a public asset. Root
owns `scripts/visual-capture.mjs` and the toolkit guide. Add explicit CT/carbine
candidate-file flags restricted to their existing local asset requests. Retain
candidate path, SHA-256, byte size and observed request count in the manifest.
Invalid GLBs or unused overrides fail; the public asset files remain unchanged.
Validation: a known served GLB routed as candidate must produce the same fixed
frame and report actual usage; an invalid file must fail before browser capture.
This removes temporary public-asset swapping from the pilot workflow. It adds
no runtime dependency, loader fallback, new renderer or production behavior.

The routed-current-M4 control and ordinary request produced exactly identical
960x720 images (zero changed pixels of691,200). The routed manifest records one
fulfilled request and the unchanged public SHA. Invalid GLB header rejection
occurred before output-directory/browser creation; comparison metadata and lint
pass. Evidence: `outputs/cs16/reuse/toolkit-candidate-loading/`. Buzz tooling
update was posted and read back. CT endpoint candidate captures now use this path.

### Classic donor frame review: repair the measurements before source rejection

The first adaptation worker reported an incompatible rigid fit. Independent
read-only review at `outputs/cs16/reuse/classic-donor-failure-review/REPORT.md`
found two concrete coordinate errors: native receiver measurement omitted the
rig-world inverse (22.28cm error), and unparented donor geometry omitted the
rig-world transform (30.85–30.95cm evaluated displacement). The appended donor
has identity object transform and no inherited parent/modifiers. Its frozen
failed previews cannot establish source incompatibility.

Reuse the focused builder to repair those exact frame calculations, preserve
every failed derivative, and assert evaluated animated landmarks against the
expected bone/rig-world transforms before rendering again. This repairs the
same pilot's implementation; it does not relax hand/socket/material gates or
authorize numerical anatomy compensation. Corrected fixed-basis fit residuals
are0.685cm muzzle,3.079cm magwell,2.421cm receiver; visual contact remains unproven.
Count evaluated mirrored arms, not raw half-mesh triangles. The glove selection
also needs an inspection of actual deform influences before it can be accepted.
No GLB or public replacement yet. Source-suitability verdict is unverified.

### Endpoint coverage promoted; bounded CT surface-contact pilot

Root reviewed the separate lookup skeleton repair, reran all-finger verification,
and inspected isolated walking/movement captures. The public CT now has SHA-256
`e85a0dd18270caee23a12ef4970868323ac0be1bf7cd21b823af49158e6cf1f8`.
The prior public file is preserved at `outputs/cs16/reuse/ct-endpoint-coverage/frozen-public-before-endpoints.glb`.
All 30 finger rotations are present, the 49 prior rotation tracks and static
asset data are unchanged, and the maximum source-relative error is 0.05725°.
Validator has zero errors; 9,254 triangles, two draws and 52 bones are retained.
All 13 affected runtime tests pass. The ordinary served 1280×720 Walk frame at
250ms equals the isolated candidate in all 921,600 pixels. Root inspected it:
the mesh remains connected, but the support grip still visibly fails. This is
an accepted processor coverage repair, with zero character visual criteria
gained or lost. Full regression passes649/649 and the Sites build passes at this
integration milestone. One retired procedural-carbine test accounts for the
change from the prior650 count; live SMG/shotgun/sniper framing coverage remains.
Movement performance also passes (p95 0.2068ms versus0.5ms), as do typecheck/lint.
Root completed a fresh normal real-time smoke round: USP12→11, pause held1:15,
keyboard resume, living CTs, player death, and natural bomb-detonation result
CT0–1T followed by next freeze. Runtime warning/error logs were empty. The normal
Resume button's pointer capture was blocked in this browser; explicit keyboard
resume worked. Evidence: `ct-endpoint-coverage/normal-runtime/REPORT.md`. This is
one root integration run, not the two independent final acceptance rounds.

Next card: **CT-carbine measured support surface, one attempt**. Reuse the
existing analytic two-bone solver and authored endpoint-complete locomotion.
CCDIKSolver remains deferred because it supplies no palm-orientation objective;
the already-inspected posed-hand mesh is incompatible with this native rig.
Choice is a proposed thin frame adapter, not new anatomy or finger animation.
First stage owns only `outputs/cs16/reuse/ct-support-surface-pilot/` and may not
edit application code or public/source assets. Freeze the current public CT
hash above, Vanguard source, held world-carbine geometry/mount and adapter code.

Use Idle at 0ms and the actual character-close Walk state at 250ms. Derive a
named fore-end surface point, outward normal and longitudinal axis from the
fully transformed mesh; derive the palm frame from native bind geometry and
finger roots. A target socket's identity quaternion is not surface evidence.
Compute the desired wrist position from the desired palm orientation/offset,
solve the arm to that wrist, then apply wrist orientation; do not let a later
forearm rotation invalidate the contact frame. Preserve all finger channels.

Before integration, measure the known-failing baseline and same two candidate
states: actual palm patch within 2cm of the measured fore-end, opposing normals
dot ≤ -0.8, and index/middle/ring distal clusters at the fore-end. Record exact
vertex sets, frames, metre distances and source hashes. A palm-anchor residual
alone is insufficient. One shared correction must satisfy both samples without
per-finger values or mesh/weight edits. If it fails, preserve the evidence and
seek a compatible authored weapon hold; no numeric curl iteration. Passing
geometry only qualifies the adapter for fixed 4:3/16:9 actual-renderer review;
whole-image improvement and regressions remain required before promotion.

The one surface-frame attempt failed its geometric gates: palm patch maxima
3.3962/3.3979cm and distal-cluster distances3.5376–6.5600cm, despite normal dots
approximately-0.9944. All30 local finger channels were preserved exactly. No
runtime code or asset was changed. Evidence:
`outputs/cs16/reuse/ct-support-surface-pilot/REPORT.md`. Freeze this failed pilot;
character visual acceptance remains0/4. Next reuse evaluation is authored
weapon-hold data: inspect existing licensed Kuptchi paired arms/weapon animation
and at most two credible full-body sources if local data cannot supply a
compatible contact pose. Compare rig mapping, bind frames, actual contact,
licensing and code eliminated before any builder or new installation.

### Repair source preview camera selection before first-person review

The standard Blender preview tool deletes source cameras and constructs a42mm
whole-asset studio camera. Existing corrected M4 previews are therefore useful
source-asset inspections, not authored source-camera evidence. Root owns
`scripts/visual-blender-preview.py`, its CLI wrapper and toolkit guide for a
bounded extension: explicit studio/default versus named authored-camera mode.
Preserve the authored camera object, parenting, constraints, lens and animation;
sample its evaluated transform at each frame. Keep neutral studio lighting
explicitly labeled and never save the input source. Record camera policy,
render dimensions/pixel aspect and evaluated per-frame camera matrices/lens.
Validate one known Kuptchi source-camera frame against its evaluated native
camera values, unchanged source hash, and a retained studio control. Reject
missing named cameras without a fallback. No gameplay or geometry change.

The M4 glove classifier also still took its maximum over all vertex groups,
including nondeforming duplicate groups, before testing the winner's eligibility.
The89-face patchy result does not prove material-only infeasibility. The focused
worker is repairing this exact selection bug while preserving weights/topology;
only actual deform assignments may compete for the dominant group. Stop at the
new derivative for one authored-camera view before expanding the action suite.

The authored-camera tool option is implemented as `--source-camera NAME`.
Independent source verification records zero evaluated matrix difference and
the native18mm lens; input SHA is unchanged. Missing-camera validation exits1
without a fallback render. Root inspected studio and authored controls. Python
compile/CLI help/lint pass. Evidence: `outputs/cs16/reuse/toolkit-authored-camera/`.
The classifier repair now selects700/900 existing faces (611 newly selected,
none lost) with source geometry/skin untouched. Root inspected new authored
Idle and Reload views: visible cuffs are continuous; white donor materials
remain failing. Freeze derivative SHAfe09b81317a5fac7ded96c0b8b60acf508fdf8654df08a02cd0f42c78a931ae3
for independent contact/socket/remaining-action review before export or surface
adaptation. This is still a proposed asset, not a qualified visual deliverable.

### Authored hold source evaluation and full-body library check

The local Kuptchi review initially rejected standard retargeting based on its
extra `Knuckle` segment. Root required an implementation/topology check: source
01/02/03 can correspond to CT Digit1/2/3, and SkeletonUtils reads evaluated
world matrices that already include the Knuckle ancestor rotation. A custom
four-to-three reduction is not justified by bone counts. The corrected review
proposes standard rest-frame mapping plus an explicit finger-layer policy;
source-gun/CT-gun contact still requires a pilot. Evidence:
`outputs/cs16/reuse/authored-ct-hold-reuse-review/REPORT.md`.

Root also inspected one established full-body library before commissioning that
adapter: [Quaternius Universal Animation Library](https://quaternius.itch.io/universal-animation-library),
whose creator documents Mixamo compatibility and CC0 rights. The free Standard
v3 archive is now preserved under `assets/source/quaternius-universal-animation/`,
SHA `cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724`.
Its own License.txt confirms CC0. Direct GLB inventory finds43 clips and65 skin
joints, with three named digit segments plus leaf endpoints. It includes pistol
holds/aim/reload and Death01, but no rifle clips. Therefore this exact free
download is rejected for the immediate rifle-hold need. Its death and pistol
animation are deferred candidates, not qualified replacements. No payment,
dependency installation, runtime change or animation transfer occurred. Paid
tiers and a second library were not downloaded; stop this source search here.

### CT authored hold — standard retargeting pilot card

Choice: one offline pilot using the already licensed Kuptchi Idle hold and its
same modern M4 surface, Three SkeletonUtils, and the native CT bind rig. The
full-body free library above lacks rifle data. Defer new animation authoring,
custom chain reduction, dependencies and asset search. This differs from the
failed wrist-only pilot by reusing source-authored digit articulation and the
matching held weapon surface. No numeric joint values or anatomical edits.

Freeze inputs: CT e85a0dd and source M4 aa30cc7 as fully specified above; Idle
source frame1/clip time0. Own only `outputs/cs16/reuse/ct-authored-hold-pilot/`.
No app/public/source edits. Use mapped source hand and01/02/03 to target Hand
andDigit1/2/3, with standard evaluated-world/rest-frame retargeting; Knuckle
ancestor motion is included by that operation. Preserve native target bind
positions and all body locomotion. Explicitly override the30 locomotion finger
rotations with the derived static hold only within this disposable pilot.

Normalize the matched M4 from its verified source Main/muzzle frame and retain
the exact source hand-to-gun relationship. Record every placement matrix and
metre scale; any scale adaptation must derive from measured source/target hand
dimensions and be one shared uniform scale, not a contact-error tuning loop.
The previous procedural held gun is a labeled historical control, not the
candidate surface. Reuse arm positioning around derived wrist targets and apply
the final wrist orientation after the positional solve. No per-finger solve.

Establish baseline with existing CT locomotion digits on that same mounted M4,
then candidate at Idle0 and the actual character-close Walk250ms state. Record
all30 source/target mappings, source/static-data hashes, untouched body tracks,
actual skinned palm patch distance ≤2cm, opposing normals dot≤-0.8, and
index/middle/ring distal-cluster distance ≤3cm against the matched fore-end.
Retain exact vertex selectors and raw distances for each state. Stop on an
unresolved frame contract, missing mapping or failed gate; do not numerically
compensate fingers. A geometry pass only qualifies actual-renderer review.

### Classic M4 source decision reopened: reuse the authored moving handle

Independent review rejects the whole-donor fit at the charging-handle contact
gate. Native source Reload visibly grasps its handle at frame54; the same hand
surface on the derived rifle stays at least1.898313cm away across the full clip.
The native handle contains90 weighted source polygons; the donor's28 cover only
a subset (native-to-donor median4.583427cm in the bone frame). Both parts follow
the bone correctly. Thus source choreography is retained; the missing contact
surface is the failed substitution. The1cm proximity statistic is a diagnostic,
not a newly invented acceptance threshold. Root inspected both source-camera
images. White materials and candidate-specific sockets remain unresolved.

Revised bounded choice: reuse the actual native Kuptchi ChargeHandle-weighted
component, with its original UVs/material/rig relation, inside the already fitted
classic donor body. This is a new source-component choice and gets a fresh
worker. Do not resize or move fingers, author a new handle, or tune a new pose.
Standard Blender selection/copy by complete rigidly weighted source faces is
preferred over custom geometry. Remove the superseded donor handle from the
new derivative; no duplicate handle fallback. Leave every prior derivative and
both original sources untouched.

Freeze baseline fe09b81317a5fac7ded96c0b8b60acf508fdf8654df08a02cd0f42c78a931ae3
and the original Kuptchi source2c31e7b listed above. Worker owns only a thin
`scripts/reuse-native-carbine-handle.py` and
`outputs/cs16/reuse/classic-m4-native-handle/`. No public/app/material-authoring
or exporter changes. Prove the copied native surface has identical source
positions, UVs, material and bone-weight relationship through Reload1–83;
retain the unchanged arms, four action pairs, donor body, native rigs and camera.
Gun≤3500tri, arms≤4000tri, combined≤6 draws. Fail if source faces are not a
complete rigid component, if the replacement creates a visible incompatible
receiver junction, or if hand contact breaks. Inspect authored-camera Idle1
and Reload54 first, then full-action contact/continuity if those pass. A copied
component's exact transforms alone do not accept its join to the donor body.
This one revised source attempt must pass before material work or GLB export.

Root read-only material inspection confirms that both the original Tabasco M4
and frozen donor derivative have zero UV layers, no image textures and three
non-node flat colors. There is no missing texture path to repair; a textured
surface remains an explicit cost of this source choice. Inputs remained exact.
Evidence: `outputs/cs16/reuse/classic-material-inspection/REPORT.md`.

The first standard CT hold pilot reports a 33.6cm palm gap at Idle0 and stopped.
Root identified potential frame implementation errors before source rejection:
an already-mounted world wrist appears to receive the mount again, and the
source basis appears reflected. The candidate and report remain frozen for an
independent numerical frame audit. This result does not yet establish that the
authored hold or standard retargeting is unsuitable. No runtime change occurred.

Independent frame audit confirms implementation defects: double application of
the mount displaces the intended left/right wrist targets by1.7755/1.8415m;
the source basis has determinant-1; and the wrist offset uses source Idle rather
than explicit bind pose (Idle differs from bind by146.3/60.8degrees). The source
fore-end selection itself lies4.17mm from the source palm anchor. Preserve the
original script, report and measurements as failed implementation evidence.

Focused repair scope: correct the cross-product order to a proper basis, read
mounted wrist world transforms exactly once, and derive standard wrist offsets
from explicit source/target bind clones. Derive the one hand scale from the
same anatomical measurement in those bind frames, not a curled source chord
versus an open target chord. Keep mappings, assets, body motion, thresholds and
no-per-finger-tuning rule. Record source/native wrist targets and achieved wrist
residual/reachability explicitly. Run repaired Idle0, then Walk250ms only if
Idle qualifies; a failed gate still stops contact work before renderer review.

The revised classic M4 native-handle route is **blocked at the receiver-junction
gate**. Frozen candidate `f4819d33e6bf906cb8334bdfafc5bb8ddf8045af18c3c40d370a8a3c45a5697e`
preserves the90-face source component exactly through Reload1–83, including
native contact. It costs1550 gun triangles,3596 arm triangles and6 draws.
Root inspected the authored18mm Idle1 and Reload54 views: the native handle
enters/exits the donor receiver without a compatible channel. No material work,
GLB export or further geometry repair follows this revised attempt. Evidence:
`outputs/cs16/reuse/classic-m4-native-handle/clean-temporary-datablocks/REPORT.md`.
The served modern M4 remains unchanged; classic visual criteria remain0/4.
The next M4 decision must concern a coherent complete assembly or an explicitly
reviewed animation-adaptation method, not another unreviewed component swap.

M4 source reassessment is read-only and bounded to two search queries and at
most three creator/source pages. Need: a coherent classic carry-handle rifle,
textured hands/arms, editable rig and authored fire/reload/equip data with
browser redistribution rights. Reject original Counter-Strike art, ambiguous
asset provenance, and another untextured gun-only donor. No purchase, dependency
installation, download collection or builder assignment follows availability
claims alone. Stop after this source comparison and record a concrete choice
or a blocked source requirement. The repaired CT pilot proceeds independently.

The bounded three-source comparison found no qualified complete replacement.
RGS_Dev includes paired arms/actions but its later creator reply restricts
separate asset access, conflicting with the current GLB delivery route without
different permission. The kazzazstudio and Adrian R rifle listings do not
establish paired arms and required clips. No purchase/download occurred.
Evidence and source links: `outputs/cs16/reuse/classic-assembly-source-review/REPORT.md`.
Stop source search here; the classic M4 route remains blocked rather than
commissioning another speculative mesh swap.

### CT death animation — authored source inspection card

Current retained death views show rigid/propped body poses. Reuse evaluation now
advances the already downloaded CC0 Quaternius `Death01`, separately from the
rifle-hold gate. Source `UAL1_Standard.glb` SHA
`69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997`;
exact path and license are in `assets/source/quaternius-universal-animation/source.json`.
Own only `outputs/cs16/reuse/ct-authored-death-source/`; no app/public/shared
processor edits. Use standard Blender glTF import and the existing source
preview tool to inspect the native clip before retargeting. Preserve source
geometry, rig and keys. Record exact action, duration, key timing, source units,
pose bounds and sampled native frames including final rest. Qualify for a CT
retarget pilot only if the authored motion visibly collapses from standing to
a coherent resting pose with body and hands attached, without a discontinuity
or a floating final torso. This is source eligibility, not target acceptance.
Stop after native source review; no full gameplay tests or runtime changes.

The first CT frame repair is preserved but still not a source-contact verdict.
Independent composition comparison found that its wrist bind offset mounts the
source bind while leaving the target bind unmounted. Its wrist then differs
from the standard retargeter's hand/finger parent frame by78.0703degrees on
both sides. The focused repair must use the same bind offset as the standard
retargeted digits (`sourceBind^-1 * targetBind`) and apply the current source
mount once; equivalently mount both bind frames before computing the offset.
Verify the resulting wrist orientation against the mapped standard Hand frame.
No per-finger or contact-error tuning. Retain the current support-plane oracle:
triangle2732 has source palm-normal dot-0.93337 and source anchor distance13.62mm.
The closest triangle2049 is a different side of the surface, so its normal must
not silently replace this frozen underside plane. Actual surface-distance
checks remain against the same retained fore-end triangle set. Repaired Idle
and conditional Walk gates remain unchanged; preserve this second implementation
failure separately before rerunning.

Root inspected all five native Quaternius Death01 studio frames: standing,
knee collapse, backward fall and relaxed supine rest are coherent. Imported
action spans0..57.600002frames at24fps (2.4s); native GLB keys are30Hz. The
mannequin has65 joints. Final bounds are0.293m high with minimumZ-0.0323m;
this requires a measured ground correction in the target, not a claim of exact
source floor contact. Source is eligible for one CT retarget pilot. No CT or
runtime visual criterion gained.

### CT authored death — standard retarget pilot card

Use the source69591853 and served CT e85a0dd already frozen above. Fresh worker
owns only `scripts/retarget-character-death.mjs` and
`outputs/cs16/reuse/ct-authored-death-pilot/`. Use installed Three SkeletonUtils
retargeting, standard bind offsets/hip translation options, and glTF Transform
to append one Death clip to a separate CT derivative. Reuse the existing
retarget processor's scene-root lookup and static-data preservation conventions;
do not copy its deliberate omission of hip translation into a collapse clip.
No anatomy, skin weights, mesh/material edits, custom joint-key authoring,
per-bone tuning, new dependencies or app/public changes.

First prove source/target explicit bind frames and anatomical forward/up with
named bilateral joints, a proper common orientation transform, and one scale
from homologous bind leg lengths. Preserve native CT bone positions; transfer
the authored pelvis displacement with the standard retargeter, measured in
target metres. Record and verify source-to-target pelvis trajectory and mapped
rest-relative world rotations at73 source key times. Keep2.4s duration and all
existing CT Idle/Walk/Run channels/static data exact. Format Validator must have
zero errors; preserve/dispose existing warnings explicitly. Geometry budget is
the unchanged9254tri/two-material/52-bone CT.

Inspect target at0/.6/1.2/1.8/2.4s offline, labeled unarmed and before any
runtime death adapter. A single whole-model vertical ground correction per
sample is allowed and must be recorded; no limb or clip correction. Require
continuous attached anatomy, coherent collapse, final pelvis≤.25m/head≤.45m
above the corrected floor, and lowest surface within1cm. Record raw uncorrected
bounds as well. Stop on a failed frame/trajectory/visual gate; successful export
alone does not qualify integration. Passing this stage only qualifies actual
renderer/weapon/transition review under a later explicit runtime card.

The final CT hold composition repair now agrees with the standard mapped Hand
frame within2.5e-7radians after quaternion normalization. Proper bases, bind
scale and reachable/exact wrist targets pass. Actual Idle contact fails:
palm maximum9.033cm, normal dot-.75645, Index/Middle/Ring12.517/7.414/8.031cm.
Preserve this failed candidate and stop the current standard FPS-hand-to-CT
grip route. This proves that the selected rest-relative transfer and mounting
do not supply a usable CT grasp; it does not prove that the source or Three
retargeting can never work. No numerical finger/wrist iteration, Walk candidate,
renderer integration or public update follows. Evidence:
`outputs/cs16/reuse/ct-authored-hold-pilot/REPORT.md`. Character criteria remain0/4.
Next grip work needs a newly qualified full-body weapon-hold source or an
explicitly evaluated standard anatomical pose-alignment workflow. Continue the
independent authored death pilot; do not hide this blocked grip behind its
progress.

Next grip source check is specifically Mixamo access for an authored full-body
rifle hold, which would remove the FPS-arm-to-full-body reference-pose problem.
This is a bounded existing-session/service check, not another asset catalog
search or adapter attempt. Read current Adobe usage guidance and inspect one
Mixamo session. Do not create an account, purchase anything, or request wider
service access. If authentication is unavailable, record that concrete blocker
and leave the grip route stopped while the death pilot proceeds.

The Death01 derivative is frozen at SHA
`469bab04d624ea5c89a538179aeb08e1ce149fabb2797d107afa4cf965735534`.
The builder's offline report passes its numerical gates, but coordinator
acceptance is **unverified pending independent anatomical review**. Root inspected
full 0/1.2/2.4s PNGs and sees elevated legs in the resting pose compared with the
native source. The reviewer owns only `outputs/cs16/reuse/ct-authored-death-review/`;
it must compare actual source/target limb directions, bind/reference poses,
full surfaces and endpoint heights, in addition to static-data preservation.
Agreement with the converter's own world-rotation formula cannot alone prove
that the chosen anatomical reference frames reproduce the source motion.
No public asset, runtime adapter or visual criterion is promoted at this stage.

Read-only runtime integration findings: `updateBotDeathPoses` clamps the live
clock to the legacy0.58s duration; the authored clip needs its own2.4s duration.
The QA close-view progress also uses the legacy duration. A later runtime card
must cover both clocks, the exact living start frame, all animated bones during
blend/reset, final held pose, pause/repeat stability, body ground support and
an explicit weapon policy. The existing two-hand death IK would override the
authored arm motion. Classic T remains a live consumer of the procedural death
path, so that path cannot be deleted globally when CT gains an authored clip.
These are integration requirements, not implementation or executed runtime checks.

Mixamo remains signed out in the inspected browser session; user sign-in is
pending. MPFB's documented reduced-doll workflow recommends downloading motion
for the specific character to avoid proportion mismatch. The pinned
`mapmixamo.py` uses named Copy Rotation constraints plus pelvis Copy Location;
it does not supply a general solver for an unrelated Quaternius skeleton.
This is source/workflow context only; no account, upload, dependency or new
retarget attempt was made. Source:
[MPFB Mixamo workflow](https://static.makehumancommunity.org/mpfb/docs/rigging_posing/mixamo.html).

Baseline capture for the prospective CT death integration: served CT e85a0dd,
current unchanged adapter/page, localhost3000, High, single CT, character-close,
death variant0, three-quarter view at3m,1280x720 at0/600/1200/1800/2400ms;
960x720 final2400ms as a separate aspect setup. Use fresh directories under
`outputs/cs16/reuse/ct-death-runtime-baseline/`. Preserve source hashes and actual
camera/lighting/budget metadata in capture manifests. These captures establish
the current rigid/propped death appearance only. They do not authorize advancing
the still-unverified offline candidate or claim normal gameplay evidence.

The independent support measurement rejects the Death derivative's complete
offline visual gate: **improved-but-failing**, with no renderer promotion.
Its lowest surface is a right-arm vertex (62.8% forearm/37.2% upper arm),
requiring +.13439m floor translation versus the native source's+.03229m.
The extra10.21cm comes from the arm/rest-support mismatch. Source-to-target
arm direction errors of48–59degrees remain constant during motion; constant
error is not anatomical agreement. The initial builder/reviewer acceptance
and boot-envelope explanation are superseded by the full-skin evidence in
`outputs/cs16/reuse/ct-authored-death-review/REPORT.md`.
Static data and Idle/Walk/Run remain exact; format and pelvis/head numerical
subchecks pass. Character/viewmodel totals remain0/4 each; gained0/lost0.

### Humanoid reference-pose workflow — bounded tooling qualification

Need: correct the demonstrated A-pose/T-pose anatomical mismatch before any
further death or hold conversion. Three's current bind-delta adapter preserves
that mismatch. MPFB/Mixamo's character-specific workflow remains blocked on
sign-in. Blender glTF bone-direction heuristics orient edit bones but do not
by themselves establish a matching humanoid reference silhouette. New custom
joint keys or visually tuned per-bone offsets are rejected as the next method.

Evaluate Godot's existing humanoid importer **only as an offline reference-pose
processor**, with its BoneMap, SkeletonProfileHumanoid, Overwrite Axis and Fix
Silhouette options. The runtime remains Three/React. This is a proposed tool,
not a qualified dependency or an engine migration. Official documentation:
[humanoid retargeting](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/retargeting_3d_skeletons.html).
The regular RetargetModifier's rest-relative transfer alone is insufficient;
the experiment must exercise actual silhouette/reference-pose normalization.

Fresh worker owns only `outputs/cs16/reuse/humanoid-reference-tool-review/` and,
if needed, a pinned portable official binary under ignored`.tools/godot/`.
No global installation, application/public/shared processor changes or new
runtime dependency. Budget: inspect the official implementation/options, then
one source/target reference-pose prototype if the integration is feasible.
Use frozen source69591853 and targete85a0dd. Record tool version/license/hash,
exact humanoid map, source transforms, standard options and adapter cost.

Qualify only if the tool can produce source and target reference poses with
bilateral upper-arm/forearm/thigh/calf direction differences≤2degrees and
palm-plane differences≤5degrees, without editing mesh topology/weights or
hand-authoring joint rotations. Prove evaluated geometry/pose interpretation,
and retain the calibration matrices needed to return generated animation to
the original target node/bind frames. No requirement to export a production
Death clip in this tooling experiment. If public APIs cannot support this
without reimplementing the normalization algorithm, or it needs broad changes
to the character/old clips, report the concrete cost and stop for coordinator
selection. No automatic second tool, retry family or catalog search follows.

### Mixamo local preparation — reduced-doll card

While authentication remains pending, prepare the documented MPFB reduced-doll
FBX locally so any later service pilot can use this exact character's proportions.
This preparation does not grant service access or perform an upload. Reuse
pinned MPFB2.0.17's `mpfb.reduced_doll` and Blender4.5.9 FBX export on a copy of
`outputs/cs16/reuse/mpfb-ct/gas-mask-source/full-helper-rig-source-cc0-gloves-boots/gas-mask-source-unoptimized.blend`.
Own only `outputs/cs16/reuse/mixamo-reduced-doll/`; no shared script, source,
public or application changes. Local FBX/GLB/Blend and a small reproducible
operator wrapper are permitted. Do not send files to a service.

Required evidence: original hash unchanged; one complete human body plus its
existing Mixamo rig, no clothing/helper geometry or unwanted scene objects;
standard baked shape keys and native deform weights; required52 target bone
correspondence. Record native-to-served-CT bone positions after its already
documented facing conversion, without new fitting/pose/weight changes. Export
FBX selected objects only, no animation or leaf bones; reimport it in a clean
Blender process and compare skeleton/body bounds in metres, tolerances1mm for
joint positions and0.1% for body height. Inspect front/three-quarter images for
an intact complete body. Stop if the saved source lacks its original basemesh
or the standard operator/export cannot preserve the rig; do not reconstruct it.
This accepts only an offline upload-ready artifact, never Mixamo processing,
rifle-hold contact or character visual fidelity. No gameplay tests/build.

Further read-only runtime reuse finding: both bot elimination paths already
call `spawnEnemyFirearmDrop` before `beginBotDeathPose`, creating the pickup
and its ground model. A future authored death integration should reuse that
existing drop, hide the deceased bot's carried assembly and omit two-hand IK,
rather than add a second weapon-fall system or keep a duplicate gun upright in
the corpse. Preserve current pickup/ammo and round cleanup behavior. QA fixed
death views need the same declared carried-weapon visibility policy; they are
not gameplay elimination and must not claim a pickup was spawned.

Godot tooling experiment is **blocked for the complete normalization route**.
The one official4.7.2 prototype aligns eight limb directions within0.0000262
degrees, but palms differ38.82/38.32degrees and fail the frozen5degree gate.
It also changes rest/skin-bind frames and would require a custom adapter back
to original CT deformation frames. Do not retry/tune or promote this as a
qualified dependency. Evidence: humanoid-reference-tool-review/REPORT.md.

The reduced-doll FBX remains frozen at SHA3b8d0b9c849c6ada6153c840d07d46e3d54c163de18919ced1773621e936239a.
Its first verifier accidentally selected the original rig after FBX import;
the claimed zero-error round trip was a self-comparison and is invalid.
Preserved under mixamo-reduced-doll/verification-self-comparison-failure/.
The repaired fresh-scene check finds1.856cm maximum joint-head discrepancy,
and4.677cm against served CT after facing conversion, despite nearly exact
body height. The exported FBX has not changed. Root inspected both original
body PNGs: the complete body is intact. Upload-readiness remains **unverified**.

Before any export repair, a fresh read-only format/rig reviewer owns only
`outputs/cs16/reuse/mixamo-rig-format-review/`. Compare original native,
reduced Blend, isolated FBX reimport and served GLB using both actual evaluated
pose/deformation transforms and edit-bone display/rest data. Identify affected
bones and exact importer/exporter behavior. Test full evaluated surfaces with
proper correspondence, not body height alone. Determine whether discrepancies
are real joint/pivot changes or a measurement/representation error. No source,
FBX or shared processor change; no new export, tuning or runtime work. Return
one grounded diagnosis and the minimum standard-tool repair if one is proven.

### Reduced-doll verification correction — frozen artifact unchanged

The independent format audit establishes exact 13,380-vertex / 26,756-triangle
correspondence between the reduced Blend and isolated FBX reimport. Evaluated
vertex differences are below 0.002mm under the shared pose stress. This rejects
the earlier interpretation of a centimetre-scale deformation defect. The old
verifier used `Bone.head` as an armature-space joint position; its coordinate
semantics must be corrected rather than changing the asset to fit that test.

Repair only the local preparation verifier/report. Preserve both the original
self-comparison and the subsequent invalid head-coordinate evidence. Keep the
FBX and all source/served asset hashes frozen. Compare world rest joint origins
using `rig.matrix_world @ bone.matrix_local`, verify `head_local` agrees with
those origins, and compare evaluated pose matrices. Position tolerance remains
1mm and body-height tolerance remains 0.1%. Add an explicit rotation tolerance
of 0.001 radians and a 1mm direct evaluated-vertex tolerance in rest and the
same named-bone local-Z 0.37-radian stress pose. Check exact FBX topology,
52 bone names/hierarchy, a single mesh/rig and original source preservation.
Separate translation, rotation and scale metrics; a mixed 4x4 component error
has no single physical unit. Served CT has different geometry, so verify only
its named rest/pose frame correspondence here, not whole-mesh equivalence.

Focused builder owns only `outputs/cs16/reuse/mixamo-reduced-doll/`; independent
format reviewer retains its separate directory and corrects the property
diagnosis/units. No re-export, rig/weight/material edits or runtime integration.
This is an explicit measurement correction, not a relaxed visual gate. Service
processing, authored motion quality and in-game acceptance remain unchecked.

The preparation verifier's schema4 pass is rejected as incomplete: it reported
a served rest rotation near 2π but omitted that rotation gate, omitted the
declared served pose stress, and only recorded several frozen hashes instead
of asserting them. Quaternion sign equivalence must be handled with the
normalized shortest rotation distance; dropping a gate is not a repair. The
served CT does contain Idle/Walk/Run, contrary to that report's label. Preserve
schema4 script/JSON/report under a separate failed-verification directory.
Reassign this focused verifier repair to the Terra format reviewer, expanding
ownership only to the preparation verifier/report/evidence directory. Retain
the existing artifact hashes and all declared tests. No new asset attempt.

Final local preparation verdict: **accepted**, after root reviewed the Terra
schema5 verifier and raw audit. All expected source/reduced/FBX/served hashes
match before and after. The same 52 joints pass rest/reset/stress checks, with
FBX translation at most 0.000982mm and shortest rotation at most 0.000691rad;
served stress translation is at most 0.000787mm. Exact 13,380-vertex /
26,756-triangle correspondence gives a maximum stressed FBX vertex error of
0.000927mm. Body-height relative error is 1.322e-7. No shape keys or extra
FBX mesh/rig; source and exported artifacts were not changed. The served GLB's
Idle/Walk/Run are recorded before in-memory stress setup. Root expanded the
verifier's dense statements/dictionaries and local names for readability,
verified unchanged Python syntax structure apart from those local names, and
compiled the result. No measurement algorithm or threshold changed.

Evidence: `outputs/cs16/reuse/mixamo-reduced-doll/REPORT.md`,
`reimport-audit.json`, `verification-corrected-gates.log`; independent format
review in `outputs/cs16/reuse/mixamo-rig-format-review/`. Both invalid verifier
families remain preserved. Root previously inspected both full-size body views.
No game/asset promotion or gameplay/build checks were warranted for this local
preparation. Character and viewmodel acceptance remain 0/4 each; gained0/lost0.

The selected next full-body animation trial is **blocked on Mixamo sign-in**.
The inspected tab19 remains signed out and the asynchronous access question
has no response. The FBX is prepared locally; no upload or service processing
has occurred. After actual authentication is available, inspect and qualify one
character-specific authored rifle hold before any renderer integration. Retain
the existing contact/visual gates. Godot normalization, the Quaternius Death
conversion, and classic M4 substitution remain stopped at their recorded
failures; no automatic retuning or broader asset search follows this checkpoint.

### M4 hands — one material-only, fingerless-glove pilot

The user explicitly resumed work after the tooling review. Mixamo was rechecked
and remains signed out. Continue the independent hand-surface issue using the
already matched Kuptchi arms/weapon, not the stopped classic receiver conversion.
Root re-inspected both supplied M4 reference stills and the served 4:3 control:
the references show dark gloves with exposed fingers; the current source has
bare pale hands. The original 256px arm texture contains usable skin shading
and UVs. Earlier native glove classification proved actual deform influences
must be filtered before selecting hand faces; unused control groups must not
participate. That supports reusing the selection method, not accepting its old
full-finger glove or failed donor-gun assembly.

Choice: adapt material assignment on the frozen served aa30cc72 M4 via installed
glTF Transform 4.5.0. Preserve its native geometry, skin weights, UVs, textures,
rig, clips, camera mount, gun, sockets and gameplay clocks. Derive a single dark,
rough hand material from the existing textured skin material, selecting palms
and proximal finger regions from the actual named deform influences. Keep distal
finger regions and forearms skin-colored. This is explicitly a surface
approximation; no authored cloth geometry or original-game asset is implied.
No new catalog search, image generation, rig/geometry remodeling or finger keys.

One bounded offline candidate under `outputs/cs16/reuse/m4-fingerless-glove/`.
Use standard material/primitive operations; if partitioning faces is required,
preserve every oriented triangle and attribute tuple exactly, and preserve live
mesh classification metadata. At most three mesh draw proxies (baseline two),
same 3,596 arm / 3,480 gun triangles, existing two skins and 72 rig bones, and
unchanged animation/sockets/weapon texture. Source permission remains Kuptchi's
recorded custom game-use terms. No public/app/tests changes by the builder.

First gates: Validator zero errors with inherited warnings documented; full
source/static/animation preservation; actual render of textured dark palm/cuff
and exposed fingers, with a clean wrist transition, no patchwork selection or
changed silhouette/grip. Root will freeze fresh baseline and candidate using
the visual toolkit: High, seed1947, 960x720 Idle0 and 1280x720 Reload at
0/700/1750/2800/3500ms, plus additional action/aspect views only if the initial
whole images improve. Root compares full images, not only darker pixel counts.
Offline/isolated-renderer qualification comes before public promotion. If this
one candidate fails its hand-surface/composition gate, preserve it and stop this
pilot; do not tune hues/coverage repeatedly. A separate accepted refinement can
improve the live M4 while the classic silhouette remains explicitly unaccepted.
P7b/P7c totals stay 0/4 unless their complete frozen criteria are established.

Glove pilot result, 2026-09-15: **accepted as a scoped material refinement**;
overall M4 remains **improved-but-failing**, P7b/P7c 0/4, gained0/lost0 against
those full cards. Root and an independent verifier inspected 15 paired frames
across Idle/Fire/Reload/Equip and 4:3/16:9. Candidate SHA7b0cd03d34bdf5c7c020e2d39a47c72d9ad91f5dffa05665bccb7b894a98a5c3
is now public; old aa30cc72 is retained. All geometry/UV/weight/texture/clip,
inverse-bind and original-node contracts pass; both actual arm leaves are
tagged. Validator0errors/3 documented warnings. The preparation script now
requires three distinct paths and refuses existing outputs; a fresh run
reproduced the final GLB exactly. No runtime framework or adapter change.

Runtime: 41 focused and649 regression checks pass, performance p95 0.2818ms
below0.5ms, lint/typecheck/Sites build pass. Served Reload1750ms is pixel-identical
to the isolated candidate. Normal round6 demonstrates movement into cover,
M4 shot30→29, visible reload29/30→30/29, stable pause/resume and another
accepted shot. Normal round1 bomb result and round6 elimination both reached
the next ready phase. Interrupted firing/reload attempts and spectator skips
in intermediate rounds are labelled in m4-glove-runtime/REPORT.md. This is
root integration smoke, not two independent final acceptance rounds.

The same smoke exposed a separate existing defect: the M4 silencer visibly
points upward after its timer completes. Its state transition passes, its
appearance does not. Preserve m4-glove-runtime/m4-silencer-complete.png as the
known-defect baseline and continue the attachment-frame correction below.

### M4 silencer — align the existing attachment to the authored barrel

Need: the existing silencer must follow the barrel's direction and motion.
Root observed the finished attachment standing upright above the muzzle in
normal gameplay. Current public glove asset remains frozen at7b0cd03d.

Reuse decision: retain Three.js transforms, the authored Main bone/muzzle
socket, and existing cylinder/material/action clocks. Inspect the source
socket basis and actual loaded transforms before choosing the correction
layer. Prefer one explicit frame conversion in the owning source or adapter;
do not tune Euler angles by screenshot or rebuild the weapon/silencer.
No dependency or geometry work is justified for this orientation defect.

Frozen gate: cylinder axis agrees with the actual authored barrel forward
direction within0.5 degrees through Idle/Fire/Reload/Equip. Its center extends
0.12m forward of the muzzle, preserving the existing0.27m length/0.045m radius
and1.5cm rear overlap. Position error<=0.5mm; scale stays in metres. Verify
barrel direction from native/loaded geometry, not a circular assertion using
the same assumed socket axis. Keep source geometry, skins, UVs, materials,
clips, gun/hand motion, gameplay timing and projectile aim unchanged. Preserve
USP/world attachments; M4 viewmodel with silencer <=4 draw proxies.

First perform an isolated numerical/source diagnosis with a proposed thin
patch and a failing-before/passing-after test. Root owns applying runtime
changes and actual fixed/normal browser views. Outputs under
outputs/cs16/reuse/m4-silencer-alignment/. Inspect the full attachment image
before accepting the correction; no claim of classic silhouette fidelity.
One derived-frame correction attempt; if the source-axis contract fails,
preserve evidence and reconsider the layer instead of numerical retuning.

Measurement correction before acceptance, 2026-09-15: the initial `<=4 draw
proxies` wording counted three asset meshes plus the attachment but omitted
the existing muzzle-flash Sprite. `createMuzzleFlash` retains that Sprite even
at zero opacity, and `inspectVisibleGeometryLoad` counts it. Preserve the
original wording above as the incomplete oracle. Rebaseline both versions
with the same actual light/Sprite/attachment structure: at most four solid
meshes and five total draw proxies, with zero increase from the frame fix.
The global graphics limits remain unchanged. The independent review must
record the actual baseline/candidate totals; no rendering cost is being added
or excused by this correction.

Result, 2026-09-15: **accepted as a scoped attachment-frame correction**.
The actual adapter now normalizes loaded socket -Y to the public -Z effect
convention. Source GLB7b0cd03d and generic page are unchanged. Known-defect
baseline test fails; candidate6/6 passes. Independent actual-adapter and
native/loaded-geometry checks pass the original angular/position gates for
all four actions, including unchanged light/Sprite scale and center. Five
total proxies (four meshes plus the existing Sprite) match before/after.
Root unsilenced Reload1750ms paired render is pixel-identical; normal M4
attachment visibly follows the barrel. Fire30→29 and reload29/30→30/29 are
observed, with the latter's receipt after death. Removal remains unchecked.
Normal round1/2 bomb outcomes and next-round receipts are retained. This is
root smoke, not independent final acceptance. Regression650/650, performance
1/1 (p95 0.1943ms<0.5ms), lint/typecheck/Sites build pass; browser errors empty.
Evidence: outputs/cs16/reuse/m4-silencer-alignment/ROOT_REVIEW.md and raw files.
P7b/P7c remain0/4 each, gained0/lost0; full character/grip/death/classic rifle
criteria still fail. The selected next character-specific authored-animation
pilot is blocked on Mixamo sign-in, rechecked in tab19 (Log In / Sign Up).
Prepared FBX remains ready locally, with no upload or service processing.
