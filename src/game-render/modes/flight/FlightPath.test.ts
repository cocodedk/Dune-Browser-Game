// src/game-render/modes/flight/FlightPath.test.ts

import { describe, it, expect } from 'vitest'
import {
  clamp01,
  easeInOut,
  positionAt,
  headingOf,
  yawOf,
  bankAt,
  chaseCameraAt,
} from './FlightPath'
import type { FlightArc } from './FlightPath'

const ARC: FlightArc = {
  from: { x: 0, y: 0, z: 0 },
  to: { x: 300, y: 0, z: 400 },
  apex: 60,
}

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

describe('clamp01 and easeInOut', () => {
  it('clamps outside the unit range', () => {
    expect(clamp01(-5)).toBe(0)
    expect(clamp01(5)).toBe(1)
    expect(clamp01(0.4)).toBe(0.4)
  })

  it('pins the ends and the midpoint', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6)
  })

  it('increases monotonically', () => {
    for (let t = 0; t < 1; t += 0.05) {
      expect(easeInOut(t)).toBeLessThanOrEqual(easeInOut(t + 0.05))
    }
  })

  it('starts and ends gently — a snap would read as a teleport', () => {
    expect(easeInOut(0.05)).toBeLessThan(0.05)
    expect(easeInOut(0.95)).toBeGreaterThan(0.95)
  })
})

// ---------------------------------------------------------------------------
// positionAt
// ---------------------------------------------------------------------------

describe('positionAt', () => {
  it('starts exactly at the origin and ends exactly at the destination', () => {
    // Landing anywhere but the destination would desync from the engine's
    // arrival, which fires on the world clock regardless.
    const start = positionAt(ARC, 0)
    expect(start.x).toBeCloseTo(0, 6)
    expect(start.y).toBeCloseTo(0, 6)
    expect(start.z).toBeCloseTo(0, 6)

    const end = positionAt(ARC, 1)
    expect(end.x).toBeCloseTo(300, 6)
    expect(end.y).toBeCloseTo(0, 6)
    expect(end.z).toBeCloseTo(400, 6)
  })

  it('climbs to the apex at the midpoint', () => {
    expect(positionAt(ARC, 0.5).y).toBeCloseTo(60, 6)
  })

  it('never dips below the ground line of the arc', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      expect(positionAt(ARC, t).y).toBeGreaterThanOrEqual(-1e-9)
    }
  })

  it('clamps progress outside the unit range', () => {
    expect(positionAt(ARC, -1)).toEqual(positionAt(ARC, 0))
    expect(positionAt(ARC, 2)).toEqual(positionAt(ARC, 1))
  })

  it('advances monotonically along the ground', () => {
    let previous = -Infinity
    for (let t = 0; t <= 1; t += 0.05) {
      const x = positionAt(ARC, t).x
      expect(x).toBeGreaterThanOrEqual(previous)
      previous = x
    }
  })

  it('handles a zero-length trip without producing NaN', () => {
    const still: FlightArc = { from: { x: 5, y: 0, z: 5 }, to: { x: 5, y: 0, z: 5 }, apex: 20 }
    for (const t of [0, 0.5, 1]) {
      const p = positionAt(still, t)
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Heading, yaw, bank
// ---------------------------------------------------------------------------

describe('headingOf and yawOf', () => {
  it('returns a unit vector', () => {
    const h = headingOf(ARC)
    expect(Math.sqrt(h.x * h.x + h.z * h.z)).toBeCloseTo(1, 6)
  })

  it('points along the trip', () => {
    const h = headingOf(ARC)
    expect(h.x).toBeGreaterThan(0)
    expect(h.z).toBeGreaterThan(0)
  })

  it('falls back to a valid heading for a zero-length trip', () => {
    const still: FlightArc = { from: { x: 0, y: 0, z: 0 }, to: { x: 0, y: 0, z: 0 }, apex: 10 }
    const h = headingOf(still)
    expect(Number.isFinite(h.x)).toBe(true)
    expect(Math.sqrt(h.x * h.x + h.z * h.z)).toBeCloseTo(1, 6)
  })

  it('yaws to face due east for an eastward trip', () => {
    const east: FlightArc = { from: { x: 0, y: 0, z: 0 }, to: { x: 100, y: 0, z: 0 }, apex: 0 }
    expect(yawOf(east)).toBeCloseTo(Math.PI / 2, 6)
  })
})

describe('bankAt', () => {
  it('is level at both ends', () => {
    expect(bankAt(0)).toBeCloseTo(0, 6)
    expect(bankAt(1)).toBeCloseTo(0, 6)
  })

  it('banks during the trip', () => {
    let maxAbs = 0
    for (let t = 0; t <= 1; t += 0.02) maxAbs = Math.max(maxAbs, Math.abs(bankAt(t)))
    expect(maxAbs).toBeGreaterThan(0.1)
  })

  it('stays inside the requested limit', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      expect(Math.abs(bankAt(t, 0.4))).toBeLessThanOrEqual(0.4 + 1e-9)
    }
  })
})

// ---------------------------------------------------------------------------
// Chase camera
// ---------------------------------------------------------------------------

describe('chaseCameraAt', () => {
  it('sits behind and above the craft', () => {
    const { position, lookAt } = chaseCameraAt(ARC, 0.5, 90, 38)
    expect(position.y).toBeGreaterThan(lookAt.y)

    const heading = headingOf(ARC)
    // Behind means opposite the heading.
    expect(position.x - lookAt.x).toBeCloseTo(-heading.x * 90, 5)
    expect(position.z - lookAt.z).toBeCloseTo(-heading.z * 90, 5)
  })

  it('always looks at the craft', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(chaseCameraAt(ARC, t).lookAt).toEqual(positionAt(ARC, t))
    }
  })

  it('produces finite values throughout', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const { position } = chaseCameraAt(ARC, t)
      expect(Number.isFinite(position.x)).toBe(true)
      expect(Number.isFinite(position.y)).toBe(true)
      expect(Number.isFinite(position.z)).toBe(true)
    }
  })
})
