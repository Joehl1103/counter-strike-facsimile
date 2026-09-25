export type OpponentReloadCue = 'reloadStart' | 'reloadCommit';

export const OPPONENT_RELOAD_HEARING_RADIUS = 16;
export const OPPONENT_RELOAD_SHARED_COOLDOWN_MS = 450;

export function shouldEmitOpponentReloadCue({
  active,
  sourceAlive,
  listenerAlive,
  distance,
  nowMs,
  nextCueAtMs,
}: {
  active: boolean;
  sourceAlive: boolean;
  listenerAlive: boolean;
  distance: number;
  nowMs: number;
  nextCueAtMs: number;
}) {
  return (
    active &&
    sourceAlive &&
    listenerAlive &&
    Number.isFinite(distance) &&
    distance >= 0 &&
    distance < OPPONENT_RELOAD_HEARING_RADIUS &&
    Number.isFinite(nowMs) &&
    Number.isFinite(nextCueAtMs) &&
    nowMs >= nextCueAtMs
  );
}
