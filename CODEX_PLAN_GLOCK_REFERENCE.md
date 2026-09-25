# Glock and hands reference match — active, 2026-09-15

User resumed implementation and narrowed current work to hands and Glock/basic gun. User says continue until it resembles the supplied close-up. This supersedes the earlier implementation pause for this scope. M4 appearance is approved and must be preserved.

## Visual thesis and acceptance card G1

The assembled gun reads as a broad charcoal Glock with a chamfered rectangular slide, rear notch/front sight, dark ejection-port recess, rear serrations, polymer lower frame, and a tight fingerless-glove grip. Hands, wrists, and forearms must form continuous natural shapes, with warm exposed fingertips and dark glove backs/cuffs. The gun points diagonally toward upper-left from the lower-right. Inspect the full image and close-up, including idle, fire, reload, and equip at 16:9 and 4:3. No broken contacts, detached surfaces, duplicate arms, or center-crosshair obstruction. The supplied reference is a crop, so its frame occupancy is not a full-viewport sizing oracle.

Reference: outputs/glock-reference/user-reference.jpg (user attachment). Baseline: outputs/glock-reference/baseline-idle-02/manifest.json; 1280x720, high, seed1947, pistol Glock18, idle0ms. Baseline is an explicit renderer-pose preview: normal simulation HUD remains USP; previewWeapon/visible meshes identify Glock. Source backup and hashes: outputs/glock-reference/baseline-source/. Current baseline visibly fails broad slide, coherent hand grip, and natural arm silhouette. Runtime integration is separately checked with normal selected Glock.

Reuse decision: inspected current generated model, Kuptchi matched Pistol_01 arms/gun/rig/clips, existing M4 adaptation/export tools, and local Stein/Tabasco gun inventory. Kuptchi gun is 1911-like and fails Glock shape; reuse its coherent arm rig and choreography, author a Glock-like replacement within the same gun skeleton, keeping grip contacts. Existing M4 provides demonstrated direct-source export and camera normalization workflow. No original-game art imports. Local package terms permit personal/commercial use; see assets/source/kuptchi-weapons/source.json and readme-extracted.txt.

Pilot: native idle whole assembly first, then representative motion, then camera-local GLB in actual game. Search is bounded to existing local candidates; reassess after two non-improving visual attempts. Existing performance ceilings remain; target <=2500 gun triangles, <=4 gun draws, <=4000 arm triangles. Native anatomy and grip coherence have priority over incremental cosmetic edits to the rejected generated assembly.

Owners: pistol_source_audit builds derived assets/scripts only under /tmp/glock-source-build; pistol_runtime_adapter prepares thin runtime adapter and patch under /tmp/glock-runtime-adapter; glock_visual_direction independently reviews rendered evidence. Root integrates checkout changes, captures and validates, coordinates Buzz. Preserve all unrelated working-tree edits.

## Execution

1. Qualify/edit native gun+hand assembly in Blender and retain editable source/provenance.
2. Integrate authored Glock only using existing animation controller; retain world/other pistol models and M4.
3. Compare fresh fixed renders and iterate geometry/material/framing until criteria hold.
4. Freeze final assets/source; run affected checks, full regression/build, normal selected Glock smoke and two independent normal-round reviews. Root inspects raw images before completion.

Status: baseline confirmed failing; candidate in progress. No acceptance claim yet.

### Source pilot progress

Frozen V3 source image inspected by root: broad chamfered Glock slide with port/sights/serrations, continuous fingerless gloves, clean skeletal-plane cuff/finger boundaries, retained matched grip. Source pilot is eligible for renderer comparison. 3,920 arm triangles; 2,255 gun triangles; four gun materials. Derived source /tmp/glock-specialist/glock-rig-source.blend and four direct SCENE clip exports. Earlier guessed source-frame/NLA trials remain rejected under /tmp/glock-source-build; specialist V1/V2 failures are retained separately.

Found and corrected integration risks before public promotion: Blender texture multiply is omitted in GLB (same image + factor1); scripts/prepare-glock-materials.mjs restores exact measured linear factors while asserting original texture bytes. Merger now accepts explicit weapon armature name at both strict gates, retaining original Rifle default. Equip currently fails strict primitive correspondence for36 gun vertices: positions <=1.0585e-5cm (pass2e-5), normals <=0.00014155 (fail1e-6). This is under diagnosis, no threshold relaxed and no public Glock yet. Root evidence: outputs/glock-reference/equip-equivalence-diagnosis.json.

Runtime adapter prepared and independently reviewed. Root is addressing mesh-role validation, authored camera/animation sampling, per-weapon shot clocks, retained M4 behavior, and live test coverage. Normal selected Glock baseline captured in outputs/glock-reference/baseline-gameplay; fire/reload inputs happened during freeze and are explicitly not accepted smoke evidence. Helper now waits for simulation-state outcomes.
