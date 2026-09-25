import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
  batchPrimaryWorldFirearmVisuals,
  PRIMARY_WORLD_WEAPON_DRAW_LIMITS,
  projectedPrimaryWorldDrawProxies,
} from '../app/world-firearm-batching.ts';
import {
  createPrimaryWorldModel,
  type PrimaryWeaponKind,
} from '../app/primary-weapon-models.ts';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
const protocolSource = readFileSync(
  new URL('../QA_PROTOCOL.md', import.meta.url),
  'utf8',
);

const PART_MATERIALS: Readonly<Record<PrimaryWeaponKind, readonly string[]>> = {
  rifle: ['dark', 'dark', 'wood', 'polymer', 'dark', 'wood', 'dark'],
  carbine: ['dark', 'dark', 'polymer', 'polymer', 'dark', 'polymer', 'accent'],
  smg: ['dark', 'dark', 'polymer', 'polymer', 'dark', 'accent', 'accent'],
  shotgun: [
    'dark',
    'dark',
    'wood',
    'polymer',
    'dark',
    'wood',
    'polymer',
    'polymer',
    'polymer',
    'polymer',
  ],
  sniper: [
    'dark',
    'dark',
    'wood',
    'polymer',
    'dark',
    'dark',
    'accent',
    'accent',
    'lens',
  ],
};

function createRepresentativeWorldWeapon(kind: PrimaryWeaponKind) {
  const root = new THREE.Group();
  root.rotation.set(0.18, 0, Math.PI / 2);
  root.scale.setScalar(0.72);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  PART_MATERIALS[kind].forEach((bucket, index) => {
    let material = materials.get(bucket);
    if (!material) {
      material = new THREE.MeshStandardMaterial();
      materials.set(bucket, material);
    }
    const indexed = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const geometry = index % 2 === 0 ? indexed : indexed.toNonIndexed();
    if (geometry !== indexed) indexed.dispose();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(index * 0.17, (index % 2) * 0.08, -index * 0.11);
    mesh.rotation.set(index * 0.01, index * 0.02, index * -0.015);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.name = 'muzzle-anchor';
  root.add(muzzleAnchor);
  return root;
}

void test('primary world parts consolidate by owned material without changing bounds or triangles', () => {
  for (const kind of Object.keys(
    PRIMARY_WORLD_WEAPON_DRAW_LIMITS,
  ) as PrimaryWeaponKind[]) {
    const root = createRepresentativeWorldWeapon(kind);
    root.updateMatrixWorld(true);
    const beforeBounds = new THREE.Box3().setFromObject(root, true);
    const result = batchPrimaryWorldFirearmVisuals(root, kind);
    root.updateMatrixWorld(true);
    const afterBounds = new THREE.Box3().setFromObject(root, true);

    assert.equal(result.sourceDrawProxies, PART_MATERIALS[kind].length);
    assert.equal(
      result.batchedDrawProxies,
      PRIMARY_WORLD_WEAPON_DRAW_LIMITS[kind],
    );
    assert.ok(result.drawProxiesRemoved > 0);
    assert.ok(result.triangles > 0);
    assert.ok(beforeBounds.min.distanceTo(afterBounds.min) < 1e-6);
    assert.ok(beforeBounds.max.distanceTo(afterBounds.max) < 1e-6);
    assert.equal(root.getObjectByName('muzzle-anchor')?.parent, root);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      assert.equal(object.castShadow, true);
      assert.equal(object.receiveShadow, true);
      assert.equal(object.userData.visualOnly, true);
      assert.equal(object.raycast(new THREE.Raycaster(), []), undefined);
    });
  }
});

void test('round-two active weapons and six worst-case drops fit the unchanged draw ceiling', () => {
  const activeRoundTwoWeapons: readonly PrimaryWeaponKind[] = [
    'smg',
    'shotgun',
    'sniper',
    'rifle',
    'smg',
    'shotgun',
    'smg',
    'shotgun',
  ];
  const activeWeaponDraws = projectedPrimaryWorldDrawProxies(
    activeRoundTwoWeapons,
  );
  assert.equal(activeWeaponDraws, 26);

  // The observed clean round-two scene has 93 non-primary proxies. Dropped
  // firearms are capped at enemies.length + 2 = 6 in the production graph.
  const projectedRoundPreparedDraws = 93 + activeWeaponDraws;
  const sixWorstCaseDrops = 6 * PRIMARY_WORLD_WEAPON_DRAW_LIMITS.sniper;
  assert.equal(projectedRoundPreparedDraws, 119);
  assert.equal(projectedRoundPreparedDraws + sixWorstCaseDrops, 149);
  assert.ok(projectedRoundPreparedDraws + sixWorstCaseDrops <= 150);
});

void test('production primary world factory uses one owned palette and batches before return', () => {
  const factory = pageSource.slice(
    pageSource.indexOf('const createWorldFirearmModel ='),
    pageSource.indexOf(
      'const hitMeshes:',
      pageSource.indexOf('const createWorldFirearmModel ='),
    ),
  );
  for (const role of ['metal', 'wood', 'polymer'])
    assert.ok(factory.includes(`worldFirearmMaterials.${role}.clone()`));
  assert.match(factory, /createPrimaryWorldModel\(kind, materials\)/);
  assert.doesNotMatch(
    factory,
    /(?:rifleDark|rifleWood|riflePolymer|gunHighlight)\.clone\(\)/,
  );
  assert.match(
    factory,
    /batchPrimaryWorldFirearmVisuals\(root, kind\);\s*return root;/,
  );
});

void test('QA requires truthful start and automatic round-preparation budgets', () => {
  assert.match(
    protocolSource,
    /snapshot\.reason: "play-start"[\s\S]*snapshot\.reason: "round-prepared"/,
  );
  assert.match(
    protocolSource,
    /withinThresholds: true`, `snapshot\.reason: "round-prepared"`, the prepared `weaponAtSnapshot`, `viewmodelVisibleAtSnapshot: true/,
  );
  assert.match(protocolSource, /nonzero viewmodel fields/);
});

void test('actual shared primary world silhouettes fit draw limits and preserve the M4 silencer socket', () => {
  for (const kind of Object.keys(
    PRIMARY_WORLD_WEAPON_DRAW_LIMITS,
  ) as PrimaryWeaponKind[]) {
    const metal = new THREE.MeshStandardMaterial();
    const model = createPrimaryWorldModel(kind, {
      metal,
      wood: new THREE.MeshStandardMaterial(),
      polymer: new THREE.MeshStandardMaterial(),
      accent: kind === 'sniper' ? new THREE.MeshStandardMaterial() : metal,
    });
    const report = batchPrimaryWorldFirearmVisuals(model, kind);
    assert.ok(
      report.batchedDrawProxies <= PRIMARY_WORLD_WEAPON_DRAW_LIMITS[kind],
    );
    assert.ok(report.triangles > 0 && report.triangles <= 3800);
    if (kind === 'carbine') {
      assert.ok(model.userData.silencerSocket instanceof THREE.Vector3);
      assert.ok(Math.abs(model.userData.silencerSocket.z + 0.91 * 1.1) < 1e-8);
    }
    model.traverse((object) =>
      assert.equal(object instanceof THREE.Light, false),
    );
  }
});
