// src/game-engine/CombatSystem.pledgedCount.test.ts
// Split from CombatSystem.test.ts, which had reached the repository's file
// limit. Covers the second of the two places a sietch can become pledged:
// sova.ritual_available reads pledged.count, not pledgedToPlayer directly,
// so this path has to keep it correct too (see SietchSystem.test.ts for the
// other one).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { attackVillage } from './CombatSystem'
import { world, setWorld, createInitialState } from './GameState'
import type { WorldState } from '../types'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function freshState(): WorldState {
  const state = createInitialState()
  state.player.troops = 50
  return state
}

function harkonnenVillage(state: WorldState) {
  const v = state.villages[0]
  v.owner = 'harkonnen'
  v.status = 'neutral'
  v.loyalty = 40
  return v
}

describe('attackVillage: pledged.count', () => {
  beforeEach(() => {
    setWorld(freshState())
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('updates pledged.count alongside pledgedToPlayer on victory', () => {
    const v = harkonnenVillage(world)
    world.sietches = [
      { villageId: v.id, pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
      { villageId: 'sietch_tabr', pledgedToPlayer: true, fremenWorkers: 10, currentTask: null, outputProgress: 0 },
    ]
    attackVillage(v.id, 40)
    expect(world.flags['pledged.count']).toBe(2)
  })

  it('leaves pledged.count unset on defeat', () => {
    const v = harkonnenVillage(world)
    world.sietches = [
      { villageId: v.id, pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
    ]
    attackVillage(v.id, 20) // 20 committed < 30 effective defense → defeat
    expect(world.flags['pledged.count']).toBeUndefined()
  })
})
