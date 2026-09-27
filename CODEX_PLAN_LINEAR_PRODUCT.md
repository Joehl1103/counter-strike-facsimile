# Counter-Strike 1.6 product plan and Linear backlog

## Repository setup — 2026-09-16

The user-designated repository is [Joehl1103/counter-strike-facsimile](https://github.com/Joehl1103/counter-strike-facsimile). Native GitHub integration was verified in the Linear desktop app and the repository was linked to Jkhl1103-Personal (JKH) with one-way issue creation from GitHub to Linear. Existing Linear issues are not exported to GitHub by this setting. GitHub code access is enabled for the account connection, and this exact repository appeared in the available list.

The new repository is public and was empty when inspected. A separate local clone is prepared at `/Users/josephshomefolder/development/games/counter-strike-facsimile`, with its origin pointing to the new URL. README and `.linear/project.json` provide project/plan/method references; `.linear/project.json` is descriptive metadata, not credentials or an automatic dispatcher. GitHub description and homepage now link to Linear.

Initial content publication is pending Joseph's choice between a current game snapshot without history, documents only, or migration with existing history. No commit or code push has been made. The original private repository checkout at `/Users/josephshomefolder/development/games/counter-strike`, its origin, dirty work and worktrees remain in place. The prior branch evidence remains tied to that original checkout until migration is completed.

Reconciled 2026-09-16 from local source plans and branch reports. This is the product backlog for **Dustline Tactical FPS**, a local browser-based Counter-Strike 1.6 facsimile. Agent collaboration is the execution method, not the product.

## Decision and outcome

Deliver one recreated Dust II local match: the player plus four allies against five enemies. Preserve the current Three/React/Vinext architecture and Sites identity, CT/T labels and Dustline wrapper. Use the documented approximation oracle because original installations/recordings are unavailable; do not claim measured equivalence to the original game.

The source scope remains `CODEX_PLAN_CS16_FACSIMILE.md`; `FACTORY_METHOD.md` governs execution and evidence. This document reconciles newer evidence and provides the Linear epics/issues. Joseph's 2026-09-16 direction permits independent issue agents in separate worktrees when scoped implementation is launched. Publishing or updating this plan does not restart paused implementation, launch workers, merge branches or deploy.

## Product boundary

- Firearms: AK-47, M4A1, AWP, MP5, M3, Glock 18, USP, P228, Desert Eagle, Elite and Five-SeveN.
- Equipment: knife, HE, smoke, flash, armor, helmet, defuse kit and C4.
- Map: T/CT spawns, long, short, mid, doors, upper/lower tunnels, A/B, cover and route-critical heights.
- Systems: 100 Hz simulation, interpolated rendering, height-aware movement, shared combat/economy, grounded bots with bounded perception, full match lifecycle, classic HUD/menu and licensed/recreated audio.
- Match preset: first to 16, 15-round halves, MR3 overtime; 105-second rounds, 5-second freeze, 15-second buy and 35-second bomb. These are project settings, not assertions of universal vanilla defaults.
- Excluded: other maps, full extra arsenal, shield, hostages, online multiplayer and deployment. No original game art/audio/models/maps are imported or redistributed.

## Analysis of current progress

| Area | Evidence and actual status | Planning consequence |
| --- | --- | --- |
| Movement/combat/bots/rounds | P1–P4 have historical engineering acceptance. | Reuse and verify on the common candidate; do not rebuild from zero. |
| Main development checkout | `cf2a282` plus substantial uncommitted source/assets and maintenance. | Establish a complete integration inventory before combining work. |
| Maintenance | Cleanup report records removed unused UI and validator/static-check fixes, still local and mixed with product work. | Isolate the maintenance change set without dropping inherited work. |
| M4 | Joseph explicitly approved its appearance on 2026-09-15. | Preserve it as the quality reference; older M4 restyling demands are superseded. |
| Glock | `b879537` is accepted in an isolated branch; report records two independent rounds. | Integrate shared M4/runtime/tool prerequisites first. Snapshot `98b50c96` is not a standalone Glock patch. Repeat integrated checks. |
| Characters | `4fc4f62` has a qualified native rifle-hold/resource pilot at 11,981 triangles and two material draws. | Walking, further actions, T appearance and game integration are still open. Do not restore rejected primitive/Vanguard visuals. |
| Walking source | Current targeted Downloads scan found Rifle Aiming Idle and Ch35_nonPBR FBXs, no walking FBX. | Record the exact source dependency; reacquire through a permitted path. Absence in this folder does not prove absence everywhere. |
| Skeleton sampling | `96bd93f` has a narrow fix and distinguishing regression; old baseline and candidate both failed the 0.5 ms benchmark. | Reconcile on current baseline, investigate the unchanged timing gate and run actual-game smoke; articulation is not planted-foot acceptance. |
| Map | Topology/navigation retained; user reported improvement. | Complete remaining architecture/art and recheck routes/cover after changes. |
| Other weapons / full game | Other firearm visuals and full character/package acceptance remain incomplete. | Separate remaining weapon tasks and keep final game acceptance open. |

The September 16 cleanup report verified GitHub access and main at `0e99b59` at that time. Older “GitHub unavailable,” “Mixamo signed out,” and “incomplete hold FBX” notes are not carried forward as active blockers; recheck actual access only when execution needs it. Current local branch refs were inspected for this plan. No fresh gameplay tests, build or user visual review were performed while publishing it.

## Epics and execution order

The backlog contains **7 epics and 37 child issues**. Epics are parent issues labelled Epic; their deliverables are sub-issues. This preserves the requested epic → issue hierarchy inside one project.

| Epic | Child issues | Source coverage |
| --- | ---: | --- |
| 1. Establish one reproducible Counter-Strike baseline | 4 | P0; branch-cleanup report; repo-cleanup report |
| 2. Verify movement, combat and the complete 5v5 match | 6 | P1; P3; P4 |
| 3. Finish the recognizable Dust II environment | 3 | P2; P7a |
| 4. Deliver recognizable CT/T characters with grounded motion | 5 | P5; P7b; current character report |
| 5. Complete the first-person arsenal and held equipment | 12 | P3; P5; P7c; Glock result |
| 6. Finish classic menus, HUD and sound | 3 | P5; P7a |
| 7. Verify and accept the complete playable game | 4 | P6; FACTORY_METHOD final gates |

Start with the integration manifest and the walking-source task. The latter carries a Blocked label because the required clip is not available in the inspected location. Integration and nonvisual verification can proceed once prerequisites are met. The source scan is evidence for the handoff, not a claim that agents have been launched.

The dependency graph records shared prerequisites and integration gates. After the shared runtime and accepted Glock establish the common asset/interface baseline, the remaining firearm and equipment issues may proceed independently in separate worktrees. Their earlier weapon-by-weapon ordering is removed. The world-weapon integration issue waits for the complete first-person set and character runtime so parallel completion cannot bypass full-arsenal verification. Character, map and other ready work may also proceed concurrently when dependencies and ownership permit.

There is no fixed two-builder limit. Size each wave to the available platform slots, independent issue scopes and review capacity. Every worker must advance a named epic and record its issue, session, worktree/branch/base revision, owned files, interfaces, reviewer and evidence directory before editing. Shared viewmodel registries and runtime files have one owner; workers isolate asset/module changes, and the coordinator sequences common-code edits and integration. Each issue can have its own frozen visual candidate. Epic and final game acceptance use one frozen integrated candidate, independent verification and coordinator evaluation before results are reported to Joseph. This replaces the earlier global single-visual-candidate constraint without changing the quality gates.

Current ready issues are Todo; dependent work and epics are Backlog. No product issue is marked Done merely because an isolated branch or old plan passed. Unclaimed work remains unassigned; Joseph is the project lead. No dates, effort estimates or automatic agent identities are fabricated.

## Completion gates and risks

- Freeze references, exact candidate/source hashes, reproducible routes/seeds/settings, metrics and thresholds before editing.
- Preserve source licences/provenance and qualify complete compatible assemblies. Source inspection, renderer qualification, runtime checks and user approval are separate.
- Maintain character ceilings of 12,000 triangles/two material draws and per-asset frozen cards. The accepted Glock has six material primitives, seven draw proxies with flash, and 6,175 asset triangles; obsolete primitive-model limits must not be reapplied.
- High scene caps: 150 visible draw proxies, 180,000 triangles, 64 textures, 96 MiB decoded textures, two lights, one shadow caster, 2048 shadow map. Performance caps: 90/130,000/40/64 MiB/two lights/no shadows. These are scene snapshots, not FPS evidence.
- Separately measure documented 1080p60 runtime performance and the unchanged ≤0.5 ms movement benchmark with hardware/noise conditions. Do not relax failed thresholds or attribute noise without paired evidence.
- Final review uses one immutable integrated candidate, appropriate full regression/lint/typecheck/build/asset checks, two independent normal-speed full-round reviewers covering both teams, coordinator inspection and Joseph's explicit complete-product visual acceptance.
- Biggest risks: losing uncommitted work during integration, treating isolated acceptance as full-game proof, incompatible source assemblies, and improving individual assets while exceeding full 5v5 budgets. Each has explicit issues/gates below.
- Original-source equivalence remains unverified; the acceptance oracle is the documented approximation.

## Source snapshot

Paths are local to `/Users/josephshomefolder/development/games/counter-strike`. Some are untracked or ignored; no remote URL is asserted for unpublished content. The plan is self-contained for scope and criteria; workers must verify the source files/evidence exist before execution. Historical ignored output may need transfer to another machine.

- `CODEX_PLAN_CS16_FACSIMILE.md` — SHA-256 `855b130fd05aa9f7724cf62199790d86acaadf80c6d5e0d15038a28f486eb3b4`
- `FACTORY_METHOD.md` — SHA-256 `7ef105f7c31429c903908a1cf4df96fe95664947a74a662d48dc1ff7295e695a`
- `CODEX_PLAN_TOOL_REUSE.md` — SHA-256 `d49f81cf415eab84665ef73e3c5b6a508926f7b1298f21aee9719269f69fc215`
- `HANDOFF_CS16.md` — SHA-256 `bc7cecbded7b3657d0cc955e2932dc912bb40b3aefd46c9c5afaa488d2b1d0e9`
- `PROJECT_MEMORY.md` — SHA-256 `e73c319ab1a5d3d1000a2edddfc3b1c9772fe73d640521764987d1e2e83b1199`
- `outputs/branch-cleanup-2026-09-16/REPORT.md` — SHA-256 `5f7e1e30253eb0035a400c08576009c6432f1972368b104445da8126a034e630`
- `outputs/repo-cleanup-2026-09-16/REPORT.md` — SHA-256 `3d9514aa45249a442588d47a668795a843ac47f1d12d938389c39f4f4f43b76d`
- `.worktrees/glock-reference/GLOCK_REFERENCE_RESULT.md` — SHA-256 `de73b7a10644d096e824c48fe87db6fb34518b8594173a59f66ef4c2b1093be3`
- `.worktrees/character-grounded-motion/outputs/character-grounded-motion/REPORT.md` — SHA-256 `9570f2053759d5b3035e15a997518e2172a81662f30b5ee87ed626e4e23add79`
- `.worktrees/character-sampling-main/SAMPLING_MAIN_RESULT.md` — SHA-256 `c7539d97b9281613a64e739ed6e27d905e99fb818fad1771783c7ed19a293265`
- `app/graphics-budget.ts` — SHA-256 `ddca33eeee7b7ed67e986a372f84ffec5eef5c8cea4eedd2a74ea0380b5baf70`

## Issue definitions

All issues use the execution-method claim/handoff template. Each must retain a frozen acceptance card, exact evidence and review verdict. Detailed issue scope follows; Linear identifiers/links are appended after publishing.

### Epic 1: Establish one reproducible Counter-Strike baseline

Reconcile the dirty development checkout, maintenance, shared runtime and isolated fixes into a documented candidate without losing approved work. Historical branch checks are inputs, not integrated acceptance.

#### Record the integration baseline and preserve approved M4

Key: `baseline_manifest`. Initial state: Todo. Priority: High. Dependencies: None.

Inventory current refs, uncommitted sources, asset hashes and prior evidence; separate product work from maintenance. Freeze the approved M4 images/assets and document the integration sequence.

- [ ] Record cf2a282 development checkout, b879537 Glock, 4fc4f62 character, 96bd93f sampling and current main; recheck refs at execution.
- [ ] List every prerequisite carried by Glock snapshot 98b50c96; do not treat that snapshot as a standalone Glock patch.
- [ ] Create a source/asset/license and acceptance manifest; preserve the approved M4 and existing gameplay/map evidence.

Source: CODEX_PLAN_CS16_FACSIMILE.md; outputs/branch-cleanup-2026-09-16/REPORT.md; PROJECT_MEMORY.md.

#### Isolate the completed repository maintenance changes

Key: `baseline_maintenance`. Initial state: Backlog. Priority: Medium. Dependencies: `baseline_manifest`.

Separate the local unused-UI cleanup and glTF validator/typecheck corrections from inherited gameplay and asset work. The cleanup report is historical and the current checkout is dirty.

- [ ] Produce a reviewable maintenance-only change inventory; retain all unrelated source work.
- [ ] Verify retained imports and the positional validator CLI contract; preserve its relevant regression coverage.
- [ ] Run only the applicable static/build/regression checks on the resulting candidate; record exact revision and results.

Source: outputs/repo-cleanup-2026-09-16/REPORT.md; package.json; tsconfig.check.json; scripts/; tests/validate-gltf-cli.test.ts.

#### Integrate shared runtime, M4 and visual-tool prerequisites

Key: `baseline_shared`. Initial state: Backlog. Priority: High. Dependencies: `baseline_manifest`, `baseline_maintenance`.

Bring the existing facsimile gameplay, approved M4 adapter and reusable visual tooling into a coherent baseline. Reuse existing implementations; isolate required changes from rejected visual experiments.

- [ ] Record a complete source/asset dependency closure for authored M4, renderer and visual tools.
- [ ] Show the M4 appearance remains consistent with its approved baseline in the actual game.
- [ ] Preserve Dust II, fixed-step simulation and match behavior; record a runnable candidate and scoped checks without absorbing unrelated experiments.

Source: app/page.tsx; app/authored-carbine-viewmodel.ts; visual-tools/README.md; CODEX_PLAN_VISUAL_TOOLKIT.md; .worktrees/glock-reference/GLOCK_REFERENCE_RESULT.md.

#### Validate and integrate the visible-skeleton sampling fix

Key: `baseline_sampling`. Initial state: Backlog. Priority: High. Dependencies: `baseline_shared`.

Reconcile the narrow 96bd93f fix against the chosen current baseline. Its regression distinguishes frozen legs from animation; the old benchmark failure remains unresolved and must not be hidden.

- [ ] Show the corrected regression fails on the frozen-skeleton control and passes for both team loops.
- [ ] Observe all nine living bots articulating in an actual-game smoke test on the integrated revision.
- [ ] Run the unchanged 0.5 ms benchmark gate under recorded conditions; investigate any failure with paired baseline/candidate evidence and do not relax thresholds or claim foot-contact acceptance.

Source: .worktrees/character-sampling-main/SAMPLING_MAIN_RESULT.md; app/page.tsx; tests/movement-presentation-performance.test.ts.

### Epic 2: Verify movement, combat and the complete 5v5 match

Preserve the implemented P1–P4 foundation, verify it on the common candidate and repair only demonstrated gaps. Target a documented CS1.6 approximation.

#### Verify fixed-step movement and height-aware collision

Key: `gameplay_movement`. Initial state: Backlog. Priority: High. Dependencies: `baseline_shared`.

Exercise the existing 100 Hz simulation, input accumulation and interpolated rendering across Dust II routes.

- [ ] Compare the same recorded route at 30/60/144 render rates with the frozen movement tolerances.
- [ ] Cover ramps, stairs, ceiling contact, jumps, crouch clearance, fall damage and weapon-dependent movement speed.
- [ ] Player and bot ground queries agree; fix demonstrated gaps without replacing the established units/clock architecture.

Source: app/fixed-movement-clock.ts; app/simulation-clock.ts; app/player-input.ts; app/player-physics.ts; app/player-collision.ts; CODEX_PLAN_CS16_FACSIMILE.md P1/P4.

#### Verify all firearm rules and special fire states

Key: `gameplay_firearms`. Initial state: Backlog. Priority: High. Dependencies: `baseline_shared`.

Check existing data-driven weapon behavior independently of visual replacement.

- [ ] Cover all 11 required firearms: ammo, fire cadence, reload/equip, recoil, accuracy and moving/crouching/airborne behavior.
- [ ] Exercise Glock burst, USP/M4 silencers, AWP scope and M3 per-shell reload without state leaks.
- [ ] Demonstrate range falloff, armor, hit zones and material penetration using paired tests and runtime scenarios; retain project approximation labels.

Source: app/weapon-ballistics.ts; app/weapon-special-actions.ts; app/weapon-penetration.ts; app/combat-damage.ts; CODEX_PLAN_CS16_FACSIMILE.md P3.

#### Verify knife, grenades, armor and bomb equipment

Key: `gameplay_equipment`. Initial state: Backlog. Priority: Medium. Dependencies: `baseline_shared`.

Validate equipment behavior and shared combat consequences separately from their viewmodels.

- [ ] Knife primary/secondary attacks, HE damage, smoke occlusion and flash duration/orientation behave to frozen cards.
- [ ] Grenade trajectory/collision, explosion occlusion and player/bot effects use the actual map geometry.
- [ ] Armor/helmet/defuse-kit/C4 rules are coherent across purchase, inventory, death/drop, planting and defusing.

Source: app/grenade-effects.ts; app/combat-damage.ts; app/game-rules.ts; app/bot-utility.ts.

#### Verify buying, inventory and round economy

Key: `gameplay_economy`. Initial state: Backlog. Priority: Medium. Dependencies: `baseline_shared`.

Retain the existing economy and make its full round-to-round behavior demonstrable.

- [ ] Check team eligibility, buy zones/time, equipment limits, ammo purchase and insufficient-money feedback.
- [ ] Verify death/drop/pickup, retained equipment and win/loss/kill/objective rewards.
- [ ] Player and bot money/inventory obey the same rules across round reset, halftime and overtime; repair only documented failures.

Source: app/game-rules.ts; app/bot-economy.ts; app/page.tsx; CODEX_PLAN_CS16_FACSIMILE.md P3/P4.

#### Verify grounded bots, fair perception and objective roles

Key: `gameplay_bots`. Initial state: Backlog. Priority: High. Dependencies: `gameplay_movement`, `gameplay_firearms`, `gameplay_equipment`, `gameplay_economy`.

Verify the local match has player + four allies versus five enemies, sharing gameplay rules and navigating Dust II.

- [ ] Exercise sight, hearing, smoke/flash and remembered objective information without unexplained omniscience.
- [ ] Show bots buy, reload, scope/burst/silence, use utilities and respect damage/penetration under shared rules.
- [ ] Observe route traversal, grounded hull motion, planting/defusing and support roles; document difficulty reaction/aim and the existing bounded burst allowance.

Source: app/bot-*.ts; app/dust2-map.ts; tests/team-population.test.ts; CODEX_PLAN_CS16_FACSIMILE.md P4.

#### Verify round endings, halftime and overtime end to end

Key: `gameplay_match`. Initial state: Backlog. Priority: High. Dependencies: `gameplay_bots`.

Validate one complete local match with the existing project preset, keeping accelerated state checks separate from real-time play evidence.

- [ ] Verify first-to-16, 15-round halves, MR3 overtime, 105s rounds, 5s freeze, 15s buy and 35s bomb as project presets.
- [ ] Exercise elimination, timer, plant/explosion, defuse, side swap, scores, money/equipment reset and final match result.
- [ ] Record deterministic state-transition coverage plus real runtime receipts; no stuck round, missing player, or premature result.

Source: app/game-rules.ts; app/match-lifecycle-qa.ts; tests/match-lifecycle-qa.test.ts; CODEX_PLAN_CS16_FACSIMILE.md P4s/P6.

### Epic 3: Finish the recognizable Dust II environment

Retain the improved topology and complete the visible architecture while ensuring cover and portals agree with collision, shots and bot navigation.

#### Reconcile Dust II routes, portals and shot-blocking cover

Key: `map_geometry`. Initial state: Backlog. Priority: High. Dependencies: `baseline_shared`.

Inspect the shared map definition and correct demonstrated differences among visible solid architecture, collision, bullets and navigation.

- [ ] Cover T/CT spawns, long, short, mid, doors, upper/lower tunnels, A/B and route-critical heights.
- [ ] Solid portal masonry and cover block movement/shots as intended; doorway clearances and bot paths remain usable.
- [ ] Record reproducible traversal and line-of-fire checks for all seven planned route views.

Source: app/dust2-map.ts; app/dust2-architecture.ts; tests/dust2-map.test.ts; CODEX_PLAN_CS16_FACSIMILE.md P2/P7a.

#### Complete Dust II doors, cover, masonry and ground treatment

Key: `map_art`. Initial state: Backlog. Priority: Medium. Dependencies: `map_geometry`.

Finish the map's existing CS1.6-inspired art direction using recreated assets with traceable provenance.

- [ ] Mid/long/B wooden doors have framed/braced leaves and masonry portals; crates and site cover are legible.
- [ ] Wall base/parapet/window relief follows actual architecture, with mixed dusty and paved ground and no obvious texture stretching.
- [ ] Compare all seven views at 1280×720 under fixed settings; retain progress and show measurable visible improvement within scene budgets.

Source: app/dust2-architecture.ts; app/dust2-map.ts; CODEX_PLAN_CS16_FACSIMILE.md P7a.

#### Validate final Dust II routes and visual coverage for both sides

Key: `map_acceptance`. Initial state: Backlog. Priority: Medium. Dependencies: `map_art`, `gameplay_movement`.

Close the environment package on the candidate used for gameplay rather than isolated screenshots.

- [ ] Inspect the seven reference views plus CT and T runtime routes with original captures.
- [ ] Recheck nav, movement and bullet collision after art changes.
- [ ] Record high/performance budget snapshots and an explicit map verdict, preserving failures and remaining defects.

Source: CODEX_PLAN_CS16_FACSIMILE.md P2/P7a; app/graphics-budget.ts; visual-tools/README.md.

### Epic 4: Deliver recognizable CT/T characters with grounded motion

Build on the qualified native hold/resource pilot. Full locomotion, crouch/death, faction appearance and game integration remain unaccepted.

#### Acquire and qualify the same-rig rifle-walking source

Key: `character_source`. Initial state: Todo. Priority: High. Dependencies: None.

Obtain the complete native walking clip for the already qualified Gas Mask/65-bone assembly through a permitted source path. This is the current source dependency, not the obsolete incomplete-hold or sign-in blocker.

- [ ] Preserve the original source and record license, hash, rig compatibility and download settings.
- [ ] Reference handoff: Walking/Walking While Aiming Rifle, 42 frames, Stance100 Speed50 Overdrive50 Arm-Space50, mirror off, In Place off; FBX Binary Without Skin 30fps no reduction.
- [ ] Inspect the complete imported clip with the existing native rig and weapon mount; do not synthesize missing locomotion or revive rejected Vanguard repairs.

Source: .worktrees/character-grounded-motion/outputs/character-grounded-motion/REPORT.md; CODEX_PLAN_TOOL_REUSE.md.

#### Qualify grounded locomotion on the native character assembly

Key: `character_locomotion`. Initial state: Backlog. Priority: High. Dependencies: `character_source`.

Use the corrected 11,981-triangle, two-draw hold asset as the baseline and prove compatible locomotion before production integration.

- [ ] Freeze stride, support-foot contact, floor penetration, pose-transition and grip thresholds before editing; verify the baseline detects defects.
- [ ] Show representative walking/running and direction/stop transitions with actual production M4 contact in the renderer.
- [ ] Retain coherent rest frames, units, weights, textures and rig; meet ≤12,000 character triangles and ≤2 material draws without degrading the qualified hold.

Source: .worktrees/character-grounded-motion/outputs/character-grounded-motion/REPORT.md; FACTORY_METHOD.md.

#### Qualify crouch, death and movement-state transitions

Key: `character_actions`. Initial state: Backlog. Priority: High. Dependencies: `character_locomotion`.

Extend the coherent source assembly to the remaining required actions with standard tooling and reproducible conversion.

- [ ] Show idle/run/crouch/death, including transitions, from relevant views with no gross foot skating, floor penetration or broken limbs.
- [ ] Weapon contact and release/drop align with action state; collision/hit proxies remain compatible.
- [ ] Retain source files and failed captures; validate resource ceilings and the native source-to-runtime correspondence.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7b; app/character-motion.ts; app/character-rig.ts; visual-tools/README.md.

#### Qualify distinct CT and T faction appearance

Key: `character_factions`. Initial state: Backlog. Priority: High. Dependencies: `character_locomotion`.

Preserve the navy-cloth gas-mask CT direction and qualify a coherent olive/brown T counterpart, using reuse/adapt/custom selection before building.

- [ ] Both factions read as human CS1.6-style operators at gameplay distances: CT navy cloth/vest/helmet/gas mask, T olive/brown cloth.
- [ ] Inspect full bodies, hands and representative motions in the actual renderer; no shared sci-fi/primitive fallback.
- [ ] Document source licenses and compatible mesh/rig/clip assembly; each character remains within the frozen resource ceilings.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7b; CODEX_PLAN_TOOL_REUSE.md; .worktrees/character-grounded-motion/outputs/character-grounded-motion/REPORT.md.

#### Integrate and verify all nine animated CT/T bots

Key: `character_runtime`. Initial state: Backlog. Priority: High. Dependencies: `baseline_sampling`, `character_actions`, `character_factions`.

Replace the rejected character path with qualified faction assemblies in the live match, preserving shared gameplay and retiring obsolete fallback code.

- [ ] All nine living bots animate correctly for both teams; ground, grip, crouch/death and hit proxies remain aligned.
- [ ] Observe characters during actual movement and combat on slopes/stairs and open routes, with original real-time evidence.
- [ ] Verify scene-wide high/performance budgets and record full character verdict; isolated source qualification does not count as game acceptance.

Source: app/page.tsx; app/skinned-character-visuals.ts; app/character-rig.ts; app/character-motion.ts; app/graphics-budget.ts.

### Epic 5: Complete the first-person arsenal and held equipment

Preserve the approved M4, integrate the accepted isolated Glock, then qualify the remaining weapons as coherent hand/gun/animation assemblies.

#### Integrate the accepted Glock and hands on the common baseline

Key: `weapon_glock`. Initial state: Backlog. Priority: High. Dependencies: `baseline_shared`.

Bring in the isolated b879537 Glock result after its shared prerequisites. Preserve the source-paired Idle/Fire/Reload/Equip clips and user-approved M4.

- [ ] Trace the Glock asset to SHA-256 49c61e2b0b4f3bf1804925a3959e6c3b49adc05b6595130ce989fa6b819ee2d4 and its source manifest.
- [ ] Preserve the qualified 6 material primitives (7 draw proxies with muzzle flash), 6,175 asset triangles and source-derived muzzle/ejection sockets; do not apply obsolete primitive ceilings.
- [ ] Repeat action/framing and gameplay smoke checks on the integrated revision, including 16:9 and 4:3; maintain M4 evidence and scene budgets.

Source: .worktrees/glock-reference/GLOCK_REFERENCE_RESULT.md; .worktrees/glock-reference/assets/source/glock-reference/README.md; app/authored-pistol-viewmodel.ts.

#### Qualify and integrate an AK-47 hand/gun/animation assembly

Key: `weapon_ak`. Initial state: Backlog. Priority: High. Dependencies: `weapon_glock`.

Use the approved M4 and accepted Glock as quality references. Replace the rejected AK outcome through a bounded coherent-source pilot.

- [ ] Choose reuse/adaptation/custom from at most three credible sources or a 30-minute source search, documenting license and compatibility.
- [ ] Show AK silhouette, material treatment, actual two-hand contact and equip/idle/fire/reload in offline and actual-renderer review.
- [ ] Integrate only after the pilot qualifies; verify sockets, action timing, 16:9/4:3 framing and frozen scene/per-asset budgets.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; CODEX_PLAN_TOOL_REUSE.md; app/authored-rifle-viewmodel.ts; app/primary-weapon-models.ts.

#### Qualify the USP and its silencer action

Key: `weapon_usp`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Produce a coherent USP, hands and authored actions using the established qualified asset path.

- [ ] Inspect recognizable silhouette/materials, hand contact and equip/idle/fire/reload in the actual renderer.
- [ ] Silencer on/off action, muzzle socket and visible state agree with gameplay timing.
- [ ] Pass paired 16:9/4:3 visual and action checks without regressing M4/Glock or scene budgets; retire replaced visual paths.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/secondary-weapon-models.ts; app/weapon-special-actions.ts.

#### Qualify the AWP and scoped presentation

Key: `weapon_awp`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Adapt a complete AWP/hands/action assembly within the existing viewmodel architecture.

- [ ] Show readable AWP proportions and stable hand contact through equip/idle/fire/reload.
- [ ] Scope enter/exit and firing state remain synchronized with field of view, visibility and gameplay rules.
- [ ] Pass paired 16:9/4:3 framing, socket/action and resource checks on the actual game.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/primary-weapon-models.ts; app/weapon-special-actions.ts.

#### Qualify the MP5 viewmodel and actions

Key: `weapon_mp5`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Qualify a coherent MP5/hands/action assembly against the established visual target.

- [ ] Verify MP5 silhouette, painted low-poly material direction and actual hand contact.
- [ ] Inspect equip/idle/fire/reload with correct magazine/bolt, muzzle/ejection placement and gameplay timing.
- [ ] Pass paired actual-renderer 16:9/4:3 framing and resource checks; preserve approved weapons.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/primary-weapon-models.ts.

#### Qualify the M3 and per-shell reload presentation

Key: `weapon_m3`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Qualify a coherent shotgun/hands assembly including pump and shell-loading actions.

- [ ] Verify recognizable M3, support-hand contact, recoil/pump and muzzle/ejection behavior.
- [ ] Per-shell reload start/loop/end and interruption remain synchronized with ammo and firing.
- [ ] Pass actual-game action/framing checks at 16:9/4:3 and the frozen resource budgets.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/primary-weapon-models.ts; app/weapon-special-actions.ts.

#### Qualify the P228 viewmodel and actions

Key: `weapon_p228`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Adapt a coherent P228/hands/action assembly using the qualified pipeline.

- [ ] Verify distinctive P228 silhouette, materials and palm/finger contact.
- [ ] Inspect equip/idle/fire/reload and source-derived muzzle/ejection positions against gameplay state.
- [ ] Record actual-renderer 16:9/4:3 comparisons, resource checks and the visual verdict.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/secondary-weapon-models.ts.

#### Qualify the Desert Eagle viewmodel and actions

Key: `weapon_deagle`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Adapt a coherent Desert Eagle/hands/action assembly using the qualified pipeline.

- [ ] Verify distinctive large-frame silhouette, materials, grip and recoil without broken hand contact.
- [ ] Inspect equip/idle/fire/reload and muzzle/ejection positions against gameplay state.
- [ ] Record actual-renderer 16:9/4:3 comparisons, resource checks and the visual verdict.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/secondary-weapon-models.ts.

#### Qualify the Elite dual-pistol viewmodel and actions

Key: `weapon_elite`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Qualify paired pistols and two-hand animations as one coherent assembly.

- [ ] Both pistols read clearly with stable independent hand contact and consistent visual quality.
- [ ] Alternating fire, equip and reload agree with ammo/state and each weapon's muzzle/ejection positions.
- [ ] Record actual-renderer 16:9/4:3 comparisons and resource checks covering the full dual assembly.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/secondary-weapon-models.ts.

#### Qualify the Five-SeveN viewmodel and actions

Key: `weapon_fiveseven`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Adapt a coherent Five-SeveN/hands/action assembly using the qualified pipeline.

- [ ] Verify Five-SeveN silhouette, materials and actual hand contact.
- [ ] Inspect equip/idle/fire/reload and source-derived muzzle/ejection positions against gameplay state.
- [ ] Record actual-renderer 16:9/4:3 comparisons, resource checks and the visual verdict.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/secondary-weapon-models.ts.

#### Qualify knife, grenade and C4 first-person presentation

Key: `weapon_equipment`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`.

Complete the visible equipment set with coherent hands and actions; armor/helmet/kit remain inventory/HUD items.

- [ ] Knife primary/secondary, grenade equip/throw and C4 carry/plant actions read clearly and agree with gameplay timing.
- [ ] HE/smoke/flash and C4 are distinguishable; contact, clipping and transitions meet frozen cards.
- [ ] Record 16:9/4:3 game captures, provenance and resource checks; all approved firearms remain unchanged.

Source: CODEX_PLAN_CS16_FACSIMILE.md P7c; app/equipment-viewmodel-visuals.ts.

#### Reconcile bot-held and dropped weapons with the full arsenal

Key: `weapon_world`. Initial state: Backlog. Priority: Medium. Dependencies: `weapon_glock`, `weapon_ak`, `weapon_usp`, `weapon_awp`, `weapon_mp5`, `weapon_m3`, `weapon_p228`, `weapon_deagle`, `weapon_elite`, `weapon_fiveseven`, `weapon_equipment`, `character_runtime`.

Complete the world-space weapon set and verify its compatibility with qualified characters and inventory.

- [ ] Every required weapon/equipment item has a coherent held/dropped representation and correct identity.
- [ ] Bot hands contact held guns through required actions; death/drop/pickup and muzzle placement agree with gameplay.
- [ ] Validate batching, hit/interaction placement and full 5v5 scene budgets; record the complete arsenal matrix including unchanged approved M4.

Source: app/primary-weapon-models.ts; app/secondary-weapon-models.ts; app/equipment-viewmodel-visuals.ts; tests/world-firearm-batching.test.ts.

### Epic 6: Finish classic menus, HUD and sound

Preserve the Dustline wrapper while completing the readable CS1.6-inspired presentation and licensed/recreated audio.

#### Verify the classic HUD, radar and numbered buy menu

Key: `presentation_hud`. Initial state: Backlog. Priority: Medium. Dependencies: `baseline_shared`, `gameplay_economy`.

Complete the compact amber/green match interface against the active plan.

- [ ] Health, armor, ammo, money, timer, scores, team/objective state and buy options stay synchronized with runtime state.
- [ ] Numbered buy menu and keyboard input are usable at 16:9 and 4:3.
- [ ] Remove hit confirmation and enemy-spot radar; verify no forbidden indicators survive normal combat or spectator/death states.

Source: app/classic-hud.ts; app/page.tsx; app/globals.css; CODEX_PLAN_CS16_FACSIMILE.md P5.

#### Finish the compact Dustline menu and match flow

Key: `presentation_menu`. Initial state: Backlog. Priority: Medium. Dependencies: `baseline_shared`.

Retain the product/site identity and use a compact menu consistent with the recreated Dust II game.

- [ ] Remove CLASSIFIED/SECTOR-style decoration; preserve the Dustline title and CT/T labels.
- [ ] Start/settings/team selection, briefing, pause and result/restart flow remain coherent and keyboard usable.
- [ ] Inspect representative 16:9/4:3 screenshots and runtime transitions; no unrelated site redesign or deployment.

Source: app/page.tsx; app/globals.css; CODEX_PLAN_CS16_FACSIMILE.md P7a.

#### Audit provenance and complete combat and objective audio

Key: `presentation_audio`. Initial state: Backlog. Priority: Medium. Dependencies: `gameplay_firearms`, `gameplay_equipment`, `gameplay_match`.

Complete or verify the existing audio against player-visible actions; use licensed or original recordings/recreations.

- [ ] Record exact source/license for delivered samples; no imported original Counter-Strike art or audio.
- [ ] Verify weapon/action, footsteps, impacts, grenades, plant/defuse and round/result cues are correctly triggered and spatialized where applicable.
- [ ] Check rapid actions, pause/restart and full-round sound without duplicate/stuck events; preserve numeric gameplay timing.

Source: app/classic-interaction-audio.ts; app/classic-usp-audio.ts; CODEX_PLAN_CS16_FACSIMILE.md P5.

### Epic 7: Verify and accept the complete playable game

Freeze one integrated candidate, prove behavior/performance, obtain independent real-time review, and record Joseph's explicit visual acceptance.

#### Freeze the complete candidate and acceptance evidence manifest

Key: `acceptance_candidate`. Initial state: Backlog. Priority: High. Dependencies: `baseline_sampling`, `gameplay_match`, `map_acceptance`, `character_runtime`, `weapon_world`, `presentation_hud`, `presentation_menu`, `presentation_audio`.

Create a single immutable candidate containing all required scope and a traceable evidence entry point.

- [ ] Inventory the exact source revision, asset hashes, licenses, settings/seeds and issue-to-evidence links.
- [ ] Resolve or explicitly record every product acceptance gap; no historical branch pass counts as integrated proof.
- [ ] Capture all 11 firearms, equipment, both factions, seven map views and match rules in the acceptance matrix; source changes invalidate affected reviews.

Source: CODEX_PLAN_CS16_FACSIMILE.md P6; FACTORY_METHOD.md; all epic exit evidence.

#### Pass regression, resource and runtime performance gates

Key: `acceptance_checks`. Initial state: Backlog. Priority: High. Dependencies: `acceptance_candidate`.

Run the required automated checks and measure the frozen game under documented conditions.

- [ ] Pass relevant full regression suite, lint, typecheck, build and asset validation on the exact candidate.
- [ ] High: ≤150 visible draw proxies/180k triangles/64 textures/96 MiB/2 lights/1 shadow caster/2048 map; performance: ≤90/130k/40/64 MiB/2 lights/0 shadows.
- [ ] Capture play-start and round-prepared snapshots identifying actual equipped viewmodels with nonzero geometry; separately measure the documented 1080p60 target and unchanged 0.5 ms movement benchmark with hardware/noise conditions.

Source: FACTORY_METHOD.md; app/graphics-budget.ts; tests/movement-presentation-performance.test.ts; CODEX_PLAN_CS16_FACSIMILE.md P6.

#### Run two independent real-time CT/T acceptance reviews

Key: `acceptance_review`. Initial state: Backlog. Priority: High. Dependencies: `acceptance_checks`.

Have two fresh reviewers inspect the same immutable game candidate independently, followed by coordinator inspection.

- [ ] Each reviewer plays a normal-speed full round from briefing through result; collectively cover CT and T, living characters, movement and firing.
- [ ] Reviewers retain original screenshots/DOM and evidence manifests, do not consult each other's verdicts, and distinguish source/render/gameplay evidence.
- [ ] Record accepted/improved-but-failing/unchanged/regressed/unverified/blocked verdicts with failures retained; accelerated lifecycle tests cannot replace these rounds.

Source: FACTORY_METHOD.md final acceptance gates; CODEX_PLAN_CS16_FACSIMILE.md P6.

#### Record Joseph's visual verdict and final game handoff

Key: `acceptance_user`. Initial state: Backlog. Priority: High. Dependencies: `acceptance_review`.

Present the finished local candidate and concise evidence for explicit product acceptance, preserving any outstanding defects.

- [ ] Joseph explicitly accepts the full character, arsenal and map appearance; earlier M4-only approval does not count for the whole game.
- [ ] Deliver reproducible local run instructions, exact candidate/evidence links, licenses and a short known-limitations record.
- [ ] Mark the project complete only after every product criterion and review is met; preserve documented approximation status and keep deployment/multiplayer outside scope.

Source: FACTORY_METHOD.md; CODEX_PLAN_CS16_FACSIMILE.md; README.md.


## Published Linear hierarchy

[Counter-Strike 1.6 project](https://linear.app/jkhl1103-personal/project/counter-strike-16-7c7dc1369cb9) · [Product plan](https://linear.app/jkhl1103-personal/document/counter-strike-16-product-plan-and-epic-breakdown-d0e2622183ec) · [Execution method](https://linear.app/jkhl1103-personal/document/counter-strike-execution-method-and-task-template-3805da2924b6)

### [JKH-119 — Establish one reproducible Counter-Strike baseline](https://linear.app/jkhl1103-personal/issue/JKH-119/1-establish-one-reproducible-counter-strike-baseline)

- [JKH-126 — Record the integration baseline and preserve approved M4](https://linear.app/jkhl1103-personal/issue/JKH-126/record-the-integration-baseline-and-preserve-approved-m4) — Todo
- [JKH-127 — Isolate the completed repository maintenance changes](https://linear.app/jkhl1103-personal/issue/JKH-127/isolate-the-completed-repository-maintenance-changes)
- [JKH-128 — Integrate shared runtime, M4 and visual-tool prerequisites](https://linear.app/jkhl1103-personal/issue/JKH-128/integrate-shared-runtime-m4-and-visual-tool-prerequisites)
- [JKH-129 — Validate and integrate the visible-skeleton sampling fix](https://linear.app/jkhl1103-personal/issue/JKH-129/validate-and-integrate-the-visible-skeleton-sampling-fix)

### [JKH-120 — Verify movement, combat and the complete 5v5 match](https://linear.app/jkhl1103-personal/issue/JKH-120/2-verify-movement-combat-and-the-complete-5v5-match)

- [JKH-130 — Verify fixed-step movement and height-aware collision](https://linear.app/jkhl1103-personal/issue/JKH-130/verify-fixed-step-movement-and-height-aware-collision)
- [JKH-131 — Verify all firearm rules and special fire states](https://linear.app/jkhl1103-personal/issue/JKH-131/verify-all-firearm-rules-and-special-fire-states)
- [JKH-132 — Verify knife, grenades, armor and bomb equipment](https://linear.app/jkhl1103-personal/issue/JKH-132/verify-knife-grenades-armor-and-bomb-equipment)
- [JKH-133 — Verify buying, inventory and round economy](https://linear.app/jkhl1103-personal/issue/JKH-133/verify-buying-inventory-and-round-economy)
- [JKH-134 — Verify grounded bots, fair perception and objective roles](https://linear.app/jkhl1103-personal/issue/JKH-134/verify-grounded-bots-fair-perception-and-objective-roles)
- [JKH-135 — Verify round endings, halftime and overtime end to end](https://linear.app/jkhl1103-personal/issue/JKH-135/verify-round-endings-halftime-and-overtime-end-to-end)

### [JKH-121 — Finish the recognizable Dust II environment](https://linear.app/jkhl1103-personal/issue/JKH-121/3-finish-the-recognizable-dust-ii-environment)

- [JKH-136 — Reconcile Dust II routes, portals and shot-blocking cover](https://linear.app/jkhl1103-personal/issue/JKH-136/reconcile-dust-ii-routes-portals-and-shot-blocking-cover)
- [JKH-137 — Complete Dust II doors, cover, masonry and ground treatment](https://linear.app/jkhl1103-personal/issue/JKH-137/complete-dust-ii-doors-cover-masonry-and-ground-treatment)
- [JKH-138 — Validate final Dust II routes and visual coverage for both sides](https://linear.app/jkhl1103-personal/issue/JKH-138/validate-final-dust-ii-routes-and-visual-coverage-for-both-sides)

### [JKH-122 — Deliver recognizable CT/T characters with grounded motion](https://linear.app/jkhl1103-personal/issue/JKH-122/4-deliver-recognizable-ctt-characters-with-grounded-motion)

- [JKH-139 — Acquire and qualify the same-rig rifle-walking source](https://linear.app/jkhl1103-personal/issue/JKH-139/acquire-and-qualify-the-same-rig-rifle-walking-source) — Blocked: walking source required
- [JKH-140 — Qualify grounded locomotion on the native character assembly](https://linear.app/jkhl1103-personal/issue/JKH-140/qualify-grounded-locomotion-on-the-native-character-assembly)
- [JKH-141 — Qualify crouch, death and movement-state transitions](https://linear.app/jkhl1103-personal/issue/JKH-141/qualify-crouch-death-and-movement-state-transitions)
- [JKH-142 — Qualify distinct CT and T faction appearance](https://linear.app/jkhl1103-personal/issue/JKH-142/qualify-distinct-ct-and-t-faction-appearance)
- [JKH-143 — Integrate and verify all nine animated CT/T bots](https://linear.app/jkhl1103-personal/issue/JKH-143/integrate-and-verify-all-nine-animated-ctt-bots)

### [JKH-123 — Complete the first-person arsenal and held equipment](https://linear.app/jkhl1103-personal/issue/JKH-123/5-complete-the-first-person-arsenal-and-held-equipment)

- [JKH-144 — Integrate the accepted Glock and hands on the common baseline](https://linear.app/jkhl1103-personal/issue/JKH-144/integrate-the-accepted-glock-and-hands-on-the-common-baseline)
- [JKH-145 — Qualify and integrate an AK-47 hand/gun/animation assembly](https://linear.app/jkhl1103-personal/issue/JKH-145/qualify-and-integrate-an-ak-47-handgunanimation-assembly)
- [JKH-146 — Qualify the USP and its silencer action](https://linear.app/jkhl1103-personal/issue/JKH-146/qualify-the-usp-and-its-silencer-action)
- [JKH-147 — Qualify the AWP and scoped presentation](https://linear.app/jkhl1103-personal/issue/JKH-147/qualify-the-awp-and-scoped-presentation)
- [JKH-148 — Qualify the MP5 viewmodel and actions](https://linear.app/jkhl1103-personal/issue/JKH-148/qualify-the-mp5-viewmodel-and-actions)
- [JKH-149 — Qualify the M3 and per-shell reload presentation](https://linear.app/jkhl1103-personal/issue/JKH-149/qualify-the-m3-and-per-shell-reload-presentation)
- [JKH-150 — Qualify the P228 viewmodel and actions](https://linear.app/jkhl1103-personal/issue/JKH-150/qualify-the-p228-viewmodel-and-actions)
- [JKH-151 — Qualify the Desert Eagle viewmodel and actions](https://linear.app/jkhl1103-personal/issue/JKH-151/qualify-the-desert-eagle-viewmodel-and-actions)
- [JKH-152 — Qualify the Elite dual-pistol viewmodel and actions](https://linear.app/jkhl1103-personal/issue/JKH-152/qualify-the-elite-dual-pistol-viewmodel-and-actions)
- [JKH-153 — Qualify the Five-SeveN viewmodel and actions](https://linear.app/jkhl1103-personal/issue/JKH-153/qualify-the-five-seven-viewmodel-and-actions)
- [JKH-154 — Qualify knife, grenade and C4 first-person presentation](https://linear.app/jkhl1103-personal/issue/JKH-154/qualify-knife-grenade-and-c4-first-person-presentation)
- [JKH-155 — Reconcile bot-held and dropped weapons with the full arsenal](https://linear.app/jkhl1103-personal/issue/JKH-155/reconcile-bot-held-and-dropped-weapons-with-the-full-arsenal)

### [JKH-124 — Finish classic menus, HUD and sound](https://linear.app/jkhl1103-personal/issue/JKH-124/6-finish-classic-menus-hud-and-sound)

- [JKH-156 — Verify the classic HUD, radar and numbered buy menu](https://linear.app/jkhl1103-personal/issue/JKH-156/verify-the-classic-hud-radar-and-numbered-buy-menu)
- [JKH-157 — Finish the compact Dustline menu and match flow](https://linear.app/jkhl1103-personal/issue/JKH-157/finish-the-compact-dustline-menu-and-match-flow)
- [JKH-158 — Audit provenance and complete combat and objective audio](https://linear.app/jkhl1103-personal/issue/JKH-158/audit-provenance-and-complete-combat-and-objective-audio)

### [JKH-125 — Verify and accept the complete playable game](https://linear.app/jkhl1103-personal/issue/JKH-125/7-verify-and-accept-the-complete-playable-game)

- [JKH-159 — Freeze the complete candidate and acceptance evidence manifest](https://linear.app/jkhl1103-personal/issue/JKH-159/freeze-the-complete-candidate-and-acceptance-evidence-manifest)
- [JKH-160 — Pass regression, resource and runtime performance gates](https://linear.app/jkhl1103-personal/issue/JKH-160/pass-regression-resource-and-runtime-performance-gates)
- [JKH-161 — Run two independent real-time CT/T acceptance reviews](https://linear.app/jkhl1103-personal/issue/JKH-161/run-two-independent-real-time-ctt-acceptance-reviews)
- [JKH-162 — Record Joseph's visual verdict and final game handoff](https://linear.app/jkhl1103-personal/issue/JKH-162/record-josephs-visual-verdict-and-final-game-handoff)
