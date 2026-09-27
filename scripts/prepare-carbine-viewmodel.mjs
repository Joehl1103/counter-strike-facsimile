import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { Matrix4 } from 'three';
import { NodeIO } from '@gltf-transform/core';

const [inputArgument, outputArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument) {
  throw new Error('Usage: node scripts/prepare-carbine-viewmodel.mjs <source.glb> <camera-local.glb>');
}
const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
if (inputPath === outputPath) throw new Error('Write a separate derived copy.');
const io = new NodeIO();
const document = await io.read(inputPath);
const scenes = document.getRoot().listScenes();
if (scenes.length !== 1) throw new Error('Expected one matched arms-and-weapon scene.');
const nodes = document.getRoot().listNodes();
const cameraMarkers = nodes.filter((node) => node.getName() === 'source-camera-reference');
if (cameraMarkers.length !== 1) throw new Error('Expected one authored source camera marker.');
if (nodes.some((node) => node.getName() === 'game-viewmodel-mount')) throw new Error('Already normalized.');
const marker = cameraMarkers[0];
const scene = scenes[0];
let markerBelongsToScene = false;
scene.traverse((node) => { if (node === marker) markerBelongsToScene = true; });
if (!markerBelongsToScene) throw new Error('The source camera marker must belong to the selected scene.');
const sourceMarkerWorld = new Matrix4().fromArray(marker.getWorldMatrix());
// Blender's glTF exporter applies this camera-only local basis correction in
// blender/exp/tree.py. Our marker is an Empty, so recover the same camera frame
// before taking its inverse. Using an Empty directly puts the rifle behind us.
const markerToCameraBasis = new Matrix4().makeRotationX(-Math.PI / 2);
const cameraWorld = sourceMarkerWorld.clone().multiply(markerToCameraBasis);
if (Math.abs(cameraWorld.determinant()) < 1e-8) throw new Error('The source camera has a singular transform.');
const cameraInverse = cameraWorld.clone().invert();
// This selected Blender source declares centimetres (scale_length = 0.01).
// Convert the complete camera-relative assembly to the game's metre units.
const metresPerSourceUnit = 0.01;
const cameraLocalMount = new Matrix4().makeScale(
  metresPerSourceUnit, metresPerSourceUnit, metresPerSourceUnit,
).multiply(cameraInverse);
const mount = document.createNode('game-viewmodel-mount').setMatrix(cameraLocalMount.toArray());
for (const child of scene.listChildren()) {
  scene.removeChild(child);
  mount.addChild(child);
}
scene.addChild(mount);
// Only the game camera renders. The ordinary source marker remains as evidence.
for (const node of nodes) node.setCamera(null);
for (const camera of document.getRoot().listCameras()) camera.dispose();
await mkdir(dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
const hash = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
await writeFile(`${outputPath}.json`, JSON.stringify({
  source: inputArgument, sourceSha256: await hash(inputPath),
  output: outputArgument, outputSha256: await hash(outputPath),
  sourceMarkerWorld: sourceMarkerWorld.toArray(), markerToCameraBasis: markerToCameraBasis.toArray(),
  sourceCameraWorld: cameraWorld.toArray(), cameraLocalMount: cameraLocalMount.toArray(),
  markerBelongsToScene, metresPerSourceUnit,
  operation: 'Recover the camera basis from its ordinary Blender Empty marker, then use one common scene parent with centimetres-to-metres scale and inverse camera transform. No geometry, skin, texture or clip edits.',
}, null, 2) + '\n');
