// vehicle-shop/ornihopter/src/flight/speedAltitudeTradeoff.test.ts
// Not a numbered bar item, but named directly in the goal: "it trades speed
// for altitude". At equal throttle, climbing must cost speed relative to
// staying level, because the speed-rate equation in kinematics.ts subtracts
// gravity's component along the nose — pulling the nose up is not free.

import { describe, it, expect } from 'vitest'
import { createFlightModel } from './flightModel'
import { neutralInput, runFor } from './testHelpers'

describe('climbing trades speed for altitude', () => {
  it('a climbing craft ends up slower than a level one at the same throttle', () => {
    const level = createFlightModel()
    const climbing = createFlightModel()

    runFor(level, neutralInput({ pitch: 0, throttle: 0.6 }), 0.02, 3)
    runFor(climbing, neutralInput({ pitch: 1, throttle: 0.6 }), 0.02, 3)

    expect(climbing.state.position.y).toBeGreaterThan(level.state.position.y + 50)
    expect(climbing.state.speed).toBeLessThan(level.state.speed - 5)
  })

  it('a diving craft ends up faster than a level one at the same throttle', () => {
    const level = createFlightModel()
    const diving = createFlightModel()

    runFor(level, neutralInput({ pitch: 0, throttle: 0.5 }), 0.02, 2)
    runFor(diving, neutralInput({ pitch: -1, throttle: 0.5 }), 0.02, 2)

    expect(diving.state.position.y).toBeLessThan(level.state.position.y - 20)
    expect(diving.state.speed).toBeGreaterThan(level.state.speed + 5)
  })
})
