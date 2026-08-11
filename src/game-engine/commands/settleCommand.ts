// src/game-engine/commands/settleCommand.ts
// The settle command wired end-to-end through the CommandOutcome contract —
// docs/PRD/game-completion/02-runtime-consolidation.md "Tribute". Chunk
// W2c: resolves the pending settlement decision dayRunner.ts's step 9
// creates, applies exactly once (a second dispatch finds no pending
// decision and refuses), and — per Round 7's plan of record — calls the
// SAME shared ending-authority function the day runner's step 8 does, so a
// settlement that drops patience to 0 assigns the loss ending before
// simulation can resume.

import { world } from '../GameState'
import { ok, fail, type CommandOutcome } from './outcome'
import { validateSettleAmount, type SettleAmountRefusal } from '../quota/settlement'
import { applySettlement } from '../economy/settlementRun'
import { evaluateEndingAuthority } from '../economy/actRun'

export type SettleCommandCode = 'settled'
export type SettleRefusal = 'no-pending-settlement' | SettleAmountRefusal

/**
 * Run the settle command for `amount` spice against the currently pending
 * decision.
 *
 * Refuses `'no-pending-settlement'` with no decision waiting — including a
 * replayed dispatch after a first settlement already cleared it, which is
 * what makes this idempotent: the mutation only ever happens once per
 * decision, by construction, not by tracking a separate "already settled"
 * flag. Refuses with `validateSettleAmount`'s code for anything outside the
 * decision's legal range (negative, NaN, or more than due/available).
 */
export function runSettleCommand(
  amount: number,
): CommandOutcome<SettleCommandCode, SettleRefusal> {
  const pending = world.pendingSettlement
  if (!pending) return fail('no-pending-settlement')

  const refusal = validateSettleAmount(amount, pending)
  if (refusal) return fail(refusal)

  applySettlement(amount)
  world.pendingSettlement = null
  evaluateEndingAuthority()

  return ok('settled')
}
