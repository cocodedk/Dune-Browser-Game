// vehicle-shop/ornihopter/src/sound/paramBounds.test.ts
// Proof (e), in the shape flight/stability.test.ts uses: drive every extreme
// corner of the input space and require that every emitted number is finite
// and inside its published bound. A NaN reaching an AudioParam does not throw
// — it silently kills the node for the rest of the session — so this is the
// test that keeps a bad frame from ending the sound.

import { describe, it, expect } from 'vitest'
import { createSoundClock, advanceSound, SOUND_BOUNDS } from './params'
import type { SoundCamera, SoundClock, SoundFlight } from './params'
import { numbersOf } from './testHelpers'

const EXTREME_FLIGHT: SoundFlight[] = [
  { throttle: 0, beatHz: 0, beatPhase: 0, beatAmplitude: 0 },
  { throttle: 1, beatHz: 4, beatPhase: 6.28, beatAmplitude: 1 },
  { throttle: -5, beatHz: -12, beatPhase: -99, beatAmplitude: -3 },
  { throttle: 1e9, beatHz: 1e9, beatPhase: 1e9, beatAmplitude: 1e9 },
  { throttle: Number.NaN, beatHz: Number.NaN, beatPhase: Number.NaN, beatAmplitude: Number.NaN },
  { throttle: Infinity, beatHz: Infinity, beatPhase: Infinity, beatAmplitude: Infinity },
  { throttle: -Infinity, beatHz: -Infinity, beatPhase: -Infinity, beatAmplitude: -Infinity },
  { throttle: 0.5, beatHz: 2.75, beatPhase: 3, beatAmplitude: undefined },
]

const EXTREME_DT = [0, 1 / 240, 1 / 60, 0.1, 5, -1, Number.NaN, Infinity]
const CAMERAS: SoundCamera[] = ['pilot', 'chase', 'orbit', 'free']

function expectBounded(params: ReturnType<typeof advanceSound>['params'], label: string): void {
  for (const [key, value] of numbersOf(params)) {
    const bound = SOUND_BOUNDS[key as keyof typeof SOUND_BOUNDS]
    expect(Number.isFinite(value), `${label}: ${key} = ${value}`).toBe(true)
    expect(bound, `${label}: ${key} has no published bound`).toBeDefined()
    expect(value, `${label}: ${key}`).toBeGreaterThanOrEqual(bound[0])
    expect(value, `${label}: ${key}`).toBeLessThanOrEqual(bound[1])
  }
}

describe('params are finite and bounded for every extreme state', () => {
  it('survives the input cube at every dt and every camera', () => {
    for (const camera of CAMERAS) {
      let clock: SoundClock = createSoundClock(camera)
      for (const dt of EXTREME_DT) {
        for (const flight of EXTREME_FLIGHT) {
          const step = advanceSound(clock, flight, camera, dt)
          clock = step.clock
          expectBounded(step.params, `${camera} dt=${dt} thr=${flight.throttle}`)
          expect(Number.isFinite(clock.enclosure)).toBe(true)
          expect(Number.isFinite(clock.lastPhase)).toBe(true)
        }
      }
    }
  })

  it('recovers a clean mix after a run of poisoned frames', () => {
    let clock: SoundClock = createSoundClock('chase')
    for (let i = 0; i < 50; i++) {
      clock = advanceSound(
        clock,
        { throttle: Number.NaN, beatHz: Number.NaN, beatPhase: Number.NaN },
        'chase',
        Number.NaN
      ).clock
    }
    const recovered = advanceSound(
      clock,
      { throttle: 0.8, beatHz: 3.5, beatPhase: 1, beatAmplitude: 1 },
      'chase',
      1 / 60
    ).params
    expect(recovered.engineGain).toBeGreaterThan(0)
    expectBounded(recovered, 'recovered')
  })

  it('publishes bounds a graph can trust — no zero-Hz filters, no gain over unity', () => {
    // Spot-checked against literals here rather than read from the module, so
    // widening a clamp to make a failure go away breaks this test too.
    expect(SOUND_BOUNDS.cabinCutoffHz[0]).toBeGreaterThanOrEqual(120)
    expect(SOUND_BOUNDS.cabinCutoffHz[1]).toBeLessThanOrEqual(20000)
    expect(SOUND_BOUNDS.engineHz[0]).toBeGreaterThanOrEqual(10)
    expect(SOUND_BOUNDS.strokeBandHz[0]).toBeGreaterThanOrEqual(60)
    expect(SOUND_BOUNDS.strokeAttack[0]).toBeGreaterThan(0)
    expect(SOUND_BOUNDS.strokeDecay[0]).toBeGreaterThan(0)
    for (const key of ['strokeGain', 'bodyGain', 'engineGain', 'whineGain', 'bedGain', 'cabinGain'] as const) {
      expect(SOUND_BOUNDS[key][0]).toBe(0)
      expect(SOUND_BOUNDS[key][1]).toBeLessThanOrEqual(1)
    }
  })
})
