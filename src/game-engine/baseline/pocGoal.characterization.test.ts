// WP00 characterization — pins legacy behavior scheduled for removal in
// WP01/WP02. Deletion/update of this file is expected as part of those
// packages and must be cited in their diffs.
//
// Pins: GameLoop.update()'s PoC win-condition check (GameLoop.ts, end of
// update()) writes world.ending = 'win_military' — the field 02 reserves for
// the authored act machine — whenever either legacy goalType is satisfied.
// See docs/PRD/game-completion/baseline/legacy-authority-inventory.md
// category 3. This check runs every frame, not gated to the day boundary, so
// no day-boundary setup is needed to observe it.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import type { WorldState } from '../../types'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

// Neutral fixture: strips every other day-boundary system that could fire on
// the first frame (faction sim, Harkonnen timer, quota) so only the PoC
// win-condition check under test can move world.ending.
function neutralWorld(): WorldState {
  const state = createInitialState()
  state.factionProfiles = []
  state.aiTimers = {}
  state.sietches = []
  state.quota.nextDueDay = 99999
  return state
}

function soloPlayerVillage(owner: WorldState['villages'][number]['owner']) {
  return {
    id: 'v1', name: 'V1', position: { x: 0, y: 0 }, population: 10,
    spice: 0, loyalty: 80, owner, status: 'friendly' as const,
    productionRate: 0, kind: 'sietch' as const, discovered: true, regionId: 'v1',
  }
}

beforeEach(() => {
  initLoop()
})

describe('control_all_villages: writes world.ending on satisfaction', () => {
  it('sets goalAchieved and ending to win_military once the player controls every village', () => {
    const state = neutralWorld()
    state.goalType = 'control_all_villages'
    state.villages = [soloPlayerVillage('player')]
    setWorld(state)

    expect(world.goalAchieved).toBe(false)
    update(1)

    expect(world.goalAchieved).toBe(true)
    expect(world.ending).toBe('win_military')
  })

  it('leaves ending untouched while any village is unclaimed', () => {
    const state = neutralWorld()
    state.goalType = 'control_all_villages'
    state.villages = [soloPlayerVillage('harkonnen')]
    setWorld(state)

    update(1)

    expect(world.goalAchieved).toBe(false)
    expect(world.ending).toBeNull()
  })
})

describe('survive_20_min: writes world.ending on satisfaction', () => {
  it('sets goalAchieved and ending to win_military once world.time reaches 1200s', () => {
    const state = neutralWorld()
    state.goalType = 'survive_20_min'
    state.time = 1199
    setWorld(state)

    update(2) // tick pushes world.time to 1201

    expect(world.goalAchieved).toBe(true)
    expect(world.ending).toBe('win_military')
  })

  it('leaves ending untouched before world.time reaches 1200s', () => {
    const state = neutralWorld()
    state.goalType = 'survive_20_min'
    state.time = 100
    setWorld(state)

    update(1)

    expect(world.goalAchieved).toBe(false)
    expect(world.ending).toBeNull()
  })
})
