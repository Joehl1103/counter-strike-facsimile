import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { inspectVisibleGeometryLoad } from './graphics-budget.ts';
import type { PrimaryWeaponKind } from './primary-weapon-models.ts';

export const PRIMARY_WORLD_WEAPON_DRAW_LIMITS: Readonly<
  Record<PrimaryWeaponKind, number>
> = Object.freeze({
  rifle: 3,
  carbine: 3,
  smg: 3,
  shotgun: 3,
  // The scope lens has its own response in addition to dark steel, wood,
  // polymer, and accent buckets.
  sniper: 5,
});

export type WorldFirearmBatchResult = Readonly<{
  sourceDrawProxies: number;
  batchedDrawProxies: number;
  triangles: number;
  drawProxiesRemoved: number;
}>;

const NO_RAYCAST: THREE.Object3D['raycast'] = () => undefined;

type BatchCandidate = Readonly<{
  mesh: THREE.Mesh;
  material: THREE.Material;
}>;

/**
 * Consolidate rigid visual parts inside one movable world-weapon root.
 *
 * The root can still follow a hand socket or become a dropped pickup. Only its
 * child geometry is static relative to that root; collision, pickup, muzzle,
 * and weapon authority remain outside this helper.
 */
export function batchPrimaryWorldFirearmVisuals(
  root: THREE.Group,
  kind: PrimaryWeaponKind,
): WorldFirearmBatchResult {
  root.updateMatrixWorld(true);
  const groups = new Map<string, BatchCandidate[]>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.userData.visualOnly = true;
    object.userData.staticVisualBatch = true;
    object.raycast = NO_RAYCAST;
    if (
      object.children.length > 0 ||
      Array.isArray(object.material) ||
      object.material.transparent
    )
      return;
    const key = [
      object.material.uuid,
      object.castShadow ? 1 : 0,
      object.receiveShadow ? 1 : 0,
      object.renderOrder,
      object.layers.mask,
      object.frustumCulled ? 1 : 0,
    ].join(':');
    const candidates = groups.get(key) ?? [];
    candidates.push({ mesh: object, material: object.material });
    groups.set(key, candidates);
  });

  const before = inspectVisibleGeometryLoad(root);
  const rootInverse = root.matrixWorld.clone().invert();
  const removedGeometries = new Set<THREE.BufferGeometry>();
  groups.forEach((candidates) => {
    if (candidates.length < 2) return;
    const transformed = candidates.map(({ mesh }) => {
      // Weapon primitives mix indexed and non-indexed geometry. Normalizing
      // them keeps a single material bucket without changing triangle count.
      const geometry = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry.clone();
      geometry.applyMatrix4(rootInverse.clone().multiply(mesh.matrixWorld));
      return geometry;
    });
    const geometry = mergeGeometries(transformed, false);
    transformed.forEach((candidate) => candidate.dispose());
    if (!geometry)
      throw new Error(`Unable to consolidate ${kind} world firearm geometry.`);

    const exemplar = candidates[0].mesh;
    const batch = new THREE.Mesh(geometry, candidates[0].material);
    batch.name = `${kind}-world-material-batch`;
    batch.castShadow = exemplar.castShadow;
    batch.receiveShadow = exemplar.receiveShadow;
    batch.renderOrder = exemplar.renderOrder;
    batch.layers.mask = exemplar.layers.mask;
    batch.frustumCulled = exemplar.frustumCulled;
    batch.userData.visualOnly = true;
    batch.userData.staticVisualBatch = true;
    batch.userData.sourceMeshCount = candidates.length;
    batch.raycast = NO_RAYCAST;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    candidates.forEach(({ mesh }) => {
      removedGeometries.add(mesh.geometry);
      mesh.parent?.remove(mesh);
    });
    root.add(batch);
  });

  const retainedGeometries = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) retainedGeometries.add(object.geometry);
  });
  removedGeometries.forEach((geometry) => {
    if (!retainedGeometries.has(geometry)) geometry.dispose();
  });
  const after = inspectVisibleGeometryLoad(root);
  if (after.visibleTriangles !== before.visibleTriangles) {
    throw new Error(`${kind} world firearm batching changed triangle count.`);
  }
  const drawLimit = PRIMARY_WORLD_WEAPON_DRAW_LIMITS[kind];
  if (after.visibleDrawProxies > drawLimit) {
    throw new Error(
      `${kind} world firearm uses ${after.visibleDrawProxies} draws; expected at most ${drawLimit}.`,
    );
  }
  root.userData.worldFirearmBatching = {
    sourceDrawProxies: before.visibleDrawProxies,
    batchedDrawProxies: after.visibleDrawProxies,
  };
  return Object.freeze({
    sourceDrawProxies: before.visibleDrawProxies,
    batchedDrawProxies: after.visibleDrawProxies,
    triangles: after.visibleTriangles,
    drawProxiesRemoved: before.visibleDrawProxies - after.visibleDrawProxies,
  });
}

export function projectedPrimaryWorldDrawProxies(
  kinds: readonly PrimaryWeaponKind[],
) {
  return kinds.reduce(
    (sum, kind) => sum + PRIMARY_WORLD_WEAPON_DRAW_LIMITS[kind],
    0,
  );
}
