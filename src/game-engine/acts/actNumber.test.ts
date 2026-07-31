// src/game-engine/acts/actNumber.test.ts
// The numeric mirror of world.act, and the gate it exists to open.

import { describe, it, expect } from 'vitest'
import { actNumber } from './transitions'
import { createInitialState } from '../GameState'
import { rootNodeForCharacter } from '../dialogue/select'
import { INITIAL_DIALOGUE_STATES } from '../../data/dialogueStates'
import { STORY_NODES } from '../../data/dialogue'

describe('actNumber', () => {
  it('maps every act to its ordinal', () => {
    expect(actNumber('act1')).toBe(1)
    expect(actNumber('act2')).toBe(2)
    expect(actNumber('act3')).toBe(3)
    expect(actNumber('act4')).toBe(4)
  })
})

describe('the act gate', () => {
  it('is seeded at act 1, so act-gated states are readable from the start', () => {
    expect(createInitialState().flags['act']).toBe(1)
  })

  // The defect this bridge closes. corvin.final_demand is
  // `{ op: 'eq', key: 'act', value: 4 }` — a numeric comparison against a flag
  // nothing wrote, while world.act held the string 'act4'. Count Fenring's
  // final demand could not fire however far the story ran.
  it('opens Fenring’s final demand at act 4, and not before', () => {
    const early = rootNodeForCharacter('corvin', INITIAL_DIALOGUE_STATES, { act: 1 })
    expect(early).not.toBe('corvin_final_demand_root')

    const late = rootNodeForCharacter('corvin', INITIAL_DIALOGUE_STATES, { act: 4 })
    expect(late).toBe('corvin_final_demand_root')
  })

  it('points at a node that exists', () => {
    const root = rootNodeForCharacter('corvin', INITIAL_DIALOGUE_STATES, { act: 4 })
    expect(STORY_NODES.some(n => n.id === root)).toBe(true)
  })
})
