import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  configureViewmodelRenderLayer,
  enableViewmodelLighting,
  renderWorldWithViewmodelOverlay,
  VIEWMODEL_RENDER_LAYER,
  WORLD_RENDER_LAYER,
} from '../app/viewmodel-render-pass.ts';

type RenderSnapshot = Readonly<{
  mask: number;
  autoClear: boolean;
  background: THREE.Scene['background'];
  shadowAutoUpdate: boolean;
  shadowNeedsUpdate: boolean;
}>;

function createRenderer(
  scene: THREE.Scene,
  camera: THREE.Camera,
  throwOnRender = 0,
) {
  const snapshots: RenderSnapshot[] = [];
  const events: string[] = [];
  let renders = 0;
  const renderer = {
    autoClear: false,
    shadowMap: { autoUpdate: true, needsUpdate: true },
    clearDepth: () => events.push('clearDepth'),
    render: () => {
      renders++;
      events.push(`render${renders}`);
      snapshots.push({
        mask: camera.layers.mask,
        autoClear: renderer.autoClear,
        background: scene.background,
        shadowAutoUpdate: renderer.shadowMap.autoUpdate,
        shadowNeedsUpdate: renderer.shadowMap.needsUpdate,
      });
      if (renders === throwOnRender) throw new Error(`render ${renders}`);
    },
  };
  return { renderer, snapshots, events };
}

void test('viewmodel roots use an exclusive overlay layer with shared muzzle light', () => {
  const world = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  const viewmodel = new THREE.Group();
  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5));
  weapon.castShadow = true;
  weapon.receiveShadow = true;
  const flare = new THREE.Sprite();
  const muzzle = new THREE.PointLight();
  viewmodel.add(weapon, flare, muzzle);

  configureViewmodelRenderLayer(viewmodel);

  assert.equal(world.layers.isEnabled(WORLD_RENDER_LAYER), true);
  assert.equal(world.layers.isEnabled(VIEWMODEL_RENDER_LAYER), false);
  for (const object of [viewmodel, weapon, flare]) {
    assert.equal(object.layers.isEnabled(WORLD_RENDER_LAYER), false);
    assert.equal(object.layers.isEnabled(VIEWMODEL_RENDER_LAYER), true);
  }
  assert.equal(muzzle.layers.isEnabled(WORLD_RENDER_LAYER), true);
  assert.equal(muzzle.layers.isEnabled(VIEWMODEL_RENDER_LAYER), true);
  assert.equal(weapon.castShadow, false);
  assert.equal(weapon.receiveShadow, false);
});

void test('shared scene lights retain world lighting and gain the overlay layer', () => {
  const hemisphere = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  [hemisphere, sun].forEach(enableViewmodelLighting);
  for (const light of [hemisphere, sun]) {
    assert.equal(light.layers.isEnabled(WORLD_RENDER_LAYER), true);
    assert.equal(light.layers.isEnabled(VIEWMODEL_RENDER_LAYER), true);
  }
});

void test('world and viewmodel render in order with one color clear and one depth clear', () => {
  const scene = new THREE.Scene();
  const background = new THREE.Color(0xabcdef);
  scene.background = background;
  const camera = new THREE.PerspectiveCamera();
  camera.layers.enable(3);
  const originalMask = camera.layers.mask;
  const { renderer, snapshots, events } = createRenderer(scene, camera);

  renderWorldWithViewmodelOverlay(renderer, scene, camera);

  assert.deepEqual(events, ['render1', 'clearDepth', 'render2']);
  assert.deepEqual(snapshots, [
    {
      mask: 1 << WORLD_RENDER_LAYER,
      autoClear: true,
      background,
      shadowAutoUpdate: true,
      shadowNeedsUpdate: true,
    },
    {
      mask: 1 << VIEWMODEL_RENDER_LAYER,
      autoClear: false,
      background: null,
      shadowAutoUpdate: false,
      shadowNeedsUpdate: false,
    },
  ]);
  assert.equal(camera.layers.mask, originalMask);
  assert.equal(renderer.autoClear, false);
  assert.equal(scene.background, background);
  assert.equal(renderer.shadowMap.autoUpdate, true);
  assert.equal(renderer.shadowMap.needsUpdate, true);
});

void test('render state restores when either pass throws', () => {
  for (const failure of [1, 2]) {
    const scene = new THREE.Scene();
    const background = new THREE.Color(0x123456);
    scene.background = background;
    const camera = new THREE.PerspectiveCamera();
    camera.layers.enable(4);
    const mask = camera.layers.mask;
    const { renderer } = createRenderer(scene, camera, failure);
    assert.throws(
      () => renderWorldWithViewmodelOverlay(renderer, scene, camera),
      new RegExp(`render ${failure}`),
    );
    assert.equal(camera.layers.mask, mask);
    assert.equal(renderer.autoClear, false);
    assert.equal(scene.background, background);
    assert.equal(renderer.shadowMap.autoUpdate, true);
    assert.equal(renderer.shadowMap.needsUpdate, true);
  }
});

void test('a near world face and firearm cannot enter the same depth pass', () => {
  const camera = new THREE.PerspectiveCamera();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1));
  const firearm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5));
  configureViewmodelRenderLayer(firearm);

  camera.layers.set(WORLD_RENDER_LAYER);
  assert.equal(wall.layers.test(camera.layers), true);
  assert.equal(firearm.layers.test(camera.layers), false);
  camera.layers.set(VIEWMODEL_RENDER_LAYER);
  assert.equal(wall.layers.test(camera.layers), false);
  assert.equal(firearm.layers.test(camera.layers), true);
});
