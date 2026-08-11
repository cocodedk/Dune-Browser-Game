// src/game-engine/sietch/loyaltyState.test.ts
// The SietchState <-> LoyaltyState field-name adapter (the "LoyaltyState.
// pledged naming mismatch" chunk W2b was asked to adapt).

import { describe, it, expect } from 'vitest'
import { readLoyaltyState, writeLoyaltyState } from './loyaltyState'
import type { SietchState } from './types'

function sietch(overrides: Partial<SietchState> = {}): SietchState {
  return {
    villageId: 'v1', pledgedToPlayer: false, fremenWorkers: 20,
    currentTask: null, outputProgress: 0, ...overrides,
  }
}

describe('readLoyaltyState', () => {
  it('maps pledgedToPlayer to pledged', () => {
    expect(readLoyaltyState(sietch({ pledgedToPlayer: true })).pledged).toBe(true)
  })

  it('defaults absent loyalty/lastVisitedDay/giftedThisVisit to 0 (pre-W2a fixtures)', () => {
    const state = readLoyaltyState(sietch())
    expect(state.loyalty).toBe(0)
    expect(state.lastVisitedDay).toBe(0)
    expect(state.giftedThisVisit).toBe(0)
  })

  it('reads real values when present', () => {
    const state = readLoyaltyState(sietch({ loyalty: 62, lastVisitedDay: 4, giftedThisVisit: 8 }))
    expect(state).toEqual({ loyalty: 62, pledged: false, lastVisitedDay: 4, giftedThisVisit: 8 })
  })
})

describe('writeLoyaltyState', () => {
  it('folds pledged back onto pledgedToPlayer and preserves other fields', () => {
    const original = sietch({ fremenWorkers: 40, currentTask: 'harvest_spice', outputProgress: 2, crewIds: ['a'] })
    const written = writeLoyaltyState(original, {
      loyalty: 70, pledged: true, lastVisitedDay: 3, giftedThisVisit: 8,
    })

    expect(written.pledgedToPlayer).toBe(true)
    expect(written.loyalty).toBe(70)
    expect(written.lastVisitedDay).toBe(3)
    expect(written.giftedThisVisit).toBe(8)
    // Untouched by the loyalty write.
    expect(written.fremenWorkers).toBe(40)
    expect(written.currentTask).toBe('harvest_spice')
    expect(written.outputProgress).toBe(2)
    expect(written.crewIds).toEqual(['a'])
  })

  it('round-trips through read then write unchanged', () => {
    const original = sietch({ loyalty: 55, lastVisitedDay: 2, giftedThisVisit: 4, pledgedToPlayer: true })
    const roundTripped = writeLoyaltyState(original, readLoyaltyState(original))
    expect(roundTripped).toEqual(original)
  })
})
