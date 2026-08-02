// vehicle-shop/ornihopter/src/flight/landing.test.ts
// THE USER'S ASK, verbatim: "we need to think about making it land and stop
// beating the wings and not sink in the desert sand." This file is the "land
// and do not sink" half — touchdown, the resting stance, and the guarantee
// that a fast or steep contact still gets the old unconditional clamp rather
// than an invented crash.
//
// Everything here is measured through contracts.ts's published FlightState —
// position, altitude, the landed flag — and against terrain.ts's own
// heightAt(), never against the landing module's internals, so an error
// shared between the clamp and its test cannot hide.

import { describe, it, expect } from 'vitest'
import { createFlightModel } from './flightModel'
import { heightAt } from '../stage/terrain'
import { GEAR_HEIGHT, TOUCHDOWN_SINK_MAX, TOUCHDOWN_TILT_MAX_DEG } from './constants'
import { GROUND_Y } from '../model/geometry/gear/stance'
import { DT, PARKED_ALTITUDE, flyApproach, tiltDegOf } from './landingScenario'
import { runFor, neutralInput } from './testHelpers'

const IDLE = neutralInput({ throttle: 0 })

describe('gear height provenance', () => {
  it('the flight model parks at exactly the gear stance ground plane', () => {
    expect(GEAR_HEIGHT).toBeCloseTo(-GROUND_Y, 10)
  })
})

describe('(a) touchdown: the craft lands on its gear', () => {
  it('(a1) a scripted approach inside the sink and attitude gates reaches LANDED', () => {
    const approach = flyApproach()

    expect(approach.touchdownAt).toBeGreaterThan(0)
    expect(approach.sink).toBeGreaterThan(0)
    expect(approach.sink).toBeLessThan(TOUCHDOWN_SINK_MAX)
    expect(approach.tiltDeg).toBeLessThan(TOUCHDOWN_TILT_MAX_DEG)
    expect(approach.model.state.landed).toBe(true)
  })

  it('(a2) rests with the gear feet on the sand, to within 1cm', () => {
    const { model } = flyApproach()
    const state = model.state

    expect(state.altitude).toBeCloseTo(PARKED_ALTITUDE, 2)
    const measured = state.position.y - heightAt(state.position.x, state.position.z)
    expect(Math.abs(measured - PARKED_ALTITUDE)).toBeLessThan(0.01)
  })

  it('(a3) holds that rest for 10s: no sink, no drift, no jitter against a clamp', () => {
    const { model } = flyApproach()
    runFor(model, IDLE, DT, 5) // roll out and settle first

    const start = { ...model.state.position }
    let previous = start
    let fastestStep = 0
    let lowest = Number.POSITIVE_INFINITY
    let highest = Number.NEGATIVE_INFINITY

    for (let i = 0; i < Math.round(10 / DT); i++) {
      model.step(IDLE, DT)
      const p = model.state.position
      fastestStep = Math.max(fastestStep, Math.hypot(p.x - previous.x, p.y - previous.y, p.z - previous.z) / DT)
      lowest = Math.min(lowest, model.state.altitude)
      highest = Math.max(highest, model.state.altitude)
      previous = p
    }

    const drift = Math.hypot(previous.x - start.x, previous.y - start.y, previous.z - start.z)
    expect(drift).toBeLessThan(0.001)
    expect(fastestStep).toBeLessThan(0.001)
    expect(lowest).toBeGreaterThan(PARKED_ALTITUDE - 0.01)
    expect(highest).toBeLessThan(PARKED_ALTITUDE + 0.01)
    expect(model.state.speed).toBe(0)
    expect(model.state.landed).toBe(true)
  })

  it('(a4) settles level, whatever attitude it landed at', () => {
    const approach = flyApproach()
    expect(approach.tiltDeg).toBeGreaterThan(3) // it really did land nose-down

    runFor(approach.model, IDLE, DT, 5)
    expect(tiltDegOf(approach.model.state)).toBeLessThan(0.5)
  })
})

describe('(e) a fast, steep contact keeps the legacy clamp', () => {
  it('does not latch LANDED and pins the craft origin to the terrain instead', () => {
    const model = createFlightModel()
    let sink = 0

    for (let i = 0; i < Math.round(20 / DT); i++) {
      const previous = model.state
      model.step({ pitch: -1, roll: 0, yaw: 0, throttle: 1 }, DT)
      if (model.state.altitude <= 0.001) {
        sink = -previous.velocity.y
        break
      }
    }

    expect(sink).toBeGreaterThan(TOUCHDOWN_SINK_MAX)
    expect(model.state.landed).not.toBe(true)
    expect(model.state.altitude).toBe(0)
  })
})
