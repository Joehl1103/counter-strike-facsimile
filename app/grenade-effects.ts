import { applyArmorDamage, getExplosionDamage, type Side } from './game-rules.ts';
import type { CombatHealth } from './combat-damage.ts';

export type ExplosiveKind = 'frag' | 'bomb';
export type BlastOwner = Readonly<{ id: string; side: Side }>;
export type BlastTarget = Readonly<CombatHealth & {
  id: string; side: Side; alive: boolean; distance: number; covered: boolean;
}>;

// Explicit project approximation; the same tuning applies to every actor.
export const EXPLOSIVE_PROFILE = {
  frag: { radius: 9, maximumDamage: 115 },
  bomb: { radius: 24, maximumDamage: 500 },
} as const;
export const BLAST_COVER_SCALE = 0.35;

export function shouldReceiveBlast(kind: ExplosiveKind, owner: BlastOwner | null, target: BlastTarget) {
  return target.alive && (kind === 'bomb' || (owner !== null &&
    (target.id === owner.id || target.side !== owner.side)));
}

/** Compute all casualties before callers perform drops, credits, or round settlement. */
export function resolveBlast(kind: ExplosiveKind, owner: BlastOwner | null, targets: readonly BlastTarget[]) {
  const profile = EXPLOSIVE_PROFILE[kind];
  return targets.map(target => {
    const rawDamage = shouldReceiveBlast(kind, owner, target) &&
      Number.isFinite(target.distance) && target.distance >= 0
      ? getExplosionDamage(target.distance, profile.radius, profile.maximumDamage) *
        (target.covered ? BLAST_COVER_SCALE : 1)
      : 0;
    const result = applyArmorDamage({ ...target, rawDamage, source: 'explosion' });
    const killed = target.alive && target.health > 0 && result.health <= 0;
    return {
      id: target.id, health: result.health, armor: result.armor, helmet: result.helmet,
      healthDamage: Math.max(0, target.health - result.health), killed,
      creditId: killed && kind === 'frag' && owner && owner.side !== target.side
        ? owner.id : null,
    };
  });
}
