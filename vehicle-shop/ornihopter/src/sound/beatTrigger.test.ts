// vehicle-shop/ornihopter/src/sound/beatTrigger.test.ts
// Proof (a) and the Round 10 spool tie-in: the whoosh envelope is driven by the
// flight model's own beatPhase, so it can never drift against the wings the way
// a free-running audio loop would. The count is checked against the INTEGRAL of
// beatHz dt — the number of strokes the wings actually made — not against a
// nominal rate.

import { describe, it, expect } from 'vitest'
import { nextBeat } from '../flight/wingBeat'
import { createSoundClock, advanceSound } from './params'
import type { SoundClock } from './params'
import { DT } from './testHelpers'

const TWO_PI = Math.PI * 2

interface Run {
  triggers: number
  cycles: number
  endPhase: number
  gains: number[]
}

/**
 * How many strokes the wings COMPLETED, from the flight model's own numbers.
 * The integral of beatHz dt counts whole and partial strokes alike, so the
 * fraction still in progress at the end of the run — exactly the phase the
 * model is holding — has to come back off it. Rounding then removes the
 * float noise between two different accumulations of the same quantity, and
 * nothing else: a drift of even one stroke moves this by a whole integer.
 */
function completedStrokes(run: Run): number {
  return Math.round(run.cycles - run.endPhase / TWO_PI)
}

/** Drive the reducer off the real wing-beat integrator for `seconds`. */
function fly(
  seconds: number,
  throttleAt: (t: number) => number,
  spoolAt: (t: number) => number = () => 1
): Run {
  let phase = 0
  let cycles = 0
  let triggers = 0
  let clock: SoundClock = createSoundClock('chase')
  const gains: number[] = []
  const steps = Math.round(seconds / DT)

  for (let i = 0; i < steps; i++) {
    const t = i * DT
    const throttle = throttleAt(t)
    const spool = spoolAt(t)
    const beat = nextBeat(phase, throttle, DT, spool)
    phase = beat.beatPhase
    cycles += beat.beatHz * DT
    const step = advanceSound(
      clock,
      { throttle, beatPhase: phase, beatHz: beat.beatHz, beatAmplitude: spool },
      'chase',
      DT
    )
    clock = step.clock
    if (step.params.strokeTrigger) {
      triggers++
      gains.push(step.params.strokeGain)
    }
  }
  return { triggers, cycles, endPhase: phase, gains }
}

describe('the wing-beat envelope is phase-locked to the flight model', () => {
  it('fires exactly once per stroke cycle over 10s of varying beatHz', () => {
    // Throttle sweeps the full 0..1 range, so beatHz sweeps BEAT_HZ_MIN..MAX
    // and the stroke period is never constant for two frames running.
    const run = fly(10, (t) => 0.5 + 0.5 * Math.sin(t * 0.9))

    expect(run.cycles).toBeGreaterThan(20)
    expect(run.triggers).toBe(completedStrokes(run))
  })

  it('fires once per cycle at the slowest and the fastest beat alike', () => {
    const idle = fly(10, () => 0)
    const full = fly(10, () => 1)

    expect(idle.triggers).toBe(completedStrokes(idle))
    expect(full.triggers).toBe(completedStrokes(full))
    expect(full.triggers).toBeGreaterThan(idle.triggers)
  })

  it('thins and then stops as the wings park — Round 10 spool-down, audible', () => {
    // Spool 1 -> 0 over 2.5s (SPOOL_DOWN_SECONDS), throttle falling with it.
    const run = fly(
      6,
      (t) => Math.max(0, 1 - t / 2.5),
      (t) => Math.max(0, 1 - t / 2.5)
    )

    expect(run.triggers).toBe(completedStrokes(run))
    expect(run.triggers).toBeGreaterThanOrEqual(3)
    // The beat thins: every stroke is quieter than the one before it.
    for (let i = 1; i < run.gains.length; i++) {
      expect(run.gains[i]).toBeLessThan(run.gains[i - 1])
    }
    // And then it stops: the phase stops advancing, so no stroke fires at all
    // in the last second of the run.
    const parked = fly(1, () => 0, () => 0)
    expect(parked.triggers).toBe(0)
  })

  it('spools back up on takeoff — strokes return and grow', () => {
    const run = fly(
      4,
      (t) => Math.min(1, t / 1.5),
      (t) => Math.min(1, t / 1.5)
    )

    expect(run.triggers).toBe(completedStrokes(run))
    expect(run.triggers).toBeGreaterThan(8)
    expect(run.gains[run.gains.length - 1]).toBeGreaterThan(run.gains[0])
  })
})
