import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

const [inputArgument, outputArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument) {
  throw new Error('Usage: node scripts/prepare-glock-materials.mjs CAMERA_LOCAL.glb NEW_OUTPUT.glb');
}
const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
if (inputPath === outputPath) throw new Error('Preserve the source GLB.');
if (await access(outputPath).then(() => true, () => false)) {
  throw new Error(`Refusing to overwrite existing candidate: ${outputPath}`);
}

// The exporter retains the source image but drops its MixRGB Multiply node.
// Standard glTF factors restore that multiplication. Steel is 4/3 the native
// source value so its chamfer remains readable under the game's viewmodel light.
const runtimeMaterialFactors = new Map([
  ['Warm source skin', [0.70, 0.51, 0.34, 1]],
  ['Dark fingerless glove', [0.032, 0.043, 0.040, 1]],
  ['Glock charcoal steel', [0.140, 0.160, 0.180, 1]],
  ['Glock textured polymer', [0.066, 0.073, 0.075, 1]],
  ['Glock exposed barrel steel', [0.18, 0.21, 0.25, 1]],
  ['Glock recess and serrations', [0.004, 0.006, 0.008, 1]],
]);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const io = new NodeIO();
const document = await io.read(inputPath);
const root = document.getRoot();
if (!root.listNodes().some(node => node.getName() === 'game-viewmodel-mount')) {
  throw new Error('Normalize the complete assembly to its source camera first.');
}
const textureRecords = root.listTextures().map(texture => ({
  name: texture.getName(), sha256: hash(texture.getImage()),
}));
const materials = root.listMaterials();
if (materials.length !== runtimeMaterialFactors.size ||
    new Set(materials.map(material => material.getName())).size !== materials.length) {
  throw new Error('Expected the six unique, named source materials.');
}
const changes = materials.map(material => {
  const name = material.getName();
  const factor = runtimeMaterialFactors.get(name);
  if (!factor) throw new Error(`Unexpected source material: ${name}`);
  const previousFactor = material.getBaseColorFactor();
  material.setBaseColorFactor(factor);
  return { name, previousFactor, factor };
});
await mkdir(dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
const roundtrip = await io.read(outputPath);
const writtenTextures = roundtrip.getRoot().listTextures().map(texture => ({
  name: texture.getName(), sha256: hash(texture.getImage()),
}));
if (JSON.stringify(textureRecords) !== JSON.stringify(writtenTextures)) {
  throw new Error('Source texture bytes changed during material preparation.');
}
await writeFile(`${outputPath}.materials.json`, JSON.stringify({
  inputPath, inputSha256: hash(await readFile(inputPath)),
  outputPath, outputSha256: hash(await readFile(outputPath)),
  operation: 'Restore texture-multiply factors; lift charcoal steel by 4/3 for game lighting.',
  changes, preservedTextures: writtenTextures,
}, null, 2) + '\n');
console.log(outputPath);
