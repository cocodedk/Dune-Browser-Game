// src/game-engine/troops/equipment.ts
// PURE single-holder equipment rules — docs/PRD/game-completion/
// 02-runtime-consolidation.md "Equipment": "Every item has one holder: a
// location, an unissued inventory slot, or one crew." An unissued slot IS a
// location holder here (see troops/types.ts's Equipment doc) — the two
// mutation helpers below are the only place a holder should ever change, so
// "never both set" stays true by construction instead of by convention.

import type { Equipment, TroopGroup } from './types'

export type IssueRefusal =
  | 'unknown-equipment' | 'already-issued' | 'no-target' | 'unknown-crew' | 'crew-destroyed'

export type IssueCheck =
  | { ok: true }
  | { ok: false; reason: IssueRefusal }

/**
 * Whether `item` may be issued to `groupId` right now.
 *
 * `groupId` is `null` when the UI has no explicit selection — refused as
 * `'no-target'` rather than defaulting to any crew, which is what makes
 * "issue to the first crew" impossible once more than one exists (02
 * "Equipment": "Issuing equipment targets a selected eligible crew").
 * Checked before the crew lookups so a caller with no item AND no target
 * gets the more specific `'unknown-equipment'`.
 */
export function checkIssue(
  item: Equipment | undefined,
  groupId: string | null,
  group: TroopGroup | undefined,
): IssueCheck {
  if (!item) return { ok: false, reason: 'unknown-equipment' }
  if (item.groupId !== null) return { ok: false, reason: 'already-issued' }
  if (groupId === null) return { ok: false, reason: 'no-target' }
  if (!group) return { ok: false, reason: 'unknown-crew' }
  if (group.size <= 0) return { ok: false, reason: 'crew-destroyed' }
  return { ok: true }
}

/** Move `item` from wherever it sits to crew `groupId`. Clears `locationId`. */
export function issueTo(item: Equipment, groupId: string): Equipment {
  return { ...item, groupId, locationId: null }
}

/** Move `item` off a crew and back to inventory at `locationId`. Clears `groupId`. */
export function unissueAt(item: Equipment, locationId: string): Equipment {
  return { ...item, groupId: null, locationId }
}
