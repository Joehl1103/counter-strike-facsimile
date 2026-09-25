# Desert mountain panorama

Asset: `desert-mountain-panorama.png`

Generated for this project with the built-in image generation tool on 2026-09-05.
The original 1774 × 887 RGBA PNG is preserved without pixel editing. Its upper
sky is transparent; the mountain band contains baked atmospheric perspective.
Horizontal mirrored repetition in the renderer can preserve a continuous wrap
without claiming that the generated left/right edges match pixel-for-pixel.

The selected first output has real alpha. A corrective output that baked in a
checkerboard was rejected and is not included in the project.

## Exact selected-generation prompt

```text
Use case: stylized-concept
Asset type: production-ready panoramic horizon/backdrop texture for a classic tactical FPS desert map
Primary request: Generate exactly one seamless horizontally tiling 2:1 panoramic strip of sunlit arid rocky mountains, preferably 2048 × 1024 pixels, delivered as a PNG with a genuine alpha channel.
Scene/backdrop: One coherent continuous desert mountain horizon designed to wrap 360 degrees. The mountains and rocky foothills occupy the lower 65–70% of the canvas. Natural irregular broad peaks and saddles vary through the middle of the image. The base is a continuous, fully opaque band of rocky foothills touching the entire bottom edge.
Style/medium: Photographic environmental texture with restrained early-2000s tactical FPS desert-map art direction; realistic eroded limestone and distant mountain forms, modest era-appropriate texture detail, no imitation of any specific existing artwork.
Composition/framing: Wide orthographic-feeling horizon strip without close foreground perspective. Left and right pixel edges must match seamlessly in skyline elevation, foothill elevation, color, lighting, haze, and rock texture so repeated copies form an invisible horizontal tile. Maintain only one coherent skyline/horizon. Avoid obvious central symmetry or repeating cloned peaks.
Lighting/mood: Soft sunlit midday light, gentle directional modeling, readable midtones, atmospheric depth, subdued contrast.
Color palette: Muted warm limestone, sand, ochre, and desaturated dusty mauve-brown layers receding into haze.
Materials/textures: Natural broad rocky masses with visible erosion, striation, weathered ledges, talus, and softened distant detail.
Transparency: The entire area above the natural mountain skyline must be genuinely transparent RGBA alpha=0, including all upper corners and both side edges above the skyline. Create a clean antialiased natural skyline cutout with no colored fringe. Do not render sky, clouds, fog backdrop, checkerboard, white, blue, gray, or black into the transparent area. Mountain pixels and the full bottom foothill band must remain opaque.
Constraints: one image only; 2:1 aspect ratio; seamless horizontal tile; natural broad peaks and saddles; mountain content covers roughly the lower two-thirds; clean transparent upper area; coherent lighting and scale.
Avoid: black silhouettes; crushed shadows; sharp low-poly triangular slabs; isolated floating rocks; gaps or transparency at the bottom; foreground buildings; architecture; people; roads; paths; plants; weapons; vehicles; text; logos; watermarks; borders; frames; collage; UI; sky pixels; checkerboard patterns.
```
