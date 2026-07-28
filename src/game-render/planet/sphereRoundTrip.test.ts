// src/game-render/planet/sphereRoundTrip.test.ts

import { describe, it, expect } from 'vitest'
import { latLonToVec3 } from './sphere'

// ---------------------------------------------------------------------------
// Round trip — the convention the orbit camera must invert
// ---------------------------------------------------------------------------

describe('latLonToVec3: recovering the angles', () => {
  /**
   * The inverse the orbit camera uses to decide where a descent lands.
   *
   * latLonToVec3 builds x = cos(lat)cos(lon) and z = -cos(lat)sin(lon), so
   * longitude comes back as atan2(-z, x). Using atan2(z, x) instead negates
   * it and mirrors the planet east-west — which shipped, and put a descent
   * aimed at Carthag down beside Sietch Tabr seventy degrees away.
   */
  const recover = (v: { x: number; y: number; z: number }) => {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return {
      lat: (Math.asin(v.y / length) * 180) / Math.PI,
      lon: (Math.atan2(-v.z, v.x) * 180) / Math.PI,
    }
  }

  it('round-trips every latitude and longitude', () => {
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lon = -170; lon <= 170; lon += 10) {
        const back = recover(latLonToVec3({ lat, lon }, 1000))
        expect(back.lat).toBeCloseTo(lat, 4)
        expect(back.lon).toBeCloseTo(lon, 4)
      }
    }
  })

  it('does not mirror east and west', () => {
    // The exact failure: a place in the east must not come back in the west.
    const east = recover(latLonToVec3({ lat: -12.8, lon: 33 }, 1000))
    expect(east.lon).toBeGreaterThan(0)
  })
})
