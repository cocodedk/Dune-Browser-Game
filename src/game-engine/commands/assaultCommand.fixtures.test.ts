// src/game-engine/commands/assaultCommand.fixtures.test.ts
// Fort assault, commandified — closes the endgameOps.ts:75 command-time-roll
// deferral (progress.md Round 5/7). RNG pattern: draw a command-scoped
// service from world.rng AFTER validation passes (a refusal must "mutate
// nothing" — commands/outcome.ts — and advancing rng.step is a mutation),
// write it back once the command resolves. "assault seeded (same world+seed
// -> same outcome twice)" is 02's own fixture-table shape, reused here.

import { describe, it, expect, vi } from 'vitest'
import { world, setWorld, createInitialState } from '../GameState'
import { runAssaultCommand } from './assaultCommand'
import type { TroopGroup } from '../troops/types'
import type { WorldState } from '../../types'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

const FORT_ID = 'tsimpo' // strength 160, not capital — see data/forts.ts

function attacker(overrides: Partial<TroopGroup> = {}): TroopGroup {
  return {
    id: 'g1', homeSietchId: 'sietch_a', locationId: FORT_ID, size: 40,
    skills: { spice: 30, prospect: 25, military: 70, ecology: 15 }, morale: 70,
    task: 'garrison', taskTargetId: null, changeoverDaysLeft: 0,
    ...overrides,
  }
}

function fixture(seed: number): WorldState {
  const state = createInitialState(seed)
  state.troopGroups = [attacker()]
  return state
}

describe('assault seeded: identical world and seed produce an identical outcome twice', () => {
  it('matches command outcome, fort state, troopGroups, and rng state across two independent runs', () => {
    setWorld(fixture(777))
    const outcomeA = runAssaultCommand(FORT_ID)
    const worldA = { ...world, forts: [...world.forts], troopGroups: [...world.troopGroups], rng: { ...world.rng } }

    setWorld(fixture(777))
    const outcomeB = runAssaultCommand(FORT_ID)
    const worldB = { ...world, forts: [...world.forts], troopGroups: [...world.troopGroups], rng: { ...world.rng } }

    expect(outcomeB).toEqual(outcomeA)
    expect(worldB.forts).toEqual(worldA.forts)
    expect(worldB.troopGroups).toEqual(worldA.troopGroups)
    expect(worldB.rng).toEqual(worldA.rng)
  })
})

describe('assault RNG discipline: refusal mutates nothing, success advances exactly one step', () => {
  it('leaves world.rng untouched on a refusal', () => {
    setWorld(fixture(1))
    const before = { ...world.rng }

    const outcome = runAssaultCommand('no_such_fort')

    expect(outcome).toEqual({ ok: false, reason: 'unknown-fort' })
    expect(world.rng).toEqual(before)
  })

  it('advances world.rng by exactly one step on a resolved assault', () => {
    setWorld(fixture(1))
    const before = world.rng.step

    const outcome = runAssaultCommand(FORT_ID)

    expect(outcome).toEqual({ ok: true, code: 'assault-resolved' })
    expect(world.rng.step).toBe(before + 1)
  })
})

describe('assault-fort refusals', () => {
  it('refuses an unknown fort', () => {
    setWorld(fixture(1))
    expect(runAssaultCommand('no_such_fort')).toEqual({ ok: false, reason: 'unknown-fort' })
  })

  it('refuses too few attackers', () => {
    const state = fixture(1)
    state.troopGroups = [attacker({ size: 10 })]
    setWorld(state)
    expect(runAssaultCommand(FORT_ID)).toEqual({ ok: false, reason: 'too-few' })
  })

  it('refuses an untrained force', () => {
    const state = fixture(1)
    state.troopGroups = [attacker({ skills: { spice: 30, prospect: 25, military: 10, ecology: 15 } })]
    setWorld(state)
    expect(runAssaultCommand(FORT_ID)).toEqual({ ok: false, reason: 'untrained' })
  })

  it('refuses an already-destroyed fort', () => {
    const state = fixture(1)
    state.forts = state.forts.map(f => f.locationId === FORT_ID ? { ...f, destroyed: true } : f)
    setWorld(state)
    expect(runAssaultCommand(FORT_ID)).toEqual({ ok: false, reason: 'already-destroyed' })
  })

  it('refuses the capital while fewer than two other forts have fallen', () => {
    const state = fixture(1)
    state.troopGroups = [attacker({ locationId: 'carthag' })]
    setWorld(state)
    expect(runAssaultCommand('carthag')).toEqual({ ok: false, reason: 'capital-locked' })
  })
})
