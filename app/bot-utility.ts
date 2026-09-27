// Explicit project approximations shared by both squads and player projectiles.
export type UtilityKind = 'frag' | 'smoke' | 'flash';
export type UtilityPosition = Readonly<{ x: number; y: number; z: number }>;
export type UtilityInventory = { grenades: number; smokes: number; flashes: number };
export const BOT_UTILITY_WINDUP_SECONDS = 0.38;
export const GRENADE_GRAVITY = 12.5;
export const GRENADE_FUSE_SECONDS: Readonly<Record<UtilityKind, number>> = {
  frag: 1.85, smoke: 1.45, flash: 1.5,
};
const inventoryKey = { frag: 'grenades', smoke: 'smokes', flash: 'flashes' } as const;
const finitePosition = (point: UtilityPosition) =>
  Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);

export function canInsertUtility(kind: UtilityKind, active: readonly UtilityKind[], smokeCloudCount: number) {
  return active.length < 2 && (kind !== 'smoke' ||
    smokeCloudCount + active.filter(item => item === 'smoke').length < 2);
}

export function consumeInsertedUtility(inventory: UtilityInventory, kind: UtilityKind, insert: () => boolean) {
  const key = inventoryKey[kind];
  if (!Number.isFinite(inventory[key]) || inventory[key] < 1 || !insert()) return false;
  inventory[key] -= 1;
  return true;
}

export type UtilityContact = {
  position: UtilityPosition;
  direct: boolean;
  sightSeconds: number;
  memorySeconds: number;
};

export function chooseBotUtility(inventory: UtilityInventory, origin: UtilityPosition,
  contact: UtilityContact, suppression: number): UtilityKind | null {
  if (!finitePosition(origin) || !finitePosition(contact.position)) return null;
  const distance = Math.hypot(contact.position.x - origin.x, contact.position.z - origin.z);
  if (distance < 5 || distance > 20 || !Number.isFinite(distance)) return null;
  const confirmed = contact.direct
    ? Number.isFinite(contact.sightSeconds) && contact.sightSeconds >= 0.55
    : Number.isFinite(contact.memorySeconds) && contact.memorySeconds > 0;
  if (!confirmed) return null;
  if (inventory.grenades >= 1 && Number.isFinite(inventory.grenades) && distance <= 16) return 'frag';
  if (inventory.smokes >= 1 && Number.isFinite(inventory.smokes) && distance >= 7 &&
    (!contact.direct || suppression >= 0.35)) return 'smoke';
  if (inventory.flashes >= 1 && Number.isFinite(inventory.flashes) && contact.direct && distance <= 14) return 'flash';
  return null;
}

export function getBotUtilityVelocity(origin: UtilityPosition, target: UtilityPosition): UtilityPosition | null {
  if (!finitePosition(origin) || !finitePosition(target)) return null;
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const distance = Math.hypot(dx, dz);
  // Descending crossing of target height: dy = vy*t - gravity*t*t/2.
  const discriminant = 4.1 ** 2 - 2 * GRENADE_GRAVITY * (target.y - origin.y);
  if (distance <= 0.001 || !Number.isFinite(distance) || !Number.isFinite(discriminant) || discriminant < 0) return null;
  const landingSeconds = (4.1 + Math.sqrt(discriminant)) / GRENADE_GRAVITY;
  const speed = Math.min(12.5, distance / landingSeconds);
  return { x: dx / distance * speed, y: 4.1, z: dz / distance * speed };
}

export type BotUtilityState = {
  pending: { kind: UtilityKind; target: UtilityPosition; remainingSeconds: number } | null;
  cooldownSeconds: number;
};
export const createBotUtilityState = (): BotUtilityState => ({ pending: null, cooldownSeconds: 0 });
export function cancelBotUtility(state: BotUtilityState) {
  if (state.pending) state.cooldownSeconds = Math.max(state.cooldownSeconds, 1);
  state.pending = null;
}

export function stepBotUtility(state: BotUtilityState, input: {
  dt: number;
  active: boolean;
  alive: boolean;
  blinded: boolean;
  reloadSeconds: number;
  objectiveLocked: boolean;
  origin: UtilityPosition;
  contact: UtilityContact;
  suppression: number;
  inventory: UtilityInventory;
}, launch: (kind: UtilityKind, target: UtilityPosition) => boolean): boolean {
  if (!Number.isFinite(input.dt) || input.dt < 0) return Boolean(state.pending);
  state.cooldownSeconds = Math.max(0, state.cooldownSeconds - input.dt);
  if (!input.active || !input.alive || input.blinded || input.objectiveLocked ||
    !Number.isFinite(input.reloadSeconds) || input.reloadSeconds > 0) {
    cancelBotUtility(state);
    return false;
  }
  if (state.pending) {
    state.pending.remainingSeconds = Math.max(0, state.pending.remainingSeconds - input.dt);
    if (state.pending.remainingSeconds <= 1e-9) {
      const { kind, target } = state.pending;
      state.pending = null;
      const inserted = consumeInsertedUtility(input.inventory, kind, () => launch(kind, target));
      state.cooldownSeconds = inserted ? 4 : 1;
    }
    // Movement and weapon fire stay blocked through the launch tick.
    return true;
  }
  if (state.cooldownSeconds > 0) return false;
  const kind = chooseBotUtility(input.inventory, input.origin, input.contact, input.suppression);
  if (!kind) return false;
  state.pending = {
    kind, target: Object.freeze({ ...input.contact.position }),
    remainingSeconds: BOT_UTILITY_WINDUP_SECONDS,
  };
  return true;
}
