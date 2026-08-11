// src/game-engine/quota/projection.test.ts

import { describe, it, expect } from 'vitest'
import { projectIncome } from './projection'
import { harvestDay } from '../troops/harvest'
import type { SpiceField, TroopGroup, Equipment } from '../troops/types'

function group(overrides: Partial<TroopGroup> = {}): TroopGroup {
  return {
    id: 'g1',
    homeSietchId: 'sietch_tabr',
    locationId: 'sietch_tabr',
    size: 30,
    skills: { spice: 40, prospect: 20, military: 20, ecology: 20 },
    morale: 70,
    task: 'harvest',
    taskTargetId: 'f1',
    changeoverDaysLeft: 0,
    ...overrides,
  }
}

function field(overrides: Partial<SpiceField> = {}): SpiceField {
  return {
    id: 'f1',
    regionId: 'r1',
    position: { x: 0, y: 0 },
    discovered: true,
    density: 60,
    capacity: 480,
    remaining: 480,
    ...overrides,
  }
}

const NO_EQUIPMENT: Equipment[] = []

// ---------------------------------------------------------------------------
// Agreement with actual accrual — the property that matters
// ---------------------------------------------------------------------------

describe('projectIncome: matches simulated accrual', () => {
  it('agrees with running harvestDay for the same period', () => {
    // If the projection and the simulation disagree, the ledger lies and every
    // player decision is made on bad information.
    const g = group()
    let f = field()
    let simulated = 0
    for (let day = 0; day < 8; day++) {
      const result = harvestDay(g, f, 'hand')
      simulated += result.extracted
      f = result.field
    }

    const projected = projectIncome({
      groups: [g],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8,
      currentStock: 0,
      amountDue: 100,
    })

    expect(projected.projectedIncome).toBeCloseTo(simulated, 5)
  })

  it('accounts for depletion rather than extrapolating today rate', () => {
    // A crew on a nearly-empty field will not keep paying today's number. A
    // naive rate x days projection would say "on track" right up to a miss.
    const nearlyEmpty = field({ remaining: 12, capacity: 480 })
    const projection = projectIncome({
      groups: [group()],
      fields: [nearlyEmpty],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8,
      currentStock: 0,
      amountDue: 100,
    })
    expect(projection.projectedIncome).toBeLessThanOrEqual(12)
    expect(projection.projectedIncome).toBeLessThan(projection.dailyRate * 8)
  })
})

// ---------------------------------------------------------------------------
// Surplus / on-track reporting
// ---------------------------------------------------------------------------

describe('projectIncome: reporting', () => {
  it('reports a surplus when stock alone already covers the demand', () => {
    const p = projectIncome({
      groups: [],
      fields: [],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8,
      currentStock: 200,
      amountDue: 100,
    })
    expect(p.projectedIncome).toBe(0)
    expect(p.surplus).toBe(100)
    expect(p.onTrack).toBe(true)
  })

  it('reports a shortfall when nothing is assigned', () => {
    const p = projectIncome({
      groups: [],
      fields: [],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8,
      currentStock: 10,
      amountDue: 100,
    })
    expect(p.surplus).toBe(-90)
    expect(p.onTrack).toBe(false)
  })

  it('counts exactly meeting the demand as on track', () => {
    const p = projectIncome({
      groups: [],
      fields: [],
      equipment: NO_EQUIPMENT,
      daysRemaining: 0,
      currentStock: 100,
      amountDue: 100,
    })
    expect(p.surplus).toBe(0)
    expect(p.onTrack).toBe(true)
  })

  it('projects nothing when the deadline has passed', () => {
    const p = projectIncome({
      groups: [group()],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 0,
      currentStock: 0,
      amountDue: 100,
    })
    expect(p.projectedIncome).toBe(0)
  })
})

// Assignment-sensitivity tests live in projection.assignment.test.ts
// (split for the 200-line rule).
