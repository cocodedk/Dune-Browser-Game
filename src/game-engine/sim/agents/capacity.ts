// src/game-engine/sim/agents/capacity.ts
// The `capacity` strategy agent (07's own table): "Acquire pledges and
// crews early while preserving a visible minimum reserve."
//
// Unlike `reserve` (which only invests once the ledger already shows
// surplus), capacity spends toward expansion FIRST and treats MIN_RESERVE
// as the one thing it protects — the opposite ordering, which is the whole
// point of running both strategies through the same seed sweep (07's
// dominance invariant needs genuinely different priorities to compare).

import { GIFT_SPICE_COST, PLEDGE_THRESHOLD } from '../../sietch/loyalty'
import {
  canPledgeNow, canGiftNow, pledgeCapacityLeft, idleCrewsHere, fullAvailable, travelToward,
  bestPledgeTarget,
} from './policyHelpers'
import type { Agent, AgentAction } from './types'
import type { VisibleState } from '../visibleState'

/** The agent's own chosen floor — never spend a gift that would drop stock
 * below one further gift's worth. A policy choice, not an engine number
 * (07's own phrase is "a visible minimum reserve", not a fixed constant). */
const MIN_RESERVE = GIFT_SPICE_COST

export const capacityAgent: Agent = {
  name: 'capacity',
  decide(view: VisibleState): AgentAction | null {
    if (view.pendingSettlement) {
      return { kind: 'settle', amount: fullAvailable(view.pendingSettlement) }
    }

    // Idle crews are working capacity already paid for — put them to work
    // before spending on the next pledge.
    const idle = idleCrewsHere(view)
    if (idle.length > 0) {
      const fieldId = view.recommendedFieldId(view.player.location)
      if (fieldId) return { kind: 'assign', groupId: idle[0].id, task: 'harvest', targetId: fieldId }
    }

    if (pledgeCapacityLeft(view) <= 0) return null

    const target = bestPledgeTarget(view)
    if (!target) return null

    const travel = travelToward(view, target.villageId)
    if (travel) return travel

    if (target.loyalty < PLEDGE_THRESHOLD) {
      if (canGiftNow(view, target.villageId) && view.player.spice - GIFT_SPICE_COST >= MIN_RESERVE) {
        return { kind: 'gift', villageId: target.villageId }
      }
      return null // affordable-but-under-reserve, or capped for this visit — wait
    }
    if (canPledgeNow(view, target.villageId)) return { kind: 'pledge', villageId: target.villageId }

    return null
  },
}
