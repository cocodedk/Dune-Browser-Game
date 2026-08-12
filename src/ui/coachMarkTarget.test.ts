// src/ui/coachMarkTarget.test.ts
import { describe, it, expect } from 'vitest'
import { createInitialState } from '../game-engine/GameState'
import { openingObjectiveChain, type ObjectiveRecord } from '../game-engine/acts/openingObjectives'
import { coachMarkKey } from './coachMarkTarget'

function recordFor(id: ObjectiveRecord['id'], world = createInitialState()): ObjectiveRecord {
  const record = openingObjectiveChain(world).find(r => r.id === id)
  if (!record) throw new Error(`no such objective: ${id}`)
  return record
}

describe('coachMarkKey', () => {
  it('is null with no active record', () => {
    expect(coachMarkKey(null, createInitialState())).toBeNull()
  })

  it('is null while any dialogue is open, regardless of which step is active', () => {
    const world = createInitialState()
    world.dialogue = { treeId: 'story/briefing', currentNodeId: 'x', villageId: 'arrakeen' }
    expect(coachMarkKey(recordFor('act1.receive_briefing', world), world)).toBeNull()
  })

  it('maps a location targetHint to a destination-<id> key', () => {
    const world = createInitialState()
    expect(coachMarkKey(recordFor('act1.travel_red_wall', world), world)).toBe('destination-red_wall_sietch')
  })

  it('maps a plain panel targetHint through unchanged', () => {
    const world = createInitialState()
    expect(coachMarkKey(recordFor('act1.read_ledger', world), world)).toBe('quota-ledger')
    expect(coachMarkKey(recordFor('act1.order_first_harvest', world), world)).toBe('crew-panel')
  })

  it('refines act1.earn_trust to pledge-button, not its location targetHint', () => {
    const world = createInitialState()
    expect(coachMarkKey(recordFor('act1.earn_trust', world), world)).toBe('pledge-button')
  })

  it('refines act1.prepare_q1 to settle-button only while a settlement is pending', () => {
    const world = createInitialState()
    expect(coachMarkKey(recordFor('act1.prepare_q1', world), world)).toBe('quota-ledger')

    world.pendingSettlement = {
      cycleIndex: 0, dueDay: 12, amountDue: 90, stock: 30,
      minPartialPayment: 54, arrearsSurchargeRate: 0.5, legalRange: { min: 0, max: 30 },
    }
    expect(coachMarkKey(recordFor('act1.prepare_q1', world), world)).toBe('settle-button')
  })
})
