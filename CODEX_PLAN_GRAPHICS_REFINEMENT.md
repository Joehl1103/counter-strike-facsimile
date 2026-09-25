# Graphics refinement — September 4, 2026

The new request rejects the previous visual result. Its completion report is
historical, not proof that the present graphics satisfy this request.

Observed in the live lane/site-A views: ochre sky and lighting flatten the
palette; surfaces read as blurry noise; masonry trim resembles a checkerboard;
CT headgear looks cylindrical and the face protrudes as a diamond; disconnected
torso sections and long thin pistol sleeves read as a mannequin.

1. Recalibrate daylight and sky together for blue atmosphere, warm sunlit stone,
   readable shaded actors, and stable shadows.
2. Replace the actual diffuse raster's generic marks with material-specific
   stone courses, timber grain/planks, plaster erosion, and fine ground grain.
   Keep shared texture allocation and world UV density stable.
3. Improve visible anatomy/headgear and first-person arm continuity while
   retaining animation anchors, hit proxies, collision, and gameplay authority.
4. Compare live fixed views, run relevant geometry/performance tests and the
   project checks, fix findings, then publish to the existing private site.

Acceptance is based on rendered improvement and gameplay regression checks;
old numeric palette snapshots may change with the new art direction.

## Verified result

- Replaced the yellow fog/sky cast with blue daylight and neutral atmospheric
  haze, while retaining the two-light setup and 1024-pixel shadow-map ceiling.
- Reworked all six shared diffuse rasters: running-bond masonry, weathered
  plaster, granular ground, timber planks/grain, and painted metal corrosion.
  Texture count/resolution stays fixed; both horizontal and vertical borders
  now match exactly.
- Rebuilt the visible torso as a continuous elliptical shell; added rounded
  headgear, facial features, smoother joints, and painted glove/boot protection.
  Existing eight-draw/4,000-triangle character limits continue to pass.
- Corrected reversed sleeve taper, enabled a real intermediate bend vertex
  ring, aligned the cuff ring, and brought pistols lower/closer in the frame.
  Local muzzle/grip anchors remain unchanged. The footprint check now clips
  real triangles so off-screen elbows cannot inflate the visible gun width.
- Live visual checks: lane, sites A/B, both teams at multiple distances,
  secondary weapon board, aim/death poses, and High/Performance modes. No
  browser runtime errors. High remains the final selected quality.
- Final checks: 321 tests pass; lint, TypeScript, production build, and
  `git diff --check` pass. Eight-bot presentation measures 0.4087 ms p95 over
  320 measured frames after warm-up, within the existing 0.5 ms limit.
- The original procedural, stylized art direction remains; this pass improves
  its daylight, surface readability, anatomy, and first-person framing.
