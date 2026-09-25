# Counter-Strike recovery — paused at a verified checkpoint

**Latest user direction, 2026-09-15:** stop at a good checkpoint, reflect, and
save learnings for future sessions. Implementation is paused after the verified
M4 glove/silencer improvements. Resume only on a new user instruction.
Read [project memory](PROJECT_MEMORY.md) and the
[session checkpoint](memory/sessions/2026-09-15T054124Z.md) before using the
historical work record below. P7b/P7c remain0/4; the game is not complete.

**Latest feedback:** “By the way the m4 looks great. The other guns still look
pretty bad.” Preserve the current M4's user-approved appearance and use it as
the quality reference for improving the other guns. The weapon queue now
excludes M4 cosmetic/receiver replacement. Earlier statements that its modern
silhouette and pale forearms still require correction are historical, superseded
by this feedback. Full multi-weapon/action checks remain separate; the pause
continues. No asset or application change was made for this feedback.

The user subsequently authorized strategy adjustments during this pause. The
[revised execution order](CODEX_PLAN_TOOL_REUSE.md#strategy-adjustment--2026-09-15)
now prioritizes a complete CT/rig/authored-hold pairing, checks access before
further preparation, permits one bounded alternative-source review if Mixamo
remains inaccessible, and defers preview expansion until a selected package
needs it. This updates planning, not the implementation pause. The earlier
immutable checkpoint remains historical; use this live handoff for the queue.

After the pause and factory review, the user said “Once you are done, start over.”
This authorizes the fresh asset approach in [the tool reuse plan](CODEX_PLAN_TOOL_REUSE.md).
Map improvements and gameplay are retained. Previous custom AK and CT pilots
remain unaccepted comparison controls; the old CT authoring approach is retired.
No deployment, commit, or broad rollback.

Current focus is a native MPFB CT plus a matched, animated Kuptchi M4/carbine.
WRAD/Stein AK grip repair was rejected and stopped. Keep map/gameplay progress.
The continuing coordination requirement is to check Buzz for tooling updates.
Read AGENTS.md: check Buzz per stable task cursor at entry/between major steps/
before final, append one JSON line to BUZZ_MESSAGE_LOG.jsonl per check, and post
verified routine task completion before any final response. Never print secrets.

## Active reuse work

- Prior implementation direction: continue after checking Buzz tooling updates. Root
  rechecked Mixamo tab19; still signed out. The independent M4 material-only
  fingerless-glove pilot passed offline/static and fixed renderer review and
  is now integrated locally. Public SHA7b0cd03d34bdf5c7c020e2d39a47c72d9ad91f5dffa05665bccb7b894a98a5c3.
  Frozen old aa30cc72 copy and processor evidence: m4-fingerless-glove/.
  Paired baseline/final captures: m4-fingerless-glove-baseline/ and
  m4-fingerless-glove-final-render/ (15 frames each, High, seed1947, both aspects,
  Idle/Fire/Reload/Equip). Root and independent reviewer see clean dark palms
  and proximal fingers, exposed distal fingers/forearms, and no grip/silhouette
  regression. Modern rifle silhouette and pale forearms remain unaccepted.
  Independent raw checker/audits: m4-glove-independent-review/. Corrected audit
  checks exact hashes, all original transforms/hierarchy, inverse binds and
  full rifle primitive, in addition to texture/UV/weight/clip/socket preservation.
  First report-only/incomplete verification evidence is preserved.
  scripts/prepare-m4-fingerless-glove.mjs uses glTF Transform and mandatory new
  output paths; reproduced final GLB bytes exactly. Reproduction with complete
  audit: m4-glove-reproduction-complete-audit/. Three tagged leaves, two skins,
  72 bones, unchanged 3596 arm/3480 gun triangles. No runtime adapter change.
  41 targeted +649 regression +1 performance checks pass; lint/typecheck and
  Sites build pass. Performance p95 0.2818ms<0.5ms. Served fixed reload image
  matches isolated candidate pixel-for-pixel. Normal M4 smoke completed in
  tab20: move behind cover, fire30→29, reload29/30→30/29, stable pause/resume,
  another accepted shot and natural round6 elimination/round7 ready receipt.
  Evidence m4-glove-runtime/; earlier interrupted attempts/skips labelled.
  That smoke exposed an upright M4 silencer; the subsequent frame correction
  is now accepted locally. The adapter normalizes loaded socket -Y forward to
  the existing public -Z effect convention. GLB and generic page are unchanged.
  Source diagnosis plus independent actual-adapter review pass all four clips
  within0.5degree/0.5mm; before/after counts are4 meshes+1 Sprite=5 proxies.
  The original four-proxy card omitted the Sprite; the plan preserves and
  corrects that oracle explicitly. Unsilenced reload remains pixel-identical.
  Normal attachment now follows the barrel; M4 fire30→29 and reload30/29
  receipt are observed, with the latter after death. Removal is unchecked.
  Natural round1/2 bomb outcomes and next-round receipts are recorded.
  Evidence: m4-silencer-alignment/ROOT_REVIEW.md and runtime/REPORT.md.
  Latest650 regression/6 focused/1 performance pass, p95 0.1943ms<0.5ms;
  lint/typecheck/Sites build pass. P7b/P7c stay0/4, gained0/lost0.
  Next selected character-animation pilot is blocked on Mixamo sign-in;
  tab19 still shows Log In/Sign Up. Local FBX is ready; no upload occurred.
  Tab20 remains paused after round3 death; no active worker remains. This
  does not reopen stopped grip/death/classic receiver attempts or claim
  full-game completion. Read Buzz before resuming.
- CT served at public/assets/characters/ct-mpfb.glb has SHA256
  e85a0dd18270caee23a12ef4970868323ac0be1bf7cd21b823af49158e6cf1f8 and uses the corrected
  MPFB helper-fitted rig, clearly CC0 Toigo gloves/boots and explicit atlas UVs.
  Neutral SHA 97b6720408563f113626365a9c2267ca86ae195e07e41283ff4409c590bf2140.
  Endpoint repair evidence: outputs/cs16/reuse/ct-endpoint-coverage/.
  All30 finger rotation tracks preserve source motion within0.05725degrees;
  all49 earlier rotation tracks and static data are unchanged. Source skin
  remains49 joints; SkeletonUtils uses a separate52-node lookup skeleton.
  9254 triangles, two materials, 52 target bones; 13 character tests pass.
  runtime-served-check/00250ms.png exactly matches the isolated candidate.
  Old public SHA7fd8904 is preserved as frozen-public-before-endpoints.glb.
  Close idle/walk/crouch and all four death variants inspected. Death remains
  rigid/propped and the support grip still visibly fails; see
  outputs/cs16/reuse/character-integration/death-view-review.md.
- Adapter app/skinned-character-visuals.ts handles authored CT vs live classic T,
  native-unit palms/pelvis, clean-pose restoration before mixer updates and
  geometry-cached Three ConvexHull ground support. Prior repeated-pose drift and
  2.85cm grounding miss are repaired. Geometry/texture sharing is retained;
  instances have independent skeletons/materials. Removal now disposes each
  cloned skeleton's bone texture; the known-defect test failed before and 13
  focused tests pass after. Typecheck/lint/Sites build pass after this cleanup.
  Page swaps native/legacy
  instances on faction changes while carrying existing weapon children.
- AK remains rejected runtime-v1 static WRAD+Stein, public/assets/viewmodels/ak47.glb.
  Do not resume numerical finger edits; failed contact-frame pilot is frozen.
- M4 now uses the matched Kuptchi authored asset in the local page. Served SHA256
  7b0cd03d34bdf5c7c020e2d39a47c72d9ad91f5dffa05665bccb7b894a98a5c3, provenance
  public/assets/viewmodels/M4_SOURCE.md. Pre-glove source is
  outputs/cs16/reuse/carbine-integration/native-final/camera-frame-repair/budget-camera-local.glb.
  3596 arm / 3480 rifle triangles, two textured skins, 72 bones,
  Idle/Fire/Reload/Equip. The derived glove material adds one draw proxy without
  geometry changes. The classic carry handle remains absent, so this modern
  AR-style source is an improved-but-failing visual pilot.
- Direct exporter preserves the original two rigs/meshes with Blender SCENE
  sampling, Mirror application and top-four weights. All 12 full/budget source
  seam-aware comparisons pass. The root merger copies paired samplers, retains
  Idle mesh/binds, shifts first time1/24 to0, and fixes the camera across actions.
- The first prepared camera was wrong: ordinary Empty references lack Blender's
  camera-only local RotX(-90degrees). Native projection proves the correct mount
  is .01 * RotX(+90degrees) * inverse(markerWorld). Both failure and correction
  are preserved. Do not mistake old native-final/*-camera-local.glb for the
  repaired files in camera-frame-repair/. Old source-to-wrapper proofs did not
  establish that the wrapper was the correct actual camera frame.
- Runtime adapter owns cloned geometry/materials/textures/skeletons. Authored
  clocks replace generic viewmodel fire/draw/reload offsets; simulation recoil
  and locomotion stay live. Muzzle effects/silencer follow an animated socket
  with metre scale; ejection follows the gun. New served-asset tests reject the
  known behind-camera bug and cover resource limits, reload drift/isolation.
- Fixed visual captures and metadata are under native-final/runtime-*. Root
  inspected corrected idle4:3, reload16:9 and equip16:9; fire16:9 is captured.
  These are paused asset views: HUD remains USP and they do not prove accepted
  carbine gameplay inputs. Retained baseline captures under carbine-baseline/.
- Dev server localhost:3000 remains running (session98265). Root normal gameplay
  observed purchase, accepted M4 shots, pause/resume, reload29/30 ->30/29 and
  natural round transitions. See native-final/normal-play/REPORT.md for precise
  limits. No completed silencer, casing/audio sync, measured movement route or
  independent final-round acceptance claim. Opening USP profile averaged120FPS;
  it is not an M4/all-route performance result. Latest warning/error list empty.
  Temporary tab16 is closed and the viewport override is reset.
- Visual toolkit is active; read visual-tools/README.md. Root added isolated
  CT/T subject, front/three-quarter, 1.5/3/6 distances and death variants.
  CT close hand view exposes open fingers; do not claim palm-position residual
  proves grasp. Repaired crouch uses supplied anatomical pose and lower QA socket.
- Latest full regression649/649 and Sites build pass after endpoint promotion
  and procedural-carbine entry cleanup; logs under ct-endpoint-coverage/.
  Earlier full regression650 included a now-retired procedural carbine test.
  Typecheck/lint and performance1/1 also pass, p95 0.2068ms versus0.5ms.
  Root completed a normal endpoint-CT smoke round: fire12→11, pause/keyboard
  resume, living CTs, death, bomb detonation and natural next freeze (CT0–1T).
  Source-camera and gameplay evidence are distinct. Normal-run report is
  ct-endpoint-coverage/normal-runtime/REPORT.md; temporary tab17 is closed.
  Independent authored_m4_runtime_review found no actionable adapter defect.
- classic_carbine_adaptation produced an offline derived-copy pilot using
  local CC0 Tabasco M4 plus Kuptchi rig/arms/actions and material-only gloves.
  Frozen card at the end of CODEX_PLAN_TOOL_REUSE.md. Do not replace the served
  modern M4. Independent review proved missing rig-world transforms caused the
  displaced first previews; source incompatibility was not established. The
  corrected frames pass16 full-action landmark paths at worst0.0000242cm.
  Correct fixed-basis RMS is2.295cm; actual contact is independently under review.
  Glove dominance originally included unused control groups; filtering actual
  deform assignments before max fixes89→700 faces without mesh/weight edits.
  Derivative SHAfe09b81317a5fac7ded96c0b8b60acf508fdf8654df08a02cd0f42c78a931ae3
  failed the actual charging-handle contact gate. Matched native source does
  grasp its90-polygon handle; donor28-polygon component lacks that surface.
  Both source/candidate animation transforms are correct. Root inspected the
  native and derived reload images; source choreography is retained. The
  classic_m4_native_handle revised attempt is now blocked: copied native
  handle/contact is exact, but its interface enters/exits the donor receiver
  without a compatible channel. Frozen SHA f4819d33e6bf906cb8334bdfafc5bb8ddf8045af18c3c40d370a8a3c45a5697e,
  evidence classic-m4-native-handle/clean-temporary-datablocks/. Root inspected
  authored Idle1/Reload54. No material/export/geometry follow-up;1550 gun,
  3596 arms,6 draws are resource evidence only. A bounded complete-assembly
  source review qualified no replacement; see classic-assembly-source-review/.
  Donor material audit confirms zero UVs/textures, so surface work is still a
  real cost, not missing-image repair. That stopped donor attempt did not replace the served native M4.
- ct_grip_reuse_diagnosis completed the source/target comparison:27 finger tracks
  retain source rest-relative motion within.0573degrees, but three source animated
  endpoint Object3Ds are absent from the49 weighted source joints. CT weights all
  three. ct_endpoint_coverage repaired all30 channels and skeleton ownership;
  root promoted the exact e85a candidate after offline and renderer review.
- A held-gun roll hypothesis was rejected after tracing the full attachment:
  createEnemy resets held rotation to identity and scale.64, preserving +Y up.
  Current palm targets do not encode a measured surface normal. Future wrist
  pilot must use actual fore-end contacts; no numerical finger repair authorized.
  ct_support_surface_pilot finished its one offline attempt: normal opposition
  passes, but palm patch~3.4cm and distal clusters3.5–6.6cm fail contact. No
  runtime edits/integration. Authored hold review corrected an overbroad
  bone-count objection: SkeletonUtils can use source01/02/03 world matrices
  including the extra Knuckle ancestor. No custom reduction is justified.
  ct_authored_hold_pilot owns only ignored offline outputs for the standard
  retargeted digit-layer/same-source-M4 contact pilot. Original failure is
  archived under frame-failure/: double-applied mount, reflected basis,
  source Idle used as bind, and articulated-vs-bind size ratio. First repair
  is also invalid as a contact verdict: wrist bind offset mounts source only,
  inserting an extra M inverse and differing from standard mapped Hand frame
  by78.0703degrees. Final composition repair agrees with standard mapped Hand
  within2.5e-7radians using full-precision normalized quaternions, but actual
  contact fails: palm9.033cm, normal-.75645, distals7.414–12.517cm. This grip
  route is stopped/blocked; no Walk candidate or renderer integration.
  No per-finger tuning/app changes. A future attempt needs a newly qualified
  full-body hold or standard anatomical reference-pose alignment workflow.
  Root checked Adobe Mixamo FAQ and in-app tab19: service is signed out.
  Async question asks user to sign in for a full-body rifle-hold source check;
  no login/upload/download attempted. Tab19 is marked for handoff. Root
  rechecked access after the local format review: the signed-out page remains
  unchanged. Authentication is still required for the selected service trial.
  Independent audit: ct-hold-frame-audit/REPORT.md. Current normal oracle stays
  fixed at source underside triangle2732 (native dot-.93337), not the nearer
  side triangle2049. Bind-size scale measures approximately.8961.
- Root inspected Quaternius Universal Animation Library Standard v3 (free CC0,
  archivecc73fc4). Exact43-clip GLB includes pistol and Death01 but no rifle
  animation, so it is rejected for the immediate hold need. Pistol reuse stays
  deferred. Root inspected all5 native Death01 source frames and qualified the
  coherent2.4s supine fall for one offline CT retarget pilot. Source evidence
  outputs/cs16/reuse/ct-authored-death-source/; native GLB69591853.
  ct_authored_death_retarget produced scripts/retarget-character-death.mjs and
  outputs/cs16/reuse/ct-authored-death-pilot/ct-mpfb-death.glb SHA469bab04.
  Independent ct-death-retarget-review evidence supersedes initial acceptance:
  complete offline gate improved-but-failing. Static data and Idle/Walk/Run
  remain exact; pelvis path and format pass. But source-target arm directions
  differ48–59degrees, making a right-arm surface the lowest support and lifting
  the whole model10.21cm more than source. Root inspected all5 full target PNGs.
  No runtime/public promotion. Read ct-authored-death-review/REPORT.md.
  Godot's offline humanoid-importer prototype is now stopped: eight limb
  directions align within0.0000262degrees, but palm planes differ38.82/38.32
  degrees, failing the frozen5degree gate. Returning its changed rest/skin-bind
  frames to the original CT would also need a custom adapter. The complete
  route is unqualified; no tuning, production export or engine change follows.
  Evidence: outputs/cs16/reuse/humanoid-reference-tool-review/REPORT.md;
  portable official4.7.2 binary remains isolated under ignored.tools/godot/.
  Root captured unchanged in-game death baseline16:9/4:3 under
  ct-death-runtime-baseline/. Live and QA death clocks currently clamp to.58s;
  later integration must preserve authored2.4s and handle start/reset/weapon.
  Provenance assets/source/quaternius-universal-animation/.
  No paid tier, installation or runtime use; temporary download tab18 closed.
- MPFB's standard reduced-doll operation prepared this exact CT body and52-bone
  Mixamo rig locally. Frozen FBX SHA3b8d0b9c849c6ada6153c840d07d46e3d54c163de18919ced1773621e936239a;
  outputs/cs16/reuse/mixamo-reduced-doll/. Root inspected intact front and
  three-quarter images. No source, served asset or application changes.
  Its original verifier self-compared a still-loaded native rig. The next
  verifier incorrectly treated Bone.head as an armature-space joint origin,
  reporting apparent1.856/4.677cm shifts. Both failures must remain preserved.
  Fresh format review proves exact FBX topology and evaluated vertex error
  below0.002mm; an artifact repair is not justified. The focused verifier
  correction is now accepted after Terra schema5 restores every declared
  check, including shortest quaternion rotations, served reset/stress poses,
  and expected hashes before/after. Maximum FBX stress vertex error is
  0.000927mm; all52 joints, topology and height checks pass. Root reviewed
  the raw audit and formatted the verifier without changing its algorithm.
  Corrected result: mixamo-reduced-doll/REPORT.md; independent diagnosis:
  mixamo-rig-format-review/REPORT.md. This accepts local preparation only.
  The selected next full-body hold service trial is blocked on Mixamo sign-in;
  no upload, service processing, renderer promotion or visual-fidelity pass.
- Root added visual:blender --source-camera NAME; default is the retained42mm
  whole-asset studio view. Explicit camera keeps original parenting/constraints/
  lens/animation and records evaluated camera data. Native18mm matrix verified
  exactly, source hash unchanged, missing camera fails, lint/Python compile pass.
  Evidence: outputs/cs16/reuse/toolkit-authored-camera/. Earlier studio images
  are not authored-camera proof. Tooling Buzz update4a1e5ac was read back.
- Procedural first-person carbine entry/mount retired; world geometry stays live.
  Cleanup first regressed rifle QA scale to1; root preserved failure and verified
  correction to.82 with paired4:3 toolkit captures under entry-cleanup/.
  Sites build passes. The live SMG/shotgun/sniper framing tests accidentally
  over-removed by cleanup are restored with their original thresholds.
- All user visual targets remain unaccepted (0/4 each). Continue through ready
  work; do not stop at this checkpoint or claim engineering checks finish art.

## Previous custom pilot controls (historical)

- Map retained unchanged during this recovery.
- This earlier AK was replaced locally by the reused pilot above. Its assets
  and evidence remain preserved for comparison; it was never visually accepted.
- Previous GLB: `public/assets/viewmodels/ak-pilot.glb`; editable Blender
  source: `assets/source/viewmodels/ak-pilot.blend`; reproducible script:
  `scripts/author-ak-pilot.py`. It reuses posed Vanguard hand topology, welds
  and extrudes a continuous wrist/forearm, and uses an original painted atlas.
- Gun 2,028 triangles; left arm 1,555; right arm 1,570; three mesh draws.
- Rifle mount `[0.43,-0.34,-0.59]`, rotation `[0.08,0.14,0]`, scale `.82`.
  First-person stock includes its visible neck only; full stock retained in
  the existing world model. No separate projection was introduced.
- Version 1 was inspected in-game at 4:3. Version 2 refines steel texture, cuff
  length, front sight, and trims hidden stock for the preserved camera clearance.
  Version 2 was reloaded but not captured/reviewed before the user stopped work.
- 40 targeted AK/primary/hand/world-weapon tests pass (including unchanged
  numeric draw/triangle/near-plane ceilings). Full suite, Sites build, complete
  normal rounds, fresh visual review, and native/16:9 candidate capture pending.
- CT offline asset is **unaccepted and not integrated**. Worker reported material
  binding problems, prominent harness/eyes, and skirt-like trousers. Do not ship
  or integrate its current output. Worker: `/root/recovery_ct_asset`.

## Historical pre-reuse evidence and paused instructions

- Paired rejected AK controls: `outputs/cs16/recovery/r0/`; comparison HTML and
  source provenance retained. No prior presentation is accepted as the target.
- AK candidate evidence: `outputs/cs16/recovery/ak-pilot/`; targeted test log there.
- Paused source manifest: `outputs/cs16/recovery/paused/manifest.json`.
- CT diagnosis: `outputs/cs16/recovery/ct-pilot/ct-pilot-front.png` (not accepted).
- Tooling: official Blender 4.5.9 mounted read-only at `/Volumes/Blender`,
  executable `/Volumes/Blender/Blender.app/Contents/MacOS/Blender`; official
  download SHA256 verified. MakeHuman source/licenses pinned under
  `assets/source/makehuman/`. Do not unmount while a worker still has a process.
- On continuation: start with [the tool reuse plan](CODEX_PLAN_TOOL_REUSE.md).
  Evaluate MPFB character/clothing/rig workflows and suitable licensed AK/hand
  sources before assigning more custom authoring. Keep the current pilots as
  controls; do not automatically resume CT script repairs. Validate selected
  exports with standard tools, then judge representative motion in the renderer.
- Latest review: factory now requires a reuse/adapt/custom/defer decision,
  deliverable-specific validation and a tooling/source review after a plateau.
  No dependencies installed, asset changes or visual passes from this review.

## Latest continuation checkpoint

- `scripts/retarget-character-clips.mjs` independent control review passed:
  `outputs/cs16/reuse/retarget-processing-review/REVIEW.md`. Target-specific
  binding, axes, units and grounding still require proof.
- Root's 45 affected rifle/camera/primary/world/viewmodel checks passed, as did
  lint/typecheck. Current served rifle source hashes and idle/fire/reload captures
  are in `outputs/cs16/reuse/integration/runtime-v1/`. The earlier PNG reload
  capture had a stale canvas size; the later 960×720 JPG is the paired capture.
- AK worker now owns one measured palm-frame repair under `contact-frame-pilot/`.
  The prior 1.22 candidate is frozen and unserved because its fingers hang away
  from the fore-end. Both previous candidates remain available.
- MPFB reduced costume is visually coherent at 9,252 triangles/two draws, but
  its gloves and T-pose hand bones disagree. Worker and independent reviewer
  are checking native source versus export binding before root retargets it.
  Do not import this character into the game until that is resolved.
- No new visual target accepted. Continue to the corrected export and renderer
  pilot; these checks are progress, not a completion or stop boundary.
