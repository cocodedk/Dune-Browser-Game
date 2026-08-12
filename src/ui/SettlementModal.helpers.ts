// src/ui/SettlementModal.helpers.ts
// Pure helpers split out of SettlementModal.tsx (W3i remediation pushed that
// file to 211/200 lines) — no JSX, no store access, so these need no DOM to
// test and no reason to live inside the component module itself.

import type { PaymentOutcome, PendingSettlement } from '../game-engine/quota/quota'
import { defaultSettleAmount } from '../game-engine/quota/settlement'

/**
 * 03-opening-experience.md Beat 7's settlement wording, shared by every
 * preview SettlementModal.tsx shows (full-result, minimum-result, and the
 * live selected-amount preview) — one function, called against settleQuota's
 * own PaymentOutcome each time, never a second estimate of the band rule.
 */
export function bandMessage(outcome: PaymentOutcome): string {
  if (outcome.band === 'full') return 'Patience restored, arrears cleared.'
  if (outcome.band === 'partial') return `Patience held, ${outcome.quota.arrears.toFixed(0)} carried as arrears.`
  return `Patience falls to ${outcome.quota.patience} of 3, ${outcome.quota.arrears.toFixed(0)} carried.`
}

/**
 * The untouched-input default, floored (not rounded) to one decimal — every
 * other figure in this modal is integer or one decimal, but the raw stock
 * float (63.206138100000004, evidence finding C1) rounding UP can exceed
 * `legalRange.max` by float error (66.1774507469833 rounds to 66.2, which
 * the engine then refuses as amount-exceeds-available); floor never can.
 * This is the ONE place the default is computed, so the displayed value, the
 * Enter-key submit, and the Settle-button submit all read the identical
 * number — an untouched confirm can never submit something other than what
 * the input shows.
 */
export function flooredDefault(pending: PendingSettlement): number {
  return Math.floor(defaultSettleAmount(pending) * 10) / 10
}
