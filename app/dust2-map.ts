import { type HullBox, type WalkableRamp, type PlayerCollisionWorld, resolvePlayerMotion } from './player-collision.ts';

export interface MapRegion {
  name: string; minX: number; minZ: number; maxX: number; maxZ: number; height: number;
}
export interface MapDefinition {
  id: string;
  bounds: readonly [number, number];
  regions: readonly MapRegion[];
  ramps: readonly WalkableRamp[];
  spawns: Readonly<Record<'ct' | 't', readonly [number, number]>>;
  teamSpawns: Readonly<Record<'ct' | 't', readonly (readonly [number, number])[]>>;
  sites: Readonly<Record<'A' | 'B', readonly [number, number]>>;
  nodes: Readonly<Record<string, readonly [number, number]>>;
  edges: readonly (readonly [string, string])[];
  solids: readonly (HullBox & { kind: 'door' | 'crate' | 'roof' })[];
}
const region = (name: string, minX: number, minZ: number, maxX: number, maxZ: number, height: number): MapRegion =>
  ({ name, minX, minZ, maxX, maxZ, height });
const ramp = (minX: number, minZ: number, maxX: number, maxZ: number, axis: 'x' | 'z', startHeight: number, endHeight: number): WalkableRamp =>
  ({ minX, minZ, maxX, maxZ, axis, startHeight, endHeight, baseHeight: -0.2 });
const solid = (kind: 'door' | 'crate' | 'roof', min: [number, number, number], max: [number, number, number]) =>
  ({ kind, min: { x: min[0], y: min[1], z: min[2] }, max: { x: max[0], y: max[1], z: max[2] } });

// Stepped masonry portals use the same boxes for collision and rendering.
// Their lowest inner edge is above a standing/jumping player; ground routes
// and the existing timber leaves retain their exact footprints.
export const DUST2_DOOR_PORTALS = Object.freeze([
  { name: 'mid', x: 0, z: -14, floor: 0, opening: 3, axis: 'x' },
  { name: 'long', x: 14, z: 20, floor: 2, opening: 5, axis: 'z' },
  { name: 'b', x: -18, z: -20, floor: 1, opening: 4, axis: 'z' },
] as const);

function buildDoorPortalSolids() {
  const boxes: ReturnType<typeof solid>[] = [];
  for (const portal of DUST2_DOOR_PORTALS) {
    const halfWidth = portal.opening / 2;
    const outer = halfWidth + 0.48;
    const addBlock = (start: number, end: number, bottom: number, top: number) => {
      const min: [number, number, number] = portal.axis === 'x'
        ? [portal.x + start, portal.floor + bottom, portal.z - 0.4]
        : [portal.x - 0.4, portal.floor + bottom, portal.z + start];
      const max: [number, number, number] = portal.axis === 'x'
        ? [portal.x + end, portal.floor + top, portal.z + 0.4]
        : [portal.x + 0.4, portal.floor + top, portal.z + end];
      boxes.push(solid('roof', min, max));
    };
    for (const side of [-1, 1]) {
      addBlock(side < 0 ? -outer : halfWidth, side < 0 ? -halfWidth : outer, 0, 3.25);
      for (let course = 0; course < 16; course++) {
        const inside = halfWidth * Math.sqrt(1 - (course / 16) ** 2);
        addBlock(side < 0 ? -outer : inside, side < 0 ? -inside : outer,
          3.25 + course * (1.5 / 16), 3.25 + (course + 1) * (1.5 / 16));
      }
    }
    addBlock(-outer, outer, 4.75, 5.05);
  }
  return boxes;
}

// Original project coordinates, reconstructed from public route topology.
// This is not an extracted BSP or a claim of surveyed original dimensions.
export const DUST2_MAP: MapDefinition = {
  id: 'dust2-recreation-v1', bounds: [-36, 36],
  regions: [
    region('T spawn', -10, 18, 10, 32, 2),
    region('top mid', -6, 4, 4, 20, 2),
    region('mid', -6, -18, 4, 4, 0),
    region('long approach', 6, 18, 24, 26, 2),
    region('outside long', 10, 12, 26, 24, 2),
    region('long A', 22, -24, 32, 18, 1),
    region('pit', 30, 16, 34, 26, 0.5),
    region('A site', 16, -32, 32, -18, 2),
    region('A raised platform', 18, -32, 22, -28, 2.3),
    region('catwalk ramp', 2, 2, 10, 8, 0),
    region('catwalk', 8, -14, 14, 8, 2),
    region('short A', 8, -20, 22, -10, 2),
    region('CT spawn', -10, -28, 8, -16, 0),
    region('CT A ramp', 8, -28, 18, -22, 0),
    region('CT B passage', -20, -24, -8, -16, 0),
    region('B window', -22, -28, -14, -24, 1),
    region('B site', -34, -30, -18, -10, 1),
    region('upper tunnels', -28, -12, -20, 14, 1),
    region('T tunnel approach', -26, 10, -6, 22, 1),
    region('lower tunnel', -20, 0, -6, 6, 0),
  ],
  ramps: [
    ramp(-6, 4, 4, 10, 'z', 0, 2),
    ramp(22, 10, 32, 18, 'z', 1, 2),
    ramp(22, -22, 32, -14, 'z', 2, 1),
    ramp(26, 16, 32, 22, 'x', 2, 0.5),
    ramp(2, 2, 10, 8, 'x', 0, 2),
    ramp(8, -28, 16, -22, 'x', 0, 2),
    ramp(-20, -24, -14, -16, 'x', 1, 0),
    ramp(-22, 0, -14, 6, 'x', 1, 0),
    ramp(-14, 16, -6, 22, 'x', 1, 2),
    ramp(-16, -28, -8, -24, 'x', 1, 0),
  ],
  spawns: { ct: [0, -22], t: [0, 26] },
  teamSpawns: {
    ct: [[0, -22], [-6, -24], [-3, -26], [3, -26], [6, -24]],
    t: [[0, 26], [-6, 26], [-3, 28], [3, 28], [6, 26]],
  },
  sites: { A: [24, -26], B: [-26, -22] },
  nodes: {
    t: [0, 26], topMid: [0, 12], mid: [0, 0], midDoors: [0, -14], ct: [0, -22],
    longDoors: [14, 20], outsideLong: [26, 18], long: [26, 0], longRamp: [26, -18], a: [24, -26],
    pit: [32, 20], catEntry: [2, 4], catwalk: [10, 4], short: [10, -14], ctRamp: [12, -25],
    tunnelEntry: [-10, 20], tunnelApproach: [-18, 18], upper: [-24, 6], bTunnel: [-25, -8], b: [-26, -22],
    lower: [-14, 2], tunnelStairs: [-20, 2], bDoors: [-18, -20],
    windowEntry: [-10, -26], bWindow: [-18, -26],
  },
  edges: [
    ['t', 'topMid'], ['topMid', 'mid'], ['mid', 'midDoors'], ['midDoors', 'ct'],
    ['t', 'longDoors'], ['longDoors', 'outsideLong'], ['outsideLong', 'long'], ['long', 'longRamp'], ['longRamp', 'a'],
    ['outsideLong', 'pit'], ['mid', 'catEntry'], ['catEntry', 'catwalk'], ['catwalk', 'short'], ['short', 'a'],
    ['ct', 'ctRamp'], ['ctRamp', 'a'], ['ct', 'bDoors'], ['bDoors', 'b'],
    ['t', 'tunnelEntry'], ['tunnelEntry', 'tunnelApproach'], ['tunnelApproach', 'upper'], ['upper', 'bTunnel'], ['bTunnel', 'b'],
    ['mid', 'lower'], ['lower', 'tunnelStairs'], ['tunnelStairs', 'upper'],
    ['ct', 'windowEntry'], ['windowEntry', 'bWindow'], ['bWindow', 'b'],
  ],
  solids: [
    ...buildDoorPortalSolids(),
    solid('door', [-6, 0, -14.3], [-1.5, 3.2, -13.7]),
    solid('door', [1.5, 0, -14.3], [4, 3.2, -13.7]),
    solid('door', [13.7, 2, 12], [14.3, 5.2, 17.5]),
    solid('door', [13.7, 2, 22.5], [14.3, 5.2, 26]),
    solid('door', [-18.3, 1, -24], [-17.7, 4.2, -22]),
    solid('door', [-18.3, 1, -18], [-17.7, 4.2, -16]),
    solid('roof', [-28, 4.2, -10], [-20, 5.2, 12]),
    solid('roof', [-20, 3.2, 0], [-6, 4.2, 6]),
    solid('roof', [-22, 3, -28], [-20, 6, -24]),
    solid('crate', [28, 2, -30], [31, 4, -27]),
    solid('crate', [29, 2, -24], [32, 3.5, -21]),
    solid('crate', [-33, 1, -27], [-30, 3.5, -24]),
    solid('crate', [-22, 1, -14], [-19, 3, -11]),
  ],
};

function contains(rect: { minX: number; maxX: number; minZ: number; maxZ: number }, x: number, z: number) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}
export function isMapWalkable(x: number, z: number) {
  return DUST2_MAP.regions.some(r => contains(r, x, z)) || DUST2_MAP.ramps.some(r => contains(r, x, z));
}

// Merge equal-height 2-unit cells into rectangles; one map definition drives
// both collision and rendering, without thousands of per-cell meshes.
function buildMapBoxes() {
  const min = -36;
  const size = 36;
  const cells: Array<Array<number | null>> = [];
  for (let row = 0; row < size; row++) {
    cells[row] = [];
    for (let col = 0; col < size; col++) {
      const x = min + col * 2 + 1;
      const z = min + row * 2 + 1;
      const regions = DUST2_MAP.regions.filter(r => contains(r, x, z));
      cells[row][col] = DUST2_MAP.ramps.some(r => contains(r, x, z)) ? null
        : regions.length ? Math.max(...regions.map(r => r.height)) : 6;
    }
  }
  const walls: HullBox[] = [];
  const floors: HullBox[] = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const value = cells[row][col];
    if (value === null) continue;
    let width = 1;
    while (col + width < size && cells[row][col + width] === value) width++;
    let depth = 1;
    while (row + depth < size && cells[row + depth].slice(col, col + width).every(v => v === value)) depth++;
    for (let dz = 0; dz < depth; dz++) for (let dx = 0; dx < width; dx++) cells[row + dz][col + dx] = null;
    const box: HullBox = {
      min: { x: min + col * 2, y: value === 6 ? -0.2 : value - 0.2, z: min + row * 2 },
      max: { x: min + (col + width) * 2, y: value, z: min + (row + depth) * 2 },
    };
    (value === 6 ? walls : floors).push(box);
  }
  return { walls, floors };
}
export const DUST2_GEOMETRY = buildMapBoxes();
export const DUST2_FLOOR_WORLD: PlayerCollisionWorld = {
  boxes: DUST2_GEOMETRY.floors, ramps: DUST2_MAP.ramps, floorHeight: 0, actorBlocks: () => false,
};
export const DUST2_COLLISION_WORLD: PlayerCollisionWorld = {
  ...DUST2_FLOOR_WORLD, boxes: [...DUST2_GEOMETRY.walls, ...DUST2_GEOMETRY.floors, ...DUST2_MAP.solids],
};
export function getMapGroundHeight(x: number, z: number) {
  return resolvePlayerMotion(DUST2_FLOOR_WORLD, { x, feet: 20, z }, { x: 0, y: -40, z: 0 }, 1.8, false).feet;
}
export function getMapSupportHeight(x: number, z: number, below: number) {
  return resolvePlayerMotion(DUST2_COLLISION_WORLD, { x, feet: below, z }, { x: 0, y: -40, z: 0 }, 0.1, false).feet;
}

export function findMapNodePath(start: string, end: string): string[] {
  if (!DUST2_MAP.nodes[start] || !DUST2_MAP.nodes[end]) return [];
  const distance = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, string>();
  const open = new Set(Object.keys(DUST2_MAP.nodes));
  while (open.size) {
    const current = [...open].reduce((a, b) => (distance.get(a) ?? Infinity) < (distance.get(b) ?? Infinity) ? a : b);
    if (!Number.isFinite(distance.get(current))) break;
    if (current === end) {
      const path = [end];
      while (path[0] !== start) path.unshift(previous.get(path[0])!);
      return path;
    }
    open.delete(current);
    for (const [a, b] of DUST2_MAP.edges) {
      const next = a === current ? b : b === current ? a : null;
      if (!next || !open.has(next)) continue;
      const p = DUST2_MAP.nodes[current];
      const q = DUST2_MAP.nodes[next];
      const cost = distance.get(current)! + Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (cost < (distance.get(next) ?? Infinity)) { distance.set(next, cost); previous.set(next, current); }
    }
  }
  return [];
}
export function mapRoute(...nodes: string[]): Array<[number, number]> {
  return nodes.map(id => [...DUST2_MAP.nodes[id]] as [number, number]);
}

export function canTraverseMapSegment(from: readonly [number, number], to: readonly [number, number]) {
  let position = { x: from[0], feet: getMapGroundHeight(...from), z: from[1] };
  const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.15));
  const displacement = { x: (to[0] - from[0]) / steps, y: -0.00145, z: (to[1] - from[1]) / steps };
  for (let i = 0; i < steps; i++) {
    const next = resolvePlayerMotion(DUST2_COLLISION_WORLD, position, displacement, 1.8, true);
    if (next.blockedX || next.blockedZ || !next.grounded) return false;
    position = next;
  }
  return true;
}

export function getMapNavigationPath(from: readonly [number, number], to: readonly [number, number]): Array<[number, number]> {
  if (canTraverseMapSegment(from, to)) return [[...to]];
  const nearestReachable = (point: readonly [number, number], arriving: boolean) =>
    Object.entries(DUST2_MAP.nodes)
      .sort(([, a], [, b]) => Math.hypot(a[0] - point[0], a[1] - point[1]) - Math.hypot(b[0] - point[0], b[1] - point[1]))
      .find(([, node]) => arriving ? canTraverseMapSegment(node, point) : canTraverseMapSegment(point, node))?.[0];
  const start = nearestReachable(from, false);
  const end = nearestReachable(to, true);
  if (!start || !end) return [];
  return [...mapRoute(...findMapNodePath(start, end)), [...to]];
}
