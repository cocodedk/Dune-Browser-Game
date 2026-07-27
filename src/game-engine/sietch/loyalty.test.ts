// src/game-engine/sietch/loyalty.test.ts

import { describe, it, expect } from 'vitest'
import {
  maxPledged,
  checkPledge,
  pledgeRefusalMessage,
  giveGift,
  onArrival,
  decayLoyalty,
  adjustLoyalty,
  PLEDGE_THRESHOLD,
  GIFT_PER_VISIT_CAP,
  GIFT_SPICE_COST,
  NEGLECT_DAYS,
} from './loyalty'
import type { LoyaltyState, PledgeRefusal } from './loyalty'

function state(overrides: Partial<LoyaltyState> = {}): LoyaltyState {
  return { loyalty: 50, pledged: false, lastVisitedDay: 0, giftedThisVisit: 0, ...overrides }
}

// ---------------------------------------------------------------------------
// maxPledged
// ---------------------------------------------------------------------------

describe('maxPledged', () => {
  it('allows two sietches at the starting charisma of 20', () => {
    expect(maxPledged(20)).toBe(2)
  })

  it('grows one per ten charisma', () => {
    expect(maxPledged(30)).toBe(3)
    expect(maxPledged(95)).toBe(9)
  })

  it('never returns a negative cap', () => {
    expect(maxPledged(0)).toBe(0)
    expect(maxPledged(-50)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// checkPledge
// ---------------------------------------------------------------------------

describe('checkPledge', () => {
  it('accepts a loyal sietch under the cap', () => {
    expect(checkPledge(state({ loyalty: PLEDGE_THRESHOLD }), 20, 0)).toEqual({ ok: true })
  })

  it('refuses just below the loyalty threshold', () => {
    expect(checkPledge(state({ loyalty: PLEDGE_THRESHOLD - 1 }), 20, 0))
      .toEqual({ ok: false, reason: 'not-loyal-enough' })
  })

  it('refuses at the charisma cap', () => {
    expect(checkPledge(state({ loyalty: 90 }), 20, 2))
      .toEqual({ ok: false, reason: 'charisma-cap' })
  })

  it('refuses an already-pledged sietch', () => {
    expect(checkPledge(state({ loyalty: 90, pledged: true }), 50, 0))
      .toEqual({ ok: false, reason: 'already-pledged' })
  })

  it('gives a distinct message per refusal so the UI can say why', () => {
    const reasons: PledgeRefusal[] = ['not-loyal-enough', 'charisma-cap', 'already-pledged']
    const messages = reasons.map(pledgeRefusalMessage)
    expect(new Set(messages).size).toBe(reasons.length)
  })
})

// ---------------------------------------------------------------------------
// giveGift
// ---------------------------------------------------------------------------

describe('giveGift', () => {
  it('trades spice for loyalty', () => {
    const result = giveGift(state({ loyalty: 40 }), 100)
    expect(result.accepted).toBe(true)
    expect(result.spiceSpent).toBe(GIFT_SPICE_COST)
    expect(result.state.loyalty).toBe(48)
  })

  it('refuses when the player cannot afford it', () => {
    const result = giveGift(state(), GIFT_SPICE_COST - 1)
    expect(result.accepted).toBe(false)
    expect(result.spiceSpent).toBe(0)
  })

  it('caps total gain per visit', () => {
    // Otherwise a rich player buys a sietch outright the moment they can
    // afford it, and travel time stops being a real cost.
    let s = state({ loyalty: 0 })
    let gained = 0
    for (let i = 0; i < 10; i++) {
      const r = giveGift(s, 1000)
      s = r.state
      gained += r.loyaltyGained
    }
    expect(gained).toBe(GIFT_PER_VISIT_CAP)
    expect(s.loyalty).toBe(GIFT_PER_VISIT_CAP)
  })

  it('refuses once the visit cap is exhausted', () => {
    const result = giveGift(state({ giftedThisVisit: GIFT_PER_VISIT_CAP }), 1000)
    expect(result.accepted).toBe(false)
  })

  it('never pushes loyalty above 100', () => {
    const result = giveGift(state({ loyalty: 99 }), 1000)
    expect(result.state.loyalty).toBe(100)
  })

  it('resets the visit budget on arrival', () => {
    const s = onArrival(state({ giftedThisVisit: GIFT_PER_VISIT_CAP }), 12)
    expect(s.giftedThisVisit).toBe(0)
    expect(s.lastVisitedDay).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// decayLoyalty
// ---------------------------------------------------------------------------

describe('decayLoyalty', () => {
  it('does nothing before the neglect window', () => {
    const result = decayLoyalty(state({ loyalty: 70 }), NEGLECT_DAYS - 1, 1)
    expect(result.state.loyalty).toBe(70)
    expect(result.unpledged).toBe(false)
  })

  it('decays after the neglect window', () => {
    expect(decayLoyalty(state({ loyalty: 70 }), NEGLECT_DAYS, 1).state.loyalty).toBe(69)
  })

  it('scales with the difficulty multiplier', () => {
    expect(decayLoyalty(state({ loyalty: 70 }), NEGLECT_DAYS, 0.5).state.loyalty).toBe(69.5)
    expect(decayLoyalty(state({ loyalty: 70 }), NEGLECT_DAYS, 2).state.loyalty).toBe(68)
  })

  it('unpledges below the threshold but keeps the loyalty value', () => {
    // Releasing the sietch must not also erase its loyalty, or the player can
    // never win it back.
    const result = decayLoyalty(state({ loyalty: 30, pledged: true }), NEGLECT_DAYS, 1)
    expect(result.unpledged).toBe(true)
    expect(result.state.pledged).toBe(false)
    expect(result.state.loyalty).toBe(29)
  })

  it('does not report unpledging for a sietch that was never pledged', () => {
    const result = decayLoyalty(state({ loyalty: 20, pledged: false }), NEGLECT_DAYS, 1)
    expect(result.unpledged).toBe(false)
  })

  it('never drives loyalty below zero', () => {
    expect(decayLoyalty(state({ loyalty: 0 }), NEGLECT_DAYS, 5).state.loyalty).toBe(0)
  })

  it('supports a full lose-then-regain cycle', () => {
    // 30 decays to 29, which is below the threshold. Starting at 31 would
    // land exactly on 30 and stay pledged — the boundary is strict.
    let s = state({ loyalty: 30, pledged: true })
    s = decayLoyalty(s, NEGLECT_DAYS, 1).state
    expect(s.pledged).toBe(false)

    s = onArrival(s, NEGLECT_DAYS)
    s = adjustLoyalty(s, 40)
    expect(checkPledge(s, 20, 0)).toEqual({ ok: true })
  })
})
