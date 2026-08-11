// src/ui/giftButtonVisibility.test.ts
// Substitute for a rendered-component presence test: this repo's vitest
// setup has no DOM (vite.config.ts: environment 'node') and no
// @testing-library/react, and its test glob only matches *.test.ts, so a
// *.test.tsx render assertion is not the established, cheap style here.
// giftButtonVisible is GiftPanel.tsx's entire early-return gate pulled out
// as a plain function, so this proves the gate directly.

import { describe, it, expect } from 'vitest'
import { giftButtonVisible, type GiftButtonState } from './giftButtonVisibility'
import { GIFT_SPICE_COST, GIFT_PER_VISIT_CAP } from '../game-engine/sietch/loyalty'
import type { SietchState } from '../game-engine/sietch/types'

function baseSietch(overrides: Partial<SietchState> = {}): SietchState {
  return {
    villageId: 'sietch_tabr',
    pledgedToPlayer: false,
    fremenWorkers: 60,
    loyalty: 45,
    morale: 50,
    lastVisitedDay: 0,
    giftedThisVisit: 0,
    lastMoraleVisitDay: 0,
    crewIds: [],
    ...overrides,
  }
}

function baseState(overrides: Partial<GiftButtonState> = {}): GiftButtonState {
  return {
    villageOwner: 'fremen',
    sietch: baseSietch(),
    playerIsHere: true,
    playerSpice: GIFT_SPICE_COST,
    ...overrides,
  }
}

describe('giftButtonVisible', () => {
  it('is visible at an affordable, allowed Fremen sietch', () => {
    expect(giftButtonVisible(baseState())).toBe(true)
  })

  it('stays visible on an already-pledged sietch — loyalty maintenance', () => {
    expect(giftButtonVisible(baseState({ sietch: baseSietch({ pledgedToPlayer: true }) }))).toBe(true)
  })

  it('hides when the player is not present', () => {
    expect(giftButtonVisible(baseState({ playerIsHere: false }))).toBe(false)
  })

  it('hides at a non-Fremen village', () => {
    expect(giftButtonVisible(baseState({ villageOwner: 'harkonnen' }))).toBe(false)
  })

  it('hides when there is no sietch record', () => {
    expect(giftButtonVisible(baseState({ sietch: null }))).toBe(false)
  })

  it('hides when spice is short of GIFT_SPICE_COST', () => {
    expect(giftButtonVisible(baseState({ playerSpice: GIFT_SPICE_COST - 1 }))).toBe(false)
  })

  it('hides once the per-visit gift budget is exhausted', () => {
    const state = baseState({ sietch: baseSietch({ giftedThisVisit: GIFT_PER_VISIT_CAP }) })
    expect(giftButtonVisible(state)).toBe(false)
  })
})
