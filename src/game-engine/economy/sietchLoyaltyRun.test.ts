// src/game-engine/economy/sietchLoyaltyRun.test.ts
// The day-boundary sietch loyalty neglect writer — the sole production
// caller of sietch/loyalty.ts's decayLoyalty (dayRunner.ts step 7).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runSietchLoyaltyDay } from './sietchLoyaltyRun'
import { world, setWorld, createInitialState } from '../GameState'
import { NEGLECT_DAYS } from '../sietch/loyalty'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

describe('runSietchLoyaltyDay', () => {
  beforeEach(() => {
    setWorld(createInitialState())
  })

  it('does nothing before the neglect window', () => {
    world.time = (NEGLECT_DAYS - 1) * 60
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: 45, pledgedToPlayer: true } : s,
    )

    runSietchLoyaltyDay()

    expect(world.sietches.find(s => s.villageId === 'sietch_tabr')?.loyalty).toBe(45)
  })

  it('decays a neglected pledged sietch and releases it below UNPLEDGE_THRESHOLD', () => {
    world.time = NEGLECT_DAYS * 60
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: 30, pledgedToPlayer: true } : s,
    )

    runSietchLoyaltyDay()

    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.loyalty).toBe(29)
    expect(sietch?.pledgedToPlayer).toBe(false)
  })

  it('never unpledges a sietch that was never pledged, regardless of loyalty', () => {
    world.time = NEGLECT_DAYS * 60
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: 5, pledgedToPlayer: false } : s,
    )

    runSietchLoyaltyDay()

    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.pledgedToPlayer).toBe(false)
  })

  it('derives pledged.count from the post-decay list every call', () => {
    world.time = 1 * 60 // inside the neglect window — no decay fires
    world.sietches = world.sietches.map(s =>
      s.villageId === 'red_wall_sietch' ? { ...s, pledgedToPlayer: true } : s,
    )

    runSietchLoyaltyDay()

    expect(world.flags['pledged.count']).toBe(1)
  })

  it('publishes one event naming the sietch when a pledge is released', () => {
    world.time = NEGLECT_DAYS * 60
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: 30, pledgedToPlayer: true } : s,
    )
    const before = world.events.length

    runSietchLoyaltyDay()

    expect(world.events.length).toBe(before + 1)
    expect(world.events[0].message).toContain('Sietch Tabr')
  })
})
