// src/game-engine/commands/pledgeCommand.ts
// The pledge command wired end-to-end through the CommandOutcome contract —
// docs/PRD/game-completion/02-runtime-consolidation.md "Command outcome
// contract". Reference implementation for chunk W2a: wraps the EXISTING
// pledgePlayerSietch mutation and its current guard order
// (SietchSystem.checkPledgeGuards) without changing any rule. The atomic
// five-step chain (loyalty threshold, charisma cap, one crew created and
// attached) is chunk W2b's rewrite of this same function.
//
// This is the "thin typed dispatch seam" CommandWiring.ts calls: an
// EventBus command still triggers exactly one function call here; only what
// that call returns is new.

import { checkPledgeGuards, pledgePlayerSietch, type PledgeGuardRefusal } from '../SietchSystem'
import { ok, type CommandOutcome } from './outcome'
import type { VillageId } from '../../types'

export type PledgeCommandCode = 'pledged'

/**
 * Run the pledge command for villageId.
 *
 * Refuses with the same guard pledgePlayerSietch itself checks (see
 * checkPledgeGuards) and mutates nothing on refusal — repeating a refused
 * or already-successful pledge command stays a no-op, never a second
 * charisma award. On success, delegates the mutation to pledgePlayerSietch
 * unchanged and reports it.
 */
export function runPledgeCommand(
  villageId: VillageId,
): CommandOutcome<PledgeCommandCode, PledgeGuardRefusal> {
  const check = checkPledgeGuards(villageId)
  if (!check.ok) return check

  pledgePlayerSietch(villageId)
  return ok('pledged')
}
