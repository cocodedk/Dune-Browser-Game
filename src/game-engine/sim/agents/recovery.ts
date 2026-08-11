// src/game-engine/sim/agents/recovery.ts
// The `recovery` strategy agent (07's own table): "Begin from patience 1,
// arrears, a damaged field, and a threatened pledge; attempt stabilization."
// Progress.md Round 16's own reading translates this into distressedCampaign
// .ts's constructed state; this file is the STABILIZATION policy run from
// it (invariant 2's own probe — recoveryProbe.test.ts).
//
// Three moves, in the order 07's own W4c scope note gives: settle minimum
// viable (never overpay past the partial-band floor while broke), reassign
// to best field (fix the damaged field before chasing anything else), gift
// only if it protects a pledge (never a speculative expansion gift).

import { canGiftNow, threatenedPledges, travelToward } from './policyHelpers'
import type { Agent, AgentAction } from './types'
import type { VisibleState, VisibleCrew } from '../visibleState'

/** "Threatened" for this agent's own protective-gift trigger — recovery's
 * own fixture starts a pledge already this close to UNPLEDGE_THRESHOLD
 * (distressedCampaign.ts's own citation), so a tight margin is enough. */
const THREAT_MARGIN = 10

function needsReassign(view: VisibleState, c: VisibleCrew): string | null {
  const best = view.recommendedFieldId(c.locationId)
  if (!best) return null
  if (c.task !== 'harvest' || c.taskTargetId !== best) return best
  return null
}

export const recoveryAgent: Agent = {
  name: 'recovery',
  decide(view: VisibleState): AgentAction | null {
    if (view.pendingSettlement) {
      const p = view.pendingSettlement
      // Settle minimum viable: enough to clear the partial-band floor
      // (never a 'short' settlement — that is the exact patience-loss this
      // agent exists to stop) but never a spice-hoarding overpay either.
      const amount = Math.min(p.stock, p.minPartialPayment)
      return { kind: 'settle', amount }
    }

    // Reassign to best field: fix whatever crew is standing where the
    // player already is first (no wasted travel), else travel to the one
    // that most needs it.
    const here = view.crews.find(c => c.locationId === view.player.location && needsReassign(view, c))
    if (here) {
      const fieldId = needsReassign(view, here)!
      return { kind: 'assign', groupId: here.id, task: 'harvest', targetId: fieldId }
    }
    const elsewhere = view.crews.find(c => needsReassign(view, c) !== null)
    if (elsewhere) {
      const travel = travelToward(view, elsewhere.locationId)
      if (travel) return travel
    }

    // Gift only if it protects a pledge already close to neglect-unpledge.
    const threatened = threatenedPledges(view, THREAT_MARGIN)
    if (threatened.length > 0) {
      const travel = travelToward(view, threatened[0].villageId)
      if (travel) return travel
      if (canGiftNow(view, threatened[0].villageId)) return { kind: 'gift', villageId: threatened[0].villageId }
    }

    return null
  },
}
