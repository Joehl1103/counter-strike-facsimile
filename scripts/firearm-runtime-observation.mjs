import assert from 'node:assert/strict';

// Frozen source-card values. Keep these independent from production damage modules.
const maximumWallExits = {
  rifle: 1, carbine: 1, deagle: 1, sniper: 2,
  smg: 0, shotgun: 0, glock18: 0, usp: 0, p228: 0, elite: 0, fiveseven: 0,
};

const directDamageProfiles = {
  rifle: { baseDamage: 36, rangeModifier: 0.98 },
  carbine: { baseDamage: 32, rangeModifier: 0.97 },
  smg: { baseDamage: 26, rangeModifier: 0.84 },
  sniper: { baseDamage: 115, rangeModifier: 0.99 },
  glock18: { baseDamage: 25, rangeModifier: 0.75 },
  usp: { baseDamage: 34, rangeModifier: 0.79 },
  p228: { baseDamage: 32, rangeModifier: 0.8 },
  deagle: { baseDamage: 54, rangeModifier: 0.81 },
  elite: { baseDamage: 36, rangeModifier: 0.75 },
  fiveseven: { baseDamage: 20, rangeModifier: 0.885 },
};

const hitGroupMultipliers = {
  head: 4,
  torso: 1,
  stomach: 1.25,
  leg: 0.75,
};

const acceptedDamageVerdicts = new Set([
  'verified-direct-unarmored',
  'not-applicable-blocked',
]);

/** Fail closed when a case has no independent numeric damage verdict. */
export function assertFirearmRuntimeDamageVerdictSupported(observation) {
  const verdict = observation?.damageVerdict ?? 'missing';
  assert.ok(
    acceptedDamageVerdicts.has(verdict),
    `numeric damage verification is unsupported for runtime case: ${verdict}`,
  );
  return observation;
}

function expectedDirectRawDamage(fixture, ray, shot) {
  assert.ok(Number.isFinite(ray.targetDistance) && ray.targetDistance >= 0,
    'direct target ray is missing its actual distance');
  const sourceDistance = ray.targetDistance * 40;
  const hitGroupMultiplier = hitGroupMultipliers[ray.hitGroup];
  assert.ok(Number.isFinite(hitGroupMultiplier), 'direct ray has an unknown hit group');

  if (fixture.weapon === 'shotgun') {
    return Math.floor(20 * (1 - sourceDistance / 3000)) * hitGroupMultiplier;
  }

  const profile = directDamageProfiles[fixture.weapon];
  assert.ok(profile, `direct damage profile is missing for ${fixture.weapon}`);
  const silenced = Boolean(shot.details.shotBasis?.pose?.silenced);
  const baseDamage = fixture.weapon === 'carbine' && silenced
    ? 33
    : fixture.weapon === 'usp' && silenced
      ? 30
      : profile.baseDamage;
  const rangeModifier = fixture.weapon === 'carbine' && silenced
    ? 0.95
    : profile.rangeModifier;
  const rangeAdjustedDamage = Math.floor(
    baseDamage * rangeModifier ** (sourceDistance / 500),
  );
  return rangeAdjustedDamage * hitGroupMultiplier;
}

function expectedUnarmoredResolution(before, rawDamage) {
  assert.equal(before.armor, 0, 'unarmored direct case began with armor');
  assert.equal(before.helmet, false, 'unarmored direct case began with a helmet');
  const health = Math.max(0, before.health - rawDamage);
  return {
    armor: 0,
    helmet: false,
    health,
    armorDamage: 0,
    healthDamage: before.health - health,
  };
}

/** Check production rays and live target state against the frozen runtime card. */
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
    const firstPelletRays = rays.filter((ray) => ray.pellet === 0);
    const firstPelletWalls = firstPelletRays.filter((ray) => ray.collider);
    assert.equal(firstPelletRays.at(-1), firstPelletWalls.at(-1), 'blocked trace continued beyond its final wall');
    assert.equal(firstPelletWalls.length, requiredWalls, 'missing required wall collision observations');
    for (const [wallIndex, ray] of firstPelletWalls.entries()) {
      const expectedCollider = `jkh-131-${fixture.material}-slab-${wallIndex + 1}`;
      assert.equal(ray.collider, expectedCollider, 'the ray hit an unexpected or reused collider');
      assert.equal(ray.traceResult, 'rejected');
      assert.ok(Number.isFinite(ray.worldDistance));
      assert.ok(Number.isFinite(ray.exitDistance) && ray.exitDistance > ray.worldDistance);
    }
    return {
      outcome: 'blocked',
      observedHitGroups: [],
      wallsObserved: requiredWalls,
      damageVerdict: 'not-applicable-blocked',
    };
  }

  const damagingRays = targetRays.filter((ray) => ray.traceResult === 'target' && ray.rawDamage > 0);
  assert.ok(damagingRays.length > 0, 'the committed shot did not damage the named target');
  assert.equal(damagingRays.length, targetRays.length, 'a target ray lacked positive raw damage');
  assert.ok(
    damagingRays.some((ray) => ray.hitGroup === fixture.hitGroup),
    `requested ${fixture.hitGroup} was not observed; got ${damagingRays.map((ray) => ray.hitGroup).join(',')}`,
  );
  if (fixture.weapon !== 'shotgun') {
    assert.equal(damagingRays.length, 1, 'single-bullet shot has multiple target observations');
  }

  const isDirect = fixture.material === 'direct' && fixture.wallCount === 0;
  const hasArmor = (fixture.armor != null && fixture.armor !== 'none') || beforeTarget.armor > 0 || beforeTarget.helmet;
  let expectedDamageInput = {
    health: beforeTarget.health,
    armor: beforeTarget.armor,
    helmet: beforeTarget.helmet,
  };
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
    assert.deepEqual(ray.damageInputBefore, expectedDamageInput, 'pellet damage chain does not match prior target state');
    assert.ok(Number.isFinite(ray.rawDamage), 'target ray has non-finite raw damage');
    assert.ok(Number.isFinite(ray.damageResolved.health) && ray.damageResolved.health >= 0,
      'resolved health is invalid');
    assert.ok(Number.isFinite(ray.damageResolved.armor) && ray.damageResolved.armor >= 0,
      'resolved armor is invalid');
    assert.equal(ray.damageResolved.healthDamage,
      ray.damageInputBefore.health - ray.damageResolved.health,
      'reported health damage disagrees with the resolved health');
    assert.equal(ray.damageResolved.armorDamage,
      ray.damageInputBefore.armor - ray.damageResolved.armor,
      'reported armor damage disagrees with the resolved armor');

    if (isDirect) {
      const expectedRawDamage = expectedDirectRawDamage(fixture, ray, shot);
      assert.equal(ray.rawDamage, expectedRawDamage,
        `raw damage disagrees with frozen direct formula at ${ray.targetDistance} scene units`);
    }

    if (isDirect && !hasArmor) {
      const expectedResolution = expectedUnarmoredResolution(
        ray.damageInputBefore,
        ray.rawDamage,
      );
      assert.deepEqual(ray.damageResolved, expectedResolution,
        'applied damage disagrees with frozen unarmored direct result');
    } else if (ray.damageInputBefore.health > 0) {
      assert.ok(ray.damageResolved.health <= ray.damageInputBefore.health,
        'target ray increased health');
    } else {
      assert.equal(ray.damageResolved.health, 0, 'post-lethal pellet revived the target');
    }

    expectedDamageInput = {
      health: ray.damageResolved.health,
      armor: ray.damageResolved.armor,
      helmet: ray.damageResolved.helmet,
    };
  }

  assert.ok(shot.target.health < beforeTarget.health, 'live target health did not decrease');
  const lastRay = damagingRays.at(-1);
  assert.equal(shot.target.health, lastRay.damageResolved.health, 'live health disagrees with applied damage');
  assert.equal(shot.target.armor, lastRay.damageResolved.armor, 'live armor disagrees with applied damage');
  assert.equal(shot.target.helmet, lastRay.damageResolved.helmet, 'live helmet disagrees with applied damage');

  const damageVerdict = !isDirect
    ? 'unsupported-wall-attenuation'
    : hasArmor
      ? 'unsupported-armored-resolution'
      : 'verified-direct-unarmored';
  return {
    outcome: 'target',
    observedHitGroups: damagingRays.map((ray) => ray.hitGroup),
    wallsObserved: fixture.wallCount,
    damageVerdict,
  };
}

/** Prove the rejected input landed inside equip lock without changing combat state. */
export function assertFirearmEarlyEquipRejection(before, after, weapon, selectionKey) {
  assert.equal(before.event.input, selectionKey, 'unexpected equip input');
  assert.equal(before.event.outcome, 'committed', 'equip was not committed');
  assert.equal(before.player.activeWeapon, weapon, 'wrong weapon equipped');
  assert.equal(after.event.input, 'KeyF');
  assert.equal(after.event.outcome, 'rejected');
  assert.ok(after.event.simulationNowMs < before.player.equipReadyAtMs, 'early fire missed the equip-lock window');
  assert.equal(after.player.activeWeapon, weapon);
  assert.deepEqual(after.player.ammo, before.player.ammo, 'early fire changed ammo');
  assert.deepEqual(after.target, before.target, 'early fire changed target state');
  assert.equal(after.player.ballistic.shots, before.player.ballistic.shots, 'early fire changed ballistic shot count');
}
