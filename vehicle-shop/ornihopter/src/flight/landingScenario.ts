// vehicle-shop/ornihopter/src/flight/landingScenario.ts
// The scripted approach both landing suites fly. Not a *.test.ts file, so
// vitest does not run it as a suite; shared so the touchdown proof and the
// spool proof land the SAME way, and one tuning change moves both.
//
// PARKED_ALTITUDE is read from the gear stance itself rather than copied.
// geometry/gear/stance.ts's GROUND_Y is the craft-local Y of the plane every
// foot stands on, so the craft origin rides exactly -GROUND_Y above whatever
// heightAt() reports beneath it. That module is pure — no three.js anywhere in
// its import chain (spec, hullProfile, hullStations, hullCrossSection) — so a
// DOM-less test may read it, and reading it means a later stance change fails
// these tests instead of silently burying the craft in sand.

import type { FlightInput, FlightModel, FlightState } from '../contracts'
import { upDirection } from '../contracts'
import { createFlightModel } from './flightModel'
import { GROUND_Y } from '../model/geometry/gear/stance'

export const PARKED_ALTITUDE = -GROUND_Y

export const DT = 0.02

/** Nose-down for this long, then hands off the stick. The glide settles into
 *  a steady ~9-degree, ~16 m/s descent — about 2.5 m/s of sink — which is the
 *  ordinary approach a pilot would fly, not a contrived one-frame setup. */
const PUSHOVER_SECONDS = 0.3

export function approachInput(elapsed: number, throttle = 0): FlightInput {
  return { pitch: elapsed < PUSHOVER_SECONDS ? -1 : 0, roll: 0, yaw: 0, throttle }
}

/** Degrees between the craft's own up axis and world up: one number that
 *  bounds pitch and roll together, and the same quantity the touchdown gate
 *  tests, derived here from contracts.ts vectors rather than from the gate. */
export function tiltDegOf(state: Readonly<FlightState>): number {
  const up = upDirection(state.orientation)
  return (Math.acos(Math.max(-1, Math.min(1, up.y))) * 180) / Math.PI
}

export interface Approach {
  model: FlightModel
  /** Simulated seconds at the step the model first reported landed; -1 if never. */
  touchdownAt: number
  /** Descent rate in m/s over the step that made contact. */
  sink: number
  /** Angle off level in degrees at contact. */
  tiltDeg: number
  /** Speed in m/s at contact. */
  speed: number
  /** Lowest ground-relative altitude seen anywhere in the run. */
  lowest: number
}

/** Fly the scripted approach until the model reports landed, or give up. */
export function flyApproach(limitSeconds = 40, throttle = 0): Approach {
  const model = createFlightModel()
  const steps = Math.round(limitSeconds / DT)
  let previous = model.state
  let lowest = Number.POSITIVE_INFINITY

  for (let i = 0; i < steps; i++) {
    model.step(approachInput(i * DT, throttle), DT)
    const state = model.state
    lowest = Math.min(lowest, state.altitude)

    if (state.landed === true) {
      return {
        model,
        touchdownAt: (i + 1) * DT,
        sink: -previous.velocity.y,
        tiltDeg: tiltDegOf(previous),
        speed: previous.speed,
        lowest,
      }
    }
    previous = state
  }

  return { model, touchdownAt: -1, sink: NaN, tiltDeg: NaN, speed: NaN, lowest }
}
