// src/game-engine/dialogue/roster.test.ts
// Data-integrity tests over the whole roster. At ~85 dialogue states in the
// finished game these cannot be checked by eye, so they run in CI.

import { describe, it, expect } from 'vitest'
import {
  findCharactersWithoutFallback,
  findMisorderedFallbacks,
  findOrphanStates,
} from './types'
import type { Character, DialogueStateDef } from './types'
import { selectFirstMatch } from './conditions'
import { INITIAL_CHARACTERS } from '../../data/characters'
import { INITIAL_DIALOGUE_STATES } from '../../data/dialogueStates'

// ---------------------------------------------------------------------------
// Live roster integrity
// ---------------------------------------------------------------------------

describe('roster integrity', () => {
  it('gives every character an unconditional fallback', () => {
    // A character with nothing to say is a dead end the player cannot recover
    // from: they walk to a sietch, click the naib, and nothing happens.
    expect(findCharactersWithoutFallback(INITIAL_CHARACTERS, INITIAL_DIALOGUE_STATES)).toEqual([])
  })

  it('places each fallback last so later states are reachable', () => {
    expect(findMisorderedFallbacks(INITIAL_DIALOGUE_STATES)).toEqual([])
  })

  it('has no state referencing a character that does not exist', () => {
    expect(findOrphanStates(INITIAL_CHARACTERS, INITIAL_DIALOGUE_STATES)).toEqual([])
  })

  it('uses unique character ids', () => {
    const ids = INITIAL_CHARACTERS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses unique state ids', () => {
    const ids = INITIAL_DIALOGUE_STATES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every character a name and a role', () => {
    for (const c of INITIAL_CHARACTERS) {
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.role.length).toBeGreaterThan(0)
    }
  })

  it('always resolves a state for every character, even with no flags set', () => {
    // The empty-flag case is a fresh save — the most common state of all.
    for (const character of INITIAL_CHARACTERS) {
      const states = INITIAL_DIALOGUE_STATES.filter(s => s.characterId === character.id)
      expect(selectFirstMatch(states, {})).not.toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// Gating behaviour on the real data
// ---------------------------------------------------------------------------

describe('roster gating', () => {
  function statesFor(characterId: string): DialogueStateDef[] {
    return INITIAL_DIALOGUE_STATES.filter(s => s.characterId === characterId)
  }

  it('escalates Corvin as the Emperor loses patience', () => {
    const states = statesFor('corvin')
    expect(selectFirstMatch(states, { 'quota.patience': 3 })?.id).toBe('corvin.formal')
    expect(selectFirstMatch(states, { 'quota.patience': 2 })?.id).toBe('corvin.displeased')
    expect(selectFirstMatch(states, { 'quota.patience': 1 })?.id).toBe('corvin.final_warning')
    expect(selectFirstMatch(states, { 'quota.patience': 0 })?.id).toBe('corvin.final_warning')
  })

  it('moves Shadir from wary to considering to pledged', () => {
    const states = statesFor('shadir')
    expect(selectFirstMatch(states, {})?.id).toBe('shadir.wary')
    expect(selectFirstMatch(states, { 'loyalty.red_wall_sietch': 45 })?.id)
      .toBe('shadir.considering')
    expect(selectFirstMatch(states, { 'pledged.red_wall_sietch': true })?.id)
      .toBe('shadir.pledged')
  })

  it('offers Sova a ritual only after a pledge and below the use cap', () => {
    const states = statesFor('sova')
    expect(selectFirstMatch(states, {})?.id).toBe('sova.greeting')
    expect(selectFirstMatch(states, { 'pledged.count': 1, 'ritual.count': 0 })?.id)
      .toBe('sova.ritual_available')
    // Three rituals used — the offer withdraws rather than silently failing.
    expect(selectFirstMatch(states, { 'pledged.count': 2, 'ritual.count': 3 })?.id)
      .toBe('sova.greeting')
  })

  it('advances the Duke through the story', () => {
    const states = statesFor('duke_armand')
    expect(selectFirstMatch(states, {})?.id).toBe('duke.briefing')
    expect(selectFirstMatch(states, { 'quota.cycle': 1 })?.id).toBe('duke.first_quota_due')
    expect(selectFirstMatch(states, {
      'quota.cycle': 1,
      'beat.duke_revelation': true,
    })?.id).toBe('duke.after_revelation')
  })
})

// ---------------------------------------------------------------------------
// Validators themselves
// ---------------------------------------------------------------------------

describe('roster validators', () => {
  const character: Character = {
    id: 'x', name: 'X', role: 'r', locationId: 'somewhere', recruited: false,
  }

  it('detects a character with no fallback', () => {
    const states: DialogueStateDef[] = [
      { id: 's1', characterId: 'x', condition: { op: 'eq', key: 'k', value: true }, rootNodeId: 'n' },
    ]
    expect(findCharactersWithoutFallback([character], states)).toEqual(['x'])
  })

  it('detects a fallback that is not last', () => {
    const states: DialogueStateDef[] = [
      { id: 's1', characterId: 'x', condition: null, rootNodeId: 'n' },
      { id: 's2', characterId: 'x', condition: { op: 'eq', key: 'k', value: true }, rootNodeId: 'n' },
    ]
    expect(findMisorderedFallbacks(states)).toEqual(['x'])
  })

  it('detects an orphan state', () => {
    const states: DialogueStateDef[] = [
      { id: 's1', characterId: 'ghost', condition: null, rootNodeId: 'n' },
    ]
    expect(findOrphanStates([character], states)).toEqual(['s1'])
  })

  it('passes clean data', () => {
    const states: DialogueStateDef[] = [
      { id: 's1', characterId: 'x', condition: { op: 'eq', key: 'k', value: true }, rootNodeId: 'n' },
      { id: 's2', characterId: 'x', condition: null, rootNodeId: 'n' },
    ]
    expect(findCharactersWithoutFallback([character], states)).toEqual([])
    expect(findMisorderedFallbacks(states)).toEqual([])
    expect(findOrphanStates([character], states)).toEqual([])
  })
})
