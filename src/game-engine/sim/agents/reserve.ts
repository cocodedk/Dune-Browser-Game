// src/game-engine/sim/agents/reserve.ts
// The `reserve` strategy agent (07-balance-playtest-and-release.md "Strategy
// agents" table): "Protect the next tribute first; invest only projected
// surplus."
//
// Opening is the SAME minimal reserve-line play reserveLine.ts already
// proves out (briefing/ledger are mandatory dialogue, walked by the shared
// dialoguePolicy — this file only needs to choose the travel/pledge/assign
// half): one crew at Red Wall, no second pledge, until the ledger's own
// projection shows real headroom. Only then does "invest" mean anything —
// the same second-pledge move investLine.ts plays, gated on
// `projection.surplus` rather than always taken, which is the one thing
// distinguishing this agent from `capacity`.

import { GIFT_SPICE_COST, PLEDGE_THRESHOLD } from '../../sietch/loyalty'
import { canPledgeNow, canGiftNow, idleCrewsHere, fullAvailable, travelToward } from './policyHelpers'
import type { Agent, AgentAction } from './types'
import type { VisibleState } from '../visibleState'

const RED_WALL = 'red_wall_sietch'
const SECOND_TARGET = 'sietch_tabr'
/** A second pledge costs up to two gifts (Tabr's own PLEDGE_THRESHOLD gap,
 * investLine.ts's own citation) plus the crew's own upkeep headroom — only
 * pursued once the forecast clears cost-plus-a-margin, not merely cost. */
const INVEST_SURPLUS_MARGIN = 2 * GIFT_SPICE_COST + 20

export const reserveAgent: Agent = {
  name: 'reserve',
  decide(view: VisibleState): AgentAction | null {
    if (view.pendingSettlement) {
      return { kind: 'settle', amount: fullAvailable(view.pendingSettlement) }
    }

    // Phase 1: reach Red Wall, earn trust (mandatory dialogue, handled by
    // the shared policy), pledge, put the crew to work. Nothing else is
    // "protecting the next tribute" — it IS the next tribute's only income.
    const home = view.sietches.find(s => s.villageId === RED_WALL)!
    if (!home.pledgedToPlayer) {
      const travel = travelToward(view, RED_WALL)
      if (travel) return travel
      if (canPledgeNow(view, RED_WALL)) return { kind: 'pledge', villageId: RED_WALL }
      // Trust dialogue already walked on arrival; loyalty should already
      // clear PLEDGE_THRESHOLD (opening-redwall-trust.ts's own citation).
      // Nothing useful left this instant — wait for the clock.
      return null
    }
    const idleAtHome = idleCrewsHere(view)
    if (idleAtHome.length > 0) {
      const fieldId = view.recommendedFieldId(RED_WALL)
      if (fieldId) return { kind: 'assign', groupId: idleAtHome[0].id, task: 'harvest', targetId: fieldId }
    }

    // Phase 2: invest ONLY when the ledger's own projection shows surplus
    // past the second pledge's own cost — never on the mere hope of one.
    const second = view.sietches.find(s => s.villageId === SECOND_TARGET)
    if (second && !second.pledgedToPlayer && view.projection.surplus > INVEST_SURPLUS_MARGIN) {
      const travel = travelToward(view, SECOND_TARGET)
      if (travel) return travel
      if (second.loyalty < PLEDGE_THRESHOLD && canGiftNow(view, SECOND_TARGET)) {
        return { kind: 'gift', villageId: SECOND_TARGET }
      }
      if (canPledgeNow(view, SECOND_TARGET)) return { kind: 'pledge', villageId: SECOND_TARGET }
      const idleThere = idleCrewsHere(view)
      if (idleThere.length > 0) {
        const fieldId = view.recommendedFieldId(SECOND_TARGET)
        if (fieldId) return { kind: 'assign', groupId: idleThere[0].id, task: 'harvest', targetId: fieldId }
      }
    }

    return null
  },
}
