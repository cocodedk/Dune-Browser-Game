// src/ui/coachMarkTarget.ts
// Pure derivation of "which control does the active coach mark point at" —
// split out of CoachMark.tsx so the rule is unit-testable without a DOM
// (03-opening-experience.md "Guidance behavior").
//
// Reuses openingObjectives.ts's own targetHint for every step except two
// UI-only refinements that engine seam has no reason to know about:
//
// - act1.earn_trust's targetHint is `{kind:'location', id:'red_wall_sietch'}`
//   — correct for the engine's stable seam, useless as a coach mark once the
//   player has actually arrived (the destination-list row for your CURRENT
//   location never renders — DestinationList.tsx excludes it). The real
//   actionable control at that point is the Pledge button:
//   EARNED_TRUST_FLAG is written by the pledge command itself
//   (pledgeCommand.ts), not by Beat 4's trust dialogue, so "earn trust" is
//   still the active step right up until Pledge is actually clicked.
// - act1.prepare_q1 targets the ledger throughout Beats 5-6, but once day
//   12's pending decision is open (03 Beat 7) the ledger sits behind
//   SettlementModal's overlay — the actionable control is its Settle
//   button.
//
// Suppressed entirely while a dialogue is open: every conversation already
// has DialoguePanel's own full-attention overlay, and a mark trying to
// point at whatever is behind it would either be invisible or fight a modal
// for the player's eyes — 03's "never blocks the rest of the screen" rule
// cuts both ways.

import type { ObjectiveRecord } from '../game-engine/acts/openingObjectives'
import type { WorldState } from '../types'

/** The `data-coach` lookup key the active objective's mark should target,
 * or null when no mark should show right now. */
export function coachMarkKey(record: ObjectiveRecord | null, world: WorldState): string | null {
  if (!record) return null
  if (world.dialogue) return null
  if (record.id === 'act1.earn_trust') return 'pledge-button'
  if (record.id === 'act1.prepare_q1' && world.pendingSettlement) return 'settle-button'

  const hint = record.targetHint
  return hint.kind === 'location' ? `destination-${hint.id}` : hint.key
}
