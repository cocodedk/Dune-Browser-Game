// vehicle-shop/ornihopter/src/flight/testHelpers.ts
// Shared scaffolding for the flight test suite. Not itself a *.test.ts file,
// so vitest does not try to run it as a suite.

import type { FlightModel, FlightInput } from '../contracts'

export function neutralInput(overrides: Partial<FlightInput> = {}): FlightInput {
  return { pitch: 0, roll: 0, yaw: 0, throttle: 0.5, ...overrides }
}

/** Step a model at a fixed dt for the given simulated duration. */
export function runFor(model: FlightModel, input: FlightInput, dt: number, seconds: number): void {
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i++) {
    model.step(input, dt)
  }
}
