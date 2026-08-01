// vehicle-shop/ornihopter/src/model/geometry/hullProfile.ts
// Pure hull cross-section envelope. No three.js — the wing-clearance tests
// and the actual Lathe-based mesh builder (./hullGeometry.ts) both read this
// same profile, so the rendered surface and "does a wing clip the hull"
// check can never disagree.
//
// The profile is authored as (metresAft, halfWidth) control points, widening
// fast just aft of the nose tip: COCKPIT.clearWidth/clearHeight (spec.ts)
// need most of the hull's full beam within about 2m of the nose, well before
// COCKPIT.consoleZ. It then holds a constant-width "shoulder" plateau across
// every WING_ROOTS station (7.4m-12.2m aft) so WING_ROOT_X sits exactly at
// (never inside) the hull skin there, before tapering through the tail to a
// fine point — the long, slender abdomen the reference photographs show
// (.shots/reference/thopter-mr.jpg, mr-O4copy.jpg).
//
// Height is a fixed aspect ratio of width (bodyHeight / bodyWidth) rather
// than a second authored curve — one elliptical cross-section is the
// "simple form" this round asks for; see Ornithopter.ts's header.

import { OVERALL, HALF_LENGTH } from '../../spec'

const HEIGHT_OVER_WIDTH = OVERALL.bodyHeight / OVERALL.bodyWidth
const HALF_WIDTH = OVERALL.bodyWidth / 2

/** (metresAft, halfWidth) control points, nose (0) to tail (OVERALL.length). */
const PROFILE: ReadonlyArray<readonly [metresAft: number, halfWidth: number]> = [
  [0, 0.06],
  [0.6, HALF_WIDTH * 0.63],
  [1.4, HALF_WIDTH * 0.9],
  [2.2, HALF_WIDTH], // full beam well before COCKPIT.consoleZ (station 2.1)
  [12.2, HALF_WIDTH], // holds through every WING_ROOTS station (7.4-12.2)
  [15.0, HALF_WIDTH * 0.93], // BODY.cockpitLength + cabinLength: cabin ends
  [18.0, HALF_WIDTH * 0.56],
  [21.0, HALF_WIDTH * 0.19],
  [OVERALL.length, 0.05],
]

/** Craft-local z (spec.ts's -Z-forward frame) for every control point above. */
export const HULL_PROFILE_Z: readonly number[] = PROFILE.map(([metresAft]) => metresAft - HALF_LENGTH)

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function halfWidthAtMetresAft(metresAft: number): number {
  if (metresAft <= PROFILE[0][0]) return PROFILE[0][1]
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [a0, w0] = PROFILE[i]
    const [a1, w1] = PROFILE[i + 1]
    if (metresAft >= a0 && metresAft <= a1) {
      const t = a1 === a0 ? 0 : (metresAft - a0) / (a1 - a0)
      return lerp(w0, w1, t)
    }
  }
  return PROFILE[PROFILE.length - 1][1]
}

/** Hull half-width (local X extent) at craft-local z. */
export function hullHalfWidthAt(z: number): number {
  return halfWidthAtMetresAft(z + HALF_LENGTH)
}

/** Hull half-height (local Y extent) at craft-local z — a fixed aspect ratio of width. */
export function hullHalfHeightAt(z: number): number {
  return hullHalfWidthAt(z) * HEIGHT_OVER_WIDTH
}

/**
 * True if (x, y) at craft-local z lies outside (or exactly on) the hull's
 * elliptical skin at that station. Used both by the wing-clearance tests and
 * available for any part that wants to mount flush with the actual surface.
 */
export function isOutsideHull(x: number, y: number, z: number, epsilon = 1e-6): boolean {
  const a = hullHalfWidthAt(z)
  const b = hullHalfHeightAt(z)
  if (a <= 0 || b <= 0) return true
  return (x / a) ** 2 + (y / b) ** 2 >= 1 - epsilon
}
