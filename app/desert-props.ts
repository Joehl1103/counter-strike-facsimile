import * as THREE from 'three';

export const DESERT_MOUNTAIN_PANORAMA_RADIUS = 90;
export const DESERT_MOUNTAIN_PANORAMA_HEIGHT = 60;
export const DESERT_MOUNTAIN_PANORAMA_BOTTOM = -9;
export const DESERT_MOUNTAIN_PANORAMA_SEGMENTS = 64;
export const DESERT_MOUNTAIN_PANORAMA_TRIANGLE_BUDGET = 128;
export const DESERT_MOUNTAIN_PANORAMA_TEXTURE_WIDTH = 1774;
export const DESERT_MOUNTAIN_PANORAMA_TEXTURE_HEIGHT = 887;
export const DESERT_MOUNTAIN_PANORAMA_TEXTURE_BYTES = Math.ceil(
  DESERT_MOUNTAIN_PANORAMA_TEXTURE_WIDTH *
    DESERT_MOUNTAIN_PANORAMA_TEXTURE_HEIGHT *
    4 *
    (4 / 3),
);
export const DESERT_PROP_DRAW_BUDGET = 8;
export const DESERT_PROP_TRIANGLE_BUDGET = 7_192;

export type PalmPlacement = Readonly<{
  x: number;
  z: number;
  scale: number;
  lean: number;
}>;

export type RockPlacement = Readonly<{
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation: readonly [number, number, number];
}>;

export type DesertSurfaceOptions = Readonly<{
  map?: THREE.Texture | null;
}>;

type GeometryChannels = {
  positions: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function pushColor(colors: number[], color: readonly [number, number, number]) {
  colors.push(color[0], color[1], color[2]);
}

function buildGeometry(channels: GeometryChannels) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(channels.positions, 3),
  );
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(channels.uvs, 2),
  );
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(channels.colors, 3),
  );
  geometry.setIndex(channels.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** One image-backed cylinder supplies distant terrain behind arena geometry. */
export function createMountainPanoramaGeometry() {
  const geometry = new THREE.CylinderGeometry(
    DESERT_MOUNTAIN_PANORAMA_RADIUS,
    DESERT_MOUNTAIN_PANORAMA_RADIUS,
    DESERT_MOUNTAIN_PANORAMA_HEIGHT,
    DESERT_MOUNTAIN_PANORAMA_SEGMENTS,
    1,
    true,
  );
  const indices = geometry.getIndex();
  if (!indices) throw new Error('mountain panorama geometry must be indexed');
  for (let index = 0; index < indices.count; index += 3) {
    const second = indices.getX(index + 1);
    indices.setX(index + 1, indices.getX(index + 2));
    indices.setX(index + 2, second);
  }
  indices.needsUpdate = true;
  geometry.translate(
    0,
    DESERT_MOUNTAIN_PANORAMA_BOTTOM + DESERT_MOUNTAIN_PANORAMA_HEIGHT / 2,
    0,
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = 'inward-desert-mountain-panorama-cylinder';
  return geometry;
}

export function createMountainPanoramaMesh(texture: THREE.Texture) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.03,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(createMountainPanoramaGeometry(), material);
  mesh.name = 'desert-mountain-panorama-visual-only';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.raycast = () => undefined;
  mesh.userData.visualOnly = true;
  return mesh;
}

function appendPalmTrunk(
  channels: GeometryChannels,
  placement: PalmPlacement,
  palmIndex: number,
) {
  const radialSegments = 8;
  const heightSegments = 5;
  const height = 0.3 + 6.2 * placement.scale;
  const base = channels.positions.length / 3;
  for (let level = 0; level <= heightSegments; level += 1) {
    const t = level / heightSegments;
    const centerX = placement.x + placement.lean * t ** 1.35;
    const centerZ =
      placement.z + Math.sin(t * Math.PI) * 0.08 * placement.scale;
    const radius = THREE.MathUtils.lerp(0.2, 0.105, t) * placement.scale;
    for (let segment = 0; segment <= radialSegments; segment += 1) {
      const u = segment / radialSegments;
      const angle = u * Math.PI * 2;
      channels.positions.push(
        centerX + Math.cos(angle) * radius,
        t * height,
        centerZ + Math.sin(angle) * radius,
      );
      channels.uvs.push(u, t * 2.5);
      const stripe = (level + palmIndex) % 2 === 0 ? 0.94 : 1.04;
      pushColor(channels.colors, [0.46 * stripe, 0.33 * stripe, 0.2 * stripe]);
    }
  }
  const stride = radialSegments + 1;
  for (let level = 0; level < heightSegments; level += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const a = base + level * stride + segment;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      channels.indices.push(a, c, b, b, c, d);
    }
  }
  return new THREE.Vector3(placement.x + placement.lean, height, placement.z);
}

function appendPalmLeaves(
  channels: GeometryChannels,
  crown: THREE.Vector3,
  placement: PalmPlacement,
  palmIndex: number,
) {
  const leafCount = 8;
  const lengthSegments = 6;
  for (let leaf = 0; leaf < leafCount; leaf += 1) {
    const angle = (leaf / leafCount) * Math.PI * 2 + palmIndex * 0.23;
    const sideX = -Math.sin(angle);
    const sideZ = Math.cos(angle);
    const length = placement.scale * (2.25 + (leaf % 3) * 0.18);
    const base = channels.positions.length / 3;
    for (let segment = 0; segment <= lengthSegments; segment += 1) {
      const t = segment / lengthSegments;
      const width =
        placement.scale *
        (0.035 + Math.sin(Math.PI * clamp(t, 0, 1)) * 0.34) *
        (1 - t * 0.42);
      const centerX = crown.x + Math.cos(angle) * length * t;
      const centerY =
        crown.y + 0.18 * placement.scale * t - 0.82 * placement.scale * t ** 2;
      const centerZ = crown.z + Math.sin(angle) * length * t;
      for (const side of [-1, 1] as const) {
        channels.positions.push(
          centerX + sideX * width * side,
          centerY,
          centerZ + sideZ * width * side,
        );
        channels.uvs.push((side + 1) / 2, t);
        const variation = 0.92 + ((leaf + palmIndex) % 3) * 0.055;
        pushColor(channels.colors, [
          0.31 * variation,
          0.45 * variation,
          0.22 * variation,
        ]);
      }
    }
    for (let segment = 0; segment < lengthSegments; segment += 1) {
      const a = base + segment * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      channels.indices.push(a, c, b, b, c, d);
    }
  }
}

export function createPalmGroveGeometries(
  placements: readonly PalmPlacement[],
) {
  const trunks: GeometryChannels = {
    positions: [],
    uvs: [],
    colors: [],
    indices: [],
  };
  const leaves: GeometryChannels = {
    positions: [],
    uvs: [],
    colors: [],
    indices: [],
  };
  placements.forEach((placement, index) => {
    const crown = appendPalmTrunk(trunks, placement, index);
    appendPalmLeaves(leaves, crown, placement, index);
  });
  const trunkGeometry = buildGeometry(trunks);
  const leafGeometry = buildGeometry(leaves);
  trunkGeometry.name = 'slender-palm-trunks';
  leafGeometry.name = 'broad-tapered-palm-leaves';
  return Object.freeze({ trunkGeometry, leafGeometry });
}

export function createPalmGrove(
  placements: readonly PalmPlacement[],
  options: DesertSurfaceOptions = {},
) {
  const { trunkGeometry, leafGeometry } = createPalmGroveGeometries(placements);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    map: options.map ?? null,
    color: 0xffffff,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const root = new THREE.Group();
  root.name = 'broad-leaf-palm-grove-visual-only';
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.name = 'slender-palm-trunks-visual-only';
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
  leaves.name = 'broad-tapered-palm-leaves-visual-only';
  leaves.castShadow = true;
  [trunk, leaves].forEach((mesh) => {
    mesh.raycast = () => undefined;
    mesh.userData.visualOnly = true;
    root.add(mesh);
  });
  return root;
}

export function createStratifiedRockGeometry() {
  const source = new THREE.DodecahedronGeometry(1, 0);
  source.computeBoundingBox();
  const sourceMinimumY = source.boundingBox?.min.y ?? -1;
  const sourceHeight = Math.max(
    0.001,
    (source.boundingBox?.max.y ?? 1) - sourceMinimumY,
  );
  const positions = source.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const originalY = positions.getY(index);
    const normalizedY = clamp(
      (originalY - sourceMinimumY) / sourceHeight,
      0,
      1,
    );
    const layer = Math.min(3, Math.floor(normalizedY * 4));
    const radiusScale = [1.05, 0.92, 1, 0.72][layer];
    const angle = Math.atan2(positions.getZ(index), positions.getX(index));
    const fracture = 0.92 + seededUnit(index * 19 + layer * 7) * 0.16;
    positions.setXYZ(
      index,
      positions.getX(index) * radiusScale * fracture,
      normalizedY,
      positions.getZ(index) *
        radiusScale *
        fracture *
        (0.92 + Math.abs(Math.sin(angle * 2.5)) * 0.12),
    );
    const tones = [
      [0.42, 0.3, 0.19],
      [0.53, 0.38, 0.23],
      [0.63, 0.47, 0.3],
      [0.71, 0.56, 0.37],
    ] as const;
    colors.set(tones[layer], index * 3);
  }
  source.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  source.computeVertexNormals();
  source.computeBoundingBox();
  source.computeBoundingSphere();
  source.name = 'low-poly-stratified-rock';
  return source;
}

export function createStratifiedRockBatch(
  placements: readonly RockPlacement[],
  options: DesertSurfaceOptions = {},
) {
  const geometry = createStratifiedRockGeometry();
  const material = new THREE.MeshStandardMaterial({
    map: options.map ?? null,
    color: 0xffffff,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const matrix = new THREE.Matrix4();
  placements.forEach((placement, index) => {
    position.set(...placement.position);
    scale.set(...placement.scale);
    euler.set(...placement.rotation);
    rotation.setFromEuler(euler);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.name = 'stratified-rock-field-visual-only';
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.raycast = () => undefined;
  mesh.userData.visualOnly = true;
  return mesh;
}

export function geometryTriangleCount(geometry: THREE.BufferGeometry) {
  return Math.floor(
    (geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0) /
      3,
  );
}
