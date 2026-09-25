import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone, retargetClip } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Accessor, NodeIO } from '@gltf-transform/core';

const [targetArgument, sourceArgument, outputArgument] = process.argv.slice(2);
if (!targetArgument || !sourceArgument || !outputArgument) {
  throw new Error('Usage: node scripts/retarget-character-clips.mjs <neutral-target.glb> <source-clips.glb> <animated-target.glb>');
}
const targetPath = resolve(targetArgument);
const sourcePath = resolve(sourceArgument);
const outputPath = resolve(outputArgument);
if ([targetPath, sourcePath].includes(outputPath)) throw new Error('Write a separate animated copy; preserve both inputs.');

// Only Three's skeleton/animation data is used here. NodeIO retains the real
// embedded image bytes; this headless decoder never produces exported pixels.
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
async function loadSkeletonAsset(path) {
  const bytes = await readFile(path);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new GLTFLoader().parseAsync(buffer, '');
}
function primarySkin(root) {
  const candidates = [];
  root.traverse((node) => { if (node instanceof THREE.SkinnedMesh) candidates.push(node); });
  candidates.sort((first, second) => second.skeleton.bones.length - first.skeleton.bones.length);
  if (!candidates.length) throw new Error('The character requires an authored skin.');
  return candidates[0];
}
function animationRotationNodeNames(clip) {
  return new Set(clip.tracks
    .filter((track) => track.name.endsWith('.quaternion'))
    .map((track) => track.name.split('.')[0]));
}
function sceneNodesByName(root) {
  const nodes = new Map();
  root.traverse((node) => {
    if (!node.name) return;
    if (nodes.has(node.name)) throw new Error(`Ambiguous source scene node name: ${node.name}`);
    nodes.set(node.name, node);
  });
  return nodes;
}
function fingerRotationNames() {
  const names = [];
  for (const side of ['Left', 'Right']) {
    for (const digit of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
      for (const joint of [1, 2, 3]) names.push(`mixamorig${side}Hand${digit}${joint}`);
    }
  }
  return names;
}
const [targetAsset, sourceAsset] = await Promise.all([
  loadSkeletonAsset(targetPath), loadSkeletonAsset(sourcePath),
]);
const io = new NodeIO();
const document = await io.read(targetPath);
if (document.getRoot().listAnimations().length) throw new Error('Use a neutral target export without animation clips.');
const buffer = document.getRoot().listBuffers()[0];
if (!buffer) throw new Error('Target GLB has no geometry buffer.');
const targetNodes = new Map();
for (const node of document.getRoot().listNodes()) {
  const runtimeName = THREE.PropertyBinding.sanitizeNodeName(node.getName());
  if (targetNodes.has(runtimeName)) throw new Error(`Ambiguous target node name: ${runtimeName}`);
  targetNodes.set(runtimeName, node);
}

const clipReports = [];
for (const clipName of ['Idle', 'Walk', 'Run']) {
  const sourceClip = sourceAsset.animations.find((clip) => clip.name.toLowerCase() === clipName.toLowerCase());
  if (!sourceClip) throw new Error(`Source is missing ${clipName}.`);
  // Sampling mutates its hosts. Keep the loaded source and target immutable.
  const targetRoot = clone(targetAsset.scene);
  const sourceRoot = clone(sourceAsset.scene);
  const targetSkin = primarySkin(targetRoot);
  const sourceSkin = primarySkin(sourceRoot);
  targetSkin.skeleton.pose();
  sourceSkin.skeleton.pose();
  targetRoot.updateMatrixWorld(true);
  sourceRoot.updateMatrixWorld(true);
  // SkeletonUtils reads source.skeleton.bones even when its mixer is rooted at
  // the scene. Vanguard's three animated distal joints are real Object3Ds
  // beneath weighted joints, but are not themselves weighted Skeleton bones.
  // Build a lookup-only Skeleton so the cloned render skin keeps its original
  // 49-joint skeleton and inverse-bind data intact.
  const sourceRotationNodes = animationRotationNodeNames(sourceClip);
  const sourceSceneNodes = sceneNodesByName(sourceRoot);
  const sourceBones = new Map(sourceSkin.skeleton.bones.map((bone) => [bone.name, bone]));
  const endpointNodes = [];
  for (const targetBone of targetSkin.skeleton.bones) {
    if (sourceBones.has(targetBone.name) || !sourceRotationNodes.has(targetBone.name)) continue;
    const endpoint = sourceSceneNodes.get(targetBone.name);
    if (!endpoint) continue;
    sourceBones.set(endpoint.name, endpoint);
    endpointNodes.push(endpoint);
  }
  const sourceLookupBones = [...sourceSkin.skeleton.bones, ...endpointNodes];
  const sourceLookupInverses = sourceLookupBones.map((node) => {
    const weightedIndex = sourceSkin.skeleton.bones.indexOf(node);
    if (weightedIndex >= 0) return sourceSkin.skeleton.boneInverses[weightedIndex].clone();
    return new THREE.Matrix4().copy(node.matrixWorld).invert();
  });
  sourceRoot.skeleton = new THREE.Skeleton(sourceLookupBones, sourceLookupInverses);
  const names = {};
  const localOffsets = {};
  for (const bone of targetSkin.skeleton.bones) {
    const sourceBone = sourceBones.get(bone.name);
    if (!sourceBone) continue;
    names[bone.name] = sourceBone.name;
    const sourceRotation = sourceBone.getWorldQuaternion(new THREE.Quaternion());
    const targetRotation = bone.getWorldQuaternion(new THREE.Quaternion());
    const bindOffset = sourceRotation.invert().multiply(targetRotation);
    localOffsets[bone.name] = new THREE.Matrix4().makeRotationFromQuaternion(bindOffset);
  }
  const requiredBones = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
    'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
    'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
  for (const suffix of requiredBones) {
    if (!names[`mixamorig${suffix}`]) throw new Error(`Unmapped gameplay bone: ${suffix}`);
  }
  const requiredFingerRotations = fingerRotationNames();
  for (const name of requiredFingerRotations) {
    if (!names[name]) throw new Error(`Unmapped target finger rotation: ${name}`);
  }
  const converted = retargetClip(targetSkin, sourceRoot, sourceClip, {
    names,
    hip: 'mixamorigHips',
    localOffsets,
    preserveBonePositions: true,
    useFirstFramePosition: false,
    // Keep SkeletonUtils' source-key count. An explicit 30 here omits one
    // endpoint sample and shifts fast gait keys between their authored times.
  });
  const convertedFingerRotations = new Set(converted.tracks
    .map((track) => /^\.bones\[(.+)\]\.quaternion$/.exec(track.name)?.[1])
    .filter(Boolean));
  for (const name of requiredFingerRotations) {
    if (!convertedFingerRotations.has(name)) throw new Error(`Missing converted target finger rotation: ${name}`);
  }
  const animation = document.createAnimation(clipName);
  let rotationTracks = 0;
  for (const track of converted.tracks) {
    const match = /^\.bones\[(.+)\]\.quaternion$/.exec(track.name);
    // Root movement and the existing grounding/crouch adapter own translation.
    // Preserve native bind positions instead of importing source hip units.
    if (!match) continue;
    const targetNode = targetNodes.get(match[1]);
    if (!targetNode) throw new Error(`Missing glTF target for ${track.name}.`);
    if (![...track.times, ...track.values].every(Number.isFinite)) throw new Error(`Invalid samples in ${track.name}.`);
    const input = document.createAccessor(`${clipName}:${match[1]}:time`)
      .setBuffer(buffer).setType(Accessor.Type.SCALAR).setArray(new Float32Array(track.times));
    const output = document.createAccessor(`${clipName}:${match[1]}:rotation`)
      .setBuffer(buffer).setType(Accessor.Type.VEC4).setArray(new Float32Array(track.values));
    const sampler = document.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
    animation.addSampler(sampler).addChannel(document.createAnimationChannel()
      .setTargetNode(targetNode).setTargetPath('rotation').setSampler(sampler));
    rotationTracks += 1;
  }
  if (!rotationTracks) throw new Error(`${clipName} produced no rotation tracks.`);
  clipReports.push({ name: clipName, sourceDuration: sourceClip.duration, duration: converted.duration,
    samplesPerRotationTrack: converted.tracks[0].times.length,
    rotationTracks, mappedBones: Object.keys(names), addedAnimatedEndpointNodes: endpointNodes.map((node) => node.name),
    sourceRenderSkinWeightedBones: sourceSkin.skeleton.bones.length,
    sourceLookupSkeletonNodes: sourceRoot.skeleton.bones.length,
    fingerRotationTracks: requiredFingerRotations.length, hipTranslation: 'native bind position retained' });
}
await mkdir(dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const report = {
  target: targetArgument, targetSha256: await sha256(targetPath),
  source: sourceArgument, sourceSha256: await sha256(sourcePath),
  output: outputArgument, outputSha256: await sha256(outputPath),
  method: 'Three SkeletonUtils.retargetClip, bind-world rotation offsets, glTF Transform animation channels',
  geometryAndTexturesChanged: false,
  clips: clipReports,
  status: 'Requires target-specific deformation and renderer verification; not visual acceptance',
};
await writeFile(`${outputPath}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Retargeted Idle/Walk/Run into ${outputArgument}.`);
