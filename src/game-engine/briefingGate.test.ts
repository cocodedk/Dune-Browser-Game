// src/game-engine/briefingGate.test.ts
// The opening's pause-for-briefing (pause.ts's briefingPending; 03-opening-
// experience.md "Starting contract": "simulation paused for the briefing").
// Proves both halves: a fresh campaign advances NOTHING until the briefing
// closes, and the production Duke Leto tree's own `setFlags` effect (chunk
// W3c — data/dialogue/opening-briefing.ts) lifts the gate through a real
// dialogue walked to its end. The W3a stand-in this file used to drive
// (any conversation closed at Arrakeen) is gone — DialogueSystem.ts's
// canCloseDialogue() now refuses to close the briefing tree early at all,
// so "closed anywhere else" below proves a DIFFERENT tree, not a forced
// exit from this one.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from './GameLoop'
import { world, setWorld, createInitialState } from './GameState'
import { startDialogue, chooseDialogue, endDialogue } from './DialogueSystem'
import { BRIEFING_COMPLETE_FLAG, LEDGER_READ_FLAG } from './acts/openingObjectives'
import { BRIEFING_TREE_ID } from '../data/dialogue'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

/** Walks the real Duke Leto tree to its end via one of its three replies. */
function completeBriefing(): void {
  startDialogue(BRIEFING_TREE_ID, 'arrakeen')
  chooseDialogue('briefing_understand')
  chooseDialogue('briefing_ack_practical_1')
}

/**
 * completeBriefing(), then walks the Thufir tree it auto-chained into
 * (DialogueSystem.ts's endDialogue) to its own end. Both beats are
 * mandatory before `world.dialogue` returns to null and `inDialogue` stops
 * pausing the clock on its own — see the two tests below that pin exactly
 * this handoff.
 */
function completeBothBeats(): void {
  completeBriefing()
  chooseDialogue('ledger_root_1')
  chooseDialogue('ledger_stock_1')
  chooseDialogue('ledger_projection_1')
  chooseDialogue('ledger_shortfall_1')
  chooseDialogue('ledger_patience_1')
}

describe('briefingPending: a fresh campaign advances nothing until the briefing closes', () => {
  it('no raid, worm, faction or field-depletion event can fire — a rigged crew proves the freeze, not just an empty log', () => {
    // A crew already harvesting/prospecting from day 0 would, if the day
    // boundary ran at all, move spice/rng/events well before day 12 (raids
    // are separately act1-null and worms need a crew — see this test's own
    // citation — so this rig makes the invariant discriminating rather than
    // vacuously true).
    const state = createInitialState(5)
    state.troopGroups = [{
      id: 'group_tabr_1', homeSietchId: 'sietch_tabr', locationId: 'sietch_tabr',
      size: 30, skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
      morale: 60, task: 'prospect', taskTargetId: null, changeoverDaysLeft: 0,
    }]
    setWorld(state)
    initLoop()

    update(10000) // enormous delta, comfortably past several day boundaries if unfrozen

    expect(world.time).toBe(0)
    expect(world.rng.step).toBe(0) // no prospect/worm/raid roll was ever drawn
    expect(world.events).toHaveLength(0)
    expect(world.factionProfiles).toEqual(createInitialState(5).factionProfiles)
    expect(world.wormSightings).toHaveLength(0)
    expect(world.flags[BRIEFING_COMPLETE_FLAG]).toBeUndefined()
  })

  it('stays paused after Beat 1 alone — Beat 2 auto-chained in and is itself still open', () => {
    setWorld(createInitialState(5))
    initLoop()

    completeBriefing()
    expect(world.flags[BRIEFING_COMPLETE_FLAG]).toBe(true)
    expect(world.dialogue?.treeId).toBe('story/ledger') // the auto-chain
    expect(world.flags[LEDGER_READ_FLAG]).not.toBe(true)

    update(1)

    expect(world.time).toBe(0) // still paused — inDialogue, not briefingPending, but paused either way
  })

  it('lifts once BOTH beats are walked to their end, and time then advances', () => {
    setWorld(createInitialState(5))
    initLoop()

    completeBothBeats()
    expect(world.flags[LEDGER_READ_FLAG]).toBe(true)
    expect(world.dialogue).toBeNull()

    update(1)

    expect(world.time).toBeGreaterThan(0)
  })

  it('never re-pauses for the briefing again once both flags are set', () => {
    setWorld(createInitialState(5))
    initLoop()
    completeBothBeats()

    update(1)
    const timeAfterFirst = world.time
    update(1)

    expect(world.time).toBeGreaterThan(timeAfterFirst)
  })

  it('does not fire for a different tree closed at Arrakeen', () => {
    const state = createInitialState(5)
    setWorld(state)
    initLoop()

    startDialogue('neutral_settlement', 'arrakeen')
    endDialogue()

    expect(world.flags[BRIEFING_COMPLETE_FLAG]).toBeUndefined()
    update(1)
    expect(world.time).toBe(0) // still gated — no production exit fired
  })

  it('cannot be closed early (Escape/×) before its own closing choice — the softlock this guards against', () => {
    setWorld(createInitialState(5))
    initLoop()

    startDialogue(BRIEFING_TREE_ID, 'arrakeen')
    endDialogue() // the panel's × / Escape path — refused mid-tree

    expect(world.dialogue).not.toBeNull() // still open
    expect(world.flags[BRIEFING_COMPLETE_FLAG]).toBeUndefined()
  })
})

describe('briefingPending: an old save that already crossed a day boundary never freezes on load', () => {
  it('does not pause when lastProcessedDay is already a number, even with no briefing.complete flag', () => {
    const state = createInitialState(5)
    state.lastProcessedDay = 3 // simulates a save from before this pause reason existed
    setWorld(state)
    initLoop()

    update(1)

    expect(world.time).toBeGreaterThan(0)
  })
})
