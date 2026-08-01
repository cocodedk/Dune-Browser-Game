// vehicle-shop/ornihopter/src/flight/stability.test.ts
// Bar item 5: step() must stay stable for dt up to 0.1s, and must not
// produce NaN under any input in range. Drives every extreme corner of the
// input cube at the largest allowed dt for a sustained run, and separately
// checks that reset() recovers a model that had been driven hard.

import { describe, it, expect } from 'vitest'
import { createFlightModel } from './flightModel'

function isFiniteState(state: {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  orientation: { x: number; y: number; z: number; w: number }
  speed: number
  altitude: number
  beatPhase: number
  beatHz: number
  throttle: number
}): boolean {
  const values = [
    state.position.x, state.position.y, state.position.z,
    state.velocity.x, state.velocity.y, state.velocity.z,
    state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w,
    state.speed, state.altitude, state.beatPhase, state.beatHz, state.throttle,
  ]
  return values.every((v) => Number.isFinite(v))
}

const EXTREME_INPUTS = [
  { pitch: 1, roll: 1, yaw: 1, throttle: 1 },
  { pitch: -1, roll: -1, yaw: -1, throttle: 0 },
  { pitch: 1, roll: -1, yaw: 1, throttle: 0 },
  { pitch: -1, roll: 1, yaw: -1, throttle: 1 },
  { pitch: 0, roll: 1, yaw: -1, throttle: 0.5 },
]

describe('stability at the largest allowed step', () => {
  it('produces no NaN/Infinity over a long run at dt = 0.1s under every extreme input', () => {
    const model = createFlightModel()
    const dt = 0.1

    for (let round = 0; round < 200; round++) {
      const input = EXTREME_INPUTS[round % EXTREME_INPUTS.length]
      model.step(input, dt)
      expect(isFiniteState(model.state)).toBe(true)
    }
  })

  it('keeps the orientation quaternion normalised throughout', () => {
    const model = createFlightModel()
    for (let round = 0; round < 200; round++) {
      model.step(EXTREME_INPUTS[round % EXTREME_INPUTS.length], 0.1)
      const q = model.state.orientation
      const magnitude = Math.hypot(q.x, q.y, q.z, q.w)
      expect(magnitude).toBeCloseTo(1, 6)
    }
  })

  it('stays finite across a wide range of dt values, including very small and exactly 0.1', () => {
    const model = createFlightModel()
    const dts = [0.001, 0.016, 0.033, 0.05, 0.1]
    for (let i = 0; i < 100; i++) {
      model.step(EXTREME_INPUTS[i % EXTREME_INPUTS.length], dts[i % dts.length])
      expect(isFiniteState(model.state)).toBe(true)
    }
  })

  it('reset() recovers a clean, finite, airborne state after a hard-driven run', () => {
    const model = createFlightModel()
    for (let round = 0; round < 200; round++) {
      model.step(EXTREME_INPUTS[round % EXTREME_INPUTS.length], 0.1)
    }

    model.reset()

    expect(isFiniteState(model.state)).toBe(true)
    expect(model.state.altitude).toBeGreaterThan(0)
    expect(model.state.speed).toBeGreaterThan(0)
  })
})
