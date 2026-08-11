// src/ui/coachMarkCopy.ts
// Text labels for coach marks (03-opening-experience.md "Guidance
// behavior": "No guidance relies only on color, animation, or a canvas
// marker" — every mark carries a short imperative phrase). Authored here,
// alongside the rest of the opening's player-facing wording
// (objectiveCopy.ts's own pattern — CoachMark.tsx renders this, never
// authors it).

const PANEL_LABELS: Record<string, string> = {
  'quota-ledger': 'Check the ledger',
  'crew-panel': 'Assign this crew',
  'pledge-button': 'Pledge here',
  'settle-button': 'Settle the tribute',
}

/** The label for one `data-coach` key (coachMarkTarget.ts). Every
 * `destination-<villageId>` key shares one phrase — the id itself is not
 * player-facing text. */
export function coachMarkLabel(key: string): string {
  if (key.startsWith('destination-')) return 'Travel here'
  return PANEL_LABELS[key] ?? 'Do this next'
}
