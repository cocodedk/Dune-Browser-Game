// src/game-render/modes/flight/geometry/fuselageGeometry.ts
// The hull, nose and tailboom as ONE continuous lofted surface instead of a
// separate cylinder-plus-cone (stage 22 section 1.3: "the hull is radius
// 1.40 at the joint plane and the nose cone's base is 2.60" — an 86% flare
// where the two primitives met). A single revolved profile has no seam to
// mismatch by construction, and a 16-sided revolve at this scale does not
// show the "8-sided fuselage cylinder shows its facets in silhouette" defect
// section 1.5 measured either.
//
// Max diameter follows stage 22 section 2.2 exactly: 4.2u (radius 2.1,
// `HULL_MAX_RADIUS` below) — untouched since Round 1. Length no longer
// follows section 2.2's 26u figure: that table was written against an
// oversized wingspan the reference photo has since corrected (see
// FUSELAGE_LENGTH_SCALE below), and by eye a 26-28u body reads stubby next
// to wings that long. Trust the eye over the table for this one number.

import { LatheGeometry, Vector2, type BufferGeometry } from 'three'

const RADIAL_SEGMENTS = 16

/**
 * Round 4 correction: with the wingspan restored toward the reference photo
 * (.shots/reference/thopter-mr.jpg — long, straight wings, closer to this
 * craft's pre-round-3 span than round 3's halved one), the round-1 hull read
 * "stubby" — a hub with wings rather than an aircraft with a body. Applied
 * to the z (length) axis only, AFTER the hand-placed control points below,
 * so the taper shape those points describe is preserved exactly (an
 * aircraft "stretch": more hull, same nose/tail cone shape) and every
 * z-derived quantity (HULL_NOSE_Z, HULL_TAIL_Z, hullRadiusAt) scales with
 * it automatically. Every other part that anchors to a hull z-coordinate
 * (canopyGeometry.ts, tailGeometry.ts, nacelleGeometry.ts, skidGeometry.ts,
 * wingConfig.ts's wing attachments) applies this same constant to its own
 * anchor, so the whole silhouette stretches together rather than only the
 * bare hull. HULL_MAX_RADIUS is untouched — this is a length change only.
 */
export const FUSELAGE_LENGTH_SCALE = 1.5

/**
 * (z, radius) control points, nose (-z) to tail (+z), authored at the
 * original (pre-stretch) length. Hand-placed, not splined: a spline through
 * this many points risks overshoot (a bulge or pinch between points that
 * was never intended), while linear segments this close together already
 * read as smooth — see stage 22 section 2.6 on authoring specific forms
 * rather than emitting them from a formula.
 */
const HULL_PROFILE_BASE: ReadonlyArray<readonly [z: number, r: number]> = [
  [-13.5, 0.05], // nose tip
  [-12.6, 0.35],
  [-11.4, 0.75],
  [-9.8, 1.15],
  [-7.8, 1.55],
  [-5.5, 1.85],
  [-2.8, 2.05],
  [0.0, 2.1], // max radius — section 2.2's 4.2u diameter
  [2.6, 2.02],
  [5.2, 1.75],
  [7.6, 1.3],
  [9.8, 0.85],
  [11.6, 0.45],
  [13.0, 0.15],
  [13.6, 0.04], // tail cap
]

const HULL_PROFILE: ReadonlyArray<readonly [z: number, r: number]> = HULL_PROFILE_BASE.map(
  ([z, r]) => [z * FUSELAGE_LENGTH_SCALE, r] as const,
)

/** Fuselage radius at its widest — the hinge's contract with every wing root. */
export const HULL_MAX_RADIUS = Math.max(...HULL_PROFILE.map(([, r]) => r))

/** Nose tip and tail cap z, for parts that mount relative to the hull's own ends. */
export const HULL_NOSE_Z = HULL_PROFILE[0][0]
export const HULL_TAIL_Z = HULL_PROFILE[HULL_PROFILE.length - 1][0]

/** Hull radius at a given z, linearly interpolated between profile points. */
export function hullRadiusAt(z: number): number {
  if (z <= HULL_PROFILE[0][0]) return HULL_PROFILE[0][1]
  for (let i = 0; i < HULL_PROFILE.length - 1; i++) {
    const [z0, r0] = HULL_PROFILE[i]
    const [z1, r1] = HULL_PROFILE[i + 1]
    if (z >= z0 && z <= z1) {
      const t = z1 === z0 ? 0 : (z - z0) / (z1 - z0)
      return r0 + (r1 - r0) * t
    }
  }
  return HULL_PROFILE[HULL_PROFILE.length - 1][1]
}

/**
 * The fuselage, nose and tailboom as one revolve. `LatheGeometry` takes
 * (radius, height) points and revolves them around Y; `rotateX(PI/2)` then
 * maps that height directly onto world Z (see WingRig.ts and Ornithopter.ts
 * for the same "nose along -Z" convention), so the profile's own z values
 * above land exactly where authored, nose at negative Z.
 */
export function buildFuselageGeometry(): BufferGeometry {
  const points = HULL_PROFILE.map(([z, r]) => new Vector2(r, z))
  const geometry = new LatheGeometry(points, RADIAL_SEGMENTS)
  geometry.rotateX(Math.PI / 2)
  return geometry
}
