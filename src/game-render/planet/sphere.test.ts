// src/game-render/planet/sphere.test.ts

import { describe, it, expect } from 'vitest'
import {
  latLonToVec3,
  vec3ToLatLon,
  canvasToLatLon,
  angularDistance,
  zoomToDistance,
  distanceToZoom,
  visibleFraction,
} from './sphere'
import type { LatLon, ZoomRange } from './sphere'

const R = 1000
const RANGE: ZoomRange = { far: 4200, near: 1080 }

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

describe('latLonToVec3', () => {
  it('places the poles on the vertical axis', () => {
    const north = latLonToVec3({ lat: 90, lon: 0 }, R)
    expect(north.y).toBeCloseTo(R, 4)
    expect(Math.hypot(north.x, north.z)).toBeCloseTo(0, 4)

    const south = latLonToVec3({ lat: -90, lon: 0 }, R)
    expect(south.y).toBeCloseTo(-R, 4)
  })

  it('keeps every point on the sphere', () => {
    for (const lat of [-80, -30, 0, 25, 75]) {
      for (const lon of [-170, -60, 0, 90, 175]) {
        const v = latLonToVec3({ lat, lon }, R)
        expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(R, 3)
      }
    }
  })

  it('puts the equator in the horizontal plane', () => {
    expect(latLonToVec3({ lat: 0, lon: 40 }, R).y).toBeCloseTo(0, 4)
  })
})

describe('vec3ToLatLon', () => {
  it('round-trips through latLonToVec3', () => {
    for (const point of [
      { lat: 0, lon: 0 }, { lat: 33, lon: -75 },
      { lat: -48, lon: 120 }, { lat: 12, lon: 179 },
    ] as LatLon[]) {
      const back = vec3ToLatLon(latLonToVec3(point, R))
      expect(back.lat).toBeCloseTo(point.lat, 3)
      expect(back.lon).toBeCloseTo(point.lon, 3)
    }
  })

  it('handles the origin without dividing by zero', () => {
    expect(vec3ToLatLon({ x: 0, y: 0, z: 0 })).toEqual({ lat: 0, lon: 0 })
  })

  it('always returns a longitude inside -180..180', () => {
    for (let lon = -180; lon <= 180; lon += 15) {
      const back = vec3ToLatLon(latLonToVec3({ lat: 10, lon }, R))
      expect(back.lon).toBeGreaterThanOrEqual(-180.001)
      expect(back.lon).toBeLessThanOrEqual(180.001)
    }
  })
})

// ---------------------------------------------------------------------------
// Canvas mapping
// ---------------------------------------------------------------------------

describe('canvasToLatLon', () => {
  it('maps the canvas centre to the origin', () => {
    const p = canvasToLatLon({ x: 400, y: 250 }, 800, 500)
    expect(p.lat).toBeCloseTo(0, 6)
    expect(p.lon).toBeCloseTo(0, 6)
  })

  it('keeps the playable region well away from the poles', () => {
    // Smearing the map pole to pole would distort it badly and make the far
    // sietches look unreachable.
    for (const y of [0, 250, 500]) {
      const p = canvasToLatLon({ x: 400, y }, 800, 500)
      expect(Math.abs(p.lat)).toBeLessThan(40)
    }
  })

  it('preserves east/west and north/south ordering', () => {
    const west = canvasToLatLon({ x: 100, y: 250 }, 800, 500)
    const east = canvasToLatLon({ x: 700, y: 250 }, 800, 500)
    expect(west.lon).toBeLessThan(east.lon)

    const top = canvasToLatLon({ x: 400, y: 50 }, 800, 500)
    const bottom = canvasToLatLon({ x: 400, y: 450 }, 800, 500)
    expect(top.lat).toBeGreaterThan(bottom.lat)
  })
})

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

describe('angularDistance', () => {
  it('is zero for a point against itself', () => {
    expect(angularDistance({ lat: 20, lon: 30 }, { lat: 20, lon: 30 })).toBeCloseTo(0, 8)
  })

  it('is a quarter turn between pole and equator', () => {
    const d = angularDistance({ lat: 90, lon: 0 }, { lat: 0, lon: 0 })
    expect(d).toBeCloseTo(Math.PI / 2, 5)
  })

  it('is symmetric', () => {
    const a: LatLon = { lat: 12, lon: -40 }
    const b: LatLon = { lat: -33, lon: 88 }
    expect(angularDistance(a, b)).toBeCloseTo(angularDistance(b, a), 10)
  })
})

// ---------------------------------------------------------------------------
// Zoom
// ---------------------------------------------------------------------------

describe('zoom', () => {
  it('maps the ends of the range exactly', () => {
    expect(zoomToDistance(0, RANGE)).toBeCloseTo(RANGE.far, 4)
    expect(zoomToDistance(1, RANGE)).toBeCloseTo(RANGE.near, 4)
  })

  it('clamps beyond the range rather than flying through the planet', () => {
    expect(zoomToDistance(-5, RANGE)).toBeCloseTo(RANGE.far, 4)
    expect(zoomToDistance(9, RANGE)).toBeCloseTo(RANGE.near, 4)
  })

  it('descends monotonically', () => {
    let previous = Infinity
    for (let z = 0; z <= 1; z += 0.05) {
      const d = zoomToDistance(z, RANGE)
      expect(d).toBeLessThan(previous)
      previous = d
    }
  })

  it('moves a constant fraction per step, not a constant distance', () => {
    // Linear zoom feels glacial far out and violent up close.
    const a = zoomToDistance(0.1, RANGE) / zoomToDistance(0.2, RANGE)
    const b = zoomToDistance(0.7, RANGE) / zoomToDistance(0.8, RANGE)
    expect(a).toBeCloseTo(b, 6)
  })

  it('round-trips through distanceToZoom', () => {
    for (const z of [0, 0.25, 0.5, 0.75, 1]) {
      expect(distanceToZoom(zoomToDistance(z, RANGE), RANGE)).toBeCloseTo(z, 6)
    }
  })

  it('handles a degenerate range without producing NaN', () => {
    expect(distanceToZoom(100, { far: 0, near: 0 })).toBe(0)
  })
})

describe('visibleFraction', () => {
  it('shows nothing from inside the planet', () => {
    expect(visibleFraction(R * 0.5, R)).toBe(0)
  })

  it('approaches the full hemisphere from far away', () => {
    expect(visibleFraction(R * 100, R)).toBeGreaterThan(0.98)
  })

  it('increases with distance', () => {
    expect(visibleFraction(R * 4, R)).toBeGreaterThan(visibleFraction(R * 1.5, R))
  })
})
