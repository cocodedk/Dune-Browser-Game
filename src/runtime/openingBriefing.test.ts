// src/runtime/openingBriefing.test.ts
// Coverage q1Debrief.test.ts's own header already claimed to mirror. Node-safe:
// no DOM, only world state — see runtime/openingBriefing.ts's own doc for why
// this is called every frame from GameDriver.tick() rather than a one-shot
// mount effect (W3i remediation: a mid-session fresh campaign, e.g. StatusBar's
// New, must self-heal through the same per-frame path).

import { describe, it, expect } from 'vitest'
import { world, setWorld, createInitialState } from '../game-engine/GameState'
import { maybeOpenOpeningDialogue } from './openingBriefing'
import { BRIEFING_TREE_ID, LEDGER_TREE_ID } from '../data/dialogue'
import { BRIEFING_COMPLETE_FLAG, LEDGER_READ_FLAG } from '../game-engine/acts/openingObjectives'

function freshWorld() {
  setWorld(createInitialState())
}

// A function indirection, not a bare `world.dialogue?.treeId` re-read — TS's
// control-flow narrowing otherwise carries the `null` from an earlier direct
// assignment through later function calls that don't take `world` as an
// argument, narrowing the later read to `never`. A fresh call re-derives the
// type from scratch every time.
function currentTreeId(): string | undefined {
  return world.dialogue?.treeId
}

describe('maybeOpenOpeningDialogue', () => {
  it('opens the briefing tree for a genuinely fresh campaign', () => {
    freshWorld()
    maybeOpenOpeningDialogue()
    expect(world.dialogue?.treeId).toBe(BRIEFING_TREE_ID)
  })

  it('opens the ledger tree once the briefing is complete but the ledger is not', () => {
    freshWorld()
    world.flags[BRIEFING_COMPLETE_FLAG] = true
    maybeOpenOpeningDialogue()
    expect(world.dialogue?.treeId).toBe(LEDGER_TREE_ID)
  })

  it('does nothing once both opening beats are complete', () => {
    freshWorld()
    world.flags[BRIEFING_COMPLETE_FLAG] = true
    world.flags[LEDGER_READ_FLAG] = true
    maybeOpenOpeningDialogue()
    expect(world.dialogue).toBeNull()
  })

  it('does not interrupt an already-open dialogue', () => {
    freshWorld()
    world.dialogue = { treeId: 'story/ledger', currentNodeId: 'ledger_root', villageId: 'arrakeen' }
    maybeOpenOpeningDialogue()
    expect(world.dialogue?.currentNodeId).toBe('ledger_root') // unchanged
  })

  it('does not fire once a day boundary has ever run, even mid-briefing', () => {
    freshWorld()
    world.lastProcessedDay = 0 // a save that predates this feature, or day 0 already processed
    maybeOpenOpeningDialogue()
    expect(world.dialogue).toBeNull()
  })

  it('does not fire away from Arrakeen', () => {
    freshWorld()
    world.player.location = 'hagg'
    maybeOpenOpeningDialogue()
    expect(world.dialogue).toBeNull()
  })

  // W3i's own regression: a second, genuinely fresh campaign started
  // mid-session (StatusBar's New, no remount) must re-arm — the guards all
  // derive from world state, not a call-site "have I ever run" latch, so a
  // brand-new world object satisfies them again from scratch.
  it('re-arms for a second fresh campaign in the same session', () => {
    freshWorld()
    maybeOpenOpeningDialogue()
    expect(currentTreeId()).toBe(BRIEFING_TREE_ID)

    world.flags[BRIEFING_COMPLETE_FLAG] = true
    world.flags[LEDGER_READ_FLAG] = true
    world.dialogue = null

    freshWorld() // a brand new WorldState object, exactly what newGame() builds
    maybeOpenOpeningDialogue()
    expect(currentTreeId()).toBe(BRIEFING_TREE_ID)
  })
})
