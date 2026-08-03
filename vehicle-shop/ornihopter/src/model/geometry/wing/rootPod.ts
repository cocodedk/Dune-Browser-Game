// vehicle-shop/ornihopter/src/model/geometry/wing/rootPod.ts
// The wing root's ball-joint housing: a static pod faired into the hull deck
// at each WING_ROOTS station, one per side (8 total) — see
// .shots/reference/kit-assembled.png, where a row of spherical ball housings
// sits along the dorsal deck, each blade reaching its ball through a narrow
// arm before the blade proper begins.
//
// This pod does NOT rotate with the wing (WingRig.ts's Fold/Flap/Feather):
// mechanically the ball half of a ball joint is fixed to whichever part it
// mounts to — here the fuselage. Ornithopter.ts adds these as plain static
// meshes, and also reads POST_HEIGHT / wingPivotAt to place the ROTATING
// wing's own attachment point at the ball's centre, not on the hull skin.
//
// Seating uses ONLY hullHalfWidthAt/hullHalfHeightAt/isOutsideHull
// (geometry/hullProfile.ts) — never a guessed (x, y). The previous
// attachment (spec.ts WING_ROOT_X at WING_ROOTS.y) sits OUTSIDE the hull's
// real faceted skin: at the full-beam chine x, the hexagon's only on-skin
// point is the chine vertex itself, well below that y — the exact gap a
// blind critic named "a black mounting plate that floats with a visible
// gap above the hull".

import { SphereGeometry, CylinderGeometry, type BufferGeometry } from 'three'
import { hullHalfWidthAt, hullHalfHeightAt, hullKeelYAt, isOutsideHull } from '../hullProfile'
import { WING_MAX_CHORD, type WingRootMount } from '../../../spec'

/** How far outboard the pod sits, as a fraction of the hull's own half-width
 *  at its station. Chosen comfortably inside the y=0 cross-section's own
 *  half-width at every WING_ROOTS station (rootPod.test.ts guards this
 *  assumption), so the bisection below always starts with a known-inside
 *  point rather than assuming the hull's exact facet layout. */
export const SEAT_X_FRACTION = 0.72

const BALL_RADIUS = WING_MAX_CHORD * 0.34
/** The ball sits proud of the hull skin on a short post, per kit-assembled.png —
 *  not flush-embedded. wingPivotAt is seatOnHull raised by this much. */
export const POST_HEIGHT = BALL_RADIUS * 0.85
const POST_RADIUS_TOP = BALL_RADIUS * 0.55
const POST_RADIUS_BOTTOM = BALL_RADIUS * 0.8

export interface Seat {
  x: number
  y: number
}

/**
 * Real hull-surface point at craft-local z, `xFraction` of the way from the
 * centreline to the hull's own half-width there. Bisects Y between the
 * centreline column (proven inside by hullProfile.test.ts's own "centreline
 * is always inside" case) and the hull's half-height (that ring's maximum Y
 * by construction — see hullCrossSection.ts's buildRing — so always
 * outside-or-on-skin) until it lands on the true faceted surface, flat deck
 * or sloped flank, whichever this x actually falls on.
 */
export function seatOnHull(z: number, xFraction: number = SEAT_X_FRACTION): Seat {
  const x = xFraction * hullHalfWidthAt(z)
  let inner = 0
  let outer = hullHalfHeightAt(z)
  // epsilon=0 here, deliberately tighter than isOutsideHull's own 1e-6
  // default: bisecting against that default would converge ONTO its
  // tolerance band rather than the true skin, leaving no margin for a
  // caller re-checking the result at that same default epsilon (measured:
  // it converged to outward distance -1.0000000147947219e-6, a hair past
  // -1e-6 from float rounding, and failed a `>= -1e-6` recheck by 1.5e-15).
  // Bisecting to the exact dist=0 crossing instead gives ~1e-12 precision
  // after 40 iterations — six orders of margin under any 1e-6-scale check.
  for (let i = 0; i < 40; i++) {
    const mid = (inner + outer) / 2
    if (isOutsideHull(x, mid, z, 0)) outer = mid
    else inner = mid
  }
  return { x, y: (inner + outer) / 2 }
}

/**
 * The mirror of seatOnHull for a FLANK arm: fix the height as a fraction of
 * the station's own half-height off its keel line, then bisect X out to the
 * skin. Round 6a needs both because the kit's transverse frames reach the hull
 * two different ways — the deck arms come up through the deck, where the
 * surface is a horizontal cap and only Y is unknown, and the flank arms come
 * out through the side, where the surface is a steep face and only X is.
 * Bisecting Y against a near-vertical flank (or X against a flat deck)
 * converges onto a nearly tangential crossing and is worth avoiding.
 */
export function seatOnFlank(z: number, yFraction: number): Seat {
  const y = hullKeelYAt(z) + yFraction * hullHalfHeightAt(z)
  let inner = 0
  let outer = hullHalfWidthAt(z)
  for (let i = 0; i < 40; i++) {
    const mid = (inner + outer) / 2
    if (isOutsideHull(mid, y, z, 0)) outer = mid
    else inner = mid
  }
  return { x: (inner + outer) / 2, y }
}

/** The hull-surface point for one spec.ts WING_ROOTS entry, whichever kind of
 *  arm it is. The single place that decision is made. */
export function seatForMount(mount: WingRootMount): Seat {
  return mount.arm === 'flank'
    ? seatOnFlank(mount.z, mount.seatFraction)
    : seatOnHull(mount.z, mount.seatFraction)
}

/** The ball's centre — and the wing's actual mechanical pivot — standing off
 *  the hull skin by POST_HEIGHT. Ornithopter.ts uses this same point for
 *  createWingRig's attachment, so the rotating arm always reaches exactly
 *  into the static ball, at every station. A deck arm's post rises; a flank
 *  arm's stands outboard, which is the direction its own skin faces. */
export function pivotForMount(mount: WingRootMount): Seat {
  const seat = seatForMount(mount)
  return mount.arm === 'flank'
    ? { x: seat.x + POST_HEIGHT, y: seat.y }
    : { x: seat.x, y: seat.y + POST_HEIGHT }
}

/** Deck-arm pivot by station, retained for callers that only have a z. */
export function wingPivotAt(z: number, xFraction: number = SEAT_X_FRACTION): Seat {
  const seat = seatOnHull(z, xFraction)
  return { x: seat.x, y: seat.y + POST_HEIGHT }
}

export interface RootPodGeometries {
  ball: BufferGeometry
  post: BufferGeometry
}

/** One shared ball + one shared post, reused via per-instance transform
 *  across all eight mount stations: the pods are geometrically identical,
 *  station to station. The landing gear cannot do the same — each of its
 *  six legs has its own length, rake and splay (gear/stance.ts), so
 *  gearGeometry.ts bakes six unique shapes into one mesh instead of sharing
 *  one. Post flares wider at its base, fairing into the broader hull
 *  surface it stands on; ball is centred on wingPivotAt, post's own local
 *  y=0 is its BASE so positioning it at seatOnHull sits that base flush on
 *  the hull skin with the post rising to meet the ball. */
export function buildRootPodGeometries(): RootPodGeometries {
  const ball = new SphereGeometry(BALL_RADIUS, 10, 7)
  const post = new CylinderGeometry(POST_RADIUS_TOP, POST_RADIUS_BOTTOM, POST_HEIGHT, 10)
  post.translate(0, POST_HEIGHT / 2, 0)
  return { ball, post }
}
