// src/game-engine/economy/sietchLoyaltyRun.ts
// Day-boundary sietch loyalty neglect — docs/PRD/game-completion/
// 02-runtime-consolidation.md "Day-boundary order" step 7 ("update loyalty
// neglect"). dayRunner.ts named this system as not yet authored; this is
// it, and the sole production caller of sietch/loyalty.ts's decayLoyalty.
//
// Loyalty is deliberately reversible (loyalty.ts's own header): a pledged
// sietch left unvisited for NEGLECT_DAYS releases its pledge, which is what
// makes `loss_abandoned` (every sietch un-pledged) reachable in play rather
// than only in theory.

import { world } from '../GameState'
import { currentDay } from '../TimeSystem'
import { pushEvent } from '../EventSystem'
import { decayLoyalty } from '../sietch/loyalty'
import { readLoyaltyState, writeLoyaltyState } from '../sietch/loyaltyState'
import { pledgedCount } from '../sietch/assignTask'

/**
 * No difficulty lever is authored for sietch neglect specifically —
 * DifficultyConfig's `reputationDecayMultiplier` scales faction reputation,
 * a different system entirely, and reusing it here would silently couple
 * two unrelated balance dials. Every difficulty decays loyalty at the same
 * rate until one is authored.
 */
const DECAY_MULTIPLIER = 1

export function runSietchLoyaltyDay(): void {
  const day = currentDay()
  const releasedNames: string[] = []

  world.sietches = world.sietches.map((sietch) => {
    const result = decayLoyalty(readLoyaltyState(sietch), day, DECAY_MULTIPLIER)
    if (result.unpledged) {
      const village = world.villages.find(v => v.id === sietch.villageId)
      releasedNames.push(village?.name ?? sietch.villageId)
    }
    return writeLoyaltyState(sietch, result.state)
  })

  world.flags['pledged.count'] = pledgedCount(world.sietches)

  if (releasedNames.length > 0) {
    pushEvent('sietch_pledged', `Neglected too long, ${releasedNames.join(', ')} withdraw their pledge.`)
  }
}
