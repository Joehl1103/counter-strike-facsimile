import * as THREE from 'three';

export const VIEWMODEL_SURFACE_URL =
  '/assets/textures/viewmodel/classic-surface-detail.jpg';

let surfacePromise: Promise<THREE.Texture> | undefined;

/** Share one small atlas across every first-person grip and reload pose. */
export function preloadViewmodelSurface() {
  surfacePromise ??= new THREE.TextureLoader()
    .loadAsync(VIEWMODEL_SURFACE_URL)
    .then((texture) => {
      texture.name = 'classic-hand-skin-leather-detail';
      // This grayscale atlas is a detail multiplier, not an sRGB base color.
      texture.colorSpace = THREE.NoColorSpace;
      texture.channel = 1;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 4;
      return texture;
    })
    .catch((error: unknown) => {
      surfacePromise = undefined;
      throw error;
    });
  return surfacePromise;
}

export function applyViewmodelSurface(
  material: THREE.MeshStandardMaterial,
  texture: THREE.Texture,
) {
  material.map = texture;
  // The borrowed body's maps describe camouflage folds, not bare forearms.
  material.roughnessMap = null;
  material.metalnessMap = null;
  material.aoMap = null;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vHandNormalDetail;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvHandNormalDetail = smoothstep(-0.02, 0.015, position.y);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vHandNormalDetail;',
      )
      .replace(
        '#include <normal_fragment_maps>',
        `
        if (vHandNormalDetail > 0.5) {
          #include <normal_fragment_maps>
        }
      `,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #ifdef USE_MAP
        vec2 detailUv = fract(vMapUv);
        float skinDetail = texture2D(map, vec2(0.01 + detailUv.x * 0.48, detailUv.y)).r;
        float leatherDetail = texture2D(map, vec2(0.51 + detailUv.x * 0.48, detailUv.y)).r;
        // Vertex color follows the finger weights, so leather/skin detail
        // follows the exposed pads without stretching across the atlas seam.
        float skinCoverage = smoothstep(0.04, 0.3, vColor.r);
        float detail = mix(leatherDetail, skinDetail, skinCoverage);
        diffuseColor.rgb *= clamp(1.0 + (detail - 0.64) * 1.55, 0.65, 1.25);
      #endif
      `,
    );
  };
  material.customProgramCacheKey = () => 'classic-viewmodel-surface-v2';
}
