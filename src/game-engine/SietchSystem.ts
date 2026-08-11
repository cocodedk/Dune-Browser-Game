// src/game-engine/SietchSystem.ts
// Handler module: mutates world.sietches in response to player commands
// and emits game events. Analogous to TravelSystem.ts.
//
// assignPlayerSietchTask/stopPlayerSietchTask (the legacy threshold task
// system's SietchSystem wrappers) were removed in WP02e — see
// legacy-authority-inventory.md category 2. Crews (the assign-crew command,
// commands/assignCrewCommand.ts) are the sole production authority now.

import { world } from './GameState'
import { CHARISMA_PER_PLEDGE, checkPledge, type PledgeRefusal as LoyaltyRefusal } from './sietch/loyalty'
import { readLoyaltyState } from './sietch/loyaltyState'
import { pushEvent } from './EventSystem'
import { pledgedCount } from './sietch/assignTask'
import { groupsForPledgedSietch } from '../data/troopGroups'
import { ok, fail, type CommandOutcome } from './commands/outcome'
import type { VillageId } from '../types'

/**
 * Every reason the atomic five-step pledge chain refuses
 * (docs/PRD/game-completion/02-runtime-consolidation.md "Sietches and
 * loyalty"). 'not-present'/'no-sietch'/'not-fremen' come from this chain's
 * own steps 1-2; 'already-pledged'/'not-loyal-enough'/'charisma-cap' are
 * sietch/loyalty.ts's checkPledge, run wholesale as step 3's authored rule
 * rather than reimplemented here.
 */
export type PledgeRefusal =
  | 'not-present' | 'no-sietch' | 'not-fremen' | LoyaltyRefusal

/**
 * Read-only precondition check for the five-step pledge chain, against live
 * `world` state. Steps run in the chain's literal order and stop at the
 * first failure: step 1 (presence) is checked before step 2 even asks
 * whether a sietch record exists at villageId, so a villageId that fails
 * both reports 'not-present' — you cannot be "present" somewhere with no
 * sietch either. Prescience is never consulted: no level of it permits a
 * remote pledge (02's step 1, "never a remote pledge").
 */
export function checkPledgeChain(villageId: VillageId): CommandOutcome<'ok', PledgeRefusal> {
  // Step 1: physically present.
  if (world.player.location !== villageId) return fail('not-present')

  // Step 2: Fremen sietch, not already pledged.
  const sietch = world.sietches.find(s => s.villageId === villageId)
  if (!sietch) return fail('no-sietch')
  const village = world.villages.find(v => v.id === villageId)
  if (!village || village.owner !== 'fremen') return fail('not-fremen')
  if (sietch.pledgedToPlayer) return fail('already-pledged')

  // Step 3: loyalty, charisma capacity, current pledge count — the authored
  // rule (sietch/loyalty.ts's checkPledge), unmodified.
  const check = checkPledge(readLoyaltyState(sietch), world.charisma, pledgedCount(world.sietches))
  if (!check.ok) return fail(check.reason)

  return ok('ok')
}

/**
 * Run the atomic five-step pledge chain for villageId (02 "Sietches and
 * loyalty", steps 4-5). A refusal (checkPledgeChain) mutates nothing. A
 * success: marks the sietch pledged, awards CHARISMA_PER_PLEDGE exactly
 * once, creates exactly one crew sized from the sietch's fremenWorkers
 * (data/troopGroups.ts's groupsForPledgedSietch) with a stable id derived
 * from villageId — never a counter — attaches that id to sietch.crewIds,
 * derives world.flags['pledged.count'] from the full sietch list, and
 * publishes ONE event.
 *
 * Win-back: a sietch that decayed out of its pledge (sietch/loyalty.ts's
 * decayLoyalty, wired at the day boundary) can be re-pledged once its
 * loyalty recovers. Because the crew id is deterministic
 * (`group_<villageId>`), a second pledge of the same sietch would otherwise
 * manufacture a second crew — exactly what 02's "Crew lifecycle" forbids
 * ("population or page reload cannot silently manufacture one"). The crew
 * is created only when no crew with that id exists yet; a surviving one is
 * re-attached to sietch.crewIds instead.
 */
export function pledgePlayerSietch(villageId: VillageId): void {
  if (!checkPledgeChain(villageId).ok) return

  const sietchIndex = world.sietches.findIndex(s => s.villageId === villageId)
  const sietch = world.sietches[sietchIndex]
  const village = world.villages.find(v => v.id === villageId)!

  const existingCrew = world.troopGroups.find(g => g.id === `group_${villageId}`)
  const crew = existingCrew ?? groupsForPledgedSietch(villageId, sietch.fremenWorkers)
  if (!existingCrew) {
    world.troopGroups = [...world.troopGroups, crew]
  }

  world.sietches = world.sietches.map((s, i) =>
    i === sietchIndex
      ? { ...s, pledgedToPlayer: true, crewIds: [...new Set([...(s.crewIds ?? []), crew.id])] }
      : s,
  )

  world.charisma += CHARISMA_PER_PLEDGE
  // Derived from the list rather than incremented — sova.ritual_available
  // gates on this flag, and a loaded save must report the true number
  // pledged, not how many pledge calls happened in this session.
  world.flags['pledged.count'] = pledgedCount(world.sietches)
  pushEvent(
    'sietch_pledged',
    `The Fremen at ${village.name} pledge their loyalty to you.`,
  )
}
