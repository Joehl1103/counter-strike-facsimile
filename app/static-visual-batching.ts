import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type StaticVisualBatchResult = Readonly<{
  sourceMeshes: number;
  batchedMeshes: number;
  drawProxiesRemoved: number;
}>;

type StaticBatchCandidate = Readonly<{
  mesh: THREE.Mesh;
  scope: THREE.Object3D;
}>;

function geometrySignature(geometry: THREE.BufferGeometry) {
  const attributes = Object.entries(geometry.attributes)
    .map(([name, attribute]) =>
      [
        name,
        attribute.itemSize,
        attribute.normalized ? 1 : 0,
        attribute.array.constructor.name,
      ].join(':'),
    )
    .sort()
    .join('|');
  return `${geometry.index ? 'indexed' : 'plain'}|${attributes}`;
}

/**
 * Merge only explicitly tagged, static, visual-only meshes. Material identity
 * and render state form the batch key so transparency and shadow behavior are
 * preserved. Dynamic, instanced, skinned and morph-target meshes are skipped.
 */
export function batchStaticVisualMeshes(
  root: THREE.Object3D,
): StaticVisualBatchResult {
  root.updateMatrixWorld(true);
  const groups = new Map<string, StaticBatchCandidate[]>();

  const visit = (object: THREE.Object3D, ancestorsVisible: boolean) => {
    // Root visibility is preserved because every batch remains below root.
    // Hidden descendants are skipped because lifting them to a wider scope
    // would change their effective visibility.
    const visible = object === root ? true : ancestorsVisible && object.visible;
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      object instanceof THREE.SkinnedMesh ||
      object.userData.visualOnly !== true ||
      object.userData.staticVisualBatch !== true ||
      !visible ||
      object.children.length > 0 ||
      Array.isArray(object.material) ||
      object.material.transparent ||
      Object.keys(object.morphTargetDictionary ?? {}).length > 0
    ) {
      object.children.forEach((child) => visit(child, visible));
      return;
    }
    const requestedScope = object.userData.staticVisualBatchScope;
    let requestedAncestor: THREE.Object3D | null = null;
    if (typeof requestedScope === 'string') {
      for (let ancestor = object.parent; ancestor; ancestor = ancestor.parent) {
        if (ancestor.uuid === requestedScope) {
          requestedAncestor = ancestor;
          break;
        }
      }
    }
    const scope = requestedAncestor ?? object.parent;
    if (!scope) return;
    const key = [
      scope.uuid,
      object.material.uuid,
      geometrySignature(object.geometry),
      object.castShadow ? 1 : 0,
      object.receiveShadow ? 1 : 0,
      object.renderOrder,
      object.layers.mask,
      object.frustumCulled ? 1 : 0,
    ].join(':');
    const candidates = groups.get(key) ?? [];
    candidates.push({ mesh: object, scope });
    groups.set(key, candidates);
    object.children.forEach((child) => visit(child, visible));
  };
  visit(root, true);

  let sourceMeshes = 0;
  let batchedMeshes = 0;
  const removedGeometries = new Set<THREE.BufferGeometry>();
  groups.forEach((candidates) => {
    if (candidates.length < 2) return;
    const scope = candidates[0].scope;
    const scopeInverse = scope.matrixWorld.clone().invert();
    const transformed = candidates.map(({ mesh }) => {
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(scopeInverse.clone().multiply(mesh.matrixWorld));
      return geometry;
    });
    const geometry = mergeGeometries(transformed, false);
    transformed.forEach((candidate) => candidate.dispose());
    if (!geometry) return;

    const exemplar = candidates[0].mesh;
    const batch = new THREE.Mesh(geometry, exemplar.material);
    batch.name = `static-visual-batch-${batchedMeshes + 1}`;
    batch.castShadow = exemplar.castShadow;
    batch.receiveShadow = exemplar.receiveShadow;
    batch.renderOrder = exemplar.renderOrder;
    batch.layers.mask = exemplar.layers.mask;
    batch.frustumCulled = exemplar.frustumCulled;
    batch.userData.visualOnly = true;
    batch.userData.staticVisualBatch = true;
    batch.userData.sourceMeshCount = candidates.length;
    batch.raycast = () => undefined;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    candidates.forEach(({ mesh }) => {
      removedGeometries.add(mesh.geometry);
      mesh.parent?.remove(mesh);
    });
    scope.add(batch);
    sourceMeshes += candidates.length;
    batchedMeshes += 1;
  });

  // Removed source meshes no longer participate in scene teardown. Release
  // their geometry now, except when a retained mesh anywhere in the same scene
  // still shares it.
  let traversalRoot = root;
  while (traversalRoot.parent) traversalRoot = traversalRoot.parent;
  const retainedGeometries = new Set<THREE.BufferGeometry>();
  traversalRoot.traverse((object) => {
    if (object instanceof THREE.Mesh) retainedGeometries.add(object.geometry);
  });
  removedGeometries.forEach((geometry) => {
    if (!retainedGeometries.has(geometry)) geometry.dispose();
  });

  return Object.freeze({
    sourceMeshes,
    batchedMeshes,
    drawProxiesRemoved: sourceMeshes - batchedMeshes,
  });
}
