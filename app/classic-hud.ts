/** Strip prototype omniscient status text; local action/readout prompts remain. */
export function getClassicStatusMessage(message: string, ownPlant: boolean, ownDefuse: boolean) {
  if (/BOMB PLANTED|BOMB DETONATED|BOMB DEFUSED/.test(message)) {
    if (/BOMB PLANTED/.test(message)) return 'The bomb has been planted.';
    return message;
  }
  if (!ownPlant && /PLANTING|BEING PLANTED|PLANT INTERRUPTED/.test(message)) return '';
  if (!ownDefuse && /DEFUSING|DEFENDERS RETAKING/.test(message)) return '';
  if (/ATTACK EXPECTED|ATTACKERS MOVING|ATTACKERS ARE RECOVERING|HOLD THE DEVICE|RECOVERED THE BOMB|BOMB DROPPED/.test(message)) return '';
  if (message.startsWith('FREEZE')) return message.match(/^FREEZE \d+/)?.[0] ?? 'Prepare to move out.';
  return message;
}

/** Attackers know their own plan; defenders are assigned both possible sites. */
export function getClassicRoundAssignment(playerSide: 'ct' | 't', approach: string, targetSite: string): string {
  return playerSide === 'ct' ? 'DEFEND SITES A AND B' : `${approach.toUpperCase()} · SITE ${targetSite}`;
}
