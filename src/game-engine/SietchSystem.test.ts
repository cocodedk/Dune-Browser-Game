// src/game-engine/SietchSystem.test.ts
// Unit tests for pledgePlayerSietch, focused on pledged.count: the flag
// sova.ritual_available gates on, written by nothing until this fix.
//
// W2b update: pledgePlayerSietch now runs the atomic five-step chain
// (checkPledgeChain), so a sietch also needs enough loyalty and charisma
// headroom — sietch_tabr's own seeded loyalty (45) is below PLEDGE_THRESHOLD
// (60), so every fixture below raises it explicitly instead of relying on
// the production default.

import { describe, it, expect, beforeEach } from 'vitest'
import { pledgePlayerSietch } from './SietchSystem'
import { world, setWorld, createInitialState } from './GameState'

describe('pledgePlayerSietch: pledged.count', () => {
  beforeEach(() => {
    const state = createInitialState()
    // The canonical opening now starts the player at Arrakeen (00-index.md
    // "Opening state"), so these pledge-mechanics fixtures move the player
    // to sietch_tabr explicitly rather than relying on the old default.
    state.player.location = 'sietch_tabr'
    state.sietches = state.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: 60 } : s,
    )
    setWorld(state)
  })

  it('sets pledged.count to 1 after pledging the player\'s starting sietch', () => {
    // Player stands at sietch_tabr, a fremen-owned, unpledged, loyal-enough
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

  it('leaves pledged.count untouched when loyalty is below threshold', () => {
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: 59 } : s,
    )
    pledgePlayerSietch('sietch_tabr')
    expect(world.flags['pledged.count']).toBeUndefined()
    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.pledgedToPlayer).toBe(false)
  })
})
