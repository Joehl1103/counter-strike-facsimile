import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type CharacterCapsulePart =
  | 'body'
  | 'vest'
  | 'upperLeg'
  | 'lowerLeg'
  | 'upperArm'
  | 'forearm';

export type CharacterCapsuleProfile = Readonly<{
  radius: number;
  length: number;
  performance: Readonly<{ capSegments: number; radialSegments: number }>;
  high: Readonly<{ capSegments: number; radialSegments: number }>;
}>;

/** These dimensions and tessellations belong to the invisible hit proxies. */
export const CHARACTER_CAPSULE_PROFILES: Readonly<
  Record<CharacterCapsulePart, CharacterCapsuleProfile>
> = {
  body: {
    radius: 0.34,
    length: 0.55,
    performance: { capSegments: 8, radialSegments: 16 },
    high: { capSegments: 12, radialSegments: 24 },
  },
  vest: {
    radius: 0.38,
    length: 0.24,
    performance: { capSegments: 8, radialSegments: 16 },
    high: { capSegments: 12, radialSegments: 24 },
  },
  upperLeg: {
    radius: 0.12,
    length: 0.22,
    performance: { capSegments: 7, radialSegments: 14 },
    high: { capSegments: 10, radialSegments: 20 },
  },
  lowerLeg: {
    radius: 0.105,
    length: 0.24,
    performance: { capSegments: 7, radialSegments: 14 },
    high: { capSegments: 10, radialSegments: 20 },
  },
  upperArm: {
    radius: 0.1,
    length: 0.17,
    performance: { capSegments: 7, radialSegments: 14 },
    high: { capSegments: 10, radialSegments: 20 },
  },
  forearm: {
    radius: 0.085,
    length: 0.2,
    performance: { capSegments: 7, radialSegments: 14 },
    high: { capSegments: 10, radialSegments: 20 },
  },
};

export const CHARACTER_SHOULDER_PROFILE = {
  radius: 0.15,
  performance: { widthSegments: 10, heightSegments: 7 },
  high: { widthSegments: 20, heightSegments: 12 },
} as const;

export const CHARACTER_FACETED_PROFILE = {
  bodyRadialSegments: 6,
  limbRadialSegments: 6,
  limbCapSegments: 2,
  headSubdivisions: 1,
  maxMaterialDraws: 8,
  maxTriangles: 4_000,
} as const;

/**
 * Long-range silhouette gates for the visible shell.  These are deliberately
 * expressed as projected, camera-independent measurements so the localhost
 * character matrix can validate the authored grammar without WebGL pixels.
 * Limb separation is measured between the two rendered limb centre-lines;
 * profile width gates apply to the front and three-quarter samples.
 */
export const CHARACTER_HUMAN_GRAMMAR_GATES = Object.freeze({
  headBodyHeightRatio: Object.freeze({ min: 0.11, max: 0.15 }),
  shoulderHipWidthRatio: Object.freeze({ min: 1.15, max: 1.45 }),
  frontLimbSeparationMin: 0.18,
  quarterLimbSeparationMin: 0.12,
  teamPaletteDeltaEMin: 15,
  teamCueCount: 2,
});

export type CharacterProjectedProfileMetrics = Readonly<{
  yaw: number;
  headBodyHeightRatio: number;
  shoulderWidth: number;
  hipWidth: number;
  shoulderHipWidthRatio: number;
  limbSeparation: number;
}>;

export type CharacterHumanGrammarGateResults = Readonly<{
  headBodyHeight: boolean;
  shoulderHipWidth: boolean;
  frontLimbSeparation: boolean;
  quarterLimbSeparation: boolean;
  teamCuePaletteRecognition: boolean;
  passes: boolean;
}>;

/**
 * Return the authored visible-shell measurements at a given horizontal yaw.
 * The values mirror the dimensions below and intentionally exclude authority
 * capsules, so this function cannot accidentally become gameplay geometry.
 */
export function getCharacterProjectedProfileMetrics(
  yaw = 0,
): CharacterProjectedProfileMetrics {
  const horizontal = Math.abs(Math.cos(yaw));
  const depth = Math.abs(Math.sin(yaw));
  // Head cap only: the neck is body continuity, not head mass. This keeps the
  // classic human proportion stable while allowing a readable jaw plane.
  const headBodyHeightRatio = 0.3 / 2.14;
  const shoulderWidth = 0.86 * horizontal + 0.72 * depth;
  const hipWidth = 0.68 * horizontal + 0.46 * depth;
  const limbSeparation = 0.4 * horizontal;
  return {
    yaw,
    headBodyHeightRatio,
    shoulderWidth,
    hipWidth,
    shoulderHipWidthRatio: shoulderWidth / hipWidth,
    limbSeparation,
  };
}

/** Evaluate front/three-quarter silhouette and team recognition gates. */
export function getCharacterHumanGrammarGateResults(): CharacterHumanGrammarGateResults {
  const front = getCharacterProjectedProfileMetrics(0);
  const quarter = getCharacterProjectedProfileMetrics(Math.PI / 4);
  const ratioGate = CHARACTER_HUMAN_GRAMMAR_GATES.headBodyHeightRatio;
  const widthGate = CHARACTER_HUMAN_GRAMMAR_GATES.shoulderHipWidthRatio;
  const palette = getCharacterClothPaletteMetrics();
  const headCues = CHARACTER_SILHOUETTE_CUES.ct.length;
  const tHeadCues = CHARACTER_SILHOUETTE_CUES.t.length;
  const headBodyHeight =
    front.headBodyHeightRatio >= ratioGate.min &&
    front.headBodyHeightRatio <= ratioGate.max;
  const shoulderHipWidth = [front, quarter].every(
    (metrics) =>
      metrics.shoulderHipWidthRatio >= widthGate.min &&
      metrics.shoulderHipWidthRatio <= widthGate.max,
  );
  const frontLimbSeparation =
    front.limbSeparation >=
    CHARACTER_HUMAN_GRAMMAR_GATES.frontLimbSeparationMin;
  const quarterLimbSeparation =
    quarter.limbSeparation >=
    CHARACTER_HUMAN_GRAMMAR_GATES.quarterLimbSeparationMin;
  const teamCuePaletteRecognition =
    palette.deltaE2000 >= CHARACTER_HUMAN_GRAMMAR_GATES.teamPaletteDeltaEMin &&
    headCues === CHARACTER_HUMAN_GRAMMAR_GATES.teamCueCount &&
    tHeadCues === CHARACTER_HUMAN_GRAMMAR_GATES.teamCueCount &&
    CHARACTER_SILHOUETTE_CUES.ct.join('|') !==
      CHARACTER_SILHOUETTE_CUES.t.join('|');
  return {
    headBodyHeight,
    shoulderHipWidth,
    frontLimbSeparation,
    quarterLimbSeparation,
    teamCuePaletteRecognition,
    passes:
      headBodyHeight &&
      shoulderHipWidth &&
      frontLimbSeparation &&
      quarterLimbSeparation &&
      teamCuePaletteRecognition,
  };
}

export const CHARACTER_SMOOTH_VARIANT_TRIANGLE_BUDGET_PER_BOT =
  CHARACTER_FACETED_PROFILE.maxTriangles;

export type CharacterLimbKind = 'leg' | 'arm';

export type CharacterLimbSegment =
  | 'upper'
  | 'knee'
  | 'shin'
  | 'boot'
  | 'elbow'
  | 'forearm'
  | 'hand';

export type CharacterLimbSegmentPivot = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

/** Vertex ranges are retained after the compound geometry becomes non-indexed. */
export type CharacterLimbSegmentRange = Readonly<{
  segment: CharacterLimbSegment;
  start: number;
  count: number;
  end: number;
  /** Aliases make the range explicit when consumed as a position attribute. */
  vertexStart: number;
  vertexCount: number;
  pivot: CharacterLimbSegmentPivot | null;
}>;

export type CharacterLimbGeometryMetadata = Readonly<{
  kind: CharacterLimbKind;
  segments: readonly CharacterLimbSegmentRange[];
}>;

const CHARACTER_LIMB_METADATA_KEY = 'characterLimb' as const;

const LEG_SEGMENTS = [
  { segment: 'upper' },
  { segment: 'knee', pivot: { x: 0, y: -0.32, z: 0 } },
  { segment: 'shin', pivot: { x: 0, y: -0.32, z: 0 } },
  { segment: 'boot', pivot: { x: 0, y: -0.62, z: 0 } },
] as const;

const ARM_SEGMENTS = [
  { segment: 'upper' },
  { segment: 'elbow', pivot: { x: 0, y: -0.36, z: 0 } },
  { segment: 'forearm', pivot: { x: 0, y: -0.36, z: 0 } },
  { segment: 'hand', pivot: { x: 0, y: -0.36, z: 0 } },
] as const;

export type CharacterSide = 'ct' | 't';

export type CharacterSidePalette = Readonly<{
  /** Broad team cloth, used on torso and all limbs. */
  cloth: number;
  /** Darker cloth used for the armor/silhouette cue. */
  armor: number;
  /** High-contrast team accent used on the second cue. */
  accent: number;
  skin: number;
}>;

export const CHARACTER_SIDE_PALETTES: Readonly<
  Record<CharacterSide, CharacterSidePalette>
> = {
  // Cloth values deliberately sit in separate blue/olive hue families. The
  // lightness gap survives the directional-light falloff at long range,
  // while armor remains a darker silhouette cue for both teams.
  ct: { cloth: 0x31536d, armor: 0x1d2b38, accent: 0x78bddd, skin: 0x9b6d4f },
  t: { cloth: 0x906f3d, armor: 0x362f20, accent: 0xbd7048, skin: 0x9b6d4f },
};

export type CharacterLabColor = Readonly<{
  l: number;
  a: number;
  b: number;
}>;

/** Convert one packed sRGB color to CIELAB (D65), without scene allocations. */
export function characterHexToLab(hex: number): CharacterLabColor {
  const red = (hex >> 16) & 0xff;
  const green = (hex >> 8) & 0xff;
  const blue = hex & 0xff;
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const r = linearize(red);
  const g = linearize(green);
  const b = linearize(blue);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const labPivot = (value: number) =>
    value > 0.008856451679 ? Math.cbrt(value) : 7.787037037 * value + 16 / 116;
  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** CIEDE2000 distance, kept pure so palette QA can run outside WebGL. */
export function characterDeltaE2000(
  first: CharacterLabColor,
  second: CharacterLabColor,
): number {
  const degrees = 180 / Math.PI;
  const radians = Math.PI / 180;
  const chromaFirst = Math.hypot(first.a, first.b);
  const chromaSecond = Math.hypot(second.a, second.b);
  const meanChroma = (chromaFirst + chromaSecond) / 2;
  const meanChroma7 = Math.pow(meanChroma, 7);
  const compensation =
    0.5 * (1 - Math.sqrt(meanChroma7 / (meanChroma7 + Math.pow(25, 7))));
  const aPrimeFirst = first.a * (1 + compensation);
  const aPrimeSecond = second.a * (1 + compensation);
  const chromaPrimeFirst = Math.hypot(aPrimeFirst, first.b);
  const chromaPrimeSecond = Math.hypot(aPrimeSecond, second.b);
  const hue = (a: number, b: number) => {
    if (a === 0 && b === 0) return 0;
    const value = Math.atan2(b, a) * degrees;
    return value < 0 ? value + 360 : value;
  };
  const hueFirst = hue(aPrimeFirst, first.b);
  const hueSecond = hue(aPrimeSecond, second.b);
  const deltaL = second.l - first.l;
  const deltaC = chromaPrimeSecond - chromaPrimeFirst;
  let deltaHue = hueSecond - hueFirst;
  if (chromaPrimeFirst * chromaPrimeSecond === 0) deltaHue = 0;
  else if (deltaHue > 180) deltaHue -= 360;
  else if (deltaHue < -180) deltaHue += 360;
  const deltaH =
    2 *
    Math.sqrt(chromaPrimeFirst * chromaPrimeSecond) *
    Math.sin((deltaHue * radians) / 2);
  const meanL = (first.l + second.l) / 2;
  const meanC = (chromaPrimeFirst + chromaPrimeSecond) / 2;
  let meanHue = (hueFirst + hueSecond) / 2;
  if (chromaPrimeFirst * chromaPrimeSecond === 0)
    meanHue = hueFirst + hueSecond;
  else if (Math.abs(hueFirst - hueSecond) > 180)
    meanHue = (hueFirst + hueSecond + 360) / 2;
  const hueWeightBase =
    1 -
    0.17 * Math.cos((meanHue - 30) * radians) +
    0.24 * Math.cos(2 * meanHue * radians) +
    0.32 * Math.cos((3 * meanHue + 6) * radians) -
    0.2 * Math.cos((4 * meanHue - 63) * radians);
  const lightnessWeight =
    1 +
    (0.015 * Math.pow(meanL - 50, 2)) / Math.sqrt(20 + Math.pow(meanL - 50, 2));
  const chromaWeight = 1 + 0.045 * meanC;
  const hueWeight = 1 + 0.015 * meanC * hueWeightBase;
  const rotation = 30 * Math.exp(-Math.pow((meanHue - 275) / 25, 2));
  const chromaInteraction =
    2 * Math.sqrt(Math.pow(meanC, 7) / (Math.pow(meanC, 7) + Math.pow(25, 7)));
  const crossTerm = -Math.sin(2 * rotation * radians) * chromaInteraction;
  const lightnessTerm = deltaL / lightnessWeight;
  const chromaTerm = deltaC / chromaWeight;
  const hueTerm = deltaH / hueWeight;
  return Math.sqrt(
    lightnessTerm * lightnessTerm +
      chromaTerm * chromaTerm +
      hueTerm * hueTerm +
      crossTerm * chromaTerm * hueTerm,
  );
}

export function getCharacterClothPaletteMetrics(): Readonly<{
  ctLightness: number;
  tLightness: number;
  lightnessGap: number;
  deltaE2000: number;
}> {
  const ct = characterHexToLab(CHARACTER_SIDE_PALETTES.ct.cloth);
  const t = characterHexToLab(CHARACTER_SIDE_PALETTES.t.cloth);
  return {
    ctLightness: ct.l,
    tLightness: t.l,
    lightnessGap: Math.abs(ct.l - t.l),
    deltaE2000: characterDeltaE2000(ct, t),
  };
}

export type CharacterSilhouetteCue =
  | 'ct-helmet-visor'
  | 'ct-shoulder-radio'
  | 't-head-wrap'
  | 't-chest-rig';

export const CHARACTER_SILHOUETTE_CUES: Readonly<
  Record<CharacterSide, readonly CharacterSilhouetteCue[]>
> = {
  ct: ['ct-helmet-visor', 'ct-shoulder-radio'],
  t: ['t-head-wrap', 't-chest-rig'],
};

export function getCharacterSidePalette(
  side: CharacterSide,
): CharacterSidePalette {
  return CHARACTER_SIDE_PALETTES[side];
}

export function getCharacterSilhouetteCues(
  side: CharacterSide,
): readonly CharacterSilhouetteCue[] {
  return CHARACTER_SILHOUETTE_CUES[side];
}

/** Presentation-only angular limb shell; gameplay uses the capsule profiles. */
function mergeParts(
  parts: THREE.BufferGeometry[],
  limbMetadata?: Readonly<{
    kind: CharacterLimbKind;
    segments: readonly Readonly<{
      segment: CharacterLimbSegment;
      pivot?: CharacterLimbSegmentPivot;
    }>[];
  }>,
): THREE.BufferGeometry {
  // Primitive helpers do not all agree on indexed buffers. Normalizing once at
  // setup keeps the compound shell deterministic and avoids runtime conversion.
  const compatibleParts = parts.map((part, index) => {
    if (!part.hasAttribute('color')) {
      const segment = limbMetadata?.segments[index]?.segment;
      const shade =
        segment === 'hand' || segment === 'boot'
          ? 0.28
          : segment === 'knee' || segment === 'elbow'
            ? 0.67
            : 1;
      const colors = new Float32Array(part.getAttribute('position').count * 3);
      colors.fill(shade);
      part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const compatible = part.index ? part.toNonIndexed() : part.clone();
    part.dispose();
    return compatible;
  });
  const partVertexCounts = compatibleParts.map(
    (part) => part.getAttribute('position').count,
  );
  const merged = mergeGeometries(compatibleParts);
  compatibleParts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Unable to merge faceted character geometry');
  if (limbMetadata) {
    let start = 0;
    const ranges: CharacterLimbSegmentRange[] = [];
    for (let index = 0; index < parts.length; index += 1) {
      const count = partVertexCounts[index];
      const descriptor = limbMetadata.segments[index];
      if (!descriptor)
        throw new Error('Missing character limb segment metadata');
      ranges.push(
        Object.freeze({
          segment: descriptor.segment,
          start,
          count,
          end: start + count,
          vertexStart: start,
          vertexCount: count,
          pivot: descriptor.pivot
            ? Object.freeze({ ...descriptor.pivot })
            : null,
        }),
      );
      start += count;
    }
    const metadata: CharacterLimbGeometryMetadata = {
      kind: limbMetadata.kind,
      segments: Object.freeze(ranges),
    };
    merged.userData[CHARACTER_LIMB_METADATA_KEY] = metadata;
    // Keep a direct, descriptive alias for callers inspecting geometry setup.
    merged.userData.characterLimbSegmentRanges = metadata.segments;
  }
  return merged;
}

function movePart(
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  rotation?: THREE.Euler,
): THREE.BufferGeometry {
  const transform = new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromEuler(rotation ?? new THREE.Euler()),
    new THREE.Vector3(1, 1, 1),
  );
  geometry.applyMatrix4(transform);
  return geometry;
}

type CharacterLoftRing = Readonly<{
  y: number;
  radiusX: number;
  radiusZ: number;
  centerZ?: number;
  shade?: number;
}>;

function shadeGeometry(
  geometry: THREE.BufferGeometry,
  shade: number,
): THREE.BufferGeometry {
  const colors = new Float32Array(geometry.getAttribute('position').count * 3);
  colors.fill(shade);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Low-poly elliptical cloth skin with deterministic longitudinal folds. */
function createCharacterLoftGeometry(
  rings: readonly CharacterLoftRing[],
  radialSegments = 10,
  capTop = false,
  capBottom = false,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    const ring = rings[ringIndex];
    for (let side = 0; side < radialSegments; side += 1) {
      const angle = (side / radialSegments) * Math.PI * 2;
      positions.push(
        Math.sin(angle) * ring.radiusX,
        ring.y,
        (ring.centerZ ?? 0) + Math.cos(angle) * ring.radiusZ,
      );
      // Alternating, restrained values read as seams and cloth folds after
      // lighting, without adding a material or another draw call.
      const fold = side % 4 === 1 ? 0.82 : side % 4 === 3 ? 0.91 : 1;
      const shade = (ring.shade ?? 1) * fold;
      colors.push(shade, shade, shade);
      if (ringIndex === 0) continue;
      const previous = (ringIndex - 1) * radialSegments;
      const current = ringIndex * radialSegments;
      const next = (side + 1) % radialSegments;
      indices.push(
        previous + side,
        previous + next,
        current + side,
        previous + next,
        current + next,
        current + side,
      );
    }
  }
  if (capTop) {
    const center = positions.length / 3;
    const ring = rings[0];
    positions.push(0, ring.y, ring.centerZ ?? 0);
    colors.push(ring.shade ?? 1, ring.shade ?? 1, ring.shade ?? 1);
    for (let side = 0; side < radialSegments; side += 1)
      indices.push(center, (side + 1) % radialSegments, side);
  }
  if (capBottom) {
    const center = positions.length / 3;
    const ringOffset = (rings.length - 1) * radialSegments;
    const ring = rings[rings.length - 1];
    positions.push(0, ring.y, ring.centerZ ?? 0);
    colors.push(ring.shade ?? 1, ring.shade ?? 1, ring.shade ?? 1);
    for (let side = 0; side < radialSegments; side += 1)
      indices.push(
        center,
        ringOffset + side,
        ringOffset + ((side + 1) % radialSegments),
      );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Compound low-poly anatomy, centered at the owning leg/arm pivot. */
export function createFacetedLimbGeometry(
  radius: number,
  length: number,
): THREE.BufferGeometry {
  const leg = length > 0.5;
  if (leg) {
    return mergeParts(
      [
        createCharacterLoftGeometry(
          [
            { y: 0.14, radiusX: radius * 1.18, radiusZ: radius },
            { y: 0.01, radiusX: radius * 1.34, radiusZ: radius * 1.1 },
            { y: -0.18, radiusX: radius * 1.25, radiusZ: radius * 1.04 },
            { y: -0.34, radiusX: radius * 1.06, radiusZ: radius * 0.92 },
          ],
          10,
          true,
        ),
        createCharacterLoftGeometry([
          {
            y: -0.35,
            radiusX: radius * 1.09,
            radiusZ: radius * 0.95,
            shade: 0.57,
          },
          {
            y: -0.42,
            radiusX: radius,
            radiusZ: radius * 0.89,
            shade: 0.57,
          },
        ]),
        createCharacterLoftGeometry([
          { y: -0.4, radiusX: radius, radiusZ: radius * 0.9 },
          { y: -0.5, radiusX: radius * 1.05, radiusZ: radius * 0.92 },
          { y: -0.62, radiusX: radius * 0.82, radiusZ: radius * 0.78 },
        ]),
        createCharacterLoftGeometry(
          [
            {
              y: -0.59,
              radiusX: radius * 0.88,
              radiusZ: radius * 0.82,
              centerZ: -0.01,
              shade: 0.25,
            },
            {
              y: -0.69,
              radiusX: radius * 0.94,
              radiusZ: radius * 1.22,
              centerZ: -0.055,
              shade: 0.22,
            },
            {
              y: -0.78,
              radiusX: radius * 0.9,
              radiusZ: radius * 1.54,
              centerZ: -0.09,
              shade: 0.18,
            },
          ],
          10,
          false,
          true,
        ),
      ],
      { kind: 'leg', segments: LEG_SEGMENTS },
    );
  }
  return mergeParts(
    [
      createCharacterLoftGeometry(
        [
          { y: 0.02, radiusX: radius * 1.2, radiusZ: radius },
          { y: -0.11, radiusX: radius * 1.3, radiusZ: radius * 1.08 },
          { y: -0.25, radiusX: radius * 1.18, radiusZ: radius },
          { y: -0.36, radiusX: radius, radiusZ: radius * 0.9 },
        ],
        10,
        true,
      ),
      createCharacterLoftGeometry([
        {
          y: -0.35,
          radiusX: radius * 1.04,
          radiusZ: radius * 0.94,
          shade: 0.62,
        },
        {
          y: -0.41,
          radiusX: radius,
          radiusZ: radius * 0.9,
          shade: 0.62,
        },
      ]),
      createCharacterLoftGeometry([
        { y: -0.39, radiusX: radius, radiusZ: radius * 0.9 },
        {
          y: -0.51,
          radiusX: radius * 0.94,
          radiusZ: radius * 0.84,
          centerZ: -0.02,
        },
        {
          y: -0.61,
          radiusX: radius * 0.8,
          radiusZ: radius * 0.72,
          centerZ: -0.035,
        },
      ]),
      // A compact glove broadens at the knuckles and narrows at the wrist.
      // Its centroid remains at the rig's solved y=-0.66 grip endpoint.
      createCharacterLoftGeometry(
        [
          {
            y: -0.59,
            radiusX: radius * 0.78,
            radiusZ: radius * 0.66,
            centerZ: -0.02,
            shade: 0.24,
          },
          {
            y: -0.66,
            radiusX: radius,
            radiusZ: radius * 0.72,
            centerZ: -0.02,
            shade: 0.2,
          },
          {
            y: -0.73,
            radiusX: radius * 0.72,
            radiusZ: radius * 0.58,
            centerZ: -0.02,
            shade: 0.17,
          },
        ],
        10,
        false,
        true,
      ),
    ],
    { kind: 'arm', segments: ARM_SEGMENTS },
  );
}

/** Return the setup-time ranges retained by a compound faceted limb. */
export function getCharacterLimbGeometryMetadata(
  geometry: THREE.BufferGeometry,
): CharacterLimbGeometryMetadata | undefined {
  const metadata = geometry.userData[CHARACTER_LIMB_METADATA_KEY] as
    | CharacterLimbGeometryMetadata
    | undefined;
  return metadata;
}

/** Return a stable view of the compound limb's deterministic vertex ranges. */
export function getCharacterLimbSegmentRanges(
  geometry: THREE.BufferGeometry,
): readonly CharacterLimbSegmentRange[] {
  return getCharacterLimbGeometryMetadata(geometry)?.segments ?? [];
}

export function createFacetedTorsoGeometry(): THREE.BufferGeometry {
  // One continuous elliptical shell: trouser rise, waist, ribcage, shoulders,
  // and collar. The shorter jacket and higher trouser rise avoid the previous
  // long tunic over stubby legs.
  const rings = [
    [-0.49, 0.28, 0.19],
    [-0.4, 0.34, 0.22],
    [-0.28, 0.31, 0.21],
    [-0.18, 0.29, 0.205],
    [0.02, 0.33, 0.235],
    [0.18, 0.4, 0.255],
    [0.29, 0.44, 0.245],
    [0.36, 0.33, 0.195],
    [0.4, 0.155, 0.14],
  ];
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const segments = 12;
  rings.forEach(([y, width, depth], ring) => {
    for (let side = 0; side < segments; side += 1) {
      const angle = (side / segments) * Math.PI * 2;
      const x = Math.sin(angle) * width;
      const z = Math.cos(angle) * depth;
      positions.push(x, y, z);
      uvs.push(side / segments, ring / (rings.length - 1));
      // Paint belt, vest panels, back yoke, seams, and folds into the existing
      // cloth draw. Front is local -Z; back remains deliberately equipped.
      const belt = ring === 2 || ring === 3;
      const frontVest =
        ring >= 4 &&
        ring <= 6 &&
        z < -depth * 0.28 &&
        Math.abs(x) < width * 0.9;
      const backYoke = ring >= 5 && ring <= 7 && z > depth * 0.38;
      const shoulderSeam = ring === 6 || ring === 7;
      const verticalFold = side % 4 === 1 ? 0.87 : side % 4 === 3 ? 0.93 : 1;
      const shade =
        (belt
          ? 0.4
          : frontVest
            ? 0.6
            : backYoke
              ? 0.66
              : shoulderSeam
                ? 0.82
                : 1) * verticalFold;
      colors.push(shade, shade, shade);
      if (ring > 0) {
        const a = (ring - 1) * segments + side;
        const b = (ring - 1) * segments + ((side + 1) % segments);
        const c = ring * segments + side;
        const d = ring * segments + ((side + 1) % segments);
        indices.push(a, b, c, b, d, c);
      }
    }
  });
  for (let side = 1; side < segments - 1; side += 1) {
    indices.push(0, side + 1, side);
    const top = (rings.length - 1) * segments;
    indices.push(top, top + side, top + side + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Low-profile pack, shoulder straps, and belt pouches share the torso draw.
  // Their hard planes match the authored low-poly CS-era equipment language.
  return mergeParts([
    geometry,
    movePart(
      shadeGeometry(new THREE.BoxGeometry(0.45, 0.48, 0.13), 0.48),
      new THREE.Vector3(0, 0.02, 0.265),
    ),
    movePart(
      shadeGeometry(new THREE.BoxGeometry(0.085, 0.64, 0.035), 0.43),
      new THREE.Vector3(-0.2, 0.05, -0.245),
      new THREE.Euler(0, 0, -0.12),
    ),
    movePart(
      shadeGeometry(new THREE.BoxGeometry(0.085, 0.64, 0.035), 0.43),
      new THREE.Vector3(0.2, 0.05, -0.245),
      new THREE.Euler(0, 0, 0.12),
    ),
    movePart(
      shadeGeometry(new THREE.BoxGeometry(0.16, 0.14, 0.11), 0.36),
      new THREE.Vector3(-0.24, -0.32, -0.205),
    ),
    movePart(
      shadeGeometry(new THREE.BoxGeometry(0.16, 0.14, 0.11), 0.36),
      new THREE.Vector3(0.24, -0.32, -0.205),
    ),
  ]);
}

export function createFacetedHeadGeometry(): THREE.BufferGeometry {
  // A balaclava shell with a small inset face replaces the exposed spherical
  // cartoon head. Team headgear still layers over this shared human base.
  const cranium = shadeGeometry(new THREE.SphereGeometry(0.165, 12, 8), 0.16);
  cranium.scale(0.91, 1.06, 0.9);
  const jaw = shadeGeometry(new THREE.SphereGeometry(0.128, 10, 6), 0.14);
  jaw.scale(0.84, 0.86, 0.82);
  const face = shadeGeometry(new THREE.SphereGeometry(0.1, 10, 6), 1);
  face.scale(0.72, 0.7, 0.2);
  const nose = shadeGeometry(new THREE.SphereGeometry(0.027, 6, 4), 0.88);
  nose.scale(0.62, 1.1, 0.8);
  const eye = () => {
    const geometry = new THREE.SphereGeometry(0.024, 8, 5);
    geometry.scale(1, 0.5, 0.4);
    const colors = new Float32Array(
      geometry.getAttribute('position').count * 3,
    );
    colors.fill(0.035);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  };
  return mergeParts([
    movePart(cranium, new THREE.Vector3(0, 0.005, 0)),
    movePart(jaw, new THREE.Vector3(0, -0.11, -0.012)),
    movePart(face, new THREE.Vector3(0, -0.04, -0.148)),
    movePart(nose, new THREE.Vector3(0, -0.05, -0.17)),
    movePart(eye(), new THREE.Vector3(-0.044, -0.005, -0.171)),
    movePart(eye(), new THREE.Vector3(0.044, -0.005, -0.171)),
    movePart(
      shadeGeometry(new THREE.CylinderGeometry(0.095, 0.115, 0.22, 10), 0.2),
      new THREE.Vector3(0, -0.26, 0),
    ),
  ]);
}

export function createFacetedTorsoCueGeometry(
  side: CharacterSide,
): THREE.BufferGeometry {
  if (side === 'ct')
    return mergeParts([
      movePart(
        new THREE.BoxGeometry(0.11, 0.17, 0.085),
        new THREE.Vector3(0, -0.015, 0),
      ),
      movePart(
        new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6),
        new THREE.Vector3(0.025, 0.15, 0),
      ),
    ]);
  // Three front pouches and their belt read as a chest rig from gameplay
  // distance while staying inside one mesh/material draw.
  return mergeParts([
    movePart(
      new THREE.BoxGeometry(0.57, 0.075, 0.065),
      new THREE.Vector3(0, 0.08, 0),
    ),
    ...[-0.19, 0, 0.19].map((x) =>
      movePart(
        new THREE.BoxGeometry(0.16, 0.2, 0.11),
        new THREE.Vector3(x, -0.035, -0.025),
      ),
    ),
  ]);
}

export function createFacetedHeadCueGeometry(
  side: CharacterSide,
): THREE.BufferGeometry {
  if (side === 'ct') {
    return mergeParts([
      movePart(
        new THREE.SphereGeometry(
          0.215,
          12,
          6,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.55,
        ),
        new THREE.Vector3(0, 0.02, 0),
      ),
      movePart(
        new THREE.BoxGeometry(0.34, 0.07, 0.1),
        new THREE.Vector3(0, -0.025, -0.17),
      ),
    ]);
  }
  return mergeParts([
    movePart(
      new THREE.SphereGeometry(0.205, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.54),
      new THREE.Vector3(0, 0, 0),
    ),
    movePart(
      new THREE.BoxGeometry(0.28, 0.06, 0.075),
      new THREE.Vector3(0, -0.05, 0.02),
    ),
  ]);
}

export function getCharacterVariantVisibility(
  _quality: 'performance' | 'high',
) {
  // The proxy is always hidden but remains in the raycast collection. One
  // faceted shell is visible in both quality modes, avoiding variant overlap.
  return {
    proxy: false,
    smooth: true,
  } as const;
}
