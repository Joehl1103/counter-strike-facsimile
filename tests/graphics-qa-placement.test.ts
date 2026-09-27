import test from 'node:test';
import assert from 'node:assert/strict';
import { DUST2_COLLISION_WORLD, DUST2_MAP, getMapGroundHeight, isMapWalkable } from '../app/dust2-map.ts';
import { readFileSync } from 'node:fs';

const qa = await import(process.env.CS16_QA_MODULE ?? '../app/graphics-qa.ts') as typeof import('../app/graphics-qa.ts');

void test('every map review camera stands on its current walkable surface and B review is at site B', () => {
  for (const name of ['dust2-long-doors', 'dust2-long', 'dust2-a', 'lane', 'site-a', 'site-b', 'character']) {
    const pose = qa.getGraphicsQaPreset(`?visual-qa=${name}`, 'localhost')!;
    const [x, y, z] = pose.position;
    assert.ok(isMapWalkable(x, z), `${name} is outside the map`);
    assert.ok(Math.abs(y - getMapGroundHeight(x, z) - 1.68) < 1e-12, `${name} camera height`);
  }
  const siteB = qa.getGraphicsQaPreset('?visual-qa=site-b', 'localhost')!;
  assert.deepEqual([siteB.position[0], siteB.position[2]], DUST2_MAP.sites.B);
});

void test('motion board camera and all nine visible subjects share the current spawn surface', () => {
  const [cameraX, cameraY, cameraZ] = qa.GRAPHICS_QA_MOTION_CAMERA_POSITION;
  assert.ok(isMapWalkable(cameraX, cameraZ));
  assert.ok(Math.abs(cameraY - getMapGroundHeight(cameraX, cameraZ) - 1.68) < 1e-12);
  for (let index = 0; index < 9; index += 1) {
    const [x, y, z] = qa.getGraphicsQaMotionPosition(index);
    assert.ok(isMapWalkable(x, z));
    assert.equal(y, getMapGroundHeight(x, z));
  }
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /bot.skinned.visualRoot.position.set\(\.\.\.getGraphicsQaMotionPosition\(index\)\)/);
  assert.match(page, /player.position.set\(\.\.\.GRAPHICS_QA_MOTION_CAMERA_POSITION\)/);
  assert.doesNotMatch(page, /BLACKSITE|RAIDERS|Blacksite|Raiders/);
});

void test('weapon review cameras stand on the map with an unobstructed three and six metre character lane', () => {
  for (const name of ['pistol', 'primary', 'secondary', 'equipment']) {
    const pose = qa.getGraphicsQaPreset(`?visual-qa=${name}`, 'localhost')!;
    const [x, y, z] = pose.position;
    assert.ok(isMapWalkable(x, z), `${name} camera is outside the walkable map`);
    assert.ok(Math.abs(y - getMapGroundHeight(x, z) - 1.68) < 1e-12);
    for (const distance of [3, 6]) {
      for (const offsetX of [-1.72, -0.62, 0.62, 1.72]) {
        const targetX = x + offsetX, targetZ = z - distance;
        assert.ok(isMapWalkable(targetX, targetZ));
        assert.ok(Math.abs(getMapGroundHeight(targetX, targetZ) - (y - 1.68)) < 1e-12);
        // Sample the eye-to-head line against the production static volumes.
        for (let step = 0; step <= 30; step++) {
          const t = step / 30, pointX = x + offsetX * t, pointZ = z - distance * t;
          assert.ok(!DUST2_COLLISION_WORLD.boxes.some(box =>
            pointX > box.min.x && pointX < box.max.x &&
            y > box.min.y && y < box.max.y &&
            pointZ > box.min.z && pointZ < box.max.z), `${name} sightline is obstructed`);
        }
      }
    }
  }
});
