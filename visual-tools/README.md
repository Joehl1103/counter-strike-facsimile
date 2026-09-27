# Counter-Strike visual tools

Local tools for `games/counter-strike`. Start the existing game with `npm run dev`
and use the URL printed by that server. The verified server for this run was
`http://localhost:3000`. None of these commands publishes the game.

## Three main operations

### 1. Preview an asset in the game

```sh
npm run visual:preview -- --url http://localhost:3000 --weapon carbine --action reload --times 0,250,500,1000,2000
npm run visual:preview -- --url http://localhost:3000 --weapon rifle --action idle --times 0 --skeleton --width 960 --height 720
npm run visual:preview -- --url http://localhost:3000 --mode character-close --pose walk --distance 6 --times 0,250,500
```

Times are milliseconds. Each invocation creates a new directory under
`outputs/visual-tools/`, containing original PNGs, visible DOM text, a capture
manifest, actual camera/FOV/viewport, lighting, geometry budgets, bone positions,
material summaries, and browser errors. Skeleton overlays appear for rigged
assets; rigid meshes have no skeleton to draw. `--out NEW_DIRECTORY` selects a name;
existing directories are rejected so failed evidence survives.

The tool writes an initial manifest before browser setup. Failed startup or
capture attempts retain `status: failed`, the failing `stage`, and original
errors, including any separate cleanup errors. Setup failures exit nonzero.

`source.integratedAssets` and `source.overriddenAssets` record URL, byte size and
SHA-256 of asset responses actually served during capture, including external
textures. Different byte versions at the same URL remain separate records.
`source.sha256` identifies local application/tool source; served-asset records
identify rendered resources. Neither matching hashes nor compatible metadata
establish visual acceptance. Explicit override hashes and request counts remain
under `source.assetCandidates`.

Weapon modes: `primary` (rifle/carbine/smg/shotgun/sniper), `pistol`
(usp/glock18/p228/deagle/elite/fiveseven), `equipment`
(knife/grenade/smoke/flash/bomb), and `secondary` for the pistol board.
Actions: idle/equip/fire/reload. Primary/pistol previews reuse the game's existing
fixed action sampling. They show the asset currently integrated in the game;
an available source package is not necessarily the integrated model.

To pilot an exported candidate before replacing a public asset, add
`--ct-asset PATH.glb`, `--carbine-asset PATH.glb`, or `--pistol-asset PATH.glb`. The existing Playwright
capture context intercepts only that local asset request and supplies the named
file to the real game loader. Other tabs and public files remain unchanged.
The manifest records its absolute path, SHA-256, byte size and actual request
count under `source.assetCandidates`; malformed GLBs or unused overrides fail.
These captures prove an isolated candidate in the renderer, not that the regular
page serves it. Source asset validation and visual acceptance still apply.

```sh
npm run visual:preview -- --mode character-close --subject ct --pose walk --times 0,250 --ct-asset outputs/my-candidate.glb --out outputs/visual-tools/my-candidate-review
```

Character modes: `character-close` and `locomotion`, with idle/walk/crouch/death,
1.5, 3 or 6 scene-unit distances. Add `--subject ct` or `--subject t` for a
single centered character; the default `both` retains the comparison board.
Use `--angle three-quarter` and `--variant 0|1|2|3` to inspect contacts and
separate death variants. These selections are recorded in the capture scenario
so different setups cannot silently pass a paired comparison.
`movement` reuses the run/strafe/aim/death pose board.
Existing map modes include lane/site-a/site-b/dust2-long/dust2-long-doors/dust2-a.
Use 1280×720 and 960×720 to review 16:9 and 4:3 separately. Different aspect
ratios deliberately fail the identical-setup comparison gate.

### 2. Replay a scenario

```sh
npm run visual:replay -- --url http://localhost:3000 --out outputs/visual-tools/my-replay
npm run visual:verify-replay -- --manifest outputs/visual-tools/my-replay/manifest.json
```

The fixed timeline runs the actual simulation at 10 ms steps: normal freeze,
knife equip, USP equip, fire, reload, forward movement, stop, reload completion,
fire again, pause. Default samples cover all verification points. Actual ammo,
action windows, player position and simulation clock establish whether inputs
were accepted. `dispatchedActions` means inputs sent, not successful outcomes.
A final sample after pause verifies that the simulation remains unchanged.

Each replay starts in a fresh isolated browser context. Its initialization seed
fixes `Math.random`; the runtime adapter separately seeds weapon spread. Reload
the page for another replay; the API refuses to reuse an advanced round as a
fresh baseline. This is controlled simulation evidence, not a normal full-round
acceptance test. Audio-start scheduling and observed wall-frame intervals are
retained; screenshot overhead and accelerated simulation make those unsuitable
for real-time sound-sync or FPS acceptance. Listening remains a separate check.

The browser API exists only on localhost with `?visual-tools=1`:
`window.dustlineVisualTools`. It exposes `snapshot`, `previewAsset`,
`prepareReplay`, `advanceReplayTo`, `replayScenario`, and `disposeReplay`.
Await the async operations. Production hosts and ordinary local pages do not
expose it. The game owns the rendering; the toolkit does not replace its assets.

### 3. Compare versions and annotate references

```sh
npm run visual:compare -- --reference REFERENCE/manifest.json --previous PREVIOUS/manifest.json --candidate CANDIDATE/manifest.json --out comparison.html
npm run visual:reference -- --manifest CANDIDATE/manifest.json --out contact-sheet.html
npm run visual:reference -- --library visual-tools/reference-library.json --out references.html
```

HTML reports embed their images, so they remain usable when moved. Comparison
requires matching operation, scenario, capture rule, sample timestamps, camera,
lighting, viewport, quality, pixel ratio and seed. Failed captures, missing
images or incompatible metadata fail the command. This checks comparability;
it does not approve hands, silhouettes, poses or materials.

The ledger includes retained user references, a user-rejected capture, and
source-asset/license records. Unknown approvals stay `unreviewed`. Import a
PureRef board by exporting it as an image and adding its path/provenance to
`reference-library.json`; the HTML library is usable without PureRef installed.
To record a real review decision on a capture:

```sh
npm run visual:reference -- --manifest RUN/manifest.json --annotate 01000ms --status rejected --reason "Support hand loses contact" --provenance "Reviewer and review date" --write-manifest
```

## Blender source previews and live inspection

```sh
npm run visual:blender -- --source assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend --action Reload --action-map visual-tools/kuptchi-actions.json --texture-map visual-tools/kuptchi-textures.json --frames 1,42,80
npm run visual:blender -- --source assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend --source-camera Camera --action Idle --action-map visual-tools/kuptchi-actions.json --texture-map visual-tools/kuptchi-textures.json --frames 1
npm run visual:blender-bridge
```

Source previews run in background Blender. They preserve the original file,
select rigged meshes by default, and save original PNGs plus source hash,
animation/material and per-frame bone/camera data. The default is a fixed42mm
whole-asset **studio view**, fitted across all requested poses. It does not use
the source's first-person camera. Use `--source-camera NAME` to retain that exact
authored camera, including parenting, constraints, lens and animated transforms.
An unknown camera fails. The manifest records the camera policy, evaluated
camera matrix/lens at each frame, dimensions and pixel aspect. Authored camera
views still use the toolkit's neutral lighting, which is separately labeled.
`--objects` selects explicit mesh names. Missing textures fail with a path report;
texture/action maps make repairs explicit in process memory. The Kuptchi maps
reuse the mappings already established by `scripts/export-kuptchi-carbine.py`.
Offline lighting is intentionally separate from game lighting; do not claim an
identical-render comparison between Blender and WebGL.

The live bridge opens a separate factory-startup Blender GUI process and runs
the upstream addon on loopback port 9876. Blender's GUI event loop is required
by that addon. Close this Blender process or stop the command when finished.
Set `BLENDER_BIN` if needed; the wrapper detects `/Applications/Blender.app` and
`/Volumes/Blender/Blender.app`. It does not change saved Blender preferences.

## Spector.js and Context7

```sh
npm run visual:setup
npm run visual:diagnostics -- --url 'http://localhost:3000/?visual-qa=primary&weapon=carbine'
```

Setup provisions the pinned upstream Spector MCP revision, Playwright Chromium,
and Blender MCP 1.9.1 addon under ignored `.tools/`. It adds project-local
`.codex/config.toml` servers for Spector, Blender, and Context7 without replacing
other server sections. Start a new trusted-project Codex task to load them.
Installation provenance is in `install.json`; game dev dependencies are pinned
in package-lock.json. Blender telemetry is disabled for the provided commands.

Diagnostics saves upstream draw calls, shader source, texture information, GL
state, context details, console messages and a screenshot. Spector timing units
are not used as a frame-time gate. Context7 was verified with a Three.js lookup;
version availability is library-dependent, so check the installed Three version
against retrieved documentation. Authentication may be needed if service limits
change; no credentials are embedded in this project.

Upstream instructions: [Spector MCP](https://github.com/BabylonJS/Spector.js/blob/master/mcp/README.md),
[Blender MCP](https://github.com/ahujasid/blender-mcp),
[Context7](https://github.com/upstash/context7).

## Evidence and boundaries

See `CODEX_PLAN_VISUAL_TOOLKIT.md` for recorded validation. Existing game art
remains unapproved where previously rejected. This toolkit adds visual evidence;
it does not install future-game engines, purchase licensed packs, or change the
art direction. Source-license qualification remains required for each reused asset.
