/** Preserve the useful posed hand topology for offline viewmodel authoring. */
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createSkinnedCharacterTemplate } from '../app/skinned-character-visuals.ts';
import { createTexturedViewmodelArmFactory, VIEWMODEL_ARM_POSES } from '../app/viewmodel-visuals.ts';

Object.defineProperty(globalThis, 'self', { value: globalThis, configurable: true });
Object.defineProperty(globalThis, 'createImageBitmap', {
  value: async () => ({ width: 1024, height: 1024, close() {} }), configurable: true,
});
const sourceBytes = await readFile(new URL('../public/assets/characters/vanguard.glb', import.meta.url));
const sourceBuffer = sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength);
const sourceGltf = await new GLTFLoader().parseAsync(sourceBuffer, '');
const template = createSkinnedCharacterTemplate(sourceGltf);
const surface = new THREE.Texture();
const factory = createTexturedViewmodelArmFactory(template, surface);
const hands = VIEWMODEL_ARM_POSES.rifle.map((pose) => {
  const instance = factory.create(pose);
  const geometry = instance.mesh.geometry;
  const handVertexCount = geometry.userData.sourceHandVertexCount as number;
  const handIndexCount = geometry.userData.sourceTriangleCount * 3;
  return {
    handedness: pose.handedness,
    pose,
    positions: Array.from(geometry.getAttribute('position').array).slice(0, handVertexCount * 3),
    colors: Array.from(geometry.getAttribute('color').array).slice(0, handVertexCount * 3),
    indices: Array.from(geometry.index!.array).slice(0, handIndexCount),
    landmarks: geometry.userData.viewmodelDigitLandmarks,
  };
});
await writeFile(new URL('../assets/source/viewmodels/posed-hands.json', import.meta.url), JSON.stringify(hands));
console.log(hands.map((hand) => ({ side: hand.handedness, vertices: hand.positions.length / 3, triangles: hand.indices.length / 3 })));
factory.dispose();
surface.dispose();
