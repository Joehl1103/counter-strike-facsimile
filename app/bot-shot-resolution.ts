import { FIREARMS, type BotDifficulty, type FirearmKind, type HitGroup } from './game-rules.ts';
import { createWeaponBallistics, createSeededRandom, sampleClassicSpread, type BallisticPose } from './weapon-ballistics.ts';

export type ShotVector = Readonly<{ x: number; y: number; z: number }>;
const dot = (a: ShotVector, b: ShotVector) => a.x * b.x + a.y * b.y + a.z * b.z;
const unit = (v: ShotVector): ShotVector => {
  const length = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / length, y: v.y / length, z: v.z / length };
};
const finite = (v: ShotVector) => [v.x, v.y, v.z].every(Number.isFinite);
const clampUnit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

export function getBotAimCone(difficulty: BotDifficulty, aimSkill: number, suppression: number) {
  return ({ recruit: 0.055, standard: 0.025, veteran: 0.01 }[difficulty]) +
    (1 - clampUnit(aimSkill)) * 0.025 + clampUnit(suppression) * 0.035;
}

export function getShotDirection(yaw: number, pitch: number, spreadX = 0, spreadY = 0): ShotVector {
  const forward = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
  const right = { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
  const up = { x: Math.sin(yaw) * Math.sin(pitch), y: Math.cos(pitch), z: Math.cos(yaw) * Math.sin(pitch) };
  return unit({ x: forward.x + right.x * spreadX + up.x * spreadY,
    y: forward.y + up.y * spreadY, z: forward.z + right.z * spreadX + up.z * spreadY });
}

export function createBotShotState(seed: number) {
  const ballistics = createWeaponBallistics(seed);
  let random = createSeededRandom(seed ^ 0x6d2b79f5);
  return {
    reset() { ballistics.reset(); random = createSeededRandom(seed ^ 0x6d2b79f5); },
    resetWeapon(weapon: FirearmKind) { ballistics.resetWeapon(weapon); },
    advance(weapon: FirearmKind, now: number, dt: number, firing: boolean) {
      ballistics.advance(weapon, now, dt, firing);
    },
    shot(weapon: FirearmKind, now: number, pose: BallisticPose, yaw: number, pitch: number, skillCone: number) {
      const punch = ballistics.aim();
      const { spread } = ballistics.shot(weapon, now, pose);
      return Array.from({ length: FIREARMS[weapon].pellets }, () => {
        const sample = sampleClassicSpread(spread + Math.max(0, skillCone), random);
        return getShotDirection(yaw + punch.yaw, pitch + punch.pitch, sample.x, sample.y);
      });
    },
  };
}

export type CharacterShotHit = { distance: number; hitGroup: HitGroup };

// Unrendered player hit proxy. Bot hit groups continue to use their actual meshes.
export function intersectPlayerShot(origin: ShotVector, direction: ShotVector,
  feet: ShotVector, height: number, near = 0, far = Infinity): CharacterShotHit | null {
  if (![origin, direction, feet].every(finite) || !Number.isFinite(height) || height <= 0 ||
    !Number.isFinite(near) || near < 0 || Number.isNaN(far) || far < near ||
    Math.hypot(direction.x, direction.y, direction.z) < 1e-9) return null;
  const ray = unit(direction);
  const x = origin.x - feet.x, y = origin.y - feet.y, z = origin.z - feet.z;
  const hits: CharacterShotHit[] = [];
  // Capped vertical cylinder: include side intersections and both end caps.
  const a = ray.x * ray.x + ray.z * ray.z;
  const b = 2 * (x * ray.x + z * ray.z);
  const c = x * x + z * z - 0.3 ** 2;
  const bodyTop = height * 0.8;
  const addBody = (t: number) => {
    const hitY = y + ray.y * t;
    if (t < 0 || hitY < -1e-9 || hitY > bodyTop + 1e-9) return;
    const ratio = hitY / height;
    hits.push({ distance: t, hitGroup: ratio < 0.36 ? 'leg' : ratio < 0.54 ? 'stomach' : 'torso' });
  };
  if (a > 1e-12) {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      addBody((-b - Math.sqrt(discriminant)) / (2 * a));
      addBody((-b + Math.sqrt(discriminant)) / (2 * a));
    }
  }
  if (Math.abs(ray.y) > 1e-12) for (const cap of [0, bodyTop]) {
    const t = (cap - y) / ray.y;
    if ((x + ray.x * t) ** 2 + (z + ray.z * t) ** 2 <= 0.3 ** 2) addBody(t);
  }
  const toHead = { x, y: y - height * 0.9, z };
  const projection = dot(toHead, ray);
  const discriminant = projection ** 2 - dot(toHead, toHead) + (height * 0.1) ** 2;
  if (discriminant >= 0) {
    for (const distance of [-projection - Math.sqrt(discriminant), -projection + Math.sqrt(discriminant)])
      if (distance >= 0) hits.push({ distance, hitGroup: 'head' });
  }
  return hits.filter(hit => hit.distance >= near && hit.distance <= far)
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

export function nearestShotImpact<T>(worldDistance: number | null, characters: readonly (CharacterShotHit & { target: T })[], maximumRange: number) {
  const target = characters.filter(hit => Number.isFinite(hit.distance) && hit.distance >= 0 && hit.distance <= maximumRange)
    .toSorted((a, b) => a.distance - b.distance)[0];
  const world = worldDistance !== null && Number.isFinite(worldDistance) && worldDistance >= 0 && worldDistance <= maximumRange
    ? worldDistance : null;
  if (world !== null && (!target || world <= target.distance)) return { kind: 'world' as const, distance: world };
  if (target) return { kind: 'target' as const, ...target };
  return { kind: 'miss' as const, distance: maximumRange };
}
