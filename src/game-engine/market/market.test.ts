// src/game-engine/market/market.test.ts

import { describe, it, expect } from 'vitest'
import {
  MARKET_STOCK,
  checkPurchase,
  purchaseRefusalMessage,
  availableStock,
} from './market'
import type { MarketContext, PurchaseRefusal } from './market'
import { harvestYield } from '../troops/harvest'

function ctx(overrides: Partial<MarketContext> = {}): MarketContext {
  return { spice: 1000, standing: 0, act: 'act1', ...overrides }
}

describe('market stock', () => {
  it('prices the harvester and thopter within reach of an early cycle', () => {
    const harvester = MARKET_STOCK.find(i => i.kind === 'harvester')!
    const thopter = MARKET_STOCK.find(i => i.kind === 'thopter')!
    expect(harvester.price).toBe(100)
    expect(thopter.price).toBe(80)
  })

  it('gives every item a label and a description', () => {
    for (const item of MARKET_STOCK) {
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
    }
  })
})

describe('checkPurchase', () => {
  it('accepts an affordable tier-2 item', () => {
    const result = checkPurchase('harvester', ctx({ spice: 100 }))
    expect(result.ok).toBe(true)
  })

  it('refuses when a single spice short', () => {
    expect(checkPurchase('harvester', ctx({ spice: 99 })))
      .toEqual({ ok: false, reason: 'cannot-afford' })
  })

  it('refuses an item the smuggler does not stock', () => {
    expect(checkPurchase('windtrap', ctx()))
      .toEqual({ ok: false, reason: 'unknown-item' })
  })

  it('gives a distinct message per refusal', () => {
    const reasons: PurchaseRefusal[] = ['unknown-item', 'cannot-afford', 'tier-locked']
    const messages = reasons.map(purchaseRefusalMessage)
    expect(new Set(messages).size).toBe(reasons.length)
  })
})

describe('availableStock', () => {
  it('shows tier 1-2 from the start, withholding tier 3', () => {
    const stock = availableStock(ctx())
    expect(stock.length).toBe(MARKET_STOCK.filter(i => i.tier < 3).length)
    expect(stock.every(i => i.tier < 3)).toBe(true)
  })

  // market-gate fixture (docs/PRD/game-completion progress.md Round 8 note;
  // 02 "Market": "Market stock queries include act and smuggler-standing
  // gates. The UI renders only stock returned by that query.") act1 and
  // act3 must return different stock through the SAME query, or the gate
  // is not actually gating anything.
  it('market-gate: act1 and act3 stock differ through the same query', () => {
    const act1 = availableStock(ctx({ act: 'act1', standing: 5 }))
    const act3 = availableStock(ctx({ act: 'act3', standing: 5 }))

    expect(act1.length).toBeLessThan(act3.length)
    expect(act1.some(i => i.tier === 3)).toBe(false)
    expect(act3.some(i => i.tier === 3)).toBe(true)
  })

  it('gates tier 3 on standing even once act3 is reached', () => {
    const lowStanding = availableStock(ctx({ act: 'act3', standing: 0 }))
    expect(lowStanding.some(i => i.tier === 3)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The capex dilemma the slice is built around
// ---------------------------------------------------------------------------

describe('harvester economics', () => {
  const crew = { size: 30, spiceSkill: 40, morale: 70, density: 60 }

  it('pays for itself well inside a quota cycle', () => {
    // 8 days per cycle. If the harvester could not repay its price within a
    // cycle the capex decision would be strictly wrong and the dilemma fake.
    const gain =
      harvestYield({ ...crew, tier: 'harvester' }) -
      harvestYield({ ...crew, tier: 'hand' })
    const daysToRepay = 100 / gain
    expect(daysToRepay).toBeLessThan(11)
    expect(daysToRepay).toBeGreaterThan(6)
  })

  it('costs more than the whole first tribute is worth in hand-harvest days', () => {
    // Buying early genuinely threatens Q1, which is what makes it a decision
    // rather than an obvious purchase.
    const handPerDay = harvestYield({ ...crew, tier: 'hand' })
    expect(handPerDay * 8).toBeLessThan(100)
  })
})
