// WP00 characterization — pins legacy behavior scheduled for removal in
// WP01/WP02. Deletion/update of this file is expected as part of those
// packages and must be cited in their diffs.
//
// Pins: CombatSystem.attackVillage's "second place a sietch can become
// pledged" (CombatSystem.ts:90-103, the code's own comment at 98-101). A won
// attack on a fremen-owned village both (a) promotes the matching sietch to
// pledgedToPlayer, bypassing the canonical pledge chain's loyalty/charisma
// checks entirely (see legacy-authority-inventory.md category 6), and
// (b) resyncs world.flags['pledged.count'] via sietch/assignTask.pledgedCount.
// That flag is not decorative: src/data/dialogueStates.ts's
// 'sova.ritual_available' state gates on pledged.count >= 1, so
// Water-of-Life reachability depends on this sync staying correct for a
// player who takes sietches by force. Both effects must stay visible
// together when this path is removed, or a force-pledge playthrough could
// silently lose Water-of-Life reachability while looking otherwise fine.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { attackVillage } from '../CombatSystem'
import { world, setWorld, createInitialState } from '../GameState'
import type { WorldState } from '../../types'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function fixture(): WorldState {
  const state = createInitialState()
  state.player.troops = 50
  const v = state.villages[0]
  v.owner = 'harkonnen'
  v.status = 'neutral'
  v.loyalty = 40
  state.sietches = [
    { villageId: v.id, pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
  ]
  return state
}

describe('attackVillage: the second pledge path', () => {
  beforeEach(() => {
    setWorld(fixture())
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // roll=0.5 -> effectiveDefense=30
  })

  it('promotes the matching sietch to pledgedToPlayer on a won attack (40 > 30)', () => {
    const villageId = world.villages[0].id
    attackVillage(villageId, 40)

    const sietch = world.sietches.find(s => s.villageId === villageId)
    expect(sietch?.pledgedToPlayer).toBe(true)
  })

  it('resyncs world.flags[\'pledged.count\'] to match, on the same won attack', () => {
    const villageId = world.villages[0].id
    attackVillage(villageId, 40)

    expect(world.flags['pledged.count']).toBe(1)
  })

  it('does neither on a lost attack (20 < 30)', () => {
    const villageId = world.villages[0].id
    attackVillage(villageId, 20)

    const sietch = world.sietches.find(s => s.villageId === villageId)
    expect(sietch?.pledgedToPlayer).toBe(false)
    expect(world.flags['pledged.count']).toBeUndefined()
  })

  it('the flag reflects the total pledged count, not just this attack', () => {
    // A sietch pledged through the canonical chain before this attack still
    // has to be counted — pledgedCount is derived from the full list, not
    // incremented by this call site alone.
    world.sietches.push(
      { villageId: 'sietch_other', pledgedToPlayer: true, fremenWorkers: 10, currentTask: null, outputProgress: 0 },
    )
    const villageId = world.villages[0].id
    attackVillage(villageId, 40)

    expect(world.flags['pledged.count']).toBe(2)
  })
})
