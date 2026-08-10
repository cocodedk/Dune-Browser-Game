// WP00 characterization — pins legacy behavior scheduled for removal in
// WP01/WP02. Deletion/update of this file is expected as part of those
// packages and must be cited in their diffs.
//
// Pins: one day boundary can credit world.player.spice from three
// independent paths at once — crew harvest (economy/harvestRun.ts, kept
// authoritative), village production/collection (VillageSystem.ts, legacy),
// and the legacy sietch threshold payout (GameLoop.ts's payout loop). See
// legacy-authority-inventory.md category 6, "Player spice, credited three
// independent ways every day boundary." The fixture below is chosen so each
// path's contribution is exactly computable, and the assertion pins their
// sum, not any one path in isolation.
//
// Expected contributions for this fixture, computed from the production
// formulas (see harvestYield in troops/harvest.ts, collectPlayerSpice in
// VillageSystem.ts, HARVEST_SPICE_PAYOUT in sietch/types.ts):
//   village collection: max(0.5, (0 + 2) * 0.1) = 0.5
//   crew harvest:        6 * 1 * 1 * (0.5 + 30/100) * (0.4 + 0.006*60) = 3.648
//   sietch threshold:    HARVEST_SPICE_PAYOUT = 12
//   total:                16.148

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import type { WorldState } from '../../types'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function fixture(): WorldState {
  const state = createInitialState()
  // Neutralize systems not under test — see pocGoal.characterization.test.ts
  // for why each of these is otherwise live on the very first frame.
  state.goalType = 'survive_20_min'
  state.factionProfiles = []
  state.aiTimers = {}
  state.quota.nextDueDay = 99999

  state.player.spice = 0
  state.player.troops = 0

  // Path 1: village production + collection.
  state.villages = [{
    id: 'v1', name: 'V1', position: { x: 0, y: 0 }, population: 10,
    spice: 0, loyalty: 80, owner: 'player', status: 'friendly',
    productionRate: 2, kind: 'sietch', discovered: true, regionId: 'v1',
  }]

  // Path 2: crew harvest. Reuses the starting crew's default skills/morale
  // (spice: 30, morale: 60) so the yield formula's inputs are all authored
  // defaults, not test-invented numbers.
  state.troopGroups = state.troopGroups.map(g => ({
    ...g, task: 'harvest', taskTargetId: 'field_test', changeoverDaysLeft: 0,
  }))
  state.spiceFields = [{
    id: 'field_test', regionId: 'v1', position: { x: 0, y: 0 },
    discovered: true, density: 60, capacity: 1000, remaining: 1000,
  }]
  state.equipment = [] // hand extraction tier — no worm risk (see harvestRun)

  // Path 3: legacy sietch threshold payout, one call from crossing the
  // HARVEST_PAYOUT_THRESHOLD (3.0) at 50 workers (+1.0/day).
  state.sietches = [{
    villageId: 'v1', pledgedToPlayer: true, fremenWorkers: 50,
    currentTask: 'harvest_spice', outputProgress: 2.5,
  }]

  return state
}

beforeEach(() => {
  initLoop()
  setWorld(fixture())
})

describe('one day boundary, three spice credits', () => {
  it('sums crew harvest + village collection + legacy sietch payout in a single update()', () => {
    update(1)

    expect(world.player.spice).toBeCloseTo(16.148, 3)
  })

  it('is not explained by any single path alone', () => {
    update(1)

    // Rules out "it's just the sietch payout" and "it's just the village
    // skim" — the credited total exceeds either path taken alone.
    expect(world.player.spice).toBeGreaterThan(12)
    expect(world.player.spice).toBeGreaterThan(0.5 + 12)
  })
})
