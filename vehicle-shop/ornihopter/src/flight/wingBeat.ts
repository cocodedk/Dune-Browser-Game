// vehicle-shop/ornihopter/src/flight/wingBeat.ts
// Wing beat phase and frequency. Owned here, not by the geometry, so the
// wing rig and the dynamics read the exact same numbers and cannot drift
// apart. beatHz is a straight linear rise with throttle between the two
// bounds the bar sets; beatPhase accumulates and wraps to [0, 2*PI).

import { BEAT_HZ_MIN, BEAT_HZ_MAX, TWO_PI } from './constants'

export interface Beat {
  beatPhase: number
  beatHz: number
}

export function beatHzFor(throttle: number): number {
  return BEAT_HZ_MIN + (BEAT_HZ_MAX - BEAT_HZ_MIN) * throttle
}

/**
 * @param spool 0..1 wing-drive spool (FlightState.beatAmplitude). 1 in flight,
 * so beatHz there is exactly beatHzFor(throttle) and BEAT_HZ_MIN remains the
 * floor it always was. A parked craft winds this to 0, and the frequency goes
 * with it — the phase then advances by 0 and simply stops where it stood,
 * which is what makes the wings settle rather than snap.
 */
export function nextBeat(beatPhase: number, throttle: number, dt: number, spool = 1): Beat {
  const beatHz = beatHzFor(throttle) * spool
  const wrapped = (beatPhase + beatHz * TWO_PI * dt) % TWO_PI
  return { beatPhase: wrapped < 0 ? wrapped + TWO_PI : wrapped, beatHz }
}
