// WP00 characterization — pins legacy behavior scheduled for removal in
// WP01/WP02. Deletion/update of this file is expected as part of those
// packages and must be cited in their diffs.
//
// Pins: GameLoop.ts's day-boundary payout loop (the caller of
// sietch/updateSietches.ts, GameLoop.ts:120-132) applies BOTH payout kinds
// updateSietches can emit straight onto player state — spice via
// world.player.spice += payout.amount, and troops via
// world.player.troops += payout.amount. The pure threshold math in
// updateSietches itself is already pinned in sietch/updateSietches.test.ts;
// this file pins the GameLoop-level application of that math to `world`,
// which is the part WP02 retires (legacy-authority-inventory.md category 2).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import type { WorldState } from '../../types'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function fixture(): WorldState {
  const state = createInitialState()
  // Neutralize systems not under test — village default ownership and
  // troop-group tasks are already inert (see legacy-authority-inventory.md:
  // no village is player-owned and no crew is harvesting by default), so
  // only factionProfiles/aiTimers/quota need silencing here.
  state.goalType = 'survive_20_min'
  state.factionProfiles = []
  state.aiTimers = {}
  state.quota.nextDueDay = 99999

  state.player.spice = 0
  state.player.troops = 0

  // One sietch a day from crossing each threshold (HARVEST_PAYOUT_THRESHOLD
  // and TRAIN_PAYOUT_THRESHOLD are both 3.0; both progress 1.0/day at 50
  // workers — see sietch/types.ts and updateSietches.test.ts).
  state.sietches = [
    {
      villageId: 'sietch_harvest', pledgedToPlayer: true, fremenWorkers: 50,
      currentTask: 'harvest_spice', outputProgress: 2.5,
    },
    {
      villageId: 'sietch_train', pledgedToPlayer: true, fremenWorkers: 50,
      currentTask: 'train_troops', outputProgress: 2.5,
    },
  ]

  return state
}

beforeEach(() => {
  initLoop()
  setWorld(fixture())
})

describe('legacy sietch payout loop (GameLoop day boundary)', () => {
  it('credits world.player.spice by HARVEST_SPICE_PAYOUT from the harvest_spice sietch', () => {
    update(1)

    expect(world.player.spice).toBe(12)
  })

  it('credits world.player.troops by TRAIN_TROOPS_PAYOUT from the train_troops sietch', () => {
    update(1)

    expect(world.player.troops).toBe(6)
  })

  it('resets both sietches’ outputProgress to 0 after paying out', () => {
    update(1)

    const harvest = world.sietches.find(s => s.villageId === 'sietch_harvest')
    const train = world.sietches.find(s => s.villageId === 'sietch_train')
    expect(harvest?.outputProgress).toBe(0)
    expect(train?.outputProgress).toBe(0)
  })

  it('does not pay out again on a second update() within the same day', () => {
    update(1)
    const spiceAfterFirst = world.player.spice
    const troopsAfterFirst = world.player.troops

    update(1) // same in-game day — no boundary crossed

    expect(world.player.spice).toBe(spiceAfterFirst)
    expect(world.player.troops).toBe(troopsAfterFirst)
  })
})
