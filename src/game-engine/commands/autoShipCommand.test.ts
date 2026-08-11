// src/game-engine/commands/autoShipCommand.test.ts
// The auto-shipment opt-in command: locked until the first settlement of
// any band, then a straightforward on/off (+ optional amount) toggle.

import { describe, it, expect, beforeEach } from 'vitest'
import { runSetAutoShipCommand } from './autoShipCommand'
import { world, setWorld, createInitialState } from '../GameState'
import {
  AUTO_SHIP_UNLOCKED_FLAG, AUTO_SHIP_ENABLED_FLAG, AUTO_SHIP_AMOUNT_FLAG,
} from '../quota/settlement'

describe('runSetAutoShipCommand', () => {
  beforeEach(() => {
    setWorld(createInitialState())
  })

  it('refuses auto-ship-locked before any settlement has ever completed', () => {
    const outcome = runSetAutoShipCommand(true)

    expect(outcome).toEqual({ ok: false, reason: 'auto-ship-locked' })
    expect(world.flags[AUTO_SHIP_ENABLED_FLAG]).toBeUndefined()
  })

  it('enables auto-shipment once unlocked', () => {
    world.flags[AUTO_SHIP_UNLOCKED_FLAG] = 1

    const outcome = runSetAutoShipCommand(true)

    expect(outcome).toEqual({ ok: true, code: 'auto-ship-configured' })
    expect(world.flags[AUTO_SHIP_ENABLED_FLAG]).toBe(1)
  })

  it('disables it again', () => {
    world.flags[AUTO_SHIP_UNLOCKED_FLAG] = 1
    runSetAutoShipCommand(true)

    runSetAutoShipCommand(false)

    expect(world.flags[AUTO_SHIP_ENABLED_FLAG]).toBe(0)
  })

  it('stores a configured amount when a valid one is given', () => {
    world.flags[AUTO_SHIP_UNLOCKED_FLAG] = 1

    runSetAutoShipCommand(true, 120)

    expect(world.flags[AUTO_SHIP_AMOUNT_FLAG]).toBe(120)
  })

  it('ignores an invalid amount rather than storing garbage', () => {
    world.flags[AUTO_SHIP_UNLOCKED_FLAG] = 1

    runSetAutoShipCommand(true, -5)
    runSetAutoShipCommand(true, NaN)

    expect(world.flags[AUTO_SHIP_AMOUNT_FLAG]).toBeUndefined()
  })
})
