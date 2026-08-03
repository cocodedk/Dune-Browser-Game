// vehicle-shop/ornihopter/src/sound/mix.test.ts
// Proofs (b), (c) and (d): parked is silent, the turbine tracks throttle
// monotonically, and the pilot's view is measurably muffled against the
// external views. All of it on the pure layer — no AudioContext, no DOM.

import { describe, it, expect } from 'vitest'
import { createSoundClock, advanceSound } from './params'
import type { SoundClock } from './params'
import { DT, steady, settle, gainsOf } from './testHelpers'
import { ENGINE } from './tuning'

describe('a parked craft is silent', () => {
  it('emits zero on every gain when the beat has spooled out and the throttle is shut', () => {
    const params = settle('chase', steady(0, 0, 0))
    for (const gain of gainsOf(params)) expect(gain).toBe(0)
  })

  it('is silent in the cockpit too', () => {
    const params = settle('pilot', steady(0, 0, 0))
    for (const gain of gainsOf(params)) expect(gain).toBe(0)
  })

  it('still runs the engine when parked with the throttle open — only the beat stops', () => {
    // Landed below TAKEOFF_THROTTLE: beatAmplitude has wound to 0 but the
    // machine has not been shut down, so the turbine is still turning.
    const params = settle('chase', steady(0.3, 0, 0))
    expect(params.strokeGain).toBe(0)
    expect(params.bodyGain).toBe(0)
    expect(params.engineGain).toBeGreaterThan(0)
  })
})

describe('the turbine tracks the throttle', () => {
  it('raises pitch strictly monotonically with throttle', () => {
    let previousHz = -1
    let previousWhine = -1
    for (let i = 0; i <= 20; i++) {
      const throttle = i / 20
      const params = settle('chase', steady(throttle, 1.5 + 2.5 * throttle))
      expect(params.engineHz).toBeGreaterThan(previousHz)
      expect(params.whineHz).toBeGreaterThan(previousWhine)
      previousHz = params.engineHz
      previousWhine = params.whineHz
    }
  })

  it('raises level monotonically with throttle, and is audible at idle', () => {
    let previous = -1
    for (let i = 0; i <= 20; i++) {
      const throttle = i / 20
      const params = settle('chase', steady(throttle, 1.5 + 2.5 * throttle))
      expect(params.engineGain).toBeGreaterThanOrEqual(previous)
      previous = params.engineGain
    }
    // "Audible at idle": the keyboard starts the session at 0.45 throttle and
    // the flight model's idle beat is BEAT_HZ_MIN, so this is the quietest
    // running state a pilot ever actually hears.
    const idle = settle('chase', steady(0.45, 1.5))
    expect(idle.engineGain).toBeGreaterThan(0.02)
  })

  it('opens the engine filter with throttle, and never masks the beat', () => {
    const idle = settle('chase', steady(0.2, 2))
    const full = settle('chase', steady(1, 4))
    expect(full.engineLowpassHz).toBeGreaterThan(idle.engineLowpassHz)
    // The stroke has to stay on top of the engine bed at every throttle.
    expect(full.strokeGain).toBeGreaterThan(full.engineGain)
    expect(idle.strokeGain).toBeGreaterThan(idle.engineGain)
  })

  it('deepens and hardens the beat with throttle', () => {
    const idle = settle('chase', steady(0.2, 2))
    const full = settle('chase', steady(1, 4))
    expect(full.strokeGain).toBeGreaterThan(idle.strokeGain)
    expect(full.strokeBandHz).toBeLessThan(idle.strokeBandHz)
    expect(full.strokeAttack).toBeLessThan(idle.strokeAttack)
    // Faster beat, shorter tail — strokes must not smear into each other.
    expect(full.strokeDecay).toBeLessThan(1 / 4)
  })
})

describe('Round 13b: the whine is capped and softened at the top end', () => {
  it('caps the whine frequency in a firm upper-mid register, not treble', () => {
    const full = settle('chase', steady(1, 4))
    expect(full.whineHz).toBeLessThanOrEqual(ENGINE.whineHzCap)
  })

  it('already sat under the grind at full throttle — unchanged by the cap', () => {
    const full = settle('chase', steady(1, 4))
    expect(full.whineGain).toBeLessThan(full.engineGain)
  })

  it('now sits under the bed too — an overtone, not a lead voice', () => {
    const full = settle('chase', steady(1, 4))
    expect(full.whineGain).toBeLessThan(full.bedGain)
  })

  it('leaves low/mid throttle bit-identical — the knee sits above both', () => {
    // Round 12's pre-knee formula, inlined so this pins the OLD curve
    // independently of tuning.ts and fails if the knee ever creeps down.
    const oldWhineHz = (t: number) => (38 + 54 * t) * (16 + 7 * t)
    for (const t of [0, 0.2, 0.45, 0.5]) {
      const params = settle('chase', steady(t, 1.5 + 2.5 * t))
      expect(params.whineHz).toBe(oldWhineHz(t))
    }
  })

  it('bends toward the cap with no derivative spike across the knee', () => {
    const SAMPLES = 50
    const hz: number[] = []
    for (let i = 0; i < SAMPLES; i++) {
      const throttle = i / (SAMPLES - 1)
      hz.push(settle('chase', steady(throttle, 1.5 + 2.5 * throttle)).whineHz)
    }
    const slope: number[] = []
    for (let i = 0; i < hz.length - 1; i++) slope.push(hz[i + 1] - hz[i])
    let maxJump = 0
    for (let i = 0; i < slope.length - 1; i++) {
      maxJump = Math.max(maxJump, Math.abs(slope[i + 1] - slope[i]))
    }
    const maxSlope = Math.max(...slope.map(Math.abs))
    // A hard clamp would dump nearly the whole peak slope into ONE step; a
    // soft knee spreads the bend over many steps instead.
    expect(maxJump).toBeLessThan(maxSlope * 0.3)
  })
})

describe('the cockpit is an armored tub', () => {
  it('drops both the cutoff and the level below the external views', () => {
    const flight = steady(0.8, 3.5)
    const cockpit = settle('pilot', flight)
    for (const outside of ['chase', 'orbit', 'free'] as const) {
      const exterior = settle(outside, flight)
      expect(cockpit.cabinCutoffHz).toBeLessThan(exterior.cabinCutoffHz)
      expect(cockpit.cabinGain).toBeLessThan(exterior.cabinGain)
    }
  })

  it('crossfades rather than switching — no step the graph could click on', () => {
    const flight = steady(0.8, 3.5)
    let clock: SoundClock = createSoundClock('pilot')
    let previous = advanceSound(clock, flight, 'pilot', DT).params

    let steps = 0
    for (let i = 0; i < 240; i++) {
      const step = advanceSound(clock, flight, 'chase', DT)
      clock = step.clock
      // No single frame may move the enclosure by more than a small fraction:
      // the crossfade is what keeps the cabin filter from jumping.
      expect(Math.abs(step.params.enclosure - previous.enclosure)).toBeLessThan(0.12)
      expect(step.params.cabinGain).toBeGreaterThanOrEqual(previous.cabinGain)
      previous = step.params
      steps++
    }

    expect(steps).toBe(240)
    // ...and it does arrive: after 4 seconds the mix is fully outside.
    expect(previous.enclosure).toBeLessThan(0.01)
    expect(previous.cabinCutoffHz).toBeGreaterThan(10000)
  })

  it('starts already settled for the camera it was created in', () => {
    expect(createSoundClock('pilot').enclosure).toBe(1)
    expect(createSoundClock('chase').enclosure).toBe(0)
  })
})
