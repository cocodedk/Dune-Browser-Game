// src/game-engine/troops/casualty.test.ts
// The one casualty rule — 02 "Crew lifecycle": "Casualties change crew size
// and may merge or dissolve a crew according to one engine rule. A
// destroyed crew cannot remain selectable."

import { describe, it, expect } from 'vitest'
import { applyCasualty } from './casualty'
import { MERGE_HOME_SIZE } from './types'
import type { TroopGroup, Equipment } from './types'
import type { SietchState } from '../sietch/types'

function group(overrides: Partial<TroopGroup> = {}): TroopGroup {
  return {
    id: 'g1',
    homeSietchId: 'sietch_a',
    locationId: 'sietch_a',
    size: 30,
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 60,
    task: 'harvest',
    taskTargetId: 'field_1',
    changeoverDaysLeft: 0,
    ...overrides,
  }
}

function equip(overrides: Partial<Equipment> = {}): Equipment {
  return { id: 'e1', kind: 'harvester', locationId: null, groupId: 'g1', condition: 100, ...overrides }
}

function sietch(overrides: Partial<SietchState> = {}): SietchState {
  return { villageId: 'sietch_a', pledgedToPlayer: true, fremenWorkers: 40, currentTask: null, outputProgress: 0, crewIds: ['g1'], ...overrides }
}

describe('casualty-dissolve: a crew driven to 0 is gone, not just empty', () => {
  it('removes the crew, drops the sietch crewIds entry, and returns its equipment to inventory', () => {
    const result = applyCasualty([group({ size: 20 })], [equip()], [sietch()], 'g1', 25)

    expect(result.outcome).toBe('dissolved')
    expect(result.survivorId).toBeNull()
    expect(result.groups.find(g => g.id === 'g1')).toBeUndefined()
    expect(result.groups).toHaveLength(0)

    const item = result.equipment.find(e => e.id === 'e1')!
    expect(item.groupId).toBeNull()
    expect(item.locationId).toBe('sietch_a') // the crew's own location, not lost

    expect(result.sietches[0].crewIds).toEqual([])
  })

  it('never leaves a negative size', () => {
    const result = applyCasualty([group({ size: 5 })], [], [], 'g1', 999)
    expect(result.outcome).toBe('dissolved')
  })
})

describe('casualty-merge: a small survivor folds into another crew from the same sietch', () => {
  it('combines size and weights skills/morale by size, and moves equipment to the survivor', () => {
    const small = group({ id: 'g1', size: 20, homeSietchId: 'sietch_a', skills: { spice: 40, prospect: 40, military: 40, ecology: 40 }, morale: 80 })
    const big = group({ id: 'g2', size: 30, homeSietchId: 'sietch_a', skills: { spice: 20, prospect: 20, military: 20, ecology: 20 }, morale: 40 })
    const lost = 20 - (MERGE_HOME_SIZE - 1) // leaves newSize = MERGE_HOME_SIZE - 1, below the merge threshold

    const result = applyCasualty([small, big], [equip({ groupId: 'g1' })], [sietch({ crewIds: ['g1', 'g2'] })], 'g1', lost)

    expect(result.outcome).toBe('merged')
    expect(result.survivorId).toBe('g2')
    expect(result.groups).toHaveLength(1)

    const merged = result.groups[0]
    expect(merged.id).toBe('g2')
    expect(merged.size).toBe(big.size + (MERGE_HOME_SIZE - 1))
    // Weighted toward the larger crew (30) over the smaller remnant (9).
    expect(merged.skills.spice).toBeLessThan(40)
    expect(merged.skills.spice).toBeGreaterThan(20)

    expect(result.equipment[0].groupId).toBe('g2')
    expect(result.sietches[0].crewIds).toEqual(['g2'])
  })

  it('stays a small standalone crew when no same-sietch crew exists to merge into', () => {
    const lone = group({ id: 'g1', size: 20, homeSietchId: 'sietch_only' })
    const lost = 20 - (MERGE_HOME_SIZE - 1)

    const result = applyCasualty([lone], [], [], 'g1', lost)

    expect(result.outcome).toBe('shrunk')
    expect(result.survivorId).toBe('g1')
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].size).toBe(MERGE_HOME_SIZE - 1)
  })
})

describe('casualty-shrunk: a loss that leaves a workable crew just shrinks it', () => {
  it('reduces size and keeps the same id, unchanged equipment/sietches', () => {
    const equipment = [equip()]
    const sietches = [sietch()]
    const result = applyCasualty([group({ size: 30 })], equipment, sietches, 'g1', 5)

    expect(result.outcome).toBe('shrunk')
    expect(result.survivorId).toBe('g1')
    expect(result.groups[0].size).toBe(25)
    expect(result.equipment).toEqual(equipment)
    expect(result.sietches).toEqual(sietches)
  })

  it('preserves object identity for every OTHER group in the roster', () => {
    // A caller iterating a snapshot of world.troopGroups and continuing to
    // mutate a live reference to an untouched group must not have that
    // mutation vanish because applyCasualty rebuilt the whole array.
    const untouched = group({ id: 'g2', size: 40 })
    const result = applyCasualty([group({ size: 30 }), untouched], [], [], 'g1', 5)

    expect(result.groups.find(g => g.id === 'g2')).toBe(untouched)
  })
})

describe('applyCasualty: an id not present in groups', () => {
  it('returns the inputs unchanged rather than throwing', () => {
    const groups = [group()]
    const equipment = [equip()]
    const sietches = [sietch()]
    const result = applyCasualty(groups, equipment, sietches, 'unknown_group', 5)

    expect(result.outcome).toBe('shrunk')
    expect(result.survivorId).toBeNull()
    expect(result.groups).toEqual(groups)
    expect(result.equipment).toEqual(equipment)
    expect(result.sietches).toEqual(sietches)
  })
})
