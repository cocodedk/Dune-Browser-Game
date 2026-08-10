// landscape-shop/sietch/src/model/backWallBands.ts
// WHERE THE BACK WALL'S COURSES ARE. Split out of backWallCourses.ts when
// the two together passed the 200-line rule: this half decides the shape
// of every course slab, that half turns the shapes into triangles.
//
// A band is one course of surface/beds.ts, given:
//   how far it stands PROUD of the cap plane — the same relief the same
//     course has on the side walls, RUN THROUGH A CEILING (compressProud):
//     R2.1's dead-flat 0.78 m slab read as "poured concrete beams... a
//     suspended lintel." Proud now tops out well inside 0.25 m.
//   the DIP, so it runs downhill exactly as it does everywhere else — and
//     also LEANS the front face by the same dip, plus one gentle sway
//     across the width, so the face is not a picture-plane-flat panel
//   its own clip against the carved ring at BOTH its own front plane and
//     the cap plane (see postsFor) — never past the arch silhouette —
//     and against the gallery cuts it dies into, with a broken, stepped
//     hand-off rather than a straight cut

import { FOOTPRINT } from '../spec'
import { vaultScaleAt } from './vaultScale'
import { CAP_Z, GALLERY_LAYOUT } from './galleryLayout'
import { cutBounds } from './galleryRecess'
import { BEDS, bedProudAt, beddingLiftAt } from './surface/bedding'
import { smoothstep } from './surface/curves'
import type { Point2 } from './crossSection'

/** How far past the cap outline the x samples reach. Posts beyond the
 *  rock simply come back empty — this only has to be generous. */
const MARGIN_M = 0.7
/** Kept just inside the tube so a slab edge and the rock never land on
 *  the same line and z-fight (Sietch.ts's skirt lesson). */
const TUBE_INSET_M = 0.03
/** The lowest slab's base. It does NOT dip with the courses above it: it
 *  has to stay under the floor at every x (or its underside becomes an
 *  edge hanging in the air) and above -FOOTPRINT.skirtDepthM (or it drops
 *  out of the bottom of the set and seam.test.ts's min-y guard fires —
 *  measured at -2.39 m when it was allowed to dip). */
const BURIED_BASE_Y_M = -0.9
/** Half a centimetre either side of a jamb: two samples that close the
 *  slab's own end face without a separate cap. */
const EDGE_EPS_M = 0.005
const X_SAMPLES = 45

const CAP_T = -CAP_Z / FOOTPRINT.depthM
const HALF_WIDTH_M = (FOOTPRINT.widthM / 2) * vaultScaleAt(CAP_Z) + MARGIN_M
const CUTS = GALLERY_LAYOUT.map(cutBounds)

// CARVED-IN, NOT STACKED-PROUD. 0.25 m is the ceiling; the soft knee
// keeps it a ceiling, not a plateau — the four courses that used to share
// 0.78 m still read as deepest, they just top out near 0.22 m instead of
// standing forward as slabs. K controls how hard the knee bends: soft
// enough that MIN_COURSE_PROUD_M-scale beds pass through almost unchanged.
const MAX_PROUD_M = 0.25
const PROUD_SOFT_K = 0.11

function compressProud(valueM: number): number {
  return (MAX_PROUD_M * valueM) / (valueM + PROUD_SOFT_K)
}

// R2.3 — NO COURSE IS EVER ABSENT. The old gate zeroed a course's relief
// under 0.05 m raw, and a zeroed course got no slab — the blind (3.1 m)
// and the sand-seam/twin pair (0.9 m) read live as bare cap between proud
// slabs: "TALL DARK RECESS GAPS... isolated slabs." This floors the
// COMPRESSED value instead, so every course keeps a slab however shallow,
// and stands in for the missing neighbour at both ends of the table —
// the floor below the first course, the crown above the last — so the
// top course's own step is proudM minus this floor, not the full ~0.21 m
// back to the cap plane in one riser spanning the whole width.
export const MIN_COURSE_PROUD_M = 0.12
/** A parting groove's own height, and how proud its floor stays — never
 *  fully flush, or it lands on the cap mesh's plane and z-fights it. */
export const GROOVE_HEIGHT_M = 0.14
export const GROOVE_FLOOR_PROUD_M = 0.02

// THE FRONT FACE IS NOT A PICTURE-PLANE-FLAT PANEL. reliefWaveAt returns
// a 0..WAVE_DEPTH_FRAC FRACTION of a post's own proud to recess — never
// an added metre, so a course can never stand past its own compressProud
// ceiling nor sink behind the cap plane. Two shapes blended:
//   DIP reuses the exact lift already tilting a course's top/bottom edge
//     (beddingLiftAt, via smoothstep so it stays continuous).
//   SWAY is two overlaid cosines across the width — a long fold (the
//     swell that bends a course down the hall) plus a SHORT one that
//     carries most of the weight: at 35 m, head-on, a shallow-wavelength
//     wave is invisible in position and barely visible in shading — a
//     ~2.5 m wavelength with real depth gives adjacent posts (0.8 m
//     apart) a few degrees of relative tilt, which IS what a creased
//     grid has edges to shade.
const WAVE_DEPTH_FRAC = 0.55
const WAVE_CYCLES_LONG = 3
const WAVE_CYCLES_SHORT = 15
const DIP_LO_LIFT_M = -0.5
const DIP_HI_LIFT_M = 1.5

/** 0..WAVE_DEPTH_FRAC — how much of a post's own proud to recess. */
export function reliefWaveAt(x: number, lift: number): number {
  const span = 2 * HALF_WIDTH_M
  const long = Math.cos((2 * Math.PI * WAVE_CYCLES_LONG * x) / span)
  const short = Math.cos((2 * Math.PI * WAVE_CYCLES_SHORT * x) / span + 0.9)
  const sway = 0.5 + 0.5 * (0.35 * long + 0.65 * short)
  const dip = smoothstep(DIP_LO_LIFT_M, DIP_HI_LIFT_M, lift)
  return WAVE_DEPTH_FRAC * (0.65 * sway + 0.35 * dip)
}

// BROKEN, STEPPED — NEVER A STRAIGHT FULL-WIDTH RECTANGLE. A run's own
// two ends — a jamb, or the tube's own outline — step the proud down in
// hard notches over the last stretch approaching them (edgeFactorsFor in
// backWallCourses.ts): a smooth fade reads as droop, a notch reads as
// broken rock. The run still ends at its own last solid post — this only
// scales what stands proud approaching it.
export const NOTCH_ZONE_M = 1.2
export const NOTCH_NEAR_FACTOR = 0.35
export const NOTCH_FAR_FACTOR = 0.65

export interface Band {
  bottomM: number
  topM: number
  proudM: number
  proudAboveM: number
  proudBelowM: number
  /** False only for the buried lowest slab — see BURIED_BASE_Y_M. */
  dipBottom: boolean
}

/** This band owns the parting line at that edge (emitGroove). Tie goes
 *  to the LOWER band via <=, so equally-shallow neighbours still carve
 *  a line rather than merging into one seamless run. */
export function hasTopGroove(band: Band): boolean { return band.proudAboveM <= band.proudM }
export function hasBottomGroove(band: Band): boolean { return band.proudBelowM < band.proudM }

/** Every course as a slab, with the neighbours it has to share a step
 *  with. See the R2.3 note above MIN_COURSE_PROUD_M for why neither this
 *  nor the neighbour fallbacks are ever a hard 0 any more. */
export function bands(): Band[] {
  const lift0 = beddingLiftAt(0, CAP_Z, FOOTPRINT.depthM)
  const proud = BEDS.map((bed, k) => {
    const mid = ((k > 0 ? BEDS[k - 1].topM : 0) + bed.topM) / 2
    const value = bedProudAt(lift0 + mid, lift0, CAP_T)
    return Math.max(MIN_COURSE_PROUD_M, compressProud(value))
  })
  return BEDS.map((bed, k) => ({
    bottomM: k > 0 ? BEDS[k - 1].topM : BURIED_BASE_Y_M,
    topM: bed.topM,
    proudM: proud[k],
    proudAboveM: k + 1 < proud.length ? proud[k + 1] : MIN_COURSE_PROUD_M,
    proudBelowM: k > 0 ? proud[k - 1] : MIN_COURSE_PROUD_M,
    dipBottom: k > 0,
  }))
}

/** The x positions a slab is evaluated at: an even spread, plus a pair
 *  straddling every jamb so the slab's end closes itself. */
export function sampleXs(): number[] {
  const xs: number[] = []
  for (let i = 0; i < X_SAMPLES; i++) {
    xs.push(-HALF_WIDTH_M + (2 * HALF_WIDTH_M * i) / (X_SAMPLES - 1))
  }
  for (const cut of CUTS) {
    for (const edge of [cut.x0, cut.x1]) xs.push(edge - EDGE_EPS_M, edge + EDGE_EPS_M)
  }
  return [...new Set(xs)].sort((a, b) => a - b)
}

export interface Post { x: number; lo: number; hi: number; lift: number; clipped: boolean; solid: boolean }

/** Highest point of the carved outline at this x — the arch, or -Infinity
 *  where the ring has no rock at all. */
function outlineTopAt(points: Point2[], x: number): number {
  let top = -Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if ((a.x - x) * (b.x - x) > 0) continue
    const span = b.x - a.x
    const y = Math.abs(span) < 1e-9 ? Math.max(a.y, b.y) : a.y + ((b.y - a.y) * (x - a.x)) / span
    if (y > top) top = y
  }
  return top
}

/**
 * @param outline The carved ring at this band's OWN front plane.
 * @param capOutline The ring at the cap plane. A post's height clips to
 *   the LOWER of the two: the tube is wider at a proud front plane than
 *   at the cap, so this stops a course's edge crossing the arch BY
 *   CONSTRUCTION rather than by keeping the amplitude small.
 */
export function postsFor(band: Band, xs: number[], outline: Point2[], capOutline: Point2[]): Post[] {
  return xs.map((x) => {
    const lift = beddingLiftAt(x, CAP_Z, FOOTPRINT.depthM)
    const base = band.bottomM + (band.dipBottom ? lift : 0)
    let lo = base
    for (const cut of CUTS) {
      if (x > cut.x0 && x < cut.x1 && cut.y1 > lo) lo = cut.y1
    }
    const ceiling = Math.min(outlineTopAt(outline, x), outlineTopAt(capOutline, x)) - TUBE_INSET_M
    const hi = Math.min(band.topM + lift, ceiling)
    return { x, lo, hi, lift, clipped: lo > base, solid: hi - lo > 0.02 }
  })
}
