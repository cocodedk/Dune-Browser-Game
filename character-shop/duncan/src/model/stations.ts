// character-shop/duncan/src/model/stations.ts
// A body region is described as a STACK OF CROSS-SECTIONS, not as a stack of
// analytic solids. One Station is one slice through the form at a height:
// how wide it is (rx), how far it reaches back (rb) and forward (rf), and
// where the slice's own centre sits (cx/cz) so the path itself can curve —
// spine lean, calf drift, the way a head sits back over its neck.
//
// Two rules make the difference between a cone and a limb:
//   1. rf and rb differ. A chest is deeper in front than behind; a calf
//      bulges backwards. A circular section can express neither.
//   2. The interpolation between stations is a CURVE (Catmull-Rom below),
//      not a straight line. A radius that changes linearly between two
//      numbers IS a cone, however many segments it is cut into. A radius
//      that eases through a waypoint has curvature — bicep swell, elbow
//      waist, forearm swell — which is what reads as living form.
//
// Every table in this shop is written in ABSOLUTE stature metres so it can
// be checked against the landmark list in bodyPlan.ts by eye; loft.ts
// subtracts the owning group's own origin when it builds.

export interface Station {
  /** Height, in the same frame as the rest of the table (stature metres). */
  y: number
  /** Half-width, left/right. */
  rx: number
  /** Half-depth toward +Z — this shop's BACK (the face looks down -Z). */
  rb: number
  /** Half-depth toward -Z — the FRONT. */
  rf: number
  /** Section centre offsets; the path through the stack, not the stack. */
  cx?: number
  cz?: number
}

export type Profile = Required<Station>

/** Catmull-Rom through p1 and p2. Exported because the FACE fields
 *  (faceFields.ts) interpolate their own authored tables — a nose bridge's
 *  amplitude down the profile, a lip column's width — with exactly the same
 *  curve the station tables use, so a rib and a ring ease alike. */
export function spline(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (
    2 * p1
    + (p2 - p0) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (3 * p1 - p0 - 3 * p2 + p3) * t3
  )
}

function at(list: Station[], i: number): Station {
  return list[Math.min(list.length - 1, Math.max(0, i))]
}

/** The cross-section at parameter u in [0, n-1] — u = i lands exactly on
 *  station i, so every authored landmark is hit, and between them the form
 *  curves instead of stepping. Radii are floored just above zero: a
 *  Catmull-Rom through a fast-narrowing waist (the elbow, the wrist) may
 *  undershoot, and a negative radius would fold the surface inside out. */
export function profileAt(list: Station[], u: number): Profile {
  const i = Math.min(list.length - 2, Math.max(0, Math.floor(u)))
  const t = Math.min(1, Math.max(0, u - i))
  const [p0, p1, p2, p3] = [at(list, i - 1), at(list, i), at(list, i + 1), at(list, i + 2)]
  const pick = (f: (s: Station) => number): number => spline(f(p0), f(p1), f(p2), f(p3), t)
  return {
    y: pick((s) => s.y),
    rx: Math.max(1e-4, pick((s) => s.rx)),
    rb: Math.max(1e-4, pick((s) => s.rb)),
    rf: Math.max(1e-4, pick((s) => s.rf)),
    cx: pick((s) => s.cx ?? 0),
    cz: pick((s) => s.cz ?? 0),
  }
}

/** The cross-section at a given HEIGHT rather than at a parameter — how a
 *  meso mass (a pec, a strap, the belt) finds the macro surface it has to
 *  sit on instead of guessing one fixed radius for a whole region. Bisects
 *  on u because the y channel is itself splined; 24 halvings resolve a
 *  1.9 m figure to well under a micron. */
export function profileAtY(list: Station[], y: number): Profile {
  const rising = list[list.length - 1].y >= list[0].y
  let lo = 0
  let hi = list.length - 1
  for (let step = 0; step < 24; step++) {
    const mid = (lo + hi) / 2
    const above = profileAt(list, mid).y >= y
    if (above === rising) hi = mid
    else lo = mid
  }
  return profileAt(list, (lo + hi) / 2)
}

/** A derived table — the chest rig's panel is the torso's own surface with
 *  its front pushed proud and its back sunk inside, so the costume can
 *  never drift off the body it is worn on. */
export function reshape(list: Station[], edit: (s: Profile) => Station): Station[] {
  return list.map((s) => edit({
    y: s.y, rx: s.rx, rb: s.rb, rf: s.rf, cx: s.cx ?? 0, cz: s.cz ?? 0,
  }))
}
