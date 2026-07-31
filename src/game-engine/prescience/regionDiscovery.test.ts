// src/game-engine/prescience/regionDiscovery.test.ts

import { describe, it, expect } from 'vitest'
import { isRegionDiscovered } from './regionDiscovery'
import type { Village } from '../../types'

function village(overrides: Partial<Village> = {}): Village {
  return {
    id: 'v', name: 'V', position: { x: 0, y: 0 }, population: 100,
    spice: 0, loyalty: 50, owner: 'neutral', status: 'neutral',
    productionRate: 0, kind: 'sietch', discovered: true, regionId: 'r',
    ...overrides,
  }
}

describe('isRegionDiscovered', () => {
  it('is true when a discovered village shares the region', () => {
    const villages = [village({ id: 'a', regionId: 'sietch_tabr', discovered: true })]
    expect(isRegionDiscovered('sietch_tabr', villages)).toBe(true)
  })

  it('is false when no village sits in the region at all', () => {
    const villages = [village({ id: 'a', regionId: 'sietch_tabr', discovered: true })]
    expect(isRegionDiscovered('imperial_basin', villages)).toBe(false)
  })

  it('is false when the region\'s village exists but is not yet discovered', () => {
    // The undiscovered-but-known-to-exist case: a region should not read as
    // discovered just because a hidden village happens to live there.
    const villages = [village({ id: 'a', regionId: 'imperial_basin', discovered: false })]
    expect(isRegionDiscovered('imperial_basin', villages)).toBe(false)
  })

  it('is true if any one of several villages in the region is discovered', () => {
    const villages = [
      village({ id: 'a', regionId: 'hagg', discovered: false }),
      village({ id: 'b', regionId: 'hagg', discovered: true }),
    ]
    expect(isRegionDiscovered('hagg', villages)).toBe(true)
  })
})
