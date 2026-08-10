// src/game-engine/state/hash.test.ts

import { describe, it, expect } from 'vitest'
import { hashState, fnv1a64 } from './hash'
import { createInitialState } from '../GameState'
import { serializeWorld, deserializeWorld } from '../persistence'

describe('fnv1a64', () => {
  it('is deterministic for the same input', () => {
    expect(fnv1a64('abc')).toBe(fnv1a64('abc'))
  })

  it('differs for different input', () => {
    expect(fnv1a64('abc')).not.toBe(fnv1a64('abd'))
  })
})

describe('hashState', () => {
  it('is equal for two independently-built but equal states', () => {
    const a = createInitialState(3)
    const b = createInitialState(3)
    expect(hashState(a)).toBe(hashState(b))
  })

  it('differs when spice differs', () => {
    const a = createInitialState(3)
    const b = createInitialState(3)
    b.player.spice = a.player.spice + 1
    expect(hashState(a)).not.toBe(hashState(b))
  })

  it('differs when rng step differs, even with everything else equal', () => {
    const a = createInitialState(3)
    const b = createInitialState(3)
    b.rng = { ...b.rng, step: b.rng.step + 1 }
    expect(hashState(a)).not.toBe(hashState(b))
  })

  it('is stable across a save -> load -> hash round trip', () => {
    const world = createInitialState(3)
    const before = hashState(world)
    const restored = deserializeWorld(serializeWorld(world))
    expect(hashState(restored)).toBe(before)
  })
})
