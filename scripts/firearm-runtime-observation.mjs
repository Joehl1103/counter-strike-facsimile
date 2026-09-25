import assert from 'node:assert/strict';

// Independent card expectations. Do not import production penetration constants:
// a regression in those constants must disagree with this observer.
const maximumWallExits = {
  rifle: 1, carbine: 1, deagle: 1, sniper: 2,
  smg: 0, shotgun: 0, glock18: 0, usp: 0, p228: 0, elite: 0, fiveseven: 0,
};

/** Check actual production rays and live target state against the named setup. */
export function assertFirearmRuntimeObservation(fixture, beforeTarget, shot) {
  const rays = shot.details.rays;
  assert.ok(Array.isArray(rays) && rays.length > 0, 'missing production ray observations');
  assert.equal(shot.target.id, beforeTarget.id, 'the named target changed');

  const targetRays = rays.filter((ray) => ray.targetId === beforeTarget.id);
  const wallLimit = maximumWallExits[fixture.weapon];
  assert.ok(Number.isInteger(wallLimit), 'unknown weapon in runtime oracle');
  const expectsTarget = fixture.wallCount === 0 ||
    (fixture.material === 'wood' && fixture.wallCount <= wallLimit);

  if (!expectsTarget) {
    assert.equal(targetRays.length, 0, 'a blocked shot reached the target');
    assert.deepEqual(shot.target, beforeTarget, 'a blocked shot changed target state');
    const requiredWalls = Math.min(fixture.wallCount, wallLimit + 1);
    const firstPelletWalls = rays.filter((ray) => ray.pellet === 0 && ray.collider);
    assert.equal(firstPelletWalls.length, requiredWalls, 'missing required wall collision observations');
    for (const [wallIndex, ray] of firstPelletWalls.entries()) {
      const expectedCollider = `jkh-131-${fixture.material}-slab-${wallIndex + 1}`;
      assert.equal(ray.collider, expectedCollider, 'the ray hit an unexpected or reused collider');
      assert.equal(ray.traceResult, 'rejected');
      assert.ok(Number.isFinite(ray.worldDistance));
      assert.ok(Number.isFinite(ray.exitDistance) && ray.exitDistance > ray.worldDistance);
    }
    return { outcome: 'blocked', observedHitGroups: [], wallsObserved: requiredWalls };
  }

  const damagingRays = targetRays.filter((ray) => ray.traceResult === 'target' && ray.rawDamage > 0);
  assert.ok(damagingRays.length > 0, 'the committed shot did not damage the named target');
  assert.ok(
    damagingRays.some((ray) => ray.hitGroup === fixture.hitGroup),
    `requested ${fixture.hitGroup} was not observed; got ${damagingRays.map((ray) => ray.hitGroup).join(',')}`,
  );
  if (fixture.weapon !== 'shotgun') {
    assert.equal(damagingRays.length, 1, 'single-bullet shot has multiple target observations');
  }
  for (const ray of damagingRays) {
    assert.equal(ray.exits, fixture.wallCount, 'wrong successful penetration exit count');
    const pelletWalls = rays.filter((entry) => entry.pellet === ray.pellet && entry.collider);
    assert.equal(pelletWalls.length, fixture.wallCount, 'missing successful wall observations');
    for (const [wallIndex, wall] of pelletWalls.entries()) {
      assert.equal(wall.collider, `jkh-131-wood-slab-${wallIndex + 1}`);
      assert.equal(wall.material, 'wood');
      assert.ok(Number.isFinite(wall.exitDistance) && wall.exitDistance > wall.worldDistance);
    }
    assert.ok(ray.damageInputBefore && ray.damageResolved, 'missing applied damage observation');
    assert.ok(ray.damageResolved.health < ray.damageInputBefore.health, 'target ray did not reduce health');
  }
  assert.ok(shot.target.health < beforeTarget.health, 'live target health did not decrease');
  const lastRay = damagingRays.at(-1);
  assert.equal(shot.target.health, lastRay.damageResolved.health, 'live health disagrees with applied damage');
  assert.equal(shot.target.armor, lastRay.damageResolved.armor, 'live armor disagrees with applied damage');

  return {
    outcome: 'target',
    observedHitGroups: damagingRays.map((ray) => ray.hitGroup),
    wallsObserved: fixture.wallCount,
  };
}
