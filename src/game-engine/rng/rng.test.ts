// src/game-engine/rng/rng.test.ts
// Determinism, snapshot/restore, step accounting, and a known-answer pin.
// See rng.distribution.test.ts for bounds/coverage/distribution sanity.

import { describe, it, expect } from 'vitest'
import { createRng } from './rng'

describe('determinism', () => {
  it('same seed produces identical first 100 values', () => {
    const a = createRng({ seed: 12345, step: 0 })
    const b = createRng({ seed: 12345, step: 0 })
    const seqA = Array.from({ length: 100 }, () => a.next())
    const seqB = Array.from({ length: 100 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('different seeds produce different sequences', () => {
    const a = createRng({ seed: 1, step: 0 })
    const b = createRng({ seed: 2, step: 0 })
    const seqA = Array.from({ length: 50 }, () => a.next())
    const seqB = Array.from({ length: 50 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })
})

describe('snapshot and restore', () => {
  it('restoring a mid-stream snapshot continues the exact sequence', () => {
    const uninterrupted = createRng({ seed: 777, step: 0 })
    const reference = Array.from({ length: 20 }, () => uninterrupted.next())

    const live = createRng({ seed: 777, step: 0 })
    const before = Array.from({ length: 8 }, () => live.next())
    const snapshot = live.state()

    const resumedLive = Array.from({ length: 12 }, () => live.next())
    const restored = createRng(snapshot)
    const resumedFromSnapshot = Array.from({ length: 12 }, () => restored.next())

    expect(before).toEqual(reference.slice(0, 8))
    expect(resumedLive).toEqual(reference.slice(8))
    expect(resumedFromSnapshot).toEqual(reference.slice(8))
  })

  it('createRng({seed, step: n}) matches a fresh rng advanced n times', () => {
    const fresh = createRng({ seed: 99, step: 0 })
    for (let i = 0; i < 30; i++) fresh.next()

    const direct = createRng({ seed: 99, step: 30 })
    expect(direct.state()).toEqual({ seed: 99, step: 30 })
    expect(direct.next()).toBe(fresh.next())
  })
})

describe('step accounting', () => {
  it('n calls to next() advance step by n', () => {
    const rng = createRng({ seed: 5, step: 0 })
    for (let i = 0; i < 17; i++) rng.next()
    expect(rng.state()).toEqual({ seed: 5, step: 17 })
  })

  it('int() advances step by exactly one per call', () => {
    const rng = createRng({ seed: 5, step: 0 })
    rng.int(10)
    expect(rng.state().step).toBe(1)
    rng.int(10)
    rng.int(10)
    expect(rng.state().step).toBe(3)
  })

  it('pick() advances step by exactly one per call', () => {
    const rng = createRng({ seed: 5, step: 0 })
    rng.pick(['a', 'b', 'c'])
    expect(rng.state().step).toBe(1)
    rng.pick(['a', 'b', 'c'])
    rng.pick(['a', 'b', 'c'])
    expect(rng.state().step).toBe(3)
  })

  it('state() itself never advances step', () => {
    const rng = createRng({ seed: 5, step: 3 })
    rng.state()
    rng.state()
    expect(rng.state()).toEqual({ seed: 5, step: 3 })
  })
})

describe('known-answer test (seed 42)', () => {
  // Pins the first 5 values so an unnoticed future algorithm change shows up
  // as a visible diff here rather than silently reshuffling every campaign
  // roll. Regenerate deliberately if the hash in ./hash.ts ever changes.
  it('matches the pinned first 5 values', () => {
    const rng = createRng({ seed: 42, step: 0 })
    const values = Array.from({ length: 5 }, () => rng.next())
    expect(values).toEqual([
      0.7415648787718233,
      0.1599103928769201,
      0.27860113025513866,
      0.34419071652363753,
      0.03803016854024621,
    ])
  })
})
