# Full-round graphics QA protocol

> For the CS 1.6 recreation, begin with the [factory method](FACTORY_METHOD.md)
> and [active implementation plan](CODEX_PLAN_CS16_FACSIMILE.md). Preserve this
> protocol's independent live-round reviews, candidate identity, raw evidence,
> and graphics limits. Its old arena routes, ports, camera values, and
> iteration-specific appearance constraints are historical: revalidate them
> against the active acceptance cards before use. They must not prevent the
> intentional map and gameplay changes in the active plan.

Use `http://localhost:5174/?keyboard-playtest=1`. The localhost-only **Start keyboard playtest** button starts the normal game clock and AI without pointer lock. It does not skip time or alter combat state.

Controls: WASD movement, arrow-key aim, F fire, R reload, B buy, number keys select/buy, E interact/defuse, G drop, Z squad regroup, Shift walk, Control crouch, Space jump, and Tab scoreboard.

The localhost keyboard-playtest input bridge gives atomic WASD and arrow-key presses a 75 ms minimum latch so browser QA tools that cannot hold a key still cross at least one rendered simulation frame. Repeated presses extend that latch. This changes input delivery only: the normal clock, acceleration, collision, AI, combat, and objective rules remain authoritative.

The start action already focuses the canvas. Do not issue a second accessibility-tree canvas click after starting; iteration 03 showed that this can consume roughly 30 seconds while the live round continues. For supported atomic movement/aim taps, use about 110 ms between taps and verify each route leg from visible world/radar displacement. A faster failed batch does not establish why displacement was negligible.

For the opening CT round, use the visible radar to take the east lane to Site A. After freeze time, move backward until the rightward path past the spawn wall is clear, move right until the player triangle enters the outer lane below and slightly left of the highlighted A marker, then move forward until it is level with A and the two friendly markers. Move right toward those markers. Confirm each leg with visible radar displacement instead of relying on a keypress count. This route reaches the stationed defenders and the incoming attackers without hidden coordinates or simulation shortcuts. Do not use squad regroup as a substitute: the request is brief and planted-device duties take priority.

Before full-round capture, use the localhost visual routes for close inspection without changing simulation authority:

- `?visual-qa=primary&weapon=rifle&action=idle&time=0` accepts `rifle`, `carbine`, `smg`, `shotgun`, or `sniper`; `idle`, `equip`, `fire`, or `reload`; and a deterministic action time from 0 to 4 seconds. Use `shotgun&action=fire&time=0.44` to inspect the moving pump and `sniper&action=fire&time=0.35` to inspect the open bolt.
- `?visual-qa=pistol&weapon=usp&action=idle&time=0` accepts `glock18`, `usp`, `p228`, `deagle`, `elite`, or `fiveseven` and the same four actions. For the USP reload, capture `time=0.50`, `time=1.00`, `time=1.35`, `time=1.80`, and `time=2.30` to track the exposed upper magazine face through removal and insertion using the production reload writer. `?visual-qa=secondary` retains the compact six-pistol board.
- `?visual-qa=equipment&weapon=knife` accepts `knife`, `grenade`, `smoke`, `flash`, or `bomb`. Inspect the complete object, grip contact, textured hands, and wrists at the production 74° camera and 555 × 308 review viewport.
- `?visual-qa=lane`, `?visual-qa=site-a`, and `?visual-qa=site-b` cover the accepted paving and alpha mountain panorama from fixed production cameras.
- `?visual-qa=character-close&distance=3&pose=idle` and `?visual-qa=locomotion&time=2` cover full-scale anatomy and motion. For deterministic death review, use `?visual-qa=character-close&pose=death&distance=6&angle=three-quarter&variant=0&time=0.58`, change `variant` from `0` through `3`, and sample `time=0`, `0.29`, and `0.58` to inspect the exact living start, transition, and settled corpse. These `variant` and `time` values select visual review samples only; they do not alter live-round outcomes or timing.

For the FPS-hands cycles, also inspect the pistol route at the natural 1398 ×
957 CSS viewport near reload times `0`, `0.05`, `0.25`, `0.75`, `1.25`,
`1.75`, `2.25`, `2.30`, and `2.40`, plus idle rifle and knife views. The
dominant glove must show four staggered knuckles wrapping across the grip, a
compact opposed thumb, and a continuous wrist without crop shards. The moving
magazine must remain visible between at least two readable support finger pads
and the opposed thumb, with no endpoint jump as the hand reaches or releases
its magazine socket. Hands cannot pass by hiding digits, replacing them with a
mitt, or pushing them mostly out of frame. Compare forearm taper, diagonal
entry, charcoal fingerless glove, and tan skin directly with the supplied hand
references at original screenshot resolution.

Wait for `[data-mountain-panorama-ready="ready"]` as well as `data-character-assets="ready"` before any visual-route or full-round evidence capture. The panorama gate confirms that the sRGB alpha asset loaded and became visible; an `error` value invalidates environment evidence. These routes are visual inspection aids only. Full-round acceptance still uses `?keyboard-playtest=1` and normal real-time gameplay.

Before each cycle, save the implementation plan/review and record one candidate source revision or `git diff` checksum. Freeze source edits until both reports finish. After each completed render improvement, run two independent QA reviewers in separate fresh tabs or browser sessions against the same freshly loaded frozen candidate. Each reviewer must play and report one complete round from briefing through a visible round result using normal real-time simulation. A reviewer must not inspect or use the other reviewer's report, screenshots, route outcomes, or verdict as evidence.

After a reviewer has saved its report, diagnostics, and originals, navigate that completed review tab to `about:blank` before starting the next full-round reviewer. Do the same for superseded preview and diagnostic tabs. This releases their active renderers and reduces GPU contention without modifying the frozen candidate or any captured artifact.

Each QA agent authors and directs its own inputs, route adaptations, and visible-UI conditional rules. If that worker's browser connection fails, the coordinating root may mechanically relay the agent-authored actions through a working supported Browser session. The report must disclose the relay, identify the stale/failed worker connection and working session limits, and distinguish the agent's decisions from the root's mechanical execution. Relay mode does not permit hidden-state inspection or coordinator-authored route substitutions.

Immediately after freeze time, verify that supported keyboard input produces real camera displacement and that accepted fire reduces the visible magazine count. Before accepting the run, capture at least one clearly visible teammate or opponent from the living first-person camera during that same round. If any check fails, the run is invalid for active-play coverage: stop, resolve supported input delivery, and restart in a fresh round. Do not wait out a stationary round and label it traversal or combat.

Run the full-round input and evidence sequence inside one continuous browser-tool operation from the Start action through the visible result evidence. Before the first likely damage/contact window, arm its screenshot plus visible-DOM result watcher and keep it running through player death and the round-result overlay, capturing about every 0.6–1 second. Do not return from the tool, switch models, or hand off control during the round. The watcher must read only exposed visible DOM status and save original rendered frames; it must not mutate or skip simulation state. A post-round receipt carried into the next freeze briefing may preserve a completed result across capture latency, but it is evidence only when its visible round number, reason, and score match the exposed DOM receipt from the same run.

Each agent records:

1. candidate revision/checksum and its own artifact folder, `outputs/round-qa/iteration-N/qa-1` or `qa-2`;
2. start and end round number, game time, phase, and status;
3. keyboard inputs and actions used;
4. start/freeze-time screenshot;
5. mid-round movement and combat screenshots;
6. at least one visible teammate or opponent at play distance, plus a death or close-contact screenshot when encountered;
7. round outcome screenshot showing the round/status marker, paired with the same capture's visible-DOM status proof;
8. browser viewport size and actual saved-image pixel dimensions;
9. agent model, browser/session limitations, and any mechanical-relay disclosure;
10. console errors, visible rendering defects, and a verdict with exact image paths in a non-mutating report to the coordinating agent.

The root `<main>` exposes `data-character-assets`, `data-playtest-status`, `data-playtest-round`, `data-playtest-phase`, `data-playtest-last-result`, `data-playtest-last-result-score`, `data-playtest-last-result-reason`, and `data-graphics-budget`; the renderer mount exposes `data-mountain-panorama-ready`. `data-character-assets="ready"` confirms that real GLB instances mounted before play began. For a real Start, parse `data-graphics-budget` and require `withinThresholds: true`, `snapshot.reason: "play-start"`, the selected `weaponAtSnapshot`, `viewmodelVisibleAtSnapshot: true`, and nonzero `geometryBreakdown.viewmodel.visibleDrawProxies` and `visibleTriangles`. After that same round completes and automatic freeze preparation begins, parse the newly published budget again and require `withinThresholds: true`, `snapshot.reason: "round-prepared"`, the prepared `weaponAtSnapshot`, `viewmodelVisibleAtSnapshot: true`, and the same nonzero viewmodel fields. Preserve that automatic-preparation record before another Start replaces it. A next Start from the prepared freeze must invoke the Start publisher even though the prepared HUD status is already active, replacing the record with a fresh `play-start` snapshot for the current active weapon; the engine's inner active-status guard must keep that Start from resetting the prepared round. Preserve the JSON records with their corresponding visible Start and carried-receipt screenshots. These are labeled transition snapshots, not claims about later weapon switches or every rendered frame; do not poll budget per frame. Preserve the unchanged ceilings of 150 visible draws, 180,000 triangles, 64 textures, 96 MiB decoded textures, two persistent lights, one shadow caster, and a 2048 shadow map. The accepted pre-freeze USP prototype measured 118 draws, 161,573 triangles, 29 textures, 58,248,731 bytes, and a 7-draw/4,434-triangle viewmodel.

The visible top bar, result overlay, or carried freeze-screen receipt provides screenshot evidence for round number, phase, and outcome. Save every screenshot together with its visible-DOM status record. Inspect the actual file signature and use the correct extension; Browser originals identified as JPEG/JFIF must use `.jpg`, even if an earlier requested filename used `.png`. Filenames must describe visible content; a spawn or result frame cannot be named as combat evidence. Living first-person character evidence from round 1 may never be combined with a round-2 result to accept either round. The coordinating root reviews both sets of raw original screenshots and rejects incomplete evidence; agent verdicts are evidence claims, not final acceptance. Any defect fix requires a new frozen candidate and another complete two-reviewer cycle with saved plans, originals, diagnostics, and reports.

For pass 10, preserve the iteration-09 routes and judge the two material corrections from pixels at their real scale. Living-actor evidence must show the held world firearm resolving independently from the torso in at least one full-resolution first-person frame, supported by adjacent motion that proves the actor is alive; a close character-only showcase cannot replace this gate. On the `w-near-crate-*` progression, the final valid-contact frame must retain visible timber variation and brace/face separation rather than becoming a featureless dark plane. These are contrast and surface-detail checks only: do not require new weapon geometry, a brighter first-person finish, changed poses, or different collision/camera behavior. Reconfirm the unchanged 150-draw, 180,000-triangle, 64-texture, 96-MiB, two-light, one-shadow-caster, and 2048-shadow-map ceilings.

Also inspect the post-death spectator watcher as a continuous sequence. No run passes pass 10 if the camera looks into or remains occluded by a nearby structural wall in adjacent watcher frames; require a clear view of the watched actor or site through the death-to-orbit handoff and continuing orbit. The fix may shorten or choose a clear-side/overhead boom, but it must not hide actors, alter target selection, skip the death-camera phase, or claim camera validity from one isolated clear frame.
