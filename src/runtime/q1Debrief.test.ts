// src/runtime/q1Debrief.test.ts
// Beat 7's debrief hook (mirrors runtime/openingBriefing.ts's own test
// coverage shape). Node-safe: no DOM, only world state.

import { describe, it, expect } from 'vitest'
import { world, setWorld, createInitialState } from '../game-engine/GameState'
import { maybeOpenQ1Debrief } from './q1Debrief'
import {
  Q1_DEBRIEF_PENDING_FLAG, Q1_DEBRIEF_BAND_FLAG, encodeSettlementBand,
} from '../game-engine/quota/settlement'
import { Q1_DEBRIEF_TREE_ID } from '../data/dialogue'
import { q1DebriefRootId } from '../data/dialogue/opening-q1-debrief'

function freshWorld() {
  const state = createInitialState()
  setWorld(state)
}

describe('maybeOpenQ1Debrief', () => {
  it('does nothing when no debrief is pending', () => {
    freshWorld()
    maybeOpenQ1Debrief()
    expect(world.dialogue).toBeNull()
  })

  it('opens the band-specific root and consumes the pending flag', () => {
    freshWorld()
    world.flags[Q1_DEBRIEF_PENDING_FLAG] = true
    world.flags[Q1_DEBRIEF_BAND_FLAG] = encodeSettlementBand('partial')

    maybeOpenQ1Debrief()

    expect(world.dialogue?.treeId).toBe(Q1_DEBRIEF_TREE_ID)
    expect(world.dialogue?.currentNodeId).toBe(q1DebriefRootId('partial'))
    expect(world.flags[Q1_DEBRIEF_PENDING_FLAG]).toBe(false)
  })

  it('does not reopen once consumed', () => {
    freshWorld()
    world.flags[Q1_DEBRIEF_PENDING_FLAG] = true
    world.flags[Q1_DEBRIEF_BAND_FLAG] = encodeSettlementBand('full')
    maybeOpenQ1Debrief()
    world.dialogue = null // player closed it

    maybeOpenQ1Debrief()

    expect(world.dialogue).toBeNull()
  })

  it('does not interrupt an already-open dialogue', () => {
    freshWorld()
    world.dialogue = { treeId: 'story/briefing', currentNodeId: 'briefing_root', villageId: 'arrakeen' }
    world.flags[Q1_DEBRIEF_PENDING_FLAG] = true
    world.flags[Q1_DEBRIEF_BAND_FLAG] = encodeSettlementBand('short')

    maybeOpenQ1Debrief()

    expect(world.dialogue!.treeId).toBe('story/briefing') // unchanged
    expect(world.flags[Q1_DEBRIEF_PENDING_FLAG]).toBe(true) // not consumed either
  })

  it('does not fire once the run has ended', () => {
    freshWorld()
    world.flags[Q1_DEBRIEF_PENDING_FLAG] = true
    world.flags[Q1_DEBRIEF_BAND_FLAG] = encodeSettlementBand('full')
    world.ending = 'loss_patience'

    maybeOpenQ1Debrief()

    expect(world.dialogue).toBeNull()
  })
})
