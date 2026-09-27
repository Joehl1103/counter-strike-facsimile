import { applyArmorDamage, type FirearmKind, type HitGroup } from './game-rules.ts';
export type CombatHealth = { health: number; armor: number; helmet: boolean };
// Range, material loss and hitgroup multiplication have already been traced.
export function resolveBulletDamage(target: CombatHealth, weapon: FirearmKind,
  hitGroup: HitGroup, rawDamage: number) {
  const state = applyArmorDamage({
    ...target, rawDamage,
    source: 'bullet', weapon, hitGroup,
  });
  return { ...state, healthDamage: Math.max(0, target.health - state.health) };
}
