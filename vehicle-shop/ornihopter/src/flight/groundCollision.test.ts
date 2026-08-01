// vehicle-shop/ornihopter/src/flight/groundCollision.test.ts
// Bar item 4: over a simulated 60s flight with varied input, altitude above
// heightAt(x, z) never goes negative. Input here deliberately includes
// sustained hard dives (not just gentle wandering) so the ground clamp is
// actually exercised many times over the run, not just theoretically present.

import { describe, it, expect } from 'vitest'
import { createFlightModel } from './flightModel'

describe('ground collision', () => {
  it('never lets altitude go negative across 60s of varied, dive-heavy input', () => {
    const model = createFlightModel()
    const dt = 0.05
    const totalSteps = Math.round(60 / dt)
    let minAltitude = Number.POSITIVE_INFINITY
    let groundContacts = 0

    for (let i = 0; i < totalSteps; i++) {
      const t = i * dt
      model.step(
        {
          pitch: Math.sin(t * 0.3),
          roll: Math.sin(t * 0.17 + 2),
          yaw: Math.cos(t * 0.11),
          throttle: 0.5 + 0.4 * Math.sin(t * 0.05),
        },
        dt
      )

      const altitude = model.state.altitude
      minAltitude = Math.min(minAltitude, altitude)
      if (altitude <= 0.001) groundContacts++

      expect(altitude).toBeGreaterThanOrEqual(0)
    }

    // The scenario is dive-heavy enough that it must actually touch down,
    // otherwise this test would pass just as well with no ground clamp at all.
    expect(groundContacts).toBeGreaterThan(0)
    expect(minAltitude).toBe(0)
  })

  it('recovers cleanly after resting on the ground: altitude and speed stay finite', () => {
    const model = createFlightModel()
    const dt = 0.05
    for (let i = 0; i < 40 / dt; i++) {
      model.step({ pitch: -1, roll: 0, yaw: 0, throttle: 0.5 }, dt)
    }
    for (let i = 0; i < 5 / dt; i++) {
      model.step({ pitch: 1, roll: 0, yaw: 0, throttle: 1 }, dt)
    }

    expect(Number.isFinite(model.state.altitude)).toBe(true)
    expect(Number.isFinite(model.state.speed)).toBe(true)
    expect(model.state.altitude).toBeGreaterThanOrEqual(0)
  })
})
