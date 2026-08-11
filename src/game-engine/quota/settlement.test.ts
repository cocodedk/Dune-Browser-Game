// src/game-engine/quota/settlement.test.ts
// PURE tests: buildPendingSettlement, defaultSettleAmount, validateSettleAmount.

import { describe, it, expect } from 'vitest'
import {
  buildPendingSettlement, defaultSettleAmount, validateSettleAmount,
} from './settlement'
import { createQuotaState } from './quota'

describe('buildPendingSettlement', () => {
  it('snapshots due, stock, the partial threshold, the surcharge rate, and the legal range', () => {
    const quota = createQuotaState() // amount 90, arrears 0, cycleIndex 0

    const pending = buildPendingSettlement(quota, 60)

    expect(pending).toEqual({
      cycleIndex: 0,
      dueDay: 12,
      amountDue: 90,
      stock: 60,
      minPartialPayment: 54, // 90 * 0.6
      arrearsSurchargeRate: 0.25,
      legalRange: { min: 0, max: 60 }, // capped by stock, not due
    })
  })

  it('caps legalRange.max at amountDue, not stock, when stock exceeds what is owed', () => {
    const quota = createQuotaState()

    const pending = buildPendingSettlement(quota, 500)

    expect(pending.legalRange).toEqual({ min: 0, max: 90 })
  })

  it('never produces a negative legalRange.max with 0 stock', () => {
    const quota = createQuotaState()

    const pending = buildPendingSettlement(quota, 0)

    expect(pending.legalRange).toEqual({ min: 0, max: 0 })
  })

  it('includes carried arrears in amountDue', () => {
    const quota = { ...createQuotaState(), arrears: 45 }

    const pending = buildPendingSettlement(quota, 200)

    expect(pending.amountDue).toBe(135) // 90 + 45
    expect(pending.minPartialPayment).toBe(81) // round(135 * 0.6)
  })
})

describe('defaultSettleAmount', () => {
  it('is the legal range max — full payment when affordable', () => {
    const pending = buildPendingSettlement(createQuotaState(), 500)
    expect(defaultSettleAmount(pending)).toBe(90)
  })

  it('is the most payable amount when stock is short', () => {
    const pending = buildPendingSettlement(createQuotaState(), 30)
    expect(defaultSettleAmount(pending)).toBe(30)
  })
})

describe('validateSettleAmount', () => {
  const pending = buildPendingSettlement(createQuotaState(), 60) // range [0, 60]

  it('accepts anything inside the legal range', () => {
    expect(validateSettleAmount(0, pending)).toBeNull()
    expect(validateSettleAmount(54, pending)).toBeNull()
    expect(validateSettleAmount(60, pending)).toBeNull()
  })

  it('refuses a negative amount', () => {
    expect(validateSettleAmount(-1, pending)).toBe('amount-negative')
  })

  it('refuses more than the legal range allows', () => {
    expect(validateSettleAmount(61, pending)).toBe('amount-exceeds-available')
  })

  it('refuses NaN and Infinity rather than letting them pass a numeric comparison', () => {
    expect(validateSettleAmount(NaN, pending)).toBe('amount-negative')
    expect(validateSettleAmount(Infinity, pending)).toBe('amount-exceeds-available')
    expect(validateSettleAmount(-Infinity, pending)).toBe('amount-negative')
  })
})
