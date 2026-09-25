# Visual evidence toolkit

User authorization: build the proposed toolsets in parallel in this project.

## Frozen acceptance card VT1

Target: repeatable asset frames and action replay, portable matched comparisons,
an annotated provenance library, and usable rendering/Blender/docs adapters.
This accepts tooling behavior, never the visual quality of existing assets.

Reuse decision: adapt existing `graphics-qa.ts` fixed views, production render
and input paths, existing authored Blender/GLB sources, Playwright screenshots,
Spector.js upstream MCP and Context7. Keep the Three/Vinext/Sites project.
Custom work is limited to orchestration, metadata, comparison and local adapters.
Engine migration, asset purchases, and new art are outside this tooling change.

Baseline: fixed URL views exist; no unified capture manifest, replay API or
portable reference/previous/candidate comparison CLI exists in scripts.
Reference quality is unmeasured. Preserve all current dirty work and evidence.

Parallel boundaries: Terra replay worker proposes runtime API/page patch;
Terra comparison worker proposes comparison/reference CLI files. Workers deliver
outside the checkout; root integrates, owns dependencies/capture/diagnostics,
and validates. No nested workers or shared-file writes.

Checks: local-only API isolation; repeatable timestamps and actual camera/FOV,
viewport, quality and seed recorded; action outcomes and browser errors retained;
comparison rejects mismatched settings/missing frames and escapes annotations;
source previews retain editable originals. Capture representative actual frames,
inspect originals, run focused tests, typecheck and build. Timing is observational,
not a deterministic FPS guarantee. Unknown visual approval remains unreviewed.

Evidence: `outputs/visual-tools/`; exact commands and current tool versions will
be recorded in `visual-tools/README.md`. Baseline absence is source inspection;
candidate evidence will be appended after execution. No fidelity scores granted.

## Progress

Tooling criteria accepted: 5/5 (capture, replay, comparison, library,
integrations), gained 5/lost 0. Product P7b/P7c visual acceptance unchanged.

## Executed evidence — 2026-09-14/15

- Capture: `outputs/visual-tools/preview-final-a` and `preview-final-b` contain
  independent 1280×720 High runs at 0/1000 ms. Both pairs of PNG bytes are
  identical. `paired-preview.html` embeds the matched reference/previous/candidate
  board; the reference and previous columns deliberately reuse run A for this
  repeatability pilot, not an improvement claim. Root inspected originals and
  the composed report. `skeleton-4x3`, `character-distance`, `character-skeleton`
  retain actual framing, six-unit enemy views and visible skeleton overlays.
- Replay: `replay-final/manifest.json` and `replay-checks.json` pass seven actual
  outcomes: clean capture, equip, consumed shot, reload completion, post-reload
  shot, forward travel, paused clock/position/camera invariance. 48 audio start
  calls and 147 observed wall-frame intervals are retained, not accepted as
  real-time audio or performance measurements.
- Source preview: `blender-pilot` preserves the initial bad framing/missing-texture
  result. `blender-pilot-fixed` and `blender-reload` show selected authored meshes
  with explicit texture mappings and paired Reload actions. Original source hash
  remains unchanged. Root inspected PNGs and retained bone/material metadata.
- Library: `reference-library.html` renders the seven seeded provenance entries.
  Approval states are preserved; unknown remains unreviewed.
- Integrations: `spector-pilot` has a successful WebGL2 frame (35 draw calls,
  13 shader programs, no reported GL errors), shader/texture/state reports and
  screenshot. Do not use upstream duration formatting as a timing gate.
  `blender-mcp-pilot.json` records a successful live scene-info response from
  Blender 4.5.9; `context7-query.json` records a successful Three.js lookup.
- Independent Terra review caught premature action-completion wording, wall-time
  event scheduling, replay-reset ambiguity, and comparison timestamp/viewport/
  error/route gaps. Root fixed these and reran focused validation. Inputs are
  labeled dispatched; actual ammo/windows establish outcomes. An advanced page
  must reload before another baseline replay.
- Full regression run: 646 tests passed, zero failed, in `tests-final.log`;
  isolated existing performance test p95 0.1960 ms (<0.5 ms) passed. The later
  comparison route-negative test brought focused comparison coverage to 11/11.
  Typecheck and lint passed; `build-final.log` records a passing Sites build
  with existing chunk-size/deprecation/route-classification warnings.
- `normal-smoke` records ordinary-page API absence/start/pause, but its early
  inputs occurred during freeze; it is not accepted fire/movement evidence.
  A subsequent `normal-smoke-combat/result.json` passes ordinary keyboard
  start, accepted fire (12→11), reload (12/23), movement input and pause,
  with the debug API absent and no page errors. Full-round acceptance is unchecked.

No full normal-round product acceptance or aesthetic approval is claimed.
Token totals unavailable. Downloaded installations and generated evidence are
ignored; scripts/configuration/provenance are retained in project files.
