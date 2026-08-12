// src/game-engine/sim/agents/novice.ts
// The `novice` strategy agent (07's own table): "Follow objective Show
// actions and default recommendations without optimizing forecasts."
//
// Deliberately reads NOTHING from `view.projection` — no surplus check, no
// onTrack branch anywhere in this file — that absence IS the policy (07:
// "never optimizes forecasts"). Every decision instead comes from
// acts/openingObjectives.ts's own targetHint (the same field ObjectivePanel
// .tsx's Show action reads) or from view.recommendedFieldId /
// defaultSettleAmount, the exact defaults CrewCard.tsx's ★ and the
// settlement modal's Enter key already offer a real player.

import { canPledgeNow, idleCrewsHere, fullAvailable, travelToward } from './policyHelpers'
import type { Agent, AgentAction } from './types'
import type { VisibleState } from '../visibleState'

const RED_WALL = 'red_wall_sietch'

function assignIdleHere(view: VisibleState): AgentAction | null {
  const idle = idleCrewsHere(view)
  if (idle.length === 0) return null
  const fieldId = view.recommendedFieldId(view.player.location)
  if (!fieldId) return null
  return { kind: 'assign', groupId: idle[0].id, task: 'harvest', targetId: fieldId }
}

export const noviceAgent: Agent = {
  name: 'novice',
  decide(view: VisibleState): AgentAction | null {
    if (view.pendingSettlement) {
      return { kind: 'settle', amount: fullAvailable(view.pendingSettlement) }
    }

    const obj = view.activeObjective
    if (obj) {
      if (obj.targetHint.kind === 'location') {
        const travel = travelToward(view, obj.targetHint.id)
        if (travel) return travel
        // Already at the Show target (or a hop is currently refused): the
        // one documented action that completes this specific step
        // (mandatory dialogue on arrival is walked by the shared dialogue
        // policy, not chosen here).
        if (obj.id === 'act1.earn_trust' && canPledgeNow(view, RED_WALL)) {
          return { kind: 'pledge', villageId: RED_WALL }
        }
        return null
      }
      // obj.targetHint.kind === 'panel'
      if (obj.id === 'act1.order_first_harvest') {
        const assign = assignIdleHere(view)
        if (assign) return assign
      }
      return null
    }

    // Past the opening chain (no more Show target): keep following the
    // same default recommendation for any crew standing idle, never a
    // forecast-driven expansion.
    return assignIdleHere(view)
  },
}
