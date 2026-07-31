// src/game-engine/desert/sites.test.ts

import { describe, it, expect } from 'vitest'
import { generateSites, reachableSites, nextFind, siteYield } from './sites'
import type { SiteKind } from './sites'

const SEED = 20250727

describe('generateSites: determinism', () => {
  it('gives the same desert for the same seed', () => {
    expect(generateSites(SEED)).toEqual(generateSites(SEED))
  })

  it('gives a different desert for a different seed', () => {
    expect(generateSites(SEED)).not.toEqual(generateSites(SEED + 1))
  })

  it('makes exactly as many sites as asked for', () => {
    expect(generateSites(SEED, 5)).toHaveLength(5)
    expect(generateSites(SEED, 30)).toHaveLength(30)
  })

  it('gives every site a distinct id', () => {
    const ids = generateSites(SEED, 20).map(s => s.id)
    expect(new Set(ids).size).toBe(20)
  })
})

describe('generateSites: placement', () => {
  const sites = generateSites(SEED, 40)

  it('keeps every site on the planet', () => {
    for (const s of sites) {
      expect(s.latitude).toBeGreaterThanOrEqual(-90)
      expect(s.latitude).toBeLessThanOrEqual(90)
      expect(s.longitude).toBeGreaterThanOrEqual(-180)
      expect(s.longitude).toBeLessThanOrEqual(180)
    }
  })

  it('keeps them off the polar caps', () => {
    // There is no spice under ice, and no reason to walk there.
    for (const s of sites) expect(Math.abs(s.latitude)).toBeLessThan(55)
  })

  it('puts none of them inside the inhabited band', () => {
    // A "deep desert" site next door to Arrakeen is not a discovery.
    for (const s of sites) {
      const inBand = Math.abs(s.longitude) < 60 && Math.abs(s.latitude) < 36
      expect(inBand).toBe(false)
    }
  })

  it('never makes anything a day trip', () => {
    for (const s of sites) expect(s.distanceDays).toBeGreaterThanOrEqual(2)
  })

  it('starts every site undiscovered', () => {
    for (const s of sites) expect(s.discovered).toBe(false)
  })
})

describe('reachableSites', () => {
  const sites = generateSites(SEED, 30)

  it('returns nothing when nothing is in range', () => {
    expect(reachableSites(sites, 0)).toEqual([])
  })

  it('returns everything when range is unlimited', () => {
    expect(reachableSites(sites, 999)).toHaveLength(sites.length)
  })

  it('only ever grows as range grows', () => {
    let previous = 0
    for (let days = 0; days <= 10; days++) {
      const count = reachableSites(sites, days).length
      expect(count).toBeGreaterThanOrEqual(previous)
      previous = count
    }
  })
})

describe('nextFind', () => {
  const sites = generateSites(SEED, 20)

  it('finds something when something is in range', () => {
    expect(nextFind(sites, 99, 0.5)).not.toBeNull()
  })

  it('finds nothing when nothing is in range', () => {
    expect(nextFind(sites, 0, 0.5)).toBeNull()
  })

  it('finds nothing once everything is discovered', () => {
    const all = sites.map(s => ({ ...s, discovered: true }))
    expect(nextFind(all, 99, 0.5)).toBeNull()
  })

  it('never returns an already-discovered site', () => {
    const some = sites.map((s, i) => ({ ...s, discovered: i % 2 === 0 }))
    for (let r = 0; r < 1; r += 0.05) {
      expect(nextFind(some, 99, r)?.discovered).not.toBe(true)
    }
  })

  it('stays in range for every roll, including the ends', () => {
    for (const roll of [0, 0.0001, 0.5, 0.9999, 1, 1.5, -1]) {
      const found = nextFind(sites, 99, roll)
      expect(found).not.toBeNull()
      expect(sites).toContainEqual(found)
    }
  })
})

describe('siteYield', () => {
  const kinds: SiteKind[] = ['spice_blow', 'wreck', 'outcrop', 'wormsign', 'cache']

  it('describes every kind', () => {
    for (const kind of kinds) {
      const y = siteYield(kind)
      expect(y.message.length).toBeGreaterThan(0)
      expect(y.spice).toBeGreaterThanOrEqual(0)
    }
  })

  it('makes the blow the richest and the most dangerous', () => {
    const blow = siteYield('spice_blow')
    expect(blow.spice).toBeGreaterThan(siteYield('wreck').spice)
    expect(blow.spice).toBeGreaterThan(siteYield('cache').spice)
    expect(blow.dangerous).toBe(true)
  })

  it('makes the safe places worth nothing, which is the trade', () => {
    expect(siteYield('outcrop').spice).toBe(0)
    expect(siteYield('outcrop').dangerous).toBe(false)
  })

  it('gives salvage only where there is something to salvage', () => {
    expect(siteYield('wreck').salvage).toBe('harvester')
    expect(siteYield('outcrop').salvage).toBeNull()
    expect(siteYield('spice_blow').salvage).toBeNull()
  })
})
