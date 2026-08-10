// src/game-engine/state/canonical.test.ts

import { describe, it, expect } from 'vitest'
import { serializeCanonical } from './canonical'
import { createInitialState } from '../GameState'
import type { WorldState } from '../../types'

describe('serializeCanonical', () => {
  it('is stable across two calls on the same state', () => {
    const world = createInitialState(7)
    expect(serializeCanonical(world)).toBe(serializeCanonical(world))
  })

  it('produces identical JSON regardless of top-level key insertion order', () => {
    const world = createInitialState(7)
    const reversedKeys = Object.keys(world).reverse()
    const reordered = {} as WorldState
    for (const key of reversedKeys) {
      ;(reordered as unknown as Record<string, unknown>)[key] =
        (world as unknown as Record<string, unknown>)[key]
    }
    expect(serializeCanonical(reordered)).toBe(serializeCanonical(world))
  })

  it('omits goalType and goalAchieved', () => {
    // docs/PRD/game-completion/02-runtime-consolidation.md "Campaign status":
    // goalType is retired; goalAchieved is derived and "must not be
    // serialized ... independently".
    const world = createInitialState()
    const json = serializeCanonical(world)
    expect(json).not.toContain('goalType')
    expect(json).not.toContain('goalAchieved')
  })

  it('includes the rng state', () => {
    const world = createInitialState(42)
    const parsed = JSON.parse(serializeCanonical(world))
    expect(parsed.rng).toEqual({ seed: 42, step: 0 })
  })

  it('reflects a content change (spice) in the output', () => {
    const world = createInitialState()
    const before = serializeCanonical(world)
    world.player.spice += 1
    expect(serializeCanonical(world)).not.toBe(before)
  })
})
