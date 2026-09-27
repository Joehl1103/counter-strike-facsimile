export type ExteriorVisualPlacement = readonly [
  x: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationY: number,
];

export type CrateVisualPlacement = readonly [x: number, y: number, z: number];

export type CrateDrapeVariant = Readonly<{
  crateIndex: 0 | 1 | 2 | 3 | 4 | 5;
  materialIndex: 0 | 1 | 2;
}>;

export const CRATE_COLLIDER_SIZE = 2.3;
export const CRATE_DRAPE_SIZE = 2.46;
export const CRATE_DRAPE_TOP_Y = 2.36;

export const CRATE_VISUAL_PLACEMENTS = [
  [-25, 1.15, 8],
  [-10, 1.15, -3],
  [8, 1.15, 1],
  [25, 1.15, -20],
  [24, 1.15, 10],
  [-7, 1.15, -26],
] as const satisfies readonly CrateVisualPlacement[];

export const CRATE_DRAPE_VARIANTS = [
  { crateIndex: 0, materialIndex: 0 },
  { crateIndex: 1, materialIndex: 1 },
  { crateIndex: 2, materialIndex: 2 },
  { crateIndex: 3, materialIndex: 0 },
  { crateIndex: 4, materialIndex: 1 },
  { crateIndex: 5, materialIndex: 2 },
] as const satisfies readonly CrateDrapeVariant[];

export const EXTERIOR_WALL_EDGE = 36;
export const EXTERIOR_WALL_INNER_EDGE = 34;
// Includes the 5.2-unit collider and its 0.23-unit visual coping centered at 5.28.
export const EXTERIOR_WALL_TOP = 5.4;
export const PLAYER_STANDING_EYE_HEIGHT = 1.68;
export const EXTERIOR_VISUAL_CLEARANCE = 2;
export const EXTERIOR_MESA_BASE_RADIUS = 1.18;
export const EXTERIOR_MESA_RADIAL_SEGMENTS = 7;
export const EXTERIOR_MESA_HEIGHT_SEGMENTS = 2;
export const EXTERIOR_DUNE_WIDTH_SEGMENTS = 10;
export const EXTERIOR_DUNE_HEIGHT_SEGMENTS = 5;
export const EXTERIOR_VISUAL_TRIANGLE_BUDGET = 1_200;

export const EXTERIOR_MESA_PLACEMENTS = [
  [-27, -48, 5, 7.1, 3.4, 0.14],
  [0, -45, 4.4, 6.7, 3, -0.26],
  [27, -49, 5.3, 7.2, 3.8, 0.18],
  [-26, 48, 4.8, 7.1, 3.3, -0.18],
  [2, 45, 4.1, 6.7, 2.9, 0.29],
  [28, 49, 5.5, 7.2, 3.5, -0.12],
  [-48, -22, 3.5, 7.1, 5.2, 0.21],
  [-46, 5, 3.2, 6.8, 4.5, -0.17],
  [-49, 28, 3.6, 7.2, 5.3, 0.11],
  [48, -24, 3.4, 7.1, 5, -0.19],
  [46, 7, 2.9, 6.8, 4.4, 0.24],
  [49, 28, 3.8, 7.2, 5.4, -0.13],
] as const satisfies readonly ExteriorVisualPlacement[];

export const EXTERIOR_DUNE_PLACEMENTS = [
  [-47, -47, 8, 7, 5, 0.1],
  [47, -47, 7.5, 7, 5.4, -0.15],
  [-47, 47, 8.3, 7, 5.2, 0.18],
  [47, 47, 7.7, 7, 5.6, -0.12],
  [0, -49, 10, 7.2, 5.8, 0.04],
  [1, 49, 9.5, 7.1, 6.2, -0.05],
] as const satisfies readonly ExteriorVisualPlacement[];

export function isExteriorVisualPlacement(
  x: number,
  z: number,
  footprintRadius: number,
) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    !Number.isFinite(footprintRadius) ||
    footprintRadius <= 0
  )
    return false;
  const minimumEdge = EXTERIOR_WALL_EDGE + EXTERIOR_VISUAL_CLEARANCE;
  return (
    Math.abs(x) - footprintRadius >= minimumEdge ||
    Math.abs(z) - footprintRadius >= minimumEdge
  );
}

export function isExteriorPeakVisibleFromCenter(
  x: number,
  z: number,
  peakY: number,
) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    !Number.isFinite(peakY) ||
    peakY <= PLAYER_STANDING_EYE_HEIGHT
  )
    return false;
  const boundaryDistance = Math.max(Math.abs(x), Math.abs(z));
  if (boundaryDistance <= EXTERIOR_WALL_INNER_EDGE) return false;
  const wallCrossingY =
    PLAYER_STANDING_EYE_HEIGHT +
    (peakY - PLAYER_STANDING_EYE_HEIGHT) *
      (EXTERIOR_WALL_INNER_EDGE / boundaryDistance);
  return wallCrossingY > EXTERIOR_WALL_TOP;
}
