import * as THREE from 'three';
import type { RenderQuality } from './render-quality';

/** The plan's scene-wide lighting limits. These are inspection limits, not renderer state. */
export type GraphicsBudgetThresholds = Readonly<{
  maxVisibleDrawProxies: number;
  maxVisibleTriangles: number;
  maxUniqueTextures: number;
  /** Approximate decoded GPU bytes, including generated mip levels. */
  maxTextureBytes: number;
  maxPersistentLights: number;
  maxShadowCasters: number;
  maxShadowMapSize: number;
}>;

export const GRAPHICS_BUDGET_THRESHOLDS: Readonly<
  Record<RenderQuality, GraphicsBudgetThresholds>
> = {
  high: {
    maxVisibleDrawProxies: 150,
    maxVisibleTriangles: 180_000,
    maxUniqueTextures: 64,
    // Six 1k environment maps (~32 MiB decoded with mipmaps), the two shared
    // Vanguard maps (~11 MiB), and the small procedural atlases stay below
    // this ceiling with room for transient combat textures.
    maxTextureBytes: 96 * 1024 * 1024,
    maxPersistentLights: 2,
    maxShadowCasters: 1,
    // 2048 is the deliberate ceiling for the single sun caster: at 1024 the
    // one shadow in the scene was too coarse to read as contact with ground.
    maxShadowMapSize: 2048,
  },
  performance: {
    maxVisibleDrawProxies: 90,
    // Eight Vanguard operators alone are 91,008 triangles. The remaining
    // allowance covers the retained collision-independent architecture and
    // one equipped weapon per bot without pretending the characters are free.
    maxVisibleTriangles: 130_000,
    maxUniqueTextures: 40,
    maxTextureBytes: 64 * 1024 * 1024,
    maxPersistentLights: 2,
    maxShadowCasters: 0,
    maxShadowMapSize: 0,
  },
};

export type GraphicsBudget = Readonly<{
  visibleDrawProxies: number;
  visibleTriangles: number;
  uniqueGeometries: number;
  uniqueTextures: number;
  textureBytes: number;
  uniqueMaterials: number;
  persistentLights: number;
  shadowCasters: number;
  /** Largest configured shadow-map dimension among shadow-casting lights. */
  maxShadowMapSize: number;
  thresholds: GraphicsBudgetThresholds;
  withinThresholds: boolean;
}>;

export type VisibleGeometryLoad = Readonly<{
  visibleDrawProxies: number;
  visibleTriangles: number;
}>;

export function getGraphicsBudgetThresholds(
  quality: RenderQuality,
): GraphicsBudgetThresholds {
  return GRAPHICS_BUDGET_THRESHOLDS[quality];
}

const MATERIAL_TEXTURE_KEYS = [
  'alphaMap',
  'aoMap',
  'bumpMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'gradientMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'lightMap',
  'map',
  'matcap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'specularColorMap',
  'specularIntensityMap',
  'thicknessMap',
  'transmissionMap',
] as const;

function materialsOf(value: THREE.Material | THREE.Material[]): THREE.Material[] {
  return Array.isArray(value) ? value : [value];
}

function triangleCount(geometry: THREE.BufferGeometry): number {
  const count = geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  const groups = geometry.groups;
  const drawRangeCount = Number.isFinite(geometry.drawRange.count)
    ? Math.min(Math.max(0, geometry.drawRange.count), count)
    : Math.max(0, count - Math.max(0, geometry.drawRange.start));
  const renderedCount = groups.length
    ? groups.reduce((sum, group) => sum + Math.max(0, group.count), 0)
    : drawRangeCount;
  return Math.floor(renderedCount / 3);
}

type TextureImageLike = Readonly<{
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
  data?: { byteLength?: number } | ArrayBufferView;
}>;

function imageDimensions(image: TextureImageLike) {
  const width = image.naturalWidth ?? image.videoWidth ?? image.width ?? 0;
  const height = image.naturalHeight ?? image.videoHeight ?? image.height ?? 0;
  return {
    width: Number.isFinite(width) ? Math.max(0, width) : 0,
    height: Number.isFinite(height) ? Math.max(0, height) : 0,
  };
}

/** Estimate decoded texture storage rather than using file-compressed bytes. */
export function estimateTextureBytes(texture: THREE.Texture): number {
  const explicit = texture.userData.estimatedTextureBytes;
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const images = Array.isArray(texture.image) ? texture.image : [texture.image];
  let bytes = 0;
  images.forEach((candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') return;
    const image = candidate as TextureImageLike;
    const byteLength = image.data?.byteLength;
    if (Number.isFinite(byteLength) && byteLength && byteLength > 0) {
      bytes += byteLength;
      return;
    }
    const { width, height } = imageDimensions(image);
    // Browser image uploads are RGBA8 in this scene, even when the source file
    // is a compressed RGB JPEG. Generated mipmaps add roughly one third.
    bytes += width * height * 4;
  });
  return Math.ceil(bytes * (texture.generateMipmaps ? 4 / 3 : 1));
}

function isRenderable(object: THREE.Object3D): object is THREE.Mesh | THREE.Sprite | THREE.Line {
  return object instanceof THREE.Mesh || object instanceof THREE.Sprite || object instanceof THREE.Line;
}

/** Compact category probe used by the one-time QA snapshot. */
export function inspectVisibleGeometryLoad(
  root: THREE.Object3D,
): VisibleGeometryLoad {
  let visibleDrawProxies = 0;
  let visibleTriangles = 0;
  const visit = (object: THREE.Object3D, ancestorsVisible: boolean) => {
    const visible = ancestorsVisible && object.visible;
    if (visible && isRenderable(object)) {
      visibleDrawProxies += 1;
      if (object instanceof THREE.Mesh) {
        const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
        visibleTriangles += triangleCount(object.geometry) * instances;
      } else if (object instanceof THREE.Sprite) {
        visibleTriangles += 2;
      }
    }
    object.children.forEach((child) => visit(child, visible));
  };
  visit(root, true);
  return Object.freeze({ visibleDrawProxies, visibleTriangles });
}

function isShadowLight(
  object: THREE.Light,
): object is THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight {
  return (
    object instanceof THREE.DirectionalLight ||
    object instanceof THREE.PointLight ||
    object instanceof THREE.SpotLight
  );
}

/**
 * Counts a scene snapshot. Call this at setup/QA boundaries, never from an animation loop.
 * Visibility includes every ancestor, matching Three.js scene traversal semantics.
 */
export function inspectGraphicsBudget(
  root: THREE.Object3D,
  quality: RenderQuality = 'high',
): GraphicsBudget {
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const thresholds = getGraphicsBudgetThresholds(quality);
  let visibleDrawProxies = 0;
  let visibleTriangles = 0;
  let persistentLights = 0;
  let shadowCasters = 0;
  let maxShadowMapSize = 0;

  const visit = (object: THREE.Object3D, ancestorsVisible: boolean) => {
    const visible = ancestorsVisible && object.visible;
    if (visible && object instanceof THREE.Light) {
      if (object.userData.persistent !== false && object.userData.transient !== true) {
        persistentLights += 1;
      }
      if (object.castShadow && isShadowLight(object)) {
        shadowCasters += 1;
        maxShadowMapSize = Math.max(
          maxShadowMapSize,
          object.shadow.mapSize.x,
          object.shadow.mapSize.y,
        );
      }
    }
    if (visible && isRenderable(object)) {
      visibleDrawProxies += 1;
      geometries.add(object.geometry);
      if (object instanceof THREE.Mesh) {
        const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
        visibleTriangles += triangleCount(object.geometry) * instances;
      } else if (object instanceof THREE.Sprite) {
        visibleTriangles += 2;
      } else {
        // Lines and line segments are draw proxies, but do not contain triangles.
      }
      materialsOf(object.material).forEach((material) => {
        materials.add(material);
        const materialProperties = material as unknown as Record<string, unknown>;
        MATERIAL_TEXTURE_KEYS.forEach((key) => {
          const texture = materialProperties[key];
          if (texture instanceof THREE.Texture) textures.add(texture);
        });
      });
    }
    object.children.forEach((child) => visit(child, visible));
  };

  visit(root, true);
  const uniqueTextureCount = textures.size;
  const textureBytes = [...textures].reduce(
    (sum, texture) => sum + estimateTextureBytes(texture),
    0,
  );
  const withinThresholds =
    visibleDrawProxies <= thresholds.maxVisibleDrawProxies &&
    visibleTriangles <= thresholds.maxVisibleTriangles &&
    uniqueTextureCount <= thresholds.maxUniqueTextures &&
    textureBytes <= thresholds.maxTextureBytes &&
    persistentLights <= thresholds.maxPersistentLights &&
    shadowCasters <= thresholds.maxShadowCasters &&
    maxShadowMapSize <= thresholds.maxShadowMapSize;
  return {
    visibleDrawProxies,
    visibleTriangles,
    uniqueGeometries: geometries.size,
    uniqueTextures: textures.size,
    textureBytes,
    uniqueMaterials: materials.size,
    persistentLights,
    shadowCasters,
    maxShadowMapSize,
    thresholds,
    withinThresholds,
  };
}

export const countGraphicsBudget = inspectGraphicsBudget;
