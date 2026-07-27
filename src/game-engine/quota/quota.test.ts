// src/game-engine/quota/quota.test.ts

import { describe, it, expect } from 'vitest'
import {
  createQuotaState,
  baseAmountForCycle,
  totalDue,
  settleQuota,
  onActTransition,
  isDue,
  daysRemaining,
  CYCLE_DAYS,
  STARTING_PATIENCE,
  BASE_AMOUNTS,
} from './quota'
import type { QuotaState } from './quota'

function quota(overrides: Partial<QuotaState> = {}): QuotaState {
  return { ...createQuotaState(), ...overrides }
}

// ---------------------------------------------------------------------------
// Schedule and amounts
// ---------------------------------------------------------------------------

describe('quota schedule', () => {
  it('starts with the first demand due after one cycle', () => {
    const q = createQuotaState()
    expect(q.nextDueDay).toBe(CYCLE_DAYS)
    expect(q.amount).toBe(BASE_AMOUNTS[0])
    expect(q.patience).toBe(STARTING_PATIENCE)
    expect(q.arrears).toBe(0)
  })

  it('uses the authored amounts for the first three cycles', () => {
    expect(baseAmountForCycle(0)).toBe(100)
    expect(baseAmountForCycle(1)).toBe(250)
    expect(baseAmountForCycle(2)).toBe(450)
  })

  it('grows geometrically after the authored cycles', () => {
    expect(baseAmountForCycle(3)).toBe(675)
    expect(baseAmountForCycle(4)).toBe(1013)
    expect(baseAmountForCycle(5)).toBeGreaterThan(baseAmountForCycle(4))
  })

  it('scales the opening demand by difficulty', () => {
    expect(createQuotaState(0.75).amount).toBe(75)
    expect(createQuotaState(1.3).amount).toBe(130)
  })

  it('reports due state and countdown', () => {
    const q = quota({ nextDueDay: 8 })
    expect(isDue(q, 7)).toBe(false)
    expect(isDue(q, 8)).toBe(true)
    expect(daysRemaining(q, 5)).toBe(3)
    expect(daysRemaining(q, 99)).toBe(0)
  })

  it('adds arrears to the amount owed', () => {
    expect(totalDue(quota({ amount: 250, arrears: 60 }))).toBe(310)
  })
})

// ---------------------------------------------------------------------------
// Payment bands
// ---------------------------------------------------------------------------

describe('settleQuota: full payment', () => {
  it('clears arrears and holds patience at maximum', () => {
    const result = settleQuota(quota({ amount: 100, patience: 3 }), 100)
    expect(result.band).toBe('full')
    expect(result.quota.arrears).toBe(0)
    expect(result.quota.patience).toBe(3)
    expect(result.gameOver).toBe(false)
  })

  it('restores one patience when below maximum', () => {
    const result = settleQuota(quota({ amount: 100, patience: 1 }), 100)
    expect(result.quota.patience).toBe(2)
  })

  it('restores at most once per act', () => {
    // Without this a single strong cycle refills patience permanently and the
    // player never feels pressure again.
    const first = settleQuota(quota({ amount: 100, patience: 1 }), 100)
    expect(first.quota.patience).toBe(2)
    const second = settleQuota({ ...first.quota, amount: 100 }, 100)
    expect(second.quota.patience).toBe(2)
  })

  it('allows restoration again after an act transition', () => {
    const first = settleQuota(quota({ amount: 100, patience: 1 }), 100)
    const nextAct = onActTransition({ ...first.quota, amount: 100 })
    expect(settleQuota(nextAct, 100).quota.patience).toBe(3)
  })

  it('treats overpayment as full without banking credit', () => {
    const result = settleQuota(quota({ amount: 100 }), 500)
    expect(result.band).toBe('full')
    expect(result.paid).toBe(100)
    expect(result.quota.arrears).toBe(0)
  })

  it('pays off carried arrears too', () => {
    const result = settleQuota(quota({ amount: 100, arrears: 50 }), 150)
    expect(result.band).toBe('full')
    expect(result.quota.arrears).toBe(0)
  })
})

describe('settleQuota: partial payment', () => {
  it('holds patience and carries the shortfall with a surcharge', () => {
    const result = settleQuota(quota({ amount: 100, patience: 3 }), 60)
    expect(result.band).toBe('partial')
    expect(result.quota.patience).toBe(3)
    expect(result.quota.arrears).toBe(50) // 40 short, +25%
  })

  it('treats exactly 60% as partial rather than short', () => {
    expect(settleQuota(quota({ amount: 100 }), 60).band).toBe('partial')
    expect(settleQuota(quota({ amount: 100 }), 59.99).band).toBe('short')
  })
})

describe('settleQuota: short payment', () => {
  it('costs a patience and carries the full shortfall', () => {
    const result = settleQuota(quota({ amount: 100, patience: 3 }), 10)
    expect(result.band).toBe('short')
    expect(result.quota.patience).toBe(2)
    expect(result.quota.arrears).toBe(90) // no surcharge, but no mercy either
  })

  it('ends the run when patience reaches zero', () => {
    const result = settleQuota(quota({ amount: 100, patience: 1 }), 0)
    expect(result.gameOver).toBe(true)
    expect(result.quota.patience).toBe(0)
  })

  it('never reports negative patience', () => {
    const result = settleQuota(quota({ amount: 100, patience: 0 }), 0)
    expect(result.quota.patience).toBe(0)
  })

  it('paying nothing at full patience does not end the run immediately', () => {
    expect(settleQuota(quota({ amount: 100, patience: 3 }), 0).gameOver).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Multi-cycle behaviour
// ---------------------------------------------------------------------------

describe('quota over several cycles', () => {
  it('advances the due day and cycle each settlement', () => {
    const first = settleQuota(quota(), 100)
    expect(first.quota.cycleIndex).toBe(1)
    expect(first.quota.nextDueDay).toBe(CYCLE_DAYS * 2)
    const second = settleQuota(first.quota, 250)
    expect(second.quota.cycleIndex).toBe(2)
    expect(second.quota.nextDueDay).toBe(CYCLE_DAYS * 3)
  })

  it('compounds arrears into the next demand across three cycles', () => {
    let q = quota({ amount: 100 })
    let result = settleQuota(q, 60) // 40 short -> 50 arrears
    expect(result.quota.arrears).toBe(50)

    q = result.quota
    expect(totalDue(q)).toBe(250 + 50)

    result = settleQuota(q, 0) // pays nothing -> full shortfall carried
    expect(result.quota.arrears).toBe(300)
    expect(result.quota.patience).toBe(2)

    q = result.quota
    expect(totalDue(q)).toBe(450 + 300)
  })

  it('kills a player who ignores three consecutive demands', () => {
    let q = quota()
    for (let i = 0; i < 2; i++) q = settleQuota(q, 0).quota
    const final = settleQuota(q, 0)
    expect(final.gameOver).toBe(true)
  })

  it('lets a recovering player climb back from patience 1', () => {
    // The design promise: from patience 1, paying in full must buy headroom.
    let q = quota({ patience: 1, amount: 100 })
    q = settleQuota(q, 100).quota
    expect(q.patience).toBe(2)
    q = onActTransition(q)
    q = settleQuota(q, totalDue(q)).quota
    expect(q.patience).toBe(3)
  })
})
