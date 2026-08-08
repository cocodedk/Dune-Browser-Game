// character-shop/duncan/src/model/ridge.ts
// A RIDGE ALONG A FACE LINE — the one construction the brows and the eyelids
// both are, extracted so there is exactly one copy of it.
//
// brows.ts learned this the expensive way over two renders: a brow cannot be
// a blob, or three blobs, because a blob is a solid lying ON a round head
// with its whole body outside the skin, and three of them make three
// highlights. What a brow IS is a section swept along a curve that follows
// the skull — which is a loft, the same thing every other continuous form in
// this shop is, differing only in which way its axis points.
//
// The station table therefore runs OUTWARD ALONG THE FACE LINE and the loft
// is baked a quarter turn so its axis becomes the figure's own x. Two things
// fall out that no blob can give:
//
//   * every station sets its own cz from the SKIN under it (faceSculpt.ts's
//     frontZAt via the `surface` callback), so the form follows the skull's
//     curvature exactly instead of hanging at one authored depth;
//   * every station sets its own cx, so the form can RIDE a line that drops,
//     rises or arcs — a brow's outward tilt, a lid margin's arc over a globe.
//
// A lid is the same object as a brow with a different section and a different
// line, and saying so once here is cheaper than saying it twice badly.

import { MathUtils } from 'three'
import type { MeshStandardMaterial, Object3D } from 'three'
import { loft } from './loft'
import type { LoftOptions } from './loft'
import type { Station } from './stations'
import type { Bin } from './primitives'

/** The ridge's section at distance `s` outward: half-HEIGHT and half-DEPTH.
 *  After the quarter-turn bake these are its extents in world y and world z.
 *
 *  `back` splits the depth when the two halves should differ, and the brow is
 *  why it exists. A section with one depth is an ellipse whose exposed cap is
 *  whatever fraction `proud` happens to show of it: brows.ts carried deep
 *  4.2mm behind a 3.2mm standoff, so the form's own edge sat 1mm BEHIND the
 *  skin and cut it in a hard line — a plate with a stamped outline, which is
 *  exactly what a critic meant by "pasted-on decals". Front 2.6mm against the
 *  same standoff puts that edge 0.6mm PROUD, so the form rolls off into the
 *  skin instead of being punched out of it, while `back` keeps the buried half
 *  deep enough that no underside can lift off the skull. Defaults to `deep`,
 *  so lids.ts is untouched. */
export interface Section {
  high: number
  deep: number
  back?: number
}

export interface RidgeSpec {
  /** -1 is the figure's own left (arm.ts, faceLandmarks.ts). */
  side: -1 | 1
  /** Distance outward from `x0` where this piece starts and ends. A form cut
   *  in two — a scarred brow — is two pieces sharing everything but these. */
  from: number
  to: number
  /** World |x| that s = 0 sits at, and the height the bake lands the form on
   *  (any height on the line will do: `line` is measured against it). */
  x0: number
  y0: number
  /** Stature metres minus the owning group's own height. */
  originY: number
  /** The section, the line's own height, and the section centre's depth. */
  section: (s: number) => Section
  line: (s: number) => number
  centreZ: (s: number, y: number, section: Section) => number
  /** Section scale at the medial and lateral ends. ~0.3 is a point that
   *  sinks into the skin; ~0.9 is a CUT, which is a different thing and has
   *  to look like one. */
  ends: [number, number]
  steps?: number
}

/** One end of a ridge, and how it dies into the skin: where it is, how far
 *  back along the form the fade reaches, and how deep it sinks there. */
export interface EndFade {
  at: number
  reach: number
  depth: number
}

/** How far a form should be pressed INTO the skin at distance `s`.
 *
 *  A ridge that keeps its full standoff right up to a tip leaves that tip
 *  hanging off the face as a proud needle, and the pass-2 render showed
 *  exactly that: a thin lit spur at the medial end of both brows and at the
 *  inner corner of all four lids, reading as four more specks on a face whose
 *  whole problem has been specks. Tapering the SECTION does not fix it —
 *  a needle standing 3mm off the skin is still a needle at any thickness.
 *  The end has to go UNDER the surface, which is what this does. */
export function endSink(s: number, fades: EndFade[]): number {
  let sink = 0
  for (const fade of fades) {
    const d = Math.abs(s - fade.at)
    if (d < fade.reach) sink = Math.max(sink, fade.depth * (1 - d / fade.reach))
  }
  return sink
}

/** Resampled evenly across the requested span rather than clipped out of a
 *  fixed table: a clipped table repeats heights at its ends, and a
 *  Catmull-Rom through two stations at the same y has nothing to interpolate
 *  along (stations.ts). */
export function ridgeStations(spec: RidgeSpec): Station[] {
  const steps = spec.steps ?? 8
  const out: Station[] = []
  for (let i = 0; i <= steps; i++) {
    const s = spec.from + ((spec.to - spec.from) * i) / steps
    const section = spec.section(s)
    const taper = i === 0 ? spec.ends[0] : i === steps ? spec.ends[1] : 1
    const y = spec.line(s)
    out.push({
      y: s,
      rx: Math.max(1e-4, section.high * taper),
      rb: Math.max(1e-4, (section.back ?? section.deep) * taper),
      rf: Math.max(1e-4, section.deep * taper),
      // The bake turns local x into world y, so this is how far the line
      // stands off y0 at this station — signed by the side, because the
      // quarter turn goes the other way on the other side of the face.
      cx: spec.side * (spec.y0 - y),
      cz: spec.centreZ(s, y, section),
    })
  }
  return out
}

/** Builds the loft and BAKES the quarter turn into its geometry rather than
 *  carrying it on the mesh. Not tidiness: three.js's Box3.setFromObject
 *  transforms a geometry's eight bounding-box corners and unions their AABB,
 *  so a rotated child measures BIGGER than it is — topknot.ts paid 1.08% of
 *  stature for that once, and every guard in this shop measures these boxes. */
export function buildRidge(
  bin: Bin, parent: Object3D, spec: RidgeSpec,
  material: MeshStandardMaterial, name: string, options: LoftOptions,
): void {
  const mesh = loft(bin, parent, ridgeStations(spec), material, name, options)
  mesh.geometry.rotateZ(MathUtils.degToRad(spec.side < 0 ? 90 : -90))
  mesh.geometry.translate(spec.side * spec.x0, spec.y0 - spec.originY, 0)
}
