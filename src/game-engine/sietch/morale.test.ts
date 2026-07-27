// src/game-engine/sietch/morale.test.ts

import { describe, it, expect } from 'vitest'
import {
  moraleMultiplier,
  driftMorale,
  visitMorale,
  adjustMorale,
  MORALE_NEUTRAL,
  MORALE_DRIFT_PER_DAY,
  VISIT_COOLDOWN_DAYS,
  VISIT_MORALE_GAIN,
} from './morale'
import type { MoraleState } from './morale'

function state(overrides: Partial<MoraleState> = {}): MoraleState {
  return { morale: MORALE_NEUTRAL, lastMoraleVisitDay: -99, ...overrides }
}

// ---------------------------------------------------------------------------
// moraleMultiplier — the one formula every task depends on
// ---------------------------------------------------------------------------

describe('moraleMultiplier', () => {
  it('spans 0.4 to 1.0 across the morale range', () => {
    expect(moraleMultiplier(0)).toBeCloseTo(0.4, 6)
    expect(moraleMultiplier(100)).toBeCloseTo(1.0, 6)
  })

  it('is 0.7 at neutral morale', () => {
    expect(moraleMultiplier(50)).toBeCloseTo(0.7, 6)
  })

  it('never returns zero — a demoralised sietch is bad, not useless', () => {
    // Zero output would strand the player: recovery needs the income that the
    // zero is denying them.
    expect(moraleMultiplier(0)).toBeGreaterThan(0)
  })

  it('increases monotonically', () => {
    for (let m = 0; m < 100; m += 10) {
      expect(moraleMultiplier(m)).toBeLessThan(moraleMultiplier(m + 10))
    }
  })

  it('clamps out-of-range morale', () => {
    expect(moraleMultiplier(-50)).toBeCloseTo(0.4, 6)
    expect(moraleMultiplier(500)).toBeCloseTo(1.0, 6)
  })
})

// ---------------------------------------------------------------------------
// driftMorale
// ---------------------------------------------------------------------------

describe('driftMorale', () => {
  it('pulls a miserable sietch up toward neutral', () => {
    expect(driftMorale(state({ morale: 10 })).morale).toBe(10 + MORALE_DRIFT_PER_DAY)
  })

  it('pulls a euphoric sietch down toward neutral', () => {
    // Neither a single triumph nor a single disaster should define the run.
    expect(driftMorale(state({ morale: 90 })).morale).toBe(90 - MORALE_DRIFT_PER_DAY)
  })

  it('settles exactly at neutral without oscillating', () => {
    let s = state({ morale: MORALE_NEUTRAL + 1 })
    s = driftMorale(s)
    expect(s.morale).toBe(MORALE_NEUTRAL)
    expect(driftMorale(s).morale).toBe(MORALE_NEUTRAL)
  })

  it('respects a floor above neutral', () => {
    // Region vegetation >= 30 raises the floor (Stage 16).
    const s = driftMorale(state({ morale: 40 }), 60)
    expect(s.morale).toBeGreaterThanOrEqual(60)
  })

  it('converges from either direction within a bounded number of days', () => {
    let low = state({ morale: 0 })
    let high = state({ morale: 100 })
    for (let day = 0; day < 40; day++) {
      low = driftMorale(low)
      high = driftMorale(high)
    }
    expect(low.morale).toBe(MORALE_NEUTRAL)
    expect(high.morale).toBe(MORALE_NEUTRAL)
  })
})

// ---------------------------------------------------------------------------
// visitMorale
// ---------------------------------------------------------------------------

describe('visitMorale', () => {
  it('raises morale on a fresh visit', () => {
    expect(visitMorale(state({ morale: 50 }), 10).morale).toBe(50 + VISIT_MORALE_GAIN)
  })

  it('is ignored inside the cooldown', () => {
    const s = visitMorale(state({ morale: 50, lastMoraleVisitDay: 10 }), 10 + VISIT_COOLDOWN_DAYS - 1)
    expect(s.morale).toBe(50)
  })

  it('applies again once the cooldown has elapsed', () => {
    const s = visitMorale(state({ morale: 50, lastMoraleVisitDay: 10 }), 10 + VISIT_COOLDOWN_DAYS)
    expect(s.morale).toBe(50 + VISIT_MORALE_GAIN)
  })

  it('clamps at 100', () => {
    expect(visitMorale(state({ morale: 95 }), 10).morale).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// adjustMorale
// ---------------------------------------------------------------------------

describe('adjustMorale', () => {
  it('applies deltas in both directions and clamps', () => {
    expect(adjustMorale(state({ morale: 50 }), -15).morale).toBe(35)
    expect(adjustMorale(state({ morale: 5 }), -20).morale).toBe(0)
    expect(adjustMorale(state({ morale: 95 }), 20).morale).toBe(100)
  })
})
