// src/runtime/VisitPolicy.test.ts
// Unit tests for the pure click-decision policy — every branch, no side effects.

import { describe, it, expect } from 'vitest'
import { createInitialState } from '../game-engine/GameState'
import { decideVisit, decideSpeakTo } from './VisitPolicy'
import { STORY_TREE_ID } from '../data/dialogue'
import type { FactionId, WorldState } from '../types'

function stateAt(overrides: Partial<WorldState> = {}): WorldState {
  const base = createInitialState()
  // The canonical opening now starts the player at Arrakeen, not Sietch
  // Tabr (docs/PRD/game-completion/00-index.md "Opening state"). These
  // fixtures pin dialogue-routing behavior that is specifically about
  // Sietch Tabr's residents (Chani/ysane, then Sova), so they re-establish
  // that precondition explicitly rather than relying on the old default.
  return { ...base, player: { ...base.player, location: 'sietch_tabr' }, ...overrides }
}

/**
 * A village with no INITIAL_CHARACTERS resident, so tests below can isolate
 * faction-owner routing from the story-node routing added on top of it —
 * decideVisit checks residency first, and the default start (Sietch Tabr)
 * has one, which would otherwise mask what these tests mean to assert.
 */
const UNRESIDED_VILLAGE = 'habbanya_ridge'

function stateAtUnresidedVillage() {
  const state = stateAt()
  state.player.location = UNRESIDED_VILLAGE
  const here = state.villages.find(v => v.id === UNRESIDED_VILLAGE)!
  return { state, here }
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
    const { state, here } = stateAtUnresidedVillage()
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
    const { state, here } = stateAtUnresidedVillage()
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
      const { state, here } = stateAtUnresidedVillage()
      here.owner = owner
      expect(decideVisit(state, here.id))
        .toEqual({ kind: 'dialogue', treeId, villageId: here.id })
    }
  })

  // The defect this stage of the module closes: the generic faction trees
  // ran unconditionally even at a location with a named, written character.
  // Standing at Sietch Tabr (the default player start) puts Chani in front
  // of the player before Sova, since INITIAL_CHARACTERS lists her first for
  // that location, and with no flags set she opens on her unconditional
  // fallback state.
  it('opens the resident\'s own story node where one is written', () => {
    const state = stateAt()
    const here = state.villages.find(v => v.id === state.player.location)!
    const action = decideVisit(state, here.id)
    expect(action).toEqual({
      kind: 'dialogue', treeId: STORY_TREE_ID, villageId: here.id, nodeId: 'ysane_first_meeting_root',
    })
  })

  it('falls back to the faction tree at a location with no written resident', () => {
    const { state, here } = stateAtUnresidedVillage()
    const action = decideVisit(state, here.id)
    expect(action).toEqual({ kind: 'dialogue', treeId: 'fremen_sietch', villageId: here.id })
  })
})

describe('decideSpeakTo', () => {
  // The defect decideSpeakTo exists to fix: Sietch Tabr is the default start
  // and holds two residents, Chani (ysane) then Sova. decideVisit's
  // first-resident default can only ever reach Chani; Sova was permanently
  // stranded behind her until a caller could name a resident directly.
  it("opens the second resident's own story node, unreachable via decideVisit", () => {
    const state = stateAt()
    const action = decideSpeakTo(state, 'sova')
    expect(action).toEqual({
      kind: 'dialogue', treeId: STORY_TREE_ID, villageId: state.player.location, nodeId: 'sova_greeting_root',
    })
  })

  it('returns none for a character who is elsewhere', () => {
    const state = stateAt()
    // Stilgar (shadir) lives at red_wall_sietch; the player starts at sietch_tabr.
    const action = decideSpeakTo(state, 'shadir')
    expect(action).toEqual({ kind: 'none' })
  })

  it('returns none while the player is traveling', () => {
    const state = stateAt()
    state.player.state = 'traveling'
    expect(decideSpeakTo(state, 'sova')).toEqual({ kind: 'none' })
  })

  it('returns none while a dialogue is active', () => {
    const state = stateAt()
    state.dialogue = { treeId: 'village_leader', currentNodeId: 'n1', villageId: state.villages[0].id }
    expect(decideSpeakTo(state, 'sova')).toEqual({ kind: 'none' })
  })

  it('returns none for an unknown character id', () => {
    const state = stateAt()
    expect(decideSpeakTo(state, 'no_such_character')).toEqual({ kind: 'none' })
  })
})
