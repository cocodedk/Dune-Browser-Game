// vehicle-shop/ornihopter/src/flight/noseLeads.test.ts
// Bar item 1: dot(noseDirection(orientation), normalise(velocity)) > 0.99 in
// steady flight. noseDirection/normalise/dot come from contracts.ts, the
// shared spec both this module and the geometry read — not from anything
// this module defines itself, so a mistake here cannot grade its own homework.

import { describe, it, expect } from 'vitest'
import { noseDirection, normalise, dot } from '../contracts'
import { createFlightModel } from './flightModel'
import { neutralInput, runFor } from './testHelpers'

describe('nose leads velocity', () => {
  it('stays aligned with velocity in level cruise', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ throttle: 0.6 }), 0.02, 4)

    const nose = noseDirection(model.state.orientation)
    const along = dot(nose, normalise(model.state.velocity))

    expect(model.state.speed).toBeGreaterThan(1)
    expect(along).toBeGreaterThan(0.99)
  })

  it('stays aligned with velocity through a sustained coordinated turn', () => {
    const model = createFlightModel()
    runFor(model, neutralInput({ throttle: 0.6, roll: 1 }), 0.02, 3)

    const nose = noseDirection(model.state.orientation)
    const along = dot(nose, normalise(model.state.velocity))

    expect(model.state.speed).toBeGreaterThan(1)
    expect(along).toBeGreaterThan(0.99)
  })

  it('never drops below the bar across a long, hard, varied flight', () => {
    const model = createFlightModel()
    const dt = 0.05
    let minAlong = Number.POSITIVE_INFINITY

    for (let i = 0; i < 400; i++) {
      const t = i * dt
      model.step(
        {
          pitch: Math.sin(t * 0.7),
          roll: Math.sin(t * 0.5 + 1),
          yaw: Math.cos(t * 0.3),
          throttle: 0.4 + 0.3 * Math.sin(t * 0.2),
        },
        dt
      )
      if (model.state.speed > 0.5) {
        const along = dot(noseDirection(model.state.orientation), normalise(model.state.velocity))
        minAlong = Math.min(minAlong, along)
      }
    }

    expect(minAlong).toBeGreaterThan(0.99)
  })
})
