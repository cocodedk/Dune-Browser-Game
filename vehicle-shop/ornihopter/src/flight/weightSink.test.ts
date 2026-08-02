// vehicle-shop/ornihopter/src/flight/weightSink.test.ts
// USER FINDING (acceptance flight, verbatim): "with 0 throttle the craft
// still stays aloft and does not reduce the altitude and does not land."
// Round 1's Finding 2, unfixed until now: "there is no weight force. The
// craft cannot fall." These proofs are fail-first against that finding —
// see progress.md's weight-force round entry for the RED numbers recorded
// before kinematics.ts carried the craft's weight.
//
// Every assertion reads model.state (contracts.ts's published surface), the
// same discipline the rest of flight/ uses, never kinematics.ts's internals.

import { describe, it, expect } from 'vitest'
import { createFlightModel } from './flightModel'
import { neutralInput } from './testHelpers'
import { HOVER_THROTTLE } from './constants'

const DT = 0.02

describe('(1) throttle 0, level: the craft sinks at a bounded, controlled rate', () => {
  it('(a) altitude strictly decreases and the terminal sink sits in [2.5, 4.5] m/s', () => {
    const model = createFlightModel()
    const samples: number[] = [model.state.position.y]

    for (let i = 0; i < Math.round(6 / DT); i++) {
      model.step(neutralInput({ throttle: 0 }), DT)
      samples.push(model.state.position.y)
    }

    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1] + 1e-9)
    }

    const tail = samples.slice(-5)
    const terminalSink = (tail[0] - tail[tail.length - 1]) / (DT * (tail.length - 1))
    expect(terminalSink).toBeGreaterThan(2.5)
    expect(terminalSink).toBeLessThan(4.5)
  })

  it('(b) hands-off from 60m reaches LANDED with the wings spooling down — the user story', () => {
    const model = createFlightModel()
    let landedAt = -1

    for (let i = 0; i < Math.round(40 / DT); i++) {
      model.step(neutralInput({ throttle: 0 }), DT)
      if (model.state.landed === true) {
        landedAt = (i + 1) * DT
        break
      }
    }
    expect(landedAt).toBeGreaterThan(0)

    for (let i = 0; i < Math.round(4 / DT); i++) model.step(neutralInput({ throttle: 0 }), DT)
    expect(model.state.beatAmplitude).toBe(0)
    expect(model.state.beatHz).toBe(0)
  })
})

describe('(2) hover threshold: altitude holds level at the chosen throttle', () => {
  it(`(c) |dAltitude/dt| stays under 0.2 m/s sustained at throttle ${HOVER_THROTTLE}`, () => {
    const model = createFlightModel()
    let maxRate = 0
    let previousY = model.state.position.y

    for (let i = 0; i < Math.round(5 / DT); i++) {
      model.step(neutralInput({ throttle: HOVER_THROTTLE }), DT)
      const rate = Math.abs(model.state.position.y - previousY) / DT
      maxRate = Math.max(maxRate, rate)
      previousY = model.state.position.y
    }

    expect(maxRate).toBeLessThan(0.2)
  })
})

describe('(3) the sink blends smoothly with throttle', () => {
  it('(e) is monotone (more throttle never sinks faster) with no step at the hover threshold', () => {
    const sinkAt = (throttle: number): number => {
      const model = createFlightModel()
      for (let i = 0; i < Math.round(3 / DT); i++) model.step(neutralInput({ throttle }), DT)
      const before = model.state.position.y
      model.step(neutralInput({ throttle }), DT)
      return (before - model.state.position.y) / DT
    }

    const throttles = [0, 0.1, 0.2, 0.3, HOVER_THROTTLE - 0.05, HOVER_THROTTLE, HOVER_THROTTLE + 0.05, 0.6, 1]
    // sinkAt returns (before - after)/dt: positive means losing altitude, so
    // this is a SINK MAGNITUDE, not a signed climb rate.
    const sinks = throttles.map(sinkAt)

    for (let i = 1; i < sinks.length; i++) {
      // Sink magnitude is non-increasing as throttle rises — more power never
      // sinks faster — and is pinned at ~0 for every throttle at or above
      // HOVER_THROTTLE (indices 5..8 here).
      expect(sinks[i]).toBeLessThanOrEqual(sinks[i - 1] + 1e-9)
      // No discontinuity: no throttle step in this sweep moves the sink rate
      // by more than a fraction of the total swing between idle and hover.
      expect(Math.abs(sinks[i] - sinks[i - 1])).toBeLessThan(1.5)
    }
  })
})
