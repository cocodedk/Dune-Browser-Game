// src/runtime/VisitPolicy.reachability.test.ts
// The guards that prove authored content can actually be reached.
//
// Split from VisitPolicy.test.ts, which covers the click-decision branches and
// had grown past the repository's 200-line limit. These belong together: each
// one closes a way this game has already lost content silently — a tree nobody
// routes to, a character nobody can select — and each failed only in front of
// a player, never in CI, until it was written down here.

import { describe, it, expect } from 'vitest'
import { createInitialState } from '../game-engine/GameState'
import { decideSpeakTo, treeForOwner, routedTrees, FALLBACK_TREE } from './VisitPolicy'
import { DIALOGUES } from '../data/dialogues'
import { INITIAL_CHARACTERS } from '../data/characters'
import type { FactionId, WorldState } from '../types'

/**
 * Locations that are not on the map at all — a character travelling with the
 * player, or one not yet arrived on Arrakis. decideSpeakTo needs a real
 * VillageId to stand the player at, so nobody carrying one of these can be
 * exercised by placement. Kept as a named constant so the exclusion is stated
 * once and guarded, rather than widening quietly as the roster grows.
 */
const NOT_ON_THE_MAP = new Set(['with_player', 'offworld'])

function stateAt(overrides: Partial<WorldState> = {}): WorldState {
  return { ...createInitialState(), ...overrides }
}

describe('decideSpeakTo reachability', () => {
  // The regression guard for the whole defect this file was changed for —
  // the runtime-reachability counterpart to routing's "leaves no authored
  // tree unreachable" and roster.test.ts's "always resolves a state for
  // every character, even with no flags set". Those two prove every tree is
  // routed to and every character resolves a state; this proves the player
  // can actually get there by standing in front of them.
  it('does not currently place anyone with_player or offworld', () => {
    // decideSpeakTo needs a real VillageId to stand the player at, so nobody
    // parked at one of these can be exercised by placement below. This is
    // the tripwire: if it ever fails, someone in the cast has moved to a
    // non-map location and the reachability guard below needs an honest
    // answer for them — extend it, don't quietly skip them.
    const parked = INITIAL_CHARACTERS.filter(c => NOT_ON_THE_MAP.has(c.locationId))
    expect(parked.map(c => c.id)).toEqual([])
  })

  it('resolves every character in the roster to a real story node', () => {
    const unreachable: string[] = []
    for (const character of INITIAL_CHARACTERS) {
      if (NOT_ON_THE_MAP.has(character.locationId)) continue
      const state = stateAt()
      state.player.location = character.locationId
      const action = decideSpeakTo(state, character.id)
      if (action.kind !== 'dialogue') unreachable.push(character.id)
    }
    expect(unreachable, 'unreachable via decideSpeakTo').toEqual([])
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
