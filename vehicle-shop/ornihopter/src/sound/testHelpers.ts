// vehicle-shop/ornihopter/src/sound/testHelpers.ts
// Shared drivers for the sound-parameter tests. Not a .test.ts, so vitest
// treats it as a module rather than an empty suite — same arrangement as
// flight/testHelpers.ts.

import { createSoundClock, advanceSound } from './params'
import type { SoundCamera, SoundClock, SoundFlight, SoundParams } from './params'

export const DT = 1 / 60

/** A steady flight condition: nothing changes but the beat phase. */
export function steady(throttle: number, beatHz: number, beatAmplitude = 1): SoundFlight {
  return { throttle, beatHz, beatPhase: 0, beatAmplitude }
}

/**
 * Run the reducer until the smoothed terms have settled, and return the last
 * params. Used wherever a test asks a question about the mix rather than about
 * a transient — the cockpit/exterior comparison, the engine curve.
 */
export function settle(
  camera: SoundCamera,
  flight: SoundFlight,
  seconds = 3
): SoundParams {
  let clock: SoundClock = createSoundClock(camera)
  let params = advanceSound(clock, flight, camera, DT).params
  const steps = Math.round(seconds / DT)
  for (let i = 0; i < steps; i++) {
    const phase = ((i + 1) * flight.beatHz * Math.PI * 2 * DT) % (Math.PI * 2)
    const step = advanceSound(clock, { ...flight, beatPhase: phase }, camera, DT)
    clock = step.clock
    params = step.params
  }
  return params
}

/** Every gain the mix can emit, so "silent" can be asserted in one place. */
export function gainsOf(params: SoundParams): number[] {
  return [
    params.strokeGain,
    params.bodyGain,
    params.engineGain,
    params.whineGain,
    params.bedGain,
  ]
}

/** Every numeric field, for the finite/bounded sweep. */
export function numbersOf(params: SoundParams): Array<[string, number]> {
  return Object.entries(params).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number'
  )
}
