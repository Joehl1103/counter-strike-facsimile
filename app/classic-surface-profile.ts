/** Pure, renderer-agnostic vocabulary for the classic desert surface pass. */

export const CLASSIC_SURFACE_TEXTURE_MAX_SIZE = 256;
/** Slope gain when turning diffuse brightness into surface relief. */
export const CLASSIC_RELIEF_STRENGTH = 2.4;
export const CLASSIC_MICRO_BEVEL_MIN = 0.02;
export const CLASSIC_MICRO_BEVEL_MAX = 0.04;
export const CLASSIC_STRUCTURAL_BUMP_MAPS_ENABLED = false;
export const CLASSIC_STRUCTURAL_NORMAL_MAPS_ENABLED = false;
export const CLASSIC_HORIZON_COLOR = 0xc2ccc9;
/** One material-family tile occupies a stable amount of world space. */
export const CLASSIC_WORLD_TILE_SIZES: Readonly<
  Record<ClassicMaterialFamily, number>
> = Object.freeze({
  plaster: 4,
  cutStone: 3,
  darkMasonry: 3,
  sand: 4,
  timber: 2.5,
  paintedOxidizedMetal: 2,
});

export const CLASSIC_SKY_SEAM_MAX_CHANNEL_DELTA = 2;
export const CLASSIC_SKY_SCREEN_SEAM_MAX_DELTA = 8 / 255;

export type ClassicMaterialFamily =
  | 'plaster'
  | 'cutStone'
  | 'darkMasonry'
  | 'sand'
  | 'timber'
  | 'paintedOxidizedMetal';

export type ClassicMaterialPalette = Readonly<{
  base: number;
  light: number;
  shadow: number;
  roughness: number;
  metalness: number;
}>;

export type ClassicDiffusePassKind =
  | 'block'
  | 'crack'
  | 'edgeWear'
  | 'grain'
  | 'seam'
  | 'speckle'
  | 'stain';

export type ClassicDiffusePass = Readonly<{
  kind: ClassicDiffusePassKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  tone: 0 | 1 | 2;
  opacity: number;
}>;

export type ClassicDiffuseTextureInstructions = Readonly<{
  family: ClassicMaterialFamily;
  width: number;
  height: number;
  maxTextureSize: 256;
  baseColor: number;
  lightColor: number;
  shadowColor: number;
  passes: readonly ClassicDiffusePass[];
  structuralBumpMapEnabled: false;
  structuralNormalMapEnabled: false;
}>;

export type ClassicSiteMotif = 'siteA' | 'siteB' | 'mid';

export type ClassicSiteMarkKind = 'band' | 'chevron' | 'patch' | 'stripe';

export type ClassicSiteMark = Readonly<{
  kind: ClassicSiteMarkKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  tone: 0 | 1 | 2;
  opacity: number;
}>;

export type ClassicSiteMotifInstructions = Readonly<{
  motif: ClassicSiteMotif;
  marks: readonly ClassicSiteMark[];
}>;

export const CLASSIC_SURFACE_PALETTES: Readonly<
  Record<ClassicMaterialFamily, ClassicMaterialPalette>
> = Object.freeze({
  plaster: Object.freeze({
    base: 0xd0bfa0,
    light: 0xe4d8bd,
    shadow: 0x8d806a,
    roughness: 0.92,
    metalness: 0,
  }),
  cutStone: Object.freeze({
    base: 0xa89472,
    light: 0xcbb78d,
    shadow: 0x655640,
    roughness: 0.88,
    metalness: 0,
  }),
  darkMasonry: Object.freeze({
    base: 0x514c43,
    light: 0x766e60,
    shadow: 0x292821,
    roughness: 0.9,
    metalness: 0,
  }),
  sand: Object.freeze({
    base: 0xbca580,
    light: 0xdac7a0,
    shadow: 0x82745b,
    roughness: 1,
    metalness: 0,
  }),
  timber: Object.freeze({
    base: 0x765039,
    light: 0xa8794d,
    shadow: 0x382218,
    roughness: 0.86,
    metalness: 0,
  }),
  paintedOxidizedMetal: Object.freeze({
    base: 0x59635f,
    light: 0x899087,
    shadow: 0x29312f,
    roughness: 0.68,
    metalness: 0.16,
  }),
});

export type ClassicMasonryBlock = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  shade: 0 | 1 | 2;
}>;

export type ClassicMasonrySeam = Readonly<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}>;

export type ClassicMasonryInstructions = Readonly<{
  blocks: readonly ClassicMasonryBlock[];
  seams: readonly ClassicMasonrySeam[];
}>;

export type ClassicSkyCloudLayer = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  seed: number;
}>;

export type ClassicWorldUvScale = readonly [u: number, v: number];

function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function boundedInteger(
  value: number,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function boundedUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** UV repeats for a surface whose geometry spans the supplied world dimensions. */
export function getClassicWorldUvScale(
  family: ClassicMaterialFamily,
  size: readonly [number, number, number],
): ClassicWorldUvScale {
  const tile = CLASSIC_WORLD_TILE_SIZES[family];
  const width = Number.isFinite(size[0]) ? Math.max(0, size[0]) : 0;
  const height = Number.isFinite(size[1]) ? Math.max(0, size[1]) : 0;
  return Object.freeze([
    Math.max(0.25, width / tile),
    Math.max(0.25, height / tile),
  ] as const);
}

/** Local metre-based projection for box faces, including narrow ends and tops. */
export function getClassicBoxFaceUv(
  family: ClassicMaterialFamily,
  size: readonly [number, number, number],
  point: readonly [number, number, number],
  normal: readonly [number, number, number],
): readonly [number, number] {
  const tile = CLASSIC_WORLD_TILE_SIZES[family];
  const [nx, ny, nz] = normal.map(Math.abs);
  const x = point[0] + size[0] / 2;
  const y = point[1] + size[1] / 2;
  const z = point[2] + size[2] / 2;
  if (ny > nx && ny > nz) return [x / tile, z / tile];
  return [(nx > nz ? z : x) / tile, y / tile];
}

function createDiffusePass(
  kind: ClassicDiffusePassKind,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  tone: 0 | 1 | 2,
  opacity: number,
): ClassicDiffusePass {
  const safeX = boundedUnit(x);
  const safeY = boundedUnit(y);
  return Object.freeze({
    kind,
    x: safeX,
    y: safeY,
    width: Math.min(1 - safeX, Math.max(0, width)),
    height: Math.min(1 - safeY, Math.max(0, height)),
    rotation: Number.isFinite(rotation) ? rotation : 0,
    tone,
    opacity: Math.min(1, Math.max(0, opacity)),
  });
}

function addRandomPasses(
  passes: ClassicDiffusePass[],
  random: () => number,
  kind: ClassicDiffusePassKind,
  count: number,
  width: [number, number],
  height: [number, number],
  opacity: [number, number],
) {
  for (let index = 0; index < count; index += 1) {
    passes.push(
      createDiffusePass(
        kind,
        random(),
        random(),
        width[0] + random() * (width[1] - width[0]),
        height[0] + random() * (height[1] - height[0]),
        (random() - 0.5) * Math.PI,
        Math.floor(random() * 3) as 0 | 1 | 2,
        opacity[0] + random() * (opacity[1] - opacity[0]),
      ),
    );
  }
}

/**
 * Builds low-resolution diffuse drawing instructions. Coordinates are normalized
 * so Canvas2D, WebGL, and other renderers can consume the same deterministic data.
 */
export function createSeededDiffuseTextureInstructions(
  family: ClassicMaterialFamily,
  seed: number,
  width = 128,
  height = 128,
): ClassicDiffuseTextureInstructions {
  const safeWidth = boundedInteger(
    width,
    128,
    1,
    CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  );
  const safeHeight = boundedInteger(
    height,
    128,
    1,
    CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  );
  const random = seededRandom(Number.isFinite(seed) ? seed : 1);
  const palette = CLASSIC_SURFACE_PALETTES[family];
  const passes: ClassicDiffusePass[] = [];

  if (family === 'plaster') {
    addRandomPasses(
      passes,
      random,
      'stain',
      8,
      [0.06, 0.24],
      [0.04, 0.16],
      [0.08, 0.2],
    );
    addRandomPasses(
      passes,
      random,
      'crack',
      10,
      [0.01, 0.08],
      [0.002, 0.012],
      [0.25, 0.5],
    );
    addRandomPasses(
      passes,
      random,
      'speckle',
      24,
      [0.004, 0.018],
      [0.004, 0.018],
      [0.16, 0.36],
    );
  } else if (family === 'cutStone' || family === 'darkMasonry') {
    const masonry = createSeededMasonryInstructions(
      Math.floor(random() * 0xffffffff),
      family === 'cutStone' ? 6 : 5,
      family === 'cutStone' ? 4 : 5,
    );
    masonry.blocks.forEach((block) => {
      passes.push(
        createDiffusePass(
          'block',
          block.x,
          block.y,
          block.width,
          block.height,
          0,
          block.shade,
          family === 'darkMasonry' ? 0.94 : 0.86,
        ),
      );
    });
    masonry.seams.forEach((seam) => {
      const horizontal = seam.y1 === seam.y2;
      passes.push(
        createDiffusePass(
          'seam',
          horizontal ? 0 : seam.x1,
          horizontal ? seam.y1 : 0,
          horizontal ? 1 : seam.width,
          horizontal ? seam.width : 1,
          0,
          2,
          family === 'darkMasonry' ? 0.74 : 0.62,
        ),
      );
    });
    addRandomPasses(
      passes,
      random,
      'edgeWear',
      8,
      [0.01, 0.08],
      [0.01, 0.04],
      [0.12, 0.26],
    );
  } else if (family === 'sand') {
    addRandomPasses(
      passes,
      random,
      'stain',
      12,
      [0.08, 0.34],
      [0.03, 0.12],
      [0.08, 0.22],
    );
    addRandomPasses(
      passes,
      random,
      'speckle',
      30,
      [0.003, 0.014],
      [0.003, 0.014],
      [0.12, 0.3],
    );
  } else if (family === 'timber') {
    addRandomPasses(
      passes,
      random,
      'grain',
      22,
      [0.18, 0.5],
      [0.006, 0.018],
      [0.24, 0.48],
    );
    addRandomPasses(
      passes,
      random,
      'stain',
      5,
      [0.04, 0.16],
      [0.05, 0.2],
      [0.1, 0.24],
    );
    addRandomPasses(
      passes,
      random,
      'edgeWear',
      8,
      [0.01, 0.06],
      [0.008, 0.024],
      [0.12, 0.28],
    );
  } else {
    addRandomPasses(
      passes,
      random,
      'stain',
      10,
      [0.05, 0.2],
      [0.03, 0.14],
      [0.12, 0.28],
    );
    addRandomPasses(
      passes,
      random,
      'seam',
      8,
      [0.08, 0.28],
      [0.006, 0.018],
      [0.2, 0.42],
    );
    addRandomPasses(
      passes,
      random,
      'edgeWear',
      12,
      [0.01, 0.09],
      [0.006, 0.026],
      [0.18, 0.38],
    );
  }

  return Object.freeze({
    family,
    width: safeWidth,
    height: safeHeight,
    maxTextureSize: CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
    baseColor: palette.base,
    lightColor: palette.light,
    shadowColor: palette.shadow,
    passes: Object.freeze(passes),
    structuralBumpMapEnabled: false,
    structuralNormalMapEnabled: false,
  });
}

function channel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function colorChannels(value: number): readonly [number, number, number] {
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function hash2d(x: number, y: number, seed: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.017) * 43758.5453;
  return value - Math.floor(value);
}

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Periodic, bilinearly interpolated value noise. Keeping the lattice periodic
 * makes a repeated diffuse map meet itself at its UV edge instead of exposing
 * a second hard seam beside the deliberate masonry/seam passes.
 */
function smoothValueNoise(
  x: number,
  y: number,
  seed: number,
  width: number,
  height: number,
  cellSize: number,
) {
  const cellsX = Math.max(2, Math.round(width / cellSize));
  const cellsY = Math.max(2, Math.round(height / cellSize));
  const gridX = (x / Math.max(1, width)) * cellsX;
  const gridY = (y / Math.max(1, height)) * cellsY;
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const tx = smoothstep(0, 1, gridX - x0);
  const ty = smoothstep(0, 1, gridY - y0);
  const sample = (gridXIndex: number, gridYIndex: number) =>
    hash2d(
      positiveModulo(gridXIndex, cellsX),
      positiveModulo(gridYIndex, cellsY),
      seed,
    );
  const top = sample(x0, y0) * (1 - tx) + sample(x0 + 1, y0) * tx;
  const bottom = sample(x0, y0 + 1) * (1 - tx) + sample(x0 + 1, y0 + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

/**
 * Deterministic diffuse raster used by image tests and the setup-time Canvas2D
 * renderer. It intentionally contains value variation only; structural relief
 * remains disabled and all six maps stay small, shared, and diffuse-only.
 */
export function createClassicDiffusePixelData(
  family: ClassicMaterialFamily,
  seed: number,
  width = CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  height = CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
): Uint8ClampedArray {
  const instructions = createSeededDiffuseTextureInstructions(
    family,
    seed,
    width,
    height,
  );
  const data = new Uint8ClampedArray(
    instructions.width * instructions.height * 4,
  );
  const base = colorChannels(instructions.baseColor);
  const light = colorChannels(instructions.lightColor);
  const shadow = colorChannels(instructions.shadowColor);
  // Sample periodic coordinates at both endpoints. Unlike averaging only the
  // border texels, this keeps the complete transition continuous in both axes.
  const periodX = Math.max(1, instructions.width - 1);
  const periodY = Math.max(1, instructions.height - 1);
  const mix = (rgb: number[], target: readonly number[], alpha: number) => {
    for (let c = 0; c < 3; c += 1)
      rgb[c] = rgb[c] * (1 - alpha) + target[c] * alpha;
  };
  for (let y = 0; y < instructions.height; y += 1) {
    for (let x = 0; x < instructions.width; x += 1) {
      const sx = x % periodX;
      const sy = y % periodY;
      const u = sx / periodX;
      const v = sy / periodY;
      const noise = (cell: number, salt: number) =>
        smoothValueNoise(sx, sy, seed + salt, periodX, periodY, cell) - 0.5;
      const macro = noise(64, 0);
      const medium = noise(20, 131);
      const detail = noise(5, 271);
      const grain = hash2d(sx, sy, seed + 17) - 0.5;
      // Large dark marks repeat every few metres and read as false shadows.
      // Let fine aggregate carry plaster/sand; reserve broad variation for
      // the individual stone and timber courses below.
      const macroStrength = family === 'plaster' || family === 'sand' ? 0.055 : 0.14;
      const rgb: number[] = base.map(
        (c) =>
          c * (1 + macro * macroStrength + medium * 0.035 + detail * 0.065) +
          grain * 9,
      );

      if (family === 'cutStone' || family === 'darkMasonry') {
        // Running bond: vertical joints stop at each course instead of forming
        // the former full-height checkerboard. Weathering distorts the joints.
        const rows = 6;
        const columns = 3;
        const row = Math.floor(v * rows);
        const rowY = v * rows - row;
        const brickX = u * columns + (row % 2) * 0.5;
        const column = Math.floor(brickX);
        const localX = brickX - column;
        const edgeX = Math.min(localX, 1 - localX) / columns;
        const edgeY = Math.min(rowY, 1 - rowY) / rows;
        const edge = Math.min(edgeX, edgeY) + detail * 0.004;
        const stoneTone = hash2d(column % columns, row, seed + 47) - 0.5;
        for (let c = 0; c < 3; c += 1) rgb[c] += stoneTone * 21;
        const mortar = 1 - smoothstep(0.003, 0.008, edge);
        mix(rgb, shadow, mortar * 0.76);
        const lip =
          smoothstep(0.006, 0.01, edge) * (1 - smoothstep(0.011, 0.019, edge));
        mix(rgb, light, lip * (rowY < 0.5 ? 0.34 : 0.1));
        // Small pits give the stone a chipped face at close range.
        if (grain < -0.44) mix(rgb, shadow, 0.19);
      } else if (family === 'plaster') {
        // Limestone render: irregular patches of exposed aggregate and fine
        // branching fissures, with no isolated blurry circular daubs.
        const erosion = smoothstep(0.12, 0.28, macro + medium * 0.55);
        mix(rgb, shadow, erosion * 0.09);
        const fissure = Math.abs(medium + macro * 0.42);
        const crack =
          (1 - smoothstep(0.001, 0.008, fissure)) *
          smoothstep(0.06, 0.22, detail + macro);
        mix(rgb, shadow, crack * 0.24);
        if (grain < -0.39) mix(rgb, shadow, 0.12);
        if (grain > 0.38) mix(rgb, light, 0.13);
      } else if (family === 'sand') {
        // Fine granular earth with shallow wind ripples. Low-amplitude ripples
        // break up the ground while preserving clean long-distance readability.
        const ripple = Math.sin(
          (v * 38 + medium * 0.6 + Math.sin(u * Math.PI * 4) * 0.32) *
            Math.PI *
            2,
        );
        for (let c = 0; c < 3; c += 1)
          rgb[c] += ripple * 1.4 + detail * 5;
        if (grain < -0.46) mix(rgb, shadow, 0.3);
        if (grain > 0.46) mix(rgb, light, 0.32);
      } else if (family === 'timber') {
        const plankX = u * 5;
        const plank = Math.floor(plankX);
        const localX = plankX - plank;
        const seam = 1 - smoothstep(0.015, 0.055, Math.min(localX, 1 - localX));
        const fibre = Math.sin(
          (u * 93 + medium * 0.8 + Math.sin(v * Math.PI * 2) * 0.5) *
            Math.PI *
            2,
        );
        const boardTone = hash2d(plank, 0, seed + 79) - 0.5;
        for (let c = 0; c < 3; c += 1) rgb[c] += fibre * 5 + boardTone * 18;
        mix(rgb, shadow, seam * 0.73);
        // Worn plank lips catch light without any extra geometry.
        const lip =
          smoothstep(0.03, 0.06, localX) * (1 - smoothstep(0.06, 0.09, localX));
        mix(rgb, light, lip * 0.28);
      } else {
        const corrosion = smoothstep(0.08, 0.3, macro + medium * 0.6);
        mix(rgb, [117, 78, 49], corrosion * 0.68);
        const scratch = grain > 0.46 && Math.abs(detail) < 0.035 ? 0.32 : 0;
        mix(rgb, light, scratch);
      }
      const index = (y * instructions.width + x) * 4;
      data[index] = channel(rgb[0]);
      data[index + 1] = channel(rgb[1]);
      data[index + 2] = channel(rgb[2]);
      data[index + 3] = 255;
    }
  }
  return data;
}

export type ClassicBlockMeanArtifactMetrics = Readonly<{
  blockSize: number;
  sampleCount: number;
  p95Jump: number;
  maxJump: number;
}>;

/**
 * Measures adjacent block-average luminance jumps in a generated raster.
 * Values are normalized to 0–1, making the metric independent of texture
 * resolution and directly comparable to the artifact guard in tests.
 */
export function getClassicBlockMeanArtifactMetrics(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  blockSize = 16,
): ClassicBlockMeanArtifactMetrics {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const safeBlockSize = Math.max(1, Math.floor(blockSize));
  const columns = Math.ceil(safeWidth / safeBlockSize);
  const rows = Math.ceil(safeHeight / safeBlockSize);
  const means = new Float64Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    const startY = row * safeBlockSize;
    const endY = Math.min(safeHeight, startY + safeBlockSize);
    for (let column = 0; column < columns; column += 1) {
      const startX = column * safeBlockSize;
      const endX = Math.min(safeWidth, startX + safeBlockSize);
      let total = 0;
      let count = 0;
      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const index = (y * safeWidth + x) * 4;
          total +=
            (0.2126 * data[index] +
              0.7152 * data[index + 1] +
              0.0722 * data[index + 2]) /
            255;
          count += 1;
        }
      }
      means[row * columns + column] = count > 0 ? total / count : 0;
    }
  }
  const jumps: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const mean = means[row * columns + column];
      if (column + 1 < columns)
        jumps.push(Math.abs(mean - means[row * columns + column + 1]));
      if (row + 1 < rows)
        jumps.push(Math.abs(mean - means[(row + 1) * columns + column]));
    }
  }
  jumps.sort((a, b) => a - b);
  const p95Index = Math.min(jumps.length - 1, Math.ceil(jumps.length * 0.95));
  return Object.freeze({
    blockSize: safeBlockSize,
    sampleCount: jumps.length,
    p95Jump: jumps.length > 0 ? jumps[p95Index] : 0,
    maxJump: jumps.length > 0 ? jumps[jumps.length - 1] : 0,
  });
}

const SITE_MOTIF_LAYOUTS: Readonly<
  Record<ClassicSiteMotif, readonly ClassicSiteMark[]>
> = Object.freeze({
  siteA: Object.freeze([
    Object.freeze({
      kind: 'band' as const,
      x: 0.08,
      y: 0.2,
      width: 0.32,
      height: 0.08,
      rotation: 0,
      tone: 1 as const,
      opacity: 0.3,
    }),
    Object.freeze({
      kind: 'patch' as const,
      x: 0.62,
      y: 0.26,
      width: 0.22,
      height: 0.16,
      rotation: -0.14,
      tone: 2 as const,
      opacity: 0.24,
    }),
    Object.freeze({
      kind: 'stripe' as const,
      x: 0.18,
      y: 0.68,
      width: 0.56,
      height: 0.035,
      rotation: 0.04,
      tone: 0 as const,
      opacity: 0.2,
    }),
  ]),
  siteB: Object.freeze([
    Object.freeze({
      kind: 'patch' as const,
      x: 0.14,
      y: 0.26,
      width: 0.24,
      height: 0.2,
      rotation: 0.12,
      tone: 2 as const,
      opacity: 0.26,
    }),
    Object.freeze({
      kind: 'band' as const,
      x: 0.52,
      y: 0.16,
      width: 0.38,
      height: 0.06,
      rotation: -0.03,
      tone: 1 as const,
      opacity: 0.28,
    }),
    Object.freeze({
      kind: 'chevron' as const,
      x: 0.34,
      y: 0.66,
      width: 0.28,
      height: 0.08,
      rotation: 0,
      tone: 0 as const,
      opacity: 0.18,
    }),
  ]),
  mid: Object.freeze([
    Object.freeze({
      kind: 'stripe' as const,
      x: 0.1,
      y: 0.3,
      width: 0.72,
      height: 0.035,
      rotation: -0.06,
      tone: 2 as const,
      opacity: 0.2,
    }),
    Object.freeze({
      kind: 'patch' as const,
      x: 0.66,
      y: 0.48,
      width: 0.16,
      height: 0.2,
      rotation: 0.08,
      tone: 1 as const,
      opacity: 0.22,
    }),
    Object.freeze({
      kind: 'band' as const,
      x: 0.18,
      y: 0.76,
      width: 0.26,
      height: 0.05,
      rotation: 0.02,
      tone: 0 as const,
      opacity: 0.24,
    }),
  ]),
});

/** Returns stable, restrained value marks for recognizable map landmarks. */
export function createSeededSiteMotifInstructions(
  motif: ClassicSiteMotif,
  seed = 1,
): ClassicSiteMotifInstructions {
  const random = seededRandom(Number.isFinite(seed) ? seed : 1);
  const marks = SITE_MOTIF_LAYOUTS[motif]
    .map((mark, index) =>
      Object.freeze({
        ...mark,
        rotation: mark.rotation + (random() - 0.5) * 0.02,
        // Keep landmark paint legible through fog without reading as UI/neon.
        opacity: Math.min(0.28, mark.opacity + (random() - 0.5) * 0.025),
        x: boundedUnit(mark.x + (random() - 0.5) * 0.02),
        y: boundedUnit(mark.y + (random() - 0.5) * 0.02),
        width: mark.width,
        height: mark.height,
        tone: (index % 3) as 0 | 1 | 2,
      }),
    )
    .map((mark) =>
      Object.freeze({
        ...mark,
        width: Math.min(1 - mark.x, mark.width),
        height: Math.min(1 - mark.y, mark.height),
      }),
    );
  return Object.freeze({ motif, marks: Object.freeze(marks) });
}

export function createSeededMasonryInstructions(
  seed: number,
  columns = 6,
  rows = 4,
): ClassicMasonryInstructions {
  const safeColumns = boundedInteger(columns, 6, 1, 24);
  const safeRows = boundedInteger(rows, 4, 1, 16);
  const random = seededRandom(Number.isFinite(seed) ? seed : 1);
  const blockWidth = 1 / safeColumns;
  const blockHeight = 1 / safeRows;
  const blocks: ClassicMasonryBlock[] = [];
  const seams: ClassicMasonrySeam[] = [];
  for (let row = 0; row < safeRows; row += 1) {
    const stagger = row % 2 ? blockWidth * 0.5 : 0;
    for (let column = 0; column < safeColumns; column += 1) {
      const x = column * blockWidth - stagger;
      const y = row * blockHeight;
      blocks.push(
        Object.freeze({
          x,
          y,
          width: blockWidth * (0.91 + random() * 0.05),
          height: blockHeight * (0.89 + random() * 0.06),
          shade: Math.floor(random() * 3) as 0 | 1 | 2,
        }),
      );
    }
  }
  for (let column = 0; column <= safeColumns; column += 1)
    seams.push(
      Object.freeze({
        x1: column * blockWidth,
        y1: 0,
        x2: column * blockWidth,
        y2: 1,
        width: 0.006 + random() * 0.006,
      }),
    );
  for (let row = 0; row <= safeRows; row += 1)
    seams.push(
      Object.freeze({
        x1: 0,
        y1: row * blockHeight,
        x2: 1,
        y2: row * blockHeight,
        width: 0.006 + random() * 0.006,
      }),
    );
  return Object.freeze({
    blocks: Object.freeze(blocks),
    seams: Object.freeze(seams),
  });
}

export function createSeededSkyCloudLayers(
  seed: number,
  count = 5,
): readonly ClassicSkyCloudLayer[] {
  const safeCount = boundedInteger(count, 5, 1, 16);
  const random = seededRandom(Number.isFinite(seed) ? seed : 1);
  const layers: ClassicSkyCloudLayer[] = [];
  for (let index = 0; index < safeCount; index += 1)
    layers.push(
      Object.freeze({
        x: random(),
        y: 0.08 + random() * 0.5,
        width: 0.16 + random() * 0.28,
        height: 0.035 + random() * 0.09,
        opacity: 0.08 + random() * 0.2,
        seed: Math.floor(random() * 0xffffffff) >>> 0,
      }),
    );
  return Object.freeze(layers);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function wrappedDistance(value: number) {
  return Math.abs(value - Math.round(value));
}

function blendRgb(
  target: [number, number, number],
  source: readonly [number, number, number],
  opacity: number,
) {
  const alpha = Math.min(1, Math.max(0, opacity));
  target[0] = channel(target[0] * (1 - alpha) + source[0] * alpha);
  target[1] = channel(target[1] * (1 - alpha) + source[1] * alpha);
  target[2] = channel(target[2] * (1 - alpha) + source[2] * alpha);
}

export type ClassicSkyCloudReadabilityMetrics = Readonly<{
  cloudBandEnd: number;
  residualLumaRms: number;
  p90RowRange: number;
}>;

/**
 * Measures the horizontal cloud signal without being fooled by the vertical
 * blue-to-warm gradient. Each row has its mean removed before RMS is measured;
 * the p90 range reports how many rows contain a clearly separated cloud edge.
 */
export function getClassicSkyCloudReadabilityMetrics(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cloudBandEnd = 0.62,
): ClassicSkyCloudReadabilityMetrics {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const safeBandEnd = boundedUnit(cloudBandEnd);
  const bandRows = Math.max(
    1,
    Math.min(safeHeight, Math.ceil(safeHeight * safeBandEnd)),
  );
  const rowRanges: number[] = [];
  let residualSquareTotal = 0;
  for (let y = 0; y < bandRows; y += 1) {
    const luma = new Float64Array(safeWidth);
    let rowMean = 0;
    for (let x = 0; x < safeWidth; x += 1) {
      const index = (y * safeWidth + x) * 4;
      const value =
        (0.2126 * data[index] +
          0.7152 * data[index + 1] +
          0.0722 * data[index + 2]) /
        255;
      luma[x] = value;
      rowMean += value;
    }
    rowMean /= safeWidth;
    let rowResidualSquare = 0;
    let rowMinimum = Number.POSITIVE_INFINITY;
    let rowMaximum = Number.NEGATIVE_INFINITY;
    for (let x = 0; x < safeWidth; x += 1) {
      rowResidualSquare += (luma[x] - rowMean) ** 2;
      rowMinimum = Math.min(rowMinimum, luma[x]);
      rowMaximum = Math.max(rowMaximum, luma[x]);
    }
    residualSquareTotal += rowResidualSquare / safeWidth;
    rowRanges.push(rowMaximum - rowMinimum);
  }
  rowRanges.sort((a, b) => a - b);
  const p90Index = Math.max(0, Math.ceil(rowRanges.length * 0.9) - 1);
  return Object.freeze({
    cloudBandEnd: safeBandEnd,
    residualLumaRms: Math.sqrt(residualSquareTotal / bandRows),
    p90RowRange: rowRanges[p90Index] ?? 0,
  });
}

/**
 * Makes a soft, periodic sky raster. The horizontal samples are explicitly
 * equalized at both edges so the sphere's UV seam cannot expose a hard line.
 */
export function createClassicSkyPixelData(
  seed: number,
  width = CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  height = CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
): Uint8ClampedArray {
  const safeWidth = boundedInteger(
    width,
    256,
    2,
    CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  );
  const safeHeight = boundedInteger(
    height,
    256,
    2,
    CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  );
  const horizon = colorChannels(CLASSIC_HORIZON_COLOR);
  const top: readonly [number, number, number] = [77, 138, 185];
  const cloudColor: readonly [number, number, number] = [237, 239, 229];
  const layers = createSeededSkyCloudLayers(seed, 8);
  const data = new Uint8ClampedArray(safeWidth * safeHeight * 4);
  for (let y = 0; y < safeHeight; y += 1) {
    const v = y / Math.max(1, safeHeight - 1);
    const horizonMix = smoothstep(0.3, 0.54, v);
    for (let x = 0; x < safeWidth; x += 1) {
      const u = x / safeWidth;
      const rgb: [number, number, number] = [
        top[0] * (1 - horizonMix) + horizon[0] * horizonMix,
        top[1] * (1 - horizonMix) + horizon[1] * horizonMix,
        top[2] * (1 - horizonMix) + horizon[2] * horizonMix,
      ];
      if (v < 0.76) {
        const sunDistance = Math.hypot((u - 0.742) / 0.36, (v - 0.31) / 0.36);
        blendRgb(
          rgb,
          [255, 226, 168],
          0.13 * (1 - smoothstep(0.08, 1, sunDistance)),
        );
      }
      layers.forEach((layer) => {
        const dx =
          wrappedDistance(u - layer.x) / Math.max(0.02, layer.width / 2);
        const dy = (v - layer.y) / Math.max(0.012, layer.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const cloudEdge = 1 - smoothstep(0.44, 1.08, distance);
        const noise =
          0.82 +
          0.18 *
            Math.sin((u + layer.seed * 0.000001) * 37 + v * 11) *
            Math.sin(v * 23 + layer.seed * 0.000003);
        // Keep the authored layer opacity restrained while giving the broad
        // cloud masses enough value separation to survive the 256px raster and
        // player-height camera views. The edge remains fully smooth.
        blendRgb(rgb, cloudColor, layer.opacity * cloudEdge * noise * 2.2);
      });
      const index = (y * safeWidth + x) * 4;
      data[index] = channel(rgb[0]);
      data[index + 1] = channel(rgb[1]);
      data[index + 2] = channel(rgb[2]);
      data[index + 3] = 255;
    }
  }
  // The edge average is deterministic and bounds every channel delta to 0.
  for (let y = 0; y < safeHeight; y += 1) {
    const first = y * safeWidth * 4;
    const last = (y * safeWidth + safeWidth - 1) * 4;
    for (let channelIndex = 0; channelIndex < 3; channelIndex += 1) {
      const value = channel(
        (data[first + channelIndex] + data[last + channelIndex]) / 2,
      );
      data[first + channelIndex] = value;
      data[last + channelIndex] = value;
    }
  }
  return data;
}

export function getClassicPixelColumnSeamDelta(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  let maximum = 0;
  for (let y = 0; y < height; y += 1) {
    const first = y * width * 4;
    const last = (y * width + width - 1) * 4;
    for (let channelIndex = 0; channelIndex < 3; channelIndex += 1)
      maximum = Math.max(
        maximum,
        Math.abs(data[first + channelIndex] - data[last + channelIndex]),
      );
  }
  return maximum;
}

export function isClassicMicroBevel(value: number) {
  return (
    Number.isFinite(value) &&
    value >= CLASSIC_MICRO_BEVEL_MIN &&
    value <= CLASSIC_MICRO_BEVEL_MAX
  );
}

/** Exact world-space bounds for an unrotated authoritative structural proxy. */
export function getClassicStructuralProxyBounds(
  position: readonly [number, number, number],
  size: readonly [number, number, number],
) {
  return Object.freeze({
    min: Object.freeze([
      position[0] - size[0] / 2,
      position[1] - size[1] / 2,
      position[2] - size[2] / 2,
    ] as const),
    max: Object.freeze([
      position[0] + size[0] / 2,
      position[1] + size[1] / 2,
      position[2] + size[2] / 2,
    ] as const),
  });
}

/**
 * Converts a diffuse raster into a tangent-space normal map.
 *
 * The classic surfaces are painted flat, so a sunlit wall renders as one
 * uniform value across its whole face and reads as cardboard. Treating
 * diffuse brightness as a height field recovers relief along masonry joints,
 * plank edges, and ground grain without adding any new texture assets.
 */
export function createClassicReliefPixelData(
  diffuse: Uint8ClampedArray,
  width = CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  height = CLASSIC_SURFACE_TEXTURE_MAX_SIZE,
  strength = CLASSIC_RELIEF_STRENGTH,
): Uint8ClampedArray {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const relief = new Uint8ClampedArray(safeWidth * safeHeight * 4);

  // Perceptual luminance keeps a dark joint reading as a recess rather than
  // letting a strongly tinted but equally bright texel fake one.
  const heightAt = (x: number, y: number) => {
    const wrappedX = ((x % safeWidth) + safeWidth) % safeWidth;
    const wrappedY = ((y % safeHeight) + safeHeight) % safeHeight;
    const index = (wrappedY * safeWidth + wrappedX) * 4;
    const red = diffuse[index] / 255;
    const green = diffuse[index + 1] / 255;
    const blue = diffuse[index + 2] / 255;
    return red * 0.299 + green * 0.587 + blue * 0.114;
  };

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      // Central differences on the height field give the surface slope.
      // Sampling wraps, so the map tiles without a visible seam.
      const slopeX = heightAt(x + 1, y) - heightAt(x - 1, y);
      const slopeY = heightAt(x, y + 1) - heightAt(x, y - 1);

      const normalX = -slopeX * strength;
      const normalY = -slopeY * strength;
      const normalZ = 1;
      const length = Math.sqrt(
        normalX * normalX + normalY * normalY + normalZ * normalZ,
      );

      const index = (y * safeWidth + x) * 4;
      relief[index] = Math.round(((normalX / length) * 0.5 + 0.5) * 255);
      relief[index + 1] = Math.round(((normalY / length) * 0.5 + 0.5) * 255);
      relief[index + 2] = Math.round(((normalZ / length) * 0.5 + 0.5) * 255);
      relief[index + 3] = 255;
    }
  }

  return relief;
}
