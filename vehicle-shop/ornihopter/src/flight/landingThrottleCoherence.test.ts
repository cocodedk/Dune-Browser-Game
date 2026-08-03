// vehicle-shop/ornihopter/src/flight/landingThrottleCoherence.test.ts
// USER FINDING: "it is frozen at a height of 4.3 meters" / "it doesn't
// land." GEAR_HEIGHT is 4.3m — the LANDED state likely DID trigger, and a
// craft that touches down while throttle is still at or above
// TAKEOFF_THROTTLE has no way to ever satisfy spool-down's condition
// (throttle < TAKEOFF_THROTTLE), so an unconditional `landed: true` on
// touchdown would park it forever with the wings still at full amplitude
// and the stick locked out — landed, beating, dead controls, permanently.
//
// The full truth table for "what does touchdown do with the throttle it
// arrives at": exercised directly against groundPhase() (landing.ts), not a
// flown approach, so every case is an exact, hand-placed precondition rather
// than a trajectory that may or may not reach it.

import { describe, it, expect } from 'vitest'
import { groundPhase } from './landing'
import { IDENTITY_QUAT } from './quatMath'
import { GEAR_HEIGHT, TAKEOFF_THROTTLE } from './constants'
import { heightAt } from '../stage/terrain'
import type { FlightState } from '../contracts'

const GROUND_Y_WORLD = heightAt(0, 0)

/** A previous tick still airborne, one step from crossing the gear plane at
 *  a gentle, gate-passing sink, dead level. */
function justAboveGear(throttle: number): FlightState {
  return {
    position: { x: 0, y: GROUND_Y_WORLD + GEAR_HEIGHT + 0.08, z: 0 },
    velocity: { x: 0, y: -3, z: -10 },
    orientation: IDENTITY_QUAT,
    throttle,
    speed: 10,
    altitude: GEAR_HEIGHT + 0.08,
    beatPhase: 0,
    beatHz: 2,
    landed: false,
    beatAmplitude: 1,
  }
}

/** The kinematics this same step would have produced, crossing to just
 *  below the gear plane at a 3 m/s sink — inside every touchdown gate. */
function crossingKinematics() {
  return {
    position: { x: 0, y: GROUND_Y_WORLD + GEAR_HEIGHT - 0.02, z: 0 },
    velocity: { x: 0, y: -3, z: -10 },
    speed: 10,
  }
}

describe('touchdown x throttle: the full coherence table', () => {
  it('throttle 0 (idle): latches landed, beat carried over full to spool down next tick', () => {
    const previous = justAboveGear(0)
    const result = groundPhase(previous, IDENTITY_QUAT, crossingKinematics(), 0, 0.02)

    expect(result.landed).toBe(true)
    expect(result.altitude).toBeCloseTo(GEAR_HEIGHT, 6)
    expect(result.beatAmplitude).toBe(1) // spools down starting NEXT tick, not this one
  })

  it(`throttle just below TAKEOFF_THROTTLE (${TAKEOFF_THROTTLE - 0.01}): still latches landed`, () => {
    const t = TAKEOFF_THROTTLE - 0.01
    const result = groundPhase(justAboveGear(t), IDENTITY_QUAT, crossingKinematics(), t, 0.02)
    expect(result.landed).toBe(true)
  })

  it(`throttle exactly TAKEOFF_THROTTLE (${TAKEOFF_THROTTLE}): counts as "leaving", does not latch`, () => {
    const result = groundPhase(
      justAboveGear(TAKEOFF_THROTTLE), IDENTITY_QUAT, crossingKinematics(), TAKEOFF_THROTTLE, 0.02
    )
    expect(result.landed).toBe(false)
  })

  it('throttle high (0.6, a hot touchdown): does NOT freeze — immediately flying again, full beat', () => {
    const result = groundPhase(justAboveGear(0.6), IDENTITY_QUAT, crossingKinematics(), 0.6, 0.02)

    expect(result.landed).toBe(false)
    expect(result.beatAmplitude).toBe(1) // never touched: no spool-down was ever entered
    expect(result.altitude).toBeCloseTo(GEAR_HEIGHT, 6) // gear still absorbs this step's descent
  })

  it('never reaches a state that is landed with beatAmplitude 1 forever: a hot landing that stays hot never re-latches', () => {
    let state = groundPhase(justAboveGear(0.6), IDENTITY_QUAT, crossingKinematics(), 0.6, 0.02)
    expect(state.landed).toBe(false)

    // Hold throttle high for two more seconds. If this ever reports landed
    // again while beatAmplitude stays pinned at 1, that IS the frozen state.
    for (let i = 0; i < 100; i++) {
      const kin = { position: state.position, velocity: state.velocity, speed: state.speed }
      const full: FlightState = {
        position: state.position, velocity: state.velocity, orientation: state.orientation,
        throttle: 0.6, speed: state.speed, altitude: state.altitude, beatPhase: 0, beatHz: 2,
        landed: state.landed, beatAmplitude: state.beatAmplitude,
      }
      state = groundPhase(full, state.orientation, kin, 0.6, 0.02)
      expect(state.landed).not.toBe(true)
    }
  })
})
