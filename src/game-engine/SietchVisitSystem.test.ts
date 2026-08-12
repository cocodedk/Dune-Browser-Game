// src/game-engine/SietchVisitSystem.test.ts
// visitPlayerSietch (arrival) and giftPlayerSietch (the giveGift command
// seam) — the two live SietchState loyalty writers chunk W2b adds outside
// the pledge chain itself.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { visitPlayerSietch, giftPlayerSietch } from './SietchVisitSystem'
import { world, setWorld, createInitialState } from './GameState'
import { GIFT_SPICE_COST, GIFT_PER_VISIT_CAP } from './sietch/loyalty'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

describe('visitPlayerSietch', () => {
  beforeEach(() => {
    const state = createInitialState()
    state.time = 5 * 60 // day 5
    setWorld(state)
  })

  it('resets the per-visit gift budget and tracks the visit day, granting no automatic loyalty', () => {
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: 45, giftedThisVisit: 24, lastVisitedDay: 0 } : s,
    )

    visitPlayerSietch('sietch_tabr')

    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.loyalty).toBe(45) // unchanged — arrival alone grants nothing
    expect(sietch?.giftedThisVisit).toBe(0)
    expect(sietch?.lastVisitedDay).toBe(5)
  })

  it('does nothing for a location with no sietch record', () => {
    expect(() => visitPlayerSietch('nowhere')).not.toThrow()
  })
})

describe('giftPlayerSietch', () => {
  beforeEach(() => {
    const state = createInitialState()
    state.player.location = 'sietch_tabr'
    state.player.spice = 100
    setWorld(state)
  })

  it('spends spice for loyalty and reports the gifted code', () => {
    const spiceBefore = world.player.spice

    const outcome = giftPlayerSietch('sietch_tabr')

    expect(outcome).toEqual({ ok: true, code: 'gifted' })
    expect(world.player.spice).toBe(spiceBefore - GIFT_SPICE_COST)
    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.loyalty).toBeGreaterThan(45)
    expect(sietch?.giftedThisVisit).toBeGreaterThan(0)
  })

  it('refuses not-present without spending spice', () => {
    world.player.location = 'hagg'
    const spiceBefore = world.player.spice

    const outcome = giftPlayerSietch('sietch_tabr')

    expect(outcome).toEqual({ ok: false, reason: 'not-present' })
    expect(world.player.spice).toBe(spiceBefore)
  })

  it('refuses insufficient-spice', () => {
    world.player.spice = GIFT_SPICE_COST - 1

    const outcome = giftPlayerSietch('sietch_tabr')

    expect(outcome).toEqual({ ok: false, reason: 'insufficient-spice' })
  })

  it('refuses gift-cap-reached once the per-visit cap is exhausted', () => {
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, giftedThisVisit: GIFT_PER_VISIT_CAP } : s,
    )

    const outcome = giftPlayerSietch('sietch_tabr')

    expect(outcome).toEqual({ ok: false, reason: 'gift-cap-reached' })
  })

  it('refuses no-sietch for a location with no sietch record', () => {
    world.player.location = 'nowhere'

    const outcome = giftPlayerSietch('nowhere')

    expect(outcome).toEqual({ ok: false, reason: 'no-sietch' })
  })
})
