import * as THREE from 'three';

export const TRAVEL_SURFACE_SEGMENTS_PER_RIBBON = 16;
export const TRAVEL_SURFACE_TRIANGLE_BUDGET = 384;
export const TRAVEL_SURFACE_HEIGHT = 0.045;
export const TRAVEL_SURFACE_TILE_METERS = 2;

export type TravelSurfaceRibbon = Readonly<{
  name: string;
  start: readonly [number, number];
  end: readonly [number, number];
  halfWidth: number;
  seed: number;
}>;

export const DUSTLINE_TRAVEL_SURFACE_RIBBONS: readonly TravelSurfaceRibbon[] =
  Object.freeze([
    Object.freeze({
      name: 'center-north-south',
      start: Object.freeze([0, -32] as const),
      end: Object.freeze([0, 32] as const),
      halfWidth: 2.7,
      seed: 103,
    }),
    Object.freeze({
      name: 'central-crossing',
      start: Object.freeze([-32, -5] as const),
      end: Object.freeze([32, -5] as const),
      halfWidth: 2.1,
      seed: 211,
    }),
    Object.freeze({
      name: 'east-outer-lane',
      start: Object.freeze([27, -32] as const),
      end: Object.freeze([27, 32] as const),
      halfWidth: 3.2,
      seed: 307,
    }),
    Object.freeze({
      name: 'west-outer-lane',
      start: Object.freeze([-27, -32] as const),
      end: Object.freeze([-27, 32] as const),
      halfWidth: 3.2,
      seed: 401,
    }),
    Object.freeze({
      name: 'east-site-apron',
      start: Object.freeze([21, -28] as const),
      end: Object.freeze([33, -28] as const),
      halfWidth: 5.5,
      seed: 503,
    }),
    Object.freeze({
      name: 'west-site-apron',
      start: Object.freeze([-34, 18] as const),
      end: Object.freeze([-22, 18] as const),
      halfWidth: 5.5,
      seed: 601,
    }),
  ]);

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function isFiniteRibbon(ribbon: TravelSurfaceRibbon) {
  return (
    ribbon.name.length > 0 &&
    [...ribbon.start, ...ribbon.end, ribbon.halfWidth, ribbon.seed].every(
      Number.isFinite,
    ) &&
    ribbon.halfWidth > 0 &&
    Math.hypot(
      ribbon.end[0] - ribbon.start[0],
      ribbon.end[1] - ribbon.start[1],
    ) > 0.001
  );
}

/**
 * Builds one world-UV-mapped surface from a few long irregular ribbons. The
 * shallow mesh adds route-scale texture contrast without joining any gameplay
 * collision or shot-surface collection.
 */
export function createTravelSurfaceGeometry(
  ribbons: readonly TravelSurfaceRibbon[] = DUSTLINE_TRAVEL_SURFACE_RIBBONS,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const acceptedNames: string[] = [];

  ribbons.filter(isFiniteRibbon).forEach((ribbon) => {
    acceptedNames.push(ribbon.name);
    const baseVertex = positions.length / 3;
    const directionX = ribbon.end[0] - ribbon.start[0];
    const directionZ = ribbon.end[1] - ribbon.start[1];
    const length = Math.hypot(directionX, directionZ);
    const tangentX = directionX / length;
    const tangentZ = directionZ / length;
    const sideX = -tangentZ;
    const sideZ = tangentX;

    for (
      let segment = 0;
      segment <= TRAVEL_SURFACE_SEGMENTS_PER_RIBBON;
      segment += 1
    ) {
      const progress = segment / TRAVEL_SURFACE_SEGMENTS_PER_RIBBON;
      const centerX = THREE.MathUtils.lerp(
        ribbon.start[0],
        ribbon.end[0],
        progress,
      );
      const centerZ = THREE.MathUtils.lerp(
        ribbon.start[1],
        ribbon.end[1],
        progress,
      );
      const centerDrift =
        (seededUnit(ribbon.seed + segment * 47) - 0.5) *
        Math.min(0.32, ribbon.halfWidth * 0.12);
      for (const side of [-1, 1] as const) {
        const edgeVariation =
          0.88 +
          seededUnit(ribbon.seed + segment * 71 + (side === -1 ? 13 : 29)) *
            0.18;
        const offset = centerDrift + side * ribbon.halfWidth * edgeVariation;
        const x = centerX + sideX * offset;
        const z = centerZ + sideZ * offset;
        positions.push(x, 0, z);
        uvs.push(
          x / TRAVEL_SURFACE_TILE_METERS,
          z / TRAVEL_SURFACE_TILE_METERS,
        );
      }
    }

    for (
      let segment = 0;
      segment < TRAVEL_SURFACE_SEGMENTS_PER_RIBBON;
      segment += 1
    ) {
      const a = baseVertex + segment * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = 'merged-worn-cobblestone-travel-network';
  geometry.userData.ribbonNames = Object.freeze(acceptedNames);
  return geometry;
}

export function createTravelSurfaceMesh(
  material: THREE.Material,
  ribbons: readonly TravelSurfaceRibbon[] = DUSTLINE_TRAVEL_SURFACE_RIBBONS,
) {
  const mesh = new THREE.Mesh(createTravelSurfaceGeometry(ribbons), material);
  mesh.name = 'merged-worn-cobblestone-travel-network-visual-only';
  mesh.position.y = TRAVEL_SURFACE_HEIGHT;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.raycast = () => undefined;
  mesh.userData.visualOnly = true;
  return mesh;
}

export function travelSurfaceTriangleCount(geometry: THREE.BufferGeometry) {
  return Math.floor(
    (geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0) /
      3,
  );
}
