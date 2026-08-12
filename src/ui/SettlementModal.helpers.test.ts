// src/ui/SettlementModal.helpers.test.ts
// W3i: the settlement prefill used to round the DISPLAY (Number(x.toFixed(1)))
// while the SUBMITTED amount stayed the raw float — and round-half-up can
// itself exceed legalRange.max by float error, which the engine then
// refuses. flooredDefault is the single source both the display and the
// submit now read, so this pins the exact float from the blind-play
// re-check's evidence.

import { describe, it, expect } from 'vitest'
import { flooredDefault, bandMessage } from './SettlementModal.helpers'
import { buildPendingSettlement, validateSettleAmount } from '../game-engine/quota/settlement'
import { createQuotaState, settleQuota } from '../game-engine/quota/quota'

describe('flooredDefault', () => {
  it('floors the evidence-report float (66.1774507469833) down to 66.1, not up to 66.2', () => {
    const pending = buildPendingSettlement(createQuotaState(), 66.1774507469833)
    expect(flooredDefault(pending)).toBe(66.1)
  })

  it('never produces a value validateSettleAmount refuses as amount-exceeds-available', () => {
    // Regression for the specific hazard round-half-up introduced: a rounded
    // UP default can exceed legalRange.max even though the raw default (the
    // max itself) was always legal.
    const stocks = [63.206138100000004, 66.1774507469833, 0.05, 89.96]
    for (const stock of stocks) {
      const pending = buildPendingSettlement(createQuotaState(), stock)
      expect(validateSettleAmount(flooredDefault(pending), pending)).toBeNull()
    }
  })

  it('is a no-op (to one decimal) on an already-clean integer stock', () => {
    const pending = buildPendingSettlement(createQuotaState(), 60)
    expect(flooredDefault(pending)).toBe(60)
  })
})

describe('bandMessage', () => {
  it('reads the full band as patience restored, arrears cleared', () => {
    const outcome = settleQuota(createQuotaState(), 90, 1)
    expect(bandMessage(outcome)).toBe('Patience restored, arrears cleared.')
  })
})
