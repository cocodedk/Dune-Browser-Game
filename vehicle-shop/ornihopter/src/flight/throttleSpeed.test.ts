// vehicle-shop/ornihopter/src/flight/throttleSpeed.test.ts
// Bar item 2d: raising throttle raises speed.

import { describe, it, expect } from 'vitest'
import { createFlightModel } from './flightModel'
import { neutralInput, runFor } from './testHelpers'

describe('throttle controls speed', () => {
  it('a higher throttle setting converges to a higher speed than a lower one', () => {
    const low = createFlightModel()
    const high = createFlightModel()

    runFor(low, neutralInput({ throttle: 0.2 }), 0.02, 5)
    runFor(high, neutralInput({ throttle: 0.9 }), 0.02, 5)

    expect(high.state.speed).toBeGreaterThan(low.state.speed + 20)
  })

  it('idle throttle decelerates a cruising craft', () => {
    const model = createFlightModel()
    const initialSpeed = model.state.speed

    runFor(model, neutralInput({ throttle: 0 }), 0.02, 3)

    expect(model.state.speed).toBeLessThan(initialSpeed)
  })

  it('full throttle accelerates a craft starting below its top speed', () => {
    const model = createFlightModel()
    const initialSpeed = model.state.speed

    runFor(model, neutralInput({ throttle: 1 }), 0.02, 3)

    expect(model.state.speed).toBeGreaterThan(initialSpeed)
  })

  it('reported throttle tracks the demand exactly, so the HUD cannot contradict input', () => {
    const model = createFlightModel()
    model.step(neutralInput({ throttle: 0.73 }), 0.02)

    expect(model.state.throttle).toBeCloseTo(0.73, 6)
  })
})
