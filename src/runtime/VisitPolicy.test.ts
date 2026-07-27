// src/runtime/VisitPolicy.test.ts
// Unit tests for the pure click-decision policy — every branch, no side effects.

import { describe, it, expect } from 'vitest'
import { createInitialState } from '../game-engine/GameState'
import { decideVisit } from './VisitPolicy'
import type { WorldState } from '../types'

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

  it('opens the village_leader dialogue at any other owner\'s current location', () => {
    const state = stateAt()
    const here = state.villages.find(v => v.id === state.player.location)!
    here.owner = 'neutral'
    const action = decideVisit(state, here.id)
    expect(action).toEqual({ kind: 'dialogue', treeId: 'village_leader', villageId: here.id })
  })

  it('opens the village_leader dialogue for a fremen-held current location', () => {
    const state = stateAt()
    const here = state.villages.find(v => v.id === state.player.location)!
    here.owner = 'fremen'
    const action = decideVisit(state, here.id)
    expect(action).toEqual({ kind: 'dialogue', treeId: 'village_leader', villageId: here.id })
  })
})
