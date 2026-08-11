// src/game-engine/CombatSystem.pledgedCount.test.ts
// Split from CombatSystem.test.ts, which had reached the repository's file
// limit. Was: "the second of the two places a sietch can become pledged."
// Chunk W2b killed that path — docs/PRD/game-completion/
// 02-runtime-consolidation.md "Sietches and loyalty" names the atomic
// pledge chain (commands/pledgeCommand.ts) as the ONLY way to pledge. This
// is now a regression guard: taking a sietch by force must never touch
// pledgedToPlayer or pledged.count again, on victory or defeat.

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

describe('attackVillage: pledge state is untouched (combat pledge path retired W2b)', () => {
  beforeEach(() => {
    setWorld(freshState())
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('leaves pledgedToPlayer and pledged.count untouched on victory', () => {
    const v = harkonnenVillage(world)
    world.sietches = [
      { villageId: v.id, pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
      { villageId: 'sietch_tabr', pledgedToPlayer: true, fremenWorkers: 10, currentTask: null, outputProgress: 0 },
    ]
    attackVillage(v.id, 40)

    const taken = world.sietches.find(s => s.villageId === v.id)
    expect(taken?.pledgedToPlayer).toBe(false)
    // pledged.count is never written by this call at all — not even to
    // resync the pre-existing pledge on 'sietch_tabr'.
    expect(world.flags['pledged.count']).toBeUndefined()
  })

  it('leaves pledged.count unset on defeat too', () => {
    const v = harkonnenVillage(world)
    world.sietches = [
      { villageId: v.id, pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
    ]
    attackVillage(v.id, 20) // 20 committed < 30 effective defense → defeat
    expect(world.flags['pledged.count']).toBeUndefined()
  })
})
