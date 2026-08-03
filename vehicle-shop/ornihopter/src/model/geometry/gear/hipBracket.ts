// vehicle-shop/ornihopter/src/model/geometry/gear/hipBracket.ts
// The castellated locking loop where a leg meets the hull.
//
// WHAT THIS REPLACES: a plain tapered boss, one swept plate poking out of the
// flank. docs/profiles/kit-dossier.md §a measured the real part off
// `Gear_left.stl` and it is nothing like that — the fuselage end of the leg is
// "a hollow rectangular loop with a castellated/notched edge, i.e. a
// multi-position locking joint". §e finds the same idiom a second time, on the
// hull panels themselves ("snap gear" is a gear-TOOTHED locking feature, not a
// second landing-gear system), so notched brackets are this craft's house
// language for a joint that locks, not a one-off on the leg plate.
//
// It is also the part that lets ONE bracket serve TWO struts. The loop spans
// from the main strut's anchor to the brace strut's anchor (stance.ts's
// hipSkin and braceHipSkin) and overhangs each by `overhang`, so both bars
// pass out through it and the void between them is the loop's own window.
// That is why the loop is elongated rather than square: it is a spreader as
// well as a collar.
//
// FRAME. u runs along the flank from one anchor to the other, n is the flank's
// outward normal at the hip, v = n x u is "up and down the flank" — forced to
// point up so the loop's own ±v symmetry does not depend on which way a given
// leg happens to rake. The loop hangs `drop` below the anchor line for one
// measured reason: at the 11.4m station the hip seat is only 0.527m below the
// chine, and stance.test.ts's chine bar is what keeps the gear out of the
// wings' arc. Dropping the loop puts the upper crenel tips 0.18m clear there
// instead of 0.11m.

import { pushSegment, type MeshBuffers, type Section, type Vec3 } from './plate'
import type { GearLeg } from './stance'
import { cross, distance, midpoint, towards, unit, vec, walk } from './vec'

export const HIP_BRACKET = {
  /** How far the loop stands proud of the chord between its two anchors.
   *  0.18 is enough for the loop to throw its own shadow line onto the flank
   *  at the shot tool's framing; at 0.13 it read as a decal. */
  proud: 0.18,
  /** Rail centreline offset from the loop's long axis. */
  halfWidth: 0.25,
  /** How far the loop runs PAST each strut root, along the flank. */
  overhang: 0.24,
  railHalfBreadth: 0.1,
  railHalfThick: 0.13,
  /** How far the loop sits below the line joining its two anchors. */
  drop: 0.07,
  /** Teeth standing proud of the rim — two per rail, four per leg. */
  crenels: 4,
  crenelProud: 0.26,
  crenelHalfLong: 0.14,
  crenelHalfThick: 0.115,
  /** Where along the loop a tooth sits, as a fraction of the half-length. */
  crenelAt: 0.52,
} as const

export interface BracketFrame {
  readonly origin: Vec3
  /** Along the flank, from the main strut's anchor toward the brace's. */
  readonly u: Vec3
  /** Across the flank, forced to point up. */
  readonly v: Vec3
  /** Out of the flank. */
  readonly n: Vec3
  readonly halfLength: number
}

/** Exported so anatomy.test.ts can project the finished mesh into the same
 *  frame the builder used and COUNT the teeth, rather than trusting that the
 *  loop in this file is the loop in the buffer. */
export function bracketFrame(leg: GearLeg): BracketFrame {
  const skin = vec(leg.hipSkin)
  const brace = vec(leg.braceHipSkin)
  const n = towards(vec(leg.hip), skin)
  const u = towards(skin, brace)
  const raw = unit(cross(n, u))
  const v: Vec3 = raw[1] < 0 ? [-raw[0], -raw[1], -raw[2]] : raw
  const centre = walk(walk(midpoint(skin, brace), n, HIP_BRACKET.proud), v, -HIP_BRACKET.drop)
  return {
    origin: centre,
    u,
    v,
    n,
    halfLength: distance(skin, brace) / 2 + HIP_BRACKET.overhang,
  }
}

const RAIL: Section = {
  halfBreadth: HIP_BRACKET.railHalfBreadth,
  halfThick: HIP_BRACKET.railHalfThick,
}
const TOOTH: Section = {
  halfBreadth: HIP_BRACKET.crenelHalfLong,
  halfThick: HIP_BRACKET.crenelHalfThick,
}

/** Eight segments, 96 triangles: four bars closing the loop and four teeth. */
export function pushHipBracket(out: MeshBuffers, leg: GearLeg): void {
  const f = bracketFrame(leg)
  const signs = [1, -1] as const

  for (const side of signs) {
    const rail = walk(f.origin, f.v, side * HIP_BRACKET.halfWidth)
    pushSegment(
      out, walk(rail, f.u, -f.halfLength), walk(rail, f.u, f.halfLength), RAIL, RAIL, f.n,
    )
  }

  // The end bars run rail-centre to rail-centre, so the corners are solid
  // overlaps rather than four bars meeting at a mitre that would show a seam
  // under flat shading.
  for (const end of signs) {
    const at = walk(f.origin, f.u, end * f.halfLength)
    pushSegment(
      out,
      walk(at, f.v, -HIP_BRACKET.halfWidth),
      walk(at, f.v, HIP_BRACKET.halfWidth),
      RAIL, RAIL, f.n,
    )
  }

  // Each tooth starts at its rail's CENTRELINE, not at the rim, so it is
  // rooted in the bar rather than balanced on it; only crenelProud minus the
  // rail's own half-breadth (0.16m) actually protrudes.
  for (const along of signs) {
    const at = walk(f.origin, f.u, along * HIP_BRACKET.crenelAt * f.halfLength)
    for (const side of signs) {
      pushSegment(
        out,
        walk(at, f.v, side * HIP_BRACKET.halfWidth),
        walk(at, f.v, side * (HIP_BRACKET.halfWidth + HIP_BRACKET.crenelProud)),
        TOOTH, TOOTH, f.n,
      )
    }
  }
}
