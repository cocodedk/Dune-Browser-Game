// vehicle-shop/ornihopter/src/flight/autoLevel.test.ts
// BAR B5, the user's third finding in the same message: "I might need an
// option to auto-level the craft when it gets out of control." A held key
// (input/keyboard.ts) sets FlightInput.autoLevel; this is the flight-model
// proof that holding it actually recovers the craft, overrides a fighting
// stick, hands control back the instant it is released, and does nothing at
// all in level flight.
//
// MEASURED THROUGH CONTRACTS.TS VECTORS, not autoLevel.ts's own internals --
// the same discipline rollBank.test.ts and reading.ts use. pitchDegOf/rollDegOf
// below are a SEPARATE, from-scratch derivation of the same asin/atan2 shape
// hud/reading.ts uses, kept local so this suite does not depend on hud/ and a
// coincidental bug shared between the two would not hide behind one import.
// attitude() is the inverse composition, already cross-checked against
// reading.ts's own numbers by hud/symbology.test.ts's identical helper.

import { describe, it, expect } from 'vitest'
import type { FlightState, FlightInput, Quat } from '../contracts'
import { noseDirection, upDirection, starboardDirection } from '../contracts'
import { quatFromAxisAngle, quatMultiply, IDENTITY_QUAT } from './quatMath'
import { advance } from './advance'
import { createFlightModel } from './flightModel'
import { neutralInput, runFor } from './testHelpers'

const DEG = 180 / Math.PI
const RAD = Math.PI / 180
const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v))

function attitude(headingDeg: number, pitchDeg: number, rollDeg: number): Quat {
  return quatMultiply(
    quatMultiply(
      quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -headingDeg * RAD),
      quatFromAxisAngle({ x: 1, y: 0, z: 0 }, pitchDeg * RAD)
    ),
    quatFromAxisAngle({ x: 0, y: 0, z: 1 }, -rollDeg * RAD)
  )
}

function pitchDegOf(q: Quat): number {
  return Math.asin(clamp1(noseDirection(q).y)) * DEG
}

function rollDegOf(q: Quat): number {
  return Math.atan2(-starboardDirection(q).y, upDirection(q).y) * DEG
}

function bankedState(rollDeg: number, pitchDeg: number): FlightState {
  return {
    position: { x: 0, y: 800, z: 0 },
    velocity: { x: 0, y: 0, z: -50 },
    orientation: attitude(0, pitchDeg, rollDeg),
    throttle: 0.5,
    speed: 50,
    altitude: 800,
    beatPhase: 0,
    beatHz: 2,
  }
}

interface Sample {
  t: number
  roll: number
  pitch: number
}

/** Steps the PURE advance() function directly (not the mutable wrapper) so
 *  the starting attitude can be an arbitrary bank/pitch, not just cruise. */
function recoveryTrace(initial: FlightState, input: FlightInput, dt: number, seconds: number): Sample[] {
  let state = initial
  const samples: Sample[] = [
    { t: 0, roll: rollDegOf(state.orientation), pitch: pitchDegOf(state.orientation) },
  ]
  const steps = Math.round(seconds / dt)
  for (let i = 1; i <= steps; i++) {
    state = advance(state, input, dt)
    samples.push({ t: i * dt, roll: rollDegOf(state.orientation), pitch: pitchDegOf(state.orientation) })
  }
  return samples
}

describe('auto-level recovers a banked/pitched craft', () => {
  it('(a) recovers from 60deg roll / -20deg pitch to under 3deg within 2.5s, monotonically after 0.2s', () => {
    const trace = recoveryTrace(bankedState(60, -20), neutralInput({ autoLevel: true }), 0.02, 2.5)
    const last = trace[trace.length - 1]

    expect(Math.abs(last.roll)).toBeLessThan(3)
    expect(Math.abs(last.pitch)).toBeLessThan(3)

    // No overshoot at any point: the magnitude never exceeds where it started.
    for (const s of trace) {
      expect(Math.abs(s.roll)).toBeLessThanOrEqual(60 + 1e-6)
      expect(Math.abs(s.pitch)).toBeLessThanOrEqual(20 + 1e-6)
    }

    // Monotonic decay after the first 0.2s: no oscillation, let alone one
    // that swings back out past a 5deg band.
    const settling = trace.filter((s) => s.t >= 0.2)
    for (let i = 1; i < settling.length; i++) {
      expect(Math.abs(settling[i].roll)).toBeLessThanOrEqual(Math.abs(settling[i - 1].roll) + 1e-6)
      expect(Math.abs(settling[i].pitch)).toBeLessThanOrEqual(Math.abs(settling[i - 1].pitch) + 1e-6)
    }
  })

  it('(b) still converges under full opposing stick deflection (override proof)', () => {
    const fightingStick = neutralInput({ pitch: 1, roll: 1, throttle: 1, autoLevel: true })
    const trace = recoveryTrace(bankedState(60, -20), fightingStick, 0.02, 2.5)
    const last = trace[trace.length - 1]

    expect(Math.abs(last.roll)).toBeLessThan(3)
    expect(Math.abs(last.pitch)).toBeLessThan(3)
  })

  it('(c) releasing mid-recovery, the very next tick honours stick demand again', () => {
    const held = neutralInput({ autoLevel: true })
    let state = bankedState(60, -20)
    for (let i = 0; i < 25; i++) state = advance(state, held, 0.02) // 0.5s of partial recovery

    const rollBeforeRelease = rollDegOf(state.orientation)
    expect(Math.abs(rollBeforeRelease)).toBeGreaterThan(10) // still well short of level
    expect(Math.abs(rollBeforeRelease)).toBeLessThan(60) // but the hold DID decay it

    // Released, and the stick now asks for MORE right roll. Auto-level would
    // keep shrinking |roll|; the ordinary stick path grows it. Only one tick.
    const released = advance(state, neutralInput({ roll: 1, autoLevel: false }), 0.02)
    expect(Math.abs(rollDegOf(released.orientation))).toBeGreaterThan(Math.abs(rollBeforeRelease))
  })

  it('(e) 0 BUBBLE: a 4s hold ends at exactly level, not merely near it', () => {
    // USER RULING, 2026-08-02 (apache-gauntlet.md B6): "auto level must bring
    // the craft to 0 bubble." Under the pure exponential this test was written
    // against, a 4s hold from 60deg left |roll| = 60 * exp(-1.5*4) = 0.149deg
    // — RED, and correctly so: an exponential never arrives, it only gets
    // small, and a bubble that never centres is what the user was looking at.
    // flight/constants.ts's TERMINAL_LEVEL_RATE is what makes arrival finite.
    const trace = recoveryTrace(bankedState(60, -20), neutralInput({ autoLevel: true }), 0.02, 4)
    const last = trace[trace.length - 1]
    expect(Math.abs(last.roll)).toBeLessThan(0.1)
    expect(Math.abs(last.pitch)).toBeLessThan(0.1)
    // Not "small": zero. The terminal rate lands the error exactly on it.
    // Through Math.abs, because the attitude round-trip (fromEuler, then
    // asin/atan2 back out) hands a level craft -0 as readily as +0 and
    // Object.is separates the two -- a sign bit on zero is not a bubble.
    expect(Math.abs(last.roll)).toBe(0)
    expect(Math.abs(last.pitch)).toBe(0)
  })

  it('(d) holding auto-level in level flight injects no drift (identity)', () => {
    const model = createFlightModel() // createInitialState(): level, cruising
    expect(model.state.orientation).toEqual(IDENTITY_QUAT)

    runFor(model, neutralInput({ autoLevel: true }), 0.02, 2)

    expect(Math.abs(rollDegOf(model.state.orientation))).toBeLessThan(1e-6)
    expect(Math.abs(pitchDegOf(model.state.orientation))).toBeLessThan(1e-6)
  })
})
