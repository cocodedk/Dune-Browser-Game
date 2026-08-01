// vehicle-shop/ornihopter/src/model/geometry/chordProfile.ts
// Pure interpolation of spec.ts WING.chordProfile — the kit-measured
// planform (near-constant chord over the middle 60% of span, tapering only
// near the tip; see spec.ts PROVENANCE.wingPlanform). Kept separate from
// wingGeometry.ts (which needs three.js for the actual mesh) so this stays
// testable with no BufferGeometry involved at all.

import { WING, WING_MAX_CHORD } from '../../spec'

const STATIONS = WING.chordProfile.length // 20, root (0) to tip (1)

/**
 * Normalised chord (spec.ts units, 0..~1) at `spanFraction` (0 root, 1 tip),
 * linearly interpolated between the 20 measured stations. Piecewise-linear
 * between authored points, never a re-fit curve — the instruction is to
 * interpolate the measured array, not approximate it with a new shape.
 */
export function chordFractionAt(spanFraction: number): number {
  const clamped = Math.max(0, Math.min(1, spanFraction))
  const position = clamped * (STATIONS - 1)
  const index = Math.floor(position)
  if (index >= STATIONS - 1) return WING.chordProfile[STATIONS - 1]
  const t = position - index
  const a = WING.chordProfile[index]
  const b = WING.chordProfile[index + 1]
  return a + (b - a) * t
}

/** Full chord width in metres at `spanFraction`, scaled by the kit's measured max chord. */
export function chordWidthAt(spanFraction: number): number {
  return chordFractionAt(spanFraction) * WING_MAX_CHORD
}
