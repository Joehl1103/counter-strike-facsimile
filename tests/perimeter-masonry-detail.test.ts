import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERIMETER_MASONRY_ADDED_TRIANGLES,
  PERIMETER_MASONRY_BATCHES,
  PERIMETER_MASONRY_MAX_ADDED_DRAWS,
  PERIMETER_MASONRY_MAX_ADDED_TRIANGLES,
} from '../app/perimeter-masonry-detail.ts';
import {
  EXTERIOR_WALL_EDGE,
  EXTERIOR_WALL_INNER_EDGE,
} from '../app/scene-layout.ts';

const insidePerimeterWall = (
  position: readonly [number, number, number],
  size: readonly [number, number, number],
  rotationY: number,
) => {
  const rotated = Math.abs(Math.sin(rotationY)) > 0.5;
  const halfX = (rotated ? size[2] : size[0]) / 2;
  const halfZ = (rotated ? size[0] : size[2]) / 2;
  const [x, , z] = position;
  const withinHorizontalSpan =
    x - halfX >= -EXTERIOR_WALL_EDGE &&
    x + halfX <= EXTERIOR_WALL_EDGE &&
    z - halfZ >= -EXTERIOR_WALL_EDGE &&
    z + halfZ <= EXTERIOR_WALL_EDGE;
  const insideNorthOrSouth =
    (z - halfZ >= EXTERIOR_WALL_INNER_EDGE ||
      z + halfZ <= -EXTERIOR_WALL_INNER_EDGE) &&
    Math.abs(z) + halfZ <= EXTERIOR_WALL_EDGE;
  const insideEastOrWest =
    (x - halfX >= EXTERIOR_WALL_INNER_EDGE ||
      x + halfX <= -EXTERIOR_WALL_INNER_EDGE) &&
    Math.abs(x) + halfX <= EXTERIOR_WALL_EDGE;
  return withinHorizontalSpan && (insideNorthOrSouth || insideEastOrWest);
};

void test('perimeter masonry stays batched, bounded, and inside wall authority', () => {
  assert.equal(
    PERIMETER_MASONRY_BATCHES.length,
    PERIMETER_MASONRY_MAX_ADDED_DRAWS,
  );
  assert.equal(PERIMETER_MASONRY_ADDED_TRIANGLES, 960);
  assert.ok(
    PERIMETER_MASONRY_ADDED_TRIANGLES <= PERIMETER_MASONRY_MAX_ADDED_TRIANGLES,
  );

  const kinds = new Set(PERIMETER_MASONRY_BATCHES.map(({ kind }) => kind));
  assert.deepEqual(kinds, new Set(['pilaster', 'capital', 'course']));
  PERIMETER_MASONRY_BATCHES.forEach(({ size, instances }) => {
    assert.ok(size.every((value) => Number.isFinite(value) && value > 0));
    instances.forEach(({ position, rotationY }) => {
      assert.ok(position.every(Number.isFinite));
      assert.ok(Number.isFinite(rotationY));
      assert.equal(insidePerimeterWall(position, size, rotationY), true);
    });
  });
});
