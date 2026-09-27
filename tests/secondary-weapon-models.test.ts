import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  type SecondaryWeaponKind,
} from '../app/game-rules.ts';
import {
  createSecondaryFirstPersonModel,
  createSecondaryWorldModel,
  ELITE_WEAPON_DRAW_CALL_BUDGET,
  ELITE_WEAPON_TRIANGLE_BUDGET,
  PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS,
  SECONDARY_WEAPON_DRAW_CALL_BUDGET,
  SECONDARY_WEAPON_TRIANGLE_BUDGET,
  SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS,
  SECONDARY_VIEWMODEL_VIEWPORT_LIMITS,
  inspectSecondaryWeaponBudget,
} from '../app/secondary-weapon-models.ts';
import {
  clipViewmodelNdcBounds,
  createViewmodelArmGeometries,
  VIEWMODEL_ARM_POSES,
} from '../app/viewmodel-visuals.ts';
import {
  applySecondaryReloadActionParts,
  resetSecondaryReloadActionParts,
} from '../app/viewmodel-reload-visuals.ts';

function bounds(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
}

function assertFiniteTransforms(root: THREE.Object3D) {
  root.traverse((object) => {
    assert.ok(object.position.toArray().every(Number.isFinite));
    assert.ok(
      [object.rotation.x, object.rotation.y, object.rotation.z].every(
        Number.isFinite,
      ),
    );
    assert.ok(object.scale.toArray().every(Number.isFinite));
  });
}

function materials(root: THREE.Object3D) {
  const values: THREE.Material[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (Array.isArray(object.material)) values.push(...object.material);
    else values.push(object.material);
  });
  return values;
}

type PartRange = Readonly<{ name: string; start: number; count: number }>;
type PartPointGroup = Readonly<{
  name: string;
  material: THREE.Material;
  points: readonly THREE.Vector3[];
}>;

function partPointGroups(
  root: THREE.Object3D,
  include: (name: string) => boolean,
) {
  root.updateMatrixWorld(true);
  const groups: PartPointGroup[] = [];
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !object.userData.secondaryWeaponGeometry
    )
      return;
    const positions = object.geometry.getAttribute('position');
    const ranges =
      (object.geometry.userData.secondaryWeaponPartRanges as
        | readonly PartRange[]
        | undefined) ?? [];
    ranges
      .filter((range) => include(range.name))
      .forEach((range) => {
        const points: THREE.Vector3[] = [];
        for (let offset = 0; offset < range.count; offset += 1) {
          points.push(
            new THREE.Vector3()
              .fromBufferAttribute(positions, range.start + offset)
              .applyMatrix4(object.matrixWorld),
          );
        }
        groups.push({
          name: range.name,
          material: Array.isArray(object.material)
            ? object.material[0]
            : object.material,
          points,
        });
      });
  });
  return groups;
}

function pointBounds(points: readonly THREE.Vector3[]) {
  return new THREE.Box3().setFromPoints([...points]);
}

function projectedViewportBounds(root: THREE.Object3D, visibleOnly = false) {
  root.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(74, 1024 / 768, 0.05, 180);
  const points: THREE.Vector3[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    const indices = object.geometry.index;
    const count = indices?.count ?? positions.count;
    for (let triangle = 0; triangle < count; triangle += 3) {
      let polygon = [0, 1, 2].map((corner) =>
        new THREE.Vector3()
          .fromBufferAttribute(
            positions,
            indices ? indices.getX(triangle + corner) : triangle + corner,
          )
          .applyMatrix4(object.matrixWorld)
          .project(camera),
      );
      if (visibleOnly) {
        // Clip actual triangles, not the corners of a world-space bounding box.
        // Off-screen elbows otherwise inflate the reported visible gun width.
        for (const axis of ['x', 'y', 'z'] as const) {
          for (const sign of [-1, 1]) {
            const clipped: THREE.Vector3[] = [];
            polygon.forEach((current, index) => {
              const previous =
                polygon[(index + polygon.length - 1) % polygon.length];
              const previousDistance = 1 - previous[axis] * sign;
              const currentDistance = 1 - current[axis] * sign;
              if (currentDistance >= 0 !== previousDistance >= 0) {
                clipped.push(
                  previous
                    .clone()
                    .lerp(
                      current,
                      previousDistance / (previousDistance - currentDistance),
                    ),
                );
              }
              if (currentDistance >= 0) clipped.push(current);
            });
            polygon = clipped;
          }
        }
      }
      points.push(...polygon);
    }
  });
  assert.ok(points.length > 0, 'viewmodel must have visible geometry');
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

void test('all classic secondary builders expose distinct, usable silhouettes', () => {
  const silhouettes = new Set<string>();
  const expectedEliteAnchors = 2;
  for (const kind of PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS) {
    let attached: SecondaryWeaponKind | null = null;
    const firstPerson = createSecondaryFirstPersonModel(kind, {
      attachViewmodelArms: (_root, attachedKind) => {
        attached = attachedKind;
      },
    });
    const world = createSecondaryWorldModel(kind);
    const firstSize = bounds(firstPerson.root);
    const worldSize = bounds(world);

    assert.equal(attached, kind);
    assert.equal(firstPerson.root.visible, false);
    assert.equal(firstPerson.muzzle.name, 'muzzle-flash');
    assert.equal(firstPerson.muzzle.intensity, 0);
    firstPerson.muzzles.forEach((muzzle) =>
      assert.equal(muzzle.userData.transient, true),
    );
    assert.equal(
      firstPerson.muzzles.length,
      kind === 'elite' ? expectedEliteAnchors : 1,
    );
    assert.equal(
      firstPerson.ejectionAnchors.length,
      kind === 'elite' ? expectedEliteAnchors : 1,
    );
    firstPerson.ejectionAnchors.forEach((anchor) =>
      assert.equal(anchor.name, 'ejection-anchor'),
    );
    assert.ok(
      inspectSecondaryWeaponBudget(firstPerson.root, kind).withinBudget,
    );
    assert.ok(inspectSecondaryWeaponBudget(world, kind).withinBudget);
    [firstSize, worldSize].forEach((size) => {
      assert.ok(size.x > 0 && size.y > 0 && size.z > 0);
      assert.ok([size.x, size.y, size.z].every(Number.isFinite));
    });
    assertFiniteTransforms(firstPerson.root);
    assertFiniteTransforms(world);
    silhouettes.add(
      [firstSize.x, firstSize.y, firstSize.z]
        .map((value) => value.toFixed(3))
        .join(','),
    );
  }
  // Compact P228, blocky Glock, long Five-Seven/USP, heavy Deagle, and the
  // paired Elite assembly must not collapse to one generic pistol mesh.
  assert.ok(silhouettes.size >= 5);
});

void test('the live world Glock remains drawable after retiring only its procedural first-person route', () => {
  const world = createSecondaryWorldModel('glock18');
  const worldSize = bounds(world);
  assert.ok(inspectSecondaryWeaponBudget(world, 'glock18').withinBudget);
  assert.ok(worldSize.x > 0 && worldSize.y > 0 && worldSize.z > 0);
  assert.ok([worldSize.x, worldSize.y, worldSize.z].every(Number.isFinite));
  assertFiniteTransforms(world);
  world.traverse((object) => {
    if (object === world) return;
    assert.equal(object.userData.secondaryWeaponKind, 'glock18');
  });
});

void test('classic pistols carry readable side, grip, and muzzle geometry', () => {
  for (const kind of PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS) {
    const model = createSecondaryFirstPersonModel(kind);
    const weaponMeshes: THREE.Mesh[] = [];
    model.root.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.userData.secondaryWeaponGeometry
      )
        weaponMeshes.push(object);
    });
    assert.equal(weaponMeshes.length, kind === 'elite' ? 5 : 4);
    const byLightness = weaponMeshes
      .filter((mesh) => !mesh.userData.secondaryReloadMagazine)
      .toSorted((a, b) => {
        const aMaterial = a.material as THREE.MeshStandardMaterial;
        const bMaterial = b.material as THREE.MeshStandardMaterial;
        return (
          aMaterial.color.getHSL({ h: 0, s: 0, l: 0 }).l -
          bMaterial.color.getHSL({ h: 0, s: 0, l: 0 }).l
        );
      });
    const steelBounds = new THREE.Box3().setFromObject(byLightness[1]);
    const detailBounds = new THREE.Box3().setFromObject(byLightness[2]);
    const weaponBounds = new THREE.Box3().setFromObject(model.root);
    const weaponLength = weaponBounds.max.z - weaponBounds.min.z;

    // Steel spans both the receiver and the short, subdued grip panels. The
    // light bucket stays on controls, crowns, and sights instead of forming a
    // pale full-height stripe down the grip.
    assert.ok(steelBounds.max.z - steelBounds.min.z >= weaponLength * 0.55);
    assert.ok(detailBounds.max.z - detailBounds.min.z >= weaponLength * 0.45);
    const gripPanels = partPointGroups(model.root, (name) =>
      name.startsWith('grip-panel-'),
    );
    assert.ok(gripPanels.length >= 2);
    const brightestLightness = (
      byLightness[2].material as THREE.MeshStandardMaterial
    ).color.getHSL({ h: 0, s: 0, l: 0 }).l;
    gripPanels.forEach((panel) => {
      const panelLightness = (
        panel.material as THREE.MeshStandardMaterial
      ).color.getHSL({ h: 0, s: 0, l: 0 }).l;
      assert.ok(panelLightness < brightestLightness * 0.75);
    });
    assert.ok(detailBounds.max.y > 0.052, `${kind} has no slide-top detail`);
    assert.ok(
      Math.abs(SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS[kind].rotation[1]) >=
        0.13,
      `${kind} mount does not reveal its detailed side profile`,
    );
  }
});

void test('secondary slides are chamfered and their compact sights remain seated', () => {
  for (const kind of [
    'usp',
    'p228',
    'deagle',
    'fiveseven',
  ] as const) {
    const model = createSecondaryFirstPersonModel(kind);
    const slideParts = partPointGroups(
      model.root,
      (name) => name.endsWith('-slide') || name === 'compact-slide',
    );
    assert.equal(slideParts.length, 1);
    const slideBounds = pointBounds(slideParts[0].points);
    const slideSize = slideBounds.getSize(new THREE.Vector3());
    const topPoints = slideParts[0].points.filter(
      (point) => point.y >= slideBounds.max.y - slideSize.y * 0.02,
    );
    assert.ok(topPoints.length > 0);
    const centerX = (slideBounds.min.x + slideBounds.max.x) / 2;
    assert.ok(
      Math.max(...topPoints.map((point) => Math.abs(point.x - centerX))) <
        slideSize.x * 0.42,
      `${kind} slide has an unchamfered box top`,
    );
    assert.ok(
      Math.min(...topPoints.map((point) => point.z)) >
        slideBounds.min.z + slideSize.z * 0.035,
      `${kind} slide has no sloped muzzle face`,
    );

    const sights = partPointGroups(
      model.root,
      (name) => name === 'front-sight' || name === 'rear-sight',
    );
    assert.equal(sights.length, 2);
    sights.forEach((sight) => {
      const sightBounds = pointBounds(sight.points);
      const sightHeight = sightBounds.max.y - sightBounds.min.y;
      assert.ok(sightHeight <= slideSize.y * 0.14);
      assert.ok(sightBounds.min.y <= slideBounds.max.y + 0.001);
      assert.ok(sightBounds.min.y >= slideBounds.max.y - 0.001);
    });
  }
});

void test('secondary bores are narrower dark faces recessed behind their crowns', () => {
  for (const kind of PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS) {
    const model = createSecondaryFirstPersonModel(kind);
    model.root.updateMatrixWorld(true);
    const bores = partPointGroups(model.root, (name) => name === 'muzzle-bore');
    const crowns = partPointGroups(
      model.root,
      (name) => name === 'muzzle-crown',
    );
    assert.equal(bores.length, model.muzzles.length);
    assert.equal(crowns.length, model.muzzles.length);
    const forward = new THREE.Vector3(0, 0, -1).transformDirection(
      model.root.matrixWorld,
    );
    model.muzzles.forEach((muzzle) => {
      const muzzleWorld = muzzle.getWorldPosition(new THREE.Vector3());
      const center = (points: readonly THREE.Vector3[]) =>
        new THREE.Box3()
          .setFromPoints([...points])
          .getCenter(new THREE.Vector3());
      const bore = bores.toSorted(
        (a, b) =>
          center(a.points).distanceToSquared(muzzleWorld) -
          center(b.points).distanceToSquared(muzzleWorld),
      )[0];
      const crown = crowns.toSorted(
        (a, b) =>
          center(a.points).distanceToSquared(muzzleWorld) -
          center(b.points).distanceToSquared(muzzleWorld),
      )[0];
      const axial = (point: THREE.Vector3) =>
        point.clone().sub(muzzleWorld).dot(forward);
      const radial = (point: THREE.Vector3) => {
        const offset = point.clone().sub(muzzleWorld);
        return offset.addScaledVector(forward, -offset.dot(forward)).length();
      };
      assert.ok(
        Math.max(...bore.points.map(axial)) <
          Math.min(...crown.points.map(axial)),
      );
      assert.ok(
        Math.max(...bore.points.map(radial)) <
          Math.max(...crown.points.map(radial)) * 0.65,
      );
    });
  }
});

void test('secondary muzzle and casing anchors retain their authoritative local positions', () => {
  const anchors = {
    usp: { muzzle: -0.43, ejection: [0.089, -0.14] },
    p228: { muzzle: -0.305, ejection: [0.095, -0.095] },
    deagle: { muzzle: -0.555, ejection: [0.117, -0.12] },
    fiveseven: { muzzle: -0.435, ejection: [0.084, -0.16] },
  } as const;
  for (const kind of Object.keys(anchors) as Array<keyof typeof anchors>) {
    const model = createSecondaryFirstPersonModel(kind);
    model.muzzles[0].position.toArray().forEach((value, index) => {
      const expected = [0, 0.012, anchors[kind].muzzle][index];
      assert.ok(Math.abs(value - expected) < 1e-9);
    });
    assert.equal(model.ejectionAnchors.length, 1);
    model.ejectionAnchors[0].position.toArray().forEach((value, index) => {
      const expected = [
        anchors[kind].ejection[0],
        0.065,
        anchors[kind].ejection[1],
      ][index];
      assert.ok(Math.abs(value - expected) < 1e-9);
    });
  }
});

void test('secondary silhouettes stay within weapon-only triangle and draw budgets', () => {
  for (const kind of PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS) {
    const model = createSecondaryFirstPersonModel(kind);
    const budget = inspectSecondaryWeaponBudget(model.root, kind);
    const triangleBudget =
      kind === 'elite'
        ? ELITE_WEAPON_TRIANGLE_BUDGET
        : SECONDARY_WEAPON_TRIANGLE_BUDGET;
    const drawBudget =
      kind === 'elite'
        ? ELITE_WEAPON_DRAW_CALL_BUDGET
        : SECONDARY_WEAPON_DRAW_CALL_BUDGET;
    assert.ok(budget.triangles <= triangleBudget);
    assert.ok(budget.weaponDraws <= drawBudget);
    assert.ok(budget.materials <= drawBudget);
    assert.equal(budget.withinBudget, true);
    model.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (!object.userData.secondaryWeaponGeometry) return;
      const material = object.material as THREE.MeshStandardMaterial;
      assert.ok(material.metalness <= 0.14);
      assert.ok(
        material.color.getHSL({ h: 0, s: 0, l: 0 }).l >= 0.075,
        `${kind} material is too dark for the shared lighting`,
      );
      if (material.color.getHex() === 0x303633)
        assert.ok(material.metalness >= 0.2);
      assert.ok(material.roughness >= 0.25);
    });
  }
});

void test('compact secondary viewmodels stay inside the deterministic viewport footprint', () => {
  const gloveMaterial = new THREE.MeshBasicMaterial({ color: 0x58736d });
  const sleeveMaterial = new THREE.MeshBasicMaterial({ color: 0x6c7f75 });
  for (const kind of PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS) {
    const mount = SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS[kind];
    const model = createSecondaryFirstPersonModel(kind, {
      attachViewmodelArms: (root, secondaryKind) => {
        VIEWMODEL_ARM_POSES[secondaryKind].forEach((pose) => {
          const geometry = createViewmodelArmGeometries(
            pose.handedness,
            pose.grip,
          );
          const arm = new THREE.Group();
          arm.userData.viewmodelArm = pose.handedness;
          arm.userData.viewmodelGrip = pose.grip;
          arm.add(
            new THREE.Mesh(geometry.glove, gloveMaterial),
            new THREE.Mesh(geometry.sleeve, sleeveMaterial),
          );
          arm.position.set(...pose.position);
          arm.rotation.set(...pose.rotation);
          arm.scale.setScalar(pose.scale);
          root.add(arm);
        });
      },
    });
    model.root.position.set(...mount.position);
    model.root.rotation.set(...mount.rotation);
    const bounds = clipViewmodelNdcBounds(
      projectedViewportBounds(model.root, true),
    );
    const width = (bounds.maxX - bounds.minX) / 2;
    const height = (bounds.maxY - bounds.minY) / 2;
    assert.ok(
      width <= SECONDARY_VIEWMODEL_VIEWPORT_LIMITS.width,
      `${kind} width ${width}`,
    );
    assert.ok(
      height <= SECONDARY_VIEWMODEL_VIEWPORT_LIMITS.height,
      `${kind} height ${height}`,
    );
    // The production mount stays to the lower-right of the center reticle;
    // either separation is sufficient to prevent crosshair overlap.
    assert.ok(bounds.maxY <= -0.02 || bounds.minX >= 0.02);
  }
  gloveMaterial.dispose();
  sleeveMaterial.dispose();
});

void test('compact mounts preserve forward muzzle and side-ejection ordering', () => {
  for (const kind of PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS) {
    const model = createSecondaryFirstPersonModel(kind);
    const muzzleDepths = model.muzzles.map((muzzle) => muzzle.position.z);
    const ejectionDepths = model.ejectionAnchors.map(
      (anchor) => anchor.position.z,
    );
    assert.equal(muzzleDepths.length, ejectionDepths.length);
    muzzleDepths.forEach((depth, index) => {
      assert.ok(depth < ejectionDepths[index]);
    });
    assert.ok(
      model.root.scale.x ===
        SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS[kind].scale,
    );
  }
});

void test('classic secondary palette stays matte while separating body, steel, and highlights', () => {
  const usp = createSecondaryFirstPersonModel('usp');
  const materials = new Set<THREE.Material>();
  usp.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const material = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    materials.add(material);
  });
  const standard = [...materials].filter(
    (material): material is THREE.MeshStandardMaterial =>
      material instanceof THREE.MeshStandardMaterial,
  );
  assert.equal(standard.length, 3);
  assert.ok(
    new Set(standard.map((material) => material.color.getHex())).size === 3,
  );
  assert.ok(
    Math.max(
      ...standard.map(
        (material) => material.color.getHSL({ h: 0, s: 0, l: 0 }).l,
      ),
    ) -
      Math.min(
        ...standard.map(
          (material) => material.color.getHSL({ h: 0, s: 0, l: 0 }).l,
        ),
      ) >
      0.15,
  );
  standard.forEach((material) => {
    assert.ok(material.metalness <= 0.22);
    assert.ok(material.roughness >= 0.46);
  });
});

void test('secondary world builders preserve paired Elite geometry and metadata', () => {
  const elite = createSecondaryWorldModel('elite');
  const pistolChildren = elite.children.filter((child) =>
    child.name.includes('elite-'),
  );
  assert.equal(pistolChildren.length, 2);
  assert.notEqual(pistolChildren[0].position.x, pistolChildren[1].position.x);
  const eliteMuzzles = elite.children.filter(
    (child) => child instanceof THREE.PointLight,
  );
  assert.equal(eliteMuzzles.length, 2);
  assert.notEqual(eliteMuzzles[0].position.x, eliteMuzzles[1].position.x);
  elite.traverse((object) => {
    if (object === elite) return;
    assert.equal(object.userData.secondaryWeaponKind, 'elite');
  });
});

void test('Elite muzzle and ejection anchors preserve the same left-to-right order', () => {
  const elite = createSecondaryFirstPersonModel('elite');
  const muzzleSides = elite.muzzles.map((muzzle) =>
    Math.sign(muzzle.position.x),
  );
  const ejectionSides = elite.ejectionAnchors.map((anchor) =>
    Math.sign(anchor.position.x),
  );
  assert.deepEqual(muzzleSides, [-1, 1]);
  assert.deepEqual(ejectionSides, [-1, 1]);
  assert.deepEqual(muzzleSides, ejectionSides);
});

void test('muzzle factory hooks replace every generated flash, including both Elite muzzles', () => {
  const hookedKinds: SecondaryWeaponKind[] = [];
  const hookedLights: THREE.PointLight[] = [];
  const model = createSecondaryFirstPersonModel('elite', {
    createMuzzleFlash: (kind) => {
      hookedKinds.push(kind);
      const light = new THREE.PointLight(0xffb85a, 0, 1.35, 2);
      hookedLights.push(light);
      return light;
    },
  });
  assert.deepEqual(hookedKinds, ['elite', 'elite']);
  assert.equal(hookedLights.length, 2);
  hookedLights.forEach((light) => assert.equal(light.userData.transient, true));
  assert.equal(model.muzzle, hookedLights[0]);
  assert.deepEqual(model.muzzles, hookedLights);
  assert.equal(
    model.root.children.filter((child) => child instanceof THREE.PointLight)
      .length,
    2,
  );
});

void test('first-person arm hooks run after firearm assembly and receive the authoritative kind', () => {
  let callbackRoot: THREE.Group | null = null;
  let callbackKind: SecondaryWeaponKind | null = null;
  const model = createSecondaryFirstPersonModel('elite', {
    attachViewmodelArms: (root, kind) => {
      callbackRoot = root;
      callbackKind = kind;
      assert.ok(
        root.children.some((child) => child.name === 'elite-left-pistol'),
      );
      const arms = new THREE.Group();
      arms.name = 'cached-viewmodel-arms';
      root.add(arms);
    },
  });
  assert.equal(callbackRoot, model.root);
  assert.equal(callbackKind, 'elite');
  assert.equal(model.root.visible, false);
  assert.equal(model.root.children.at(-1)?.name, 'cached-viewmodel-arms');
});

void test('first-person and world models own separate materials for safe disposal', () => {
  const firstPerson = createSecondaryFirstPersonModel('usp');
  const world = createSecondaryWorldModel('usp');
  const firstMaterials = materials(firstPerson.root);
  const worldMaterials = materials(world);
  assert.ok(firstMaterials.length > 0 && worldMaterials.length > 0);
  firstMaterials.forEach((material) => {
    assert.ok(
      worldMaterials.every((worldMaterial) => worldMaterial !== material),
    );
  });
  const firstColor = (firstMaterials[0] as THREE.MeshStandardMaterial).color;
  const worldColor = (worldMaterials[0] as THREE.MeshStandardMaterial).color;
  const originalWorldColor = worldColor.getHex();
  firstColor.setHex(0xffffff);
  assert.equal(worldColor.getHex(), originalWorldColor);
});

void test('the retired procedural Glock first-person API rejects bypassed callers', () => {
  assert.throws(
    () => createSecondaryFirstPersonModel('glock18' as never),
    /requires the authored viewmodel/,
  );
});

void test('first-person pistols clone the injected mapped finish across material groups', () => {
  const diffuse = new THREE.Texture();
  const relief = new THREE.Texture();
  const finish = (color: number, roughness: number, metalness: number) =>
    new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: relief,
      normalScale: new THREE.Vector2(0.12, 0.12),
      color,
      roughness,
      metalness,
    });
  const supplied = {
    body: finish(0xd2d7d3, 0.86, 0.02),
    metal: finish(0xe5e8e4, 0.68, 0.14),
    accent: finish(0xffffff, 0.56, 0.2),
  };
  const usp = createSecondaryFirstPersonModel('usp', { materials: supplied });
  const actual = new Set(
    materials(usp.root).filter(
      (material): material is THREE.MeshStandardMaterial =>
        material instanceof THREE.MeshStandardMaterial,
    ),
  );
  assert.equal(actual.size, 3);
  actual.forEach((material) => {
    assert.equal(material.map, diffuse);
    assert.equal(material.normalMap, relief);
    assert.ok(material.normalScale.length() > 0);
    assert.ok(
      material !== supplied.body &&
        material !== supplied.metal &&
        material !== supplied.accent,
    );
  });
  const magazine = usp.actionParts.magazines[0].object;
  assert.ok(magazine instanceof THREE.Mesh);
  assert.ok(magazine.material instanceof THREE.MeshStandardMaterial);
  assert.equal(magazine.material.color.getHex(), supplied.metal.color.getHex());
  assert.equal(magazine.material.roughness, supplied.metal.roughness);
  assert.equal(magazine.material.metalness, supplied.metal.metalness);
  assert.equal(magazine.material.map, diffuse);
  assert.equal(magazine.material.normalMap, relief);
  assert.notEqual(
    magazine.material.color.getHex(),
    supplied.body.color.getHex(),
  );
});

void test('reload magazines are distinct, seated action parts that move without the receiver', () => {
  for (const kind of PROCEDURAL_SECONDARY_FIRST_PERSON_KINDS) {
    const model = createSecondaryFirstPersonModel(kind);
    assert.equal(model.actionParts.magazines.length, kind === 'elite' ? 2 : 1);
    const gripParts = partPointGroups(model.root, (name) => name === 'grip');
    assert.equal(gripParts.length, kind === 'elite' ? 2 : 1);
    model.root.updateMatrixWorld(true);
    const seatedCenters: THREE.Vector3[] = [];
    model.actionParts.magazines.forEach((part, index) => {
      assert.equal(part.object.userData.secondaryReloadMagazine, true);
      const seated = new THREE.Box3().setFromObject(part.object);
      seatedCenters.push(seated.getCenter(new THREE.Vector3()));
      const grip = pointBounds(gripParts[index].points);
      assert.ok(seated.intersectsBox(grip));
    });
    const staticReceiver = model.root.children.find(
      (object) =>
        object instanceof THREE.Mesh &&
        object.userData.secondaryWeaponGeometry &&
        !object.userData.secondaryReloadMagazine,
    );
    assert.ok(staticReceiver);
    const receiverMatrix = staticReceiver.matrix.clone();
    applySecondaryReloadActionParts(model.actionParts, 0.5);
    model.root.updateMatrixWorld(true);
    model.actionParts.magazines.forEach((part, index) => {
      const moved = new THREE.Box3().setFromObject(part.object);
      const grip = pointBounds(gripParts[index].points);
      assert.ok(
        moved.getCenter(new THREE.Vector3()).distanceTo(seatedCenters[index]) >
          0.06 && !moved.intersectsBox(grip),
        `${kind} magazine does not visibly clear its grip`,
      );
    });
    assert.deepEqual(staticReceiver.matrix.toArray(), receiverMatrix.toArray());
    resetSecondaryReloadActionParts(model.actionParts);
    model.actionParts.magazines.forEach((part) => {
      assert.deepEqual(
        part.object.position.toArray(),
        part.basePosition.toArray(),
      );
    });
  }
});
