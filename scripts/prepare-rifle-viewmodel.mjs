import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

const [inputArgument, outputArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument) {
  throw new Error('Usage: node scripts/prepare-rifle-viewmodel.mjs <Blender-export.glb> <game-asset.glb>');
}
const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
if (inputPath === outputPath) throw new Error('Preserve the original Blender export; choose a different output.');

const io = new NodeIO();
const document = await io.read(inputPath);
const scene = document.getRoot().getDefaultScene();
if (!scene) throw new Error('The rifle export requires a default scene.');
const socketOwners = document.getRoot().listNodes().filter((node) => node.getExtras().muzzleSocketPosition);
if (socketOwners.length !== 1) throw new Error('Expected exactly one source socket record.');
const socketOwner = socketOwners[0];
const remainingExtras = { ...socketOwner.getExtras() };
const sockets = [];
for (const kind of ['muzzle', 'ejection']) {
  const position = remainingExtras[`${kind}SocketPosition`];
  const name = remainingExtras[`${kind}SocketName`];
  if (name !== `${kind}-socket` || !Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) {
    throw new Error(`Invalid ${kind} socket metadata.`);
  }
  // Blender custom-property arrays are not converted by its glTF exporter.
  // These positions are mount-local Z-up; glTF's normal nodes use Y-up.
  const translation = [position[0], position[2], -position[1]];
  scene.addChild(document.createNode(name).setTranslation(translation).setExtras({ socketKind: kind }));
  sockets.push({ name, translation });
  for (const suffix of ['Name', 'Kind', 'Position']) delete remainingExtras[`${kind}Socket${suffix}`];
}
socketOwner.setExtras(remainingExtras);

const armMaterials = document.getRoot().listMaterials().filter((material) => material.getName() === 'export_arm_mat_pale');
if (armMaterials.length !== 1) throw new Error('Expected the selected WRAD pale arm material.');
// Preserve the source scene's texture multiply as a standard glTF material
// factor. The Blender export omits that shader-node operation.
const armTint = [0.88, 0.62, 0.39, 1];
armMaterials[0].setBaseColorFactor(armTint);

await mkdir(dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const report = {
  input: inputArgument,
  inputSha256: await sha256(inputPath),
  output: outputArgument,
  outputSha256: await sha256(outputPath),
  processing: 'glTF Transform NodeIO; named socket nodes and source arm material factor',
  sockets,
  armTint,
  geometryChanged: false,
};
await writeFile(`${outputPath}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Prepared ${outputArgument}; geometry and textures preserved.`);
