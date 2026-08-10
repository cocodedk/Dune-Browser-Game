// WP00 characterization — pins legacy behavior scheduled for removal in
// WP01/WP02. Deletion/update of this file is expected as part of those
// packages and must be cited in their diffs.
//
// Pins: the emergent faction simulation is wired into the campaign day
// boundary, not quarantined behind a sandbox seam (00-index.md: "not active
// in campaign mode"; legacy-authority-inventory.md category 1). Two things
// are pinned together: (a) updateFactionSystems (internal to GameLoop, so
// observed here through its real, deterministic effect on region unrest)
// and updateFactionAI / executeGoals (both mocked so their call counts can
// be asserted directly) all run exactly once per day boundary; (b) none of
// them run again on a second update() call within the same day. Losing (b)
// specifically would mean the faction sim runs every frame, not once a day
// — a materially different bug from "it runs at all".
//
// unrest math for this fixture (deterministic — see territory/territory.ts):
//   sietch_tabr: owner 'fremen', spice 30, unrest 10, no war/trade relations
//   delta = +2 (owned) * unrestMultiplier(normal=1) = 2  =>  10 -> 12

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import type { WorldState } from '../../types'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

vi.mock('../AISystem', () => ({
  updateAI: vi.fn(),
  updateFactionAI: vi.fn(),
}))

vi.mock('../faction/GoalExecutor', () => ({
  executeGoals: vi.fn(),
}))

import { updateFactionAI } from '../AISystem'
import { executeGoals } from '../faction/GoalExecutor'

function fixture(): WorldState {
  const state = createInitialState()
  // Keep factionProfiles/regions at their real defaults — the entire point
  // of this file is that they are NOT quarantined. Only silence the pieces
  // that would otherwise fire on frame one and are not under test here.
  state.goalType = 'survive_20_min'
  state.aiTimers = {}
  state.quota.nextDueDay = 99999
  return state
}

beforeEach(() => {
  vi.clearAllMocks()
  initLoop()
  setWorld(fixture())
})

describe('faction day-update systems run from the campaign day boundary', () => {
  it('runs updateFactionSystems, updateFactionAI, and executeGoals on the day boundary', () => {
    const before = world.regions.find(r => r.id === 'sietch_tabr')?.unrest
    expect(before).toBe(10)

    update(1) // first-ever update() after initLoop() — day boundary fires

    const after = world.regions.find(r => r.id === 'sietch_tabr')?.unrest
    expect(after).toBe(12) // updateFactionSystems ran for real
    expect(updateFactionAI).toHaveBeenCalledTimes(1)
    expect(executeGoals).toHaveBeenCalledTimes(1)
    expect(executeGoals).toHaveBeenCalledWith(1) // normal difficulty multiplier
  })

  it('does not run any of them again on a second update() the same day', () => {
    update(1)
    const afterFirst = world.regions.find(r => r.id === 'sietch_tabr')?.unrest

    update(1) // same in-game day — isDayBoundary() is false

    const afterSecond = world.regions.find(r => r.id === 'sietch_tabr')?.unrest
    expect(afterSecond).toBe(afterFirst)
    expect(updateFactionAI).toHaveBeenCalledTimes(1)
    expect(executeGoals).toHaveBeenCalledTimes(1)
  })
})
