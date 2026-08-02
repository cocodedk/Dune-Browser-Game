// vehicle-shop/harvester/src/model/beltPhase.ts
// COMPONENT 7a — where the belt's shape and its SCROLL are decided. Pure
// arithmetic: no three.js, no DOM, no canvas, so every claim below is pinned
// by beltPhase.test.ts in Vitest's node environment. belt.ts does nothing but
// read these numbers onto Object3Ds.
//
// THE LOOP, in the direction the belt travels at forward drive:
//   bottom run (+Z) -> rear wrap (up and over) -> top run (-Z) -> front wrap
//   (down and under) -> bottom run.
//
// THE SIGN. -Z is forward, so a real track's ground run stands still against
// the sand while the hull moves away from it: RELATIVE TO THE HULL the bottom
// run travels toward +Z at positive track speed. The wheels already turn that
// way (kinematics.wheelAngularSpeed returns -v/r, and positive rotation about
// +X carries the top of a wheel toward +Z), so belt and wheels agree.
//
// WHY THE PHASE IS A PAIR. The art direction asks for two different link
// densities — 29 links over a 41m straight run, 15 over an 11.5m wrap — so
// the belt is not one rigid chain and a single loop-wide modulus would not
// divide evenly into either segment. Each segment therefore carries its own
// phase, wrapped by its own span, both advanced by the SAME travelled
// distance. Consequences, all deliberate:
//   - every segment moves at exactly the track speed, so the bottom run is
//     ground-stationary and the wrap orbits at speed/radius — the same rate
//     the sprocket turns, which is what keeps lugs locked between teeth;
//   - links are handed over at the tangents rather than flowing through, one
//     at a time, at a fixed point. RUN_SPAN_START/END push that point half a
//     wrap-pitch INSIDE the wrap arc, where the wrap ribbon covers it, so the
//     handover happens under geometry instead of in open air. That overlap is
//     also the fix for the visible tangent gap.

import { TRACK } from '../spec'

/** How thick the belt is — the gap the sprocket sits above the ground. */
export const BELT_THICKNESS = TRACK.sprocketY - TRACK.sprocketRadius

/** Bottom-run link centre: half a plate above the sand, so its underside is
 *  y = 0 and the road wheels land on its top face. */
export const BOTTOM_RUN_Y = BELT_THICKNESS / 2

/** The radius the belt's CENTRELINE takes around a sprocket. Equal both to
 *  (sprocketY - BOTTOM_RUN_Y), so there is no step in y at the tangent, and
 *  to (sprocketRadius + BELT_THICKNESS/2), so the belt's inner face lands on
 *  the sprocket rim instead of cutting through it. */
export const WRAP_RADIUS = TRACK.sprocketY - BOTTOM_RUN_Y

/** Top-run link centre — the wrap's far side. */
export const TOP_RUN_Y = TRACK.sprocketY + WRAP_RADIUS

const TANGENT_FRONT = TRACK.sprocketZ[0]
const TANGENT_REAR = TRACK.sprocketZ[1]

/** Link counts come from spec.ts (TRACK.beltLinks) and are never redefined
 *  here — a density change is a spec change. */
export const STRAIGHT_COUNT = TRACK.beltLinks.straightPerRun
export const WRAP_COUNT = TRACK.beltLinks.wrapPerSprocket

export const WRAP_ARC = Math.PI * WRAP_RADIUS
export const WRAP_PITCH = WRAP_ARC / WRAP_COUNT
/** Wrap links are as long as their arc pitch: they touch, so the wrap reads
 *  as a continuous curve rather than a dotted arc. */
export const WRAP_LINK_LENGTH = WRAP_PITCH

/** Half a wrap-pitch of overlap at each tangent — see the header. */
const TANGENT_OVERLAP = WRAP_PITCH / 2
export const RUN_SPAN_START = TANGENT_FRONT - TANGENT_OVERLAP
export const RUN_SPAN_END = TANGENT_REAR + TANGENT_OVERLAP
export const RUN_SPAN = RUN_SPAN_END - RUN_SPAN_START
export const STRAIGHT_PITCH = RUN_SPAN / STRAIGHT_COUNT
/** Straight links keep a visible tread gap; the wrap links do not. */
export const LINK_GAP = 0.3
export const STRAIGHT_LINK_LENGTH = STRAIGHT_PITCH - LINK_GAP

/** Travelled distance along each segment, metres, wrapped into its span. */
export interface BeltPhase {
  run: number
  wrap: number
}

/** Always-positive remainder — JS `%` keeps the sign of the dividend, which
 *  would put reversing belts at negative positions. */
export function wrapMod(value: number, modulus: number): number {
  const r = value % modulus
  return r < 0 ? r + modulus : r
}

export function zeroBeltPhase(): BeltPhase {
  return { run: 0, wrap: 0 }
}

/** The whole animation, in one line each: both segments advance by the same
 *  travelled distance s*dt, each wrapped by its own span so neither drifts. */
export function advanceBeltPhase(phase: Readonly<BeltPhase>, speed: number, dt: number): BeltPhase {
  const travelled = speed * dt
  return {
    run: wrapMod(phase.run + travelled, RUN_SPAN),
    wrap: wrapMod(phase.wrap + travelled, WRAP_ARC),
  }
}

/** Bottom-run link `index`: rearward (+Z) as the phase grows. */
export function bottomRunZ(index: number, phase: Readonly<BeltPhase>): number {
  return RUN_SPAN_START + wrapMod(index * STRAIGHT_PITCH + phase.run, RUN_SPAN)
}

/** Top-run link `index`: the return leg, so forward (-Z) as the phase grows. */
export function topRunZ(index: number, phase: Readonly<BeltPhase>): number {
  return RUN_SPAN_END - wrapMod(index * STRAIGHT_PITCH + phase.run, RUN_SPAN)
}

export interface WrapPlacement {
  /** Radians from the sprocket's low point, measured toward the top run:
   *  -PI/2 at the bottom tangent, 0 at the belly, +PI/2 at the top. */
  angle: number
  y: number
  z: number
  /** rotation.x that lays the link's long (+Z) axis along the belt path. */
  rotX: number
}

/** Wrap link `index` around the sprocket at `sprocketZ`. `zSign` is +1 for the
 *  rear sprocket and -1 for the front: it points the arc's belly AWAY from
 *  the machine's centre (round 16 had this inverted and the wrap curved into
 *  the hull) and it flips the direction of travel, since the rear wrap
 *  carries links up out of the bottom run while the front wrap brings them
 *  back down into it. */
export function wrapPlacement(
  index: number,
  phase: Readonly<BeltPhase>,
  sprocketZ: number,
  zSign: 1 | -1,
): WrapPlacement {
  const travelled = wrapMod(index * WRAP_PITCH + phase.wrap, WRAP_ARC)
  const angle = zSign * (travelled / WRAP_RADIUS - Math.PI / 2)
  return {
    angle,
    y: TRACK.sprocketY + WRAP_RADIUS * Math.sin(angle),
    z: sprocketZ + zSign * WRAP_RADIUS * Math.cos(angle),
    // A box's long axis is local +Z, which rotation.x = t sends to
    // (-sin t, cos t) in (y, z). This is the value that makes that vector the
    // unit tangent of the curve above, in the direction of travel.
    rotX: -zSign * (angle + Math.PI / 2),
  }
}
