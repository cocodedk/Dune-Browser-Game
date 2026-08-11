// src/runtime/GameDriver.test.ts
// Throttle behaviour and tick delegation. The engine and EventBus are mocked
// so these tests exercise only the driver's own timing logic.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))
vi.mock('../game-engine/GameLoop', () => ({
  update: vi.fn(),
  initLoop: vi.fn(),
}))
vi.mock('../game-engine/persistence', () => ({
  saveGame: vi.fn(() => Promise.resolve()),
}))

import { EventBus } from '../EventBus'
import { world, setWorld, createInitialState } from '../game-engine/GameState'
import { update as engineUpdate, initLoop as engineInitLoop } from '../game-engine/GameLoop'
import { saveGame } from '../game-engine/persistence'
import { SETTLEMENT_PENDING_AUTOSAVE_FLAG } from '../game-engine/quota/settlement'
import { initLoop, tick } from './GameDriver'

describe('GameDriver', () => {
  beforeEach(() => {
    initLoop() // reset the module-level throttle timer to 0
    vi.clearAllMocks()
  })

  it('initLoop resets engine state and broadcasts the initial world snapshot', () => {
    initLoop()
    expect(engineInitLoop).toHaveBeenCalledOnce()
    expect(EventBus.emit).toHaveBeenCalledWith('world:updated', { state: world })
  })

  it('tick delegates to the engine update with delta converted to seconds', () => {
    tick(250)
    expect(engineUpdate).toHaveBeenCalledWith(0.25)
  })

  it('does not broadcast world:updated before the 100ms throttle elapses', () => {
    tick(40)
    tick(40)
    expect(EventBus.emit).not.toHaveBeenCalled()
  })

  it('returns false on frames before the throttle fires', () => {
    expect(tick(40)).toBe(false)
  })

  it('broadcasts world:updated and returns true once the throttle threshold is reached', () => {
    tick(60)
    const fired = tick(60)
    expect(fired).toBe(true)
    expect(EventBus.emit).toHaveBeenCalledWith('world:updated', { state: world })
  })

  it('resets the throttle after firing, requiring a full interval before firing again', () => {
    tick(100) // fires, resets timer to 0
    vi.clearAllMocks()

    expect(tick(50)).toBe(false)
    expect(EventBus.emit).not.toHaveBeenCalled()
  })

  it('still advances the engine on every tick, even when the throttle does not fire', () => {
    tick(10)
    tick(10)
    expect(engineUpdate).toHaveBeenCalledTimes(2)
  })

  // Recovery row (f)'s settlement-pause autosave (runtime/
  // pendingSettlementAutosave.ts) — real (unmocked) module, exercised the
  // same way maybeOpenQ1Debrief already is on every tick() above.
  it('autosaves once when the settlement-pending-autosave flag is set, and consumes it', () => {
    setWorld(createInitialState())
    world.flags[SETTLEMENT_PENDING_AUTOSAVE_FLAG] = true

    tick(10)

    expect(saveGame).toHaveBeenCalledTimes(1)
    expect(saveGame).toHaveBeenCalledWith(world)
    expect(world.flags[SETTLEMENT_PENDING_AUTOSAVE_FLAG]).toBe(false)
  })

  it('does not autosave on an ordinary tick with no pending-settlement flag', () => {
    setWorld(createInitialState())

    tick(10)

    expect(saveGame).not.toHaveBeenCalled()
  })
})
