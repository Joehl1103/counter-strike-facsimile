# Dustline tactical FPS plan

> Historical plan. For the active CS 1.6 recreation, use the
> [implementation plan](CODEX_PLAN_CS16_FACSIMILE.md) together with the
> [factory method](FACTORY_METHOD.md). The active plan supersedes this document's
> original-arena scope. The history and evidence below are retained; previous
> completion labels do not establish acceptance of the new target.

## Product target

Build an original browser FPS that targets Counter-Strike 1.6 fidelity in
mechanics, information density, interaction rhythm, round stakes, and tactical
readability without copying Counter-Strike maps, branding, audio, or art.

## Delivery stages

1. **Playable gunfight (complete)** — first-person movement and mouse look, collision,
   hitscan rifle, simple opponents, damage, classic HUD, win/loss, and restart
   in one original desert arena.
2. **Tactical round (complete)** — Terrorist/Counter-Terrorist roles, freeze time, buy
   menu and economy, weapon switching, footsteps, recoil and accuracy states.
3. **Bomb objective (complete)** — bomb pickup, plant/defuse interactions, two sites,
   navigation-aware bots, team scoring, spectating, and round transitions.
4. **Finish and release (browser QA pending; other work complete)** — sound
   and visual polish, persistent settings, touch/quality fallbacks,
   accessibility, browser QA, performance tuning, and deployment.
5. **Less-blocky graphics refinement (implemented)** — keep gameplay collision
   intact while separating essential architecture from optional decoration,
   adding curved façade depth and landmark silhouettes, improving procedural
   material variation, and restoring shape through more directional lighting.
6. **Complete both match halves (implemented)** — preserve team identity across
   a 15-round regulation halftime, let the player attack and plant at either
   site, give CT bots site holds and defuse behavior, and make scoring, economy,
   spawns, radar, objective prompts, and round endings side-aware.
7. **Architectural silhouette pass (implemented)** — preserve all 22 gameplay
   collision volumes while breaking up the remaining long rectangular walls
   with two-sided façade bays, rounded buttresses, layered rooflines, more
   dimensional cover, and a hazy curved skyline beyond the playable arena.
8. **Classic gunfeel and buy-zone pass (implemented)** — replace random camera
   recoil with tested, weapon-specific spray sequences; give each firearm a
   distinct cached procedural report and viewmodel kick; and restrict purchases
   to the active side's spawn zone during the opening buy period.
9. **Shape-first graphics refinement (implemented)** — preserve every gameplay
   collider while replacing the most obvious slab, cube, capsule, and stacked-box
   silhouettes with deeper architectural profiles, dimensional cover, articulated
   combatants, and more recognizable first-person weapon and hand forms.
10. **Flashbang and weapon-recovery loop (implemented)** — add purchasable,
    simulation-timed flashbangs with cover/facing-aware blindness and give defeated
    opponents recoverable primary weapons without overriding bomb interactions.
11. **High-fidelity procedural art pass (implemented)** — soften the remaining
    blockout silhouettes with higher-resolution curved geometry, layered wall and
    ground treatment, richer material response, and more natural character and
    weapon forms while preserving collision, gameplay readability, and the
    existing performance-quality fallback.
12. **Scoped sniper and manual weapon handling (implemented)** — add a costly,
    deliberate bolt-action primary with one-level scope controls and a complete
    desktop/touch presentation, then extend recovered weapons with classic
    manual dropping, exact-ammo snapshots, pickup grace, and unchanged bomb-use
    priority.
13. **Enemy armory and contact pressure (implemented)** — give each opposing squad
    a deterministic rifle, SMG, shotgun, and sniper roster powered by the same
    damage, cadence, reload, audio, model, and ammunition rules as player weapons;
    add one fair hunter role that pursues only heard or last-known contact; and
    replace omniscient radar tracking with short, line-of-sight sightings.
14. **Friendly squad and shared-round simulation (implemented)** — add four
    weapon-aware squadmates who fight and collide under the same visibility rules,
    recover and plant or retake and defuse after the player falls, remain visible
    on the radar and scoreboard, and keep the round alive until the entire team is
    eliminated. Death moves the player into deterministic teammate spectating
    while opponent radar information remains limited to recent direct sightings.
15. **Organic visual refinement (complete)** — soften the remaining low-poly
    silhouettes in high-quality mode, improve material breakup and depth cues,
    and add curved architectural and character detail without changing collision,
    sightline readability, or the performance-mode budget.
16. **Control readiness and weapon commitment (complete)** — recover clearly
    from pointer-lock failure, release held inputs when focus is lost, add
    side-aware objective onboarding, give every weapon a tested equip delay and
    movement weight with deliberate counter-strafing, and stage non-terminal
    rounds automatically after a short result review.
17. **Softer silhouette and surface pass (complete)** — reduce the remaining
    blockout feel with broader architectural bevels, more organic ground and
    façade transitions, improved character motion and readability, and clearer
    material highlights while preserving collision, sightlines, and the
    performance-quality fallback.
18. **Tactical round plans and route recovery (complete)** — vary attacks
    between hand-authored direct and split approaches, rotate carrier and entry
    responsibilities, validate every path against the arena, and let blocked
    bots recover deterministically without weakening objective commitment.
19. **Tactile reload commitment (complete)** — expose authoritative reload
    progress in the HUD, add distinct per-weapon mechanical start/commit sounds,
    make a truly empty trigger click once per pull, and ensure every interruption
    immediately clears both the reload state and its feedback.
20. **Positional movement intelligence (complete)** — make actual bot
    movement produce distance-attenuated stereo footsteps, enforce per-source and
    squad-wide cadence limits, and suppress cues from stopped, dead, distant, or
    non-playable listeners without making sound depend on line of sight.
21. **Combat and economy consequence (complete)** — make incoming health
    damage briefly disrupt player accuracy, correct objective and terminal-round
    payouts, and make each squad's deterministic loadout reflect its current loss
    streak with one readable light-buy before bonus-funded recovery.
22. **Lethality confirmation and weapon rewards (complete)** — distinguish
    body hits, headshots, kills, and headshot kills with one prioritized per-shot
    confirmation, then award eliminations by the weapon class that earned them.
23. **Round settlement and freeze handoff (complete)** — show the exact
    cap-aware award, bank, score, next assignment, halftime reset, and buy window
    without changing authoritative settlement, transition, or pointer-lock flow.
24. **Organic near-field graphics pass (implemented)** — replace square surface
    noise with softer material breakup, blend hard wall bases into the terrain,
    and smooth the most visible hand and world-weapon silhouettes while preserving
    collision, hitboxes, aim alignment, and the performance-quality fallback.
25. **Consequential enemy fire (complete)** — increase connected enemy body
    damage enough to punish exposed crossfires while preserving reaction time,
    line-of-sight, smoke, reload, suppression, and simultaneous-shooter fairness.
26. **Visible contact and fair retargeting (complete)** — use a typed general
    visibility fallback so hidden nearer squadmates cannot mask a visible player,
    and require each switched target to earn a fresh reaction window before an
    opponent can resume firing.
27. **Ballistic surface feedback (complete)** — make missed player shots end
    in bounded, material-aware dust or spark impacts so recoil, spread, and cover
    are readable without adding wall penetration or changing authoritative damage.
28. **Macro façade wear (complete)** — break up repeated large wall surfaces
    with one high-quality-only procedural decal atlas and a single visual-only
    mesh, preserving every collider, route, sightline, and objective cue.
29. **Classic hit tagging (complete)** — turn hostile post-armor bullet damage
    into a brief, capped grounded movement penalty that recovers on simulation
    time without stacking into stun-lock or changing airborne movement.
30. **First-person reload motion (complete)** — layer deterministic,
    weapon-specific lower, roll, and return poses over the existing reload clock
    so handling reads as a physical action without changing ammo or timing.
31. **Exterior desert silhouettes (complete)** — replace the remaining flat,
    square horizon with a deterministic high-quality-only ring of fog-softened
    mesas and dunes outside every gameplay and raycast collection.
32. **Persistent ballistic scars (complete)** — retain bounded, correctly
    oriented bullet marks on solid surfaces through the round so broad walls
    accumulate fine combat detail without changing hitscan, collision, or the
    performance-quality fallback.
33. **Readable combatant deaths (complete)** — replace disappearing bots
    with brief deterministic falls and round-scoped bodies that reuse the
    existing character models while remaining excluded from targeting,
    collision, visibility, and objective logic.
34. **First-person casing detail (complete)** — add curved brass casings to
    committed rifle, SMG, and pistol shots through one fixed simulation-timed
    pool. Core weapon feedback remains present in both quality modes, incurs no
    idle draw, and leaves firearm behavior, collision, and raycasts unchanged.
35. **Player death-camera handoff (complete)** — preserve immediate lethal
    gameplay authority while adding a brief, deterministic first-person fall
    before the existing spectator orbit, with pause-aware timing and no camera,
    input, objective, or resource lifecycle regressions.
36. **Diegetic combat impact audio (complete)** — add one restrained
    confirmation texture per aggregated player hit plus a shared-cooldown,
    positional gear thud for bot falls, without changing damage, targeting,
    pause behavior, volume settings, or round authority.
37. **Smoother tactical rendering (complete)** — preserve full high-quality
    display resolution across resizes, smooth distant terrain normals, and
    refine the most visible hard-edged silhouettes without changing collision,
    navigation, targeting, or the performance fallback.
38. **Authoritative crouch sightlines (complete)** — make the interpolated
    crouch posture lower the player's shared combat eye for enemy visibility,
    smoke, targeting memory, tracers, and radar while preserving collision,
    movement, damage, and objective ranges; expose the same held stance on touch.
39. **S90 bolt-cycle commitment (complete)** — make each committed sniper
    shot drive a bounded physical bolt cycle and release the scope only after
    hitscan resolution, preserving cadence, damage, accuracy, pause timing, and
    all reset and weapon-switch boundaries.
40. **Landing accuracy commitment (complete)** — preserve airborne firearm
    inaccuracy for a brief simulation-timed recovery after touching down, making
    jump-peeks punishable while leaving movement, damage, objectives, pause
    behavior, and settled grounded accuracy unchanged.
41. **Authored silhouette and depth pass (complete)** — taper the dominant
    first-person stock and grip profiles and add subtle vertex-toned depth to
    structural surfaces without changing collision, sightlines, draw calls,
    weapon alignment, or the performance-quality fallback.
42. **Player bomb recovery (complete)** — let a living attacker automatically
    reclaim a dropped objective on contact while preserving bot recovery,
    plant/defuse timing, rewards, routes, and round authority.
43. **Legible landing commitment (complete)** — derive a restrained
    first-person settle and player-local landing thud from the existing recovery
    timer without moving the camera, informing bot hearing, allocating per frame,
    or changing jump physics, spread, damage, and pause timing.
44. **Softer authored graphics pass (complete)** — broaden visual-only
    architectural chamfers and carry tapered forms into combatant armor plus
    every bot-held and dropped primary, preserving map bounds, hitboxes, muzzle
    alignment, draw-call count, and both quality modes.
45. **Enemy flashbang entry pressure (complete)** — give the opposing entry
    bot one deterministic, visible flashbang commitment per round, with a held
    wind-up, real bouncing projectile, cover and look-away counterplay, teammate
    blindness, and no hidden HUD warning or change to firearm lethality.
46. **Audible objective commitment (complete)** — make plant and defuse start
    and completion transitions produce distinct local or positional mechanical
    cues, so committing to the objective reveals a punishable timing window
    without changing objective duration, bot knowledge, or round authority.
47. **Readable opponent reload windows (complete)** — expose the existing
    empty-magazine vulnerability with bounded, positional start and commit cues
    for opposing bots, preserving authoritative ammo, timing, targeting, and
    the silence of dead-player spectating.
48. **Manual C4 drop and squad handoff (complete)** — let a living attacker
    deliberately drop a selected carried objective, including during freeze
    time, so squadmates can recover and finish the existing plant route while
    preserving plant interruption, round authority, and touch parity.
49. **Manual friendly spectator cycling (complete)** — after the death-camera
    handoff, let desktop and touch players rotate through living squadmates in
    stable roster order without exposing enemy viewpoints, delaying settlement,
    or interfering with live combat controls.
50. **Smooth combatant render silhouettes (complete)** — decouple high-quality
    character rendering from the established hit geometry, replacing visible
    faceted torsos, shoulders, arms, and legs with smoother one-for-one variants
    while preserving aim, damage, AI visibility, animation, and performance mode.
51. **Recoverable squad-fire pressure (complete)** — cap opposing concurrent
    bursts at two and trim only player-bound body damage so exposed crossfires
    remain dangerous without allowing three full automatic strings to erase the
    player at once, while preserving aim, reaction, utility, routes, weapon identity,
    enemy-versus-squad damage, and friendly support.
52. **Authoritative north-up radar (complete)** — place the player marker in
    the same fixed map coordinates as sites and contacts, rotate it with camera
    heading, and centralize bounded coordinate conversion without changing the
    existing ally or temporary-enemy information policy.
53. **One-layer wooden-cover penetration (complete)** — let player-fired
    firearms carry reduced weapon-specific damage through one thin wooden crate,
    while oblique or excessive thickness, shotguns, every non-wood material, a
    second surface, and all bot sight and fire remain hard-blocked.
54. **Player-confirmed squad rotations (complete)** — turn the player's
    existing fair sight confirmation into delayed, expiring last-known contact
    for unengaged squadmates to investigate, without granting fire permission or
    overriding bomb recovery, carrier, plant, defuse, escort, or post-plant jobs.
55. **Player-selectable bot skill (complete)** — make Recruit the persisted
    default while offering Standard and Veteran settings; tune only hostile fire
    against the human player's hit chance, reaction window, and simultaneous
    burst limit so squad combat, weapon lethality, routes, and objectives remain
    authoritative.
56. **Need-backup radio command (complete)** — let a living player issue one
    simulation-timed rally call from desktop or touch, sending only available,
    unengaged squadmates toward distinct positions near the call location while
    direct combat and every bomb-critical job retain priority.
57. **Side-specific service rifles (complete)** — keep the Raiders' hard-hitting
    K-47 while giving Blacksite an original, steadier and slightly lower-damage
    carbine through the same complete player, bot, recovery, audio, handling,
    rendering, and economy pipelines without increasing Recruit lethality.
58. **Fair ally contact radio (complete)** — surface a single simulation-timed
    ENEMY SPOTTED call when a living squadmate newly acquires a real direct contact,
    without exposing identity or position, feeding radar or movement intelligence,
    spamming sustained sight, or overriding the player's NEED BACKUP feedback.
59. **Forgiving Recruit fire (complete)** — reduce only Recruit opponents'
    player-bound hit probability so the default mode gives a clearer chance to
    disengage from exposed fights while preserving connected-hit damage, enemy
    count and behavior, player weapons, objectives, and higher skill tiers.
60. **Classic body hitgroups (complete)** — distinguish authoritative head,
    torso, stomach, and leg hits for player-fired weapons so aim placement and
    partial cover matter, while preserving bot lethality, armor, range falloff,
    penetration order, shotgun aggregation, and existing hit confirmation.
61. **Recruit survival window (complete)** — lower Recruit bots' player-only
    accuracy and lengthen their player-only reaction time so new players get a
    clearer chance to find cover, while preserving weapon damage, one active
    firing lane, bot-v-bot combat, and the Standard and Veteran tiers.
62. **Opening pistol rounds (complete)** — give both squads the existing P9 on
    the first round of each half so the $800 reset creates a fair classic pistol
    opener, while preserving later full/eco rosters, side-specific rifles,
    objectives, Recruit tuning, and primary-only weapon recovery.
63. **Defuse-kit buy discipline (complete)** — issue kits only to designated CT
    bots on full-buy rounds, leaving pistol and eco rounds with the standard
    ten-second defuse while preserving routes, objective authority, player kits,
    and the existing five-second full-buy defuse window.
64. **Classic HUD and menu shell (complete)** — reduce the desktop interface to
    a compact corner-and-bottom layout, remove persistent redundant combat
    widgets, and flatten the briefing, buy menu, scoreboard, and event messages
    into a restrained classic tactical presentation without changing gameplay,
    touch controls, accessibility labels, or authoritative state.
65. **Classic C4 inventory loop (complete)** — make the objective a dedicated
    slot-5 item with its own first-person model, require held primary fire to
    plant it, cycle all grenades through slot 4, drop only the selected item with
    G, automatically recover dropped C4 on contact, and rotate Raider-side bomb
    ownership between the player and allied carriers without changing objective
    timing, bot recovery, or round authority.
66. **Classic MR15 match structure (complete)** — replace the shortened
    first-to-five format with 15-round regulation halves, first-to-16 victory,
    and repeatable MR3 overtime on a 1:45 round clock. Reset regulation halves
    to $800 and each overtime half to $10,000 while keeping side swaps, opening
    pistol rounds, transition previews, and phase-aware targets authoritative.
67. **GoldSrc-style player movement (complete)** — replace target-velocity
    interpolation with scaled projection-based ground acceleration, friction,
    and momentum-preserving air strafing; require a fresh jump press after each
    takeoff and apply the classic bounded bunny-speed crop without changing
    weapon speed authority, vertical jump height, collision, or bot movement.
68. **Classic player armor and equipment economy (complete)** — distinguish
    $650 Kevlar from the $1,000 vest-and-helmet suit and its $350 helmet upgrade,
    correct the CT defuse kit to $200, and apply weapon-specific armor ratios only
    to protected hitgroups. Add bounded difficulty-aware hostile hitgroups so the
    helmet changes live combat, preserve armor and helmet only through eligible
    survival resets, and leave bot armor as a separate future simulation slice.
69. **Restored default combat pressure (complete)** — answer the too-easy
    baseline with faster, more accurate Recruit contact and two bounded hostile
    firing lanes while preserving the ordered Standard and Veteran tiers, fair
    line-of-sight and reaction gates, unchanged bot-versus-bot combat, and the
    existing player-selectable difficulty control.
70. **Handed first-person arm reconstruction (complete)** — replace the one
    duplicated floating-hand mesh with cached left/right, grip-specific arm
    assemblies whose tapered sleeves exit below the frame. Remove sideways
    forearms from long-gun handguards, move the knife clear of the camera near
    plane, preserve every gameplay/muzzle/casing anchor, and enforce explicit
    per-arm triangle and draw-call budgets with pose-table regression coverage.
71. **Classic secondary arsenal and ammunition economy (complete)** — remove
    the generic P9 and model the Glock 18, USP, P228, Desert Eagle, Five-Seven,
    and Dual Elites as real secondary-slot weapons. Issue side-correct starter
    pistols and reserve ammunition after deaths and side changes, retain a
    survivor's exact secondary and ammo, enforce the side-specific fifth buy
    option, purchase ammunition in source-sized packs, and let primary or
    secondary replacements enter the same recoverable dropped-firearm loop.
    Every pistol must use the existing authoritative firing, reload, recoil,
    armor, audio, bot, HUD, input, and viewmodel paths with no generic-pistol
    compatibility branch left behind.
72. **Human movement-realism sub-loop (complete)** — run a dedicated coordinated
    audit, implementation, adversarial review, and play-verification loop over
    player and bot locomotion. Improve acceleration, stopping, strafing,
    crouching, jump/landing transitions, foot placement, upper-body aim
    separation, weapon carry, turn response, and death-to-spectator continuity
    wherever the current motion reads as mechanical, while preserving collision,
    weapon-speed authority, objective routing, deterministic difficulty rules,
    performance budgets, and the classic Counter-Strike movement identity.

## First-stage acceptance checks

- The player can enter pointer lock, look, move with WASD, and collide with map
  geometry.
- Firing consumes ammunition and damages raycast targets; reloading restores a
  magazine after a visible delay.
- Opponents move, attack, die, and can win the round by reducing health to zero.
- The HUD communicates timer, score, health, armor, ammo, money, crosshair,
  damage, eliminations, and controls without covering the play area.
- The arena reads immediately as an original old-school desert tactical map.
- Production build and lint complete successfully.

## Architecture

- Vinext/React owns menus and HUD.
- Three.js owns rendering, camera, collisions, weapons, bots, and the frame loop.
- Mutable per-frame game data stays outside React state; React state receives
  throttled HUD snapshots only.
- Generated geometry and Web Audio keep the prototype self-contained and avoid
  copyrighted assets.

## Post-release refinement

- C4 now occupies a dedicated classic inventory slot with an authored held
  device model. The player equips it with 5 and plants with held primary fire;
  slot 4 cycles available grenades, G drops only a selected primary or C4, manual
  drops work during freeze time, and contact automatically recovers a dropped
  device. Raider rounds alternate C4 ownership between the player and allied bot
  carriers while preserving the existing plant, recovery, and retake systems.
- Each opposing squad now fields one utility-carrying entry bot that commits to
  a visible, firing-locked flash wind-up and throws at the last directly observed
  player position. The real projectile bounces on simulation time, respects
  cover and look-away counterplay, blinds only living opposing targets, and is
  safely owner-capped, reset, and disposed without changing firearm lethality.
- Decorative architecture now uses broader rounded chamfers, combatant chest
  plates and packs use tailored silhouettes, and all four bot-held or dropped
  primaries carry their own tapered receiver, stock, grip, and handguard profiles.
  The pass adds no draw calls and changes no collision, hitbox, sightline, muzzle,
  or quality-mode behavior.
- Committed scoped S90 shots now resolve with their original accuracy before
  releasing the scope into a visible, simulation-timed lift, retract, return,
  and lock cycle. Scope re-entry waits for the 900 ms action, while the existing
  1,250 ms cadence, damage, ammo, pause behavior, and lifecycle resets stay intact.
- Crouching now lowers one authoritative player eye across enemy sightlines,
  smoke tests, radar spotting, target memory, and tracers; ray occlusion uses
  matching three-dimensional distance while target choice, damage, collision,
  and objective ranges remain unchanged. Touch players gain a held crouch action.
- High-quality rendering now retains its full capped display resolution through
  settings changes and resizes; smooth-shaded dunes, bounded cloth-covered
  crates, and two-draw-call articulated viewmodel hands soften the remaining
  blockout silhouettes without changing cover or combat geometry.
- Aggregated player hits now carry restrained impact textures, while nearby bot
  falls produce positional gear thuds behind living-listener and shared-cooldown
  gates; mute, pause, damage, targeting, and round authority stay unchanged.
- Opponent body shots now deal 20% more damage to the player while allied bot
  damage remains unchanged; all visibility, reaction, armor, reload, and
  simultaneous-shooter safeguards remain authoritative.
- Surface flecks now use irregular elliptical marks instead of square stamps,
  wall bases blend into shallow sand accumulation, and near-field hands plus
  world weapons carry smoother curves without changing tactical geometry.
- Round result screens now show cap-aware settlement and the next assignment;
  the unlocked pre-round overlay distinguishes freeze time, buy time, and bank.
- The player now starts with a sidearm and must purchase the primary rifle.
- Armor, rifle ammunition, and the defuse kit make the round economy
  consequential; surviving a win preserves purchased equipment.
- The buy menu supports both number-key selection and direct touch controls.
- Movement, jumping, crouching, walking, and sustained fire now feed one tested
  weapon-spread model, with the crosshair widening to expose current accuracy.
- Holding Tab (or the touch score control) opens a live team roster with match
  score, objective state, survival status, and persistent player/bot statistics.
- Bot fire now has directional audio, muzzle flashes, short-lived tracers, and
  a tested player-relative damage indicator for readable combat feedback.
- Raiders now acquire targets briefly before firing, but shoot faster, hit more
  consistently, and deal more damage once they commit to an engagement.
- A purchasable frag grenade adds timed, bouncing area damage with cover
  attenuation, self-damage, and keyboard/touch loadout support.
- Purchasable smoke grenades bloom into persistent sight-blocking clouds, giving
  the player a tactical way to cross exposed lanes and attempt a defuse.
- Raiders now interrupt objectives at close range, retreat or strafe by combat
  distance, and investigate their last known target position after losing sight.
- Raiders now use distinct combat profiles, deliberate movement choices,
  suppressed aim, limited magazines, and delayed, imprecise callouts. Up to
  three attackers can pressure one lane, with faster reactions, longer bursts,
  and heavier damage making exposed movement substantially more dangerous.
- Defusing uses the classic 10-second/5-second cadence, interruptions reset
  progress, and surviving players retain their purchased loadout after either result.
- Matches now run 15-round regulation halves, first-to-16 victory, and
  repeatable MR3 overtime with $10,000 half resets; cumulative K/D, escalating
  loss rewards, capped money, 1:45 rounds, phase-aware targets, and new-match
  resets remain authoritative.
- One simulation clock pauses freeze time, reloads, weapon cooldowns, spectating,
  footsteps, and bomb beeps together so opening the menu cannot grant free time.
- Procedural surface texture, softened geometry, layered architecture, animated
  tactical silhouettes, detailed viewmodels, and filmic lighting replace the
  earlier blockout look while retaining the old-school visual character.
- Curved recesses, cloth awnings, bowed cables, palms, rocks, cylindrical props,
  surface bump detail, shaped lighting, and a subtle vignette further break up
  boxy silhouettes without changing the arena's collision layout.
- Both faces of the long lane walls now carry recessed arches and rounded
  buttresses; cover has dimensional framing, and a fog-softened domed settlement
  replaces the empty rectangular horizon without entering gameplay collision.
- A typed firearm registry now powers the K-47, P9, C9 SMG, and P-12 pump
  shotgun, including distinct ballistics, recoil, ammo, trigger, reload, buy,
  HUD, touch, and survivor-retention behavior.
- Every firearm now has a bounded, learnable camera-recoil path plus a distinct
  cached procedural report and viewmodel kick. Purchases require the player to
  remain inside the active side's visible spawn zone during the buy period.
- Layered perimeter façades, higher-resolution tactical silhouettes, manufactured
  weapon detailing, shallow instanced ground relief, practical lights, and a
  procedural reflection environment reduce the remaining blockout feel without
  changing the arena's authoritative cover or navigation.
- The S90 bolt-action sniper introduces a deliberate scoped firing rhythm with
  reduced scoped sensitivity, strong unscoped inaccuracy, a dedicated procedural
  model, and desktop/touch controls. Players can drop a held primary with exact
  ammunition preserved, then recover it after a short simulation-timed grace
  period without disrupting bomb interactions.
- Opposing squads now field one visible rifle, SMG, shotgun, and sniper whose
  damage, accuracy, range, cadence, reload style, sound, and recoverable ammunition
  come from the shared firearm registry. A faster hunter makes broken contact
  dangerous without shooting through cover, while radar retains only brief
  line-of-sight sightings instead of revealing nearby enemies through walls.
- Broader but collision-safe wall bevels, instanced objective paving, brighter
  material separation, readable team patches, subtle character motion, visible
  muzzle flares, and differentiated carried-weapon profiles soften the remaining
  blockout shapes while retaining the original tactical silhouette language.
- Hand-authored direct and split attacks now rotate carrier and entry duties
  across collision-validated lanes. Deterministic recovery frees blocked bots,
  preserves combat aim while strafing, and resumes dropped-bomb routes near the
  squad's current progress instead of sending the carrier back toward spawn.
- Every firearm now has distinct procedural reload and empty-trigger sounds,
  while the ammunition panel shows simulation-timed reload progress. Switching,
  pausing, buying, death, and round transitions cancel that state immediately;
  shell reloads visibly restart per insertion and remain fire-interruptible.
- Moving combatants now emit fair, distance-attenuated stereo footsteps around
  corners. A rotating source scheduler and per-bot plus squad-wide cadence limits
  prevent packs from becoming an audio buzz, while stopped, blocked, dead,
  distant, frozen, paused, spectator, and terminal-round states remain silent.
- Enemy bullet hits now turn post-armor health loss into a brief, capped accuracy
  disruption that is visible through the live crosshair and clears during a short
  disengage without changing damage, movement, or bot hit chance.
- Plant, defuse, and detonation rewards now follow the intended tactical economy.
  A squad's first consecutive loss produces a deterministic SMG/shotgun light-buy;
  the next loss-bonus round restores its full rifle, SMG, shotgun, and sniper mix.
- Body hits, headshots, kills, and headshot kills now produce distinct prioritized
  confirmations, including while scoped. Player elimination money now respects
  classic weapon identity, from low S90 rewards to high-risk knife rewards, while
  multikills remain capped and settle the round only once.
- Enemy retargeting now uses a typed, non-mutating candidate selector with strict
  player-preference distance bias, numeric ally tie ordering, and alive/visible/
  finite-distance filtering. When initial contact fails, the player and every
  live ally are visibility-tested through the shared world occluders and smoke,
  then the selected target's position, distance, facing, LOS, and bot identity
  are resolved together.
- A null fallback result preserves only the old investigation position while the
  effective combat target becomes null, resetting sight and burst state and
  preventing firing until a real contact is reacquired. Focused selector and
  tracking-transition cases, plus the full 76-test suite, pass alongside lint
  and production build verification; the change shipped privately in version 32.
- An always-scan visibility expansion was declined as outside this bounded
  fallback slice and its per-frame performance budget; the additional rays remain
  conditional on failed initial LOS.
- Player misses now terminate in material-aware sand, plaster, wood, or metal
  feedback. One tested nearest-surface resolver preserves body and cover priority;
  a fixed 32-sprite pool, per-shot shotgun cap, simulation-timed animation, and
  complete disposal keep the feedback bounded without changing damage or collision.
- Thirteen low-contrast façade wear placements now share one deterministic atlas,
  one merged visual-only mesh, and mip-safe UVs. They break up broad repeated walls
  only in high quality, never enter raycast or gameplay collections, and leave all
  collision, routes, sightlines, and objective cues unchanged.
- Hostile bullet damage now briefly tags grounded movement by 10–40%, using the
  stronger current hit instead of stacking and recovering on simulation time at
  55% per second. Air movement, counter-strafing, firearm handling, and non-bullet
  hazards remain unchanged, while invalid damage is neutralized centrally.
- Every firearm now follows a distinct first-person lower, roll, and return pose
  over its authoritative reload clock. A reusable additive overlay keeps bob,
  recoil, equip motion, shell sequencing, freeze time, cancellation, and exact
  neutral resets coherent without changing ammunition or gameplay timing.
- Twelve low-poly mesas and six rounded dunes now break the square exterior
  horizon through two static, high-quality-only instanced draws. Full footprints
  remain outside the arena, every peak clears the coping from central eye height,
  and the fogged scenery never enters collision, visibility, or shot raycasts.
- Plaster, wood, and metal impacts now leave distinct, correctly oriented scars
  for the rest of the round. Three high-quality-only instanced batches cap the
  history at 48 marks, skip loose sand, recycle deterministically, clear before
  the next freeze time, and never enter collision, visibility, or shot raycasts.
- Eliminated bots now follow one of four short deterministic fall poses and
  remain as readable round-scoped bodies instead of disappearing. Their dropped
  weapon stays authoritative, pose motion pauses with play and finishes during
  result review, and living-state filters keep bodies out of combat and movement.
- Committed rifle, SMG, and pistol shots now eject rounded rimmed brass from
  matching viewmodel ports. One fixed 12-instance pool supplies simulation-timed
  spin, gravity, and a restrained bounce in both quality modes, disappears when
  idle, and never participates in gameplay queries.
- Enemy fire, self-frags, and bomb blasts now share a bounded 0.42-second
  first-person death fall before the existing spectator orbit. Lethal authority
  stays immediate, pause and result-review timing remain coherent, pitch stays
  inside live look limits, and dead-player aiming or combat overlays stay off.
- Touching down now preserves airborne firearm spread for 0.2 simulation-timed
  seconds, so jump-peeks remain punishable while the live crosshair communicates
  recovery and settled grounded accuracy remains unchanged.
- Structural meshes now carry subtle deterministic top-to-bottom tone variation,
  while rifle, pistol, SMG, shotgun, and S90 viewmodels use tapered stock and grip
  profiles with lightly textured polymer. The pass changes no collision, sightline,
  draw-call, muzzle, casing, or frame-loop behavior.
- A living attacker can now recover a dropped C4 with the existing interaction
  control. A dedicated prompt gives the objective priority over overlapping
  weapon pickups, and player death, planting, bot recovery, rewards, and round
  resolution continue through their existing authoritative state transitions.
- Stage 71 delivered six classic sidearms with side-correct starters,
  source-correct economy and ammo packs, distinct visuals, and generalized
  drop/pickup replacement.
- Stage 72 delivered distance-driven player presentation, corrected air
  acceleration, and bot acceleration/braking, stride, aim separation, and
  collision-safe transforms.
- Landings now produce one restrained local thud and a 0.2-second viewmodel
  settle derived from the existing accuracy-recovery clock. Camera aim, bot
  hearing, physics, spread, pause behavior, and weapon animation timing remain
  unchanged, and round transitions restore every weapon root exactly.
- Plant and defuse commitments now produce distinct cached mechanical start and
  completion cues. Bot actions are positional only within 20 units, require a
  living player listener, and share a start-cue cooldown; objective timing,
  bot knowledge, round authority, and the existing bomb beacon remain unchanged.
- Opposing bots now expose their real empty-magazine vulnerability through
  weapon-specific positional reload start and commit cues inside 16 units. A
  shared cooldown keeps squad and shell-reload chatter bounded, while dead
  spectators, allies, AI hearing, ammunition, and reload timing remain unchanged.
- Living attackers can now use the existing drop control to place the carried C4
  at their feet for player or squadmate recovery. The objective takes priority
  over a primary on that single request, while freeze time, buying, planting,
  death, same-frame recovery, primary ammunition, and weapon handling stay safe.
- Dead players can now cycle forward through living squadmates after the death
  fall with Arrow Right or the contextual touch control. Stable roster ordering,
  a two-teammate minimum, live readiness checks, and ally-only resolution prevent
  enemy information leaks or interference with result-review timing.
- High-quality combatants now render with smoother one-for-one torso, shoulder,
  arm, and leg meshes while invisible original geometry remains authoritative for
  hits and AI sight. Quality toggles keep exactly one variant visible, hit flashes
  stay synchronized, and a per-bot triangle budget bounds the added silhouette detail.
- Opposing focus fire now admits at most two concurrent bursts, cutting the worst
  stacked opening by a third, while player-bound body damage is trimmed from 0.60
  to 0.54. Rifle and SMG survivability gains roughly one body hit without changing
  enemy-versus-squad damage, ally support, aim, reaction, routes, utility, or reloads.
- The radar now places the player, squad, temporary enemy sightings, and both
  bombsites in one bounded north-up coordinate system. The side-colored player
  arrow follows camera heading, while the existing enemy-sighting policy and all
  combat, movement, and objective authority remain unchanged.
- Player-fired pistols, SMGs, rifles, and sniper rounds can now carry reduced
  weapon-specific damage through one sufficiently thin wooden crate. Material
  depth, firearm range, a second surface, and every non-wood material fail closed;
  entry splinters and hit confirmation remain readable while bots stay fully
  bound to their original line-of-sight rules.
- A player's direct, smoke-aware sighting now becomes delayed, expiring squad
  intel that sends unengaged allies toward distinct nearby search points. Dead
  contacts clear immediately, objective-critical jobs always win, and the shared
  location never changes target selection, sight time, or permission to fire.
- Recruit is now the default bot skill, with Standard and Veteran available from
  the briefing or pause menu and persisted locally. The chosen tier applies on
  the next round and changes only hostile hit odds, reaction time, and concurrent
  bursts against the human player; bot-versus-bot combat and connected-hit
  lethality remain unchanged.
- A living player can now press Z or tap BACKUP to rally available squadmates to
  distinct collision-safe positions around the call location. The simulation-time
  request expires after 6.5 seconds with an 8-second cooldown; direct contact and
  all bomb-critical jobs retain priority, and no enemy information is consulted.
- Raiders now field the hard-hitting K-47 while Blacksite uses the original C-44
  carbine, a same-price service rifle with lower damage and a steadier spray. Both
  weapons keep exact identity through bot loadouts, drops, pickups, retained ammo,
  recoil, reloads, audio, casings, marks, and one-layer wood penetration.
- A squadmate's fresh direct, smoke-aware sighting can now emit one generic
  `ENEMY SPOTTED` radio message. A 4.5-second shared cooldown prevents sustained
  contact spam, NEED BACKUP retains priority, and the message grants no identity,
  position, radar, movement, targeting, or firing authority.
- Recruit hostile accuracy against the human player is reduced from a 0.72 to
  0.56 scale, dropping the close rifle baseline from 61.92% to 48.16%. Connected
  damage, armor, burst cadence, enemy-versus-squad combat, player weapons,
  objectives, Standard, and Veteran remain unchanged.
- Player fire now resolves head, torso, stomach, and leg hitgroups against the
  existing authoritative character proxies. Stomach hits deal 1.25× damage,
  legs deal 0.75×, every firearm keeps headshots above stomach damage, and the
  S90's classic body-kill/leg-survival split is 128 versus 96 before falloff.
- Recruit bots now acquire the player more slowly and land fewer shots: a close
  rifle's player hit chance falls from 48.16% to 39.56%, while a typical rifle
  reaction grows from 0.31 to 0.35 seconds. Weapon damage and higher skills are
  unchanged.
- The first round of each half is now a true pistol round for every bot. The P9
  uses its own bounded aim, range, semi-automatic cadence, reload, audio, model,
  and muzzle placement, while pistol deaths never enter the primary pickup pool.
- Bot defuse kits now respect the same round economy as their weapon loadouts:
  designated CTs retain five-second defuses on full buys, while pistol and eco
  rounds require the full ten-second commitment. T bots can never receive a kit.
- Player equipment now follows the classic $650 Kevlar, $350 helmet upgrade,
  $1,000 assault-suit, and $200 CT defuse-kit economy. Helmet, hitgroup, weapon
  armor-ratio, depletion, explosion, and eligible-survival transitions share one
  tested rule path across live damage and round resets.
- Recruit pressure is restored without weakening fair combat gates: close rifle
  accuracy rises from 39.56% to 58.48%, typical rifle reaction falls from 0.35
  to 0.27 seconds, and two enemies may sustain bounded player-facing bursts.
  Standard and Veteran remain ordered while bot-versus-bot tuning is unchanged.
- Every first-person item now uses cached handed and grip-specific arm geometry.
  Sleeves enter from below the frame, firearm gloves intersect their modeled
  controls, the knife clears the actual camera near plane, and the 966-triangle
  per-arm result stays within explicit two-arm and four-draw budgets.
