// character-shop/chani/src/model/face/lids.ts
// THE EYELIDS, as geometry. Pass 2 had none — the "lids" were ridges in the
// skull's displacement field 10-12mm away from the aperture, and a field
// ridge that far off can only be a smooth ramp. A ramp has no EDGE, and the
// edge is the entire read: what the capture showed was a flat blue almond
// meeting skin along a hard rim, which every judge described the same way,
// "two blue marbles pressed into a mask".
//
// A lid is a section swept along a curve, like a brow (brows.ts) — the
// difference is what it follows. A brow follows the SKIN. A lid follows the
// LENS: its front rides a fixed overhang in front of aperture.ts's own
// surface at every station, so it wraps the almond and cannot drift off it,
// and where the margin has run past the outline the placement falls back to
// the canthus plane so the tips sink into the socket instead of hanging in
// it.
//
// The margins are ARCS, not lines. Two straight margins make a slot; two
// arcs meeting at both corners make an almond, and biasing the upper arc's
// peak inboard and the lower arc's trough outboard is what keeps the pair
// from reading as a symmetrical lens cut out of paper.
//
// Both lids are SKIN, and both OCCLUDE the lens. That is the point: with
// full ibad there is no white to say where an eye stops, so the only thing
// that can say "this is an aperture and not a decal" is skin passing in
// front of the blue along a curve.

import type { Group, Mesh } from 'three'
import type { ChaniMaterials } from '../materials'
import { tube, type Point3 } from '../primitives'
import { apertureFront, placeAtEye, CANTHUS_Y, HALF_X, MID_X } from './aperture'

interface LidSpec {
  name: string
  /** +1 for the upper lid: margin above the canthus line, body above it. */
  up: 1 | -1
  /** How far the margin arcs from the canthus line at its peak. */
  reach: number
  /** Peak bias along the margin; negative pulls it inboard. */
  skew: number
  /** Arc fullness. 1 is a parabola; below 1 the curve broadens toward a U,
   *  which is the brief's "rounder curve" for the lower lid. */
  round: number
  /** Section half-height at the peak, and its depth multiplier. */
  high: number
  deep: number
}

/** The upper lid covers the top 3.0mm of a 16.8mm aperture — 18%, inside
 *  the 15-20% the brief asks for. It is the number the whole file exists
 *  for: at 0% the lens edge is a hard rim, and past ~25% a full-ibad eye
 *  stops being an almond and becomes a slit, which pass 1 already proved by
 *  accident when its lid crease sat on the eye and buried 39% of it.
 *
 *  The lower lid covers 1.4mm. A lower lid is a LEDGE, not a cover: it
 *  catches light along its top edge and throws the small shadow that says
 *  the eye is set into something. */
const LIDS: LidSpec[] = [
  { name: 'lidUpper', up: 1, reach: 0.0049, skew: -0.28, round: 1.0, high: 0.0025, deep: 2.8 },
  { name: 'lidLower', up: -1, reach: 0.0074, skew: 0.35, round: 0.72, high: 0.0014, deep: 2.6 },
]

/** How far in front of the lens the margin rides. Small on purpose: this is
 *  the thickness of a lid edge, and at 3mm it would be a hood. */
const OVERHANG = 0.0016
/** How far past each corner the sweep runs before it stops, and how far
 *  back the last of it is pushed. tube() has no end caps, so both ends have
 *  to finish inside another mass — 5.5mm behind the canthus plane puts them
 *  a clear 4mm inside the socket floor. */
const OVERRUN = 0.10
const SINK = 0.0055
const STEPS = 26

/** Parabola-family arc: 1 at the middle, 0 at n = +/-1, peak pushed off
 *  centre by `skew`, and broadened toward a U by `round` < 1. */
function arc(n: number, spec: LidSpec): number {
  const t = Math.min(1, Math.max(-1, n))
  return (1 - t * t) ** spec.round * (1 + spec.skew * t)
}

/** How far the sweep has run toward a corner, 0 through the body and 1 at
 *  the far end of the overrun — the term that buries both tips.
 *
 *  IT STARTS AT 0.78, NOT AT THE CORNER, and the first capture is why. A
 *  sink that only begins past the canthus leaves the last stations INSIDE
 *  the outline still riding their full overhang in front of a lens that has
 *  already curved away — so both corners of both eyes grew a lit skin spur
 *  curling off the canthus, which is the exact failure duncan's ridge.ts
 *  documents at the inner corner. Pressing the last fifth of each lid under
 *  the skin is what makes a lid END instead of stop. */
const SINK_FROM = 0.78
function past(n: number): number {
  const over = (Math.abs(n) - SINK_FROM) / (1 + OVERRUN - SINK_FROM)
  return over <= 0 ? 0 : Math.min(1, over) ** 1.4
}

function lidPath(spec: LidSpec, side: number): { path: Point3[]; radii: number[]; depth: number[] } {
  const path: Point3[] = []
  const radii: number[] = []
  const depth: number[] = []
  for (let i = 0; i < STEPS; i++) {
    const n = -1 - OVERRUN + (i / (STEPS - 1)) * 2 * (1 + OVERRUN)
    const x = MID_X + n * HALF_X
    const margin = CANTHUS_Y + spec.up * spec.reach * arc(n, spec)
    // Fat through the body, thin at both corners: a lid tapers to nothing
    // where it meets its own canthus, and a lid of constant thickness reads
    // as a rubber band laid over the eye.
    const r = spec.high * (0.30 + 0.70 * arc(n, { ...spec, skew: 0, round: 0.55 }))
    const sink = past(n) * SINK
    // The margin is the lid's EXPOSED edge, so the swept section's centre
    // sits its own half-height clear of it, on the body's side.
    path.push({
      x: side * x,
      y: margin + spec.up * r,
      z: apertureFront(x, margin) - OVERHANG + r * spec.deep + sink,
    })
    radii.push(r)
    depth.push(spec.deep)
  }
  return { path, radii, depth }
}

/** Both lids for one eye, in the aperture's own frame and parked with the
 *  same transform the lens gets. */
export function buildLids(head: Group, mat: ChaniMaterials, side: number): Mesh[] {
  return LIDS.map((spec) => {
    const { path, radii, depth } = lidPath(spec, side)
    // 18 radial segments: the lid's own silhouette against the blue is a
    // short arc of this section, and at 12 the margin showed facets at
    // portrait framing.
    const lid = tube(path, radii, mat.skin, 18, depth)
    lid.name = `${spec.name}${side < 0 ? 'L' : 'R'}`
    placeAtEye(lid, side)
    head.add(lid)
    return lid
  })
}
