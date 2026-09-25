import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { copyToDocument, unpartition } from '@gltf-transform/functions';
import { assertAuthoredViewmodelEquivalent } from './authored-viewmodel-equivalence.mjs';

const [directoryArgument, outputArgument, weaponArmatureName = 'Rifle_01_Armature'] = process.argv.slice(2);
if (!directoryArgument || !outputArgument) {
  throw new Error('Usage: node scripts/merge-authored-viewmodel-clips.mjs <scene-export-directory> <merged.glb> [weapon-armature-name]');
}
const names = ['Idle', 'Fire', 'Reload', 'Equip'];
const directory = resolve(directoryArgument);
const outputPath = resolve(outputArgument);
const inputs = names.map((name) => join(directory, `${name}.glb`));
if (inputs.includes(outputPath)) throw new Error('Preserve the separate source exports.');
const io = new NodeIO();
const documents = await Promise.all(inputs.map((path) => io.read(path)));
const target = documents[0];
const nodesByName = (document) => {
  const mapping = new Map();
  for (const node of document.getRoot().listNodes()) {
    if (!node.getName() || mapping.has(node.getName())) throw new Error(`Ambiguous node ${node.getName()}`);
    mapping.set(node.getName(), node);
  }
  return mapping;
};
const targetNodes = nodesByName(target);
const compatibilityReports = [];
const sourceCameraReferences = [];

function equalNumbers(first, second, label, tolerance = 1e-6) {
  if (!first || !second || first.length !== second.length) throw new Error(`${label}: incompatible arrays`);
  let maximum = 0;
  for (let index = 0; index < first.length; index += 1) {
    if (!Number.isFinite(first[index]) || !Number.isFinite(second[index])) throw new Error(`${label}: nonfinite data`);
    maximum = Math.max(maximum, Math.abs(first[index] - second[index]));
  }
  if (maximum > tolerance) throw new Error(`${label}: maximum difference ${maximum} exceeds ${tolerance}`);
}

function verifySameRig(source, label) {
  const sourceNodes = nodesByName(source);
  if (sourceNodes.size !== targetNodes.size) throw new Error(`${label}: different node count`);
  const animatedPaths = new Set(source.getRoot().listAnimations().flatMap((animation) =>
    animation.listChannels().map((channel) => `${channel.getTargetNode().getName()}:${channel.getTargetPath()}`)));
  for (const [name, node] of sourceNodes) {
    const existing = targetNodes.get(name);
    if (!existing) throw new Error(`${label}: unmatched node ${name}`);
    if (node.listChildren().map((child) => child.getName()).join('|') !==
        existing.listChildren().map((child) => child.getName()).join('|'))
      throw new Error(`${label}: different hierarchy at ${name}`);
    // This ordinary leaf records Blender's action-specific camera pose. It is
    // not animated geometry. The game uses Idle's one fixed camera-relative
    // mount for every action, preserving the existing gameplay camera.
    if (name === 'source-camera-reference') {
      if (node.getMesh() || node.getSkin() || node.listChildren().length ||
          [...animatedPaths].some((path) => path.startsWith(`${name}:`)))
        throw new Error(`${label}: source camera marker must be an inert leaf`);
      sourceCameraReferences.push({ clip: label, matrix: node.getWorldMatrix() });
      continue;
    }
    for (const [path, values, previous] of [
      ['translation', node.getTranslation(), existing.getTranslation()],
      ['rotation', node.getRotation(), existing.getRotation()],
      ['scale', node.getScale(), existing.getScale()],
    ]) {
      // glTF skinning ignores the skinned mesh node's transform. The joint
      // transforms and bind-local surface check below define its actual pose.
      if (!node.getSkin() && !animatedPaths.has(`${name}:${path}`))
        equalNumbers(values, previous, `${label}:${name}:${path}`, path === 'translation' ? 2e-5 : 1e-6);
    }

  }
}

// Fail before mutation when separate scene exports do not share one bind/mesh.
for (let index = 1; index < documents.length; index += 1) {
  verifySameRig(documents[index], names[index]);
  compatibilityReports.push(...assertAuthoredViewmodelEquivalent(target, documents[index], names[index], { weaponArmatureName }));
}
const reports = [];
for (let index = 0; index < documents.length; index += 1) {
  const source = documents[index];
  const sourceAnimations = source.getRoot().listAnimations();
  const expectedSceneClips = ['Arms_Armature', weaponArmatureName]
    .sort((firstName, secondName) => firstName.localeCompare(secondName)).join('|');
  const actualSceneClips = sourceAnimations.map((entry) => entry.getName())
    .sort((firstName, secondName) => firstName.localeCompare(secondName)).join('|');
  if (sourceAnimations.length !== 2 || actualSceneClips !== expectedSceneClips)
    throw new Error(`${names[index]} requires the two original armature Scene clips`);
  const animatedNodes = new Set(sourceAnimations.flatMap((entry) => entry.listChannels().map((channel) => channel.getTargetNode())));
  for (const skin of source.getRoot().listSkins()) {
    if (!skin.listJoints().some((joint) => animatedNodes.has(joint)))
      throw new Error(`${names[index]} has an unanimated skin ${skin.getName()}`);
  }
  const animation = target.createAnimation(names[index]);
  // Copy standard sampler/accessor data only. Copying an entire animation's
  // dependency graph would also copy nodes, skins and meshes into this scene.
  const samplers = sourceAnimations.flatMap((entry) => entry.listSamplers());
  const copies = index === 0 ? null : copyToDocument(target, source, samplers);
  const bindings = new Set();
  const normalizedInputs = new Set();
  const starts = samplers.map((sampler) => sampler.getInput().getArray()[0]);
  const sourceTimeOriginSeconds = starts[0];
  if (!Number.isFinite(sourceTimeOriginSeconds) || starts.some((start) => Math.abs(start - sourceTimeOriginSeconds) > 1e-7))
    throw new Error(`${names[index]}: source channels need one common first-key time`);
  for (const sourceAnimation of sourceAnimations) {
    for (const channel of sourceAnimation.listChannels()) {
      const sourceNode = channel.getTargetNode();
      const binding = `${sourceNode.getName()}:${channel.getTargetPath()}`;
      if (bindings.has(binding)) throw new Error(`${names[index]}: duplicate channel ${binding}`);
      bindings.add(binding);
      const sampler = copies?.get(channel.getSampler()) ?? channel.getSampler();
      const input = sampler.getInput();
      if (!normalizedInputs.has(input)) {
        // Blender SCENE exports frame 1 at 1/24 s. The game's action clock
        // begins at zero; shift each shared input accessor exactly once.
        const values = input.getArray();
        input.setArray(values.map((value) => value - sourceTimeOriginSeconds));
        normalizedInputs.add(input);
      }
      animation.addSampler(sampler);
      animation.addChannel(target.createAnimationChannel()
        .setTargetNode(targetNodes.get(sourceNode.getName()))
        .setTargetPath(channel.getTargetPath()).setSampler(sampler)
        .setExtras(channel.getExtras()));
    }
  }
  reports.push({ name: names[index], source: inputs[index], channels: bindings.size, sourceTimeOriginSeconds });
  if (index === 0) sourceAnimations.forEach((entry) => entry.dispose());
}
await target.transform(unpartition());
await mkdir(dirname(outputPath), { recursive: true });
await io.write(outputPath, target);
const hash = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
for (const report of reports) report.sourceSha256 = await hash(report.source);
await writeFile(`${outputPath}.json`, JSON.stringify({
  output: outputArgument, outputSha256: await hash(outputPath), clips: reports,
  compatibilityReports,
  sourceCameraReferences,
  cameraPolicy: 'Keep the Idle reference marker and fixed game camera for every action; other source camera poses are recorded, not transferred.',
  method: 'glTF Transform sampler copy and paired channels, common first-key time normalized to zero. Seam-aware surface, oriented topology, skin and material equivalence checked before merge.',
  status: 'Requires source-to-merged skeletal sampling and renderer verification',
}, null, 2) + '\n');
