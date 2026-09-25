import type { WeaponKind, FirearmAmmo } from './game-rules.ts';

// Timing/state reference: ReGameDLL-CS 781a68ae1c6fb652cf4fbc894970b4fb4dde19f9.
// This project uses its default USP adjustment timing, not REGAMEDLL_FIXES.
export type ZoomStage = 0 | 1 | 2;
export type ShotgunReloadPhase = 'start' | 'insert' | 'pump';
export const SPECIAL_TIMINGS = Object.freeze({ glockToggle: 300, glockBurst: 500,
  glockFollowup: 100, uspSilencer: 3000, m4Silencer: 2000, zoomToggle: 300,
  awpCycle: 1450, m3Start: 550, m3Insert: 450, m3Pump: 1500, m3Cycle: 875 });

export function createWeaponSpecialActions() {
  let burst = false;
  let burstDeadlines: number[] = [];
  const silenced = { usp: false, carbine: false };
  const locks = new Map<WeaponKind, number>();
  let zoom: ZoomStage = 0;
  let resumeZoom: { stage: ZoomStage; at: number } | null = null;
  return {
    snapshot() { return { burst, silenced: { ...silenced }, zoom, burstDeadlines: [...burstDeadlines], resumeZoom: resumeZoom && { ...resumeZoom } }; },
    ready(weapon: WeaponKind, now: number) { return now >= (locks.get(weapon) ?? 0); },
    isSilenced(weapon: WeaponKind) { return (weapon === 'usp' || weapon === 'carbine') && silenced[weapon]; },
    secondary(weapon: WeaponKind, now: number) {
      if (!Number.isFinite(now) || now < (locks.get(weapon) ?? 0)) return false;
      if (weapon === 'glock18') {
        if (burstDeadlines.length) return false;
        burst = !burst;
        locks.set(weapon, now + SPECIAL_TIMINGS.glockToggle);
      } else if (weapon === 'usp' || weapon === 'carbine') {
        silenced[weapon] = !silenced[weapon];
        locks.set(weapon, now + (weapon === 'usp' ? SPECIAL_TIMINGS.uspSilencer : SPECIAL_TIMINGS.m4Silencer));
      } else if (weapon === 'sniper') {
        zoom = ((zoom + 1) % 3) as ZoomStage;
        resumeZoom = null;
        locks.set(weapon, now + SPECIAL_TIMINGS.zoomToggle);
      } else return false;
      return true;
    },
    committedShot(weapon: WeaponKind, now: number, continuation = false) {
      if (weapon === 'glock18' && burst && !continuation) {
        burstDeadlines = [now + SPECIAL_TIMINGS.glockFollowup, now + SPECIAL_TIMINGS.glockFollowup * 2];
      }
      if (weapon === 'sniper' && zoom) {
        resumeZoom = { stage: zoom, at: now + SPECIAL_TIMINGS.awpCycle };
        zoom = 0;
      }
    },
    takeBurstShot(now: number, weapon: WeaponKind, ammo: number) {
      if (weapon !== 'glock18' || ammo <= 0) { burstDeadlines = []; return false; }
      if (!burstDeadlines.length || now < burstDeadlines[0]) return false;
      burstDeadlines.shift();
      return true;
    },
    advance(now: number, weapon: WeaponKind) {
      if (resumeZoom && now >= resumeZoom.at) {
        if (weapon === 'sniper') zoom = resumeZoom.stage;
        resumeZoom = null;
        return true;
      }
      return false;
    },
    cancelPending(now: number) {
      // Interrupted adjustments restore the previous attachment. Completed ones
      // persist across selection; cancellation cannot bypass the adjustment time.
      for (const weapon of ['usp', 'carbine'] as const) {
        if (now < (locks.get(weapon) ?? 0)) silenced[weapon] = !silenced[weapon];
      }
      locks.clear();
      burstDeadlines = []; resumeZoom = null; zoom = 0;
    },
    reset() { burst = false; burstDeadlines = []; silenced.usp = false; silenced.carbine = false; locks.clear(); zoom = 0; resumeZoom = null; },
  };
}

export function getSilencerDamageMultiplier(weapon: WeaponKind, silenced: boolean) {
  if (!silenced) return 1;
  return weapon === 'usp' ? 30 / 34 : weapon === 'carbine' ? 33 / 32 : 1;
}

export function advanceShotgunReload(phase: ShotgunReloadPhase, ammo: FirearmAmmo, now: number, deadline: number) {
  if (now < deadline) return { phase, ammo: { ...ammo }, deadline, complete: false, inserted: false };
  if (phase === 'pump') return { phase, ammo: { ...ammo }, deadline, complete: true, inserted: false };
  const inserted = phase === 'insert' && ammo.magazine < 8 && ammo.reserve > 0;
  const nextAmmo = { magazine: ammo.magazine + Number(inserted), reserve: ammo.reserve - Number(inserted) };
  const nextPhase: ShotgunReloadPhase = nextAmmo.magazine >= 8 || nextAmmo.reserve <= 0 ? 'pump' : 'insert';
  return { phase: nextPhase, ammo: nextAmmo,
    deadline: deadline + (nextPhase === 'pump' ? SPECIAL_TIMINGS.m3Pump : SPECIAL_TIMINGS.m3Insert),
    complete: false, inserted };
}

export function getKnifeAttack(stab: boolean, hit: boolean, backstab = false) {
  return { range: (stab ? 32 : 48) / 40,
    // Project default swing branch; no claim of original first-swing quirks.
    damage: stab ? 65 * (backstab ? 3 : 1) : 15,
    cooldownMs: stab ? (hit ? 1100 : 1000) : (hit ? 400 : 350) };
}

export function canCommitWeaponAction(input: {
  active: boolean; alive: boolean; controlsActive: boolean; buyOpen: boolean;
  now: number; freezeEnds: number; equipReadyAt: number; nextShot: number;
  specialReady: boolean; burstContinuation: boolean;
}) {
  return input.active && input.alive && input.controlsActive && !input.buyOpen &&
    Number.isFinite(input.now) && input.now >= input.freezeEnds &&
    input.now >= input.equipReadyAt && input.specialReady &&
    (input.burstContinuation || input.now >= input.nextShot);
}
