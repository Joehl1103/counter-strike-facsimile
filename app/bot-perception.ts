// Project AI acquisition cone: 120 degrees, independent of render frame rate.
export const BOT_VIEW_DOT_MINIMUM = 0.5;
export function canAcquireBotContact(input: {
  alive: boolean; blinded: boolean; distance: number; range: number;
  viewDot: number; clearLine: boolean; smokeBlocked: boolean;
}) {
  return input.alive && !input.blinded && input.clearLine && !input.smokeBlocked
    && Number.isFinite(input.distance) && input.distance >= 0 && input.distance < input.range
    && Number.isFinite(input.viewDot) && input.viewDot >= BOT_VIEW_DOT_MINIMUM - 1e-12;
}
export function nearestVisibleContact<T extends {id: string; distance: number; visible: boolean}>(contacts: readonly T[]): T | null {
  return contacts.filter(c => c.visible && Number.isFinite(c.distance) && c.distance >= 0)
    .sort((a,b) => a.distance-b.distance || a.id.localeCompare(b.id))[0] ?? null;
}
