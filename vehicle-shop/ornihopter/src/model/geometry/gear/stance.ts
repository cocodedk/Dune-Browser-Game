// vehicle-shop/ornihopter/src/model/geometry/gear/stance.ts
// WHERE the legs are. The mesh (./leg.ts) reads these points and does no
// geometry of its own; stance.test.ts checks them without building a mesh
// at all.
//
// THE DEFECT THIS REPLACES. The old gear hung three struts of one fixed
// length off three belly stations and called the result a stance. The belly
// is not level — the pod is the deepest part of the hull (-2.107m at 3.6m
// aft) and the boom droops aft (hullStations.ts's keelY column) — so equal
// struts put their feet at three DIFFERENT heights, 0.728m apart, and the
// forward-most foot still landed 0.6m AFT of the seat. A craft like that
// rests on its forward pair and tips nose-down onto its own canopy.
//
// So the ground plane is the INPUT here, not an output: GROUND_Y is fixed,
// every foot is placed on it, and each leg's own length falls out of how far
// its hip happens to be above it. The rear legs come out longest, which is
// what an insect's are.
//
// The stance itself is read off docs/dune_ornihopter_kit-2.png, where the
// craft stands on splayed legs clustered under the pod and mid-body: the
// forward pair rakes FORWARD of its hips so the pod's mass sits inside the
// support polygon, the middle pair reaches widest outboard, the rear pair
// rakes AFT. Hip stations stay spec.ts's GEAR.stationsFromNose — spec says
// where the hips are, this file says where the feet go.

import { GEAR, HALF_LENGTH, stationFromNose } from '../../../spec'
import { hullHalfHeightAt, hullKeelYAt } from '../hullProfile'
import { lowerFlankSeat, burySeat, type Point3 } from './hipSeat'
import { braceNodeAt, braceSeatZ } from './braceAnchor'

export type { Point3 }

export interface GearLeg {
  readonly metresAft: number
  readonly side: 1 | -1
  /** Anchor buried inside the hull skin — the leg's real root. */
  readonly hip: Point3
  /** Where the hip fairing breaks through the lower flank. */
  readonly hipSkin: Point3
  /** SECOND buried anchor, for the brace strut: the kit's leg is a two-bar
   *  linkage (docs/profiles/kit-dossier.md §a — main strut plus a brace strut
   *  forming a scissor with it), and the assembled photographs
   *  (docs/dune_ornihopter_kit-2.png, close-up ...kit-3.png) show the two bars
   *  reaching the fuselage at two SEPARATE points and converging low. A leg
   *  with two load paths into the hull is also what stops six legs reading as
   *  an uncountable knot: the triangle between the bars is what says "one
   *  leg, structured" instead of "two sticks". */
  readonly braceHip: Point3
  /** Where the brace breaks through the lower flank. */
  readonly braceHipSkin: Point3
  readonly knee: Point3
  /** Where the brace meets the main strut — the apex of that triangle, on the
   *  TIBIA below the knee, so the void between the bars runs most of the leg. */
  readonly braceNode: Point3
  /** Top of the foot pad, where the tibia ends. */
  readonly ankle: Point3
  /** Ground contact — the underside of the pad. */
  readonly foot: Point3
}

/**
 * The one horizontal plane every foot stands on — 2.193m under the deepest
 * point of the hull (-2.107m, at 3.6m aft).
 *
 * MEASURED, and the measurement corrected a guess. This was first authored at
 * -3.35 on the strength of the kit photographs, which are shot from too low
 * and too close to read a height off. .shots/reference/thopter-05.jpg is the
 * production's own "ORNITHOPTER V5 — INGRESS/EGRESS IDEATION" board: the
 * craft parked, annotated "MULTIPLE LANDING FEET ARE SPREAD OUT AND CAN
 * ADJUST TO SUPPORT THE CRAFT ON UNEVEN SAND OR ROCK", with crew walking
 * UNDER the fuselage to a rear ramp. Scaled off the pod's own 4.21m depth in
 * that frame the belly sits ~2.5m up, and the figure standing beneath it
 * clears the skin by half its own height again. Headroom is the requirement,
 * not a look.
 *
 * spec.ts's OVERALL.landedHeight used to be an ambiguous 7.2 that could not
 * settle it: read literally as "clearance to the hull underside" it would put
 * this craft on 11m of leg, and read as overall parked height it implied
 * 1.81m — under headroom. GROUND_Y is derived from headroom instead, and the
 * parked craft's overall height is then whatever measure() reports: 7.582m
 * at round 4c.2, 6.747m once round 6a took the tent canopy off the deck,
 * 6.706m at round 7 (drifted in 6e/6e.2/6f, not moved by this round's own
 * gear change — see spec.ts's PROVENANCE.landedHeight for the proof). That
 * measured number is what OVERALL.landedHeight means, by ruling, rather
 * than a separate figure this stance has to approximate.
 */
export const GROUND_Y = -4.3
/** Pad thickness at the heel; the ankle sits this far above the ground. */
export const FOOT_TOP = 0.2
/** Minimum bite into the skin the stance test enforces on every hip. */
export const HIP_EMBED = 0.15

/** What the hips are actually buried by — comfortably past HIP_EMBED so a
 *  later tweak to the hull table cannot silently leave a fairing floating. */
const HIP_ANCHOR_DEPTH = 0.28
/** Where on the lower flank the hip sits, as a fraction of the chine
 *  half-width. The same fraction rootPod.ts seats the wing balls at, for the
 *  same reason: comfortably clear of both the keel plate and the chine. */
const HIP_X_FRACTION = 0.72

/** Knee placement between hip and ankle: most of the outboard reach happens
 *  in the femur, less than half the drop does. That is what makes the femur
 *  shallow and the tibia steep — the insect break the kit shows, rather than
 *  two halves of one straight strut.
 *
 *  KNEE_RAKE REVISED, round 7: 0.72 -> 0.42. At 0.72 the tibia — 56% of the
 *  drop, and the segment nearest the ground in every reference shot — kept
 *  barely a quarter of the rake, so its own rake-vs-drop angle measured
 *  8.5/16.8/13.6 degrees (mid/front/rear): "near-vertical posts", the
 *  Round 7 critic's finding, even though outboard (X) reach was never
 *  short. A side view only shows Y and Z, so Z was the axis that mattered.
 *  At 0.42 the tibia keeps 58% of the rake over 56% of the drop — close to
 *  proportionate — and both segments read as diagonal. */
const KNEE_OUT = 0.68
const KNEE_DROP = 0.44
const KNEE_RAKE = 0.42

interface Station {
  readonly metresAft: number
  /** Outboard reach of the contact point. */
  readonly footX: number
  /** Fore (negative) / aft (positive) reach of the foot from its hip. */
  readonly rakeZ: number
}

// Every pair needs a rake it can be SEEN by. Measured, not assumed: the
// middle pair was first authored at rakeZ 0.15, which put its hip, knee and
// foot within 0.15m of one z — and from the side view, where the whole leg
// projects onto the Y-Z plane, that collapsed the knee entirely and the leg
// came out as a vertical telescoping post, the exact defect this round
// exists to remove. The bow that makes a leg read as segmented has to lie in
// the viewing plane, and only fore/aft rake puts it there for a side camera.
// footX is set so each femur leaves its hip 32-35 degrees below horizontal —
// the splay the kit close-up shows — now that the taller ground plane gives
// every leg a metre more drop to cover. Holding the old footX at the new
// height would have stood the craft up on near-vertical legs; holding the old
// femur ANGLE instead would have thrown the feet out to +/-5m. These sit
// between: a 9.2m stance on a 5.4m body.
//
// rakeZ RAISED, round 7. The critic read the rendered stance at ~10 degrees
// off vertical against the kit's ~33 (…kit-2.png); this file's own
// hip-to-foot Z-vs-drop angle agreed at 15.1/28.2/23.9 (mid/front/rear) —
// two of three under a 25-degree floor. footX is untouched: outboard (X)
// reach was already 35-43 degrees, past the kit's own reference, so it was
// never the short axis. rakeZ rises on all three to clear 25 with margin,
// near the kit's ~30-33: front -1.7 -> -1.85 (already the least vertical),
// mid 0.95 -> 2.05 (the flattest leg — the one the critic's ~10 likely
// names), rear 1.65 -> 2.2.
const STANCE: readonly Station[] = [
  { metresAft: GEAR.stationsFromNose[0], footX: 3.9, rakeZ: -1.85 },
  { metresAft: GEAR.stationsFromNose[1], footX: 4.6, rakeZ: 2.05 },
  { metresAft: GEAR.stationsFromNose[2], footX: 4.35, rakeZ: 2.2 },
]

function buildLeg(station: Station, side: 1 | -1): GearLeg {
  const z = stationFromNose(station.metresAft)
  const seat = lowerFlankSeat(z, HIP_X_FRACTION)
  const braceSeat = lowerFlankSeat(braceSeatZ(z, station.rakeZ), HIP_X_FRACTION)
  const footZ = z + station.rakeZ
  const ankleY = GROUND_Y + FOOT_TOP
  const runX = station.footX - seat.x
  const drop = seat.y - ankleY
  const mirror = (p: Point3): Point3 => ({ x: side * p.x, y: p.y, z: p.z })
  const knee = {
    x: seat.x + KNEE_OUT * runX,
    y: seat.y - KNEE_DROP * drop,
    z: z + KNEE_RAKE * station.rakeZ,
  }
  const ankle = { x: station.footX, y: ankleY, z: footZ }
  return {
    metresAft: station.metresAft,
    side,
    hip: mirror(burySeat(seat, HIP_ANCHOR_DEPTH)),
    hipSkin: mirror(seat),
    braceHip: mirror(burySeat(braceSeat, HIP_ANCHOR_DEPTH)),
    braceHipSkin: mirror(braceSeat),
    knee: mirror(knee),
    braceNode: mirror(braceNodeAt(knee, ankle)),
    ankle: mirror(ankle),
    foot: mirror({ x: station.footX, y: GROUND_Y, z: footZ }),
  }
}

/** Six legs: three stations, both sides. Right side first, so
 *  gearGeometry.ts can build that half and mirror it. */
export const GEAR_LEGS: readonly GearLeg[] = [
  ...STANCE.map((station) => buildLeg(station, 1)),
  ...STANCE.map((station) => buildLeg(station, -1)),
]

/** Ground clearance under the hull's deepest point, for the stance test and
 *  anything else that wants the parked height without re-deriving it. */
export function bellyClearance(): number {
  let lowest = Infinity
  for (let m = 0; m <= HALF_LENGTH * 2; m += 0.05) {
    const z = m - HALF_LENGTH
    lowest = Math.min(lowest, hullKeelYAt(z) - hullHalfHeightAt(z))
  }
  return lowest - GROUND_Y
}
