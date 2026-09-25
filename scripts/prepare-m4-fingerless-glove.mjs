import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

const expectedFrozenSha256 =
  'aa30cc72de22aea607a6f9a517ae7097272df3186c902e8ef6e3201443c9cbe1';
// Derive only from the frozen, matched arms/rifle export. Outputs must be new
// files so reruns cannot silently invalidate an earlier visual review.
const [inputArgument, outputArgument, auditArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument || !auditArgument) {
  throw new Error(
    'Usage: node scripts/prepare-m4-fingerless-glove.mjs INPUT.glb NEW_OUTPUT.glb NEW_AUDIT.json',
  );
}
const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
const auditPath = resolve(auditArgument);

if (new Set([inputPath, outputPath, auditPath]).size !== 3) {
  throw new Error(
    'The input, derived candidate and audit must use three different paths.',
  );
}

for (const destination of [outputPath, auditPath]) {
  const exists = await access(destination).then(
    () => true,
    () => false,
  );
  if (exists)
    throw new Error(`Refusing to overwrite existing evidence: ${destination}`);
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const typedArrayHash = (array) =>
  sha256(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
const stable = (value) => JSON.stringify(value);

function accessorRecord(accessor) {
  return {
    type: accessor.getType(),
    componentType: accessor.getComponentType(),
    normalized: accessor.getNormalized(),
    count: accessor.getCount(),
    sha256: typedArrayHash(accessor.getArray()),
  };
}

function primitiveRecord(primitive) {
  return {
    mode: primitive.getMode(),
    material: primitive.getMaterial()?.getName() ?? null,
    indices: accessorRecord(primitive.getIndices()),
    attributes: Object.fromEntries(
      primitive
        .listSemantics()
        .sort()
        .map((semantic) => [
          semantic,
          accessorRecord(primitive.getAttribute(semantic)),
        ]),
    ),
  };
}

function allTriangleCounts(primitives) {
  const triangleCounts = new Map();
  for (const primitive of primitives) {
    const indices = primitive.getIndices().getArray();
    for (let index = 0; index < indices.length; index += 3) {
      const triangle = `${indices[index]},${indices[index + 1]},${indices[index + 2]}`;
      triangleCounts.set(triangle, (triangleCounts.get(triangle) ?? 0) + 1);
    }
  }
  return Object.fromEntries(
    [...triangleCounts].sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

function animationRecord(document) {
  return document
    .getRoot()
    .listAnimations()
    .map((animation) => ({
      name: animation.getName(),
      channels: animation.listChannels().map((channel) => ({
        targetNode: channel.getTargetNode()?.getName() ?? null,
        targetPath: channel.getTargetPath(),
        input: accessorRecord(channel.getSampler().getInput()),
        output: accessorRecord(channel.getSampler().getOutput()),
        interpolation: channel.getSampler().getInterpolation(),
      })),
    }));
}

function nodeRecord(node) {
  return {
    name: node.getName(),
    extras: node.getExtras(),
    translation: node.getTranslation(),
    rotation: node.getRotation(),
    scale: node.getScale(),
    skin: node.getSkin()?.getName() ?? null,
    parent: node.getParentNode()?.getName() ?? null,
    children: node.listChildren().map((child) => child.getName()),
  };
}

function skinRecord(skin) {
  return {
    name: skin.getName(),
    joints: skin.listJoints().map((joint) => joint.getName()),
    inverseBindMatrices: accessorRecord(skin.getInverseBindMatrices()),
  };
}

function isGloveInfluence(jointName) {
  return /^(hand|(?:index|middle|ring|pinky|thumb)Knuckle|(?:index|middle|ring|pinky|thumb)_01)_[lr]$/.test(
    jointName,
  );
}

function classifyGloveTriangles(armsPrimitive, armSkin) {
  const joints = armsPrimitive.getAttribute('JOINTS_0').getArray();
  const weights = armsPrimitive.getAttribute('WEIGHTS_0').getArray();
  const indices = armsPrimitive.getIndices().getArray();
  const jointNames = armSkin.listJoints().map((joint) => joint.getName());
  const triangleGroups = { glove: [], skin: [] };
  const winnerCounts = new Map();

  const highestPositiveInfluence = (vertexIndex) => {
    let winningWeight = -1;
    let winningJoint = -1;
    for (let lane = 0; lane < 4; lane += 1) {
      const offset = vertexIndex * 4 + lane;
      if (weights[offset] > winningWeight) {
        winningWeight = weights[offset];
        winningJoint = joints[offset];
      }
    }
    if (winningWeight <= 0 || !jointNames[winningJoint]) {
      throw new Error(
        `Vertex ${vertexIndex} has no positive named skin influence.`,
      );
    }
    return jointNames[winningJoint];
  };

  for (let offset = 0; offset < indices.length; offset += 3) {
    const winnerNames = [0, 1, 2].map((triangleOffset) =>
      highestPositiveInfluence(indices[offset + triangleOffset]),
    );
    for (const winnerName of winnerNames) {
      winnerCounts.set(winnerName, (winnerCounts.get(winnerName) ?? 0) + 1);
    }
    const destination = winnerNames.every(isGloveInfluence)
      ? triangleGroups.glove
      : triangleGroups.skin;
    destination.push(indices[offset], indices[offset + 1], indices[offset + 2]);
  }

  if (triangleGroups.glove.length === 0 || triangleGroups.skin.length === 0) {
    throw new Error(
      'The requested fingerless split did not produce both glove and skin triangle groups.',
    );
  }

  return {
    triangleGroups,
    audit: {
      inputTriangleCount: indices.length / 3,
      gloveTriangleCount: triangleGroups.glove.length / 3,
      skinTriangleCount: triangleGroups.skin.length / 3,
      rule: 'A triangle is glove only when each vertex’s highest positive JOINTS_0/WEIGHTS_0 influence is hand_*, *Knuckle_*, or *_01_*; *_02_* and *_03_* distal-finger influences and all arm influences remain skin.',
      gloveInfluencePattern:
        'hand_* | (index|middle|ring|pinky|thumb)Knuckle_* | (index|middle|ring|pinky|thumb)_01_*',
      retainedSkinInfluencePattern:
        'all other actual positive named influences, including *_02_*, *_03_*, twist_*_arm_*, and upperArm_*',
      highestPositiveInfluenceVertexAppearances: Object.fromEntries(
        [...winnerCounts].sort(([first], [second]) =>
          first.localeCompare(second),
        ),
      ),
    },
  };
}

function createPartitionPrimitive(
  document,
  sourcePrimitive,
  indices,
  material,
) {
  const partition = document
    .createPrimitive()
    .setMode(sourcePrimitive.getMode())
    .setMaterial(material);
  for (const semantic of sourcePrimitive.listSemantics()) {
    partition.setAttribute(semantic, sourcePrimitive.getAttribute(semantic));
  }
  const sourceIndexArray = sourcePrimitive.getIndices().getArray();
  const indexArray = new sourceIndexArray.constructor(indices);
  partition.setIndices(
    document.createAccessor().setType('SCALAR').setArray(indexArray),
  );
  return partition;
}

function sourceSnapshot(document) {
  const root = document.getRoot();
  const armsNode = root
    .listNodes()
    .find((node) => node.getName() === 'FPS_Arms_Mesh');
  const rifleNode = root
    .listNodes()
    .find((node) => node.getName() === 'ChargeHandle_Mesh');
  if (
    !armsNode ||
    !rifleNode ||
    !armsNode.getSkin() ||
    !armsNode.getMesh() ||
    !rifleNode.getMesh()
  ) {
    throw new Error(
      'Expected named M4 arms/rifle nodes, meshes, and arm skin are absent.',
    );
  }
  const armsPrimitive = armsNode.getMesh().listPrimitives().at(0);
  const riflePrimitive = rifleNode.getMesh().listPrimitives().at(0);
  const cameraMount = root
    .listNodes()
    .find((node) => node.getName() === 'game-viewmodel-mount');
  const socketNodes = ['muzzle-socket', 'ejection-socket'].map((name) =>
    root.listNodes().find((node) => node.getName() === name),
  );
  return {
    armsNode,
    rifleNode,
    armsPrimitive,
    riflePrimitive,
    armSkin: armsNode.getSkin(),
    cameraMount,
    socketNodes,
    allNodes: root.listNodes(),
    allTextures: root.listTextures(),
    allSkins: root.listSkins(),
    animations: animationRecord(document),
  };
}

function preservationAudit(
  sourceDocument,
  candidateDocument,
  classificationAudit,
) {
  const source = sourceSnapshot(sourceDocument);
  const candidate = sourceSnapshot(candidateDocument);
  const sourceArmTriangles = allTriangleCounts([source.armsPrimitive]);
  const candidateArmNodes = candidate.allNodes.filter(
    (node) => node.getExtras().viewmodelArm === true && node.getMesh(),
  );
  const candidateArmPrimitives = candidateArmNodes.flatMap((node) =>
    node.getMesh().listPrimitives(),
  );
  const candidateArmTriangles = allTriangleCounts(candidateArmPrimitives);
  const sourceTextureHashes = source.allTextures.map((texture) => ({
    name: texture.getName(),
    mimeType: texture.getMimeType(),
    sha256: typedArrayHash(texture.getImage()),
  }));
  const candidateTextureHashes = candidate.allTextures.map((texture) => ({
    name: texture.getName(),
    mimeType: texture.getMimeType(),
    sha256: typedArrayHash(texture.getImage()),
  }));
  const sourceArmsAttributes = Object.fromEntries(
    source.armsPrimitive
      .listSemantics()
      .sort()
      .map((semantic) => [
        semantic,
        accessorRecord(source.armsPrimitive.getAttribute(semantic)),
      ]),
  );
  const candidateArmAttributes = candidateArmPrimitives.map((primitive) =>
    Object.fromEntries(
      primitive
        .listSemantics()
        .sort()
        .map((semantic) => [
          semantic,
          accessorRecord(primitive.getAttribute(semantic)),
        ]),
    ),
  );
  const sourceNodeRecords = new Map(
    source.allNodes.map((node) => [node.getName(), nodeRecord(node)]),
  );
  const candidateNodeRecords = new Map(
    candidate.allNodes.map((node) => [node.getName(), nodeRecord(node)]),
  );
  // Adding one sibling leaf is the only allowed hierarchy change.
  const allOriginalNodesPreserved = source.allNodes.every((node) => {
    const original = sourceNodeRecords.get(node.getName());
    const derived = candidateNodeRecords.get(node.getName());
    if (!derived) return false;
    const withoutGloveChild = {
      ...derived,
      children: derived.children.filter(
        (name) => name !== 'FPS_Arms_Glove_Mesh',
      ),
    };
    return stable(original) === stable(withoutGloveChild);
  });
  const derivedGloveMaterial = candidateDocument
    .getRoot()
    .listMaterials()
    .find((material) => material.getName() === 'Derived_M4_Fingerless_Glove');
  const gloveNode = candidateNodeRecords.get('FPS_Arms_Glove_Mesh');
  const gloveRestMatchesArms =
    gloveNode &&
    stable({
      ...gloveNode,
      name: 'FPS_Arms_Mesh',
    }) === stable(sourceNodeRecords.get('FPS_Arms_Mesh'));

  return {
    processor:
      '@gltf-transform/core NodeIO 4.5.0 material and primitive operations',
    input: {
      sourceSha256: expectedFrozenSha256,
      armsTriangles: source.armsPrimitive.getIndices().getCount() / 3,
      rifleTriangles: source.riflePrimitive.getIndices().getCount() / 3,
      draws: 2,
      skins: source.allSkins.map((skin) => ({
        name: skin.getName(),
        joints: skin.listJoints().map((joint) => joint.getName()),
      })),
    },
    candidate: {
      armsTriangles: candidateArmPrimitives.reduce(
        (total, primitive) => total + primitive.getIndices().getCount() / 3,
        0,
      ),
      rifleTriangles: candidate.riflePrimitive.getIndices().getCount() / 3,
      armLeafNodes: candidateArmNodes.map((node) => ({
        name: node.getName(),
        extras: node.getExtras(),
        skin: node.getSkin()?.getName(),
      })),
      gloveMaterial: derivedGloveMaterial
        ? {
            name: derivedGloveMaterial.getName(),
            baseColorFactor: derivedGloveMaterial.getBaseColorFactor(),
            roughnessFactor: derivedGloveMaterial.getRoughnessFactor(),
            baseColorTexture: derivedGloveMaterial
              .getBaseColorTexture()
              ?.getName(),
          }
        : null,
    },
    classification: classificationAudit,
    checks: {
      armOrientedTriangleMultisetPreserved:
        stable(sourceArmTriangles) === stable(candidateArmTriangles),
      armVertexAttributeTuplesPreservedOnBothPartitions:
        candidateArmAttributes.length === 2 &&
        candidateArmAttributes.every(
          (attributes) => stable(attributes) === stable(sourceArmsAttributes),
        ),
      riflePrimitivePreserved:
        stable(primitiveRecord(source.riflePrimitive)) ===
        stable(primitiveRecord(candidate.riflePrimitive)),
      textureBytesPreserved:
        stable(sourceTextureHashes) === stable(candidateTextureHashes),
      skinsAndInverseBindMatricesPreserved:
        stable(source.allSkins.map(skinRecord)) ===
        stable(candidate.allSkins.map(skinRecord)),
      animationsPreserved:
        stable(source.animations) === stable(candidate.animations),
      cameraMountPreserved:
        stable(nodeRecord(source.cameraMount)) ===
        stable(nodeRecord(candidate.cameraMount)),
      socketsPreserved:
        stable(source.socketNodes.map(nodeRecord)) ===
        stable(candidate.socketNodes.map(nodeRecord)),
      originalNodeTransformsHierarchyAndMetadataPreserved:
        allOriginalNodesPreserved,
      gloveLeafRestTransformParentAndSkinPreserved:
        Boolean(gloveRestMatchesArms),
      originalArmLeafMetadataPreserved:
        stable(sourceNodeRecords.get('FPS_Arms_Mesh').extras) ===
        stable(candidateNodeRecords.get('FPS_Arms_Mesh').extras),
      addedGloveLeafHasViewmodelTagAndSameSkin:
        candidateNodeRecords.get('FPS_Arms_Glove_Mesh')?.extras.viewmodelArm ===
          true &&
        candidateNodeRecords.get('FPS_Arms_Glove_Mesh')?.skin ===
          sourceNodeRecords.get('FPS_Arms_Mesh').skin,
    },
  };
}

const inputBytes = await readFile(inputPath);
if (sha256(inputBytes) !== expectedFrozenSha256) {
  throw new Error(
    `Frozen input SHA-256 differs from ${expectedFrozenSha256}; refusing to derive from an unreviewed source.`,
  );
}

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(auditPath), { recursive: true });
const io = new NodeIO();
const sourceDocument = await io.read(inputPath);
const source = sourceSnapshot(sourceDocument);
if (
  source.armsNode.getMesh().listPrimitives().length !== 1 ||
  source.rifleNode.getMesh().listPrimitives().length !== 1
) {
  throw new Error(
    'This bounded processor expects exactly one primitive on each frozen source mesh.',
  );
}

const { triangleGroups, audit: classificationAudit } = classifyGloveTriangles(
  source.armsPrimitive,
  source.armSkin,
);
const originalSkinMaterial = source.armsPrimitive.getMaterial();
const gloveMaterial = sourceDocument
  .createMaterial('Derived_M4_Fingerless_Glove')
  .copy(originalSkinMaterial)
  .setName('Derived_M4_Fingerless_Glove')
  .setBaseColorFactor([0.1, 0.13, 0.16, 1])
  .setRoughnessFactor(0.82)
  .setMetallicFactor(0);

const originalArmsMesh = source.armsNode.getMesh();
originalArmsMesh.removePrimitive(source.armsPrimitive);
originalArmsMesh.addPrimitive(
  createPartitionPrimitive(
    sourceDocument,
    source.armsPrimitive,
    triangleGroups.skin,
    originalSkinMaterial,
  ),
);
const gloveArmsMesh = sourceDocument
  .createMesh('Circle.003_Fingerless_Glove')
  .addPrimitive(
    createPartitionPrimitive(
      sourceDocument,
      source.armsPrimitive,
      triangleGroups.glove,
      gloveMaterial,
    ),
  );
const armParent = source.armsNode.getParentNode();
if (!armParent) {
  throw new Error('The frozen arm mesh has no parent node.');
}
const gloveLeaf = sourceDocument
  .createNode('FPS_Arms_Glove_Mesh')
  .setMesh(gloveArmsMesh)
  .setSkin(source.armsNode.getSkin())
  .setTranslation(source.armsNode.getTranslation())
  .setRotation(source.armsNode.getRotation())
  .setScale(source.armsNode.getScale())
  .setExtras({
    ...source.armsNode.getExtras(),
    viewmodelArm: true,
    assetCategory: 'viewmodelArm',
  });
armParent.addChild(gloveLeaf);

await io.write(outputPath, sourceDocument);
const candidateDocument = await io.read(outputPath);
const audit = preservationAudit(
  await io.read(inputPath),
  candidateDocument,
  classificationAudit,
);
audit.candidate.outputSha256 = sha256(await readFile(outputPath));
audit.candidate.draws = candidateDocument
  .getRoot()
  .listNodes()
  .flatMap((node) => node.getMesh()?.listPrimitives() ?? []).length;
audit.allChecksPass =
  Object.values(audit.checks).every(Boolean) &&
  audit.candidate.armsTriangles === 3596 &&
  audit.candidate.rifleTriangles === 3480 &&
  audit.candidate.draws === 3 &&
  audit.input.skins.reduce((total, skin) => total + skin.joints.length, 0) ===
    72;
await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

if (!audit.allChecksPass) {
  throw new Error(`Preservation audit failed. Read ${auditPath}.`);
}
console.log(
  JSON.stringify(
    {
      outputPath,
      auditPath,
      classification: classificationAudit,
      checks: audit.checks,
      outputSha256: audit.candidate.outputSha256,
    },
    null,
    2,
  ),
);
