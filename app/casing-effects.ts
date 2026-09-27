import type { FirearmKind } from './game-rules';

export const PLAYER_CASING_CAPACITY = 12;

export type PlayerCasingProfile = Readonly<{
  horizontalSpeed: number;
  upwardSpeed: number;
  spinSpeed: number;
  lifetimeSeconds: number;
}>;

export type PlayerCasingMotion = {
  active: boolean;
  ageSeconds: number;
  lifetimeSeconds: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  bounced: boolean;
};

const CASING_PROFILES: Partial<Record<FirearmKind, PlayerCasingProfile>> = {
  glock18: {
    horizontalSpeed: 1.48,
    upwardSpeed: 1.16,
    spinSpeed: 13,
    lifetimeSeconds: 0.7,
  },
  usp: {
    horizontalSpeed: 1.42,
    upwardSpeed: 1.12,
    spinSpeed: 12,
    lifetimeSeconds: 0.72,
  },
  p228: {
    horizontalSpeed: 1.5,
    upwardSpeed: 1.18,
    spinSpeed: 13,
    lifetimeSeconds: 0.74,
  },
  deagle: {
    horizontalSpeed: 1.62,
    upwardSpeed: 1.3,
    spinSpeed: 14,
    lifetimeSeconds: 0.78,
  },
  elite: {
    horizontalSpeed: 1.58,
    upwardSpeed: 1.24,
    spinSpeed: 15,
    lifetimeSeconds: 0.76,
  },
  fiveseven: {
    horizontalSpeed: 1.5,
    upwardSpeed: 1.2,
    spinSpeed: 14,
    lifetimeSeconds: 0.72,
  },
  smg: {
    horizontalSpeed: 1.8,
    upwardSpeed: 1.4,
    spinSpeed: 16,
    lifetimeSeconds: 0.76,
  },
  rifle: {
    horizontalSpeed: 2,
    upwardSpeed: 1.6,
    spinSpeed: 15,
    lifetimeSeconds: 0.82,
  },
  carbine: {
    horizontalSpeed: 1.9,
    upwardSpeed: 1.5,
    spinSpeed: 15,
    lifetimeSeconds: 0.8,
  },
};

export function getPlayerCasingProfile(
  weapon: FirearmKind,
): PlayerCasingProfile | null {
  return CASING_PROFILES[weapon] ?? null;
}

export function getPooledCasingSlot(
  nextSlot: number,
  capacity: number,
): number | null {
  if (
    !Number.isFinite(nextSlot) ||
    nextSlot < 0 ||
    !Number.isInteger(capacity) ||
    capacity <= 0
  )
    return null;
  return Math.floor(nextSlot) % capacity;
}

const finiteOr = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

export function stepPlayerCasingMotion(
  motion: PlayerCasingMotion,
  dtSeconds: number,
  groundHeight = 0.04,
) {
  if (!motion.active) return;
  const dt = Math.min(0.05, Math.max(0, finiteOr(dtSeconds)));
  if (dt <= 0) return;

  motion.ageSeconds = Math.max(0, finiteOr(motion.ageSeconds)) + dt;
  const lifetime = Math.min(
    5,
    Math.max(0.05, finiteOr(motion.lifetimeSeconds, 0.05)),
  );
  if (motion.ageSeconds >= lifetime) {
    motion.active = false;
    return;
  }

  motion.velocityX = finiteOr(motion.velocityX);
  motion.velocityY = finiteOr(motion.velocityY) - 8.8 * dt;
  motion.velocityZ = finiteOr(motion.velocityZ);
  motion.positionX = finiteOr(motion.positionX) + motion.velocityX * dt;
  motion.positionY = finiteOr(motion.positionY) + motion.velocityY * dt;
  motion.positionZ = finiteOr(motion.positionZ) + motion.velocityZ * dt;

  const floor = finiteOr(groundHeight, 0.04);
  if (motion.positionY <= floor) {
    motion.positionY = floor;
    if (!motion.bounced && motion.velocityY < 0) {
      motion.velocityY = -motion.velocityY * 0.3;
      motion.velocityX *= 0.72;
      motion.velocityZ *= 0.72;
      motion.bounced = true;
    } else {
      motion.velocityY = 0;
    }
  }

  motion.rotationX = finiteOr(motion.rotationX) + finiteOr(motion.spinX) * dt;
  motion.rotationY = finiteOr(motion.rotationY) + finiteOr(motion.spinY) * dt;
  motion.rotationZ = finiteOr(motion.rotationZ) + finiteOr(motion.spinZ) * dt;
}
