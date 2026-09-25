import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  createPrimaryFirstPersonModel,
  inspectPrimaryWeaponBudget,
  PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS,
  PRIMARY_WEAPON_DRAW_CALL_BUDGET,
  PRIMARY_WEAPON_KINDS,
  type PrimaryWeaponMaterials,
} from '../app/primary-weapon-models.ts';

function createMaterials(): PrimaryWeaponMaterials {
  return {
    metal: new THREE.MeshStandardMaterial({ color: 0x596467 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x76513a }),
    polymer: new THREE.MeshStandardMaterial({ color: 0x383e3e }),
    accent: new THREE.MeshStandardMaterial({ color: 0x929b9a }),
  };
}

function weaponMeshes(root: THREE.Object3D) {
  const values: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.primaryWeaponGeometry)
      values.push(object);
  });
  return values;
}

function isWithin(object: THREE.Object3D, ancestor: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function meshBounds(meshes: readonly THREE.Mesh[]) {
  const bounds = new THREE.Box3();
  meshes.forEach((mesh) => bounds.expandByObject(mesh));
  return bounds;
}

function projectedWeaponBounds(root: THREE.Object3D, aspect: number) {
  root.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(74, aspect, 0.05, 180);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  weaponMeshes(root).forEach((mesh) => {
    const positions = mesh.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      bounds.expandByPoint(
        new THREE.Vector3()
          .fromBufferAttribute(positions, index)
          .applyMatrix4(mesh.matrixWorld)
          .project(camera),
      );
    }
  });
  return bounds;
}

type PartRange = Readonly<{ name: string; start: number; count: number }>;

function partPointGroups(root: THREE.Object3D, name: string) {
  root.updateMatrixWorld(true);
  const groups: THREE.Vector3[][] = [];
  weaponMeshes(root).forEach((value) => {
    const positions = value.geometry.getAttribute('position');
    const ranges =
      (value.geometry.userData.primaryWeaponPartRanges as
        | readonly PartRange[]
        | undefined) ?? [];
    ranges
      .filter((range) => range.name === name)
      .forEach((range) => {
        const points: THREE.Vector3[] = [];
        for (let offset = 0; offset < range.count; offset += 1) {
          points.push(
            new THREE.Vector3()
              .fromBufferAttribute(positions, range.start + offset)
              .applyMatrix4(value.matrixWorld),
          );
        }
        groups.push(points);
      });
  });
  return groups;
}

void test('primary builders preserve production mounts, effects, and ejection anchors', () => {
  const expected = {
    rifle: {
      muzzle: [0, 0.01, -0.94],
      ejection: [-0.075, 0.045, -0.1],
    },
    smg: {
      muzzle: [0, 0.01, -0.78],
      ejection: [0.095, 0.04, -0.16],
    },
    shotgun: { muzzle: [0, 0.055, -1.22] },
    sniper: { muzzle: [0, 0.035, -1.86] },
  } as const;
  for (const kind of PRIMARY_WEAPON_KINDS.filter(
    (kind) => kind !== 'rifle' && kind !== 'carbine',
  )) {
    const model = createPrimaryFirstPersonModel(kind, {
      materials: createMaterials(),
    });
    const mount = PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS[kind];
    assert.deepEqual(model.root.position.toArray(), mount.position);
    assert.deepEqual(
      [model.root.rotation.x, model.root.rotation.y, model.root.rotation.z],
      mount.rotation,
    );
    assert.equal(model.root.scale.x, mount.scale);
    assert.equal(model.root.visible, false);
    assert.deepEqual(model.muzzle.position.toArray(), expected[kind].muzzle);
    assert.equal(model.muzzle.userData.transient, true);
    assert.equal(model.muzzle.name, 'muzzle-flash');
    if ('ejection' in expected[kind]) {
      assert.ok(model.ejectionAnchor);
      assert.deepEqual(
        model.ejectionAnchor.position.toArray(),
        expected[kind].ejection,
      );
    } else {
      assert.equal(model.ejectionAnchor, undefined);
    }
  }
});

void test('primary mounts expose the firearm flank from the right-hand camera position', () => {
  for (const kind of PRIMARY_WEAPON_KINDS.filter(
    (kind) => kind !== 'rifle' && kind !== 'carbine',
  )) {
    const mount = PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS[kind];
    assert.ok(
      mount.rotation[1] >= 0.1 && mount.rotation[1] <= 0.28,
      `${kind} has a foreshortened rear-facing yaw`,
    );
  }
});

void test('primary mounts keep functional sights in frame and rear furniture clear of the camera', () => {
  for (const kind of PRIMARY_WEAPON_KINDS.filter(
    (kind) => kind !== 'rifle' && kind !== 'carbine',
  )) {
    const model = createPrimaryFirstPersonModel(kind, {
      materials: createMaterials(),
    });
    model.root.updateMatrixWorld(true);
    const worldBounds = meshBounds(weaponMeshes(model.root));
    assert.ok(
      worldBounds.max.z <= -0.32,
      `${kind} stock approaches the camera`,
    );
    for (const { label, aspect, maxWidth } of [
      { label: '16:9', aspect: 16 / 9, maxWidth: 0.32 },
      { label: '4:3', aspect: 4 / 3, maxWidth: 0.4 },
    ]) {
      const projected = projectedWeaponBounds(model.root, aspect);
      const viewportWidth = (projected.max.x - projected.min.x) / 2;
      const viewportHeight = (projected.max.y - projected.min.y) / 2;
      assert.ok(
        projected.min.x >= -1 && projected.max.x <= 1,
        `${kind} extends beyond the ${label} horizontal frame`,
      );
      assert.ok(
        projected.min.y >= -1 && projected.max.y <= 1,
        `${kind} extends beyond the ${label} vertical frame`,
      );
      assert.ok(
        viewportWidth <= maxWidth,
        `${kind} spans too much ${label} viewport width`,
      );
      assert.ok(
        viewportHeight <= 0.5,
        `${kind} spans too much ${label} viewport height`,
      );
    }
  }
});

void test('primary geometry is consolidated before arms attach and stays bounded', () => {
  for (const kind of PRIMARY_WEAPON_KINDS.filter(
    (kind) => kind !== 'rifle' && kind !== 'carbine',
  )) {
    let meshesAtAttach = 0;
    const model = createPrimaryFirstPersonModel(kind, {
      materials: createMaterials(),
      attachViewmodelArms: (root, attachedKind) => {
        assert.equal(attachedKind, kind);
        meshesAtAttach = weaponMeshes(root).length;
        const arm = new THREE.Group();
        arm.userData.viewmodelArm = true;
        root.add(arm);
      },
    });
    const budget = inspectPrimaryWeaponBudget(model.root, kind);
    assert.ok(meshesAtAttach > 0);
    assert.ok(meshesAtAttach <= PRIMARY_WEAPON_DRAW_CALL_BUDGET);
    assert.equal(budget.weaponDraws, meshesAtAttach);
    assert.equal(
      budget.drawBudget,
      kind === 'shotgun' ? 6 : kind === 'sniper' ? 5 : 4,
    );
    assert.ok(budget.triangles >= 600);
    assert.ok(budget.triangles <= budget.triangleBudget);
    assert.equal(budget.withinBudget, true);
    assert.equal(
      model.root.children.some((child) => child.userData.viewmodelArm),
      true,
    );
  }
});

void test('shotgun pump and sniper bolt remain independently movable action parts', () => {
  for (const [kind, key] of [
    ['shotgun', 'shotgunPump'],
    ['sniper', 'sniperBolt'],
  ] as const) {
    const model = createPrimaryFirstPersonModel(kind, {
      materials: createMaterials(),
    });
    const part = model.actionParts[key];
    assert.ok(part);
    assert.equal(part.object.parent, model.root);
    assert.equal(part.object.userData.primaryWeaponActionPart, true);
    assert.deepEqual(
      part.object.position.toArray(),
      part.basePosition.toArray(),
    );
    assert.deepEqual(
      [part.object.rotation.x, part.object.rotation.y, part.object.rotation.z],
      [part.baseRotation.x, part.baseRotation.y, part.baseRotation.z],
    );

    const movingMeshes = weaponMeshes(part.object);
    const staticMeshes = weaponMeshes(model.root).filter(
      (mesh) => !isWithin(mesh, part.object),
    );
    assert.equal(movingMeshes.length, kind === 'shotgun' ? 2 : 1);
    assert.ok(staticMeshes.length >= 3);
    model.root.updateMatrixWorld(true);
    const staticBefore = meshBounds(staticMeshes);
    const movingCenterBefore = meshBounds(movingMeshes).getCenter(
      new THREE.Vector3(),
    );

    part.object.position.z += 0.15;
    model.root.updateMatrixWorld(true);
    const staticAfter = meshBounds(staticMeshes);
    const movingCenterAfter = meshBounds(movingMeshes).getCenter(
      new THREE.Vector3(),
    );
    assert.ok(staticBefore.min.distanceTo(staticAfter.min) < 1e-9);
    assert.ok(staticBefore.max.distanceTo(staticAfter.max) < 1e-9);
    assert.ok(
      movingCenterBefore.distanceTo(movingCenterAfter) >
        model.root.scale.x * 0.14,
    );
    assert.deepEqual(
      part.basePosition.toArray(),
      kind === 'shotgun' ? [0, -0.04, -0.56] : [-0.12, 0.04, -0.02],
    );
  }
});

void test('all primary muzzles contain recessed dark bore geometry at the flash plane', () => {
  for (const kind of PRIMARY_WEAPON_KINDS.filter(
    (kind) => kind !== 'rifle' && kind !== 'carbine',
  )) {
    const materials = createMaterials();
    const model = createPrimaryFirstPersonModel(kind, { materials });
    model.root.updateMatrixWorld(true);
    const boreGroups = partPointGroups(model.root, 'muzzle-bore');
    const crownGroups = partPointGroups(model.root, 'muzzle-crown');
    assert.equal(boreGroups.length, 1);
    assert.equal(crownGroups.length, 1);
    const muzzleWorld = model.muzzle.getWorldPosition(new THREE.Vector3());
    const forward = new THREE.Vector3(0, 0, -1).transformDirection(
      model.root.matrixWorld,
    );
    const axial = (point: THREE.Vector3) =>
      point.clone().sub(muzzleWorld).dot(forward);
    const radial = (point: THREE.Vector3) => {
      const offset = point.clone().sub(muzzleWorld);
      return offset.addScaledVector(forward, -offset.dot(forward)).length();
    };
    const boreAxial = boreGroups[0].map(axial);
    const crownAxial = crownGroups[0].map(axial);
    const boreRadius = Math.max(...boreGroups[0].map(radial));
    const crownRadius = Math.max(...crownGroups[0].map(radial));

    // Both measurements are in mounted world space. The dark inner face must
    // sit behind the crown and be materially narrower than the outer ring.
    assert.ok(
      Math.max(...boreAxial) < Math.min(...crownAxial),
      `${kind} bore is not recessed behind its crown`,
    );
    assert.ok(Math.max(...boreAxial) < -0.006);
    assert.ok(Math.max(...crownAxial) > 0);
    assert.ok(boreRadius < crownRadius * 0.65);
  }
});

void test('primary silhouettes remain distinct and include layered side details', () => {
  const silhouettes = new Set<string>();
  for (const kind of PRIMARY_WEAPON_KINDS.filter(
    (kind) => kind !== 'rifle' && kind !== 'carbine',
  )) {
    const materials = createMaterials();
    const model = createPrimaryFirstPersonModel(kind, { materials });
    model.root.updateMatrixWorld(true);
    const size = new THREE.Box3()
      .setFromObject(model.root)
      .getSize(new THREE.Vector3());
    silhouettes.add(
      size
        .toArray()
        .map((value) => value.toFixed(3))
        .join(','),
    );
    const meshes = weaponMeshes(model.root);
    assert.ok(meshes.length >= 3);
    const accent = meshes
      .filter((value) => value.material === materials.accent)
      .toSorted((left, right) => {
        const leftSize = new THREE.Box3()
          .setFromObject(left)
          .getSize(new THREE.Vector3());
        const rightSize = new THREE.Box3()
          .setFromObject(right)
          .getSize(new THREE.Vector3());
        return rightSize.z - leftSize.z;
      })[0];
    assert.ok(accent);
    const accentBounds = new THREE.Box3().setFromObject(accent);
    assert.ok(accentBounds.max.z - accentBounds.min.z > size.z * 0.25);
    assert.ok(accentBounds.max.y - accentBounds.min.y > size.y * 0.2);
    assert.equal(partPointGroups(model.root, 'receiver-inset-left').length, 1);
    assert.equal(partPointGroups(model.root, 'receiver-inset-right').length, 1);
    assert.equal(partPointGroups(model.root, 'receiver-pin-left').length, 2);
    assert.equal(partPointGroups(model.root, 'receiver-pin-right').length, 2);
  }
  assert.equal(silhouettes.size, PRIMARY_WEAPON_KINDS.length - 2);
});

void test('primary muzzle factory supplies the live gameplay light unchanged', () => {
  for (const kind of PRIMARY_WEAPON_KINDS.filter(
    (kind) => kind !== 'rifle' && kind !== 'carbine',
  )) {
    const light = new THREE.PointLight(0xffaa55, 3, 2);
    const model = createPrimaryFirstPersonModel(kind, {
      materials: createMaterials(),
      createMuzzleFlash: (requestedKind) => {
        assert.equal(requestedKind, kind);
        return light;
      },
    });
    assert.equal(model.muzzle, light);
    assert.equal(light.parent, model.root);
  }
});
