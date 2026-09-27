import * as THREE from 'three';

export type EnvironmentSurfaceKind =
  | 'sandstoneBlocks'
  | 'weatheredPlaster'
  | 'cobblestone';

export type EnvironmentSurfaceProfile = Readonly<{
  diffuseUrl: string;
  normalUrl: string;
  tileWidthMeters: number;
  tileHeightMeters: number;
  roughness: number;
  normalStrength: number;
  daylightMultiplier: readonly [number, number, number];
  /** Warm map-shaped fill that keeps texture detail readable in sun shadow. */
  shadowTint: readonly [number, number, number];
  shadowMapIntensity: number;
}>;

export const ENVIRONMENT_SURFACE_PROFILES: Readonly<
  Record<EnvironmentSurfaceKind, EnvironmentSurfaceProfile>
> = Object.freeze({
  sandstoneBlocks: Object.freeze({
    diffuseUrl: '/assets/textures/large_sandstone_blocks_diff_1k.jpg',
    normalUrl: '/assets/textures/large_sandstone_blocks_nor_gl_1k.jpg',
    tileWidthMeters: 3,
    tileHeightMeters: 3,
    roughness: 0.9,
    normalStrength: 0.32,
    // Poly Haven's calibrated diffuse averages only ~RGB(86, 83, 75). A
    // stronger warm base-color multiplier keeps it legible under ACES without
    // changing the scene-wide light balance.
    daylightMultiplier: Object.freeze([2.15, 1.82, 1.42] as const),
    shadowTint: Object.freeze([1, 0.78, 0.52] as const),
    shadowMapIntensity: 0.24,
  }),
  weatheredPlaster: Object.freeze({
    diffuseUrl: '/assets/textures/plastered_stone_wall_diff_1k.jpg',
    normalUrl: '/assets/textures/plastered_stone_wall_nor_gl_1k.jpg',
    tileWidthMeters: 2.5,
    tileHeightMeters: 2.5,
    roughness: 0.94,
    normalStrength: 0.24,
    // This source averages ~RGB(68, 64, 55), so a near-white material tint
    // still produces a charcoal wall. Lift the diffuse response at the
    // material, retaining the map's cracks and natural luminance variation.
    daylightMultiplier: Object.freeze([2.75, 2.35, 1.82] as const),
    shadowTint: Object.freeze([1, 0.82, 0.58] as const),
    shadowMapIntensity: 0.28,
  }),
  cobblestone: Object.freeze({
    diffuseUrl: '/assets/textures/cobblestone_floor_08_diff_1k.jpg',
    normalUrl: '/assets/textures/cobblestone_floor_08_nor_gl_1k.jpg',
    tileWidthMeters: 2,
    tileHeightMeters: 2,
    roughness: 0.96,
    normalStrength: 0.4,
    daylightMultiplier: Object.freeze([1.2, 1.08, 0.92] as const),
    shadowTint: Object.freeze([0.82, 0.68, 0.5] as const),
    shadowMapIntensity: 0.1,
  }),
});

export type EnvironmentSurfaceLibrary = Readonly<{
  materials: Readonly<
    Record<EnvironmentSurfaceKind, THREE.MeshStandardMaterial>
  >;
  textures: readonly THREE.Texture[];
  dispose: () => void;
}>;

export const ENVIRONMENT_TEXTURE_GPU_BYTES = Math.ceil(
  1024 * 1024 * 4 * (4 / 3),
);

/** Local metre projection keeps masonry courses and paving stones at real scale. */
export function getEnvironmentSurfaceUv(
  kind: EnvironmentSurfaceKind,
  point: readonly [number, number, number],
  normal: readonly [number, number, number],
): readonly [number, number] {
  const profile = ENVIRONMENT_SURFACE_PROFILES[kind];
  const [nx, ny, nz] = normal.map(Math.abs);
  if (ny > nx && ny > nz)
    return [
      point[0] / profile.tileWidthMeters,
      point[2] / profile.tileWidthMeters,
    ];
  return [
    (nx > nz ? point[2] : point[0]) / profile.tileWidthMeters,
    point[1] / profile.tileHeightMeters,
  ];
}

export function applyEnvironmentSurfaceUv(
  geometry: THREE.BufferGeometry,
  kind: EnvironmentSurfaceKind,
): THREE.BufferGeometry {
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  if (!positions || !normals || !uv) return geometry;
  for (let index = 0; index < positions.count; index += 1) {
    const [u, v] = getEnvironmentSurfaceUv(
      kind,
      [positions.getX(index), positions.getY(index), positions.getZ(index)],
      [normals.getX(index), normals.getY(index), normals.getZ(index)],
    );
    uv.setXY(index, u, v);
  }
  uv.needsUpdate = true;
  return geometry;
}

function configureTexture(
  texture: THREE.Texture,
  anisotropy: number,
  colorTexture: boolean,
) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(8, Math.max(1, anisotropy));
  if (colorTexture) texture.colorSpace = THREE.SRGBColorSpace;
  // TextureLoader marks the texture for upload after image data arrives.
  // Forcing an update here happens while `image` is still undefined and makes
  // WebGLRenderer emit one missing-image warning for every map.
  return texture;
}

/** Load each CC0 map once and share it across the arena's visual-only surfaces. */
export function createEnvironmentSurfaceLibrary(
  anisotropy = 1,
): EnvironmentSurfaceLibrary {
  const loader = new THREE.TextureLoader();
  const textures: THREE.Texture[] = [];
  const materials = Object.fromEntries(
    (Object.keys(ENVIRONMENT_SURFACE_PROFILES) as EnvironmentSurfaceKind[]).map(
      (kind) => {
        const profile = ENVIRONMENT_SURFACE_PROFILES[kind];
        const map = configureTexture(
          loader.load(profile.diffuseUrl),
          anisotropy,
          true,
        );
        const normalMap = configureTexture(
          loader.load(profile.normalUrl),
          anisotropy,
          false,
        );
        map.userData.estimatedTextureBytes = ENVIRONMENT_TEXTURE_GPU_BYTES;
        normalMap.userData.estimatedTextureBytes =
          ENVIRONMENT_TEXTURE_GPU_BYTES;
        textures.push(map, normalMap);
        const color = new THREE.Color().setRGB(
          profile.daylightMultiplier[0],
          profile.daylightMultiplier[1],
          profile.daylightMultiplier[2],
        );
        const emissive = new THREE.Color().setRGB(
          profile.shadowTint[0],
          profile.shadowTint[1],
          profile.shadowTint[2],
        );
        const material = new THREE.MeshStandardMaterial({
          map,
          normalMap,
          normalScale: new THREE.Vector2(
            profile.normalStrength,
            profile.normalStrength,
          ),
          color,
          // Reusing the diffuse map here lifts its existing cracks and color
          // variation together. It avoids a flat constant glow while keeping
          // sun direction and the real normal map responsible for volume.
          emissive,
          emissiveMap: map,
          emissiveIntensity: profile.shadowMapIntensity,
          roughness: profile.roughness,
          metalness: 0,
        });
        material.name = `environment-${kind}`;
        material.userData.environmentSurface = kind;
        return [kind, material] as const;
      },
    ),
  ) as Record<EnvironmentSurfaceKind, THREE.MeshStandardMaterial>;
  let disposed = false;
  return Object.freeze({
    materials: Object.freeze(materials),
    textures: Object.freeze(textures),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      textures.forEach((texture) => texture.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    },
  });
}
