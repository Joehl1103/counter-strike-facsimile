# JKH-131 — frozen runtime firearm-verification proposal

Frozen: 2026-09-16. This is a prepared acceptance card, not a runtime result.
It preserves the accepted module checkpoint at `8c4aaa671a6ca85f7472bf442570030479cba434` and does not authorize or contain a shared-caller change.

| Field | Frozen value |
| --- | --- |
| Issue / epic | JKH-131 / JKH-120 |
| Candidate identity | Runtime work starts from accepted integration `266fc5f5f8b06e77eed07170b67cd26db70def47` on `verify/jkh-131-firearms`; every run retains the served revision and SHA-256 identity in its manifest. The earlier source checkpoint `8c4aaa6` remains provenance, not the served candidate. |
| Current inspected caller | The accepted integration's `app/page.tsx` computes player pose, calls `weaponBallistics.shot`, calls `tracePenetratingBullet` from `shoot`, and applies `resolveBulletDamage` to live enemy state. This is a source observation, not runtime proof. |
| Determinism | localhost only; 1280×720, high quality, fixed 10 ms simulation step, controlled seed `1947`, and a fresh page/round for every named case. Timers are judged in simulation milliseconds; `10 ms` is the permitted observation quantization. |
| Reference / approximation | ReGameDLL-CS `781a68ae1c6fb652cf4fbc894970b4fb4dde19f9` as recorded in `CS16_REFERENCE.md`; the project values and finite-AABB penetration are labelled project approximations. No original installation or original-engine measurement is claimed. |
| Existing reusable routes | `?keyboard-playtest=1` provides real keyboard latching; `?playtest-side=t` selects T before round initialization. `visual-tools=1` supplies local controlled replay and read-only snapshots. `lifecycle-qa=1` is lifecycle-only and must not be reused for combat. |
| Current limitation | `FIXED_VISUAL_REPLAY` only equips knife/USP, fires, reloads, moves, and pauses. Its snapshot exposes active weapon/ammo/position and viewmodel reload state, but not armor, special state, ballistic state, accepted/rejected action receipts, raycast/penetration results, or target damage. It cannot demonstrate this card by itself. |
| Boundary | JKH-130 and JKH-144 are accepted into the base. JKH-131 owns this card, its focused tests/driver, `app/firearm-runtime-fixture.ts`, and the narrow localhost-only receipt wiring in `app/page.tsx`. It does not alter `app/game-rules.ts`, visual-tool APIs, assets, global rules, movement/fall/death, skeleton sampling, or budget accounting. Root owns integration, Linear, final verdict, and publication. |

## Evidence classes

**Ordinary-input receipts** are the evidence for player action. The driver uses a real browser keyboard: `KeyF` fire, `KeyR` reload, `KeyV` secondary, `Digit1`/`Digit2` inventory selection, `KeyW` movement, `ControlLeft` crouch, and `Space` jump. It must wait on the live simulation clock, never call `shoot`, `selectWeapon`, `commitReload`, or a visual-tool `dispatch` action directly. A held `KeyF` is the automatic-control receipt; a press/release is the semi-control receipt.

**Controlled setup receipts** merely establish a reproducible round: fixed loadout, full magazine plus sufficient reserve, player pose/aim, and a named static target. They are retained separately and may not count as action evidence. The subsequent equip, fire, reload, movement, scope, and secondary action must be ordinary input through the production queue and `shoot` caller.

Existing `dustlineVisualTools.prepareReplay` remains a useful controlled USP regression/control. Its `dispatch` route is not an ordinary-input receipt, and accelerated replay is not real-time performance or audio evidence.

## Minimum later fixture and diagnostics

The ordinary buy/inventory route and existing map do not provide a reproducible named target matrix, so this runtime candidate adds one localhost-only, explicitly enumerated fixture:

`?firearm-runtime-fixture=1&case=<known-case-id>`

It must reject non-localhost, absent/unknown case IDs, and arbitrary numeric/location/material input. A case registry may create only the documented loadout and static range target below; it must not expose a generic state setter, arbitrary ray, arbitrary player transform, or direct module call. It must leave the production `queueGameplayAction → shoot → raycaster → tracePenetratingBullet → resolveBulletDamage` path intact.

Add one read-only DOM JSON receipt, `#jkh-131-firearm-runtime-receipt`, refreshed after setup and each action. Do not extend the visual-tool interface. Each entry must contain:

- served build identity, case ID, seed, viewport/quality, simulation time, and monotonic action sequence;
- setup identity and `setupComplete`, separately from input event type and `queued`/`committed`/`rejected` outcome;
- player active weapon, magazine/reserve, equip-ready time, reload phase/deadline, pose (`speed`, crouch, grounded, scoped, silenced, burst), and ballistic accuracy/punch/shots;
- special snapshot (burst deadlines, silencer values, zoom/resume deadline); and
- for every fired pellet/ray: caller label `shoot`, ray origin/direction, target/world distances, hit group, surface material/collider identity, trace result/exits/raw damage, and target health/armor/helmet before and after.

This is narrowly diagnostic: it observes decisions and live state already made by the caller. Screenshots, current visual snapshot JSON, browser console/page errors, and the raw DOM receipt all remain required. The receipt cannot be the only oracle: ammo/time/state/target deltas and ray data must agree.

## Frozen coverage matrix

Each of the eleven rows requires a fresh controlled setup, an ordinary-input trace, and a receipt for standing, moving, crouching, and airborne poses. The pose receipt must show the stated live pose at the committed shot and its spread/ballistic state; the source-card numerical cone and recoil oracle remains in [JKH-131.md](JKH-131.md). For cadence, an immediate second request is a negative control with unchanged magazine/shot count; the first accepted follow-up cannot precede the listed 10-ms-tick-quantized minimum.

| Firearm | Ordinary input and accepted timing | Reload / equip runtime expectation |
| --- | --- | --- |
| AK-47 (`rifle`) | held `KeyF`; no second committed shot before 100 ms | 30-round magazine, 2450–2460 ms reload, 520–530 ms equip |
| M4A1 (`carbine`) | held `KeyF`; no second committed shot before 90 ms | 30, 3050–3060 ms, 520–530 ms |
| MP5 (`smg`) | held `KeyF`; no second committed shot before 80 ms | 30, 2630–2640 ms, 420–430 ms |
| M3 (`shotgun`) | press/release `KeyF`; no second shot before 880 ms | 8 shells; start at 550–560 ms, each insertion at 450–460 ms, then 1500–1510 ms pump |
| AWP (`sniper`) | press/release `KeyF`; no second shot before 1450 ms | 10, 2500–2510 ms, 760–770 ms |
| Glock 18 (`glock18`) | semi 150–160 ms; burst initial shot plus two 100–110 ms follow-ups | 20, 2200–2210 ms, 320–330 ms |
| USP (`usp`) | press/release `KeyF`; no second shot before 150 ms | 12, 2700–2710 ms, 320–330 ms |
| P228 (`p228`) | press/release `KeyF`; no second shot before 200 ms | 13, 2700–2710 ms, 320–330 ms |
| Desert Eagle (`deagle`) | press/release `KeyF`; no second shot before 300 ms | 7, 2200–2210 ms, 320–330 ms |
| Dual Elites (`elite`) | press/release `KeyF`; no second shot before 80 ms | 30, 4500–4510 ms, 320–330 ms |
| Five-SeveN (`fiveseven`) | press/release `KeyF`; no second shot before 200 ms | 20, 2700–2710 ms, 320–330 ms |

For every row, selection must produce an equip receipt. A fire request before `equipReadyAtMs` must leave magazine, ballistic shot count, and target state unchanged; one after readiness must decrement exactly one round (except Glock burst’s scheduled two subsequent commits). Magazine reload starts without moving ammo, then transfers the exact missing rounds at its deadline. M3 must show no transfer before the first insertion, exactly one shell/reserve transfer per insertion, and a `KeyF` interruption after one loaded shell that cancels the reload and fires through the normal caller.

## Special-action receipts

These are additional ordinary `KeyV`/`KeyF` cases on the same runtime base:

| Case | Independently checkable expectation and negative control |
| --- | --- |
| Glock burst | `KeyV` enables burst and locks further secondary changes for 300 ms. One ordinary fire consumes the initial round plus follow-ups at 100 and 200 ms; empty ammo, reload, switch, death/reset, or explicit cancellation clears pending follow-ups. |
| USP silencer | `KeyV` changes attachment intent, with the 3000–3010 ms lock visible; an interruption before deadline restores the prior state. A completed toggle persists through selection and changes the receipt’s damage branch from 34 to 30. |
| M4A1 silencer | Same interruption/persistence proof at 2000–2010 ms; completed state changes the observed direct branch from 32 to 33 and range modifier to the project 0.95 value. |
| AWP scope | Three `KeyV` inputs separated by 300 ms demonstrate unscoped → 40 FOV → 10 FOV → unscoped. A scoped ordinary shot unscope-resets then restores the prior stage at 1450–1460 ms; reload/switch cancellation prevents restoration. |
| M3 shell reload | Covered above, with a second negative control proving a fire before any inserted shell does not bypass the empty-magazine reload behavior. |

## Damage, hit-zone, and material cases

The source-card direct trace includes `0`, `12.5`, and `25` scene units (0, 500, and 1000 source units). A ray origin cannot honestly use a zero-distance target, so the runtime fixture uses a named nearest-safe direct control (with the actual target distance recorded), plus exact 12.5 and 25 scene-unit center-ray cases. For every firearm, ordinary input must produce a torso receipt at each of those three runtime cases and four hit-group receipts at 12.5. Compare raw trace damage before armor with the frozen project formula evaluated at the receipt's actual target distance: non-M3 `floor(base × rangeModifier^(sourceDistance/500)) × group multiplier`; M3 uses its nine actual pellet rays and its project linear range branch. The observed health delta can be lower than summed raw pellets only where a kill terminates further practical observation; retain the per-pellet trace to make this explicit.

At 12.5, repeat torso and head with no armor, vest/no helmet, and vest/helmet. Receipt assertions are target health, armor, helmet, raw traced damage, and `resolveBulletDamage` before/after; a headshot without helmet is the negative armor control. This tests live hit meshes and caller use, not a standalone `combat-damage` invocation.

Material cases use named static slabs in front of a torso target, with actual raycast collider IDs and returned trace exits:

- every weapon: direct target control and an over-thickness/blocked control;
- count-one weapons (MP5, M3, Glock, USP, P228, Elites, Five-SeveN): no qualifying wall exit;
- AK, M4A1, and Deagle: one qualifying thin wood exit, then a second-wall/reused-collider rejection;
- AWP: two qualifying thin wood exits, then a third-wall rejection; and
- a 0.20-scene-unit wood slab is the qualifying exit control; 0.20 metal and 0.30 concrete slabs are blocked controls. The static collider's measured entry/exit distances must be retained, so floating-point geometry cannot silently change a result. These use the project material constants and finite-AABB exits, not a claim of original collision equivalence.

## Run protocol and retained outputs

The runtime harness is `scripts/verify-jkh-131-firearm-runtime.mjs`. It drives the browser and reads the DOM receipt, but does not introduce a test framework or direct gameplay calls. It writes only to a fresh ignored directory `outputs/jkh-131/runtime/<timestamp>-<served-sha>/`:

- command, Node/npm/browser/platform versions, origin/port, source hashes, served revision, seed/settings, and case registry identity;
- raw setup receipt, chronological ordinary-input receipt stream, screenshots, snapshot JSON, and target-state before/after data;
- console/page/network errors, negative-control evidence, and a machine-readable pass/fail report that names every case; and
- an explicit distinction between controlled replay, controlled setup, ordinary input, and any unavailable case.

The harness rejects a mismatched served revision/hash, browser/page errors, missing receipt field, case reuse after an unapproved reset, or a result inferred only from source text. Runtime work begins only after the accepted base is serialized. Full `npm test` and performance work still require a coordinator-confirmed quiet window. After runtime receipts, fresh independent review remains required for JKH-131/JKH-120 acceptance.

Current bounded runtime-observer coverage is narrower than this card: direct,
unarmored rays are checked against independent source-card damage values at each
observed ray distance, then against the expected health/armor/helmet result.
The observer labels armored resolution and wall-attenuated raw-damage numbers
as unsupported until their independent expected values are encoded. Successful
wall controls retain topology/state-chain checks; blocked multi-wall controls
inspect pellet 0 only and do not establish all-pellet coverage.
