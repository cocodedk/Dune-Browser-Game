// src/game-render/modes/flight/wingConfig.test.ts

import { describe, it, expect } from 'vitest'
import {
  BEAT_HZ, phaseAtElapsedMs,
  FORE_LEFT_OPTIONS, FORE_RIGHT_OPTIONS, REAR_LEFT_OPTIONS, REAR_RIGHT_OPTIONS,
} from './wingConfig'

describe('beat frequency', () => {
  it('sits in the 1-3 Hz spec range — the code this replaces ran at ~3.5', () => {
    expect(BEAT_HZ).toBeGreaterThanOrEqual(1)
    expect(BEAT_HZ).toBeLessThanOrEqual(3)
  })

  it('phaseAtElapsedMs advances by one full turn per beat period', () => {
    const periodMs = 1000 / BEAT_HZ
    expect(phaseAtElapsedMs(periodMs)).toBeCloseTo(2 * Math.PI, 6)
  })
})

describe('forewing stroke amplitude', () => {
  it('is 60-70 degrees peak-to-peak — the code this replaces was ~39', () => {
    const peakToPeakDeg = (FORE_LEFT_OPTIONS.flapAmplitude * 2 * 180) / Math.PI
    expect(peakToPeakDeg).toBeGreaterThanOrEqual(60)
    expect(peakToPeakDeg).toBeLessThanOrEqual(70)
  })
})

describe('breaking mirror symmetry', () => {
  // `rightWing.rotation.z = -beat * 0.34` was an exact negation of the
  // left. Every one of the four wings needs its own small, deterministic
  // offset instead.
  const all = [FORE_LEFT_OPTIONS, FORE_RIGHT_OPTIONS, REAR_LEFT_OPTIONS, REAR_RIGHT_OPTIONS]

  it('no two of the four wings share an asymmetry offset', () => {
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i].asymmetry
        const b = all[j].asymmetry
        expect(a).toBeDefined()
        expect(b).toBeDefined()
        const same = a!.phase === b!.phase && a!.amplitudeScale === b!.amplitudeScale
        expect(same).toBe(false)
      }
    }
  })

  it('left/right pairs are not exact negations of one another', () => {
    expect(FORE_LEFT_OPTIONS.asymmetry!.phase).not.toBe(-FORE_RIGHT_OPTIONS.asymmetry!.phase)
    expect(REAR_LEFT_OPTIONS.asymmetry!.phase).not.toBe(-REAR_RIGHT_OPTIONS.asymmetry!.phase)
  })

  it('fore and hind pairs lead by roughly the ~90 degree cruise phase', () => {
    const leadDeg = ((REAR_LEFT_OPTIONS.pairPhase - FORE_LEFT_OPTIONS.pairPhase) * 180) / Math.PI
    expect(leadDeg).toBeCloseTo(90, 0)
  })
})
