// src/runtime/VisitPolicy.test.ts
// Unit tests for the pure click-decision policy — every branch, no side effects.

import { describe, it, expect } from 'vitest'
import { createInitialState } from '../game-engine/GameState'
import { decideVisit, treeForOwner, routedTrees, FALLBACK_TREE } from './VisitPolicy'
import { DIALOGUES } from '../data/dialogues'
import type { FactionId, WorldState } from '../types'

function stateAt(overrides: Partial<WorldState> = {}): WorldState {
  return { ...createInitialState(), ...overrides }
}

describe('decideVisit', () => {
  it('returns none while the player is traveling', () => {
    const state = stateAt()
    state.player.state = 'traveling'
    const action = decideVisit(state, state.villages[0].id)
    expect(action).toEqual({ kind: 'none' })
  })

  it('returns none while a dialogue is active', () => {
    const state = stateAt()
    state.dialogue = { treeId: 'village_leader', currentNodeId: 'n1', villageId: state.villages[0].id }
    const action = decideVisit(state, state.villages[0].id)
    expect(action).toEqual({ kind: 'none' })
  })

  it('returns none for an unknown location id', () => {
    const state = stateAt()
    const action = decideVisit(state, 'no_such_village')
    expect(action).toEqual({ kind: 'none' })
  })

  it('returns travel when clicking a village other than the current location', () => {
    const state = stateAt()
    const elsewhere = state.villages.find(v => v.id !== state.player.location)!
    const action = decideVisit(state, elsewhere.id)
    expect(action).toEqual({ kind: 'travel', targetId: elsewhere.id })
  })

  it('returns an event at the player\'s own territory', () => {
    const state = stateAt()
    const here = state.villages.find(v => v.id === state.player.location)!
    here.owner = 'player'
    const action = decideVisit(state, here.id)
    expect(action).toEqual({ kind: 'event', message: `You are at ${here.name} — your territory.` })
  })

  it('opens the harkonnen_stronghold dialogue at a harkonnen-held current location', () => {
    const state = stateAt()
    const here = state.villages.find(v => v.id === state.player.location)!
    here.owner = 'harkonnen'
    const action = decideVisit(state, here.id)
    expect(action).toEqual({ kind: 'dialogue', treeId: 'harkonnen_stronghold', villageId: here.id })
  })

  // These two previously asserted that a fremen sietch and a neutral
  // settlement both opened `village_leader` — the generic tree — which is
  // exactly the defect. Written as a description of what the code did rather
  // than of what the game should do, they made the bug permanent: any fix
  // would fail the suite and read as a regression.
  it('opens the fremen tree at a fremen-held current location', () => {
    const state = stateAt()
    const here = state.villages.find(v => v.id === state.player.location)!
    here.owner = 'fremen'
    const action = decideVisit(state, here.id)
    expect(action).toEqual({ kind: 'dialogue', treeId: 'fremen_sietch', villageId: here.id })
  })

  it('gives every faction its own conversation', () => {
    const expected: [FactionId, string][] = [
      ['harkonnen', 'harkonnen_stronghold'],
      ['fremen', 'fremen_sietch'],
      ['atreides', 'atreides_embassy'],
      ['smugglers', 'smuggler_outpost'],
      ['emperor', 'emperor_delegation'],
      ['neutral', 'neutral_settlement'],
    ]
    for (const [owner, treeId] of expected) {
      const state = stateAt()
      const here = state.villages.find(v => v.id === state.player.location)!
      here.owner = owner
      expect(decideVisit(state, here.id))
        .toEqual({ kind: 'dialogue', treeId, villageId: here.id })
    }
  })
})

describe('tree routing', () => {
  it('only ever names trees that actually exist', () => {
    for (const treeId of routedTrees()) {
      expect(DIALOGUES[treeId], `no tree authored for "${treeId}"`).toBeDefined()
    }
  })

  // The guard for the whole class of bug this module was fixed for. Five of
  // the seven authored trees — fremen_sietch, atreides_embassy,
  // smuggler_outpost, emperor_delegation, neutral_settlement, 78 dialogue
  // nodes between them — had no runtime reference anywhere, because
  // decideVisit named two tree ids inline and had no third branch. Every
  // existing dialogue test passed: they check a tree is internally well-formed,
  // and a tree nothing opens is perfectly well-formed.
  it('leaves no authored tree unreachable', () => {
    const routed = new Set(routedTrees())
    const orphaned = Object.keys(DIALOGUES).filter(id => !routed.has(id))
    expect(orphaned, 'authored but no player can reach it').toEqual([])
  })

  it('falls back rather than going silent for an unrouted faction', () => {
    expect(treeForOwner('nonesuch' as FactionId)).toBe(FALLBACK_TREE)
  })
})
