import { createHash } from 'node:crypto';
import { Matrix3, Matrix4, Vector3 } from 'three';

// Exported merge gate for Blender-authored viewmodel clips. It deliberately
// matches vertices by their rebased, skinned surface attributes instead of raw
// accessor index: Blender can reorder split vertices at normal and UV seams.
export const AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES = Object.freeze({
  pointCm: 2e-5,
  unitNormal: 1e-6,
  uv: 1e-6,
  weight: 1e-6,
});

function maximumArrayDifference(first, second) {
  if (!first || !second || first.length !== second.length) return Infinity;
  let maximum = 0;
  for (let index = 0; index < first.length; index += 1) maximum = Math.max(maximum, Math.abs(first[index] - second[index]));
  return maximum;
}

function assertFiniteArray(accessor, label) {
  if (!accessor) throw new Error(`${label}: missing accessor.`);
  for (const value of accessor.getArray()) {
    if (!Number.isFinite(value)) throw new Error(`${label}: contains a non-finite value.`);
  }
}

function assertFiniteNumbers(value, label) {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${label}: contains a non-finite value.`);
  if (Array.isArray(value)) value.forEach((entry, index) => assertFiniteNumbers(entry, `${label}[${index}]`));
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) assertFiniteNumbers(entry, `${label}.${key}`);
  }
}

function matrixAt(accessor, index) {
  return new Matrix4().fromArray(accessor.getArray(), index * 16);
}

function vectorAt(array, index, components) {
  return new Vector3(array[index * components], array[index * components + 1],
    components === 3 ? array[index * components + 2] : 0);
}

function orderedNodeMap(document) {
  const nodes = new Map();
  for (const node of document.getRoot().listNodes()) {
    if (!node.getName() || nodes.has(node.getName())) throw new Error('Equivalence gate requires unique non-empty node names.');
    nodes.set(node.getName(), node);
  }
  return nodes;
}

function assertExpectedDocument(document, label, weaponArmatureName) {
  if (document.getRoot().listExtensions().length !== 0) {
    throw new Error(`${label}: document extensions are unsupported by this merge gate.`);
  }
  const animations = document.getRoot().listAnimations().map((animation) => animation.getName())
    .sort((firstName, secondName) => firstName.localeCompare(secondName));
  const expectedAnimations = ['Arms_Armature', weaponArmatureName]
    .sort((firstName, secondName) => firstName.localeCompare(secondName)).join('|');
  if (animations.join('|') !== expectedAnimations) {
    throw new Error(`${label}: expected animations ${expectedAnimations}, found ${animations.join('|')}`);
  }
  const skinnedNodes = document.getRoot().listNodes().filter((node) => node.getSkin());
  if (skinnedNodes.length !== 2) throw new Error(`${label}: expected exactly two skinned nodes.`);
  return skinnedNodes;
}

function verifyHierarchyAndSkin(baselineDocument, candidateDocument, label) {
  const baselineNodes = orderedNodeMap(baselineDocument);
  const candidateNodes = orderedNodeMap(candidateDocument);
  if (baselineNodes.size !== candidateNodes.size) throw new Error(`${label}: node count differs.`);
  for (const [name, baselineNode] of baselineNodes) {
    const candidateNode = candidateNodes.get(name);
    if (!candidateNode) throw new Error(`${label}: node missing: ${name}.`);
    const baselineChildren = baselineNode.listChildren().map((node) => node.getName()).join('|');
    const candidateChildren = candidateNode.listChildren().map((node) => node.getName()).join('|');
    if (baselineChildren !== candidateChildren) throw new Error(`${label}: hierarchy differs at ${name}.`);
    if (Boolean(baselineNode.getSkin()) !== Boolean(candidateNode.getSkin())) {
      throw new Error(`${label}: skin ownership differs at ${name}.`);
    }
    if (baselineNode.getSkin()) {
      const baselineJoints = baselineNode.getSkin().listJoints().map((joint) => joint.getName()).join('|');
      const candidateJoints = candidateNode.getSkin().listJoints().map((joint) => joint.getName()).join('|');
      if (baselineJoints !== candidateJoints) throw new Error(`${label}: skin joint order differs at ${name}.`);
    }
  }
}

function deriveMeshToBaselineRebase(baselineNode, candidateNode, label) {
  const baselineMatrices = baselineNode.getSkin().getInverseBindMatrices();
  const candidateMatrices = candidateNode.getSkin().getInverseBindMatrices();
  if (baselineMatrices.getCount() !== candidateMatrices.getCount()) {
    throw new Error(`${label}: inverse-bind-matrix count differs.`);
  }
  assertFiniteArray(baselineMatrices, `${label}: baseline inverse bind matrices`);
  assertFiniteArray(candidateMatrices, `${label}: candidate inverse bind matrices`);
  const matrix = matrixAt(baselineMatrices, 0).invert().multiply(matrixAt(candidateMatrices, 0));
  const jointRebases = [];
  let maximumJointMatrixDifference = 0;
  for (let joint = 0; joint < baselineMatrices.getCount(); joint += 1) {
    const jointRebase = matrixAt(baselineMatrices, joint).invert().multiply(matrixAt(candidateMatrices, joint));
    maximumJointMatrixDifference = Math.max(maximumJointMatrixDifference,
      maximumArrayDifference(matrix.elements, jointRebase.elements));
    jointRebases.push(jointRebase);
  }
  return { matrix, jointRebases, maximumJointMatrixDifference };
}

function assertCompatiblePrimitiveShape(baselinePrimitive, candidatePrimitive, label) {
  const requiredSemantics = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'];
  for (const semantic of requiredSemantics) {
    const baseline = baselinePrimitive.getAttribute(semantic);
    const candidate = candidatePrimitive.getAttribute(semantic);
    if (!baseline || !candidate || baseline.getCount() !== candidate.getCount()) {
      throw new Error(`${label}: ${semantic} count differs.`);
    }
    assertFiniteArray(baseline, `${label}: baseline ${semantic}`);
    assertFiniteArray(candidate, `${label}: candidate ${semantic}`);
  }
  if (baselinePrimitive.listSemantics().sort().join('|') !== requiredSemantics.slice().sort().join('|')
    || candidatePrimitive.listSemantics().sort().join('|') !== requiredSemantics.slice().sort().join('|')) {
    throw new Error(`${label}: unsupported extra or missing vertex semantic.`);
  }
  if (baselinePrimitive.listTargets().length !== 0 || candidatePrimitive.listTargets().length !== 0) {
    throw new Error(`${label}: morph targets are unsupported by this merge gate.`);
  }
  if (!baselinePrimitive.getIndices() || !candidatePrimitive.getIndices()
    || baselinePrimitive.getIndices().getCount() !== candidatePrimitive.getIndices().getCount()) {
    throw new Error(`${label}: triangle-index count differs.`);
  }
  assertFiniteArray(baselinePrimitive.getIndices(), `${label}: baseline indices`);
  assertFiniteArray(candidatePrimitive.getIndices(), `${label}: candidate indices`);
}

function cellKey(point) {
  const { pointCm } = AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES;
  return [Math.floor(point.x / pointCm), Math.floor(point.y / pointCm), Math.floor(point.z / pointCm)].join(',');
}

function sameJointAndWeightTuple(baselineJoints, baselineWeights, baselineVertex,
  candidateJoints, candidateWeights, candidateVertex) {
  let maximumWeightDifference = 0;
  for (let influence = 0; influence < 4; influence += 1) {
    const baselineIndex = baselineVertex * 4 + influence;
    const candidateIndex = candidateVertex * 4 + influence;
    if (baselineJoints[baselineIndex] !== candidateJoints[candidateIndex]) return { matches: false, maximumWeightDifference };
    maximumWeightDifference = Math.max(maximumWeightDifference,
      Math.abs(baselineWeights[baselineIndex] - candidateWeights[candidateIndex]));
  }
  return { matches: maximumWeightDifference <= AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.weight, maximumWeightDifference };
}

function findSeamAwareCorrespondence(baselinePrimitive, candidatePrimitive, candidateToBaseline) {
  const baselinePositions = baselinePrimitive.getAttribute('POSITION').getArray();
  const baselineNormals = baselinePrimitive.getAttribute('NORMAL').getArray();
  const baselineUvs = baselinePrimitive.getAttribute('TEXCOORD_0').getArray();
  const baselineJoints = baselinePrimitive.getAttribute('JOINTS_0').getArray();
  const baselineWeights = baselinePrimitive.getAttribute('WEIGHTS_0').getArray();
  const candidatePositions = candidatePrimitive.getAttribute('POSITION').getArray();
  const candidateNormals = candidatePrimitive.getAttribute('NORMAL').getArray();
  const candidateUvs = candidatePrimitive.getAttribute('TEXCOORD_0').getArray();
  const candidateJoints = candidatePrimitive.getAttribute('JOINTS_0').getArray();
  const candidateWeights = candidatePrimitive.getAttribute('WEIGHTS_0').getArray();
  const baselineVerticesByCell = new Map();
  for (let vertex = 0; vertex < baselinePositions.length / 3; vertex += 1) {
    const key = cellKey(vectorAt(baselinePositions, vertex, 3));
    const vertices = baselineVerticesByCell.get(key) ?? [];
    vertices.push(vertex);
    baselineVerticesByCell.set(key, vertices);
  }
  const normalRebase = new Matrix3().getNormalMatrix(candidateToBaseline);
  const mapping = Array.from({ length: candidatePositions.length / 3 }, () => -1);
  let unmatchedVertices = 0;
  let ambiguousVertices = 0;
  let maximumPointDifference = 0;
  let maximumUnitNormalDifference = 0;
  let maximumUvDifference = 0;
  let maximumWeightDifference = 0;
  for (let candidateVertex = 0; candidateVertex < mapping.length; candidateVertex += 1) {
    const candidatePoint = vectorAt(candidatePositions, candidateVertex, 3).applyMatrix4(candidateToBaseline);
    const candidateNormal = vectorAt(candidateNormals, candidateVertex, 3).applyMatrix3(normalRebase).normalize();
    const cell = candidatePoint.clone();
    const baseCell = [Math.floor(cell.x / AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.pointCm),
      Math.floor(cell.y / AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.pointCm),
      Math.floor(cell.z / AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.pointCm)];
    const matches = [];
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
      for (const baselineVertex of baselineVerticesByCell.get([baseCell[0] + dx, baseCell[1] + dy, baseCell[2] + dz].join(',')) ?? []) {
        const pointDifference = candidatePoint.distanceTo(vectorAt(baselinePositions, baselineVertex, 3));
        const normalDifference = candidateNormal.distanceTo(vectorAt(baselineNormals, baselineVertex, 3).normalize());
        const uvDifference = Math.max(Math.abs(candidateUvs[candidateVertex * 2] - baselineUvs[baselineVertex * 2]),
          Math.abs(candidateUvs[candidateVertex * 2 + 1] - baselineUvs[baselineVertex * 2 + 1]));
        const weights = sameJointAndWeightTuple(baselineJoints, baselineWeights, baselineVertex,
          candidateJoints, candidateWeights, candidateVertex);
        if (pointDifference <= AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.pointCm
          && normalDifference <= AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.unitNormal
          && uvDifference <= AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.uv && weights.matches) {
          matches.push({ baselineVertex, pointDifference, normalDifference, uvDifference,
            weightDifference: weights.maximumWeightDifference });
        }
      }
    }
    if (matches.length === 0) { unmatchedVertices += 1; continue; }
    if (matches.length > 1) { ambiguousVertices += 1; continue; }
    const match = matches[0];
    mapping[candidateVertex] = match.baselineVertex;
    maximumPointDifference = Math.max(maximumPointDifference, match.pointDifference);
    maximumUnitNormalDifference = Math.max(maximumUnitNormalDifference, match.normalDifference);
    maximumUvDifference = Math.max(maximumUvDifference, match.uvDifference);
    maximumWeightDifference = Math.max(maximumWeightDifference, match.weightDifference);
  }
  return { mapping, unmatchedVertices, ambiguousVertices, maximumPointDifference,
    maximumUnitNormalDifference, maximumUvDifference, maximumWeightDifference };
}

function verifyRebaseAgreement(candidatePrimitive, rebase) {
  const positions = candidatePrimitive.getAttribute('POSITION').getArray();
  let maximumJointRebasePointDifference = 0;
  for (let vertex = 0; vertex < positions.length / 3; vertex += 1) {
    const point = vectorAt(positions, vertex, 3);
    const baselinePoint = point.clone().applyMatrix4(rebase.matrix);
    for (const jointRebase of rebase.jointRebases) {
      maximumJointRebasePointDifference = Math.max(maximumJointRebasePointDifference,
        baselinePoint.distanceTo(point.clone().applyMatrix4(jointRebase)));
    }
  }
  return { maximumJointRebasePointDifference,
    passes: maximumJointRebasePointDifference <= AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.pointCm };
}

function compareWeightedBindSpace(baselinePrimitive, candidatePrimitive, mapping, baselineSkin, candidateSkin) {
  const baselinePositions = baselinePrimitive.getAttribute('POSITION').getArray();
  const baselineNormals = baselinePrimitive.getAttribute('NORMAL').getArray();
  const baselineJoints = baselinePrimitive.getAttribute('JOINTS_0').getArray();
  const baselineWeights = baselinePrimitive.getAttribute('WEIGHTS_0').getArray();
  const candidatePositions = candidatePrimitive.getAttribute('POSITION').getArray();
  const candidateNormals = candidatePrimitive.getAttribute('NORMAL').getArray();
  const candidateJoints = candidatePrimitive.getAttribute('JOINTS_0').getArray();
  const candidateWeights = candidatePrimitive.getAttribute('WEIGHTS_0').getArray();
  const baselineMatrices = Array.from({ length: baselineSkin.getInverseBindMatrices().getCount() }, (_, index) =>
    matrixAt(baselineSkin.getInverseBindMatrices(), index));
  const candidateMatrices = Array.from({ length: candidateSkin.getInverseBindMatrices().getCount() }, (_, index) =>
    matrixAt(candidateSkin.getInverseBindMatrices(), index));
  const baselineNormalMatrices = baselineMatrices.map((matrix) => new Matrix3().getNormalMatrix(matrix));
  const candidateNormalMatrices = candidateMatrices.map((matrix) => new Matrix3().getNormalMatrix(matrix));
  let comparedWeightedInfluences = 0;
  let maximumBindPointDifference = 0;
  let maximumBindUnitNormalDifference = 0;
  for (let candidateVertex = 0; candidateVertex < mapping.length; candidateVertex += 1) {
    const baselineVertex = mapping[candidateVertex];
    if (baselineVertex < 0) continue;
    for (let influence = 0; influence < 4; influence += 1) {
      const candidateIndex = candidateVertex * 4 + influence;
      const baselineIndex = baselineVertex * 4 + influence;
      if (candidateWeights[candidateIndex] <= 0 && baselineWeights[baselineIndex] <= 0) continue;
      if (candidateJoints[candidateIndex] !== baselineJoints[baselineIndex]) {
        throw new Error('Correspondence admitted a different weighted joint tuple.');
      }
      const joint = candidateJoints[candidateIndex];
      const baselinePoint = vectorAt(baselinePositions, baselineVertex, 3).applyMatrix4(baselineMatrices[joint]);
      const candidatePoint = vectorAt(candidatePositions, candidateVertex, 3).applyMatrix4(candidateMatrices[joint]);
      const baselineNormal = vectorAt(baselineNormals, baselineVertex, 3).applyMatrix3(baselineNormalMatrices[joint]).normalize();
      const candidateNormal = vectorAt(candidateNormals, candidateVertex, 3).applyMatrix3(candidateNormalMatrices[joint]).normalize();
      maximumBindPointDifference = Math.max(maximumBindPointDifference, baselinePoint.distanceTo(candidatePoint));
      maximumBindUnitNormalDifference = Math.max(maximumBindUnitNormalDifference, baselineNormal.distanceTo(candidateNormal));
      comparedWeightedInfluences += 1;
    }
  }
  return { comparedWeightedInfluences, maximumBindPointDifference, maximumBindUnitNormalDifference,
    passes: maximumBindPointDifference <= AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.pointCm
      && maximumBindUnitNormalDifference <= AUTHORED_VIEWMODEL_EQUIVALENCE_TOLERANCES.unitNormal };
}

function cyclicTriangleKey(first, second, third) {
  return [[first, second, third], [second, third, first], [third, first, second]]
    .map((triangle) => triangle.join(',')).sort()[0];
}

function triangleMultiset(indices, mapping = null) {
  const triangles = new Map();
  for (let offset = 0; offset < indices.length; offset += 3) {
    const vertices = [indices[offset], indices[offset + 1], indices[offset + 2]];
    if (mapping) {
      if (vertices.some((vertex) => mapping[vertex] < 0)) return null;
      for (let index = 0; index < 3; index += 1) vertices[index] = mapping[vertices[index]];
    }
    const key = cyclicTriangleKey(...vertices);
    triangles.set(key, (triangles.get(key) ?? 0) + 1);
  }
  return triangles;
}

function compareOrientedTopology(baselinePrimitive, candidatePrimitive, mapping) {
  const baseline = triangleMultiset(baselinePrimitive.getIndices().getArray());
  const candidate = triangleMultiset(candidatePrimitive.getIndices().getArray(), mapping);
  if (!candidate) return { passes: false, reason: 'incomplete vertex correspondence' };
  let missingOrWrongWindingTriangles = 0;
  let extraOrWrongWindingTriangles = 0;
  for (const [triangle, count] of baseline) missingOrWrongWindingTriangles += Math.max(0, count - (candidate.get(triangle) ?? 0));
  for (const [triangle, count] of candidate) extraOrWrongWindingTriangles += Math.max(0, count - (baseline.get(triangle) ?? 0));
  return { passes: missingOrWrongWindingTriangles === 0 && extraOrWrongWindingTriangles === 0,
    baselineTriangleCount: baselinePrimitive.getIndices().getCount() / 3,
    candidateTriangleCount: candidatePrimitive.getIndices().getCount() / 3,
    missingOrWrongWindingTriangles, extraOrWrongWindingTriangles,
    cyclicOrderAllowed: true, reversedWindingAllowed: false };
}

function textureSnapshot(texture, info) {
  if (!texture) return null;
  const image = texture.getImage();
  return { name: texture.getName(), mimeType: texture.getMimeType(),
    imageSha256: image ? createHash('sha256').update(image).digest('hex') : null,
    imageByteLength: image?.byteLength ?? null, texCoord: info?.getTexCoord() ?? null,
    magFilter: info?.getMagFilter() ?? null, minFilter: info?.getMinFilter() ?? null,
    wrapS: info?.getWrapS() ?? null, wrapT: info?.getWrapT() ?? null };
}

function materialSnapshot(material) {
  if (!material) return null;
  const textureSlots = [['baseColor', 'getBaseColorTexture', 'getBaseColorTextureInfo'],
    ['metallicRoughness', 'getMetallicRoughnessTexture', 'getMetallicRoughnessTextureInfo'],
    ['normal', 'getNormalTexture', 'getNormalTextureInfo'], ['occlusion', 'getOcclusionTexture', 'getOcclusionTextureInfo'],
    ['emissive', 'getEmissiveTexture', 'getEmissiveTextureInfo']];
  const snapshot = { name: material.getName(), alpha: material.getAlpha(), alphaCutoff: material.getAlphaCutoff(),
    alphaMode: material.getAlphaMode(), baseColorFactor: material.getBaseColorFactor(),
    emissiveFactor: material.getEmissiveFactor(), metallicFactor: material.getMetallicFactor(),
    roughnessFactor: material.getRoughnessFactor(), normalScale: material.getNormalScale(),
    occlusionStrength: material.getOcclusionStrength(), doubleSided: material.getDoubleSided(),
    textures: Object.fromEntries(textureSlots.map(([name, textureMethod, infoMethod]) =>
      [name, textureSnapshot(material[textureMethod](), material[infoMethod]())])) };
  assertFiniteNumbers(snapshot, `material ${material.getName() || '(unnamed)'}`);
  return snapshot;
}

function rawSameIndexDifference(baselinePrimitive, candidatePrimitive) {
  const baselineUvs = baselinePrimitive.getAttribute('TEXCOORD_0').getArray();
  const candidateUvs = candidatePrimitive.getAttribute('TEXCOORD_0').getArray();
  const baselineNormals = baselinePrimitive.getAttribute('NORMAL').getArray();
  const candidateNormals = candidatePrimitive.getAttribute('NORMAL').getArray();
  let maximumNormalDirectionDifference = 0;
  for (let vertex = 0; vertex < baselineNormals.length / 3; vertex += 1) {
    maximumNormalDirectionDifference = Math.max(maximumNormalDirectionDifference,
      vectorAt(baselineNormals, vertex, 3).normalize().distanceTo(vectorAt(candidateNormals, vertex, 3).normalize()));
  }
  return { maximumUvDifference: maximumArrayDifference(baselineUvs, candidateUvs), maximumNormalDirectionDifference };
}

/**
 * Validates that a source clip can reuse baseline (normally Idle) meshes/skins.
 * Throws for incompatible document structure or a failed fixed geometry-level
 * tolerance. Static nonanimated node TRS is intentionally outside this helper's
 * mesh/skin scope and remains a merger-level check.
 */
export function assertAuthoredViewmodelEquivalent(baselineDocument, candidateDocument, label,
  { includeMappings = false, weaponArmatureName = 'Rifle_01_Armature' } = {}) {
  const baselineLabel = 'Idle';
  const candidateLabel = label ?? 'candidate';
  const baselineSkinnedNodes = assertExpectedDocument(baselineDocument, baselineLabel, weaponArmatureName);
  assertExpectedDocument(candidateDocument, candidateLabel, weaponArmatureName);
  verifyHierarchyAndSkin(baselineDocument, candidateDocument, candidateLabel);
  const candidateNodes = orderedNodeMap(candidateDocument);
  const comparisons = [];
  for (const baselineNode of baselineSkinnedNodes) {
    const candidateNode = candidateNodes.get(baselineNode.getName());
    const label = `${candidateLabel}/${baselineNode.getName()}`;
    const rebase = deriveMeshToBaselineRebase(baselineNode, candidateNode, label);
    const baselinePrimitives = baselineNode.getMesh().listPrimitives();
    const candidatePrimitives = candidateNode.getMesh().listPrimitives();
    if (baselinePrimitives.length !== candidatePrimitives.length) throw new Error(`${label}: primitive count differs.`);
    for (let primitiveIndex = 0; primitiveIndex < baselinePrimitives.length; primitiveIndex += 1) {
      const baselinePrimitive = baselinePrimitives[primitiveIndex];
      const candidatePrimitive = candidatePrimitives[primitiveIndex];
      assertCompatiblePrimitiveShape(baselinePrimitive, candidatePrimitive, label);
      const correspondence = findSeamAwareCorrespondence(baselinePrimitive, candidatePrimitive, rebase.matrix);
      if (correspondence.unmatchedVertices !== 0 || correspondence.ambiguousVertices !== 0
        || new Set(correspondence.mapping).size !== correspondence.mapping.length) {
        throw new Error(`${candidateLabel}: seam-aware vertex correspondence is not a bijection at ${baselineNode.getName()} primitive ${primitiveIndex}: ${correspondence.unmatchedVertices} unmatched, ${correspondence.ambiguousVertices} ambiguous vertices.`);
      }
      const rebaseAgreement = verifyRebaseAgreement(candidatePrimitive, rebase);
      const weightedBindSpace = compareWeightedBindSpace(baselinePrimitive, candidatePrimitive, correspondence.mapping,
        baselineNode.getSkin(), candidateNode.getSkin());
      const topology = compareOrientedTopology(baselinePrimitive, candidatePrimitive, correspondence.mapping);
      const baselineMaterial = materialSnapshot(baselinePrimitive.getMaterial());
      const candidateMaterial = materialSnapshot(candidatePrimitive.getMaterial());
      const material = { passes: JSON.stringify(baselineMaterial) === JSON.stringify(candidateMaterial),
        baseline: baselineMaterial, candidate: candidateMaterial };
      const { mapping, ...correspondenceSummary } = correspondence;
      const passes = rebaseAgreement.passes && weightedBindSpace.passes
        && correspondenceSummary.unmatchedVertices === 0 && correspondenceSummary.ambiguousVertices === 0
        && topology.passes && material.passes;
      comparisons.push({ mesh: baselineNode.getName(), primitiveIndex,
        meshToBaselineRebase: { elements: rebase.matrix.elements,
          maximumJointMatrixDifference: rebase.maximumJointMatrixDifference,
          matrixDifferenceIsReportedOnly: true }, rebaseAgreement, weightedBindSpace,
        rawSameIndex: rawSameIndexDifference(baselinePrimitive, candidatePrimitive),
        correspondence: { ...correspondenceSummary,
          mappingVertexCount: mapping.length,
          passes: correspondenceSummary.unmatchedVertices === 0 && correspondenceSummary.ambiguousVertices === 0 },
        topology, material, passes, ...(includeMappings ? { sourceToIdleVertexMapping: mapping } : {}) });
    }
  }
  if (!comparisons.every((comparison) => comparison.passes)) {
    throw new Error(`${candidateLabel}: authored viewmodel geometry/material equivalence failed.`);
  }
  return comparisons;
}
