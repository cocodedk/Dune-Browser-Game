// character-shop/duncan/src/model/lids.ts
// THE EYELIDS, as geometry. R2 pass 1 had none: the orbit's lids were ridges
// in the skull's own displacement field, and a field ridge 10mm away from the
// pupil can only ever be a smooth ramp. A ramp has no EDGE, and the edge is
// the entire read — an eye at bust distance is a dark almond with a lid line
// over it and a lit ledge under it. Without those two lines the aperture is
// just a hole, which is what three critics and the lead all saw.
//
// A lid is the same object as a brow (ridge.ts): a section swept along a
// curve laid on the face. The difference is what it follows. A brow follows
// the SKIN. A lid follows the GLOBE — its front is placed a fixed overhang in
// front of the eyeball's own analytic surface at every station, so it wraps
// the ball the way a lid does and cannot drift off it, and where the ball has
// curved away past the corners the placement falls back to the skin so the
// tips sink in instead of hanging in the socket.
//
// The margins are ARCS, not lines. Two straight margins make a slot; two
// arcs that meet at both corners make an almond, and biasing the upper arc's
// peak medially and the lower arc's trough laterally (FISSURE.skew) is what
// keeps the pair from reading as a symmetrical lens cut out of paper.
//
// Both lids are SKIN. They can only ever read as form, never as one more dark
// object stuck to the face — which is the failure mode this face has already
// paid for at the brow.

import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import type { Bin } from './primitives'
import { buildRidge, endSink } from './ridge'
import type { Section } from './ridge'
import { FACE, FISSURE, GLOBE } from './faceLandmarks'
import { ORBIT_TILT } from './faceSculpt'
import type { Surface } from './eyes'

/** How thick each lid is, how far in front of the globe it rides, and the
 *  least it may ever stand proud of the skin. The upper lid is the heavier of
 *  the two and overhangs more — that overhang is what casts the shadow line
 *  along the top of the eye, and a hooded eye is exactly that shadow. */
const UPPER = { high: 0.0044, deep: 0.0030, overhang: 0.0024, minProud: 0.0012 }
const LOWER = { high: 0.0029, deep: 0.0024, overhang: 0.0013, minProud: 0.0018 }

/** How far past each corner the ridge runs before it ends. Past the globe's
 *  own half-length the placement is skin-relative, so this is the length of
 *  the tuck rather than of the lid. */
const OVERRUN = 0.0026

/** Both corners are pressed under the skin over the last 6mm. Without it the
 *  ridge keeps its standoff to the very tip and the first render grew a lit
 *  spur at the inner corner of every eye — ridge.ts endSink argues it. */
const CORNER = { reach: 0.0060, depth: 0.0040 }

/** A parabola through both corners with its peak pushed off centre by `skew`
 *  — 1 at the middle, 0 at n = +/-1, and never negative in between. */
function arc(n: number, skew: number): number {
  const t = Math.min(1, Math.max(-1, n))
  return (1 - t * t) * (1 + skew * t)
}

/** The eye's own centre height at distance `d` outward from the pupil: the
 *  whole orbit tilts down toward its outer corner (faceSculpt.ts ORBIT_TILT),
 *  so both margins and the globe share one slope and the eye reads as one
 *  thing rotated, not as three forms that happen to lean. */
function axisY(d: number): number {
  return FACE.eye - ORBIT_TILT * d
}

/** The globe's own front surface at (d, dy) in the eye's frame — the same
 *  ellipsoid eyes.ts builds, asked where its skin is. Outside it the answer
 *  is its equator, which is behind the socket floor, and the caller's clamp
 *  takes over from there. */
function globeFront(centreZ: number, d: number, dy: number): number {
  const q = 1 - (d / GLOBE.rx) ** 2 - (dy / GLOBE.ry) ** 2
  return centreZ - GLOBE.rz * Math.sqrt(Math.max(0, q))
}

interface LidSpec {
  name: string
  lid: typeof UPPER
  /** +1 for the upper lid (margin above the axis, ridge above the margin). */
  up: 1 | -1
  reach: number
  skew: number
}

const LIDS: LidSpec[] = [
  { name: 'lidUpper', lid: UPPER, up: 1, reach: FISSURE.upper, skew: -FISSURE.skew },
  { name: 'lidLower', lid: LOWER, up: -1, reach: FISSURE.lower, skew: FISSURE.skew },
]

function buildLid(
  bin: Bin, materials: DuncanMaterials, head: Group, originY: number,
  side: -1 | 1, surface: Surface, centreZ: number, spec: LidSpec,
): void {
  const x0 = FACE.pupilX - FISSURE.half
  const dAt = (s: number): number => s - FISSURE.half
  const margin = (s: number): number => {
    const d = dAt(s)
    return axisY(d) + spec.up * spec.reach * arc(d / FISSURE.half, spec.skew)
  }
  const section = (s: number): Section => {
    const n = Math.min(1, Math.abs(dAt(s)) / FISSURE.half)
    const fat = 0.40 + 0.60 * (1 - n * n)
    return { high: spec.lid.high * fat, deep: spec.lid.deep * (0.55 + 0.45 * fat) }
  }
  const from = -OVERRUN
  const to = 2 * FISSURE.half + OVERRUN
  const fades = [{ at: from, ...CORNER }, { at: to, ...CORNER }]
  buildRidge(bin, head, {
    side,
    from,
    to,
    x0,
    y0: FACE.eye,
    originY,
    section,
    // The RIDGE's centre sits its own half-height clear of the margin, so
    // the margin itself is the lid's exposed edge against the dark globe.
    line: (s) => margin(s) + spec.up * section(s).high,
    centreZ: (s, y, sec) => {
      const d = dAt(s)
      const m = margin(s)
      const front = globeFront(centreZ, d, m - axisY(d))
      const skin = surface(side * (x0 + s), m) - spec.lid.minProud
      return Math.min(front - spec.lid.overhang, skin) + sec.deep + endSink(s, fades)
    },
    ends: [0.22, 0.22],
    steps: 12,
  }, materials.skin, spec.name, {
    rings: 30, radial: 18, domeBottomH: 0.0018, domeTopH: 0.0018,
  })
}

export function buildLids(
  bin: Bin, materials: DuncanMaterials, head: Group, originY: number,
  side: -1 | 1, surface: Surface, centreZ: number,
): void {
  for (const spec of LIDS) buildLid(bin, materials, head, originY, side, surface, centreZ, spec)
}
