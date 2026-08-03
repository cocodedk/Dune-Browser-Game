// vehicle-shop/ornihopter/src/flight/wingFold.ts
// The wing-fold state machine, pure: fold progress as a function of the
// previous FlightState, this frame's demand and dt. It has no clock and no
// memory of its own — everything it needs to know arrives in `previous`,
// exactly as landing.ts's groundPhase does, so the whole stow lifecycle is a
// function of published contract state and can be stepped in a unit test
// without a keyboard, a renderer or a real second.
//
// TWO NUMBERS, not one. `foldPhase` is the LINEAR clock, 0..1, advanced by
// dt/FOLD_SECONDS; `foldProgress` is the eased pose parameter the rig and the
// HUD read. They have to be separate because the state IS the memory: easing
// is not invertible in floating point, so a stored eased value could not be
// stepped forward without drifting off the endpoints, and "unfold returns to
// EXACTLY the spread pose" is a bit-equality claim (wingFold.test.ts).
//
// THE GATE. Folding is a ground operation: it is refused unless the craft is
// resting on its gear with the wing drive fully stopped. A demand that arrives
// airborne, or while the beat is still spooling down, changes nothing at all
// and comes back marked `foldRefused` so the HUD can say why — as opposed to
// being remembered and acted on later, which would fold the wings by surprise
// at some future touchdown.

import type { FlightState, FlightInput } from '../contracts'
import { FOLD_SECONDS } from './constants'
import { clamp01 } from './scalarMath'

export interface FoldPhase {
  foldPhase: number
  foldProgress: number
  foldTarget: number
  foldRefused: boolean
}

/**
 * Smoothstep. Zero slope at both ends, so the blades ease out of the spread
 * stance and settle into the stack instead of starting and stopping at full
 * rate — the difference between a mechanism and a light switch.
 */
export function easeFold(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

/** True when the craft may be folded or unfolded: feet on the sand, wing
 *  drive stopped. Exported because the HUD hint answers the same question. */
export function foldAllowed(state: Readonly<FlightState>): boolean {
  return state.landed === true && (state.beatAmplitude ?? 1) <= 0
}

/** Is any part of the wing off its spread stance? Consumed by landing.ts,
 *  which refuses to spool up for takeoff while it is true. */
export function wingsStowed(state: Readonly<FlightState>): boolean {
  return (state.foldPhase ?? 0) > 0
}

/**
 * Advance the fold by one step.
 *
 * `input.foldToggle` is an EDGE — true only on the frame the key went down —
 * so a refused demand is genuinely dropped rather than latched. The target it
 * flips is what the phase then walks toward at a constant rate, which is why
 * pressing the key mid-transition reverses cleanly instead of restarting.
 */
export function nextFold(
  previous: Readonly<FlightState>,
  input: FlightInput,
  dt: number
): FoldPhase {
  const phase = clamp01(previous.foldPhase ?? 0)
  let target = previous.foldTarget ?? 0
  let refused = false

  if (input.foldToggle === true) {
    if (foldAllowed(previous)) target = target > 0 ? 0 : 1
    else refused = true
  }

  const step = dt / FOLD_SECONDS
  const next = target > phase ? Math.min(target, phase + step) : Math.max(target, phase - step)
  return {
    foldPhase: next,
    foldProgress: easeFold(next),
    foldTarget: target,
    foldRefused: refused,
  }
}
