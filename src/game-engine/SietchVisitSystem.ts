// src/game-engine/SietchVisitSystem.ts
// Handler module: what happens to a sietch's SietchState loyalty when the
// player visits or gives a gift — as opposed to SietchSystem.ts, which owns
// the pledge chain itself. Split out so a pledge's atomic chain stays easy
// to read on its own (docs/PRD/game-completion/02-runtime-consolidation.md
// "Sietches and loyalty").

import { world } from './GameState'
import { currentDay } from './TimeSystem'
import { pushEvent } from './EventSystem'
import { onArrival, giveGift, GIFT_PER_VISIT_CAP, GIFT_SPICE_COST } from './sietch/loyalty'
import { readLoyaltyState, writeLoyaltyState } from './sietch/loyaltyState'
import { ok, fail, type CommandOutcome } from './commands/outcome'
import type { VillageId } from '../types'

/**
 * Arrival at a sietch-kind location — TravelSystem.checkTravelArrival's
 * sietch branch. Applies loyalty.ts's authored visit rule (onArrival): reset
 * the neglect clock and the per-visit gift budget. Deliberately does NOT
 * grant a flat loyalty bump — unlike the legacy Village.loyalty +5 this
 * supersedes for sietch kinds, the authored rule grants loyalty only through
 * gifts and dialogue, never for merely showing up (loyalty.ts's own header:
 * "not a single free click").
 */
export function visitPlayerSietch(villageId: VillageId): void {
  const index = world.sietches.findIndex(s => s.villageId === villageId)
  if (index < 0) return
  const day = currentDay()
  world.sietches = world.sietches.map((s, i) =>
    i === index ? writeLoyaltyState(s, onArrival(readLoyaltyState(s), day)) : s,
  )
}

export type GiftRefusal = 'not-present' | 'no-sietch' | 'gift-cap-reached' | 'insufficient-spice'

/**
 * Spend spice for loyalty at the sietch the player is standing at — the
 * player-initiated command seam for sietch/loyalty.ts's giveGift (02
 * "Sietches and loyalty": wired "as engine functions with command seams
 * where player-initiated"). Presence is required for the same reason
 * assignCrew's remote-order gate is: the per-visit gift cap only limits
 * anything if the player had to travel to spend it.
 *
 * The two refusal codes duplicate giveGift's own internal conditions so the
 * command can report which one applies — GiftResult.accepted is a single
 * boolean and cannot distinguish them itself.
 */
export function giftPlayerSietch(villageId: VillageId): CommandOutcome<'gifted', GiftRefusal> {
  if (world.player.location !== villageId) return fail('not-present')

  const index = world.sietches.findIndex(s => s.villageId === villageId)
  if (index < 0) return fail('no-sietch')

  const state = readLoyaltyState(world.sietches[index])
  if (state.giftedThisVisit >= GIFT_PER_VISIT_CAP) return fail('gift-cap-reached')
  if (world.player.spice < GIFT_SPICE_COST) return fail('insufficient-spice')

  const result = giveGift(state, world.player.spice)
  world.player.spice -= result.spiceSpent
  world.sietches = world.sietches.map((s, i) =>
    i === index ? writeLoyaltyState(s, result.state) : s,
  )

  const village = world.villages.find(v => v.id === villageId)
  pushEvent(
    'sietch_pledged',
    `The Fremen at ${village?.name ?? villageId} accept your gift. (+${result.loyaltyGained} loyalty)`,
  )
  return ok('gifted')
}
