// src/game-engine/acts/openingDisclosure.test.ts
//
// Rewritten 2026-08-16: marketDisclosed now reads 03's disclosure row
// literally — the den must be discovered AND ENTERED. Gating on discovery
// alone forced the den to stay hidden (to keep an empty market frame off the
// Arrakeen view), and a hidden den meant no ornithopter, no prospecting, and
// therefore no way to discover anything ever again. The old pins asserted
// that broken contract, so they are replaced rather than adjusted.
import { describe, it, expect } from 'vitest'
import { createInitialState } from '../GameState'
import { marketDisclosed } from './openingDisclosure'

function atDen() {
  const world = createInitialState()
  const den = world.villages.find(v => v.kind === 'smuggler_den')!
  world.player.location = den.id
  return world
}

describe('marketDisclosed: the market mounts at the den, and only there', () => {
  it('is false on a fresh campaign — the player starts at Arrakeen', () => {
    expect(marketDisclosed(createInitialState())).toBe(false)
  })

  it('is true while standing at the smuggler den', () => {
    expect(marketDisclosed(atDen())).toBe(true)
  })

  it('is false again after leaving the den', () => {
    const world = atDen()
    world.player.location = 'arrakeen'
    expect(marketDisclosed(world)).toBe(false)
  })

  it('does NOT fall back to true just because a day boundary has been crossed', () => {
    const world = createInitialState()
    world.lastProcessedDay = 20
    expect(marketDisclosed(world)).toBe(false)
  })

  it('does not mount just because the player owns equipment elsewhere', () => {
    // The old belt-and-suspenders branch: carrying unissued gear used to be
    // enough. Trading is a place, not an inventory state.
    const world = createInitialState()
    world.equipment = [{ id: 'eq1', kind: 'thopter', locationId: null, groupId: null, condition: 100 }]
    expect(marketDisclosed(world)).toBe(false)
  })

  it('the den itself is reachable from the start — the loop this closed', () => {
    // The bug in one assertion: with the den undiscovered, travel refuses it,
    // so the market could never be entered, so no ornithopter could be
    // bought, so prospecting could never run, so nothing could ever be
    // discovered — including the den.
    const den = createInitialState().villages.find(v => v.kind === 'smuggler_den')!
    expect(den.discovered).toBe(true)
  })
})
