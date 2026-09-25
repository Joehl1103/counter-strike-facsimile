# First-person skin and leather detail

`classic-surface-detail.jpg` is an original generated grayscale detail atlas,
512 × 512 pixels. Left half: skin; right half: leather. It was created with the
built-in image-generation tool on 2026-09-05 and resized with macOS `sips`.
It contains no extracted Counter-Strike assets. The shader treats its values
as linear detail multipliers; vertex colors provide the skin/glove palette.

Generation prompt:

> Use case: stylized-concept. Asset type: original game material texture atlas, square 1024x1024. Generate a flat orthographic unlit albedo detail atlas with exactly two equally sized vertical rectangular swatches, touching at the center, no borders, no text. LEFT HALF: neutral pale gray human forearm skin texture, extremely subtle skin pores, a few soft lengthwise tendon/vein shadows running vertically, gentle organic mottling, understated late-1990s hand-painted tactical game texture. NOT an image of an arm: a flat rectangular unwrapped skin material swatch filling the whole left half. RIGHT HALF: medium-light neutral gray worn tactical glove leather texture, fine leather grain, very soft broad compressed wrinkles with some diagonal creases, subdued wear, no seams or garment outlines. Both swatches must tile seamlessly independently, top-to-bottom and horizontally within their half. Grayscale only, low contrast, predominantly light gray, no blacks, no white glare. Fine restrained surface detail that remains clean at 512 resolution. No lighting gradients, no cast shadows, no perspective, no hands, no objects, no logos, no anatomy silhouettes.
