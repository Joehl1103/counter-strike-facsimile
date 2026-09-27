# Authored M4/carbine pilot

Source: [Kuptchi RetroWeaponPack](https://kuptchi.itch.io/f), `RetroWeaponPack_V1.zip`, file13635597. Original selected Blender scene, textures, source manifest and included Readme.pdf are preserved under `assets/source/kuptchi-weapons/`.

The author permits personal and commercial project use without requiring attribution and asks that the assets not be resold. This is a custom permission, not CC0. Archive SHA256: `482545570e279f5b3c238067c2e8c15904bcaf2a704a17cfe85525c50615cb35`.

Served `m4a1.glb` SHA256: `7b0cd03d34bdf5c7c020e2d39a47c72d9ad91f5dffa05665bccb7b894a98a5c3`. Size: 883,644 bytes.

This candidate has 3,596 arm triangles and 3,480 rifle triangles, two textured skins, and paired authored Idle, Fire, Reload and Equip clips. Editable source is `FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend`. Native arms and weapon topology, UVs, rig and actions are retained; the derived weapon uses Blender Decimate before deformation and the export uses the standard four-influence limit.

The derived fingerless-glove surface partitions the existing arm faces into
2,304 skin and 1,292 palm/proximal-finger triangles. Both retain the original
texture and UVs. The glove material uses base-color factor `[0.10, 0.13, 0.16, 1]`,
roughness `0.82`, and metallic `0`; exposed fingers and forearms retain skin.
This is a material-only approximation, with three mesh draw proxies, two skins
and 72 bones. It does not add cloth geometry or change hand pose.

Reproduction: `scripts/export-native-carbine.py`, then `scripts/merge-authored-viewmodel-clips.mjs` and `scripts/prepare-carbine-viewmodel.mjs`. The seam-aware equivalence gate verifies skin, UV, normal, oriented topology and material consistency before reusing one mesh across clips. Scene exports start at 1/24 second; merged action clocks start at zero. An ordinary Empty camera marker requires Blender glTF's standard camera-only local -90-degree X correction before inversion. The complete assembly converts centimetres to metres and uses the unchanged 74-degree gameplay camera.

Proof and preserved failures: `outputs/cs16/reuse/native-carbine/`, `outputs/cs16/reuse/carbine-integration/native-final/`. The first incorrect camera frame is retained as an empty in-game capture. The corrected asset is `native-final/camera-frame-repair/budget-camera-local.glb`.

After that camera-corrected export (SHA256 `aa30cc72de22aea607a6f9a517ae7097272df3186c902e8ef6e3201443c9cbe1`), run
`node scripts/prepare-m4-fingerless-glove.mjs INPUT.glb NEW_OUTPUT.glb NEW_AUDIT.json`.
The glTF Transform processor requires the frozen input hash and new output
paths. It preserves oriented triangles, all vertex attributes, textures, rig,
clips and sockets. A fresh reproduction matched the served bytes exactly.
Glove comparison and independent review are under
`outputs/cs16/reuse/m4-fingerless-glove-final-render/` and
`outputs/cs16/reuse/m4-glove-independent-review/`.

The runtime adapter normalizes the loaded muzzle socket's measured `-Y`
barrel direction to the game's `-Z` effect convention. This leaves the asset
unchanged and lets the existing metre-sized silencer follow the authored gun.
Native barrel geometry and loaded transforms are checked independently in
`outputs/cs16/reuse/m4-silencer-alignment/`. The unsilenced reload comparison
remains pixel-identical after this mount correction.

Status: current first-person M4 appearance approved by the user on2026-09-15:
“the m4 looks great.” Preserve this result. The older assessment that its modern
rail/sights and pale forearms required restyling is superseded by that feedback;
exact original-game equivalence is not being asserted. Other firearms remain
visually rejected by the user. All-action verification and the separate world
model remain separate from this appearance verdict.
