export type RenderQuality = 'high' | 'performance';

export type ClassicToneMapping = 'none' | 'linear' | 'aces';

export type ClassicRenderProfile = Readonly<{
  toneMapping: ClassicToneMapping;
  toneMappingExposure: number;
  fogColor: number;
  backgroundColor: number;
  fogNear: number;
  fogFar: number;
  hemisphereSkyColor: number;
  hemisphereGroundColor: number;
  hemisphereIntensity: number;
  sunIntensity: number;
  shadowMapSize: number;
}>;

const CLASSIC_FOG_COLOR = 0xc2ccc9;

export function getClassicRenderProfile(
  quality: RenderQuality,
): ClassicRenderProfile {
  const highQuality = quality === 'high';
  // A filmic curve rolls off highlights so lit surfaces keep a shading
  // gradient instead of clipping to flat white. The previous NoToneMapping
  // setup drove standard materials past 1.0 across whole faces, which is
  // what flattened walls into cardboard and hid every shadow.
  return {
    toneMapping: 'aces',
    toneMappingExposure: 1.32,
    fogColor: CLASSIC_FOG_COLOR,
    backgroundColor: CLASSIC_FOG_COLOR,
    fogNear: highQuality ? 40 : 35,
    fogFar: highQuality ? 90 : 76,
    // A brighter warm ground hemisphere lifts shadow-facing masonry through
    // the normal-responsive PBR light path. The sun remains dominant enough
    // to preserve contact shadows and façade relief.
    hemisphereSkyColor: 0xd8e8ee,
    hemisphereGroundColor: 0xc4a77b,
    hemisphereIntensity: 1.4,
    sunIntensity: 2.6,
    shadowMapSize: highQuality ? 2048 : 0,
  };
}

export const MAX_HIGH_QUALITY_PIXEL_RATIO = 2;

export type StructuralVertexTone = Readonly<{
  r: number;
  g: number;
  b: number;
}>;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function getStructuralVertexTone(
  normalizedHeight: number,
  normalY: number,
  seed: number,
): StructuralVertexTone {
  const safeHeight = Number.isFinite(normalizedHeight)
    ? clamp(normalizedHeight, 0, 1)
    : 0.5;
  const safeNormalY = Number.isFinite(normalY) ? clamp(normalY, -1, 1) : 0;
  const safeSeed = Number.isFinite(seed) ? seed : 0;
  const hash = Math.sin(safeSeed * 12.9898 + 78.233) * 43758.5453;
  const seededVariation = (hash - Math.floor(hash) - 0.5) * 0.026;
  const upwardLight = Math.max(0, safeNormalY) * 0.035;
  const tone = 0.885 + safeHeight * 0.075 + upwardLight + seededVariation;

  return {
    r: clamp(tone * 1.012, 0.84, 1.04),
    g: clamp(tone, 0.84, 1.04),
    b: clamp(tone * 0.978, 0.84, 1.04),
  };
}

export function getRenderPixelRatio(
  quality: RenderQuality,
  devicePixelRatio: number,
) {
  if (quality === 'performance') return 1;
  const safeDevicePixelRatio =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  return Math.min(safeDevicePixelRatio, MAX_HIGH_QUALITY_PIXEL_RATIO);
}
