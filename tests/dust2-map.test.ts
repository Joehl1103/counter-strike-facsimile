import assert from 'node:assert/strict';
import test from 'node:test';
import { DUST2_MAP, DUST2_COLLISION_WORLD, getMapGroundHeight, findMapNodePath, canTraverseMapSegment, getMapNavigationPath, getMapSupportHeight } from '../app/dust2-map.ts';
import { hullBlocked, resolvePlayerMotion, PLAYER_HULL } from '../app/player-collision.ts';

const routes = {
  'T-long-A': ['t', 'longDoors', 'outsideLong', 'long', 'longRamp', 'a'],
  'T-mid-short-A': ['t', 'topMid', 'mid', 'catEntry', 'catwalk', 'short', 'a'],
  'T-upper-tunnel-B': ['t', 'tunnelEntry', 'tunnelApproach', 'upper', 'bTunnel', 'b'],
  'mid-lower-upper-tunnel': ['mid', 'lower', 'tunnelStairs', 'upper'],
  'mid-doors-CT': ['mid', 'midDoors', 'ct'],
  'CT-B-doors-B': ['ct', 'bDoors', 'b'],
  'CT-ramp-A': ['ct', 'ctRamp', 'a'],
};

for (const [name, route] of Object.entries(routes)) void test(`Dust II hull traversal: ${name}, both directions`, () => {
  for (const ids of [route, [...route].reverse()]) {
    const start = DUST2_MAP.nodes[ids[0]];
    let position = { x: start[0], z: start[1], feet: getMapGroundHeight(...start) };
    for (let i = 1; i < ids.length; i++) {
      const target = DUST2_MAP.nodes[ids[i]];
      const distance = Math.hypot(target[0] - position.x, target[1] - position.z);
      const steps = Math.ceil(distance / 0.04);
      const dx = (target[0] - position.x) / steps;
      const dz = (target[1] - position.z) / steps;
      for (let step = 0; step < steps; step++) {
        const result = resolvePlayerMotion(DUST2_COLLISION_WORLD, position,
          { x: dx, y: -0.00145, z: dz }, PLAYER_HULL.standingHeight, true);
        const where = `${ids[i - 1]} → ${ids[i]} at ${JSON.stringify(position)}`;
        assert.ok(!result.blockedX && !result.blockedZ, where);
        assert.equal(result.grounded, true, `unsupported route: ${where}`);
        assert.equal(hullBlocked(DUST2_COLLISION_WORLD, result.x, result.feet, result.z, 1.8), false, where);
        position = result;
      }
      assert.ok(Math.hypot(position.x - target[0], position.z - target[1]) < 1e-9);
    }
  }
});

void test('Dust II spawn/site placement and graph are coherent', () => {
  const { spawns, sites } = DUST2_MAP;
  assert.ok(sites.A[0] > spawns.ct[0] && sites.B[0] < spawns.ct[0]);
  assert.ok(sites.A[1] < spawns.t[1] && sites.B[1] < spawns.t[1]);
  assert.ok(Math.hypot(spawns.ct[0] - spawns.t[0], spawns.ct[1] - spawns.t[1]) > 30);
  for (const point of [...Object.values(spawns), ...Object.values(sites)]) {
    assert.equal(hullBlocked(DUST2_COLLISION_WORLD, point[0], getMapGroundHeight(...point), point[1], 1.8), false);
  }
  for (const node of Object.keys(DUST2_MAP.nodes)) assert.ok(findMapNodePath('t', node).length);
  assert.deepEqual(findMapNodePath('missing', 'a'), []);
});

void test('every navigation edge traverses both ways including the B window', () => {
  for (const [a, b] of DUST2_MAP.edges) {
    assert.ok(canTraverseMapSegment(DUST2_MAP.nodes[a], DUST2_MAP.nodes[b]), `${a} → ${b}`);
    assert.ok(canTraverseMapSegment(DUST2_MAP.nodes[b], DUST2_MAP.nodes[a]), `${b} → ${a}`);
  }
  for (const side of ['ct', 't'] as const) {
    const spawns = DUST2_MAP.teamSpawns[side];
    assert.equal(spawns.length, 5);
    for (const [i, spawn] of spawns.entries()) {
      assert.equal(hullBlocked(DUST2_COLLISION_WORLD, spawn[0], getMapGroundHeight(...spawn), spawn[1], 1.8), false);
      for (const other of spawns.slice(i + 1)) assert.ok(Math.hypot(spawn[0] - other[0], spawn[1] - other[1]) > 0.9);
      for (const site of Object.values(DUST2_MAP.sites)) {
        const path = [spawn, ...getMapNavigationPath(spawn, site)];
        assert.ok(path.length > 1, `${side}.${i} cannot navigate to site`);
        for (let p = 1; p < path.length; p++) assert.ok(canTraverseMapSegment(path[p - 1], path[p]));
      }
    }
  }
});

void test('door panels block while apertures pass and tunnel roofs stop jumps', () => {
  assert.equal(hullBlocked(DUST2_COLLISION_WORLD, -3, 0, -14, 1.8), true);
  assert.equal(hullBlocked(DUST2_COLLISION_WORLD, 0, 0, -14, 1.8), false);
  const ceiling = resolvePlayerMotion(DUST2_COLLISION_WORLD, { x: -24, feet: 1, z: 6 },
    { x: 0, y: 3, z: 0 }, 1.8, false);
  assert.equal(ceiling.hitCeiling, true);
  assert.ok(Math.abs(ceiling.feet - 2.4) < 1e-9);
});

void test('item support respects crate tops and does not snap through tunnel ceilings', () => {
  assert.equal(getMapGroundHeight(29, -29), 2);
  assert.equal(getMapSupportHeight(29, -29, 5), 4);
  assert.equal(getMapSupportHeight(-24, 6, 2), 1);
  assert.equal(getMapSupportHeight(-24, 6, 6), 5.2);
});
