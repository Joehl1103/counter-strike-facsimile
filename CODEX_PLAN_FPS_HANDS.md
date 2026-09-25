# FPS hands improvement plan

Scope: improve only first-person hand and forearm anatomy, grip contact, glove presentation, and their readability during existing reload animation. Preserve weapons, reload timing and transforms, world characters, environment, UI, gameplay, and graphics budgets.

## User reference target

The supplied `1731-screenshot-1.webp`, `images (1).jpeg`, and `images.jpeg` show the target Counter-Strike silhouette: a compact charcoal fingerless glove, warm tan forearm, distinct fingers wrapped closely around the object, and a smooth tapered arm entering diagonally from the lower frame. The first-person implementation therefore retains the posed Vanguard hand but replaces its garment-only arm crop with a merged closed forearm surface; camouflage diffuse color is excluded while source hand UVs and normal detail remain available.

## Baseline defects

- `outputs/hands-qa/baseline/usp-idle.jpg` shows vertical finger ridges behind the slide, a sideways thumb at the wrist, and long flat sleeves.
- `outputs/hands-qa/baseline/usp-reload-1250.jpg` shows the support fingers opening into free hooks around the magazine.
- `outputs/hands-qa/baseline/knife-idle.jpg` shows the same shared pose defect: fingers above the handle and an oversized thumb below it.
- Skeleton inspection found that both finger chains extend on local +Y, but their local Z hinges are mirrored. `applyTexturedHandPose` used one positive curl sign for both sides, enlarged the complete hand subtree by 1.38, and assigned only half the curl to the first knuckle. The bake then used shoulder direction plus a fixed roll instead of the hand's wrist/knuckle plane.

## Iteration sequence

1. Refine the shared firearm/knife hand pose: remove hand-only enlargement, apply side-aware finger curls concentrated at the first knuckle, oppose the thumb, and derive orientation from the actual palm basis.
2. Refine wrist and forearm silhouette: make palm, wrist, cuff, and sleeve form one tapered diagonal into the lower frame without increasing the accepted footprint.
3. Check existing reload samples at 0.50, 1.00, 1.35, 1.80, and 2.30 seconds; tune hand pose parameters only where the moving magazine exposes detachments or intersections.
4. Run focused anatomy/budget tests and capture deterministic pistol idle/reload evidence. Freeze the candidate revision/checksum for the required two independent full-round reviewers.

## Proposed file ownership

- `app/viewmodel-visuals.ts`: hand pose, wrist/forearm alignment, and glove material parameters only.
- `tests/viewmodel-visuals.test.ts`: focused grip/anatomy assertions only if needed to encode the repaired silhouette.
- `CODEX_PLAN_FPS_HANDS.md`: this plan.

No other source files are planned.

## Cycle 1 freeze notes

Natural-viewport previews show a coherent first improvement: mirrored reload hooks are closed around the magazine, the knife grip crosses the handle with an opposed thumb, garment flaps are gone, and the tan forearm/dark fingerless-glove split matches the supplied references. This is not final acceptance. The next cycle must angle and taper the rifle support forearm, soften the glove-to-wrist flare, add restrained forearm surface detail, and reduce the dominant glove's remaining vertical rib/low-thumb read.

## Cycle 2 correction

The first frozen review split: one reviewer passed the overall low-poly read,
while the stricter anatomy review failed the four edge-on dominant fingers,
low thumb, pointed wrist crop, and one-sided reload claw. Rig measurements show
the curl itself works in local depth, but the pistol arm's shallow root pitch
projects each digit as an upright rib. This cycle rotates the final dominant
pistol root about its palm anchor, targets the visible weighted thumb pad,
removes only tiny disconnected crop islands wholly below the wrist, and makes
the long-gun support forearm fuller and more diagonal. During reload the same
visible support mesh swaps to one cached magazine-hold geometry and follows a
fixed magazine-local socket; reload timing and magazine motion remain intact.
Tests will evaluate weighted digit vertices after the full weapon mount rather
than treating terminal bone joints as fingertips.
