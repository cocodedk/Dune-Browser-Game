// src/game-engine/quota/projection.assignment.test.ts
// Split from projection.test.ts (200-line rule): the assignment-sensitivity
// describe block. Shared fixture helpers duplicated deliberately — each test
// file stays self-contained per the house test style.

import { describe, it, expect } from 'vitest'
import { projectIncome } from './projection'
import { extractionTier } from '../troops/types'
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

describe('projectIncome: assignment sensitivity', () => {
  it('ignores groups not assigned to harvest', () => {
    const p = projectIncome({
      groups: [group({ task: 'prospect' })],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8,
      currentStock: 0,
      amountDue: 100,
    })
    expect(p.projectedIncome).toBe(0)
  })

  it('ignores a harvest group with no target field', () => {
    const p = projectIncome({
      groups: [group({ taskTargetId: null })],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8,
      currentStock: 0,
      amountDue: 100,
    })
    expect(p.projectedIncome).toBe(0)
  })

  it('discounts the changeover days of a freshly reassigned group', () => {
    const settled = projectIncome({
      groups: [group()],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8, currentStock: 0, amountDue: 100,
    })
    const switching = projectIncome({
      groups: [group({ changeoverDaysLeft: 1 })],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8, currentStock: 0, amountDue: 100,
    })
    expect(switching.projectedIncome).toBeLessThan(settled.projectedIncome)
  })

  it('scales with the number of crews assigned', () => {
    const one = projectIncome({
      groups: [group({ id: 'a' })],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 4, currentStock: 0, amountDue: 100,
    })
    const two = projectIncome({
      groups: [group({ id: 'a' }), group({ id: 'b' })],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 4, currentStock: 0, amountDue: 100,
    })
    expect(two.projectedIncome).toBeGreaterThan(one.projectedIncome)
  })

  it('reflects a harvester through the equipment list', () => {
    const harvester: Equipment = {
      id: 'e1', kind: 'harvester', locationId: null, groupId: 'g1', condition: 100,
    }
    expect(extractionTier(['harvester'])).toBe('harvester')

    const withGear = projectIncome({
      groups: [group()], // harvester.groupId: 'g1' above is the single link now
      fields: [field()],
      equipment: [harvester],
      daysRemaining: 4, currentStock: 0, amountDue: 100,
    })
    const without = projectIncome({
      groups: [group()],
      fields: [field()],
      equipment: NO_EQUIPMENT,
      daysRemaining: 4, currentStock: 0, amountDue: 100,
    })
    expect(withGear.projectedIncome).toBeGreaterThan(without.projectedIncome)
  })

  it('never mutates the fields it was given', () => {
    const f = field()
    projectIncome({
      groups: [group()],
      fields: [f],
      equipment: NO_EQUIPMENT,
      daysRemaining: 8, currentStock: 0, amountDue: 100,
    })
    expect(f.remaining).toBe(480)
  })
})
