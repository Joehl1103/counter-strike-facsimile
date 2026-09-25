# Counter-Strike project memory

Updated 2026-09-15. These are sourced session lessons, not new global rules.
Current authorization and restart state are in [HANDOFF_CS16.md](HANDOFF_CS16.md).
The user requested a stop at the verified checkpoint and a session reflection.
Implementation is paused; the project is not complete.

**User visual feedback after the strategy adjustment:** “By the way the m4
looks great. The other guns still look pretty bad.” Preserve the current M4
appearance (GLB SHA7b0cd03d, adapter SHA8fb68ff1) as the user-approved quality
reference. The next weapon work concerns the other firearms, using the matched
authored gun/hand/animation approach where a suitable source qualifies. Earlier
M4 receiver/forearm restyling conclusions are superseded. This feedback does not
resume implementation or approve all actions, the separate world model or the
complete multi-weapon milestone.

After this reflection, the user explicitly requested strategy adjustments.
The [updated reuse plan](CODEX_PLAN_TOOL_REUSE.md#strategy-adjustment--2026-09-15)
turns these lessons into a project-specific execution order: complete compatible
character/animation pairing first; access before more preparation; one bounded
alternative-source review if needed; conditional reuse of the existing preview
for missing attachment states; one evidence entry point per candidate. The
factory now reflects that sequencing. No global memory policy, acceptance
threshold or application code was changed. The implementation pause remains.

## What helped today

The most useful progress came from preserving the matched, authored M4 assembly
and correcting narrow integration defects. A material partition improved the
fingerless-glove surface without changing anatomy or animation. A six-line
frame conversion fixed the silencer without changing the source mesh. Installing
an authoring tool alone had not supplied the missing modeling or animation
expertise; the source asset and its compatibility mattered more.

- [Glove review and preservation evidence](outputs/cs16/reuse/m4-glove-independent-review/REPORT.md)
- [Silencer source, runtime and independent evidence](outputs/cs16/reuse/m4-silencer-alignment/ROOT_REVIEW.md)

## Technical lessons established by evidence

1. **Inspect loaded coordinate frames before altering art.** The exported M4
   socket actually points along local `-Y`, despite an intended `-Z` convention
   in the exporter. Native and loaded barrel geometry independently established
   `Main +X` as forward. Normalizing the adapter's public effect mount fixed a
   90-degree silencer error while preserving the generic attachment code and
   metre dimensions. The unsilenced reload remained pixel-identical.
   [Measured before/after](outputs/cs16/reuse/m4-silencer-alignment/independent-review/REPORT.md)

2. **Rest frames and measurement units can invalidate a verifier.** A Mixamo
   FBX check initially compared the original rig with itself; another treated
   parent-relative Blender `Bone.head` as armature coordinates. A subsequent
   check omitted failed gates and mishandled quaternion sign equivalence.
   The corrected isolated import uses `head_local` / `matrix_local`, normalized
   shortest quaternion distance, separate metre/radian limits and a shared
   stress pose. The frozen FBX was sound; changing it to fit the bad measurements
   would have introduced damage. [Corrected audit](outputs/cs16/reuse/mixamo-reduced-doll/REPORT.md)

3. **A skin's joint names are only part of its contract.** The glove audit
   became complete only after checking inverse binds, original node transforms
   and hierarchy, all vertex attributes, oriented faces, textures and the whole
   rifle primitive. A numerical report that merely lists hashes or limits does
   not establish that it asserted them. [Raw corrected audit](outputs/cs16/reuse/m4-glove-independent-review/binary-audit.json)

4. **Material partitions change the loaded scene structure and accounting.**
   GLTFLoader can wrap multiple primitives in a Group; classification metadata
   on the Group does not automatically classify its renderable children.
   Separate tagged leaves retained the arm/gun distinction. The whole arm still
   has 3,596 triangles across two leaves, rather than a fresh allowance per leaf.
   [Processor](scripts/prepare-m4-fingerless-glove.mjs)

5. **Freeze the final bytes before visual capture.** Serialization cleanup
   changed the candidate after an earlier capture set. Those images were not
   proof for the final hash, even though the rewrite was intended to be
   nonvisual. Fifteen paired frames were recaptured against the final GLB;
   separate new output paths now preserve failures and exact reproduction.
   [Final render review](outputs/cs16/reuse/m4-fingerless-glove-final-render/REVIEW.md)

6. **Counts must use the runtime's actual definition.** The first silencer
   card counted four solid meshes but omitted an existing flash Sprite.
   Both baseline and candidate have five total draw proxies. The original
   incomplete metric and its explicit correction remain in the plan; no extra
   rendering cost was introduced. [Card and correction](CODEX_PLAN_TOOL_REUSE.md)

7. **Pose previews, action receipts and complete gameplay prove different
   things.** A preview displaying M4 while the HUD says USP proves rendering,
   not M4 inputs. A reload's 30/29 ammo receipt after death proves the transfer,
   not a living final pose. Sending F immediately before Escape can cancel the
   queued shot. A paused or killed player can interrupt a planned action.
   [Precise smoke limits](outputs/cs16/reuse/m4-silencer-alignment/runtime/REPORT.md)

## Where the session lost time

Evidence was too fragmented: processing, verifier repair, recapture, and normal
gameplay each accumulated separate reports. Some “pass” narratives were broader
than their raw checks. The corrected reports and failed originals are retained
so the next session can use the final evidence instead of reconstructing it.

Hot reload reset the normal game to round1. Earning M4 purchase funds again and
deaths during inspection made the narrow attachment smoke expensive. The current
fixed preview lacks a silencer-state option. A bounded improvement to that
existing preview is a possible future tooling task; it is not implemented or
an alternative to required normal gameplay checks.

The supplied tooling is useful, but installing more frameworks would not resolve
the remaining visual failures by itself. CT rifle hold/death, the AK grip and
the classic M4 receiver attempts reached recorded failures. Passing small
technical checks did not reset those failures: P7b/P7c remain 0/4 each.
The selected full-body animation trial still needs actual Mixamo access and a
qualified clip. Its prepared FBX is not an authored-animation result.

## Latest durable references

- [Current handoff and pause](HANDOFF_CS16.md)
- [Checkpoint and exact resume boundary](memory/sessions/2026-09-15T054124Z.md)
- [Active acceptance plan](CODEX_PLAN_CS16_FACSIMILE.md)
- [Reuse decisions and stopped attempts](CODEX_PLAN_TOOL_REUSE.md)
- [Existing factory method](FACTORY_METHOD.md)
- [Visual tools and capture commands](visual-tools/README.md)

Ignored outputs remain local evidence, not versioned guarantees. If an artifact
is missing in a future environment, its historical result needs re-verification.
