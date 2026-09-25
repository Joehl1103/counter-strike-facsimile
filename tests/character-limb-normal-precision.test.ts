import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createFacetedLimbGeometry } from '../app/character-visuals.ts';
import { createCharacterLimbDeformationController, writeCharacterLimbFootPlanting } from '../app/character-limb-deformation.ts';

void test('moving planted and swinging feet retain finite unit surface normals', () => {
  const mesh = new THREE.Mesh(createFacetedLimbGeometry(0.13, 0.56));
  mesh.position.y = 0.7;
  const root = new THREE.Group(); root.add(mesh);
  const controller = createCharacterLimbDeformationController(mesh, 'leg');
  const normals = controller.normalAttribute.array;
  for (let frame = 0; frame < 240; frame++) {
    const phase = frame * 0.13;
    root.position.set(Math.sin(phase) * 0.3, Math.cos(phase) * 0.04, frame * 0.01);
    root.rotation.set(Math.sin(phase) * 0.12, phase * 0.2, Math.cos(phase) * 0.08);
    controller.write({ knee: Math.sin(phase) * 1.35, ankle: Math.cos(phase) * 1.1 });
    writeCharacterLimbFootPlanting(controller, { plant: (1 + Math.cos(phase)) / 2,
      swingOffsetZ: Math.sin(phase) * 0.16, groundY: 0, toeClearance: 0.08 });
    assert.equal(controller.normalAttribute.array, normals);
    for (let offset = 0; offset < normals.length; offset += 3) {
      const magnitude = Math.hypot(normals[offset], normals[offset + 1], normals[offset + 2]);
      assert.ok(Number.isFinite(magnitude) && Math.abs(magnitude - 1) <= 1e-6,
        `frame ${frame}, vertex ${offset / 3}, normal length ${magnitude}`);
    }
  }
  controller.geometry.dispose();
});
