// src/game-engine/TravelSystem.tabrDilemma.test.ts
// Beat 6's arrival trigger (TravelSystem.ts's maybeOpenTabrDilemma), split
// into its own file rather than added to TravelSystem.test.ts (already at
// 160/200 before this chunk) — mirrors that file's own "Beat 4 auto-open
// trigger" describe block, plus the one behavior Beat 6 adds on top: the
// guard flag is set at OPEN time, so an early close still counts as shown.

import { describe, it, expect } from 'vitest'
import { world, setWorld, createInitialState } from './GameState'
import { startTravel, checkTravelArrival, TABR_DILEMMA_SHOWN_FLAG } from './TravelSystem'
import { endDialogue } from './DialogueSystem'
import { TABR_DILEMMA_TREE_ID, REDWALL_TRUST_TREE_ID } from '../data/dialogue'
import { REDWALL_TRUST_ACKNOWLEDGED_FLAG } from './acts/openingObjectives'

function arriveAt(from: string, to: string): void {
  const state = createInitialState()
  state.player.location = from
  setWorld(state)

  startTravel(to)
  world.time = world.player.arrivalTime
  checkTravelArrival()
}

describe('checkTravelArrival: Beat 6 auto-open trigger (story/tabr_dilemma)', () => {
  it('opens the tree once arrival at Sietch Tabr resolves', () => {
    arriveAt('red_wall_sietch', 'sietch_tabr')

    expect(world.dialogue?.treeId).toBe(TABR_DILEMMA_TREE_ID)
    expect(world.flags[TABR_DILEMMA_SHOWN_FLAG]).toBe(true)
  })

  it('does not open at any other destination', () => {
    // hagg triggers nothing on arrival — a cleaner negative than red_wall_
    // sietch, which has its own Beat 4 trigger and would open THAT tree.
    arriveAt('red_wall_sietch', 'hagg')

    expect(world.dialogue).toBeNull()
    expect(world.flags[TABR_DILEMMA_SHOWN_FLAG]).toBeUndefined()
  })

  it('stays shown after an EARLY close (Escape/×), unlike a completion-flag guard', () => {
    arriveAt('red_wall_sietch', 'sietch_tabr')
    expect(world.dialogue?.treeId).toBe(TABR_DILEMMA_TREE_ID)

    // The tree is not in canCloseDialogue's mandatory set — closes freely
    // from its very first node, with none of its own choices ever taken.
    endDialogue()
    expect(world.dialogue).toBeNull()
    expect(world.flags[TABR_DILEMMA_SHOWN_FLAG]).toBe(true)
  })

  it('does not reopen on a second arrival at Tabr after an early close', () => {
    const state = createInitialState()
    state.player.location = 'red_wall_sietch'
    // Pre-acknowledged so the return trip's own Beat 4 trigger stays quiet —
    // this test is about Beat 6's flag only.
    state.flags[REDWALL_TRUST_ACKNOWLEDGED_FLAG] = true
    setWorld(state)

    startTravel('sietch_tabr')
    world.time = world.player.arrivalTime
    checkTravelArrival()
    expect(world.dialogue?.treeId).toBe(TABR_DILEMMA_TREE_ID)
    endDialogue() // closed early, but the flag is already set

    startTravel('red_wall_sietch')
    world.time = world.player.arrivalTime
    checkTravelArrival()
    expect(world.dialogue).toBeNull() // Beat 4 stayed quiet, as set up above
    expect(world.dialogue?.treeId).not.toBe(REDWALL_TRUST_TREE_ID)

    startTravel('sietch_tabr')
    world.time = world.player.arrivalTime
    checkTravelArrival()

    expect(world.player.location).toBe('sietch_tabr')
    expect(world.dialogue).toBeNull()
  })
})
