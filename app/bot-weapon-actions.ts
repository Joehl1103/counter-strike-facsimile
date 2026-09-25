import { FIREARMS, reloadMagazine, type FirearmKind, type FirearmAmmo } from './game-rules.ts';
import { advanceShotgunReload, createWeaponSpecialActions, SPECIAL_TIMINGS, type ShotgunReloadPhase } from './weapon-special-actions.ts';
export type BotReload = { phase: ShotgunReloadPhase | 'magazine'; deadline: number };
export function beginBotReload(kind: FirearmKind, ammo: FirearmAmmo, now: number): BotReload | null {
  if (ammo.reserve <= 0 || ammo.magazine >= FIREARMS[kind].magazineSize) return null;
  return kind === 'shotgun'
    ? { phase: 'start', deadline: now + SPECIAL_TIMINGS.m3Start }
    : { phase: 'magazine', deadline: now + FIREARMS[kind].reloadMs };
}
export function stepBotReload(kind: FirearmKind, ammo: FirearmAmmo, state: BotReload, now: number) {
  if (state.phase === 'magazine') {
    const complete = now >= state.deadline;
    return { ammo: complete ? reloadMagazine(ammo, FIREARMS[kind].magazineSize) : { ...ammo }, state: complete ? null : state };
  }
  const next = advanceShotgunReload(state.phase, ammo, now, state.deadline);
  return { ammo: next.ammo, state: next.complete ? null : { phase: next.phase, deadline: next.deadline } };
}
export function constrainBotShotDelay(kind: FirearmKind, requested: number, burst = false) {
  const minimum = kind === 'glock18' && burst ? SPECIAL_TIMINGS.glockBurst : FIREARMS[kind].fireIntervalMs;
  return Math.max(minimum / 1000, Number.isFinite(requested) ? requested : 0);
}

export type BotGlockBurst = { targetId: string | null };

export function stepBotSilencer(actions: ReturnType<typeof createWeaponSpecialActions>, input: {
  weapon: FirearmKind; now: number; active: boolean; alive: boolean; direct: boolean;
  memorySeconds: number; reloadSeconds: number; utilityActive: boolean;
  objectiveLocked: boolean; fireCooldown: number;
}) {
  if ((input.weapon !== 'usp' && input.weapon !== 'carbine') ||
    actions.isSilenced(input.weapon) || !input.active || !input.alive || input.direct ||
    !Number.isFinite(input.memorySeconds) || input.memorySeconds > 0 ||
    !Number.isFinite(input.reloadSeconds) || input.reloadSeconds > 0 ||
    input.utilityActive || input.objectiveLocked ||
    !Number.isFinite(input.fireCooldown) || input.fireCooldown > 0) return false;
  return actions.secondary(input.weapon, input.now);
}

/** Only the shared weapon clock owns continuation deadlines. The bot keeps a target identity. */
export function stepBotGlock(actions: ReturnType<typeof createWeaponSpecialActions>, state: BotGlockBurst, input: {
  weapon: FirearmKind; now: number; active: boolean; alive: boolean; direct: boolean;
  targetId: string | null; facing: boolean; blinded: boolean; distance: number;
  sightSeconds: number; reloadSeconds: number; utilityActive: boolean;
  objectiveLocked: boolean; fireCooldown: number; magazine: number;
}) {
  const mode = actions.snapshot();
  const eligible = input.active && input.alive && input.direct && input.targetId !== null &&
    !input.blinded && Number.isFinite(input.distance) && input.distance >= 0 &&
    Number.isFinite(input.reloadSeconds) && input.reloadSeconds <= 0 &&
    !input.utilityActive && !input.objectiveLocked && input.magazine > 0;
  if (mode.burstDeadlines.length > 0) {
    if (input.weapon !== 'glock18' || !eligible || !input.facing ||
      input.targetId !== state.targetId || !actions.ready(input.weapon, input.now)) {
      actions.cancelPending(input.now);
      state.targetId = null;
      return { canOpen: false, continuation: false };
    }
    const continuation = actions.takeBurstShot(input.now, input.weapon, input.magazine);
    if (actions.snapshot().burstDeadlines.length === 0) state.targetId = null;
    return { canOpen: false, continuation };
  }
  state.targetId = null;
  if (input.weapon === 'glock18' && !mode.burst && eligible &&
    input.distance >= 5 && input.distance <= 18 &&
    Number.isFinite(input.sightSeconds) && input.sightSeconds >= 0.25 &&
    Number.isFinite(input.fireCooldown) && input.fireCooldown <= 0)
    actions.secondary('glock18', input.now);
  return { canOpen: actions.ready(input.weapon, input.now), continuation: false };
}

export function stepBotScope(actions: ReturnType<typeof createWeaponSpecialActions>, input: {
  weapon: FirearmKind; now: number; active: boolean; alive: boolean; direct: boolean;
  blinded: boolean; sightSeconds: number; distance: number; speed: number;
  reloadSeconds: number; utilityActive: boolean; objectiveLocked: boolean; fireCooldown: number;
}) {
  actions.advance(input.now, input.weapon);
  const hold = input.weapon === 'sniper' && input.active && input.alive && input.direct &&
    !input.blinded && Number.isFinite(input.sightSeconds) && input.sightSeconds >= 0.25 &&
    Number.isFinite(input.distance) && input.distance >= 8 &&
    Number.isFinite(input.reloadSeconds) && input.reloadSeconds <= 0 &&
    !input.utilityActive && !input.objectiveLocked;
  const mode = actions.snapshot();
  if (hold && mode.zoom === 0 && mode.resumeZoom === null &&
    Number.isFinite(input.speed) && input.speed >= 0 && input.speed <= 0.08 &&
    Number.isFinite(input.fireCooldown) && input.fireCooldown <= 0 && actions.ready(input.weapon, input.now))
    actions.secondary('sniper', input.now);
  return { hold, canFire: actions.ready(input.weapon, input.now) && (!hold || actions.snapshot().zoom !== 0) };
}
