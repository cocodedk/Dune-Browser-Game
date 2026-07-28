// src/game-render/planet/orbits.test.ts

import { describe, it, expect } from 'vitest'
import { moonPosition, KRELLN, ARVON, KRELLN_RADIUS, ARVON_RADIUS } from './orbits'
import type { MoonOrbit } from './orbits'

const DAY = 60
const R = 1000

const length = (v: { x: number; y: number; z: number }) =>
  Math.hypot(v.x, v.y, v.z)

describe('moonPosition: geometry', () => {
  it('keeps the moon on its orbit at every moment', () => {
    for (const orbit of [KRELLN, ARVON]) {
      for (let t = 0; t < 4000; t += 37) {
        expect(length(moonPosition(orbit, t, DAY, R))).toBeCloseTo(
          orbit.distance * R, 6,
        )
      }
    }
  })

  it('returns to the same place after exactly one period', () => {
    for (const orbit of [KRELLN, ARVON]) {
      const period = orbit.periodDays * DAY
      const start = moonPosition(orbit, 0, DAY, R)
      const later = moonPosition(orbit, period, DAY, R)
      expect(later.x).toBeCloseTo(start.x, 6)
      expect(later.y).toBeCloseTo(start.y, 6)
      expect(later.z).toBeCloseTo(start.z, 6)
    }
  })

  it('leaves the orbital plane only as far as the inclination allows', () => {
    for (const orbit of [KRELLN, ARVON]) {
      const limit = Math.abs(Math.sin(orbit.inclination)) * orbit.distance * R
      for (let t = 0; t < 2000; t += 13) {
        expect(Math.abs(moonPosition(orbit, t, DAY, R).y)).toBeLessThanOrEqual(
          limit + 1e-9,
        )
      }
    }
  })

  it('does not divide by zero on a degenerate period', () => {
    const broken: MoonOrbit = { distance: 3, periodDays: 0, inclination: 0, phase: 0 }
    const p = moonPosition(broken, 500, DAY, R)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
    expect(Number.isFinite(p.z)).toBe(true)
  })
})

describe('the two moons of Arrakis', () => {
  it('puts the fast one inside the slow one', () => {
    // Arvon is the inner moon and Krelln the outer; an inner moon that
    // orbited slower than the outer would be wrong in a way a player who
    // knows the books would notice immediately.
    expect(ARVON.distance).toBeLessThan(KRELLN.distance)
    expect(ARVON.periodDays).toBeLessThan(KRELLN.periodDays)
  })

  it('holds the real ratio of their periods', () => {
    // 25.5 / 5.7 from the Dune Encyclopedia.
    expect(KRELLN.periodDays / ARVON.periodDays).toBeCloseTo(4.47, 2)
  })

  it('holds the real ratio of their sizes', () => {
    // 956 km across against 402.
    expect(KRELLN_RADIUS / ARVON_RADIUS).toBeCloseTo(956 / 402, 1)
  })

  it('tilts the two orbits apart so they never sit in one line of sight', () => {
    expect(KRELLN.inclination).not.toBeCloseTo(ARVON.inclination, 2)
  })

  it('starts them apart rather than stacked', () => {
    const a = moonPosition(KRELLN, 0, DAY, R)
    const b = moonPosition(ARVON, 0, DAY, R)
    const angle = Math.acos(
      (a.x * b.x + a.y * b.y + a.z * b.z) / (length(a) * length(b)),
    )
    expect(angle).toBeGreaterThan(0.5)
  })
})
