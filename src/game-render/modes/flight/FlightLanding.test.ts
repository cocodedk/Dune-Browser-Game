// src/game-render/modes/flight/FlightLanding.test.ts
// The descent and flare, split from FlightPath.test.ts once that file crossed
// the repository's 200-line limit. Pure maths — no three.js, no GL context.

import { describe, it, expect } from 'vitest'
import { positionAt, pitchAt, LANDING_FRACTION } from './FlightPath'

describe('landing', () => {
  const flyover = { from: { x: 0, y: 90, z: 0 }, to: { x: 100, y: 90, z: 0 }, apex: 70 }
  const landing = { ...flyover, touchdownY: 12 }

  // The defect this closes: from.y and to.y were both 90 and the apex term
  // 4p(1-p) returns to zero at p=1, so the craft ended the trip in level flight
  // at altitude 90 and the mode switched under it. There was no landing to
  // interrupt — the cinematic could only ever look cut off.
  it('used to end at cruise altitude, and still does without a touchdown', () => {
    expect(positionAt(flyover, 1).y).toBeCloseTo(90, 6)
  })

  it('actually reaches the ground when a touchdown is given', () => {
    expect(positionAt(landing, 1).y).toBeCloseTo(12, 6)
  })

  it('leaves the cruise untouched before the approach begins', () => {
    for (const t of [0, 0.25, 0.5, 1 - LANDING_FRACTION]) {
      expect(positionAt(landing, t).y).toBeCloseTo(positionAt(flyover, t).y, 6)
    }
  })

  it('descends monotonically once the approach starts', () => {
    let prev = Infinity
    for (let t = 1 - LANDING_FRACTION; t <= 1.0001; t += 0.01) {
      const y = positionAt(landing, t).y
      expect(y).toBeLessThanOrEqual(prev + 1e-9)
      prev = y
    }
  })

  it('never dips below the touchdown height', () => {
    for (let t = 0; t <= 1; t += 0.01) {
      expect(positionAt(landing, t).y).toBeGreaterThanOrEqual(12 - 1e-9)
    }
  })
})

describe('pitchAt', () => {
  it('is level for the whole cruise', () => {
    for (const t of [0, 0.3, 0.6, 1 - LANDING_FRACTION]) expect(pitchAt(t)).toBe(0)
  })

  it('noses down through the approach, then flares nose-up to land', () => {
    const mid = pitchAt(1 - LANDING_FRACTION * 0.4)
    expect(mid).toBeLessThan(0)
    expect(pitchAt(1)).toBeGreaterThan(0)
  })

  // Pitch is added to the craft's yaw and bank; a large value would fight the
  // nose-first guard in FlightOrientation.test.ts.
  it('stays small enough not to disturb the orientation guard', () => {
    for (let t = 0; t <= 1; t += 0.01) expect(Math.abs(pitchAt(t))).toBeLessThan(0.2)
  })

  it('is flat when the arc has no landing', () => {
    for (let t = 0; t <= 1; t += 0.1) expect(pitchAt(t, false)).toBe(0)
  })
})
