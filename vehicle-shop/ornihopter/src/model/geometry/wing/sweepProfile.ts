// vehicle-shop/ornihopter/src/model/geometry/wing/sweepProfile.ts
// Pure interpolation of spec.ts WING.sweepProfile — the kit-measured bow of
// the blade's own centreline off the plate's mid-line (see
// docs/profiles/wing-planform.json's `offset` field: tools/plate-to-outline.mjs
// derives it as each station's (upper+lower)/2, relative to the plate's own
// mean, so it is a literal chordwise shift of the centreline, not a taper).
// Structured exactly like chordProfile.ts: piecewise-linear between the 20
// measured stations, never a re-fit curve.
//
// The measured curve is honoured everywhere EXCEPT a short run-in right at
// the mechanical root (ROOT_COLLAR_FRACTION of the span), forced to zero and
// blended smoothly up to the true measured value. That collar is not an
// invented taper: wingRootAttachment.test.ts pins the root ring's LOCAL
// centroid to (0,0,0) — the hull attachment point — to 1e-6 across every beat
// phase, which is only possible if that ring is symmetric about the pivot.
// A real ball-joint eye is exactly that, mechanically, regardless of how the
// arm beyond it sweeps: this collar models the eye, not the plate. See
// wingGeometry.ts's buildCrossSection for where rootBlendAt is reused so
// camber zeroes out at the identical station.

import { WING, WING_MAX_CHORD } from '../../../spec'

const STATIONS = WING.sweepProfile.length // 20, same stations as chordProfile

/** Fraction of the span over which the root-collar blend runs. Comfortably
 *  inside WING.rootArmFraction (0.17), so the true measured bow governs
 *  almost the entire arm — this only touches the last ~3% of it, right at
 *  the ball. */
const ROOT_COLLAR_FRACTION = WING.rootArmFraction * 0.2

/** Smooth 0..1 ease, zero slope at both ends (Hermite smoothstep). */
function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/**
 * Normalised centreline offset (spec.ts units, fraction of max chord) at
 * `spanFraction`, linearly interpolated between the 20 measured stations —
 * mirrors chordProfile.ts's chordFractionAt exactly, including its clamp.
 */
export function sweepFractionAt(spanFraction: number): number {
  const clamped = Math.max(0, Math.min(1, spanFraction))
  const position = clamped * (STATIONS - 1)
  const index = Math.floor(position)
  if (index >= STATIONS - 1) return WING.sweepProfile[STATIONS - 1]
  const t = position - index
  const a = WING.sweepProfile[index]
  const b = WING.sweepProfile[index + 1]
  return a + (b - a) * t
}

/**
 * 0 at the very root, rising smoothly to exactly 1 by ROOT_COLLAR_FRACTION
 * and staying there. wingGeometry.ts reuses this same blend for camber, so
 * both effects zero out together at the one ring the hinge invariant needs
 * symmetric.
 */
export function rootBlendAt(spanFraction: number): number {
  return smoothstep(spanFraction / ROOT_COLLAR_FRACTION)
}

/**
 * Full centreline offset in metres at `spanFraction`, scaled by the kit's
 * measured max chord (PROVENANCE.wingPlanform), and blended to exactly zero
 * at the pivot ring (see header). Past the collar this is the measured curve,
 * negated once — the sign mapping to craft z, not the plate reading itself
 * (sweepFractionAt above stays a pure, un-negated readout, matching its own
 * test's pin to spec.ts's PROVENANCE numbers).
 *
 * The user's rule, their words: a wing is a knife, dull spine forward,
 * sharp curved cutting edge aft. LEAD measurement off
 * docs/profiles/wing-planform.json: the upper plate edge (offset+chord/2)
 * has stdev 0.0099 over mid-span — the straight spine — the lower edge
 * (offset-chord/2) has stdev 0.1912 — the curved knife. section.ts's chord
 * spread puts the rail (spine) at this station's -z and the knife at +z
 * unconditionally (see its header); left un-negated here, that put the
 * straight spine's own measured curve on the AFT edge of the assembled wing
 * and the curved knife's on the NOSE edge — backwards. Negating here swaps
 * which measured curve rides which edge without touching section.ts's local
 * rail/knife assignment. See wingChordHandedness.test.ts for the proof.
 *
 * Guarded against -0 at the root ring, where `measured` is exactly zero (a
 * genuine +0, since rootBlendAt(0) is +0) and a bare unary negation would
 * flip its sign bit: sweepOffsetAt(0) must stay Object.is-equal to +0 for
 * this file's own test and wingRootAttachment.test.ts's hinge invariant.
 */
export function sweepOffsetAt(spanFraction: number): number {
  const measured = rootBlendAt(spanFraction) * sweepFractionAt(spanFraction) * WING_MAX_CHORD
  return measured === 0 ? 0 : -measured
}
