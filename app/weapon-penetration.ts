import { FIREARMS, getFirearmDamage, getFirearmHitGroupMultiplier, type FirearmKind, type HitGroup } from './game-rules.ts';

// Pinned reconstruction; finite AABB exits deliberately replace source fixed skips.
export const PENETRATION = {
  rifle: [2, 39, 5000], carbine: [2, 35, 4000], sniper: [3, 45, 8000],
  smg: [1, 21, 800], glock18: [1, 21, 800], elite: [1, 21, 800],
  usp: [1, 15, 500], p228: [1, 25, 800], deagle: [2, 30, 1000],
  fiveseven: [1, 30, 2000], shotgun: [1, 0, 0],
} as const satisfies Record<FirearmKind, readonly [number, number, number]>;
// null damage means retain the previous material's modifier.
export const PENETRATION_MATERIALS = {
  metal: [0.15, 0.2], concrete: [0.25, null], wood: [1, 0.6],
  grate: [0.5, 0.4], vent: [0.5, 0.45], tile: [0.65, 0.3],
  computer: [0.4, 0.45], default: [1, null],
} as const;
export type PenetrationMaterial = keyof typeof PENETRATION_MATERIALS;
export function getPenetrationMaterial(surface: string): PenetrationMaterial {
  if (surface === 'plaster' || surface === 'cutStone') return 'concrete';
  return surface in PENETRATION_MATERIALS ? surface as PenetrationMaterial : 'default';
}
export type BulletTraceHit<T> =
  | { kind: 'target'; distance: number; hitGroup: HitGroup; target: T }
  | { kind: 'world'; distance: number; exitDistance: number | null; material: PenetrationMaterial; collider: object };
export function tracePenetratingBullet<T>(
  weapon: FirearmKind,
  silenced: boolean,
  trace: (near: number, far: number) => BulletTraceHit<T> | null,
): { target: T; damage: number; exits: number } | null {
  const definition = FIREARMS[weapon];
  let count: number = PENETRATION[weapon][0];
  let power: number = PENETRATION[weapon][1];
  const penetrationDistance = PENETRATION[weapon][2] / 40;
  let damage = silenced && weapon === 'usp' ? 30 : silenced && weapon === 'carbine' ? 33 : definition.bodyDamage;
  const rangeModifier = silenced && weapon === 'carbine' ? 0.95 : definition.rangeModifier;
  let cursor = 0;
  let remaining = definition.maximumRange;
  let modifier = 0.5;
  let exits = 0;
  const visited = new Set<object>();
  while (count > 0 && remaining > 0 && damage > 0) {
    const hit = trace(cursor, cursor + remaining);
    if (!hit || !Number.isFinite(hit.distance) || hit.distance < cursor || hit.distance > cursor + remaining) return null;
    const segment = hit.distance - cursor;
    damage = Math.floor(damage * Math.pow(rangeModifier, segment * 40 / 500));
    count--;
    if (hit.kind === 'target') return {
      target: hit.target,
      damage: weapon === 'shotgun' ? getFirearmDamage(weapon, hit.distance, hit.hitGroup)
        : damage * getFirearmHitGroupMultiplier(weapon, hit.hitGroup),
      exits,
    };
    if (count === 0 || segment > penetrationDistance || visited.has(hit.collider)) return null;
    visited.add(hit.collider);
    const material = PENETRATION_MATERIALS[hit.material];
    power = Math.floor(power * material[0]);
    if (material[1] !== null) modifier = material[1];
    const exit = hit.exitDistance;
    if (exit === null || !Number.isFinite(exit) || exit <= hit.distance || exit - hit.distance > power / 40) return null;
    remaining = (remaining - segment) * 0.5;
    cursor = exit + 0.025;
    damage = Math.floor(damage * modifier);
    exits++;
  }
  return null;
}
