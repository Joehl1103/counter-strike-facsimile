import type { FirearmKind, HitGroup } from './game-rules.ts';

/**
 * Enumerated, loopback-only setup for JKH-131 runtime observations.
 *
 * This file deliberately contains no renderer, action queue, raycast, or
 * damage call. The page uses a selected entry only to prepare a finite
 * loadout and a named target; browser keyboard input still reaches the normal
 * queueGameplayAction -> shoot path.
 */
export const FIREARM_RUNTIME_FIXTURE_SEED = 1947;

export type FirearmRuntimeFixture = Readonly<{
  id: string;
  weapon: FirearmKind;
  targetDistance: 'nearest-safe' | 12.5 | 25;
  hitGroup: HitGroup;
  armor: 'none' | 'vest' | 'helmet';
  material: 'direct' | 'wood' | 'metal' | 'concrete' | 'blocked';
  wallCount: number;
}>;

const firearmKinds: readonly FirearmKind[] = [
  'rifle', 'carbine', 'smg', 'shotgun', 'sniper', 'glock18', 'usp', 'p228',
  'deagle', 'elite', 'fiveseven',
];

const directCases = firearmKinds.flatMap((weapon) => [
  {
    id: `${weapon}-nearest-torso`,
    weapon,
    targetDistance: 'nearest-safe' as const,
    hitGroup: 'torso' as const,
    armor: 'none' as const,
    material: 'direct' as const,
    wallCount: 0,
  },
  {
    id: `${weapon}-12-5-torso`,
    weapon,
    targetDistance: 12.5 as const,
    hitGroup: 'torso' as const,
    armor: 'none' as const,
    material: 'direct' as const,
    wallCount: 0,
  },
  {
    id: `${weapon}-25-torso`,
    weapon,
    targetDistance: 25 as const,
    hitGroup: 'torso' as const,
    armor: 'none' as const,
    material: 'direct' as const,
    wallCount: 0,
  },
]);

const hitGroupCases = firearmKinds.flatMap((weapon) =>
  (['head', 'torso', 'stomach', 'leg'] as const).flatMap((hitGroup) =>
    (['none', 'vest', 'helmet'] as const).map((armor) => ({
      id: `${weapon}-12-5-${hitGroup}-${armor}`,
      weapon,
      targetDistance: 12.5 as const,
      hitGroup,
      armor,
      material: 'direct' as const,
    wallCount: 0,
    })),
  ),
);

const materialCases = firearmKinds.flatMap((weapon) =>
  (['wood', 'metal', 'concrete', 'blocked'] as const).map((material) => ({
    id: `${weapon}-${material}`,
    weapon,
    targetDistance: 12.5 as const,
    hitGroup: 'torso' as const,
    armor: 'none' as const,
    material,
    wallCount: 1,
  })),
);

const multiWallCases = (['rifle', 'carbine', 'deagle', 'sniper'] as const).flatMap((weapon) =>
  ([2, 3] as const).map((wallCount) => ({
    id: `${weapon}-wood-${wallCount}-walls`,
    weapon,
    targetDistance: 12.5 as const,
    hitGroup: 'torso' as const,
    armor: 'none' as const,
    material: 'wood' as const,
    wallCount,
  })),
);

export const FIREARM_RUNTIME_FIXTURES: readonly FirearmRuntimeFixture[] =
  Object.freeze([...directCases, ...hitGroupCases, ...materialCases, ...multiWallCases]);

export function getFirearmRuntimeFixture(
  search: string,
  hostname: string,
): FirearmRuntimeFixture | null {
  const params = new URLSearchParams(search);
  if (params.get('firearm-runtime-fixture') !== '1') {
    return null;
  }
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error('JKH-131 firearm fixture is localhost-only');
  }
  const requestedCase = params.get('case');
  if (!requestedCase) {
    throw new Error('JKH-131 firearm fixture requires a named case');
  }
  const fixture = FIREARM_RUNTIME_FIXTURES.find((entry) => entry.id === requestedCase);
  if (!fixture) {
    throw new Error(`unknown JKH-131 firearm fixture case: ${requestedCase}`);
  }
  return fixture;
}
