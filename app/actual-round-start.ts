export type ActualRoundStartStatus =
  | 'briefing'
  | 'active'
  | 'round-won'
  | 'round-lost'
  | 'match-won'
  | 'match-lost';

export type RoundRestart = (newMatch: boolean) => void;

export function dispatchActualRoundStart(
  status: ActualRoundStartStatus,
  restart: RoundRestart,
): void {
  const startsNewMatch =
    status === 'briefing' || status === 'match-won' || status === 'match-lost';
  restart(startsNewMatch);
}
