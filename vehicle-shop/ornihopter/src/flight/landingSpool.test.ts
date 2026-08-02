// vehicle-shop/ornihopter/src/flight/landingSpool.test.ts
// The other half of the user's ask: "stop beating the wings". A parked craft
// must wind its beat DOWN, not stop it — so these assert the shape of the
// ramp (monotone, no step bigger than one tick of it, zero at the end and
// staying there), not just its endpoints. Round 1's model had beatHz pinned
// to throttle with no floor below BEAT_HZ_MIN, so the wings beat forever.
//
// FlightState.beatAmplitude is the field the wing rig reads to settle: it
// scales the flap and feather strokes as well as the frequency, so the wings
// ease flat to the parked pose instead of freezing mid-stroke.

import { describe, it, expect } from 'vitest'
import { BEAT_HZ_MIN, BEAT_HZ_MAX, SPOOL_DOWN_SECONDS, SPOOL_UP_SECONDS } from './constants'
import { DT, PARKED_ALTITUDE, flyApproach } from './landingScenario'
import { runFor, neutralInput } from './testHelpers'

const IDLE = neutralInput({ throttle: 0 })
/** Largest honest jump per tick while winding down: one tick of the ramp. */
const DOWN_STEP = (BEAT_HZ_MIN * DT) / SPOOL_DOWN_SECONDS
const UP_STEP = (BEAT_HZ_MAX * DT) / SPOOL_UP_SECONDS

function traceBeat(model: { step(i: ReturnType<typeof neutralInput>, dt: number): void; state: { beatHz: number } },
  seconds: number): number[] {
  const trace: number[] = [model.state.beatHz]
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    model.step(IDLE, DT)
    trace.push(model.state.beatHz)
  }
  return trace
}

describe('(b) spool-down: the beat winds off, it does not stop', () => {
  it('reaches zero within 3s, monotonically, with no jump past one tick of the ramp', () => {
    const { model } = flyApproach()

    // Continuous ACROSS the contact: touchdown itself must not step beatHz.
    expect(model.state.beatHz).toBeCloseTo(BEAT_HZ_MIN, 6)

    const trace = traceBeat(model, 3)
    for (let i = 1; i < trace.length; i++) {
      expect(trace[i]).toBeLessThanOrEqual(trace[i - 1] + 1e-12)
      expect(trace[i - 1] - trace[i]).toBeLessThanOrEqual(DOWN_STEP + 1e-9)
    }

    expect(trace[Math.round(1 / DT)]).toBeGreaterThan(0) // took real time
    expect(trace[trace.length - 1]).toBe(0)
  })
})

describe('(c) the wings park and stay parked', () => {
  it('beatAmplitude reaches zero, holds it for 5 more seconds, and the phase freezes', () => {
    const { model } = flyApproach()
    runFor(model, IDLE, DT, 3)

    expect(model.state.beatAmplitude).toBe(0)
    const frozenPhase = model.state.beatPhase

    for (let i = 0; i < Math.round(5 / DT); i++) {
      model.step(IDLE, DT)
      expect(model.state.beatAmplitude).toBe(0)
      expect(model.state.beatHz).toBe(0)
      expect(model.state.beatPhase).toBe(frozenPhase)
    }
  })
})

describe('(d) takeoff: throttle up and the craft leaves the sand', () => {
  it('spools the beat back up smoothly, lifts off, and drops the landed flag', () => {
    const { model } = flyApproach()
    runFor(model, IDLE, DT, 6) // fully parked, beat at zero
    expect(model.state.beatAmplitude).toBe(0)

    const climb = { pitch: 1, roll: 0, yaw: 0, throttle: 1 }
    let previousHz = model.state.beatHz
    let liftAt = -1
    let highest = model.state.altitude

    for (let i = 0; i < Math.round(6 / DT); i++) {
      model.step(climb, DT)
      const state = model.state
      expect(state.beatHz - previousHz).toBeLessThanOrEqual(UP_STEP + 1e-9)
      previousHz = state.beatHz
      if (liftAt < 0 && state.landed !== true) liftAt = (i + 1) * DT
      highest = Math.max(highest, state.altitude)
    }

    expect(liftAt).toBeGreaterThan(0.5) // it spooled, it did not jump
    expect(liftAt).toBeLessThan(2.5)
    expect(highest).toBeGreaterThan(PARKED_ALTITUDE + 20)
    expect(model.state.beatHz).toBeCloseTo(BEAT_HZ_MAX, 6)
    expect(model.state.beatAmplitude).toBe(1)
    expect(model.state.landed).toBe(false)
  })
})
