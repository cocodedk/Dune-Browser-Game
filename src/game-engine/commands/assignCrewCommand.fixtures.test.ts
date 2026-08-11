// src/game-engine/commands/assignCrewCommand.fixtures.test.ts
// changeover-once (progress.md Round 8/W2d plan): "A crew has one task and
// one location. Reassignment applies one changeover cost exactly once" (02
// "Crew lifecycle") — replay/double-dispatch while a changeover is pending
// must not stack costs. CHANGEOVER_DAYS is 1, so "mid-changeover" cannot
// span more than a single day boundary; this fixture proves the property at
// both points where a double-dispatch could otherwise cost twice: the
// instant after the first assignment (still pending), and the instant after
// it settles (steady state) — plus that a genuinely NEW reassignment still
// pays exactly one day, never accumulating past CHANGEOVER_DAYS.

import { describe, it, expect, vi } from 'vitest'
import { world, setWorld, createInitialState } from '../GameState'
import { runAssignCrewCommand } from './assignCrewCommand'
import { applyCasualty } from '../troops/casualty'
import { runHarvestDay } from '../economy/harvestRun'
import { createRng } from '../rng/rng'
import { CHANGEOVER_DAYS } from '../troops/types'
import { FIRST_HARVEST_FLAG } from '../acts/openingObjectives'
import type { TroopGroup, SpiceField } from '../troops/types'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function crew(overrides: Partial<TroopGroup> = {}): TroopGroup {
  return {
    id: 'g1', homeSietchId: 'sietch_a', locationId: 'sietch_a', size: 30,
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 }, morale: 60,
    task: 'idle', taskTargetId: null, changeoverDaysLeft: 0,
    ...overrides,
  }
}

function field(overrides: Partial<SpiceField> = {}): SpiceField {
  return {
    id: 'field_1', regionId: 'sietch_a', position: { x: 0, y: 0 },
    discovered: true, density: 60, capacity: 1000, remaining: 1000,
    ...overrides,
  }
}

function freshWithCrew(): void {
  const state = createInitialState()
  state.troopGroups = [crew()]
  state.spiceFields = [field()]
  // canOrderCrewRemotely (EconomySystem.ts) requires presence before
  // Farspeech — stand the player with the crew so these fixtures exercise
  // the assignment rules, not the remote-order gate.
  state.player.location = 'sietch_a'
  setWorld(state)
}

describe('changeover-once: assign, advance a day mid-changeover, reassign attempt', () => {
  it('never charges a second changeover for a replayed identical dispatch', () => {
    freshWithCrew()

    const first = runAssignCrewCommand('g1', 'harvest', 'field_1')
    expect(first).toEqual({ ok: true, code: 'assigned' })
    expect(world.troopGroups[0].changeoverDaysLeft).toBe(CHANGEOVER_DAYS)

    // Double-dispatch WHILE the changeover from the first call is still
    // pending — the exact race the contract names.
    const replay = runAssignCrewCommand('g1', 'harvest', 'field_1')
    expect(replay).toEqual({ ok: false, reason: 'already-assigned' })
    expect(world.troopGroups[0].changeoverDaysLeft).toBe(CHANGEOVER_DAYS) // unchanged, not stacked

    // Advance one day: the pending changeover settles.
    runHarvestDay(createRng(world.rng))
    expect(world.troopGroups[0].changeoverDaysLeft).toBe(0)
    expect(world.troopGroups[0].task).toBe('harvest')

    // Replay again now that the crew is steady-state on the task — still a
    // no-op, still no new changeover charged.
    const replayAfterSettling = runAssignCrewCommand('g1', 'harvest', 'field_1')
    expect(replayAfterSettling).toEqual({ ok: false, reason: 'already-assigned' })
    expect(world.troopGroups[0].changeoverDaysLeft).toBe(0)
  })

  it('a genuinely new reassignment pays exactly one changeover, never more than CHANGEOVER_DAYS', () => {
    freshWithCrew()
    runAssignCrewCommand('g1', 'harvest', 'field_1')
    expect(world.troopGroups[0].changeoverDaysLeft).toBe(CHANGEOVER_DAYS)

    // Reassign to a DIFFERENT task while the first changeover is still
    // pending — legal (not a replay of the same order), and the cost
    // still never exceeds the constant.
    const reassign = runAssignCrewCommand('g1', 'train', null)
    expect(reassign).toEqual({ ok: true, code: 'assigned' })
    expect(world.troopGroups[0].changeoverDaysLeft).toBe(CHANGEOVER_DAYS)
    expect(world.troopGroups[0].changeoverDaysLeft).toBeLessThanOrEqual(CHANGEOVER_DAYS)
  })
})

describe('assign-crew refusals', () => {
  it('refuses an unknown crew id', () => {
    freshWithCrew()
    expect(runAssignCrewCommand('no_such_crew', 'harvest', 'field_1'))
      .toEqual({ ok: false, reason: 'unknown-crew' })
  })

  it('refuses a crew a casualty has just dissolved — unknown-crew, and it cannot be re-selected', () => {
    freshWithCrew()
    const result = applyCasualty(world.troopGroups, world.equipment, world.sietches, 'g1', 999)
    world.troopGroups = result.groups
    world.equipment = result.equipment
    world.sietches = result.sietches
    expect(result.outcome).toBe('dissolved')
    expect(world.troopGroups.find(g => g.id === 'g1')).toBeUndefined()

    expect(runAssignCrewCommand('g1', 'harvest', 'field_1'))
      .toEqual({ ok: false, reason: 'unknown-crew' })
  })

  it('refuses an invalid target: no field chosen for harvest', () => {
    freshWithCrew()
    expect(runAssignCrewCommand('g1', 'harvest', null))
      .toEqual({ ok: false, reason: 'no-target' })
  })

  it('refuses prospecting without an ornithopter', () => {
    freshWithCrew()
    expect(runAssignCrewCommand('g1', 'prospect', null))
      .toEqual({ ok: false, reason: 'needs-thopter' })
  })

  it('refuses already-on-task without touching state', () => {
    freshWithCrew()
    runAssignCrewCommand('g1', 'train', null)
    const before = { ...world.troopGroups[0] }

    expect(runAssignCrewCommand('g1', 'train', null)).toEqual({ ok: false, reason: 'already-assigned' })
    expect(world.troopGroups[0]).toEqual(before)
  })
})

// 03-opening-experience.md "Recovery and refusal behavior": "Waits with no
// crew order | Ledger remains short; objective points to the idle crew
// without automatically assigning it." Proven through production entry
// points, same as every other fixture in this file — several real day
// boundaries pass with no player order, and nothing at any layer (dayRunner
// systems, assign-crew command) ever writes a task onto an idle crew.
describe('no auto-assignment: an idle pledged crew stays idle across day boundaries', () => {
  it('never gets a task, a target, or any spice on its own', () => {
    freshWithCrew()
    expect(world.troopGroups[0].task).toBe('idle')

    for (let day = 0; day < 5; day++) runHarvestDay(createRng(world.rng))

    expect(world.troopGroups[0].task).toBe('idle')
    expect(world.troopGroups[0].taskTargetId).toBeNull()
    expect(world.player.spice).toBe(60) // starting contract's seed, untouched
  })
})

describe('opening objective seam: crew.harvest_assigned (acts/openingObjectives.ts)', () => {
  it('is set on the first harvest assignment, and stays set after reassignment away from harvest', () => {
    freshWithCrew()
    expect(world.flags[FIRST_HARVEST_FLAG]).toBeUndefined()

    runAssignCrewCommand('g1', 'harvest', 'field_1')
    expect(world.flags[FIRST_HARVEST_FLAG]).toBe(true)

    runAssignCrewCommand('g1', 'train', null)
    expect(world.flags[FIRST_HARVEST_FLAG]).toBe(true) // sticky — historical, not live state
  })

  it('is not set by a non-harvest assignment', () => {
    freshWithCrew()
    runAssignCrewCommand('g1', 'train', null)
    expect(world.flags[FIRST_HARVEST_FLAG]).toBeUndefined()
  })
})
