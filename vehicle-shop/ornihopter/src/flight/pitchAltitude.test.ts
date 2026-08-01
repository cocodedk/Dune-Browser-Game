// vehicle-shop/ornihopter/src/flight/pitchAltitude.test.ts
// Bar item 2a: pitch-up demand raises altitude over time. Checked two ways:
// true climb (position.y, immune to the terrain rolling underneath) and the
// HUD's own ground-relative altitude field, so the assertion matches what a
// player actually reads off the instrument.

import { describe, it, expect } from 'vitest'
import { createFlightModel } from './flightModel'
import { neutralInput, runFor } from './testHelpers'

describe('pitch controls altitude', () => {
  it('raises true altitude (position.y) over time under sustained pitch-up', () => {
    const model = createFlightModel()
    const initialY = model.state.position.y

    runFor(model, neutralInput({ pitch: 1, throttle: 0.6 }), 0.02, 2)

    expect(model.state.position.y - initialY).toBeGreaterThan(20)
  })

  it('raises the HUD altitude reading over time under sustained pitch-up', () => {
    const model = createFlightModel()
    const initialAlt = model.state.altitude

    runFor(model, neutralInput({ pitch: 1, throttle: 0.6 }), 0.02, 2)

    expect(model.state.altitude - initialAlt).toBeGreaterThan(20)
  })

  it('climbs measurably more than level flight over the same duration', () => {
    const level = createFlightModel()
    const climbing = createFlightModel()

    runFor(level, neutralInput({ pitch: 0, throttle: 0.6 }), 0.02, 2)
    runFor(climbing, neutralInput({ pitch: 1, throttle: 0.6 }), 0.02, 2)

    expect(climbing.state.position.y).toBeGreaterThan(level.state.position.y + 20)
  })

  it('pitch-down demand lowers true altitude over time', () => {
    const model = createFlightModel()
    const initialY = model.state.position.y

    runFor(model, neutralInput({ pitch: -1, throttle: 0.6 }), 0.02, 2)

    expect(model.state.position.y).toBeLessThan(initialY - 20)
  })
})
