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
import {
  validateSettleAmount, encodeSettlementBand,
  Q1_DEBRIEF_PENDING_FLAG, Q1_DEBRIEF_BAND_FLAG,
  Q1_DEBRIEF_NEARLY_FULL_FLAG, Q1_DEBRIEF_NEARLY_FULL_FRACTION,
  type SettleAmountRefusal,
} from '../quota/settlement'
import { applySettlement } from '../economy/settlementRun'
import { evaluateEndingAuthority } from '../economy/actRun'
import { OPENING_COMPLETE_FLAG } from '../acts/openingObjectives'

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

  // Captured before applySettlement clears world.pendingSettlement — cycle 0
  // is Q1 (quota.ts's cycleIndex starts at 0). 03-opening-experience.md
  // "Beat 7": settling Q1, any payment band, closes the opening — the
  // command's own SettleCommandCode stays a single 'settled' either way so
  // every existing fixture pinning that code needs no change.
  const isOpeningSettlement = pending.cycleIndex === 0

  const outcome = applySettlement(amount)
  world.pendingSettlement = null
  evaluateEndingAuthority()

  if (isOpeningSettlement) {
    world.flags[OPENING_COMPLETE_FLAG] = true
    // Beat 7's debrief signal (03 "Teaching sequence" Beat 7) — see
    // quota/settlement.ts's own doc for why this is a flag, not a direct
    // startDialogue call from here.
    world.flags[Q1_DEBRIEF_PENDING_FLAG] = true
    world.flags[Q1_DEBRIEF_BAND_FLAG] = encodeSettlementBand(outcome.band)
    // W3h: which of the 'partial' band's two Fenring variants to open —
    // see Q1_DEBRIEF_NEARLY_FULL_FRACTION's own doc. Computed against
    // `pending.amountDue` (the snapshot the player was shown), not the
    // post-settlement quota, which has already rolled to the next cycle.
    world.flags[Q1_DEBRIEF_NEARLY_FULL_FLAG] =
      outcome.paid >= pending.amountDue * Q1_DEBRIEF_NEARLY_FULL_FRACTION
  }

  return ok('settled')
}
