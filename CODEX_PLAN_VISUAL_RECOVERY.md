# Visual recovery plan — 2026-09-14

## Status and outcome

**Restart authorized:** after the pause and tooling review, the user directed
“Once you are done, start over.” Start with R-reuse below. This
reassessment supersedes P7's visual acceptance claims and continuation direction.
The game is not visually complete. The user reports that the map is improving,
while characters and the first-person hands/guns are getting worse.

Preserve the map progress. Recover a coherent Counter-Strike 1.6 visual language
for characters and the first-person view through two small, directly compared
asset pilots. Do not extend the rejected approach across more assets.

The earlier continuation authorized recovery pilots, then the user put them on
hold again. The subsequent tool-reuse review changes the planning documents
only. No broad rollback is selected; the rejected presentation and paused pilots
remain comparison controls, not accepted targets.

## What the evidence says

| Area | Evidence and diagnosis | Decision |
| --- | --- | --- |
| Map | User observes improvement; P7 adds masonry portals, door/crate bracing, facade detail and ground variation. | Retain the current map. Further map polish is lower priority. |
| Characters | The pre-P7 Vanguard model has the wrong futuristic costume, but has coherent mesh and surface detail. The replacement in `app/classic-character-mesh.ts` assembles rigidly weighted primitive sections, flat color regions and a shared cloth noise texture. Costume cues changed while anatomical and material credibility fell. | Mark P7b **regressed / user-rejected**. Replace the construction strategy; shrinking another sphere or box is not the next package. |
| Hands and guns | Gun dimensions, camera mounts, dark material values and local details changed repeatedly. Arms are children of each weapon root, so mount changes alter the composition of the entire assembly. Static hand-contact checks do not judge whether it looks natural in first person. | Mark P7c **regressed / user-rejected**. Treat weapon, hands, forearms, pose, framing and lighting as one visual deliverable. |
| Review process | Feature checklists rewarded a visible helmet, curved magazine or carry-handle opening. These individual properties did not establish that the whole image looked better. Several framing limits were revised around new mounts. | Overall reference comparison precedes component checks. Do not change an acceptance limit merely to admit the latest result. |
| Automated checks | Current tests/build pass; they establish functional stability and resource limits. | Keep them as regression gates. They cannot grant visual acceptance. |

Directly inspected comparison material:

- `outputs/cs16/p7/baseline/characters-idle.jpg`
- `outputs/cs16/p7/final-candidate/characters-idle-front.jpg`
- `outputs/cs16/p7/final-candidate/characters-walk.jpg`
- `outputs/cs16/p7/baseline/weapon-rifle.jpg`, `weapon-carbine.jpg`, `weapon-usp.jpg`
- `outputs/cs16/p7/final-candidate/weapon-rifle.jpg`, `weapon-carbine.jpg`, `weapon-usp.jpg`
- `outputs/hands-qa/cycle-2/preview/usp-idle-final.jpg` and `rifle-idle-final.jpg`
- `outputs/hands-qa/round-2/loop-1/carbine-idle.jpg`
- `outputs/hands-qa/references/user-ak-reference.webp`
- `outputs/hands-qa/references/user-m4-reference-1.jpeg` and `user-m4-reference-2.jpeg`
- `outputs/graphics-review/reference/counterstrike-reference.jpg`

Older screenshots use different viewport sizes and lighting. They can reveal
qualitative regressions, but do not justify invented pixel-error scores or a
blanket claim that every earlier version was better. No earlier character or gun
is declared a faithful finished asset. The previous robot is not the target.

## Revised sequence

### R-reuse — qualify the production method before more asset work

Follow [the tool reuse plan](CODEX_PLAN_TOOL_REUSE.md) and the factory's new
reuse/adapt/custom decision before resuming a builder. Evaluate MPFB's complete
character/clothing/rig workflow and licensed weapon/hand source assets first;
standardize format validation at the first selected export, then evaluate
animation/IK reuse on the qualified rig. Navigation and physics remain deferred.

Do not automatically resume repairs to `author-ct-pilot.py` or expand the
numerical AK authoring script. They remain comparison candidates. Choose the
source/workflow by a representative offline and actual-renderer pilot, recording
what custom work it eliminates. Preserve all existing visual references and
numerical gameplay/resource gates. Implementation is authorized under the new reuse-first plan.

### R0 — recover a stable comparison baseline

1. Keep map, movement, combat rules and working animation infrastructure fixed.
2. Preserve the rejected candidate and existing pre-P7 source snapshots.
3. Recover only character/viewmodel presentation slices for an isolated comparison;
   do not replace the old `page.tsx` wholesale or undo unrelated work.
4. Compare the previous presentation, rejected candidate and supplied references
   at fixed 4:3 and 16:9 views, then check the user's normal viewport. Freeze the
   camera, lighting, idle pose, weapon and capture distance for each comparison.
5. Choose a recovery baseline from visible evidence. Pre-P7 gun materials/mounts
   are recovery candidates, not automatically accepted rollbacks.

Completion evidence: a small comparison board with source provenance and a
written list of the actual regressions to correct. No asset production before
this baseline is settled. The present reassessment identifies candidates; it
has not restored or selected a finished baseline.

### R1 — one complete first-person pilot: AK-47 plus hands

Use the supplied AK reference as the composition target. Author the entire
viewmodel together, rather than moving a gun and assuming existing arms will
still look right.

- Establish receiver/barrel/stock proportions, muzzle location, grip position,
  wrist angle, forearm taper and frame occupancy together in a neutral preview.
- Keep world camera behavior fixed while assessing the dedicated first-person
  presentation. If a separate viewmodel projection is needed, demonstrate that
  need and record its camera policy before altering it.
- Source or adapt a suitable low-poly weapon and coherent hand/forearm asset;
  justify custom authoring through R-reuse where needed. Require authored UVs
  and painted skin, glove, wood and metal surfaces. Large silhouette
  and material regions must read correctly before adding tiny hardware.
- Reuse useful existing hand topology, grip targets, animation timings and effect
  anchors where they remain appropriate. Reuse is not a requirement to keep an
  incorrect visible mesh or a stretched forearm.
- Allow the first-person and held-world meshes to differ in detail and framing;
  share gameplay definitions and effect interfaces. A world draw-call budget must
  not determine the first-person asset's silhouette.
- Review idle first. Only then add fire, equip and reload, judging continuous
  transitions and contact in motion. Do not propagate to M4/USP until the complete
  AK-and-hands view is visibly better than the chosen baseline and approaches
  the reference as a whole.

### R2 — one properly authored character pilot: CT

Replace runtime primitive assembly as the asset-production method.

- Source or generate a deforming human through a qualified character workflow,
  with deliberate topology at shoulders, elbows, wrists, hips and knees. Adapt
  compatible head, hand, footwear and clothing assets into a coherent model,
  with fitted webbing and equipment. Custom anatomical/weight work needs an
  explicit rationale after evaluating the workflow's existing facilities.
- Use a UV atlas with painted folds, seams, face-cover/eye detail and material
  separation. Small geometric additions and generic noise are not a substitute
  for this surface work.
- Retain the compatible skeleton and useful animation clips when possible;
  skin the new mesh properly. Verify proportions against reference silhouettes
  before fitting gameplay proxies. Do not distort the anatomy to satisfy a
  pre-existing bad visual fit.
- Show front, side and three-quarter views at close distance, plus a normal
  gameplay distance. Judge the full body, face, hands and clothing together.
- Only after the CT pilot succeeds, produce the T variant and test locomotion,
  aim, crouch, death and held weapons.

Tooling prerequisite: check an actual mesh/UV/rig authoring pipeline and prove
that a small sample exports and renders correctly before committing to asset
production. Blender was not found on PATH or at its standard local app path in
this reassessment. No authoring software was installed. An unavailable tool is
not a reason to fall back silently to more runtime cylinders and boxes. Any
external source mesh must have suitable documented reuse rights; original game
art remains excluded by the product boundary.

### R3 — expand and integrate after the pilots work

1. Extend the proven first-person approach to M4 and USP, then the remaining
   required arsenal, preserving each weapon's silhouette and motion character.
2. Integrate the proven CT/T assets with the existing simulation and map.
3. Run affected contact, animation, collision, resource and gameplay tests.
4. Run normal CT and T rounds only after the visual candidates succeed. Repeat
   integration checks when the relevant source changes, not as a substitute for
   deciding whether the asset itself is good.

## Acceptance and stopping rules for resumed work

- User visual rejection overrides positive internal reviews. Current P7b/P7c have
  zero accepted visual criteria, regardless of retained engineering results.
- Review the whole image against the same supplied reference and baseline first.
  "Has a carry handle" or "uses navy cloth" cannot by itself earn a visual pass.
- Keep the reference, camera, pose and comparison rules stable during a pilot.
  Explicitly reassess any necessary change before measuring its replacement.
- Show a concrete pilot comparison before extending the asset family. The user
  need not micromanage individual vertices, materials or numerical constants.
- A failed visual pilot returns to the asset approach or composition. It does not
  trigger another broad cycle of unrelated geometry tweaks and full-round tests.
- Existing performance ceilings, hand-contact/grounding checks and gameplay rules
  remain required after visual improvement. Original equivalence remains
  unverified; no fidelity percentages or premature completion claims.

## Likely change surfaces after resumption

Character assets and atlas; `app/classic-character-mesh.ts` (replace runtime
production path), `app/skinned-character-visuals.ts` (asset/skin integration).
First-person assets and atlas; `app/viewmodel-visuals.ts`,
`app/viewmodel-surface.ts`, `app/primary-weapon-models.ts`,
`app/secondary-weapon-models.ts`, and scoped construction/rendering in
`app/page.tsx`. Tests should retain meaningful gameplay and resource invariants.
Map modules and other simulation systems stay outside these visual pilot edits.

## Current repository and evidence state

Uncommitted checkout: `feature/classic-hands-round-2`, based on
`cf2a2829b5b295e8a3688c7bde815dc50edc5512`. Preserve unrelated accumulated work.

Rejected candidate source manifest:
`outputs/cs16/p7/final-candidate/manifest.json`, 165 entries,
SHA-256 `fd2d2c889e3cf00c252d157bfa0a2aa6da1a5d6455b3c96203e3adf25a705ae7`.
The historical directory name `final-candidate` does not imply acceptance.

Pre-P7 source snapshots are under `outputs/cs16/p7/baseline/`; they include
presentation files and a full page snapshot that must only be mined selectively.
No rollback has been applied. The visible application still contains the rejected
character/viewmodel candidate. Tests and build passed before the stop; the fresh
review sequence was halted and has no final acceptance verdict.

Temporary playtest tabs were closed, the viewport override cleared, and the
original High quality setting restored. User-created tabs and the existing
localhost:3000 server remain available. Recovery now restarts with source/workflow qualification.

## R0 / R1 acceptance card — resumed 2026-09-14

- **Control:** rejected P7 candidate, manifest `fd2d2c889e3cf00c252d157bfa0a2aa6da1a5d6455b3c96203e3adf25a705ae7`. No earlier model is selected as an accepted target. Pre-P7 screenshots remain qualitative comparison only because their capture conditions differ.
- **R0 decision:** retain current map and runtime; replace AK presentation as a complete authored asset. Current gun is too thin and far left; stock is a large slab; forearms are smooth pale tubes with weak wrist/hand continuity. Earlier version has useful lower-right mass but also fails silhouette. These defects are visible in the same fixed views and can be checked without inventing a fidelity score.
- **Reference:** supplied `outputs/hands-qa/references/user-ak-reference.webp`; original settings unknown. Its central 4:3 game region has the muzzle right of center, a broad receiver cropped at the lower right, and a substantial support forearm. Documented approximation only.
- **Setup:** existing localhost:3000, High preset, `?visual-qa=primary&weapon=rifle&action=idle&time=1`, 1280×720 and 960×720; later native viewport. World camera remains 74° vertical FOV, same map/light/pose. Current captures in `outputs/cs16/recovery/r0/`.
- **Pilot gates (4):** whole AK/arms composition follows the reference; recognizable receiver/magazine/wood silhouette without slab stock; connected anatomically readable hands/forearms with actual UV texture; continuous fire/equip/reload without grip separation or near-plane clipping. First three judged in paired whole images before action integration. No numeric fidelity percentages.
- **Frozen regressions:** existing frame/draw/triangle and contact/grounding limits; no easing a limit to admit a render. Weapon geometry ≤3500 triangles, visible arms ≤4000 triangles, combined visible draws ≤6.
- **Root ownership:** offline AK/hand authoring, new viewmodel asset/loader, scoped rifle integration and comparison evidence. Map/gameplay modules excluded.
- **CT pilot:** may be developed separately as an offline asset after tooling proof, but runtime character replacement waits for coherent front/side/three-quarter inspection.
- **Tooling:** Blender 4.5.9 ARM64 downloaded from official release server; checksum verified. MakeHuman hm08 base OBJ pinned to commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`, source explicitly CC0; source/license retained under `assets/source/makehuman/`. Raster atlas generated with the built-in imagegen tool, four material quadrants.
- **R0 status:** comparison control selected, known defects observed. No visual product gates accepted. R1: 0/4, unverified before asset production.

## Latest stop

Implementation paused at the user’s subsequent request. AK pilot v2 exists locally
but has no visual acceptance. CT pilot remains offline and rejected by its worker.
See `HANDOFF_CS16.md` for exact continuation state. Do not resume automatically.
