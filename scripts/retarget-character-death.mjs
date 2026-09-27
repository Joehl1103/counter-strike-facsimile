import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone, retargetClip } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Accessor, NodeIO } from '@gltf-transform/core';

const [targetArgument, sourceArgument, outputArgument] = process.argv.slice(2);
if (!targetArgument || !sourceArgument || !outputArgument) {
  throw new Error('Usage: node scripts/retarget-character-death.mjs <ct.glb> <quaternius.glb> <death-ct.glb>');
}
const targetPath = resolve(targetArgument);
const sourcePath = resolve(sourceArgument);
const outputPath = resolve(outputArgument);
if ([targetPath, sourcePath].includes(outputPath)) throw new Error('Write a separate derivative; inputs are immutable.');

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
async function load(path) {
  const bytes = await readFile(path);
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
function skin(root) {
  const skins = [];
  root.traverse((node) => { if (node instanceof THREE.SkinnedMesh) skins.push(node); });
  skins.sort((a, b) => b.skeleton.bones.length - a.skeleton.bones.length);
  if (!skins.length) throw new Error('Expected one skinned character.');
  return skins[0];
}
function byName(root) {
  const map = new Map();
  root.traverse((node) => {
    if (!node.name) return;
    if (map.has(node.name)) throw new Error(`Ambiguous node: ${node.name}`);
    map.set(node.name, node);
  });
  return map;
}
function norm(v) { return v.clone().normalize(); }
function basis(root, names) {
  root.updateMatrixWorld(true);
  const nodes = byName(root);
  const left = nodes.get(names.left), right = nodes.get(names.right), hips = nodes.get(names.hips), head = nodes.get(names.head);
  if (![left, right, hips, head].every(Boolean)) throw new Error('Missing named bilateral anatomy for orientation preflight.');
  const lateral = norm(right.getWorldPosition(new THREE.Vector3()).sub(left.getWorldPosition(new THREE.Vector3())));
  const up = norm(head.getWorldPosition(new THREE.Vector3()).sub(hips.getWorldPosition(new THREE.Vector3())));
  const forward = norm(new THREE.Vector3().crossVectors(lateral, up));
  // Re-orthogonalize to remove harmless bind-pose asymmetry, retaining a proper right-handed frame.
  const cleanLateral = norm(new THREE.Vector3().crossVectors(up, forward));
  return new THREE.Matrix4().makeBasis(cleanLateral, up, forward);
}
function boneLength(skeleton, upper, lower, foot) {
  const map = new Map(skeleton.bones.map((bone) => [bone.name, bone]));
  const a = map.get(upper), b = map.get(lower), c = map.get(foot);
  if (![a, b, c].every(Boolean)) throw new Error(`Missing homologous leg: ${upper}/${lower}/${foot}`);
  a.updateMatrixWorld(true); b.updateMatrixWorld(true); c.updateMatrixWorld(true);
  return a.getWorldPosition(new THREE.Vector3()).distanceTo(b.getWorldPosition(new THREE.Vector3()))
    + b.getWorldPosition(new THREE.Vector3()).distanceTo(c.getWorldPosition(new THREE.Vector3()));
}
function quatAngle(a, b) { return 2 * Math.acos(Math.min(1, Math.abs(a.dot(b)))); }
function animationStaticSignature(document) {
  return document.getRoot().listAnimations().map((animation) => ({
    name: animation.getName(), channels: animation.listChannels().map((channel) => ({
      node: channel.getTargetNode()?.getName(), path: channel.getTargetPath(),
      interpolation: channel.getSampler()?.getInterpolation(),
      input: Array.from(channel.getSampler()?.getInput()?.getArray() || []),
      output: Array.from(channel.getSampler()?.getOutput()?.getArray() || []),
    })),
  }));
}

const sourceToTarget = {
  mixamorigHips: 'pelvis', mixamorigSpine: 'spine_01', mixamorigSpine1: 'spine_02', mixamorigSpine2: 'spine_03',
  mixamorigNeck: 'neck_01', mixamorigHead: 'Head', mixamorigLeftShoulder: 'clavicle_l', mixamorigLeftArm: 'upperarm_l',
  mixamorigLeftForeArm: 'lowerarm_l', mixamorigLeftHand: 'hand_l', mixamorigRightShoulder: 'clavicle_r',
  mixamorigRightArm: 'upperarm_r', mixamorigRightForeArm: 'lowerarm_r', mixamorigRightHand: 'hand_r',
  mixamorigLeftUpLeg: 'thigh_l', mixamorigLeftLeg: 'calf_l', mixamorigLeftFoot: 'foot_l', mixamorigLeftToeBase: 'ball_l',
  mixamorigRightUpLeg: 'thigh_r', mixamorigRightLeg: 'calf_r', mixamorigRightFoot: 'foot_r', mixamorigRightToeBase: 'ball_r',
};
for (const side of ['Left', 'Right']) for (const digit of ['Index', 'Middle', 'Pinky', 'Ring', 'Thumb']) for (const joint of [1, 2, 3]) {
  const suffix = side === 'Left' ? '_l' : '_r';
  sourceToTarget[`mixamorig${side}Hand${digit}${joint}`] = `${digit.toLowerCase()}_0${joint}${suffix}`;
}

const [targetAsset, sourceAsset] = await Promise.all([load(targetPath), load(sourcePath)]);
const sourceClip = sourceAsset.animations.find((clip) => clip.name === 'Death01');
const sourceTPose = sourceAsset.animations.find((clip) => clip.name === 'A_TPose');
if (!sourceClip || Math.abs(sourceClip.duration - 2.4) > 1e-5) throw new Error('Expected authored 2.4-second Death01.');
if (!sourceTPose) throw new Error('Expected Quaternius A_TPose reference for bind preflight.');
const targetRoot = clone(targetAsset.scene), sourceRoot = clone(sourceAsset.scene);
const targetSkin = skin(targetRoot), sourceSkin = skin(sourceRoot);
targetSkin.skeleton.pose(); sourceSkin.skeleton.pose(); targetRoot.updateMatrixWorld(true); sourceRoot.updateMatrixWorld(true);
// SkeletonUtils accepts an Object3D source only when its lookup Skeleton is exposed on that root.
// The render skin remains unchanged and continues to own the actual inverse-bind data.
sourceRoot.skeleton = sourceSkin.skeleton;
const targetBones = new Map(targetSkin.skeleton.bones.map((bone) => [bone.name, bone]));
const sourceBones = new Map(sourceSkin.skeleton.bones.map((bone) => [bone.name, bone]));
for (const [targetName, sourceName] of Object.entries(sourceToTarget)) {
  if (!targetBones.has(targetName) || !sourceBones.has(sourceName)) throw new Error(`Required mapping unavailable: ${targetName} -> ${sourceName}`);
}
if (Object.keys(sourceToTarget).length !== targetSkin.skeleton.bones.length) throw new Error('Every CT weighted bone must have one source mapping.');

// A named authored reference is evidence, not an excuse to replace the actual GLTF bind pose.
// Inspect it before deriving bind offsets, and retain the discrepancy for the visual reviewer.
const sourceBindWorld = new Map(sourceSkin.skeleton.bones.map((bone) => [bone.name, bone.getWorldQuaternion(new THREE.Quaternion())]));
const sourceTPoseMixer = new THREE.AnimationMixer(sourceRoot); sourceTPoseMixer.clipAction(sourceTPose).play(); sourceTPoseMixer.setTime(0); sourceRoot.updateMatrixWorld(true);
let maxSourceBindToTPoseRadians = 0;
const sourceBindToTPose = [];
for (const bone of sourceSkin.skeleton.bones) {
  const authored = bone.getWorldQuaternion(new THREE.Quaternion());
  const radians = quatAngle(sourceBindWorld.get(bone.name), authored);
  maxSourceBindToTPoseRadians = Math.max(maxSourceBindToTPoseRadians, radians);
  sourceBindToTPose.push({ bone: bone.name, worldRotationDifferenceRadians: radians });
}
// Restore the actual bind frame; offsets below are always derived from this frame.
sourceTPoseMixer.stopAllAction();
sourceSkin.skeleton.pose(); sourceRoot.updateMatrixWorld(true);

const sourceBasis = basis(sourceRoot, { left: 'clavicle_l', right: 'clavicle_r', hips: 'pelvis', head: 'Head' });
const targetBasis = basis(targetRoot, { left: 'mixamorigLeftShoulder', right: 'mixamorigRightShoulder', hips: 'mixamorigHips', head: 'mixamorigHead' });
const commonOrientation = new THREE.Quaternion().setFromRotationMatrix(targetBasis).multiply(new THREE.Quaternion().setFromRotationMatrix(sourceBasis).invert());
// Put source data in the target's anatomical (bilateral/right-handed) frame exactly once.
sourceRoot.quaternion.copy(commonOrientation); sourceRoot.updateMatrixWorld(true);
const sourceLegLength = (boneLength(sourceSkin.skeleton, 'thigh_l', 'calf_l', 'foot_l') + boneLength(sourceSkin.skeleton, 'thigh_r', 'calf_r', 'foot_r')) / 2;
const targetLegLength = (boneLength(targetSkin.skeleton, 'mixamorigLeftUpLeg', 'mixamorigLeftLeg', 'mixamorigLeftFoot') + boneLength(targetSkin.skeleton, 'mixamorigRightUpLeg', 'mixamorigRightLeg', 'mixamorigRightFoot')) / 2;
const scale = targetLegLength / sourceLegLength;
const sourceHipBind = sourceBones.get('pelvis').getWorldPosition(new THREE.Vector3());
const targetHipBind = targetBones.get('mixamorigHips').position.clone();
const targetHipBindWorld = targetBones.get('mixamorigHips').getWorldPosition(new THREE.Vector3());
// SkeletonUtils applies scale to both source hip and hipPosition. This keeps CT's native bind
// position and transfers only the source pelvis displacement in target metres.
const hipPosition = targetHipBindWorld.clone().multiplyScalar(1 / scale).sub(sourceHipBind);
const localOffsets = {};
for (const [targetName, sourceName] of Object.entries(sourceToTarget)) {
  const sourceRotation = sourceBones.get(sourceName).getWorldQuaternion(new THREE.Quaternion());
  const targetRotation = targetBones.get(targetName).getWorldQuaternion(new THREE.Quaternion());
  localOffsets[targetName] = new THREE.Matrix4().makeRotationFromQuaternion(sourceRotation.invert().multiply(targetRotation));
}
const converted = retargetClip(targetSkin, sourceRoot, sourceClip, {
  names: sourceToTarget, hip: 'pelvis', localOffsets, scale, hipPosition,
  // SkeletonUtils counts samples as round(duration * fps). 73 inclusive authored
  // 30 Hz endpoints therefore require 73 / 2.4 here; its output times are 0..2.4 by 1/30.
  preserveBonePositions: true, useFirstFramePosition: false, fps: 73 / 2.4,
});
const hipTrack = converted.tracks.find((track) => track.name === '.bones[mixamorigHips].position');
if (!hipTrack || hipTrack.times.length !== 73 || Math.abs(converted.duration - 2.4) > 1e-5) throw new Error(`Expected 73-key standard pelvis translation track; got ${hipTrack?.times.length} keys and ${converted.duration}s.`);
const rotationTracks = converted.tracks.filter((track) => track.name.endsWith('.quaternion'));
if (rotationTracks.length !== 52 || rotationTracks.some((track) => track.times.length !== 73)) throw new Error('Expected one 73-key rotation track for every CT bone.');

const document = await new NodeIO().read(targetPath);
const originalAnimations = animationStaticSignature(document);
if (document.getRoot().listAnimations().some((animation) => animation.getName() === 'Death')) throw new Error('Target already has Death.');
const buffer = document.getRoot().listBuffers()[0];
const nodes = new Map(document.getRoot().listNodes().map((node) => [THREE.PropertyBinding.sanitizeNodeName(node.getName()), node]));
const death = document.createAnimation('Death');
for (const track of converted.tracks) {
  const match = /^\.bones\[(.+)\]\.(position|quaternion)$/.exec(track.name);
  if (!match) throw new Error(`Unexpected SkeletonUtils track: ${track.name}`);
  const node = nodes.get(match[1]); if (!node) throw new Error(`Missing target GLTF node: ${match[1]}`);
  const [ , name, property ] = match;
  const input = document.createAccessor(`Death:${name}:time`).setBuffer(buffer).setType(Accessor.Type.SCALAR).setArray(new Float32Array(track.times));
  const output = document.createAccessor(`Death:${name}:${property}`).setBuffer(buffer)
    .setType(property === 'position' ? Accessor.Type.VEC3 : Accessor.Type.VEC4).setArray(new Float32Array(track.values));
  const sampler = document.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
  death.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(node).setTargetPath(property === 'position' ? 'translation' : 'rotation').setSampler(sampler));
}
if (JSON.stringify(animationStaticSignature(document).slice(0, originalAnimations.length)) !== JSON.stringify(originalAnimations)) throw new Error('Existing CT animation channels changed before export.');
await mkdir(dirname(outputPath), { recursive: true}); await new NodeIO().write(outputPath, document);

// The standard retarget result is re-evaluated at every authored 30 Hz key. This checks its
// target-local pelvis keys against the scaled, aligned source trajectory and mapped world rotation.
const sourceMixer = new THREE.AnimationMixer(sourceRoot); sourceMixer.clipAction(sourceClip).play();
const candidate = await load(outputPath); const candidateRoot = candidate.scene; const candidateSkin = skin(candidateRoot);
const candidateClip = candidate.animations.find((clip) => clip.name === 'Death'); const candidateMixer = new THREE.AnimationMixer(candidateRoot); candidateMixer.clipAction(candidateClip).play();
const candidateBones = new Map(candidateSkin.skeleton.bones.map((bone) => [bone.name, bone]));
let maxHipResidual = 0, maxRotationResidualRadians = 0;
const pelvisTrajectory = [], rotationSamples = [];
for (let frame = 0; frame < 73; frame++) {
  const time = frame / 30; sourceMixer.setTime(time); candidateMixer.setTime(time); sourceRoot.updateMatrixWorld(true); candidateRoot.updateMatrixWorld(true);
  const sourceHip = sourceBones.get('pelvis').getWorldPosition(new THREE.Vector3());
  const expectedHipWorld = targetHipBindWorld.clone().add(sourceHip.sub(sourceHipBind).multiplyScalar(scale));
  const expectedHip = expectedHipWorld.clone().applyMatrix4(targetBones.get('mixamorigHips').parent.matrixWorld.clone().invert());
  const actualHip = candidateBones.get('mixamorigHips').position.clone();
  const hipResidual = expectedHip.distanceTo(actualHip); maxHipResidual = Math.max(maxHipResidual, hipResidual);
  pelvisTrajectory.push({ time, expectedTargetWorldMetres: expectedHipWorld.toArray(), expectedTargetLocalMetres: expectedHip.toArray(), actualTargetLocalMetres: actualHip.toArray(), residualMetres: hipResidual });
  let sampleMax = 0;
  for (const [targetName, sourceName] of Object.entries(sourceToTarget)) {
    const expected = sourceBones.get(sourceName).getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromRotationMatrix(localOffsets[targetName]));
    const actual = candidateBones.get(targetName).getWorldQuaternion(new THREE.Quaternion());
    sampleMax = Math.max(sampleMax, quatAngle(expected, actual));
  }
  maxRotationResidualRadians = Math.max(maxRotationResidualRadians, sampleMax); rotationSamples.push({ time, maxMappedWorldRestRelativeRotationResidualRadians: sampleMax });
}
if (maxHipResidual > 2e-5 || maxRotationResidualRadians > 2e-3) throw new Error(`Retarget proof failed: hip=${maxHipResidual}, rotation=${maxRotationResidualRadians}`);
const report = {
  status: 'offline retarget exported; requires Blender visual gate', method: 'Three SkeletonUtils.retargetClip with bind-world rotation offsets and standard scaled hipPosition',
  inputs: { target: targetArgument, targetSha256: await sha256(targetPath), source: sourceArgument, sourceSha256: await sha256(sourcePath) },
  output: { path: outputArgument, sha256: await sha256(outputPath), durationSeconds: candidateClip.duration, rotationTracks: rotationTracks.length, pelvisKeys: hipTrack.times.length },
  anatomy: { source: { left: 'clavicle_l', right: 'clavicle_r', hips: 'pelvis', head: 'Head', basis: sourceBasis.elements }, target: { left: 'mixamorigLeftShoulder', right: 'mixamorigRightShoulder', hips: 'mixamorigHips', head: 'mixamorigHead', basis: targetBasis.elements }, commonOrientationQuaternion: commonOrientation.toArray(), determinant: new THREE.Matrix4().makeRotationFromQuaternion(commonOrientation).determinant() },
  bind: { sourceHipWorld: sourceHipBind.toArray(), targetHipLocal: targetHipBind.toArray(), targetHipWorld: targetHipBindWorld.toArray(), sourceAverageLegMetres: sourceLegLength, targetAverageLegMetres: targetLegLength, singleHomologousLegScale: scale, hipPositionOption: hipPosition.toArray() },
  referencePosePreflight: { sourceAuthoredReference: 'A_TPose at time 0', sourceBindFrameUsedForOffsets: true, maxSourceBindToAuthoredTPoseWorldRotationDifferenceRadians: maxSourceBindToTPoseRadians, perBoneWorldRotationDifferenceRadians: sourceBindToTPose, anatomicalArmAndPalmComparison: 'Recorded from named bilateral clavicle/upperarm/hand bind bones through the common orientation; no authored-pose normalization or hand-authored keys applied.' },
  mappings: sourceToTarget, proof: { samples: 73, maxPelvisTrajectoryResidualMetres: maxHipResidual, maxMappedWorldRestRelativeRotationResidualRadians: maxRotationResidualRadians, pelvisTrajectory, rotationSamples },
  staticData: { targetAnimationNamesBefore: originalAnimations.map((x) => x.name), preservedExistingAnimationChannelsExactly: true, targetGeometryMaterialsAndSkin: 'unmodified; appended animation only' },
};
await writeFile(`${outputPath}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${outputPath} with Death (${hipTrack.times.length} pelvis keys).`);
