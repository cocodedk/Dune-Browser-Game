// landscape-shop/sietch/src/model/surface/beds.ts
// THE STRATIGRAPHY, on its own page. bedding.ts evaluates it; this file
// only says what the rock is. Split out of bedding.ts in R2.1 when the
// table grew runs and terminations and the two together would not fit
// inside one 200-line file.
//
// R2.1 re-authoring, against a fresh critic's read of the R2 clay: "a
// uniform sine-wave ripple, not shadowed irregular courses ... no width
// variation and no termination logic". R2's nine courses WERE varied
// arithmetically (0.04-0.32 m of relief) and uniform to the eye at 20-40
// m. Three things changed, and all three are visible in this table:
//
//   SPACING varies ~9x, not ~2x. 0.33 m between the two thinnest courses;
//   3.10 m of unbedded blind between the shoulder and the gallery bench.
//   Thin pairs, then a massive band, then plain rock.
//
//   DEPTH varies ~30x. Three courses DOMINATE at 0.55-0.78 m proud; four
//   nearly vanish at 0.02-0.07 m. The eye has to be able to pick a course
//   out and follow it, which means most courses must not compete.
//
//   THE COURSE TOPS ARE WHERE THE GALLERIES ARE CUT. 2.40 m is the raised
//   gallery's sill, 4.40 m is the head of both floor-level openings, 6.80
//   m is the head of the raised one. The Fremen followed the bedding, so
//   an opening starts and stops at a parting — which is also what lets
//   backWallCourses.ts terminate a band cleanly into a lintel instead of
//   running across an opening.

export interface Bed {
  /** Top of this course, metres above the hall floor. */
  topM: number
  /** How far it stands proud of the nominal wall, in metres. */
  proudM: number
  /** Albedo shift: -1 toward PALETTE.rockShadow, +1 toward rockGlowlit. */
  tone: number
  /** Thin partings inside the course. 0 = massive stone, no lamination. */
  laminae: number
  /** Depth fraction (0 back wall, 1 mouth) this course RUNS between. A
   *  course that stops has been quarried out by whatever stands there —
   *  see the names. Omitted means it runs the whole hall. */
  runFromT?: number
  runToT?: number
  /** What this course is, for the next person reading the render. */
  name: string
}

/** Above this the hall is cut through massive unbedded stone — which is
 *  also what keeps the crown, the tallest geometry in the set, untouched. */
export const BEDDED_TOP_Y_M = 13.6

export const BEDS: Bed[] = [
  { topM: 0.62, proudM: 0.12, tone: 0.14, laminae: 0, name: 'footing seam — the first hard bed above the cut floor' },
  { topM: 0.95, proudM: 0.07, tone: -0.06, laminae: 1, name: 'its thin twin, 0.33 m up — the tightest pair in the hall' },
  { topM: 2.40, proudM: 0.62, tone: 0.46, laminae: 0, name: 'PLINTH BENCH — dominant; the raised gallery sits its sill on this top' },
  { topM: 2.80, proudM: 0.05, tone: -0.10, laminae: 1, name: 'weeping marl — soft, laminated, cut right back' },
  { topM: 4.40, proudM: 0.22, tone: 0.16, laminae: 0, runToT: 0.72, name: 'lintel course — heads both floor galleries; breaks at the left wall’s long bench block' },
  { topM: 4.85, proudM: 0.03, tone: -0.05, laminae: 1, name: 'sand seam — all but gone' },
  { topM: 5.30, proudM: 0.02, tone: -0.04, laminae: 0, name: 'its twin — all but gone' },
  { topM: 6.80, proudM: 0.78, tone: 0.48, laminae: 0, name: 'SHOULDER COURSE — dominant, the proudest bed in the hall; heads the raised gallery' },
  { topM: 9.90, proudM: 0.04, tone: -0.22, laminae: 2, name: 'the blind — 3.10 m of massive rock with nothing in it' },
  { topM: 11.05, proudM: 0.34, tone: 0.20, laminae: 0, runToT: 0.56, name: 'gallery bench — dies into the right wall’s big unquarried block at mid-hall' },
  { topM: 13.60, proudM: 0.55, tone: 0.30, laminae: 0, name: 'CAP BED — dominant, the last course before the massive stone' },
]

/** What the rock does above the last course: nothing, faintly lit. */
export const MASSIVE = { proudM: 0, tone: 0.05 }
