// src/game-engine/troops/prospect.test.ts

import { describe, it, expect } from 'vitest'
import {
  findChance,
  resolveFind,
  regionExhausted,
  findMessage,
  MAX_FIND_CHANCE,
  BASE_FIND_CHANCE,
  FINDS_PER_REGION,
} from './prospect'
import type { FindKind } from './prospect'

// ---------------------------------------------------------------------------
// findChance
// ---------------------------------------------------------------------------

describe('findChance', () => {
  it('starts from the base chance for a green crew in poor sand', () => {
    expect(findChance(0, 0, false)).toBeCloseTo(BASE_FIND_CHANCE, 6)
  })

  it('improves with prospecting skill', () => {
    expect(findChance(50, 0, false)).toBeGreaterThan(findChance(0, 0, false))
  })

  it('improves in a richer region', () => {
    expect(findChance(0, 80, false)).toBeGreaterThan(findChance(0, 10, false))
  })

  it('improves with a tutor assigned', () => {
    expect(findChance(40, 40, true)).toBeGreaterThan(findChance(40, 40, false))
  })

  it('never exceeds the cap', () => {
    // Capped so prospecting is a gamble that pays off over a cycle, never
    // strictly better than harvesting.
    expect(findChance(100, 100, true)).toBeLessThanOrEqual(MAX_FIND_CHANCE)
    expect(findChance(1000, 1000, true)).toBe(MAX_FIND_CHANCE)
  })

  it('ignores negative inputs rather than reducing the chance below base', () => {
    expect(findChance(-50, -50, false)).toBeCloseTo(BASE_FIND_CHANCE, 6)
  })
})

// ---------------------------------------------------------------------------
// resolveFind
// ---------------------------------------------------------------------------

describe('resolveFind', () => {
  it('finds nothing when the roll misses', () => {
    expect(resolveFind(0.2, 0.9, 0.5, 50).kind).toBe('nothing')
  })

  it('finds a field on the bulk of the table', () => {
    const outcome = resolveFind(0.5, 0.1, 0.3, 50)
    expect(outcome.kind).toBe('field')
    expect(outcome.density).toBeGreaterThanOrEqual(30)
    expect(outcome.density).toBeLessThanOrEqual(90)
  })

  it('grants experience on a dry find', () => {
    const outcome = resolveFind(0.5, 0.1, 0.8, 50)
    expect(outcome.kind).toBe('skill')
    expect(outcome.skillGain).toBe(3)
  })

  it('turns up a cache and, rarely, a sietch', () => {
    expect(resolveFind(0.5, 0.1, 0.9, 50).kind).toBe('cache')
    expect(resolveFind(0.5, 0.1, 0.99, 50).kind).toBe('sietch')
  })

  it('yields richer sand in a richer region', () => {
    const poor = resolveFind(0.5, 0.1, 0.0, 0)
    const rich = resolveFind(0.5, 0.1, 0.0, 100)
    expect(rich.density!).toBeGreaterThan(poor.density!)
  })

  it('keeps every rolled density inside the design range', () => {
    for (let t = 0; t < 0.7; t += 0.01) {
      for (const richness of [0, 50, 100]) {
        const outcome = resolveFind(1, 0, t, richness)
        expect(outcome.density).toBeGreaterThanOrEqual(30)
        expect(outcome.density).toBeLessThanOrEqual(90)
      }
    }
  })

  it('distributes roughly to the design table over the roll space', () => {
    const counts: Record<FindKind, number> = {
      field: 0, skill: 0, cache: 0, sietch: 0, nothing: 0,
    }
    for (let t = 0; t < 1; t += 0.001) {
      counts[resolveFind(1, 0, t, 50).kind] += 1
    }
    const total = 1000
    expect(counts.field / total).toBeCloseTo(0.7, 1)
    expect(counts.skill / total).toBeCloseTo(0.15, 1)
    expect(counts.cache / total).toBeCloseTo(0.1, 1)
    expect(counts.sietch / total).toBeCloseTo(0.05, 1)
  })
})

// ---------------------------------------------------------------------------
// Region exhaustion
// ---------------------------------------------------------------------------

describe('regionExhausted', () => {
  it('stays open below the find limit', () => {
    expect(regionExhausted(0)).toBe(false)
    expect(regionExhausted(FINDS_PER_REGION - 1)).toBe(false)
  })

  it('closes at the limit, pushing the player outward', () => {
    expect(regionExhausted(FINDS_PER_REGION)).toBe(true)
    expect(regionExhausted(FINDS_PER_REGION + 5)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

describe('findMessage', () => {
  it('describes every real find and stays silent on nothing', () => {
    expect(findMessage({ kind: 'field', density: 55 })).toContain('55')
    expect(findMessage({ kind: 'skill', skillGain: 3 }).length).toBeGreaterThan(0)
    expect(findMessage({ kind: 'cache' }).length).toBeGreaterThan(0)
    expect(findMessage({ kind: 'sietch' }).length).toBeGreaterThan(0)
    expect(findMessage({ kind: 'nothing' })).toBe('')
  })
})
