// vehicle-shop/ornihopter/src/sound/params.ts
// The craft's voice as PURE NUMBERS. (FlightState, camera) -> gains, filter
// cutoffs, envelope times and one per-stroke trigger. No AudioContext, no DOM,
// no three.js — which is the whole reason it is a separate layer: unit tests
// run in vitest's node environment, and everything that decides what the
// ornithopter sounds like has to be testable there. sound/graph.ts is the only
// module that touches Web Audio, and it does nothing but apply what this
// returns.

import { STROKE, BODY, ENGINE, CABIN, INPUT_LIMITS } from './tuning'
import { softKnee } from './softKnee'

const TWO_PI = Math.PI * 2

/** Structural match for camera/cameraRig.ts's CameraMode, restated here so the
 *  pure layer carries no three.js import. main.ts assigns rig.mode straight
 *  into it, so the two unions cannot drift without a compile error. */
export type SoundCamera = 'pilot' | 'chase' | 'orbit' | 'free'

/** The slice of FlightState the mix reads. FlightState satisfies it. */
export interface SoundFlight {
  throttle: number
  beatPhase: number
  beatHz: number
  beatAmplitude?: number
}

/** Frame-to-frame state. Small on purpose: everything else is a function of
 *  the current flight state, so there is nothing here that can go stale. */
export interface SoundClock {
  /** Previous frame's beatPhase — a wrap in this is one completed stroke. */
  lastPhase: number
  /** 0 fully outside .. 1 fully in the tub. Smoothed, so a camera cut becomes
   *  a crossfade instead of a step the filter would click on. */
  enclosure: number
}

export interface SoundParams {
  /** Fire the stroke envelope this frame. Exactly one per beat cycle. */
  strokeTrigger: boolean
  strokeGain: number
  /** Band-pass centre at the head of the burst, swept down to the end value. */
  strokeBandHz: number
  strokeBandEndHz: number
  strokeAttack: number
  strokeDecay: number
  bodyHz: number
  bodyGain: number
  bodyDecay: number
  engineGain: number
  engineHz: number
  engineLowpassHz: number
  whineGain: number
  whineHz: number
  bedGain: number
  cabinCutoffHz: number
  cabinGain: number
  enclosure: number
}

type NumericParam = Exclude<keyof SoundParams, 'strokeTrigger'>

/** The contract a graph may rely on: every number this module emits lands in
 *  its range, whatever the flight state does. paramBounds.test.ts checks both
 *  membership and these literals, so widening a clamp fails the suite. */
export const SOUND_BOUNDS: Record<NumericParam, readonly [number, number]> = {
  strokeGain: [0, STROKE.gainMax],
  strokeBandHz: [STROKE.bandLo, STROKE.bandHi],
  strokeBandEndHz: [STROKE.endLo, STROKE.endHi],
  strokeAttack: [STROKE.attackFull, STROKE.attackIdle],
  strokeDecay: [STROKE.decayMin, STROKE.decayMax],
  bodyHz: [BODY.hzMin, BODY.hzMax],
  bodyGain: [0, BODY.gainMax],
  bodyDecay: [BODY.decayMin, BODY.decayMax],
  engineGain: [0, ENGINE.gainMax],
  engineHz: [ENGINE.hzMin, ENGINE.hzMax],
  engineLowpassHz: [ENGINE.lowpassMin, ENGINE.lowpassMax],
  whineGain: [0, ENGINE.whineGainCap],
  whineHz: [ENGINE.hzMin * ENGINE.whineRatioMin, ENGINE.whineHzCap],
  bedGain: [0, ENGINE.bedGainMax],
  cabinCutoffHz: [CABIN.cockpitCutoffHz, CABIN.exteriorCutoffHz],
  cabinGain: [0, CABIN.exteriorGain],
  enclosure: [0, 1],
}

/** NaN-safe, same convention as flight/scalarMath.ts: bad input clamps low
 *  rather than propagating. A NaN reaching an AudioParam silently kills the
 *  node for the rest of the session, so this matters more here than there. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Interpolate a frequency the way hearing works — a musical glide, not a
 *  linear one, which is what keeps the cabin crossfade from lurching. */
function glide(a: number, b: number, t: number): number {
  return a * Math.pow(b / a, t)
}

function wrapPhase(phase: number): number {
  if (!Number.isFinite(phase)) return 0
  const wrapped = phase % TWO_PI
  return wrapped < 0 ? wrapped + TWO_PI : wrapped
}

/** Exponential approach; never overshoots, so the smoothed value stays in
 *  range for any dt. */
function approach(current: number, target: number, dt: number, tau: number): number {
  return current + (target - current) * (1 - Math.exp(-dt / tau))
}

export function createSoundClock(camera: SoundCamera): SoundClock {
  return { lastPhase: 0, enclosure: camera === 'pilot' ? 1 : 0 }
}

export function advanceSound(
  clock: SoundClock,
  flight: SoundFlight,
  camera: SoundCamera,
  dt: number
): { clock: SoundClock; params: SoundParams } {
  const step = clamp(dt, 0, INPUT_LIMITS.maxDt)
  const throttle = clamp(flight.throttle, 0, 1)
  const amplitude = clamp(flight.beatAmplitude ?? 1, 0, 1)
  const beatHz = clamp(flight.beatHz, 0, INPUT_LIMITS.maxBeatHz)
  const phase = wrapPhase(flight.beatPhase)

  // ONE stroke per completed cycle, detected as a wrap of the flight model's
  // own phase. Half a turn of guard, so frame jitter cannot double-fire and a
  // parked craft — whose phase simply stops — fires nothing at all.
  const strokeTrigger = clock.lastPhase - phase > Math.PI

  const enclosure = clamp(
    approach(clamp(clock.enclosure, 0, 1), camera === 'pilot' ? 1 : 0, step, CABIN.crossfadeTau),
    0,
    1
  )

  // The wing beat. Everything scales with beatAmplitude, so Round 10's
  // spool-down thins the beat away instead of cutting it off, and takeoff
  // brings it back the same way.
  const period = 1 / Math.max(beatHz, 0.5)
  const params: SoundParams = {
    strokeTrigger,
    strokeGain: clamp(amplitude * lerp(STROKE.gainMin, STROKE.gainMax, throttle), 0, STROKE.gainMax),
    strokeBandHz: clamp(lerp(STROKE.bandHi, STROKE.bandLo, throttle), STROKE.bandLo, STROKE.bandHi),
    strokeBandEndHz: clamp(lerp(STROKE.endHi, STROKE.endLo, throttle), STROKE.endLo, STROKE.endHi),
    strokeAttack: clamp(
      lerp(STROKE.attackIdle, STROKE.attackFull, throttle),
      STROKE.attackFull,
      STROKE.attackIdle
    ),
    strokeDecay: clamp(STROKE.decayShare * period, STROKE.decayMin, STROKE.decayMax),
    bodyHz: clamp(lerp(BODY.hzMin, BODY.hzMax, throttle), BODY.hzMin, BODY.hzMax),
    bodyGain: clamp(amplitude * lerp(BODY.gainMin, BODY.gainMax, throttle), 0, BODY.gainMax),
    bodyDecay: clamp(BODY.decayShare * period, BODY.decayMin, BODY.decayMax),
    ...engineParams(throttle),
    cabinCutoffHz: clamp(
      glide(CABIN.exteriorCutoffHz, CABIN.cockpitCutoffHz, enclosure),
      CABIN.cockpitCutoffHz,
      CABIN.exteriorCutoffHz
    ),
    cabinGain: clamp(lerp(CABIN.exteriorGain, CABIN.cockpitGain, enclosure), 0, CABIN.exteriorGain),
    enclosure,
  }

  return { clock: { lastPhase: phase, enclosure }, params }
}

/** The continuous layer. `run` is the shutdown gate: at throttle 0 the machine
 *  is OFF and every engine gain is exactly 0 (parked is silent, this round),
 *  while any running throttle sits at or above gainIdle so the turbine is
 *  always there under the beat. Both factors rise with throttle, so their
 *  product does too — the monotonicity the test asserts is structural. */
function engineParams(
  throttle: number
): Pick<SoundParams, 'engineGain' | 'engineHz' | 'engineLowpassHz' | 'whineGain' | 'whineHz' | 'bedGain'> {
  const run = clamp(throttle / ENGINE.runThrottle, 0, 1)
  const hz = lerp(ENGINE.hzMin, ENGINE.hzMax, throttle)
  const ratio = lerp(ENGINE.whineRatioMin, ENGINE.whineRatioMax, throttle)
  // Round 13b: soft-knee both toward a firm ceiling — tuning.ts explains why.
  const whineHz = softKnee(hz * ratio, ENGINE.whineHzKnee, ENGINE.whineHzCap)
  const whineGain = softKnee(lerp(ENGINE.whineGainMin, ENGINE.whineGainMax, throttle), ENGINE.whineGainKnee, ENGINE.whineGainCap)
  return {
    engineGain: clamp(run * lerp(ENGINE.gainIdle, ENGINE.gainMax, throttle), 0, ENGINE.gainMax),
    engineHz: clamp(hz, ENGINE.hzMin, ENGINE.hzMax),
    engineLowpassHz: clamp(
      lerp(ENGINE.lowpassMin, ENGINE.lowpassMax, throttle),
      ENGINE.lowpassMin,
      ENGINE.lowpassMax
    ),
    whineGain: clamp(run * whineGain, 0, ENGINE.whineGainCap),
    whineHz: clamp(whineHz, SOUND_BOUNDS.whineHz[0], SOUND_BOUNDS.whineHz[1]),
    bedGain: clamp(run * lerp(ENGINE.bedGainMin, ENGINE.bedGainMax, throttle), 0, ENGINE.bedGainMax),
  }
}
