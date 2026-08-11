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
import { BRIEFING_COMPLETE_FLAG, LEDGER_READ_FLAG } from '../game-engine/acts/openingObjectives'
import { BRIEFING_TREE_ID } from '../data/dialogue'
import { initLoop, tick } from './GameDriver'

// A function indirection, not a bare `world.dialogue?.treeId` re-read — TS's
// control-flow narrowing otherwise carries a `null` from an earlier direct
// assignment through later calls that don't take `world` as an argument,
// narrowing a later read to `never`. A fresh call re-derives the type.
function currentTreeId(): string | undefined {
  return world.dialogue?.treeId
}

describe('GameDriver', () => {
  beforeEach(() => {
    initLoop() // reset the module-level throttle timer to 0
    vi.clearAllMocks()
    // Keep the ambient module-scope `world` immune to the opening's own
    // auto-open (runtime/openingBriefing.ts, wired into tick() below) for
    // every test in this file that does not care about it — only the
    // dedicated test further down explicitly re-arms a fresh world via
    // setWorld() to exercise that behaviour on purpose.
    world.flags[BRIEFING_COMPLETE_FLAG] = true
    world.flags[LEDGER_READ_FLAG] = true
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

  // W3i remediation: the opening's auto-open (runtime/openingBriefing.ts)
  // used to fire only from ThreeContainer's one-time mount effect, so a
  // fresh campaign started mid-session (StatusBar's New button) never
  // reopened the briefing and froze the clock forever (briefingPending).
  // Moved to this per-frame hook, the same q1Debrief/pendingSettlementAutosave
  // shape, so it self-heals on ANY path into a fresh world — proven here via
  // tick() itself, not by calling maybeOpenOpeningDialogue() directly.
  it('auto-opens the opening briefing via tick() for a fresh campaign, and re-arms for a second fresh campaign in the same session', () => {
    setWorld(createInitialState())
    expect(world.dialogue).toBeNull()

    tick(10)

    expect(currentTreeId()).toBe(BRIEFING_TREE_ID)

    // Completing Beat 1 the way a real final reply does: set the flag, close
    // the dialogue.
    world.flags[BRIEFING_COMPLETE_FLAG] = true
    world.dialogue = null

    // A second, brand-new campaign started mid-session — the same running
    // tick() loop now drives a completely different WorldState object, with
    // no remount in between (setWorld's own live-binding contract).
    setWorld(createInitialState())
    expect(world.flags[BRIEFING_COMPLETE_FLAG]).not.toBe(true) // sanity: truly fresh

    tick(10)

    expect(currentTreeId()).toBe(BRIEFING_TREE_ID)
  })
})
