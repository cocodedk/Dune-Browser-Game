// src/game-engine/acts/openingDisclosure.test.ts
import { describe, it, expect } from 'vitest'
import { createInitialState } from '../GameState'
import { marketDisclosed } from './openingDisclosure'

describe('marketDisclosed: MarketPanel mounts once the smuggler den is discovered', () => {
  it('is false on a fresh campaign — the den (tsimpo) starts undiscovered', () => {
    expect(marketDisclosed(createInitialState())).toBe(false)
  })

  it('is true once the den village is marked discovered', () => {
    const world = createInitialState()
    world.villages = world.villages.map(v =>
      v.kind === 'smuggler_den' ? { ...v, discovered: true } : v,
    )
    expect(marketDisclosed(world)).toBe(true)
  })

  it('does NOT fall back to true just because a day boundary has already been crossed', () => {
    // Unlike ledgerDisclosed/destinationsDisclosed, there is no
    // lastProcessedDay hatch here — see this module's own doc for why.
    const world = createInitialState()
    world.lastProcessedDay = 20
    expect(marketDisclosed(world)).toBe(false)
  })

  it('is true if unissued equipment exists, even without the den flag (belt-and-suspenders)', () => {
    const world = createInitialState()
    world.equipment = [{ id: 'eq1', kind: 'thopter', locationId: null, groupId: null, condition: 100 }]
    expect(marketDisclosed(world)).toBe(true)
  })
})
