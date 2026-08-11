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
  return ok('pledged')
}
