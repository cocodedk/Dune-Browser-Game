// vehicle-shop/ornihopter/src/flight/wingBeat.test.ts
// Bar item 3: FlightState carries beatPhase/beatHz, beatHz rises with
// throttle and stays in [1.5, 4] Hz, and the flight model itself advances
// the phase so the wing rig can never drift out of sync with the dynamics.

import { describe, it, expect } from 'vitest'
import { createFlightModel } from './flightModel'
import { neutralInput } from './testHelpers'
import { BEAT_HZ_MIN, BEAT_HZ_MAX } from './constants'

describe('wing beat', () => {
  it('sits at the minimum at idle throttle', () => {
    const model = createFlightModel()
    model.step(neutralInput({ throttle: 0 }), 0.02)
    expect(model.state.beatHz).toBeCloseTo(BEAT_HZ_MIN, 5)
  })

  it('sits at the maximum at full throttle', () => {
    const model = createFlightModel()
    model.step(neutralInput({ throttle: 1 }), 0.02)
    expect(model.state.beatHz).toBeCloseTo(BEAT_HZ_MAX, 5)
  })

  it('rises monotonically with throttle and never leaves [1.5, 4] Hz', () => {
    const samples = [0, 0.25, 0.5, 0.75, 1].map((throttle) => {
      const model = createFlightModel()
      model.step(neutralInput({ throttle }), 0.02)
      return model.state.beatHz
    })

    for (const hz of samples) {
      expect(hz).toBeGreaterThanOrEqual(1.5)
      expect(hz).toBeLessThanOrEqual(4)
    }
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1])
    }
  })

  it('advances phase by exactly beatHz * 2*PI radians per second, wrapped to [0, 2*PI)', () => {
    const model = createFlightModel()
    const dt = 0.05
    // Full throttle so beatHz is a known constant (4 Hz) for the whole run.
    for (let i = 0; i < 1 / dt; i++) model.step(neutralInput({ throttle: 1 }), dt)

    // 4 Hz for exactly 1 second is 4 full cycles: phase should be back near 0.
    expect(model.state.beatHz).toBeCloseTo(4, 5)
    expect(model.state.beatPhase).toBeGreaterThanOrEqual(0)
    expect(model.state.beatPhase).toBeLessThan(Math.PI * 2)
    expect(model.state.beatPhase).toBeCloseTo(0, 3)
  })

  it('phase keeps advancing, never sticking, while throttle is held', () => {
    const model = createFlightModel()
    model.step(neutralInput({ throttle: 0.5 }), 0.02)
    const first = model.state.beatPhase
    model.step(neutralInput({ throttle: 0.5 }), 0.02)
    const second = model.state.beatPhase

    expect(second).not.toBeCloseTo(first, 5)
  })
})
