// vehicle-shop/ornihopter/src/flight/flightModel.ts
// Entry point main.ts calls. Thin mutable wrapper around the pure advance()
// step function and the pure createInitialState() reset function — all the
// actual dynamics live in the sibling modules so this file has nothing to
// get wrong beyond wiring them together.

import type { FlightModel, FlightInput } from '../contracts'
import { createInitialState } from './state'
import { advance } from './advance'

export function createFlightModel(): FlightModel {
  let current = createInitialState()

  return {
    get state() {
      return current
    },
    step(input: FlightInput, dt: number) {
      current = advance(current, input, dt)
    },
    reset() {
      current = createInitialState()
    },
  }
}
