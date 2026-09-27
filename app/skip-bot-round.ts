export type BotRoundSkipEligibility = Readonly<{
  botMatch: boolean;
  roundActive: boolean;
  playerAlive: boolean;
  freezeSeconds: number;
  alreadyRequested: boolean;
}>;

export function canSkipBotRoundWait({
  botMatch,
  roundActive,
  playerAlive,
  freezeSeconds,
  alreadyRequested,
}: BotRoundSkipEligibility) {
  return (
    botMatch &&
    roundActive &&
    !playerAlive &&
    Number.isFinite(freezeSeconds) &&
    freezeSeconds <= 0 &&
    !alreadyRequested
  );
}
