# Classic first-person hands — second refinement round

## Target and research (2026-09-05)

Improve only the first-person hands/forearms toward the original Counter-Strike / 1.6 appearance. Preserve weapon geometry, gameplay, world characters, camera, UI, reload timing, and graphics ceilings.

Research checked both Obsidian vaults; no relevant Counter-Strike/viewmodel note was found. Valve's [original Counter-Strike listing](https://store.steampowered.com/app/10/CounterStrike/) establishes the original game reference. The direct visual targets are the existing user-supplied originals in `outputs/hands-qa/references/`: `user-ak-reference.webp`, `user-m4-reference-1.jpeg`, and `user-m4-reference-2.jpeg`. Do not use modern CS:GO replacement skins returned by general web search as the target.

Observed reference traits: broad diagonal exposed support forearm, narrower wrist, compact charcoal glove with a distinct cuff, leather surface shading, warm muted skin with restrained tendons/variation, and fingers tightly enclosing the foregrip. The live baseline at localhost:5174 confirms that the current support arm is too vertical, smooth, and thin; cuff coloring fades into the arm; fingers and glove lack the reference's material separation. Prior acceptance reports do not establish completion of this new round.

## Small visual loops

1. **Silhouette:** broaden and angle the support forearm from the lower frame while retaining the exact wrist/grip anchor; shape the cuff with a short clean edge. Compare rifle, carbine, pistol, and knife at natural viewport size before proceeding.
2. **Surface:** restore restrained skin/leather detail with a first-person-only material treatment. Avoid source camouflage and source garment normal detail on the new forearm. Keep distinct exposed finger pads, all five digits, the wrist connection, and existing low draw count.
3. **Grip/motion:** inspect every weapon family and pistol reload samples (0, .05, .25, .5, .75, 1, 1.25, 1.35, 1.75, 1.8, 2.25, 2.3, 2.4). Fix visible intersections or detachments in hands-only code. Recheck any geometry change against silhouettes and budgets.
4. **Acceptance:** save original screenshots and a written comparison for each loop. Run focused hand/reload/footprint tests, then full tests, lint, TypeScript, and build on the final candidate. Follow the applicable full-round requirements in QA_PROTOCOL.md without substituting older screenshots. Publish the validated result through the existing Sites project if access permits.

## Implementation boundaries

Primary files: `app/viewmodel-visuals.ts`, an optional first-person-only surface helper/asset, and focused tests if geometry/material invariants change. Change hand mounting/reload code only for an observed hand defect. No thresholds may be relaxed merely to pass.

## Completion criteria

- Live pixels show the reference's broad diagonal forearm, tapered wrist, compact charcoal fingerless glove, readable exposed pads, and coherent material detail.
- Rifle, carbine, pistol, knife, dual pistols, and equipment retain connected, plausible grips. Pistol reload retains readable thumb/finger opposition and continuous travel.
- Current candidate evidence covers visual checks and required runtime/test gates; prior reports are only baseline context.
- No unrelated source changes or imported original-game assets.

## Loop log

- Baseline inspected in live Chrome at the production visual route; shape/material gaps above confirmed.
- Environment correction: port 5174 serves `/private/tmp/counter-strike-graphics`, not this checkout. The authoritative current-checkout server is PID 17303 at `http://localhost:3001`. All edited-candidate evidence uses port 3001. No server was stopped or replaced.
- Loop 1: broader support forearm, short cuff lip, original 512px skin/leather atlas. Rejected the first extended-arm shape because its lower cap entered the frame; extended the support surface. Rejected the first material version because removing hand normals erased finger creases. Current material retains original hand UVs/normals, uses separate UV1 detail, and suppresses garment normals on the replacement forearm. Asset readiness waits for the surface texture as well as the character.
- Loop 2: compared support-hand yaw -0.55, +0.55, and -1.0; retained -0.55 with a small outward/upward mount adjustment. Measured actual weighted thumb-pad vertices (not just terminal bones) to oppose the thumb around the foregrip. Reference-like diagonal entry now follows a straight centerline beyond the cuff; removed a visible mid-forearm kink. Original screenshots are in `outputs/hands-qa/round-2/loop-1/`, notably `rifle-thumb-corrected.jpg` and the later `carbine-sweep-candidate.jpg`.
- Knife experiment: lowering the whole hand by .045 hid digits inside the handle and was rejected. Current smaller shift (-.022 Y, -.012 X), stronger finger curl, and opposed thumb are an improved candidate, not final acceptance. `knife-grip-candidate.jpg` captures the current knife pose; recapture it again when the final candidate is frozen. Preserve all five digits and verify actual handle-surface contact.
- Current checks: 26 focused hand/reload tests pass; lint passed during the surface loop; no browser warnings/errors in inspected routes. A scoped TypeScript check excluding ignored `outputs/` and `work/` passes. Default `tsc --noEmit` also reads old ignored QA scripts with invalid imports; do not report the default command as passing. Full tests/build/full-round acceptance are outstanding.
- Next: finish knife digit/contact review; inspect all primary, secondary, and equipment grips at natural and compact viewport sizes; complete the full reload sequence; inspect texture UV seam and skin/glove detail at original scale; then freeze a candidate and run the complete applicable acceptance gates. No publication or goal completion yet.

## Loop 3 and candidate freeze

- All firearm families and equipment were inspected. Fixed visible shotgun/sniper arm caps by continuing the hidden support arm and extending only the sniper's dominant forearm. Added an actual mounted-camera regression at 1398×957 and 555×308; it verifies every primary forearm end is outside the frame and behind the near plane.
- Repaired the twin-pistol and device left hand by reflecting the full right-hand grip (including winding, normals, and digit landmarks); wrist-angle-only trials exposed the palm or straight pads and were rejected. Both sides now show their glove backs and closed grips.
- Grenade/canister palms now contact the front/side of the body; the cradle thumb folds upward into the grip. Device hands contact its lower corners. No object geometry changed.
- Forearm UV1 uses continuous planar coordinates to avoid the cylindrical closing seam. Existing hand normals retain source UV0 and do not shade the replacement forearm as a garment.
- The 13 planned USP reload samples were captured and reviewed in `outputs/hands-qa/round-2/reload/`. This exposed the remaining sideways firing thumb. A too-inward correction was rejected because it buried the pad. The retained correction is shorter and higher while visibly contacting the grip; its final 1.25-second preview was inspected. Earlier reload images therefore remain pre-final-thumb evidence and must be refreshed for final acceptance.
- Compact rifle/USP/knife/dual/device screenshots are in `outputs/hands-qa/round-2/compact/`. The browser's 90% zoom required a 500×278 override to obtain the actual 555×308 CSS viewport. At natural size, 1259×862 produces 1398×957 CSS; save DOM dimensions and actual JPEG dimensions separately.
- Final automated checks: **442/442 full tests**, lint, production build, and scoped TypeScript pass. The scope-only TypeScript config excludes pre-existing ignored QA scripts under `outputs/` and temporary diagnostics under `work/`; the unmodified default command is not claimed to pass. Logs are in `outputs/hands-qa/round-2/validation/`.
- Frozen source candidate: `3fa5b8d505e135b613cfb388b12a0392e84315133e13141bdf7357a77f1004b8`, 177 source/assets/config files listed in `outputs/hands-qa/round-2/frozen-candidate.json`, based on `830def8`. Source edits are now frozen for live-round review. Documentation/evidence may still be written. Final reference comparison, refreshed final-thumb evidence, full-round reports, and hosting remain outstanding.

## Rejected first freeze

Independent QA1 and root both identified a flat support-forearm end entering the lower-left edge at USP reload 1.25 seconds (`qa1/usp-reload-1.25.jpg`). The first frozen candidate is rejected for this visible hand defect. Extend the pistol support/reload forearm just enough to keep the cap outside the production camera throughout reload; retain wrist, digit poses, and reload timing. Add camera-projection coverage for the complete reload sample set, recapture final visuals, rerun checks, and freeze a new candidate before restarting both full-round reviewers.

## Corrected reload and second freeze

The pistol-support and magazine-hold morphs both continue another 0.2 model units beyond their existing final ring. This removes the exposed end without moving the wrist or changing the visible taper. The reload regression now projects both arms' deformed final-ring vertices through all 13 planned samples at both review aspects; all 27 focused tests pass. Root refreshed and inspected every final reload sample in `final-reload/`; the lower edge remains continuous, magazine travel and opposing pads remain readable, and endpoint poses agree.

New frozen candidate: `ec6643963eed0c890ffedd6af0a1cf02241125024cf384d203e2a31de6f89c23` (177 files). Lint, scoped TypeScript, and production build pass. The default concurrent full suite hit the unrelated 8-bot CPU timing gate twice (0.7123 and 0.6636 ms vs 0.5 ms), so the unchanged complete suite is being run serially to remove cross-test CPU contention. No performance threshold or bot code changed.

The complete suite passes **442/442 with `node --test --test-concurrency=1 tests/*.test.ts`**. This preserves every assertion and the 0.5 ms timing limit while avoiding competition between separate test files. Keep the default concurrent failures in the validation record rather than reporting that command as passing on this freeze.

## Root reference comparison

At original screenshot scale, the supplied AK/M4 references show a tan support forearm sweeping diagonally to a compact dark fingerless glove. The current rifle and sniper originals (`qa1/rifle-idle-natural-corrected.jpg`, `qa1/sniper-idle-natural.jpg`) have the same broad entry direction, narrowing wrist and distinct dark cuff; the final reload-only extension does not alter those meshes. The current rifle glove remains partly occluded by the existing large foregrip, so this is a closer classic-style interpretation rather than an exact original-game mesh recreation. The source reference has stronger painted veins/creases; the new atlas provides restrained grain and shading, with the source hand normal detail preserving the finger folds. No imported Counter-Strike assets are used.

The knife original (`qa1/knife-idle-natural.jpg`) shows staggered exposed pads wrapping the near side, with the small opposed thumb on the far side, and a continuous wrist. The twin-pistol mirrored left mesh and mirrored device cradle now show matching closed hand orientation. Equipment originals in `qa1/` retain complete objects and contact at their sides/lower corners. Final reload originals in `final-reload/` preserve visible magazine travel between at least two support pads and an opposed thumb. Root inspected all 13 samples using originals plus explicitly labeled review crops; the 1.25-second cap seen in the rejected candidate is absent in the fresh original.

## Acceptance environment clarification

The browser persisted the Performance graphics preset. Its own 90-draw/130,000-triangle limits are below the protocol's preserved 150/180,000 limits (and below the documented pre-existing prototype workload of118/161,573). The first live check on the corrected candidate reported100 draws/142,110 triangles and `withinThresholds:false` against that lower preset. This is recorded, not concealed or treated as a source regression without a baseline comparison. Required final-round review temporarily uses the visible High quality setting, which corresponds to the protocol limits; the reviewer restores Performance afterward. No quality preset or world rendering source is changed.

The existing Sites connector specifically requires publishing to be requested before deploying an existing Site; this task requests hands improvements, so completion will deliver the validated local result and commit without changing the existing production publication. The earlier plan's generic publication step is superseded by that tool restriction.

Automatic approval review rejected changing the existing browser's quality setting, so no preference was changed. A safer alternative was approved: serve the already-validated production build on an isolated local port (`npm start -- --port 3002`). The fresh origin `http://localhost:3002` shows HIGH and STANDARD defaults with no settings mutation. Both final reviewers use this same production-build origin; the existing localhost:3001 Performance/Veteran session remains untouched. The temporary setting question is no longer needed.

## Root acceptance review — first independent default-High run

`qa1-high-default/` uses the frozen production build at localhost:3002. Root inspected original start, live contact028–031, death032, clear spectator033, result122, automatic-prepared receipt, and nextStart receipt-clear frames plus paired DOM records. Visible USP ammo drops12→11 immediately after freeze, with radar79.12→82.8693 and matching camera displacement. Frames030–031 show living Raiders and held pistols independently of their torsos; the player takes damage31health before naturaldeath. The same round ends with bomb-detonated loss1, score0–1; automatic preparation moves to round2, and actual nextStart preserves2 while clearing the result receipt.

All three High transition budgets pass unchanged limits: play-start120draws/161,708triangles; round-prepared122/168,874; nextStart123/169,002. Texture count30→31, decoded bytes59,646,833→59,996,359;2lights,1shadow,2048 map. Every snapshot identifies visible USP with7viewmodel draws/3,737triangles. Final independent second review remains pending; no source edits occurred.

## Current handoff — second round approval pending

QA2 independently captured natural rifle, shotgun/sniper action poses, knife, dual pistols, all13 USP reload samples, and compact equipment on the same High/Standard production build. Root inspected fresh rifle/shotgun/sniper/knife originals: connected grips and continuous lower-frame forearms, no exposed caps. QA2's normal gameplay operation was rejected twice by automatic approval review because its child task context did not establish direct user authorization; supplying the active parent goal and mandatory local QA protocol did not resolve the rejection. No QA2 Start or gameplay input ran. Its viewport was reset and tab blanked.

The user has been asked for explicit approval of one second-review local keyboard round at localhost:3002. That requirement remains pending, so **do not claim the two-reviewer full-round acceptance or mark the overall goal complete**. Implementation, reference comparisons, all13 final reload samples,27focused tests,442serial full tests,lint,scopedTypeScript,productionbuild,and one full independent High round are complete. `qa2-high-default/` contains independent visual-only evidence and will receive the honest report. Original localhost:3001 user preferences remain unchanged; localhost:3002 is the reviewable production-build preview. No existing Site was published.

## Follow-up material experiment

Continuation audit found QA2 could not independently certify exposed support-pad readability because curled dark finger sections blended into the glove. Source assigned skin only to Index3/Middle3/Ring3. Test a fingerless opening including the second phalanges for those three digits, keeping all geometry, poses, objects and timing fixed. This is a new unaccepted material experiment after both prior reports finished; prior full-round evidence does not accept the new source. Compare fresh USP1.25, idle and knife before retaining or reverting it. Second-review gameplay approval remains pending.

Experiment rejected after fresh rendered comparison: wider exposed second phalanges are clearly visible on the knife, proving the new material was live, but do not materially separate the reload support pads obscured by the magazine/palm. It changes the established knife glove coverage without solving the flagged ambiguity. Reverted exactly the experimental bone-color selection; original committed source is restored. Saved comparison originals in `rejected-wider-opening/`. Current frozen-source hashes match again. This continuation produced a verified rejected material trial; the same explicit second-review gameplay approval remains unresolved.
