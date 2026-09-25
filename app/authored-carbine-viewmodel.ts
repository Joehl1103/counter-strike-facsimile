import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PrimaryFirstPersonModel } from './primary-weapon-models.ts';

export const AUTHORED_CARBINE_ASSET_URL = '/assets/viewmodels/m4a1.glb';
const CLIP_NAMES = ['Idle', 'Fire', 'Reload', 'Equip'] as const;
type ClipName = (typeof CLIP_NAMES)[number];
type ActionWindow = Readonly<{ startedAt: number; completesAt: number }>;

export type AuthoredViewmodelTemplate = Readonly<{
  scene: THREE.Group;
  clips: Readonly<Record<ClipName, THREE.AnimationClip>>;
}>;

export type AuthoredViewmodelClock = Readonly<{
  nowMs: number;
  reload?: ActionWindow | null;
  equip?: ActionWindow | null;
  fireStartedAtMs?: number;
}>;

export type AuthoredViewmodelController = Readonly<{
  sample(clock: AuthoredViewmodelClock): void;
  dispose(): void;
}>;

export function createAuthoredViewmodelTemplate(gltf: GLTF): AuthoredViewmodelTemplate {
  const clips = {} as Record<ClipName, THREE.AnimationClip>;
  for (const name of CLIP_NAMES) {
    const matches = gltf.animations.filter((clip) => clip.name === name);
    if (matches.length !== 1 || !Number.isFinite(matches[0].duration) || !(matches[0].duration > 0))
      throw new Error(`The authored carbine requires one nonempty ${name} clip.`);
    clips[name] = matches[0];
  }
  let skins = 0;
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh && object.skeleton.bones.length) skins += 1;
    if (object instanceof THREE.Camera) throw new Error('Remove source cameras from the runtime viewmodel.');
  });
  if (skins < 2) throw new Error('The authored carbine requires matched arms and weapon skins.');
  for (const name of ['muzzle-socket', 'ejection-socket']) {
    if (!gltf.scene.getObjectByName(name)) throw new Error(`The authored carbine is missing ${name}.`);
  }
  return Object.freeze({ scene: gltf.scene, clips: Object.freeze(clips) });
}

let templatePromise: Promise<AuthoredViewmodelTemplate> | undefined;
export function preloadAuthoredCarbine(): Promise<AuthoredViewmodelTemplate> {
  templatePromise ??= new GLTFLoader().loadAsync(AUTHORED_CARBINE_ASSET_URL)
    .then(createAuthoredViewmodelTemplate)
    .catch((error: unknown) => {
      templatePromise = undefined;
      throw error;
    });
  return templatePromise;
}

/** All animation time comes from the simulation, including paused QA frames. */
export function resolveAuthoredViewmodelSample(
  clock: AuthoredViewmodelClock,
  durations: Readonly<Record<ClipName, number>>,
): Readonly<{ name: ClipName; time: number }> {
  const { nowMs, reload, equip, fireStartedAtMs } = clock;
  if (!Number.isFinite(nowMs)) throw new Error('The authored animation clock must be finite.');
  for (const name of CLIP_NAMES) {
    if (!Number.isFinite(durations[name]) || durations[name] <= 0)
      throw new Error(`The authored ${name} duration must be finite and positive.`);
  }
  for (const window of [reload, equip]) {
    if (window && (!Number.isFinite(window.startedAt) || !Number.isFinite(window.completesAt)
      || window.completesAt <= window.startedAt))
      throw new Error('An authored action window must have finite, increasing timestamps.');
  }
  const progress = (window: ActionWindow) => THREE.MathUtils.clamp(
    (nowMs - window.startedAt) / (window.completesAt - window.startedAt), 0, 1,
  );
  if (reload) return { name: 'Reload', time: progress(reload) * durations.Reload };
  if (equip && nowMs < equip.completesAt)
    return { name: 'Equip', time: progress(equip) * durations.Equip };
  if (fireStartedAtMs !== undefined && Number.isFinite(fireStartedAtMs)) {
    const elapsed = (nowMs - fireStartedAtMs) / 1000;
    if (elapsed >= 0 && elapsed < durations.Fire) return { name: 'Fire', time: elapsed };
  }
  return { name: 'Idle', time: ((nowMs / 1000) % durations.Idle + durations.Idle) % durations.Idle };
}

/** A stable camera-local mount contains the complete authored animation. */
export function createAuthoredCarbineViewmodel(
  template: AuthoredViewmodelTemplate,
  muzzle: THREE.PointLight,
): PrimaryFirstPersonModel {
  const root = new THREE.Group();
  root.name = 'carbine-viewmodel';
  root.userData.visualOnly = true;
  root.raycast = () => undefined;
  const model = cloneSkinned(template.scene);
  root.add(model);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Map<THREE.Material, THREE.Material>();
  const textures = new Map<THREE.Texture, THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  const cloneMaterial = (source: THREE.Material): THREE.Material => {
    const existing = materials.get(source);
    if (existing) return existing;
    const owned = source.clone();
    // The supplied carbine uses only base-color textures. Preserve any future
    // authored map as well so the scene cleanup never disposes the template.
    const properties = owned as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(properties)) {
      if (!(value instanceof THREE.Texture)) continue;
      let texture = textures.get(value);
      if (!texture) {
        texture = value.clone();
        textures.set(value, texture);
      }
      properties[key] = texture;
    }
    materials.set(source, owned);
    return owned;
  };
  model.traverse((object) => {
    object.userData.visualOnly = true;
    object.raycast = () => undefined;
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry = object.geometry.clone();
    geometries.add(object.geometry);
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
    // Dynamic reload bounds must not be culled using the idle pose.
    object.frustumCulled = false;
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  const muzzleSocket = model.getObjectByName('muzzle-socket')!;
  const ejectionAnchor = model.getObjectByName('ejection-socket')!;
  // The source assembly is in centimetres. Effects and attachments use the
  // game's metre dimensions while inheriting the animated socket position.
  root.updateMatrixWorld(true);
  const socketScale = muzzleSocket.getWorldScale(new THREE.Vector3());
  if (socketScale.toArray().some((value) => !Number.isFinite(value) || value <= 0))
    throw new Error('The authored muzzle socket requires a finite positive scale.');
  muzzle.scale.set(1 / socketScale.x, 1 / socketScale.y, 1 / socketScale.z);
  muzzle.position.set(0, 0, 0);
  // The loaded Kuptchi socket uses -Y along the animated barrel. Normalize
  // its frame here so metre-sized effects retain the game's -Z convention.
  muzzle.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, -1, 0),
  );
  muzzle.name = 'muzzle-flash';
  muzzle.userData.transient = true;
  muzzleSocket.add(muzzle);

  const mixer = new THREE.AnimationMixer(model);
  const actions = Object.fromEntries(CLIP_NAMES.map((name) => {
    const action = mixer.clipAction(template.clips[name]);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    return [name, action];
  })) as Record<ClipName, THREE.AnimationAction>;
  const durations = Object.fromEntries(CLIP_NAMES.map((name) =>
    [name, template.clips[name].duration],
  )) as Record<ClipName, number>;
  let activeName: ClipName | undefined;
  let disposed = false;
  const authoredAnimation: AuthoredViewmodelController = {
    sample(clock) {
      if (disposed) throw new Error('Cannot sample a disposed viewmodel.');
      const { name, time } = resolveAuthoredViewmodelSample(clock, durations);
      if (name !== activeName) {
        mixer.stopAllAction();
        actions[name].reset().play();
        actions[name].paused = true;
        activeName = name;
      }
      actions[name].time = time;
      mixer.update(0);
      root.updateMatrixWorld(true);
      skeletons.forEach((skeleton) => skeleton.update());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      root.removeFromParent();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      skeletons.forEach((skeleton) => skeleton.dispose());
      // The page owns the shared flash texture; each flash owns its sprite material.
      muzzle.traverse((object) => {
        if (object instanceof THREE.Sprite) object.material.dispose();
      });
    },
  };
  authoredAnimation.sample({ nowMs: 0 });
  root.visible = false;
  return { root, muzzle, ejectionAnchor, actionParts: {}, authoredAnimation };
}
