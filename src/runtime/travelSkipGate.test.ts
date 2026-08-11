// src/runtime/travelSkipGate.test.ts

import { describe, it, expect } from 'vitest'
import { canSkipFlight, FLIGHT_SKIP_GATE_MS } from './travelSkipGate'

describe('canSkipFlight', () => {
  it('refuses before the gate elapses', () => {
    expect(canSkipFlight(0)).toBe(false)
    expect(canSkipFlight(FLIGHT_SKIP_GATE_MS - 1)).toBe(false)
  })

  it('allows once the gate elapses, inclusive', () => {
    expect(canSkipFlight(FLIGHT_SKIP_GATE_MS)).toBe(true)
    expect(canSkipFlight(FLIGHT_SKIP_GATE_MS + 500)).toBe(true)
  })
})
