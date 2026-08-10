// character-shop/duncan/src/model/topknot.ts
// spec.ts COSTUME.head asks for a "half-tie topknot". R1 answered with one
// sphere at the back of the crown, which is a bump, not a knot: the thing
// that makes a tied knot READ is that it has a WAIST — hair gathers, a tie
// cinches it, and the tail blooms out again past the cinch. Three widths in
// that order are the whole form, and none of them survives being averaged
// into a ball.
//
// It is built on its OWN AXIS. A y-stacked loft cannot describe a form that
// travels backward off the crown, so the group is tilted 54 degrees off
// vertical (arm.ts does the same thing for the A-pose) and the station table
// then runs straight up its local axis, where gather/tie/bloom are just
// three rows of a table again.
//
// It is also the figure's tallest geometry — bodyPlan.ts LM.hairTop is
// PROPORTIONS.heightM, and seam.test.ts holds the whole figure to within 1%
// of it. The origin below is placed so the bloom's forward-top edge lands on
// stature height; that is a measured number, not an authored one, and
// face.test.ts re-measures it.

import { MathUtils } from 'three'
import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { loft } from './loft'
import type { Station } from './stations'

const TILT_DEG = 54

/** Local metres up the knot's own axis. Buried root, gather, TIE, bloom,
 *  tuft — the tie is 48mm across where the gather is 76mm and the bloom is
 *  80mm, so the cinch is unmistakable in silhouette from any azimuth. */
const KNOT: Station[] = [
  { y: -0.0140, rx: 0.042, rb: 0.040, rf: 0.040 },
  { y: 0.0120, rx: 0.038, rb: 0.037, rf: 0.037 },
  { y: 0.0285, rx: 0.024, rb: 0.023, rf: 0.023 },
  { y: 0.0500, rx: 0.040, rb: 0.039, rf: 0.039 },
  { y: 0.0680, rx: 0.033, rb: 0.032, rf: 0.032 },
]

const ORIGIN = { y: 1.8680, z: 0.0400 }

/** The knot's own frame, exported so a guard can measure ACROSS the axis
 *  rather than across the world's. The widths it finds there are measured;
 *  only the direction it looks along is authored. */
export const KNOT_AXIS = { tiltDeg: TILT_DEG, y: ORIGIN.y, z: ORIGIN.z } as const

/** The swept band of gathered hair running from the temples back to the tie
 *  — without it the knot is a bun stuck to a smooth cap with nothing
 *  leading into it. Sits on the cap, 6-10mm proud, narrowing as it goes
 *  back, which is what "the top half pulled up" looks like from the front. */
const SWEEP: Station[] = [
  { y: 1.8340, rx: 0.070, rb: 0.116, rf: 0.052, cz: 0.024 },
  { y: 1.8620, rx: 0.066, rb: 0.114, rf: 0.062, cz: 0.026 },
  { y: 1.8820, rx: 0.056, rb: 0.108, rf: 0.070, cz: 0.026 },
  { y: 1.8990, rx: 0.040, rb: 0.092, rf: 0.066, cz: 0.024 },
]

export function buildTopknot(bin: Bin, materials: DuncanMaterials, head: Group, originY: number): void {
  loft(bin, head, SWEEP, materials.hair, 'topknotSweep', {
    originY, rings: 20, radial: 28, domeBottomH: 0.010, domeTopH: 0.014,
  })

  // The tilt is BAKED INTO THE GEOMETRY, not carried on the mesh, and that
  // is not tidiness. three.js's Box3.setFromObject transforms a geometry's
  // eight bounding-box corners and unions their AABB, so a rotated child
  // measures BIGGER than it is: carried as a transform, this knot inflated
  // the figure's measured height to 1.9509m — 1.08% over spec, and
  // seam.test.ts's 1% band would have failed on a model that was actually
  // the right size. primitives.ts bakes blob's scale for the same reason.
  const knot = loft(bin, head, KNOT, materials.hair, 'topknotBun', {
    rings: 26, radial: 26, domeBottomH: 0.014, domeTopH: 0.018,
  })
  knot.geometry.rotateX(MathUtils.degToRad(TILT_DEG))
  knot.geometry.translate(0, ORIGIN.y - originY, ORIGIN.z)
}
