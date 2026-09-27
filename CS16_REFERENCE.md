# CS 1.6 reference and capture ledger

This ledger supports [the active plan](CODEX_PLAN_CS16_FACSIMILE.md).
**Working target: documented approximation. Exact original equivalence unverified.**

The user has no original installation or recordings (2026-09-13). Original
capture below is optional future validation, not a prerequisite to implementation.
Correctness checks, explicit project rules, and sourced approximate mechanics
now govern acceptance. Do not claim original-build measurements.

Sources consulted for the alternate oracle:

- [Valve Half-Life movement source](https://github.com/ValveSoftware/halflife/blob/master/pm_shared/pm_shared.c): engine background, not a CS 1.6 measurement.
- [ReGameDLL_CS](https://github.com/rehlds/ReGameDLL_CS): reconstructed CS server behavior with enhancements; not an untouched original build.

These are discovery links, not frozen numeric fixtures. Pin the revision and
relevant behavior before using a value. The fixed 100 Hz scheduler is the
project's engineering choice, not a claim about the original client clock.

## Available material, inspected 2026-09-13

| Source | Provenance and permitted interpretation |
| --- | --- |
| `outputs/hands-qa/references/user-ak-reference.webp` | Previously supplied user still image; build/settings unknown. Visual hand/viewmodel reference only. |
| `outputs/hands-qa/references/user-m4-reference-1.jpeg` | Same limitations. |
| `outputs/hands-qa/references/user-m4-reference-2.jpeg` | Same limitations. |
| `outputs/graphics-review/reference/counterstrike-reference.jpg` | Local reference image; original provenance/build not established. Not movement evidence. |
| Local Steam `steamapps/libraryfolders.vdf` | Only default library registered, no installed apps listed; no original executable available there. |
| `app/game-rules.ts` | Current Dustline implementation; SHA-256 in each measurement report. This is the candidate, never the target reference. |

Ignored output files must be rechecked on another machine or resumed run. Their
presence alone does not establish provenance or permission to redistribute them.
ReGameDLL and underlying Half-Life source may inform hypotheses, but neither
replaces measured original CS 1.6 behavior.

## Repeat the current-build measurement

Run from the repository with the installed Node version:

```sh
node scripts/measure-movement.ts
node --test tests/movement-measurement.test.ts
```

For the fixed-step candidate, run `node scripts/measure-fixed-movement.ts`.
This now uses the extracted production player-physics controller and movement
clock, with an unobstructed flat-floor adapter.
The previous command deliberately retains the variable-step primitive baseline;
it is not a claim that the current page still integrates at a variable step.
P1a measured run distance is 4.3010104535382485 and release distance is
0.8735999999999997 scene units at all three rates, each with 200 ticks.
Those values validate update-rate independence for the scheduled straight run,
not equivalence to original CS 1.6 or arbitrary live input timing.

The first command emits raw JSON samples, source hashes, summary distances and
30/60/144 Hz deltas. Save stdout to a new attempt's evidence path when recording
a candidate. Two identical executions must produce identical JSON. Use the
same Node version when comparing byte-for-byte outputs. Existing attempt evidence
is in `outputs/cs16/p0/attempt-1/`. It is a pure-function baseline, not live play.

## Optional original-build capture for stronger future validation

Record executable/build identity and checksum, acquisition source, date, map,
launch options and movement/server/client settings. Record weapon, stance,
starting position and heading, display size/FOV, input-edge schedule and capture
clock. Choose a flat unobstructed route long enough to run for one second and
stop; reset the exact starting state between trials. Retain unedited video/demo
and timestamped positions or other calibrated world-distance observations.

Repeat at least three trials per setup to characterize capture noise. Record
the sampling interval and coordinate resolution; derive and freeze tolerance
before candidate changes. If the capture cannot resolve acceleration or stopping,
improve the capture method instead of widening the threshold. Freeze one scene
unit to original world-unit conversion using independent calibration; do not
fit a separate scale at each frame rate or to each desired result.

Once these inputs exist, record the original run/release distances, time to
full speed and time to stop, compare the same input sequence, and freeze the
P1 acceptance card. Current values cannot fill missing original measurements.


## Dust II working topology

Root inspected [this public annotated 1.6 overview](https://cs18.ru/uploads/posts/2010-10/1287669989_de_dust2.jpg)
on2026-09-13. Its host page is [cs18.ru map schematics](https://cs18.ru/shemi-maps/).
The screenshot/build identity is not verified; it is a visual topology reference,
not an original measurement and is not copied into shipped assets. The P2 layout
will rotate that overview into T-spawn-south orientation and recreate geometry.
Routes: T→long doors→long→A; T→top mid→mid→CT; mid→catwalk/short→A;
T→upper tunnel→B; mid→lower tunnel→stairs→upper tunnel; CT→B doors→B;
CT→A ramp→A. Pit is lower than long; catwalk/A and upper tunnel/B have
height changes relative to adjacent routes. Exact distances, slopes and cover
positions are project choices. Researcher's guide PDF was too large for root's
web reader; it is not treated as independently verified evidence.

## Weapon state reference frozen for P3

ReGameDLL-CS tag5.30.0.814, commit
`781a68ae1c6fb652cf4fbc894970b4fb4dde19f9` is a public reconstruction with fixes,
not an original binary capture. Read-only source audit by Terra dust2_reference.
Source root:
https://github.com/rehlds/ReGameDLL_CS/tree/781a68ae1c6fb652cf4fbc894970b4fb4dde19f9/regamedll/dlls

Files: `wpn_shared/wpn_glock18.cpp`, `wpn_usp.cpp`, `wpn_m4a1.cpp`, `wpn_awp.cpp`,
`wpn_m3.cpp`, `wpn_knife.cpp`; shared `weapons.cpp`/`weapons.h`.

| Behavior | Frozen reconstruction choice |
| --- | --- |
| Glock | Mode toggle300ms; burst cycle500ms; follow-up shots at100ms and200ms; clip depletion stops continuation |
| USP | Default adjustment3000ms (FIXES alternative3130ms excluded); damage34/30 unsilenced/silenced, range modifier0.79; silenced muzzle flash absent |
| M4A1 | Adjustment2000ms; damage32/33, range modifier0.97/0.95; silenced muzzle flash absent |
| AWP | Zoom90→40→10→90; toggle300ms; shot cycle1450ms, restore previous zoom after cycle |
| M3 | Reload start550ms, insert450ms per shell, pump1500ms; shot interrupts reload; shot cycle875ms |
| Knife | Swing range48units, stab32units; stab65damage/backstab×3, cooldown1000ms miss/1100ms hit; swing350ms miss/400ms hit |

Unit conversion remains the project40units/scene-unit convention. Camera angle
conversion and generic recoil/range/armor behavior require their own working
choices; the state table alone does not validate those systems. Knife swing
first/repeat damage condition must be checked directly before porting. Do not
silently select compile-flag alternatives or call these original measurements.


### P3b pinned firearm audit

Independent Terra audit of ReGameDLL-CS commit
`781a68ae1c6fb652cf4fbc894970b4fb4dde19f9`, using
[weapontype.h](https://github.com/rehlds/ReGameDLL_CS/blob/781a68ae1c6fb652cf4fbc894970b4fb4dde19f9/regamedll/dlls/weapontype.h),
[weapons.h](https://github.com/rehlds/ReGameDLL_CS/blob/781a68ae1c6fb652cf4fbc894970b4fb4dde19f9/regamedll/dlls/weapons.h)
and per-weapon PrimaryAttack/Fire functions. Values are reconstruction defaults.
Columns: price, clip/reserve, ammo pack price/count, damage, range modifier,
reload milliseconds, fire interval milliseconds.

| Weapon | Price | Clip/reserve | Ammo $/count | Damage | Range | Reload | Fire |
|---|---:|---|---|---|---|---:|---:|
| AK-47 |2500|30/90|80/30|36|.98|2450|95.5|
| M4A1 |3100|30/90|60/30|32/33 silenced|.97/.95 silenced|3050|87.5|
| AWP |4750|10/30|125/10|115|.99|2500|1450|
| MP5 |1500|30/120|20/30|26|.84|2630|75|
| M3 |1700|8/32|65/8|20|legacy linear buckshot|phased P3a|875|
| Glock |400|20/120|20/30|25|.75|2200|150 semi|
| USP |500|12/100|25/12|34/30 silenced|.79|2700|150|
| P228 |600|13/52|50/13|32|.8|2700|200|
| Desert Eagle |650|7/35|40/7|54|.81|2200|300|
| Elite |800|30/120|20/30|36|.75|4500|75|
| Five-SeveN |750|20/100|50/50|20|.885|2700|200|

Elite REGAMEDLL_FIXES alternative122ms is excluded. C4 source defines3s arming;
CGrenade::DefuseBombStart defines5s with kit/10s without. Existing armor weapon
multipliers match audited defaults (base armor ratio .5).
P3a camera currently applies40/10 as Three vertical FOV: a project framing
approximation, not a claim of original horizontal projection equivalence.
Knife swing uses15 damage as an explicit project branch; original first-swing
quirks remain unverified. Silencer sound/noise attenuation is recreated tuning.


P3b range refinement: [cbase.cpp](https://github.com/rehlds/ReGameDLL_CS/blob/781a68ae1c6fb652cf4fbc894970b4fb4dde19f9/regamedll/dlls/cbase.cpp)
FireBullets3 truncates integer damage after multiplying pow(modifier,segment/500).
M3 legacy FireBullets uses9 pellets/3000-unit range and integer20*(1-fraction).
[player.cpp TraceAttack](https://github.com/rehlds/ReGameDLL_CS/blob/781a68ae1c6fb652cf4fbc894970b4fb4dde19f9/regamedll/dlls/player.cpp)
then applies head4,torso1,stomach1.25,leg.75 before armor. Original proposed M3 .7
modifier was superseded before coding after this source check.

### Recoil/accuracy source audit (P3c preparation, not implemented acceptance)

Same pinned reconstruction commit; shared `weapons.cpp` KickBack/ItemPostFrame,
`wpn_shared/wpn_ak47.cpp`, `wpn_m4a1.cpp`, `wpn_mp5navy.cpp`.
Source calculates current spread before increment/recomputation of accuracy.
AK accuracy=min(n³/200+.35,1.25), M4=min(n³/220+.3,1), MP5=min(n²/220.1+.45,.75).
Deploy/reload n=0; initial accuracy AK/M4=.2, MP5=0.
AK spread air=.04+.4a, speed>140=.04+.07a, otherwise .0275a.
M4 air=.035+.4a, speed>140=.035+.07a, otherwise .02a unsil/.025a sil.
MP5 air=.2a, ground=.04a. Speed units are source units/second.
Release after automatic fire caps n at15, first decrement now+.4s, then one
per .0225s. Default branch does not reset accuracy when n reaches0; FIXES does.

KickBack tuples (upBase,lateralBase,upModifier,lateralModifier,upMax,lateralMax,
directionChange):
AK run(1.5,.45,.225,.05,6.5,2.5,7),air(2,1,.5,.35,9,6,5),
crouch(.9,.35,.15,.025,5.5,1.5,9),stand(1,.375,.175,.0375,5.75,1.75,8).
M4 run(1,.45,.28,.045,3.75,3,7),air(1.2,.5,.23,.15,5.5,3.5,6),
crouch(.6,.3,.2,.0125,3.25,2,7),stand(.65,.35,.25,.015,3.5,2.25,7).
MP5 air(.9,.475,.35,.0425,5,3,6),run(.5,.275,.2,.03,3,2,10),
crouch(.225,.15,.1,.015,2,1,10),stand(.25,.175,.125,.02,2.25,1.25,10).
First shot uses bases; later U=base+n*modifier,L=base+n*modifier.
Pitch decreases U clipped at -upMax, yaw +/-L clipped +/-lateralMax.
Direction flips after shot with probability1/(directionChange+1).
These require seeded random tests; old fixed point sequences are not equivalent.

AWP spread air.85,speed>140 .25,speed>10 .1,crouch0,stand.001; add.08 unscoped.
Default pitch punch-2degrees. M3 fixed cone; punch random4..6ground/8..11air.
Pistol accuracy update a-=(threshold-dt)*scale, clamp to bounds:
Glock(.325,.275,.6,.9),USP(.3,.275,.6,.92),P228(.325,.3,.6,.9),
Deagle(.4,.35,.55,.9),Elite(.325,.275,.55,.88),Five-SeveN(.275,.25,.725,.92).
Pistol default pitch punch-2degrees. Release resets shotsFired; reload/deploy
restores top accuracy. Pistol per-stance spread coefficients still require audit.

Pistol spread coefficients air/move/crouch/stand, each times(1-accuracy):
Glock semi1/.165/.075/.10,burst1.2/.185/.095/.30;
USP sil1.3/.25/.125/.15,unsil1.2/.225/.08/.10;
P2281.5/.255/.075/.15;Deagle1.5/.25/.115/.13;
Elite1.3/.175/.08/.10;Five-SeveN1.5/.255/.075/.15.
Branch priority air, speed>0, crouch, stand. M3 cone(.0675,.0675,0).
KickBack AK/M4 priority speed>0 BEFORE air, then crouch/stand; MP5 air first.
Compatible engine background only: Valve Half-Life SDK commit
b1b5cf5892918535619b2937bb927e46cb097ba1, pm_shared/pm_shared.c PM_DropPunchAngle
normalizes punch vector of length L, decays to max(L-(10+.5L)*dt,0), rescales.
ReGameDLL does not contain engine punch decay; exact CS1.6 equivalence unverified.

P3c random seeds1601(punch),1602(cone), initial lateral sign+1 are explicit project replay choices. They reproduce distributions/branches, not the original engine random sequence. Cone sample uses triangular rejection in world camera basis. Punch is separate from movement yaw. Old landing/suppression spread penalties were removed in favor of sourced stance branches; landing camera recovery remains.

## P3d penetration oracle

Pinned ReGameDLL-CS `781a68ae1c6fb652cf4fbc894970b4fb4dde19f9`,
[FireBullets3](https://github.com/rehlds/ReGameDLL_CS/blob/781a68ae1c6fb652cf4fbc894970b4fb4dde19f9/regamedll/dlls/cbase.cpp).
Count decrements at entry: count1 never continues behind a wall; AK/M4/Deagle2
allow one continuation, AWP3 allows two. M3 legacy buckshot has none.
Power/distance(source units):7.62=39/5000,5.56=35/4000,.338=45/8000,
9mm=21/800,.45=15/500,.357=25/800,.50=30/1000,5.7=30/2000.
Material power/damage:metal.15/.2,concrete.25/.5,wood1/.6,grate.5/.4,
vent.5/.45,tile.65/.3,computer.4/.45,default1/.5. Each continuing BSP trace
halves remaining range; damage modifier applies to later targets, not entry.
Source performs a forward power skip, not physical exit/thickness testing.
Project finite-AABB reconstruction explicitly differs: permit an exit only when
thickness≤power*material/40, segment entry≤penetration distance/40, remaining
count>0 and finite exit. Continue from exit+.025, no repeated collider. Static
proxies stand in for BSP; characters terminate. Plaster maps to concrete as an
approximation, sand uses default. Sequential range truncation is required.

P3d ordering correction from follow-up source audit: power is integer state,
initialized once then truncated after every material scale, persisting into the
next wall. Damage likewise truncates after both segment falloff and material.
Damage modifier starts.5 but concrete/default retain the previous wall modifier;
other materials replace it. Thus wood→concrete keeps.6 for both continuations.
The table's concrete/default.5 describes an initial wall only. AABB thickness
eligibility uses this updated integer power, not a fresh bullet base each wall.


## P4g — project hearing oracle (2026-09-14)

`app/bot-hearing.ts` defines a finite, immutable emission snapshot and shared
next-tick listener query. This is project AI behavior, not an original-bot
measurement. Source positions never follow actors after emission. All actor
sides use strict3D radius and millisecond expiry. Player and bot gunshots retain
`FIREARMS.noiseRadius/noiseMemory`; player silencer scales radius0.45. Player
walk/run steps retain radius9/18 and lifetime0.7/1.15s; crouch is silent. Moving
bots above0.45scene units/s emit radius18/lifetime1.15s at the existing
`getBotFootstepCadenceMs` cadence, separately from player-facing audio. Objective
starts emit radius17/lifetime0.45s for either side. Newest valid sound wins;
same-time ties use distance then latest event ID. Investigation uncertainty is
min(2.4,radius*0.08)scene units and cannot extend past the event expiry. Source
movement/death, listener side, invalid values, next-tick delivery, exact radius/
expiry boundaries and clear/reset are fixture-verified. Broader acoustic wall
attenuation and original-game hearing fidelity remain unspecified/unverified.


## P4h — shared explosive approximation

All actors share HE radius9/max115, C4 radius24/max500, distance exponent1.35,
world-cover factor0.35 and existing explosion armor rules. These retained
project coefficients are not measured original-game equivalence. HE friendly
fire is disabled except source self; flash and C4 affect every living actor.
Flash uses shared radius24/max3.2s exposure with facing/LOS. Blast points are1.1
scene units above feet. Every casualty is computed before death/drop callbacks;
HE settlement happens after the population, C4 defers to bomb-detonated priority.
Only opposing HE casualties earn grenade credit; self/C4 do not. Source identity
and side travel with the projectile, so death of a thrower does not erase credit.


### P4i owned utility policy (project approximation, 2026-09-14)

Both squads use ownedHE/smoke/flash from direct contact or expiring remembered
scalar coordinates. Selection5–20units, sight0.55s or validmemory; HEfirst≤16;
smoke≥7 with suppression≥0.35 or memory; flashdirect≤14. Windup0.38s snapshots
static map support+0.16 at observed x/z; actual planting/defusing cancels along
with death/blind/reload. Success spends after common insertion,4sretry; failure/
cancel retainsinventory,1sretry. Player+bots share2projectiles and2smokesincluding
inflight reservations. Gravity12.5, botvertical4.1, horizontal ballistic landing
speed capped12.5; fuseHE1.85/smoke1.45/flash1.5. Cap-limited throws may landshort.
No originalbot measurements claimed; evidence outputs/cs16/p4i/attempt-1.


### P4j geometric bot shots (project approximation, 2026-09-14)

Both squads sample the shared weapon spread/recoil with perbotseededstate;
actualaimYaw and confirmed contactheight minus0.25 define baseaim. Skillcone
recruit0.055/standard0.025/veteran0.01 plus(1-clampedskill)×0.025 andclamped
suppression×0.035, independent of shooter/targetteam. Perpellet nearestworld or
character intersection defines hitgroup/damage; friendlycharacters stoprays.
Unrenderedhumanproxy at authoritativefeet:0.30radius cappedcylinder0.8h plus
head sphere0.9hcenter/0.1hradius; h=1.8stand/1.2crouch. Cylinderbands<0.36hleg,
<0.54hstomach,otherwise torso. Botexistinghitmeshes retained. No Bernoulli
hitgrants, randomizedhitgroups or inventedtracermiss offsets. Originalaimand
humananatomy fidelity notclaimed. Evidence outputs/cs16/p4j/attempt-1.


### P4k bot penetration (shared reconstructed rules, 2026-09-14)

Bot and player pellets use tracePenetratingBullet with the existing pinned
material, range, wallcount andfiniteAABBexit rules. Analyticalhumanroots honor
absolute near/far. Friendlybodies terminal/undamaged; firstphysicalcontact
anchors tracer. One resolveBulletDamage primitive appliesarmor to already
range/material/hitgroup-adjusted rawdamage for allactors. No second damageroll
or multiplier. Evidence outputs/cs16/p4k/attempt-1.


### P4l bot AWP adapter

Bots now use the shared AWP special-action clock:300ms scope adjustment,1450ms bolt-cycle resume. AI aim hold at direct sight≥0.25s and range≥8, scope only after speed≤0.08, is an explicit project approximation. Both squads keep tracking during hold, scoped state feeds spread, and reload/switch/death/reset cancels pending scope. Accepted4/4 project criteria; outputs/cs16/p4l/attempt-1 contains fixtures, independent review, and a normal High pistol-round regression. No original bot-equivalence or live AWP encounter claimed.


### P4m bot Glock burst adapter

Both squads select burst on direct contact5–18 units with sight≥0.25s, an explicit AI approximation. Shared300ms mode lock,+100/+200ms continuation deadlines and≥500ms opening cadence. Queued shots retain target identity and current direct-contact legality, consume actual cartridges, and use the shared geometric shot path and burst spread. Accepted4/4 project criteria, full578/578 and independent203/203, normal Performance round. Specific bot deadline/cancel proof is deterministic; live player bursts, bot combat/ammo and human bullet damage captured. Evidence outputs/cs16/p4m/attempt-1.


### P4n bot silencers

Both squads attach owned USP/M4 silencers during quiet movement using shared3s/2s locks. One attachment state drives shared spread/penetration, hearing radius×0.45, local audio×0.35 and zero muzzle flash. World-only metal cylinders follow the existing barrel sockets; no new textures/hit proxies. Quiet-contact AI policy and visual primitive are explicit approximations. Accepted4/4 project criteria; full583/583 and independent208/208. Complete High round plus partial second round prove USP/M4 attachment states and models, human death/spectator and bot grenade kill after human death. outputs/cs16/p4n/attempt-1.


### P4o shared difficulty

Both squads and all target actors use common reaction multipliers1.35/1.10/1.00 and simultaneous-burst allowances2/2/3 for Recruit/Standard/Veteran. Existing project presets retained; target-specific branches and ally-only offsets removed. These values are explicit project approximations, including the quota exception to the earlier aim/reaction-only architectural wording. Accepted3/3; full586/586, independent211/211, normal Performance round. Evidence outputs/cs16/p4o/attempt-1.

## Bot ground movement approximation (P4p)

Bots use the same production ground acceleration/friction primitive as the player.
AI route/combat choices request a speed, capped by the active weapon's movement
limit; scoped AWP uses2.175sceneunits/s. This preserves slower tactical requests.
Shared100Hzticks, zero-wish friction, blocked-axis clearing, existingnavigation
andcosmetic pose normalization remain distinct concerns. This is a project
physics-parity oracle; originalbotmovement wasnotmeasured. Verticalmotion/hulls/
stance parity is separate. P4p normalmechanics round useddocumentednative713x1106
because the currentin-app fixedviewport capture produced corruptsurfaceimages;
thisdoesnotestablish1280x720 orP6 1080p visualacceptance.

## Bot hull and support approximation (P4q)

Standing bots now use the player's body resolver, hull, gravity14.5, map volumes
and ramps. Recovery probes are pure; a bot commits motion once per100Hztick.
Unsupported bots fall and retain horizontal momentum withnoAIairsteering. Body
support drives shotspread, stride, animation andfootstepeligibility. Actorspacing
is .82 forbot/playerandbot/botwithverticaloverlap; deadactorsareexcluded. Foot
contact usescurrentfeetheight. Spawn/resetanddeathplacementretainmapanchors.
Playerjump/crouch traces remainunchanged. Botjump/crouch/aircontrolandoptional
melee/voluntaryweaponswitchesaredeclaredcapabilityapproximations, notoriginal
fidelityclaims. P4qphysics/normalPerformance-round evidence isunderoutputs/cs16/p4q.


## Objective knowledge approximation (P4r)

Bot decisions use frozen scalar snapshots from shared120-degree sight28units,
drop hearing10units or planted beeps18units, and living same-side reports.
Sound sampling is once on the next fixedtick. Lifetimes: dropped15s, planted45s,
carrier3s; reports never extend expiry. No global CT retake broadcast or hidden
carrier tracking. Own planted location can be reported; a carrier does not
continuously broadcast itself. Navigation uses remembered coordinates; physical
pickup/defuse still require true proximity. Fixtures/independent review accepted;
normal round mechanics ran, but its native viewport changed midrun. Stable-size
visual acceptance remains open, and no original behavior equivalence is claimed.

## P5a appearance/audio pilot — partial, performance blocked

The local reference `outputs/graphics-review/reference/counterstrike-reference.jpg`
has unknown build/provenance and was inspected for broad composition only:
stone/sand/timber, amber numerals, circular green radar and dark USP. It is not
shipped and cannot establish original fidelity. Existing material assets and
the licensed Vanguard CT/T model are reused; `public/assets/characters/SOURCE.md`
and existing texture provenance remain authoritative. Wall shells use cut stone
and floor/ramp shells use sand. Physical materials, volumes, navigation and
weapon geometry are retained.

HUD policy hides enemy radar contacts and remote objective-action detail,
removes hit markers, and keeps the player's own plant/defuse progress. These
policies are fixture/source verified. Full HUD and model/action visual acceptance
remain unverified because the native capture is cropped. Menu branding and
further map detailing remain outside this first active-HUD pilot.

`app/classic-usp-audio.ts` authors original procedural fire, dryFire, reloadStart,
reloadCommit and bodyImpact sounds. No original recording is imported. Live
durations are .085/.027/.070/.052/.045 seconds; existing gain, spatial playback,
silencer and gameplay timings are retained. WAVs under
`outputs/cs16/p5a/attempt-1/audio-runtime` use the same generator and are the
current review bank. Earlier `audio-review` files have superseded longer defaults
and remain diagnostic evidence. Signals pass finite/bounded/distinct/repeatable
checks at44.1/48kHz; auditory quality and original acoustics are not verified.

Current manifest and limitations: `outputs/cs16/p5a/attempt-3` and the plan's
P5a measured record. Full suite610/611; animation p95 .5959ms fails <.5ms. Pilot
status is blocked after the frozen final bounded attempt, not accepted as P5.

### P5b review correction

The restored1280x720/100% capture setup exposed the clock/caption overlap and a
legacy review camera outside the map. The clock now has dark edge contrast and
6px measured separation; the shared review origin[0,3.68,30] sits1.68m above flat
T-spawn ground. The3/6m subject lanes pass map-support/occlusion fixtures. Full6m
CT/T and USP action captures are under outputs/cs16/p5b/attempt-1, with a normal
High round. These improve project visual acceptance, not original equivalence.
The P5a timing gate remains independently blocked; broader P5/P6 work remains.

## P5c authored interaction sound bank

`app/classic-interaction-audio.ts` provides58 original deterministic source
samples:44 firearm actions across11 weapons, plus14 knife/grenade/C4 actions.
The four USP action sources delegate to the unchanged accepted USP generator.
All other sources combine seeded noise, authored resonances and envelopes. No
game recordings were imported. Seeds are derived from the event key and variant.

`node scripts/export-classic-interaction-audio.ts <directory>` exports48kHz
16-bitmono WAV sources at the actual runtime durations and a SHA256 manifest.
These files are before playback filters, gain, positional attenuation and
supplementary tones; they are engineering evidence, not a full game mix or
listening acceptance. Approximation only; acoustic equivalence is unmeasured.
