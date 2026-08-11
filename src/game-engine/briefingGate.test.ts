// src/game-engine/briefingGate.test.ts
// The opening's pause-for-briefing (pause.ts's briefingPending; 03-opening-
// experience.md "Starting contract": "simulation paused for the briefing").
// Proves both halves: a fresh campaign advances NOTHING until the briefing
// closes, and the production stand-in (DialogueSystem.ts's endDialogue)
// lifts the gate through a real dialogue open/close at Arrakeen — no other
// engine seam exists yet to clear it (W3c replaces the stand-in with the
// authored Duke Leto tree's own setFlags effect). Also proves the old-save
// safeguard pause.ts's PauseInputs doc names.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from './GameLoop'
import { world, setWorld, createInitialState } from './GameState'
import { startDialogue, endDialogue } from './DialogueSystem'
import { BRIEFING_COMPLETE_FLAG } from './acts/openingObjectives'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

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

  it('lifts the moment the production stand-in sets the flag, and time then advances', () => {
    setWorld(createInitialState(5))
    initLoop()

    startDialogue('neutral_settlement', 'arrakeen') // decideVisit's own tree for Arrakeen's owner
    endDialogue()
    expect(world.flags[BRIEFING_COMPLETE_FLAG]).toBe(true)

    update(1)

    expect(world.time).toBeGreaterThan(0)
  })

  it('never re-pauses for the briefing again once the flag is set', () => {
    setWorld(createInitialState(5))
    initLoop()
    startDialogue('neutral_settlement', 'arrakeen')
    endDialogue()

    update(1)
    const timeAfterFirst = world.time
    update(1)

    expect(world.time).toBeGreaterThan(timeAfterFirst)
  })

  it('does not fire the stand-in for a conversation closed anywhere else', () => {
    const state = createInitialState(5)
    state.player.location = 'red_wall_sietch'
    setWorld(state)
    initLoop()

    startDialogue('neutral_settlement', 'red_wall_sietch')
    endDialogue()

    expect(world.flags[BRIEFING_COMPLETE_FLAG]).toBeUndefined()
    update(1)
    expect(world.time).toBe(0) // still gated — no production exit fired
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
