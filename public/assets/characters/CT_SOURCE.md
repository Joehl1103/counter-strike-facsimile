# CT character pilot

`ct-mpfb.glb` is a project approximation using MPFB v2.0.17's native human,
Mixamo rig and clothing-fitting/export workflow. The core body is CC0.
Elvaerwyn's male_coveralls1 and Mindfront's tactical vest are CC-BY assets.
The masks02 pack page credits Mathias_Gredal and CC-BY for the gas-mask source;
its files carry conflicting CC0/unknown-author headers. Preserve the named
attribution and pack terms; this combined character is not CC0-only.

The current gloves and ankle boots are Toigo assets, credited to Margaret Toigo
in the MakeHuman catalog and MRT in their MHCLO/OBJ headers, all CC0. They replace
the earlier culturalibre pieces with conflicting license headers. Those earlier
pieces are preserved only in failed offline candidates. Exact current metadata
is in assets/source/mpfb-ct/gas-mask-pilot-attribution.json.

Exact source URLs, versions, hashes, original metadata and applicable terms are
retained in assets/source/mpfb and assets/source/mpfb-ct. Source authoring is in
scripts/author-mpfb-ct-pilot.py. Native joint-helper groups remain enabled while
fitting the rig; helper geometry is removed on the export copy. Blender's
standard weight cleanup, reduction and atlas bake produce 9,254 triangles,
two materials and 52 bones. No manual anatomical or coordinate-based weights.
Each baked atlas explicitly samples its own UV coordinates. The corrected
neutral source SHA-256 is
97b6720408563f113626365a9c2267ca86ae195e07e41283ff4409c590bf2140.

scripts/orient-mpfb-character.mjs aligns the complete neutral character with the
game's -Z forward direction. scripts/retarget-character-clips.mjs transfers the
existing Vanguard Idle/Walk/Run rotations using Three.js SkeletonUtils; source
animation provenance remains in the adjacent original character source record.
Native geometry, skin weights and atlas images are preserved by those processors.

This file is an in-renderer qualification pilot. The neutral source and exported
materials have been visually compared. Animated output provenance is retained
in outputs/cs16/reuse/character-integration/cc0-atlas-game-animated.glb.json.
Visual contact, grounding, normal gameplay and final acceptance are separate
checks tracked in CODEX_PLAN_TOOL_REUSE.md.

Current served animated SHA-256:
e85a0dd18270caee23a12ef4970868323ac0be1bf7cd21b823af49158e6cf1f8.

The endpoint coverage repair retains the same mesh, materials, weights, binds,
hierarchy and49 existing rotation tracks. It adds the three source-authored
distal rotations omitted when only weighted source joints were enumerated.
All30 finger channels now transfer through the standard retargeter, using a
separate52-node lookup skeleton that preserves the49-joint source render skin.
The source-relative maximum error is0.0573degrees at31 phases per clip.
Provenance, original baseline and independent renderer captures are retained in
`outputs/cs16/reuse/ct-endpoint-coverage/`. This restores source motion; the
visible support-hand grip remains unaccepted.
