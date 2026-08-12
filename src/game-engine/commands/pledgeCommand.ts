// src/game-engine/commands/pledgeCommand.ts
// The pledge command wired end-to-end through the CommandOutcome contract —
// docs/PRD/game-completion/02-runtime-consolidation.md "Sietches and
// loyalty". Chunk W2b: runs the atomic five-step chain
// (SietchSystem.checkPledgeChain) and, on success, delegates the single
// mutation to SietchSystem.pledgePlayerSietch. A refusal reaches this point
// having mutated nothing — checkPledgeChain is read-only.
//
// This stays the "thin typed dispatch seam" CommandWiring.ts calls: an
// EventBus command still triggers exactly one function call here; only what
// that call returns is new.

import { checkPledgeChain, pledgePlayerSietch, type PledgeRefusal } from '../SietchSystem'
import { ok, type CommandOutcome } from './outcome'
import type { VillageId } from '../../types'
import { world } from '../GameState'
import { EARNED_TRUST_FLAG } from '../acts/openingObjectives'

export type PledgeCommandCode = 'pledged'

/**
 * Run the pledge command for villageId.
 *
 * Refuses with the specific reason checkPledgeChain reports and mutates
 * nothing on refusal — repeating a refused or already-successful pledge
 * command stays a no-op, never a second charisma award or a second crew
 * (see pledgePlayerSietch's win-back handling for the decay-then-re-pledge
 * case specifically).
 */
export function runPledgeCommand(
  villageId: VillageId,
): CommandOutcome<PledgeCommandCode, PledgeRefusal> {
  const check = checkPledgeChain(villageId)
  if (!check.ok) return check

  pledgePlayerSietch(villageId)

  // Opening objective seam: the first successful pledge completes
  // act1.earn_trust (acts/openingObjectives.ts). A dedicated sticky flag,
  // not a live read of pledged.count — see that flag's own doc for why.
  if (world.flags[EARNED_TRUST_FLAG] !== true) world.flags[EARNED_TRUST_FLAG] = true

  return ok('pledged')
}
