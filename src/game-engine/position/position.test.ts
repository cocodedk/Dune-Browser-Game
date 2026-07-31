// src/game-engine/position/position.test.ts

import { describe, it, expect } from 'vitest'
import { playerAnchor, anchorPoint, interpolate, longitudeDelta } from './playerAnchor'
import { describePosition, regionDescriptor } from './whereami'
import { world as liveWorld } from '../GameState'
import { canvasToLatLon } from '../../game-render/planet/sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../../game-render/modes/strategic/markerLayout'
import type { WorldState } from '../../types'

const toLatLon = (p: { x: number; y: number }) =>
  canvasToLatLon(p, SOURCE_WIDTH, SOURCE_HEIGHT)

/** A world standing at Sietch Tabr, optionally under way. */
function at(location: string, travelTo?: string, arrivalIn = 0): WorldState {
  return {
    ...liveWorld,
    time: 0,
    player: {
      ...liveWorld.player,
      location,
      travelTarget: travelTo ?? null,
      state: travelTo ? 'traveling' : 'idle',
      arrivalTime: arrivalIn,
    },
  } as WorldState
}

describe('longitudeDelta', () => {
  it('takes the short way across the antimeridian', () => {
    expect(longitudeDelta(179, -179)).toBeCloseTo(2, 6)
    expect(longitudeDelta(-179, 179)).toBeCloseTo(-2, 6)
  })
})

describe('interpolate', () => {
  it('returns the ends exactly', () => {
    const a = { lat: 10, lon: 20 }
    const b = { lat: -5, lon: 60 }
    expect(interpolate(a, b, 0)).toEqual(a)
    expect(interpolate(a, b, 1).lat).toBeCloseTo(b.lat, 6)
    expect(interpolate(a, b, 1).lon).toBeCloseTo(b.lon, 6)
  })

  it('crosses the antimeridian the short way', () => {
    // The midpoint of 179 -> -179 is 180, not 0 — half a planet apart.
    const mid = interpolate({ lat: 0, lon: 179 }, { lat: 0, lon: -179 }, 0.5)
    expect(Math.abs(Math.abs(mid.lon) - 180)).toBeLessThan(0.001)
  })

  it('clamps out-of-range progress', () => {
    const a = { lat: 0, lon: 0 }
    const b = { lat: 10, lon: 10 }
    expect(interpolate(a, b, -1)).toEqual(a)
    expect(interpolate(a, b, 5).lat).toBeCloseTo(10, 6)
  })

  it('always returns a normalised longitude', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const p = interpolate({ lat: 0, lon: 170 }, { lat: 0, lon: -170 }, t)
      expect(p.lon).toBeGreaterThanOrEqual(-180)
      expect(p.lon).toBeLessThanOrEqual(180)
    }
  })
})

describe('playerAnchor', () => {
  it('reports where the player stands when idle', () => {
    const a = playerAnchor(at('sietch_tabr'), toLatLon)!
    expect(a.to).toBeNull()
    expect(a.progress).toBe(0)
    expect(anchorPoint(a)).toEqual(a.from)
  })

  it('reports both ends while travelling', () => {
    const a = playerAnchor(at('sietch_tabr', 'red_wall_sietch', 10), toLatLon)!
    expect(a.to).not.toBeNull()
  })

  it('degrades rather than throwing on an unknown location', () => {
    expect(playerAnchor(at('nowhere'), toLatLon)).toBeNull()
  })

  it('degrades when the destination has vanished', () => {
    const a = playerAnchor(at('sietch_tabr', 'nowhere', 10), toLatLon)!
    expect(a.to).toBeNull()
  })
})

describe('regionDescriptor', () => {
  it('calls out the far side first', () => {
    expect(regionDescriptor({ lat: 0, lon: 140 })).toBe('far side')
    expect(regionDescriptor({ lat: 40, lon: -150 })).toBe('far side')
  })

  it('splits the near side by latitude', () => {
    expect(regionDescriptor({ lat: 25, lon: 0 })).toBe('northern reach')
    expect(regionDescriptor({ lat: -25, lon: 0 })).toBe('southern reach')
    expect(regionDescriptor({ lat: 0, lon: 0 })).toBe('central erg')
  })

  it('puts every real settlement somewhere non-empty', () => {
    // Data-driven, so the thresholds stay honest if settlements move.
    const seen = new Set(
      liveWorld.villages.map(v => regionDescriptor(toLatLon(v.position))),
    )
    expect(seen.size).toBeGreaterThan(1)
    for (const v of liveWorld.villages) {
      expect(regionDescriptor(toLatLon(v.position)).length).toBeGreaterThan(0)
    }
  })
})

describe('describePosition', () => {
  it('names the place when standing still', () => {
    const r = describePosition({ world: at('sietch_tabr'), mode: 'strategic', toLatLon })
    expect(r.headline).toContain('Sietch Tabr')
    expect(r.detail.length).toBeGreaterThan(0)
  })

  it('names both ends while travelling', () => {
    const r = describePosition({
      world: at('sietch_tabr', 'red_wall_sietch', 10), mode: 'flight', toLatLon,
    })
    expect(r.headline).toContain('Sietch Tabr')
    expect(r.headline).toContain('Red Wall Sietch')
  })

  it('says you are inside when you are inside', () => {
    const r = describePosition({ world: at('sietch_tabr'), mode: 'location', toLatLon })
    expect(r.headline).toMatch(/^Inside /)
  })

  it('never throws on a broken location', () => {
    const r = describePosition({ world: at('nowhere'), mode: 'strategic', toLatLon })
    expect(r.headline.length).toBeGreaterThan(0)
    expect(r.detail.length).toBeGreaterThan(0)
  })
})
