import type { FirearmKind } from './game-rules.ts';

// Reconstructed source defaults: see CS16_REFERENCE.md for revision/branches.
export type BallisticPose = {
  grounded: boolean;
  crouching: boolean;
  speed: number;
  scoped: boolean;
  silenced: boolean;
  burst: boolean;
};
type AccuracyState = {
  shots: number;
  accuracy: number;
  lastShot: number | null;
  releasePending: boolean;
  decreaseAt: number;
  direction: number;
};
type Tuple = readonly [number, number, number, number, number, number, number];
const pistols = {
  glock18: [0.325, 0.275, 0.6, 0.9],
  usp: [0.3, 0.275, 0.6, 0.92],
  p228: [0.325, 0.3, 0.6, 0.9],
  deagle: [0.4, 0.35, 0.55, 0.9],
  elite: [0.325, 0.275, 0.55, 0.88],
  fiveseven: [0.275, 0.25, 0.725, 0.92],
} as const;
const kickback: Record<
  'rifle' | 'carbine' | 'smg',
  Record<'move' | 'air' | 'crouch' | 'stand', Tuple>
> = {
  rifle: {
    move: [1.5, 0.45, 0.225, 0.05, 6.5, 2.5, 7],
    air: [2, 1, 0.5, 0.35, 9, 6, 5],
    crouch: [0.9, 0.35, 0.15, 0.025, 5.5, 1.5, 9],
    stand: [1, 0.375, 0.175, 0.0375, 5.75, 1.75, 8],
  },
  carbine: {
    move: [1, 0.45, 0.28, 0.045, 3.75, 3, 7],
    air: [1.2, 0.5, 0.23, 0.15, 5.5, 3.5, 6],
    crouch: [0.6, 0.3, 0.2, 0.0125, 3.25, 2, 7],
    stand: [0.65, 0.35, 0.25, 0.015, 3.5, 2.25, 7],
  },
  smg: {
    move: [0.5, 0.275, 0.2, 0.03, 3, 2, 10],
    air: [0.9, 0.475, 0.35, 0.0425, 5, 3, 6],
    crouch: [0.225, 0.15, 0.1, 0.015, 2, 1, 10],
    stand: [0.25, 0.175, 0.125, 0.02, 2.25, 1.25, 10],
  },
};
const isAuto = (kind: FirearmKind): kind is keyof typeof kickback =>
  kind in kickback;
const initial = (kind: FirearmKind): AccuracyState => ({
  shots: 0,
  accuracy:
    kind === 'smg'
      ? 0
      : isAuto(kind)
        ? 0.2
        : kind in pistols
          ? pistols[kind as keyof typeof pistols][3]
          : 1,
  lastShot: null,
  releasePending: false,
  decreaseAt: Infinity,
  direction: 1,
});
export function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function getClassicSpread(
  kind: FirearmKind,
  accuracy: number,
  pose: BallisticPose,
) {
  const speed = pose.speed * 40;
  if (kind === 'rifle')
    return !pose.grounded
      ? 0.04 + 0.4 * accuracy
      : speed > 140
        ? 0.04 + 0.07 * accuracy
        : 0.0275 * accuracy;
  if (kind === 'carbine')
    return !pose.grounded
      ? 0.035 + 0.4 * accuracy
      : speed > 140
        ? 0.035 + 0.07 * accuracy
        : (pose.silenced ? 0.025 : 0.02) * accuracy;
  if (kind === 'smg') return (pose.grounded ? 0.04 : 0.2) * accuracy;
  if (kind === 'shotgun') return 0.0675;
  if (kind === 'sniper')
    return (
      (!pose.grounded
        ? 0.85
        : speed > 140
          ? 0.25
          : speed > 10
            ? 0.1
            : pose.crouching
              ? 0
              : 0.001) + (pose.scoped ? 0 : 0.08)
    );
  const coefficients =
    kind === 'glock18'
      ? pose.burst
        ? [1.2, 0.185, 0.095, 0.3]
        : [1, 0.165, 0.075, 0.1]
      : kind === 'usp'
        ? pose.silenced
          ? [1.3, 0.25, 0.125, 0.15]
          : [1.2, 0.225, 0.08, 0.1]
        : kind === 'deagle'
          ? [1.5, 0.25, 0.115, 0.13]
          : kind === 'elite'
            ? [1.3, 0.175, 0.08, 0.1]
            : [1.5, 0.255, 0.075, 0.15];
  const index = !pose.grounded ? 0 : speed > 0 ? 1 : pose.crouching ? 2 : 3;
  return coefficients[index] * (1 - accuracy);
}
export function createWeaponBallistics(seed = 1601) {
  const states = new Map<FirearmKind, AccuracyState>();
  let random = createSeededRandom(seed);
  // Positive pitch is upward in this project's Three camera convention.
  let punch = { pitch: 0, yaw: 0 };
  const state = (kind: FirearmKind) => {
    if (!states.has(kind)) states.set(kind, initial(kind));
    return states.get(kind)!;
  };
  return {
    snapshot(kind: FirearmKind) {
      return { ...state(kind), punch: { ...punch } };
    },
    aim() {
      return {
        pitch: (punch.pitch * Math.PI) / 180,
        yaw: (punch.yaw * Math.PI) / 180,
      };
    },
    spread(kind: FirearmKind, pose: BallisticPose) {
      return getClassicSpread(kind, state(kind).accuracy, pose);
    },
    resetWeapon(kind: FirearmKind) {
      states.set(kind, initial(kind));
    },
    reset() {
      states.clear();
      punch = { pitch: 0, yaw: 0 };
      random = createSeededRandom(seed);
    },
    shot(kind: FirearmKind, now: number, pose: BallisticPose) {
      const current = state(kind);
      const spread = getClassicSpread(kind, current.accuracy, pose);
      const previous = { ...punch };
      current.shots++;
      current.releasePending = true;
      if (isAuto(kind)) {
        const n = current.shots;
        current.accuracy =
          kind === 'rifle'
            ? Math.min(n ** 3 / 200 + 0.35, 1.25)
            : kind === 'carbine'
              ? Math.min(n ** 3 / 220 + 0.3, 1)
              : Math.min(n ** 2 / 220.1 + 0.45, 0.75);
        const branch =
          kind === 'smg' && !pose.grounded
            ? 'air'
            : pose.speed > 0
              ? 'move'
              : !pose.grounded
                ? 'air'
                : pose.crouching
                  ? 'crouch'
                  : 'stand';
        const [u, l, um, lm, uc, lc, change] = kickback[kind][branch];
        punch.pitch = Math.min(uc, punch.pitch + u + (n === 1 ? 0 : n * um));
        punch.yaw = Math.max(
          -lc,
          Math.min(
            lc,
            punch.yaw + current.direction * (l + (n === 1 ? 0 : n * lm)),
          ),
        );
        if (Math.floor(random() * (change + 1)) === 0) current.direction *= -1;
      } else {
        if (kind in pistols) {
          const [threshold, scale, min, max] =
            pistols[kind as keyof typeof pistols];
          if (current.lastShot !== null)
            current.accuracy = Math.max(
              min,
              Math.min(
                max,
                current.accuracy -
                  (threshold - (now - current.lastShot) / 1000) * scale,
              ),
            );
        }
        punch.pitch +=
          kind === 'shotgun'
            ? pose.grounded
              ? 4 + Math.floor(random() * 3)
              : 8 + Math.floor(random() * 4)
            : 2;
      }
      current.lastShot = now;
      return {
        spread,
        kick: {
          pitch: ((punch.pitch - previous.pitch) * Math.PI) / 180,
          yaw: ((punch.yaw - previous.yaw) * Math.PI) / 180,
        },
      };
    },
    advance(
      kind: FirearmKind | null,
      now: number,
      dt: number,
      firing: boolean,
    ) {
      const length = Math.hypot(punch.pitch, punch.yaw);
      const remaining = Math.max(
        0,
        length - (10 + 0.5 * length) * Math.max(0, dt),
      );
      if (length > 0) {
        punch.pitch *= remaining / length;
        punch.yaw *= remaining / length;
      }
      if (!kind || firing) return;
      const current = state(kind);
      if (!isAuto(kind)) {
        current.shots = 0;
        return;
      }
      if (current.releasePending) {
        current.shots = Math.min(current.shots, 15);
        current.decreaseAt = now + 400;
        current.releasePending = false;
      }
      while (current.shots > 0 && now >= current.decreaseAt) {
        current.shots--;
        current.decreaseAt += 22.5;
      }
      // Default reconstruction retains accuracy when shots recover to zero.
    },
  };
}

export function sampleClassicSpread(cone: number, random: () => number) {
  let x: number, y: number;
  do {
    x = random() + random() - 1;
    y = random() + random() - 1;
  } while (x * x + y * y > 1);
  return { x: x * cone, y: y * cone };
}
