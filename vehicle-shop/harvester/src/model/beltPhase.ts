// vehicle-shop/harvester/src/model/beltPhase.ts
// COMPONENT 7a — where the belt's shape and its SCROLL are decided. Pure
// arithmetic: no three.js, no DOM, no canvas, so every claim below is pinned
// by beltPhase.test.ts in Vitest's node environment. belt.ts does nothing but
// read these numbers onto Object3Ds.
//
// ONE CHAIN, ONE LINK. Pass 1 gave the wrap its own denser links, and the
// size step at each tangent was the thing a critic saw first. Now the belt is
// a single closed chain of IDENTICAL plates at ONE pitch, and the loop is
// parameterised by a single arc-length coordinate u: a link does not belong
// to a run or to a wrap, it FLOWS through them. There is no handover left to
// hide, because nothing is handed over.
//
// THE LOOP, in the direction the belt travels at forward drive:
//   u = 0        bottom run starts at the front tangent, running +Z
//   u = S        rear wrap, up and over the rear sprocket
//   u = S+A      top run, running -Z
//   u = 2S+A     front wrap, down and under, back to u = 0
//
// THE SIGN. -Z is forward, so a real track's ground run stands still against
// the sand while the hull moves away from it: RELATIVE TO THE HULL the bottom
// run travels toward +Z at positive track speed. The wheels already turn that
// way (kinematics.wheelAngularSpeed returns -v/r, and positive rotation about
// +X carries the top of a wheel toward +Z), so belt and wheels agree.
//
// WHAT THE SPEC COUNTS MEAN NOW. TRACK.beltLinks gives 29 per straight run
// and 8 per wrap: their SUM (74) is the chain's link count, exact, and each
// count is what its own segment holds to within a fraction of a link. The
// pitch is the loop divided by that total, so a spec change still moves the
// density and nothing here is a local magic number.

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

export const TANGENT_FRONT = TRACK.sprocketZ[0]
export const TANGENT_REAR = TRACK.sprocketZ[1]

/** Nominal per-segment counts, from spec.ts — never redefined here. */
export const STRAIGHT_COUNT = TRACK.beltLinks.straightPerRun
export const WRAP_COUNT = TRACK.beltLinks.wrapPerSprocket
/** The chain's link count. Exact; the per-segment counts are nominal. */
export const LINK_COUNT = 2 * STRAIGHT_COUNT + 2 * WRAP_COUNT

export const STRAIGHT_SPAN = TANGENT_REAR - TANGENT_FRONT
export const WRAP_ARC = Math.PI * WRAP_RADIUS
export const LOOP_LENGTH = 2 * STRAIGHT_SPAN + 2 * WRAP_ARC

/** ONE pitch for the whole loop — this is what makes the rhythm continuous
 *  through the tangents. */
export const LINK_PITCH = LOOP_LENGTH / LINK_COUNT
/** The tread gap between plates; on a wrap it opens at the outer face and
 *  closes at the inner one, exactly as a real track's plates fan. */
export const LINK_GAP = 0.3
export const LINK_LENGTH = LINK_PITCH - LINK_GAP
/** Angle subtended by one pitch on a wrap. */
export const WRAP_LINK_ANGLE = LINK_PITCH / WRAP_RADIUS

const U_BOTTOM_END = STRAIGHT_SPAN
const U_REAR_END = STRAIGHT_SPAN + WRAP_ARC
const U_TOP_END = 2 * STRAIGHT_SPAN + WRAP_ARC

/** Always-positive remainder — JS `%` keeps the sign of the dividend, which
 *  would put reversing belts at negative positions. */
export function wrapMod(value: number, modulus: number): number {
  const r = value % modulus
  return r < 0 ? r + modulus : r
}

/** The whole animation, in one line: the chain advances by the distance the
 *  track travelled, wrapped modulo the loop. Because LINK_COUNT * LINK_PITCH
 *  is exactly LOOP_LENGTH, a link crossing u = 0 lands exactly where its
 *  predecessor was, so the wrap-around is invisible by construction. */
export function advanceBeltPhase(phase: number, speed: number, dt: number): number {
  return wrapMod(phase + speed * dt, LOOP_LENGTH)
}

/** Where link `index` sits along the loop, in metres of arc. */
export function linkLoopPosition(index: number, phase: number): number {
  return wrapMod(index * LINK_PITCH + phase, LOOP_LENGTH)
}

export interface LinkPlacement {
  y: number
  z: number
  /** rotation.x that lays the link's long (+Z) axis along the belt path. A
   *  box's long axis is local +Z, which rotation.x = t sends to
   *  (-sin t, cos t) in (y, z); these values make that the path's tangent.
   *  It decreases monotonically around the loop — one full turn per lap. */
  rotX: number
}

/** The one placement function: loop coordinate in, transform out. Continuous
 *  in position AND rotation at all four tangents, which is what removes the
 *  gap the old two-density scheme left there. */
export function placeAlongLoop(u: number): LinkPlacement {
  if (u < U_BOTTOM_END) {
    return { y: BOTTOM_RUN_Y, z: TANGENT_FRONT + u, rotX: 0 }
  }
  if (u < U_REAR_END) {
    // Rear wrap: bellies toward the TAIL (round 16 had this inverted and the
    // wrap curved into the hull), carrying links up out of the bottom run.
    const t = u - U_BOTTOM_END
    const angle = t / WRAP_RADIUS - Math.PI / 2
    return {
      y: TRACK.sprocketY + WRAP_RADIUS * Math.sin(angle),
      z: TANGENT_REAR + WRAP_RADIUS * Math.cos(angle),
      rotX: -t / WRAP_RADIUS,
    }
  }
  if (u < U_TOP_END) {
    return { y: TOP_RUN_Y, z: TANGENT_REAR - (u - U_REAR_END), rotX: -Math.PI }
  }
  // Front wrap: bellies toward the NOSE, bringing links back down.
  const t = u - U_TOP_END
  const angle = Math.PI / 2 - t / WRAP_RADIUS
  return {
    y: TRACK.sprocketY + WRAP_RADIUS * Math.sin(angle),
    z: TANGENT_FRONT - WRAP_RADIUS * Math.cos(angle),
    rotX: -Math.PI - t / WRAP_RADIUS,
  }
}

/** True where the loop coordinate is on one of the two wrap arcs. */
export function isOnWrap(u: number): boolean {
  return (u >= U_BOTTOM_END && u < U_REAR_END) || u >= U_TOP_END
}
