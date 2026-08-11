// src/game-engine/commands/issueEquipmentCommand.fixtures.test.ts
// 02 "Equipment": "Every item has one holder: a location, an unissued
// inventory slot, or one crew." / "Issuing equipment targets a selected
// eligible crew. 'Issue to the first crew' is not an acceptable production
// behavior when multiple crews exist."

import { describe, it, expect, vi } from 'vitest'
import { world, setWorld, createInitialState } from '../GameState'
import { runIssueEquipmentCommand } from './issueEquipmentCommand'
import type { TroopGroup, Equipment } from '../troops/types'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function crew(overrides: Partial<TroopGroup> = {}): TroopGroup {
  return {
    id: 'g1', homeSietchId: 'sietch_a', locationId: 'arrakeen', size: 30,
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 }, morale: 60,
    task: 'idle', taskTargetId: null, changeoverDaysLeft: 0,
    ...overrides,
  }
}

function item(overrides: Partial<Equipment> = {}): Equipment {
  return { id: 'eq1', kind: 'harvester', locationId: 'arrakeen', groupId: null, condition: 100, ...overrides }
}

describe('single-holder: issuing moves the item, it is never copied', () => {
  it('sets groupId and clears locationId in one mutation', () => {
    const state = createInitialState()
    state.troopGroups = [crew()]
    state.equipment = [item()]
    setWorld(state)

    const outcome = runIssueEquipmentCommand('eq1', 'g1')

    expect(outcome).toEqual({ ok: true, code: 'issued' })
    expect(world.equipment).toHaveLength(1) // moved, not duplicated
    expect(world.equipment[0].groupId).toBe('g1')
    expect(world.equipment[0].locationId).toBeNull()
  })

  it('refuses to issue equipment already with a crew', () => {
    const state = createInitialState()
    state.troopGroups = [crew({ id: 'g1' }), crew({ id: 'g2' })]
    state.equipment = [item({ groupId: 'g1', locationId: null })]
    setWorld(state)

    expect(runIssueEquipmentCommand('eq1', 'g2')).toEqual({ ok: false, reason: 'already-issued' })
    expect(world.equipment[0].groupId).toBe('g1') // unchanged, not moved to g2
  })

  it('refuses an unknown equipment id', () => {
    const state = createInitialState()
    state.troopGroups = [crew()]
    state.equipment = []
    setWorld(state)

    expect(runIssueEquipmentCommand('no_such_item', 'g1')).toEqual({ ok: false, reason: 'unknown-equipment' })
  })
})

describe('issue-to-selected: two crews, no explicit target', () => {
  it('refuses no-target rather than defaulting to the first crew', () => {
    const state = createInitialState()
    state.troopGroups = [crew({ id: 'g1' }), crew({ id: 'g2' })]
    state.equipment = [item()]
    setWorld(state)

    const outcome = runIssueEquipmentCommand('eq1', null)

    expect(outcome).toEqual({ ok: false, reason: 'no-target' })
    expect(world.equipment[0].groupId).toBeNull() // still unissued — g1 was NOT silently chosen
  })

  it('succeeds once a specific crew is named, from among several', () => {
    const state = createInitialState()
    state.troopGroups = [crew({ id: 'g1' }), crew({ id: 'g2' })]
    state.equipment = [item()]
    setWorld(state)

    const outcome = runIssueEquipmentCommand('eq1', 'g2')

    expect(outcome).toEqual({ ok: true, code: 'issued' })
    expect(world.equipment[0].groupId).toBe('g2')
  })

  it('refuses a target crew that does not exist', () => {
    const state = createInitialState()
    state.troopGroups = [crew({ id: 'g1' })]
    state.equipment = [item()]
    setWorld(state)

    expect(runIssueEquipmentCommand('eq1', 'ghost')).toEqual({ ok: false, reason: 'unknown-crew' })
  })

  it('refuses a destroyed (size-0) crew defensively', () => {
    const state = createInitialState()
    state.troopGroups = [crew({ id: 'g1', size: 0 })]
    state.equipment = [item()]
    setWorld(state)

    expect(runIssueEquipmentCommand('eq1', 'g1')).toEqual({ ok: false, reason: 'crew-destroyed' })
  })
})
