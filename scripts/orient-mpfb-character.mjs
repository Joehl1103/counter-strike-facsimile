import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

const [inputArgument, outputArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument) {
  throw new Error('Usage: node scripts/orient-mpfb-character.mjs <native-neutral.glb> <game-neutral.glb>');
}
const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
if (inputPath === outputPath) throw new Error('Preserve the native source; write a separate copy.');
const io = new NodeIO();
const document = await io.read(inputPath);
if (document.getRoot().listAnimations().length) throw new Error('Orient the neutral target before retargeting.');
const scenes = document.getRoot().listScenes();
if (scenes.length !== 1) throw new Error('Expected one native character scene.');
const scene = scenes[0];
if (document.getRoot().listNodes().some((node) => node.getName() === 'game-character-facing')) {
  throw new Error('This character has already been oriented.');
}
// MPFB's native face is glTF +Z. Rotate the complete mesh-and-skeleton assembly
// to the game's -Z before computing any animation bind offsets.
const facing = document.createNode('game-character-facing').setRotation([0, 1, 0, 0]);
for (const child of scene.listChildren()) {
  scene.removeChild(child);
  facing.addChild(child);
}
scene.addChild(facing);
await mkdir(dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
const hash = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
await writeFile(`${outputPath}.json`, JSON.stringify({
  source: inputArgument, sourceSha256: await hash(inputPath),
  output: outputArgument, outputSha256: await hash(outputPath),
  operation: 'One common scene parent; 180 degrees about glTF Y. Meshes, skins, images and bind data unchanged.',
}, null, 2) + '\n');
