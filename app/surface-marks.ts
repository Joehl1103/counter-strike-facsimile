import type { FirearmKind } from './game-rules';

export type SurfaceImpactKind = 'sand' | 'plaster' | 'wood' | 'metal';
export type PersistentBulletMarkKind = Exclude<SurfaceImpactKind, 'sand'>;

export const PERSISTENT_BULLET_MARK_CAPACITY = {
  plaster: 24,
  wood: 12,
  metal: 12,
} as const satisfies Readonly<Record<PersistentBulletMarkKind, number>>;

export const PERSISTENT_BULLET_MARK_OFFSET = 0.008;

const FIREARM_MARK_SIZES = {
  glock18: 0.056,
  usp: 0.055,
  p228: 0.058,
  deagle: 0.064,
  elite: 0.057,
  fiveseven: 0.056,
  smg: 0.06,
  rifle: 0.068,
  carbine: 0.065,
  shotgun: 0.078,
  sniper: 0.086,
} as const satisfies Readonly<Record<FirearmKind, number>>;

export function getPersistentBulletMarkKind(
  surface: unknown,
): PersistentBulletMarkKind | null {
  return surface === 'plaster' || surface === 'wood' || surface === 'metal'
    ? surface
    : null;
}

export function shouldSpawnPersistentBulletMark({
  impact,
  firearmKind,
  surface,
  alreadySpawned,
}: Readonly<{
  impact: 'target' | 'world' | null;
  firearmKind: FirearmKind | null;
  surface: unknown;
  alreadySpawned: boolean;
}>) {
  return (
    impact === 'world' &&
    firearmKind !== null &&
    getPersistentBulletMarkKind(surface) !== null &&
    !alreadySpawned
  );
}

export function getPersistentBulletMarkSize(firearmKind: FirearmKind) {
  return FIREARM_MARK_SIZES[firearmKind];
}

export function getPersistentBulletMarkSlot(cursor: number, capacity: number) {
  if (
    !Number.isSafeInteger(cursor) ||
    cursor < 0 ||
    !Number.isSafeInteger(capacity) ||
    capacity <= 0
  )
    return null;
  return cursor % capacity;
}

export function getBulletMarkPlacement(
  point: readonly [number, number, number],
  normal: readonly [number, number, number],
  offset = PERSISTENT_BULLET_MARK_OFFSET,
) {
  if (
    !point.every(Number.isFinite) ||
    !normal.every(Number.isFinite) ||
    !Number.isFinite(offset) ||
    offset <= 0
  )
    return null;
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  if (length <= 1e-6) return null;
  const unitNormal = normal.map((component) => component / length) as [
    number,
    number,
    number,
  ];
  return {
    normal: unitNormal,
    position: point.map(
      (component, index) => component + unitNormal[index] * offset,
    ) as [number, number, number],
  };
}
