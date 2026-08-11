// src/game-engine/sim/agents/reactive.ts
// The `reactive` strategy agent (07's own table): "Address only the
// highest-priority visible warning and otherwise take the cheapest useful
// action." Priority order, per the same table's own reading (progress.md
// Round 16, WP04 chunk W4c): shortfall warning, idle crew, patience loss,
// else cheapest useful action.
//
// A shortfall with zero working crews still counts as "fix income" —
// reaching Red Wall and pledging IS the cheapest available fix for "no
// income at all", so that bootstrap lives inside the shortfall tier rather
// than as a separate special case.

import { GIFT_SPICE_COST, PLEDGE_THRESHOLD } from '../../sietch/loyalty'
import { STARTING_PATIENCE } from '../../quota/quota'
import {
  canPledgeNow, canGiftNow, idleCrewsHere, threatenedPledges, fullAvailable, travelToward,
  bestPledgeTarget,
} from './policyHelpers'
import type { Agent, AgentAction } from './types'
import type { VisibleState } from '../visibleState'

const RED_WALL = 'red_wall_sietch'
/** "Threatened" for this agent's own gift-to-protect trigger — within this
 * many points of UNPLEDGE_THRESHOLD; a policy choice, not an engine number. */
const THREAT_MARGIN = 15

function assignIdleHere(view: VisibleState): AgentAction | null {
  const idle = idleCrewsHere(view)
  if (idle.length === 0) return null
  const fieldId = view.recommendedFieldId(view.player.location)
  if (!fieldId) return null
  return { kind: 'assign', groupId: idle[0].id, task: 'harvest', targetId: fieldId }
}

export const reactiveAgent: Agent = {
  name: 'reactive',
  decide(view: VisibleState): AgentAction | null {
    if (view.pendingSettlement) {
      return { kind: 'settle', amount: fullAvailable(view.pendingSettlement) }
    }

    const idleAnywhere = view.crews.filter(c => c.task === 'idle')

    // Tier 1: shortfall warning — fix income.
    if (!view.projection.onTrack) {
      const assign = assignIdleHere(view)
      if (assign) return assign
      if (idleAnywhere.length > 0) {
        const t = travelToward(view, idleAnywhere[0].locationId)
        if (t) return t
      }
      const home = view.sietches.find(s => s.villageId === RED_WALL)!
      if (!home.pledgedToPlayer) {
        const t = travelToward(view, RED_WALL)
        if (t) return t
        if (canPledgeNow(view, RED_WALL)) return { kind: 'pledge', villageId: RED_WALL }
        return null
      }
    }

    // Tier 2: idle crew, even without a shortfall.
    const assign = assignIdleHere(view)
    if (assign) return assign
    if (idleAnywhere.length > 0) {
      const t = travelToward(view, idleAnywhere[0].locationId)
      if (t) return t
    }

    // Tier 3: patience loss — protect a threatened pledge.
    if (view.quota.patience < STARTING_PATIENCE) {
      const threatened = threatenedPledges(view, THREAT_MARGIN)
      if (threatened.length > 0) {
        const t = travelToward(view, threatened[0].villageId)
        if (t) return t
        if (canGiftNow(view, threatened[0].villageId)) return { kind: 'gift', villageId: threatened[0].villageId }
      }
    }

    // Tier 4: cheapest useful action — a single fixed-cost gift toward the
    // nearest-to-threshold un-pledged sietch, or the pledge itself once free.
    const target = bestPledgeTarget(view)
    if (target) {
      const t = travelToward(view, target.villageId)
      if (t) return t
      if (target.loyalty >= PLEDGE_THRESHOLD && canPledgeNow(view, target.villageId)) {
        return { kind: 'pledge', villageId: target.villageId }
      }
      if (canGiftNow(view, target.villageId) && view.player.spice >= GIFT_SPICE_COST) {
        return { kind: 'gift', villageId: target.villageId }
      }
    }

    return null
  },
}
