// src/game-engine/economy/settlementRun.ts
// Shared settlement-application mutation — the one place a tribute payment
// actually lands on `world`, called from BOTH the manual settle command
// (commands/settleCommand.ts) and day-runner auto-shipment
// (EconomySystem.ts's runTributeCheck), so a completed settlement behaves
// identically regardless of which path triggered it.
//
// Carries forward every side effect the retired EconomySystem.runQuotaCheck
// used to apply in one place (docs/PRD/game-completion/progress.md Round 7:
// "runQuotaCheck's auto-settle dies") — the flags mirror actView() reads for
// act-transition eligibility, the full-band charisma award, and the three
// band events — plus unlocking auto-shipment on the first completed
// settlement of any band (02-runtime-consolidation.md "Tribute").

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { getDifficultyConfig } from '../difficulty'
import { CHARISMA_PER_QUOTA } from '../sietch/loyalty'
import { settleQuota } from '../quota/quota'
import type { PaymentOutcome } from '../quota/quota'
import { AUTO_SHIP_UNLOCKED_FLAG } from '../quota/settlement'

/** Apply a settlement payment of `paid` spice against `world.quota`. */
export function applySettlement(paid: number): PaymentOutcome {
  const config = getDifficultyConfig(world.difficulty)
  const outcome = settleQuota(world.quota, paid, config.quotaMultiplier)
  world.player.spice -= outcome.paid
  world.quota = outcome.quota

  world.flags['quota.cycle'] = outcome.quota.cycleIndex
  world.flags['quota.patience'] = outcome.quota.patience
  world.flags['quota.arrears'] = outcome.quota.arrears
  if (!world.flags[AUTO_SHIP_UNLOCKED_FLAG]) world.flags[AUTO_SHIP_UNLOCKED_FLAG] = 1

  if (outcome.band === 'full') {
    const paidCount = typeof world.flags['quota.paidInFull'] === 'number'
      ? (world.flags['quota.paidInFull'] as number) : 0
    world.flags['quota.paidInFull'] = paidCount + 1
    world.charisma += CHARISMA_PER_QUOTA
    pushEvent('tribute_refused', `Tribute paid in full: ${outcome.paid.toFixed(0)} spice.`)
  } else if (outcome.band === 'partial') {
    pushEvent(
      'tribute_refused',
      `Tribute short by ${outcome.shortfall.toFixed(0)}. The balance is carried, with interest.`,
    )
  } else {
    pushEvent(
      'tribute_refused',
      `The Emperor is not paid. Patience ${outcome.quota.patience} of 3 remains.`,
    )
  }

  return outcome
}
