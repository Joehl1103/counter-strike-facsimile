# Classic Counter-Strike Graphics Realism Loops

## Goal

Move Dustline toward classic Counter-Strike's visual grammar at modern browser
clarity: hard readable architecture, texture-led surfaces, stable light/dark
zones, faceted team-readable combatants, and compact weapon effects. Preserve
all gameplay authority, original assets, performance modes, and controls.

## Context

- The current renderer uses ACES tone mapping, an indoor PMREM environment,
  several fill lights, soft 2048px shadows, rounded architecture, procedural
  PBR materials, and smooth capsule characters.
- Valve's official Counter-Strike screenshots show planar brush geometry,
  obvious material tiling, dark apertures, restrained highlights, angular
  characters, and broad team-colored cloth.
- Primary references:
  - <https://store.steampowered.com/app/10/CounterStrike/>
  - <https://store.steampowered.com/api/appdetails?appids=10>
  - <https://github.com/ValveSoftware/halflife/blob/master/utils/common/bspfile.h>
  - <https://github.com/ValveSoftware/halflife/blob/master/utils/qrad/qrad.c>
  - <https://github.com/ValveSoftware/halflife/blob/master/utils/mdlviewer/studio_render.cpp>
  - <https://threejs.org/docs/pages/WebGLRenderer.html>

## Decisions

- Target classic visual grammar, not copied Valve assets, forced 4:3 output,
  deliberate aliasing, or modern photorealism.
- Ship four independently reviewable loops and one commit per loop.
- Use lower-power agents for implementation and independent review; coordinate,
  integrate, validate, commit, and deploy from the root thread.
- Keep camera FOV, collision, navigation, hitboxes, line of sight, raycast
  collections, weapon timing, and input behavior unchanged.

## Assumptions

- High quality means the clearest intentional classic rendering, not the
  smoothest or most reflective rendering.
- The existing original procedural art pipeline remains the asset source.
- Automated pointer lock may remain unavailable; deterministic QA views or a
  narrowly gated local capture path may be used to inspect unobstructed frames.

## Proposed Changes

### Loop 1 — Classic frame and lighting baseline

- Extract a pure classic render profile for tone mapping, fog/horizon colors,
  persistent light counts/intensities, environment response, and shadow budget.
- Replace the indoor reflection look with restrained outdoor/matte response.
- Keep sRGB, antialiasing, DPR caps, camera FOV, and fog visibility authority.
- Align fog and sky horizon colors and strengthen stable directional contrast.

Acceptance:

- No post-processing, at most two persistent world lights, one shadow caster,
  and a 1024px maximum high-quality shadow map.
- No new textures, geometry, draw calls, colliders, or raycast targets.
- Sunlit plaster retains detail; doorways stay dark; weapons lose room-like
  reflection sheen; actors remain readable in shade.

### Loop 2 — Texture-first map grammar

- Extract deterministic material-profile helpers for original plaster, cut
  stone, dark masonry, sand, timber, and oxidized/painted metal families.
- Put macro seams, blocks, stains, cracks, and edge wear in low-resolution
  diffuse textures; remove structural bump-map dependence.
- Restore hard visual planes with micro-bevels while leaving the existing 22
  authoritative collision meshes and transforms unchanged.
- Give A, B, and mid distinct restrained value motifs; improve sky cloud masses
  and preserve exterior landmark bounds.

Acceptance:

- Exactly the same gameplay proxy transforms and `Box3` bounds.
- Visual shells never enter collision, LOS, penetration, or shot-surface arrays.
- At most eight structural 256px textures plus the existing facade atlas; zero
  structural bump/normal maps; no texture swimming or copied map art.
- Routes/sites remain recognizable from player-height images without the HUD.

### Loop 3 — Faceted combat readability

- Preserve invisible character hit proxies and replace only visible variants
  with narrower, deliberately faceted original render shells.
- Use broad team cloth colors and sparse painted gear instead of a small accent
  patch and smooth blank armor.
- Reduce reflective/toy-like weapon response and compact muzzle/impact effects.
- Keep all muzzle/ejection anchors, arm contacts, reload/recoil/equip clocks,
  locomotion offsets, camera aim, and hit response authoritative.

Acceptance:

- Visible character at most 4,000 triangles and eight material draws per bot;
  exactly one visible render variant with raycastable proxies preserved.
- Regular pistol at most 2,500 weapon triangles/three weapon draws; Dual Elites
  at most 4,000 triangles/five weapon draws, excluding arms/effects.
- No per-frame geometry/material allocation; cycling weapons returns warm-state
  renderer counts; team identity remains clear in sun and shade at 5–30 meters.

### Loop 4 — Human movement and animation realism

- Separate authoritative simulation state from presentation-only interpolation
  so player and enemy motion reads naturally without changing gameplay timing.
- Improve enemy gait, foot planting, weight transfer, torso counter-rotation,
  aim offsets, crouch posture, recoil response, and state transitions.
- Refine first-person camera and weapon motion with restrained acceleration,
  landing, and stance response while preserving exact aim and recoil authority.
- Keep hands attached to weapon anchors throughout idle, locomotion, recoil,
  reload, equip, and weapon switching.

Acceptance:

- Player speed, acceleration, collision, camera aim, hitboxes, AI decisions,
  fire/reload/equip clocks, and damage outcomes are bit-for-bit unchanged by
  the presentation layer.
- Standing, walking, running, crouching, aiming, firing, reloading, landing,
  and death transitions have bounded, deterministic visual poses with no limb
  snapping, foot sliding at rest, knee inversion, or weapon/hand separation.
- Upper-body aim remains readable while the lower body follows locomotion;
  left/right stride and turns produce believable counter-motion.
- Animation adds no per-frame geometry or material allocation and remains
  within the established high/performance graphics budgets.

Execution stages:

1. Lock the current `88c52f2`/`d692bbc` movement behavior as the gameplay
   oracle with deterministic acceleration, braking, coast, turn, stride, and
   aim traces. Do not roll movement back to an earlier revision.
2. Preserve the existing gameplay camera for hitscan, grenade/flash rays,
   spotting, audio, and death capture. Render any new inertia or roll through
   a separate presentation camera copied from that authority camera.
3. Preserve the existing bot root and hit-proxy matrices. Add a raycast-disabled
   sibling visual rig with pelvis, torso, head, articulated legs/feet, arms,
   hands, and shared weapon/grip sockets.
4. Drive that rig from deterministic simulation snapshots and action pulses;
   never use wall-clock time, timers, or random draws for animation.
5. Add localhost-only team/distance/action pose QA, performance measurement,
   and presentation-on/off authority comparisons before release.

Measured gates:

- Presentation on/off produces identical player/bot positions and velocities,
  hit-proxy transforms, fire-eligibility frames, gameplay rays, objective and
  footstep timestamps, and random-number call order.
- Planted sole drift is at most 3 cm, sole height stays within 2 cm of ground,
  swing toe clearance is 4–12 cm, and knees never invert.
- Hand-to-grip distance is at most 3 cm normally and never over 5 cm; rendered
  muzzle-to-tracer distance is at most 2 cm.
- Equal elapsed 30/60/120 Hz traces produce equivalent sampled poses; ordinary
  angular deltas stay within 0.12 radians per 30 Hz frame and documented shot
  or death impulses within 0.18 radians.
- Eight-bot presentation writes remain under 0.5 ms p95 on the reference
  machine with no steady-state geometry, material, or texture allocation.

Execution result (2026-09-04):

- Kept the gameplay camera authoritative and rendered through a synchronized
  presentation camera. Hitscan, grenade/flash aim, audio, spotting, and death
  capture continue to read the gameplay camera.
- Added deterministic player inertia, stance/landing response, and a restrained
  1.5 mm phase-locked lateral head sway without modifying aim or movement.
- Added a raycast-disabled sibling rig per bot, retained pose state, compound
  limb deformation, symmetric rest, mirrored gait, support-leg weight transfer,
  knee/ankle coordination, strafe counter-motion, and action impulses.
- Migrated falls to the visual sibling. Living legacy leg-pivot writes remain
  intact for exact hit-proxy behavior; death never raises, pitches, or rolls the
  authoritative bot root.
- Replaced the oversized rectangular bot hand with a compact tapered palm,
  centered the visual weapon stance, and solved both hands through a stable
  two-bone hinge basis. Page-equivalent transformed palm bounds and centroids
  now meet both authored grip contacts within 3 cm; the pre-calibration visual
  miss was approximately 14.4 cm per hand.
- Added two deterministic localhost pose boards:
  `?visual-qa=movement` for run/strafe and
  `?visual-qa=movement&motion-start=8` for aim/death review.
- Added baseline locks, 30/60/120 Hz stability checks, presentation on/off
  authority traces, page-source integration contracts, socket/geometry contact
  tests, lifecycle checks, and a full retained eight-bot benchmark.
- Replaced per-render-call joint limits with elapsed-time angular rates. Step
  transitions now match at shared 0.05/0.10/0.15-second samples across
  30/60/120 Hz while preserving the 0.12/0.18-radian 30 Hz frame bounds.
- Connected the live compound boot geometry to retained world-contact anchors.
  The planting pass measures transformed sole vertices after deformation,
  keeps planted drift within 3 cm and sole height within 2 cm, and preserves
  4–12 cm swing clearance for both feet at 30/60/120 Hz.
- Final local verification: 299 tests pass; lint, TypeScript, production build,
  and `git diff --check` pass. The strengthened full eight-bot presentation
  gate measures 320 individual frames after warm-up with all weapon branches
  mounted and both rendered foot-plant passes active; the root release run
  measured 0.1498 ms p95 against the 0.5 ms gate.

## Human Realism And Graphics Completion Loop (2026-09-04)

The final coordinated loop used a powerful graphics director plus independent
execution and verification agents. It closed the remaining character,
viewmodel, death-contact, surface, and sky readability gaps without changing
gameplay authority.

- Composed authored shoulder and elbow motion into the two-hand grip solver,
  preserving exact hand contacts while restoring readable aim, gait, and
  recoil variation. The worst measured grip error is effectively zero
  (`1.08e-8` world units).
- Rebuilt the visible character grammar with a jaw and face plane, neck,
  shoulder-to-waist torso taper, pelvis continuity, articulated elbow/knee
  breaks, and directional tapered boots. The deterministic profile gates
  measure a 0.140 head/body ratio, 1.265 front and 1.386 quarter-view
  shoulder/hip ratios, and 0.400/0.283 bilateral limb separation.
- Strengthened CT/T readability with distinct blue and olive/brown cloth plus
  two geometry cues per side. Palette separation measures 15.19 CIELAB
  lightness points and 37.90 CIEDE2000 while the character stays within eight
  draws and the 4,000-triangle ceiling.
- Expanded death presentation through the hips, knees, ankles, forearms,
  hands, and head. A real-rig matrix covers four variants, five origins, and
  four progress samples: torso gap 0.03806 m, planted-limb gap 0.005 m, no
  penetration (minimum vertex +0.00017 m), and maximum 30 Hz angular delta
  0.11038 radians.
- Replaced floating pistol-end hands with retained tapered forearms, cuff and
  wrist continuity, a two-segment dominant-arm bend, and an occluded support
  arm that converges behind the grip. Production gates clip projected bounds
  to the visible viewport, require bottom-edge entry, preserve exact grip and
  near-plane contacts, and keep pistol arms to 1,150 triangles and two draws
  each.
- Replaced the transient checker/polka surface artifacts with periodic seeded
  value noise and restrained masonry. All six structural diffuse families
  have a zero seam delta; plaster block discontinuity is 0.04302 p95 and
  0.06897 maximum.
- Increased the existing soft sky-cloud contribution while preserving the
  periodic seam. Cloud-band residual-luminance RMS is 0.02821, p90 row range
  is 0.17091, and RGB seam delta remains zero.
- Added deterministic localhost review boards for the 18-view character
  matrix, all six secondary viewmodels, movement/action/death poses, and fixed
  lane/site views. Final High-quality browser review at an effective
  1279x719 canvas showed no runtime errors and no remaining P0/P1 visual
  blockers.
- Final root verification: 321 tests pass; lint, TypeScript, production build,
  and `git diff --check` pass. The eight-bot presentation benchmark measured
  0.3482 ms p95 against the 0.5 ms gate. The powerful director's independent
  final verdict is COMPLETE / SHIP for both the dedicated movement/human-
  realism loop and the broader graphics objective.

## Files Or Systems Likely Affected

- `app/page.tsx`
- `app/render-quality.ts`
- `app/scene-layout.ts`
- `app/character-visuals.ts`
- `app/secondary-weapon-models.ts`
- Focused new pure visual-profile modules and matching tests
- `CODEX_PLAN.md`

## Risks And Mitigations

- Removing ACES/PMREM can expose overbright or crushed values: calibrate lights
  as one profile and reject per-object emissive compensation.
- Visual shells can accidentally affect gameplay: make them non-raycastable and
  regression-test authoritative transforms and collections.
- Low-poly can look unfinished: use deliberate planes and macro texture-painted
  form rather than merely deleting segments.
- Shared materials can leak hit flashes: keep mutable emissive response scoped
  per bot while sharing immutable texture inputs.

## Verification

1. Add focused unit tests for every extracted visual profile and budget.
2. Run full tests, lint, TypeScript, build, and `git diff --check` after each loop.
3. Capture fixed views in high/performance modes at 1024×768 and 1280×720:
   lanes, sites, sun/shade plaster, doorway, props, T/CT distances, and weapons.
4. Review full-color and reduced grayscale thumbnails for silhouette/value
   readability; record any browser pointer-lock limitation explicitly.
5. Push every verified loop to `origin/main`, then deploy the final revision to
   the existing owner-only Sites project and verify production status.
