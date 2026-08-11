// src/game-engine/quota/settlement.ts
// PURE pending-settlement construction and amount validation — the data side
// of docs/PRD/game-completion/02-runtime-consolidation.md "Tribute" and
// 03-opening-experience.md Beat 7's settlement modal. No world, no mutation:
// dayRunner.ts (creation) and commands/settleCommand.ts (validation) are the
// mutation layers that call these against live state.

import { PARTIAL_PAYMENT_FRACTION, ARREARS_SURCHARGE, totalDue } from './quota'
import type { QuotaState, PendingSettlement, PaymentBand } from './quota'

/**
 * Build the pending decision for a deadline that has just come due.
 *
 * Every field is a snapshot at THIS moment — `stock` in particular, not a
 * live read of `player.spice` — so reload-safety (02's `settlement-reload`
 * fixture) holds even if something else could change spice while paused:
 * the decision the player sees is the one taken at the deadline, not
 * whatever the balance happens to be when they next look.
 */
export function buildPendingSettlement(quota: QuotaState, stock: number): PendingSettlement {
  const due = totalDue(quota)
  return {
    cycleIndex: quota.cycleIndex,
    dueDay: quota.nextDueDay,
    amountDue: due,
    stock,
    minPartialPayment: Math.round(due * PARTIAL_PAYMENT_FRACTION),
    arrearsSurchargeRate: ARREARS_SURCHARGE,
    legalRange: { min: 0, max: Math.max(0, Math.min(due, stock)) },
  }
}

/** Enter-key default: full payment when affordable, otherwise the most payable. */
export function defaultSettleAmount(pending: PendingSettlement): number {
  return pending.legalRange.max
}

export type SettleAmountRefusal = 'amount-negative' | 'amount-exceeds-available'

/**
 * Legal-range check for a candidate settle amount. `Number.isNaN` guards NaN
 * explicitly — `NaN < min` and `NaN > max` are both false, so without this
 * check a NaN amount would silently pass both range comparisons and flow
 * into settleQuota's arithmetic. Infinity/-Infinity need no special case:
 * the ordinary comparisons below already route them to the correct refusal.
 */
export function validateSettleAmount(
  amount: number,
  pending: PendingSettlement,
): SettleAmountRefusal | null {
  if (Number.isNaN(amount)) return 'amount-negative'
  if (amount < pending.legalRange.min) return 'amount-negative'
  if (amount > pending.legalRange.max) return 'amount-exceeds-available'
  return null
}

/**
 * Auto-shipment flags, stored in `world.flags` (dotted-key story state,
 * types.ts) rather than typed WorldState fields — the same mechanism quota
 * cycle/patience/arrears already mirror through. "Unlocked" flips true on
 * the FIRST completed settlement of any band, ever (02 "Tribute": auto-
 * shipment is "unavailable before the first settlement tutorial"). "Enabled"
 * is the player's opt-in, off by default. "Amount" is optional — see
 * economy/settlementRun.ts's runTributeCheck for the full-due default when
 * unset (a recorded canonical-numbers decision, not an engine invention).
 */
export const AUTO_SHIP_UNLOCKED_FLAG = 'settlement.autoShipUnlocked'
export const AUTO_SHIP_ENABLED_FLAG = 'settlement.autoShipEnabled'
export const AUTO_SHIP_AMOUNT_FLAG = 'settlement.autoShipAmount'

/**
 * Beat 7's post-settlement debrief signal (03-opening-experience.md
 * "Teaching sequence" Beat 7 — "the settle command already knows the band;
 * set a flag the runtime hook reads"). settleCommand.ts writes both flags
 * once, the moment the FIRST settlement (cycle 0 / Q1) resolves; runtime/
 * q1Debrief.ts's per-frame hook consumes PENDING back to false the instant
 * it opens the tree, so this is a one-shot signal, not a sticky state flag.
 * Deliberately set from settleCommand.ts itself rather than called directly
 * from it: `world.flags` is inert data with no side effect until something
 * reads it, so every engine-level fixture that calls runSettleCommand
 * directly (never touching the runtime hook's own call site) writes these
 * two flags and stops there — no dialogue opens, no fixture needs updating.
 */
export const Q1_DEBRIEF_PENDING_FLAG = 'q1.debrief.pending'
/** PaymentBand encoded as a number — world.flags is boolean | number only. */
export const Q1_DEBRIEF_BAND_FLAG = 'q1.debrief.band'

const BAND_CODES: Record<PaymentBand, number> = { short: 0, partial: 1, full: 2 }
const CODES_BAND: readonly PaymentBand[] = ['short', 'partial', 'full']

export function encodeSettlementBand(band: PaymentBand): number {
  return BAND_CODES[band]
}

/** Falls back to 'full' for an out-of-range code — never a thrown error over a flag. */
export function decodeSettlementBand(code: number): PaymentBand {
  return CODES_BAND[code] ?? 'full'
}
