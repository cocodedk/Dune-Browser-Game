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

import { EventBus } from '../EventBus'
import { world } from '../game-engine/GameState'
import { update as engineUpdate, initLoop as engineInitLoop } from '../game-engine/GameLoop'
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
})
