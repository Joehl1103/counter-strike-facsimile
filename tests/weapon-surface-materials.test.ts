import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWeaponSurfaceFinish } from '../app/weapon-surface-materials.ts';
import { WEAPON_SURFACE_MATERIAL_PROFILES } from '../app/weapon-surface-profile.ts';

void test('weapon finish shares three bounded procedural maps across roles', () => {
  const finish = createWeaponSurfaceFinish(32);
  const { diffuse, normal, roughness } = finish.textures;
  assert.equal(new Set([diffuse, normal, roughness]).size, 3);
  assert.equal(diffuse.colorSpace, THREE.SRGBColorSpace);
  assert.equal(normal.colorSpace, THREE.NoColorSpace);
  assert.equal(roughness.colorSpace, THREE.NoColorSpace);
  for (const texture of Object.values(finish.textures)) {
    assert.equal(texture.image.width, 256);
    assert.equal(texture.image.height, 256);
    assert.equal(texture.wrapS, THREE.RepeatWrapping);
    assert.equal(texture.wrapT, THREE.RepeatWrapping);
    assert.equal(texture.anisotropy, 8);
  }
  for (const [role, material] of Object.entries(finish.materials)) {
    const profile =
      WEAPON_SURFACE_MATERIAL_PROFILES[
        role as keyof typeof WEAPON_SURFACE_MATERIAL_PROFILES
      ];
    assert.equal(material.map, diffuse);
    assert.equal(material.normalMap, normal);
    assert.equal(material.roughnessMap, roughness);
    assert.equal(material.color.getHex(), profile.color);
    assert.equal(material.roughness, profile.roughness);
    assert.equal(material.metalness, profile.metalness);
    assert.deepEqual(material.normalScale.toArray(), [
      profile.normalScale,
      profile.normalScale,
    ]);
  }
});

void test('weapon finish clamps sampling and disposes shared resources once', () => {
  const finish = createWeaponSurfaceFinish(Number.NaN);
  assert.equal(finish.textures.diffuse.anisotropy, 1);
  let textureDisposals = 0;
  let materialDisposals = 0;
  Object.values(finish.textures).forEach((texture) =>
    texture.addEventListener('dispose', () => textureDisposals++),
  );
  Object.values(finish.materials).forEach((material) =>
    material.addEventListener('dispose', () => materialDisposals++),
  );
  finish.dispose();
  finish.dispose();
  assert.equal(textureDisposals, 3);
  assert.equal(materialDisposals, 3);
});
