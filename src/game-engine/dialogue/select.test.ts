// src/game-engine/dialogue/select.test.ts
// Unit tests for rootNodeForCharacter, plus the regression guard for the bug
// class it exists to close: every named character reaching a real node,
// checked against the array the game actually ships rather than by eye.

import { describe, it, expect } from 'vitest'
import { rootNodeForCharacter } from './select'
import type { DialogueStateDef } from './types'
import { INITIAL_CHARACTERS } from '../../data/characters'
import { INITIAL_DIALOGUE_STATES } from '../../data/dialogueStates'
import { STORY_NODES } from '../../data/dialogue'

const STATES: DialogueStateDef[] = [
  {
    id: 'a.conditional',
    characterId: 'a',
    condition: { op: 'eq', key: 'met.a', value: true },
    rootNodeId: 'a_conditional_root',
  },
  {
    id: 'a.fallback',
    characterId: 'a',
    condition: null,
    rootNodeId: 'a_fallback_root',
  },
]

describe('rootNodeForCharacter', () => {
  it('picks the first state whose condition is satisfied', () => {
    expect(rootNodeForCharacter('a', STATES, { 'met.a': true })).toBe('a_conditional_root')
  })

  it('falls through to the unconditional fallback when nothing matches', () => {
    expect(rootNodeForCharacter('a', STATES, {})).toBe('a_fallback_root')
  })

  it('returns null for a character with no states at all', () => {
    expect(rootNodeForCharacter('nobody', STATES, {})).toBeNull()
  })
})

describe('story roster reachability', () => {
  const byId = new Set(STORY_NODES.map(n => n.id))

  // Mirrors `leaves no authored tree unreachable` in VisitPolicy.test.ts, but
  // at the character level rather than the tree level: this is the exact
  // defect described in the task — 96 written nodes that no runtime path
  // reached. A rootNodeId that stops existing, or a character whose states
  // get deleted, fails here instead of silently opening nothing when a
  // player stands in front of them.
  it('resolves every character to a real story node with no flags set', () => {
    for (const character of INITIAL_CHARACTERS) {
      const root = rootNodeForCharacter(character.id, INITIAL_DIALOGUE_STATES, {})
      expect(root, `${character.id} has no dialogue state at all`).not.toBeNull()
      expect(
        byId.has(root as string),
        `${character.id} -> "${root}" does not exist in STORY_NODES`,
      ).toBe(true)
    }
  })
})
