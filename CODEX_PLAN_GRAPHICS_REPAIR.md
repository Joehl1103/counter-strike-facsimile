# Graphics regression repair — September 4, 2026

The user's rejection supersedes the prior visual completion reports. Current
browser evidence shows repeating large dark patches on ground and plaster,
a disconnected CT helmet rim, and equipment that loses shape in shade.

1. Reduce repeated low-frequency texture contrast, retain fine grain and masonry
   joints, and use mipmapped filtering for stable distant surfaces.
2. Correct texture coordinates per box face so short ends and trim do not inherit
   the repeat count of the longest face.
3. Join the helmet rim to its shell and improve shaded material readability.
4. Review fixed live views, verify geometry/gameplay checks, build, and publish
   to the existing private game. Preserve movement, hit proxies, weapons, and
   map layout. Record observed results rather than equating tests with beauty.

## Verified result

- Fixed lane and site A/B browser views show substantially less repeated dark
  mottling on ground/plaster, consistent masonry scale, and more readable shade.
- CT helmet rim now overlaps the dome; a geometry regression test checks the
  former gap. Window supports sit between openings. Skyline caps fit flat roofs
  in both axes, eliminating the visible strip of sky below their edges.
- Ground accumulation and paving reuse the existing sand/stone textures.
  Diffuse mipmaps stabilize minified detail without adding texture objects.
- Replaced the point-sampling texture contrast gate with averaged 16x16 texel
  checks and strict low-frequency blotch limits across three seeds. Added
  front/end/top and narrow-cornice texture-density regression coverage.
- High and Performance were visually reviewed; High was restored. No captured
  browser runtime errors. Gameplay authority, collision and input code were
  unchanged; 323 tests pass. Eight-bot presentation p95 is 0.2251 ms, within
  its existing 0.5 ms gate. Lint, TypeScript, build and diff checks pass.
- This repairs observed visual defects within the existing original art style;
  it does not claim photorealistic assets or replace the character/weapon system.
