import * as THREE from 'three';

export const WORLD_RENDER_LAYER = 0;
export const VIEWMODEL_RENDER_LAYER = 1;

type LayeredRenderer = Pick<
  THREE.WebGLRenderer,
  'autoClear' | 'clearDepth' | 'render'
> & {
  shadowMap: Pick<THREE.WebGLShadowMap, 'autoUpdate' | 'needsUpdate'>;
};

/**
 * Put one first-person root exclusively in the overlay layer. Nested muzzle
 * lights remain available to both passes so firing still lights the world.
 */
export function configureViewmodelRenderLayer(root: THREE.Object3D) {
  root.traverse((object) => {
    object.layers.set(VIEWMODEL_RENDER_LAYER);
    if (object instanceof THREE.Light) object.layers.enable(WORLD_RENDER_LAYER);
    if (object instanceof THREE.Mesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
}

/** Make an existing world light illuminate both world and viewmodel layers. */
export function enableViewmodelLighting(light: THREE.Light) {
  light.layers.enable(VIEWMODEL_RENDER_LAYER);
}

/**
 * Draw the world normally, clear only depth, then draw first-person geometry.
 * Scene background is disabled for pass two so it cannot repaint world color.
 */
export function renderWorldWithViewmodelOverlay(
  renderer: LayeredRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const previousCameraMask = camera.layers.mask;
  const previousAutoClear = renderer.autoClear;
  const previousBackground = scene.background;
  const previousShadowAutoUpdate = renderer.shadowMap.autoUpdate;
  const previousShadowNeedsUpdate = renderer.shadowMap.needsUpdate;
  try {
    renderer.autoClear = true;
    camera.layers.set(WORLD_RENDER_LAYER);
    renderer.render(scene, camera);

    renderer.autoClear = false;
    renderer.clearDepth();
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = false;
    camera.layers.set(VIEWMODEL_RENDER_LAYER);
    renderer.render(scene, camera);
  } finally {
    camera.layers.mask = previousCameraMask;
    renderer.autoClear = previousAutoClear;
    scene.background = previousBackground;
    renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
    renderer.shadowMap.needsUpdate = previousShadowNeedsUpdate;
  }
}
