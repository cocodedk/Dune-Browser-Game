// src/game-render/modes/strategic/localMap.test.ts

import { describe, it, expect } from 'vitest'
import {
  longitudeDelta, angularDistance, localPlacements, seedForLocation,
  surfaceCentre, descentTarget,
} from './localMap'
import { canvasToLatLon } from '../../planet/sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from './markerLayout'

const canvasToLatLonAt = (p: { x: number; y: number }) =>
  canvasToLatLon(p, SOURCE_WIDTH, SOURCE_HEIGHT)

const SPREAD = 1848
const EXTENT = 22

const at = (id: string, x: number, y: number) => ({ id, position: { x, y } })

describe('longitudeDelta', () => {
  it('takes the short way round the planet', () => {
    // 179 to -179 is two degrees east, not 358 west.
    expect(longitudeDelta(179, -179)).toBeCloseTo(2, 6)
    expect(longitudeDelta(-179, 179)).toBeCloseTo(-2, 6)
  })

  it('is zero for the same meridian', () => {
    expect(longitudeDelta(42, 42)).toBe(0)
  })

  it('always lands within half a turn', () => {
    for (let a = -180; a <= 180; a += 17) {
      for (let b = -180; b <= 180; b += 13) {
        expect(Math.abs(longitudeDelta(a, b))).toBeLessThanOrEqual(180.000001)
      }
    }
  })
})

describe('angularDistance', () => {
  it('is zero at the same point', () => {
    expect(angularDistance({ lat: 10, lon: 20 }, { lat: 10, lon: 20 })).toBe(0)
  })

  it('is symmetric enough to be usable', () => {
    const a = { lat: 5, lon: 10 }
    const b = { lat: 9, lon: 16 }
    expect(angularDistance(a, b)).toBeCloseTo(angularDistance(b, a), 1)
  })

  it('does not report antimeridian neighbours as far apart', () => {
    expect(angularDistance({ lat: 0, lon: 179 }, { lat: 0, lon: -179 })).toBeLessThan(3)
  })
})

describe('localPlacements', () => {
  // Canvas centre maps to lat 0, lon 0.
  const CENTRE = { lat: 0, lon: 0 }
  const here = at('here', 400, 250)

  it('puts the settlement you are standing on at the origin', () => {
    const [p] = localPlacements([here], CENTRE, SPREAD, EXTENT)
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.z).toBeCloseTo(0, 6)
  })

  it('drops anything over the horizon', () => {
    // A sietch on the far side must not appear underfoot.
    const far = at('far', 1650, 370)
    expect(localPlacements([far], CENTRE, SPREAD, EXTENT)).toEqual([])
  })

  it('shows a different neighbourhood from a different descent point', () => {
    const sources = [here, at('east', 560, 250), at('west', 240, 250)]
    const fromHere = localPlacements(sources, CENTRE, SPREAD, EXTENT).map(p => p.id)
    const fromEast = localPlacements(
      sources, { lat: 0, lon: 60 }, SPREAD, EXTENT,
    ).map(p => p.id)
    // This is the whole bug: descending elsewhere used to show the same set.
    expect(fromHere).not.toEqual(fromEast)
  })

  it('puts east to +x and north to -z', () => {
    const east = at('east', 500, 250)
    const north = at('north', 400, 150)
    const [e] = localPlacements([east], CENTRE, SPREAD, EXTENT)
    const [n] = localPlacements([north], CENTRE, SPREAD, EXTENT)
    expect(e.x).toBeGreaterThan(0)
    expect(n.z).toBeLessThan(0)
  })

  it('keeps everything it returns inside the spread', () => {
    const sources = Array.from({ length: 40 }, (_, i) => at(`s${i}`, i * 45, (i * 37) % 500))
    for (const p of localPlacements(sources, CENTRE, SPREAD, EXTENT)) {
      expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(SPREAD * 1.01)
    }
  })

  it('returns nothing rather than throwing on an empty world', () => {
    expect(localPlacements([], CENTRE, SPREAD, EXTENT)).toEqual([])
  })
})

describe('seedForLocation', () => {
  it('is stable for the same place', () => {
    expect(seedForLocation({ lat: 10, lon: 20 }, 7)).toBe(seedForLocation({ lat: 10, lon: 20 }, 7))
  })

  it('differs between distant places', () => {
    // Landing anywhere must not look like landing everywhere.
    expect(seedForLocation({ lat: 0, lon: 0 }, 7))
      .not.toBe(seedForLocation({ lat: 0, lon: 120 }, 7))
  })

  it('does not regenerate the world for small camera drift', () => {
    expect(seedForLocation({ lat: 10, lon: 20 }, 7))
      .toBe(seedForLocation({ lat: 10.4, lon: 20.3 }, 7))
  })
})

// ---------------------------------------------------------------------------
// surfaceCentre and descentTarget — the "where am I" repairs
// ---------------------------------------------------------------------------

describe('surfaceCentre', () => {
  const orbit = { lat: 40, lon: 120 }
  const tabr = { x: 140, y: 390 }

  it('uses the orbit centre when coming down from space', () => {
    expect(surfaceCentre('strategic', orbit, tabr)).toEqual(orbit)
  })

  it('centres on the player when stepping out of a location', () => {
    // The bug: the descent centre is whatever the player last zoomed down at,
    // which after any travel can be half a planet from where they stand.
    const centre = surfaceCentre('location', orbit, tabr)
    expect(centre).not.toEqual(orbit)
    expect(angularDistance(centre, canvasToLatLonAt(tabr))).toBeLessThan(0.01)
  })

  it('falls back to the orbit centre when the player is nowhere', () => {
    expect(surfaceCentre('location', orbit, undefined)).toEqual(orbit)
  })
})

describe('descentTarget', () => {
  const villages = [
    { id: 'tabr', discovered: true, position: { x: 140, y: 390 } },
    { id: 'hidden', discovered: false, position: { x: 150, y: 385 } },
  ]
  const tabrLl = canvasToLatLonAt({ x: 140, y: 390 })

  it('snaps to a settlement the player was plainly aiming at', () => {
    const near = { lat: tabrLl.lat + 3, lon: tabrLl.lon + 3 }
    expect(angularDistance(descentTarget(near, villages), tabrLl)).toBeLessThan(0.01)
  })

  it('leaves a deliberate desert landing alone', () => {
    const far = { lat: tabrLl.lat + 40, lon: tabrLl.lon + 40 }
    expect(descentTarget(far, villages)).toEqual(far)
  })

  it('never snaps to a place the player has not discovered', () => {
    const nearHidden = canvasToLatLonAt({ x: 150, y: 385 })
    const landed = descentTarget(nearHidden, [villages[1]])
    expect(landed).toEqual(nearHidden)
  })

  it('returns the point unchanged when there is nothing to snap to', () => {
    const p = { lat: 5, lon: 5 }
    expect(descentTarget(p, [])).toEqual(p)
  })
})
