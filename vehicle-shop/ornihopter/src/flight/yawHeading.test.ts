// vehicle-shop/ornihopter/src/flight/yawHeading.test.ts
// Bar item 2b: yaw-left demand rotates heading counter-clockwise seen from
// above. Grounded in geometry, not in this module's own conventions: nose
// starts due "north" (local -Z, spec.ts's forward). Seen from above with
// +X drawn to the right (starboard, per spec.ts) and -Z drawn "up" the
// page, a turn toward -X (port) directly off due-north IS the counter-
// clockwise direction — the same fact a compass rose encodes. So this test
// checks nose.x went negative and the compass-style heading (measured
// clockwise-positive, like a real compass) went negative, i.e. exactly
// what "rotates CCW" means, without hard-coding this module's own sign choices.

import { describe, it, expect } from 'vitest'
import { noseDirection } from '../contracts'
import { createFlightModel } from './flightModel'
import { neutralInput, runFor } from './testHelpers'

/** Clockwise-positive compass heading from above; 0 at due "north" (-Z). */
function headingDeg(nose: { x: number; z: number }): number {
  return (Math.atan2(nose.x, -nose.z) * 180) / Math.PI
}

describe('yaw controls heading', () => {
  it('yaw-left rotates the nose toward -X (port), off due-north', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ yaw: -1 }), 0.02, 2)

    const nose = noseDirection(model.state.orientation)
    expect(nose.x).toBeLessThan(-0.3)
  })

  it('yaw-left drives compass heading negative: counter-clockwise from above', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ yaw: -1 }), 0.02, 2)

    const heading = headingDeg(noseDirection(model.state.orientation))
    expect(heading).toBeLessThan(-15)
  })

  it('yaw-right drives compass heading positive: the mirror-image, clockwise turn', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ yaw: 1 }), 0.02, 2)

    const heading = headingDeg(noseDirection(model.state.orientation))
    expect(heading).toBeGreaterThan(15)
  })

  it('no yaw demand leaves heading unchanged', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ yaw: 0 }), 0.02, 2)

    const heading = headingDeg(noseDirection(model.state.orientation))
    expect(Math.abs(heading)).toBeLessThan(0.01)
  })
})
