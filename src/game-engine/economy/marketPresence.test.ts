// Regression: the equipment economy must be enterable, and only in person.
//
// User report, 2026-08-16 ("Wind Pass — why can I not travel to it"): the
// only path that discovers a location is prospecting's sietch find,
// prospecting refuses without an ornithopter, the only ornithopter comes
// from the den's market, and the den was seeded undiscovered — a closed
// loop that stranded fifteen locations for the whole game.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buyEquipment } from './marketOps'
import { world, setWorld, createInitialState } from '../GameState'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function denId() {
  return world.villages.find(v => v.kind === 'smuggler_den')!.id
}

beforeEach(() => {
  setWorld(createInitialState())
  world.player.spice = 500
})

describe('buying equipment', () => {
  it('refuses away from the den, and says where to go', () => {
    buyEquipment('thopter')
    expect(world.equipment).toHaveLength(0)
    expect(world.events[0]?.message).toMatch(/Tsimpo/)
  })

  it('succeeds while standing at the den', () => {
    world.player.location = denId()
    buyEquipment('thopter')
    expect(world.equipment.map(e => e.kind)).toContain('thopter')
  })

  it('spends nothing on a refused purchase', () => {
    const before = world.player.spice
    buyEquipment('thopter')
    expect(world.player.spice).toBe(before)
  })

  it('the bootstrap chain is open: reach the den, then own a thopter', () => {
    // The whole fix in one trace — no debug affordance, no hand-set flag.
    const den = world.villages.find(v => v.kind === 'smuggler_den')!
    expect(den.discovered).toBe(true) // travel will not refuse it
    world.player.location = den.id
    buyEquipment('thopter')
    expect(world.equipment.some(e => e.kind === 'thopter')).toBe(true)
  })
})
