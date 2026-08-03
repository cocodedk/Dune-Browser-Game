// vehicle-shop/ornihopter/src/flight/wingFold.test.ts
// The wing fold as a STATE MACHINE: what it refuses, how it travels, and what
// it does to a takeoff. Pure — no three.js, no rig, no DOM. The pose the
// blades take is a separate claim, proved against real geometry in
// model/wingFoldClearance.test.ts.
//
// Every scenario here flies the SAME scripted approach the landing suites fly
// (landingScenario.ts) and then waits out the spool, rather than hand-writing
// a "landed" literal: a fake parked state would still pass if the real one
// could never be reached.

import { describe, it, expect } from 'vitest'
import { flyApproach, DT } from './landingScenario'
import { runFor, neutralInput } from './testHelpers'
import { foldAllowed } from './wingFold'
import { FOLD_SECONDS, TAKEOFF_THROTTLE, SPOOL_DOWN_SECONDS } from './constants'
import type { FlightModel } from '../contracts'

const IDLE = neutralInput({ throttle: 0 })
const TOGGLE = neutralInput({ throttle: 0, foldToggle: true })

/** Parked, wing drive stopped — the only state a fold is offered in. */
function parked(): FlightModel {
  const { model } = flyApproach()
  runFor(model, IDLE, DT, SPOOL_DOWN_SECONDS + 0.5)
  expect(model.state.beatAmplitude).toBe(0)
  expect(model.state.landed).toBe(true)
  return model
}

describe('(a) a fold demanded in flight is refused', () => {
  it('changes nothing and says so', () => {
    const model = flyApproach().model
    // Rewind to the air: a fresh model is airborne at cruise by construction.
    const flying = flyApproach(0.2).model
    expect(flying.state.landed).not.toBe(true)
    expect(foldAllowed(flying.state)).toBe(false)

    flying.step(TOGGLE, DT)
    expect(flying.state.foldPhase).toBe(0)
    expect(flying.state.foldProgress).toBe(0)
    expect(flying.state.foldTarget).toBe(0)
    expect(flying.state.foldRefused).toBe(true)
    expect(model.state.landed).toBe(true)
  })

  it('is refused mid-spool too — landed is not enough', () => {
    const { model } = flyApproach()
    runFor(model, IDLE, DT, SPOOL_DOWN_SECONDS / 2)
    expect(model.state.landed).toBe(true)
    expect(model.state.beatAmplitude).toBeGreaterThan(0)

    model.step(TOGGLE, DT)
    expect(model.state.foldRefused).toBe(true)
    expect(model.state.foldPhase).toBe(0)
  })
})

describe('(b) landed with the beat at zero, the toggle folds', () => {
  it('runs 0 -> 1 over FOLD_SECONDS, monotone and eased', () => {
    const model = parked()
    model.step(TOGGLE, DT)
    expect(model.state.foldRefused).toBe(false)
    expect(model.state.foldTarget).toBe(1)

    const trace: number[] = [model.state.foldProgress ?? 0]
    const steps = Math.round(FOLD_SECONDS / DT)
    for (let i = 0; i < steps; i++) {
      model.step(IDLE, DT)
      trace.push(model.state.foldProgress ?? 0)
    }
    expect(model.state.foldPhase).toBe(1)
    expect(model.state.foldProgress).toBe(1)
    for (let i = 1; i < trace.length; i++) expect(trace[i]).toBeGreaterThanOrEqual(trace[i - 1])

    // Eased, not linear: smoothstep's first and last tenths cover far less
    // ground than a ramp's, and its middle covers more.
    const at = (f: number) => trace[Math.round(f * (trace.length - 1))]
    expect(at(0.1)).toBeLessThan(0.06)
    expect(at(0.9)).toBeGreaterThan(0.94)
    expect(at(0.5)).toBeGreaterThan(0.45)
    expect(at(0.5)).toBeLessThan(0.55)
    // Not there yet halfway through, and no overshoot anywhere.
    expect(Math.max(...trace)).toBeLessThanOrEqual(1)
  })
})

describe('(d) toggling again returns EXACTLY the spread pose', () => {
  it('unfolds to bit-equal zero', () => {
    const model = parked()
    model.step(TOGGLE, DT)
    runFor(model, IDLE, DT, FOLD_SECONDS + 0.5)
    expect(model.state.foldProgress).toBe(1)

    model.step(TOGGLE, DT)
    expect(model.state.foldTarget).toBe(0)
    runFor(model, IDLE, DT, FOLD_SECONDS + 0.5)
    // Object.is, not toBeCloseTo: the rig's unfolded branch is only
    // bit-identical to the pre-fold tree when this is exactly +0.
    expect(Object.is(model.state.foldPhase, 0)).toBe(true)
    expect(Object.is(model.state.foldProgress, 0)).toBe(true)
  })
})

describe('(e) throttle up while stowed is refused, and is not a trap', () => {
  it('holds the craft on its feet with the beat stopped', () => {
    const model = parked()
    model.step(TOGGLE, DT)
    runFor(model, IDLE, DT, FOLD_SECONDS + 0.5)

    const full = neutralInput({ throttle: 1 })
    runFor(model, full, DT, 5)
    expect(model.state.landed).toBe(true)
    expect(model.state.beatAmplitude).toBe(0)
    expect(model.state.beatHz).toBe(0)
    expect(model.state.foldProgress).toBe(1)
  })

  it('the same key gets out of it, and then the craft flies', () => {
    const model = parked()
    model.step(TOGGLE, DT)
    runFor(model, IDLE, DT, FOLD_SECONDS + 0.5)
    runFor(model, neutralInput({ throttle: 1 }), DT, 3)

    // Held at full throttle, the fold key is still live — that is what makes
    // the refusal a gate and not a frozen state.
    expect(foldAllowed(model.state)).toBe(true)
    model.step(neutralInput({ throttle: 1, foldToggle: true }), DT)
    expect(model.state.foldRefused).toBe(false)
    runFor(model, neutralInput({ throttle: 1 }), DT, FOLD_SECONDS + 4)

    expect(model.state.foldProgress).toBe(0)
    expect(model.state.throttle).toBeGreaterThanOrEqual(TAKEOFF_THROTTLE)
    expect(model.state.landed).toBe(false)
    expect(model.state.beatAmplitude).toBe(1)
  })
})
