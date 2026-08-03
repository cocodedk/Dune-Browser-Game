// vehicle-shop/ornihopter/src/flight/rollBank.test.ts
// Bar item 2c: roll banks INTO the turn, not out of it. This is the exact
// shape of the historical bug (a helper that pointed the wrong way while
// looking locally plausible), so it is checked as two independent facts
// that must agree: (1) rolling right actually banks right (starboard.y
// goes negative — the physical meaning of "the right wing dips"), and
// (2) the resulting turn also goes right (nose.x goes positive). A model
// that banked right but turned left would fail assertion 2 while still
// passing assertion 1, which is exactly the failure mode this guards.

import { describe, it, expect } from 'vitest'
import { noseDirection, starboardDirection } from '../contracts'
import { createFlightModel } from './flightModel'
import { neutralInput, runFor } from './testHelpers'

describe('roll banks into the turn', () => {
  it('roll-right demand banks the right wing down', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ roll: 1 }), 0.02, 1)

    expect(starboardDirection(model.state.orientation).y).toBeLessThan(-0.3)
  })

  it('roll-right demand turns the nose to starboard, the same side as the bank', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ roll: 1 }), 0.02, 1)

    expect(noseDirection(model.state.orientation).x).toBeGreaterThan(0.05)
  })

  it('roll-left is the mirror image: banks left and turns left', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ roll: -1 }), 0.02, 1)

    expect(starboardDirection(model.state.orientation).y).toBeGreaterThan(0.3)
    expect(noseDirection(model.state.orientation).x).toBeLessThan(-0.05)
  })

  it('no roll demand leaves the craft wings-level', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ roll: 0 }), 0.02, 1)

    expect(Math.abs(starboardDirection(model.state.orientation).y)).toBeLessThan(0.001)
  })
})
