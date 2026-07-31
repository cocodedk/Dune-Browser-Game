// src/game-engine/SietchSystem.test.ts
// Unit tests for pledgePlayerSietch, focused on pledged.count: the flag
// sova.ritual_available gates on, written by nothing until this fix.

import { describe, it, expect, beforeEach } from 'vitest'
import { pledgePlayerSietch } from './SietchSystem'
import { world, setWorld, createInitialState } from './GameState'

describe('pledgePlayerSietch: pledged.count', () => {
  beforeEach(() => {
    setWorld(createInitialState())
  })

  it('sets pledged.count to 1 after pledging the player\'s starting sietch', () => {
    // Fresh state: player stands at sietch_tabr, a fremen-owned, unpledged
    // sietch — pledging it should need no other setup.
    pledgePlayerSietch('sietch_tabr')
    expect(world.flags['pledged.count']).toBe(1)
  })

  it('does not double-count pledging the same sietch twice', () => {
    pledgePlayerSietch('sietch_tabr')
    pledgePlayerSietch('sietch_tabr')
    expect(world.flags['pledged.count']).toBe(1)
  })

  it('derives the count from the sietch list, not from how many calls were made', () => {
    // Stands in for a save loaded mid-game: a sietch is already pledged
    // before pledgePlayerSietch is ever called this session. If the flag
    // were incremented rather than derived, this would read back as 1
    // instead of the true count of 2.
    world.sietches = world.sietches.map(s =>
      s.villageId === 'red_wall_sietch' ? { ...s, pledgedToPlayer: true } : s,
    )
    pledgePlayerSietch('sietch_tabr')
    expect(world.flags['pledged.count']).toBe(2)
  })

  it('leaves pledged.count untouched when the pledge is rejected', () => {
    // Player is not standing at sietch_tabr, so the guard refuses the pledge.
    world.player.location = 'hagg'
    pledgePlayerSietch('sietch_tabr')
    expect(world.flags['pledged.count']).toBeUndefined()
  })
})
