export type PlayerDeathCameraVariant = -1 | 1;

export type PlayerCameraPose = Readonly<{
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
}>;

export type PlayerDeathCameraPose = PlayerCameraPose &
  Readonly<{
    roll: number;
  }>;

export const PLAYER_DEATH_CAMERA_DURATION_SECONDS = 0.42;
export const PLAYER_CAMERA_MIN_PITCH = -Math.PI / 2 + 0.08;
export const PLAYER_CAMERA_MAX_PITCH = Math.PI / 2 - 0.08;

const finiteOr = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

export function getPlayerDeathCameraVariant(
  seed: number,
): PlayerDeathCameraVariant {
  const safeSeed = Number.isSafeInteger(seed) ? Math.abs(seed) : 0;
  return safeSeed % 2 === 0 ? -1 : 1;
}

export function getPlayerDeathCameraPose(
  start: PlayerCameraPose,
  elapsedSeconds: number,
  variant: PlayerDeathCameraVariant,
): PlayerDeathCameraPose {
  const safeStart = {
    x: finiteOr(start.x),
    y: finiteOr(start.y),
    z: finiteOr(start.z),
    pitch: finiteOr(start.pitch),
    yaw: finiteOr(start.yaw),
  };
  const elapsed = Math.max(0, finiteOr(elapsedSeconds));
  const progress = Math.min(1, elapsed / PLAYER_DEATH_CAMERA_DURATION_SECONDS);
  const eased = progress * progress * (3 - 2 * progress);
  const direction = variant === 1 ? 1 : -1;

  return {
    x: safeStart.x,
    y: safeStart.y - eased * 0.56,
    z: safeStart.z,
    pitch: Math.min(
      PLAYER_CAMERA_MAX_PITCH,
      Math.max(PLAYER_CAMERA_MIN_PITCH, safeStart.pitch - eased * 0.1),
    ),
    yaw: safeStart.yaw,
    roll: eased === 0 ? 0 : direction * eased * 0.14,
  };
}

export function shouldAdvancePlayerDeathCamera(
  isPlaying: boolean,
  status:
    | 'briefing'
    | 'active'
    | 'round-won'
    | 'round-lost'
    | 'match-won'
    | 'match-lost',
) {
  return (
    isPlaying ||
    status === 'round-won' ||
    status === 'round-lost' ||
    status === 'match-won' ||
    status === 'match-lost'
  );
}

export function shouldUseSpectatorOrbit(
  playerAlive: boolean,
  elapsedSeconds: number,
) {
  const elapsed = Math.max(0, finiteOr(elapsedSeconds));
  return !playerAlive && elapsed >= PLAYER_DEATH_CAMERA_DURATION_SECONDS;
}
