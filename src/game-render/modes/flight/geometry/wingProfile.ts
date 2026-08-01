// src/game-render/modes/flight/geometry/wingProfile.ts
// PURE cross-section maths for the wing membrane. No three.js.
//
// Stage 22 section 2.5: "dragonfly wings are corrugated, and the pleats trap
// vortices so the section behaves like a cambered aerofoil... A faceted,
// pleated wing surface is correct — it is not a low-poly compromise." This is
// a fixed, deterministic corrugation formula (a named pleat count and a named
// envelope shape) rather than randomised detail — see section 2.6's warning
// about Star Citizen's rejected procedural greebling. Every input here is an
// authored constant, not a random seed.
//
// Anisotropic stiffness (section 2.5): spanwise stiffness exceeds chordwise
// by 1-2 orders of magnitude, falling from base to tip and from leading to
// trailing edge. That is `thicknessEnvelopeAtSpan` (falls root-to-tip) and
// `chordEnvelope` (falls leading-to-trailing) below.

/** Number of corrugation folds across the chord. Fixed, not tunable per call. */
const PLEAT_COUNT = 4

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Deterministic zigzag in [-1, 1] across the chord, `PLEAT_COUNT` folds wide.
 * A true corrugation (Herbert's "lapped coverts", the dragonfly's pleated
 * section) rather than a smooth camber, per section 2.5.
 */
export function corrugation(chordFraction: number): number {
  const wave = chordFraction * PLEAT_COUNT
  const frac = wave - Math.floor(wave)
  return frac < 0.5 ? 4 * frac - 1 : 3 - 4 * frac
}

/**
 * Pleat amplitude envelope across the chord: full near the leading-edge spar,
 * fading toward a thin, near-flat trailing edge — chordwise stiffness falls
 * off aft of the spar (section 2.5), and a thin trailing edge is also what
 * lets it flutter (section 2.3's secondary motion).
 */
export function chordEnvelope(chordFraction: number): number {
  return Math.pow(Math.max(0, 1 - chordFraction), 0.6)
}

/**
 * Overall pleat-amplitude envelope along the span: falls from root to tip.
 * Spec: "falling exponentially from base to tip" (section 2.5). `exponent`
 * defaults to a value chosen so the tip still shows a little relief rather
 * than going perfectly flat.
 */
export function thicknessEnvelopeAtSpan(spanFraction: number, exponent = 1.3): number {
  return Math.pow(Math.max(0, 1 - spanFraction), exponent)
}

/** Linear taper for chord width and spar radius: root value to tip value. */
export function taper(spanFraction: number, rootValue: number, tipValue: number): number {
  return lerp(rootValue, tipValue, Math.max(0, Math.min(1, spanFraction)))
}

export interface WingSectionSample {
  /** Thickness (pleat) offset, local Y. */
  y: number
  /** Chordwise depth from the spar centreline, local Z. Always >= 0. */
  z: number
}

/**
 * This round's critic finding: the membrane's chordwise extent (leading
 * edge to trailing edge) was built entirely along local Z — the fuselage's
 * own fore-aft axis. The chase camera (FlightPath.ts's chaseCameraAt) sits
 * behind the craft looking almost straight down that same axis, so most of
 * the chord foreshortened to a sliver no matter how wide it actually was —
 * "near-zero-chord blades... needle tips" was a camera-alignment artefact,
 * not (only) a modelling one.
 *
 * Real angle of attack is measured from the flap-relative wind, which at
 * mid-stroke (peak angular velocity, also where the trapezoid HOLDS its AoA
 * plateau — wingCycle.ts) points along local Y, because flap is a rotation
 * about local Z (WingRig.ts). A chord resting along Z was therefore ~90
 * degrees from the axis the feather twist (also WingRig.ts, also a rotation
 * about the span/X axis) actually measures AoA from.
 *
 * WING_CHORD_TILT leans the chord's rest direction from Z toward (and
 * slightly past) Y, so that after the dynamic 20-50 degree feather twist is
 * applied on top of it, most of the chord's magnitude lands in Y/X — visible
 * to an aft-looking camera — at both held AoA values, not just one.
 */
export const WING_CHORD_TILT = (100 * Math.PI) / 180

/**
 * Applies that tilt to one cross-section sample, scaled by chordFraction so
 * it is exactly zero at the spar (chordFraction 0) and full at the trailing
 * edge. Zero at the spar is load-bearing, not cosmetic: the hinge invariant
 * (Ornithopter.test.ts) measures the membrane vertex nearest the spar at the
 * root span station, and tiltChordSection(section, 0) is the identity
 * transform for ANY section — so that vertex lands in exactly the same place
 * this function produces as it did before this function existed, for every
 * span fraction and every beat phase.
 */
export function tiltChordSection(section: WingSectionSample, chordFraction: number): WingSectionSample {
  const tilt = WING_CHORD_TILT * Math.max(0, Math.min(1, chordFraction))
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  return { y: section.y * cos - section.z * sin, z: section.y * sin + section.z * cos }
}

/**
 * Fades the pleat amplitude to zero over a short span right at the root
 * (fully back by `ROOT_BLEND_FRACTION`). Two reasons, not one: a real wing
 * root is reinforced ahead of where the corrugation pattern actually starts,
 * and — the constraint that actually sized this — WingRig.ts's hinge
 * invariant (Ornithopter.test.ts) measures how far the root ring sits from
 * the hinge axis. An un-blended pleat put that ring's nearest-to-origin
 * point over 0.8 units out (corrugation near its full swing right at x=0);
 * blending it to a flat disc at the root keeps that point pinned to
 * approximately the spar's own radius instead.
 */
const ROOT_BLEND_FRACTION = 0.08

function rootBlend(spanFraction: number): number {
  return Math.min(1, spanFraction / ROOT_BLEND_FRACTION)
}

/**
 * One point on the membrane surface at (spanFraction, chordFraction).
 * `chordFraction` 0 sits just aft of the spar, 1 is the trailing edge.
 * `sparRadius`/`chordWidth` are this span station's own taper values (see
 * `taper` above) so the membrane starts flush with the spar's own surface
 * rather than floating off it or burying inside it.
 */
export function wingSectionAt(
  spanFraction: number,
  chordFraction: number,
  sparRadius: number,
  chordWidth: number,
  rootThickness: number,
): WingSectionSample {
  const start = sparRadius * 1.15
  const z = start + chordFraction * Math.max(0, chordWidth - start)
  const amplitude = rootThickness * thicknessEnvelopeAtSpan(spanFraction)
    * chordEnvelope(chordFraction) * rootBlend(spanFraction)
  const y = corrugation(chordFraction) * amplitude
  return { y, z }
}
