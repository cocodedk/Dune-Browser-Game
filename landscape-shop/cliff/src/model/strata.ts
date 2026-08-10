// landscape-shop/cliff/src/model/strata.ts
// The formation's GEOLOGY: one stratigraphic column, read at each mass's own
// attitude. The COLOUR of a course lives next door in model/rockRamp.ts; this
// file owns where the courses are.
//
// Every mass in the bake is a reshaped copy of the same source rock, and
// tools/bake/bedding.mjs hands each one a plane
//
//     s(x, y, z) = a*x + b*y + c*z + d
//
// whose value is that point's height in the column, in meters. Two points at
// the same s are in the same course even if their masses tilt different ways
// — which is exactly the read R2 is after: ONE geology, many attitudes. The
// hero's courses, the west bastion's, the prow's and the skirt's all come out
// of the same table, so the eye ties them together instead of counting
// separate boulders (the R1 critics' "stacked boulders" reading).

import { MASSIF_BAKE } from './massif'
import { bedLift, memberColorAt, type Rgb } from './rockRamp'

export type BeddingPlane = readonly [number, number, number, number]
export type { Rgb }

/** BED thickness — the geometric rhythm. model/gateWall.ts cuts its courses
 *  on this number so the prow's steps match the baked rock's own shelves.
 *
 *  9.5 m, not the 13 m a first pass used. Reason measured, not chosen: the
 *  landing rig looks along the wall almost level, so 200 px of frame down the
 *  near face covers barely 16 m of rock. At 13 m beds that whole near wall
 *  came out inside ONE bed and rendered dead flat — the bands only appeared
 *  up where the wall turned toward the camera. At 9.5 m the same strip
 *  carries two bed edges. It costs no triangles: gateWall.ts samples three
 *  rows to a bed instead of four. */
export const COURSE_M = 9.5

/** MEMBER thickness — the colour rhythm, three beds to a member.
 *
 *  Two scales, and the ratio between them is the point. A first pass coloured
 *  at bed scale, and measured on the rendered PNG the bands landed one to a
 *  shelf: each slab came out its own flat shade, which is the R1 critics'
 *  "stacked boulders" reading repainted rather than cured. A member spans
 *  three shelves, so one colour band visibly runs ACROSS the geometry's own
 *  steps and ties them into a single rock — while the thin parting bed at
 *  each member's base keeps the finer bed rhythm legible up close. */
export const MEMBER_M = 3 * COURSE_M

// Members are not all the same thickness. This warps the s -> member mapping
// so they run between about 23 and 34 m while the mapping stays strictly
// increasing (1.15 * WARP < 1), and the sequence never repeats. With
// rockRamp.ts's alternating tones this is what keeps the banding reading as
// stratigraphy rather than as an even stripe pattern.
const WARP = 0.18

export function beddingHeightAt(plane: BeddingPlane, x: number, y: number, z: number): number {
  return plane[0] * x + plane[1] * y + plane[2] * z + plane[3]
}

/** Continuous member coordinate: its whole part names the member, its
 *  fraction is how far up that member the point sits. */
export function memberCoordAt(s: number): number {
  const t = s / MEMBER_M
  return t + WARP * Math.sin(t * 1.15 + 0.7)
}

export function memberAt(s: number): number {
  return Math.floor(memberCoordAt(s))
}

/** The course a point sits in — the bed index, one per COURSE_M. Exported
 *  because model/weathering.ts steps its weathering boundaries on exactly
 *  these lines: weather follows bedding, it does not fade smoothly. */
export function courseAt(s: number): number {
  return Math.floor(s / COURSE_M)
}

/** The rock's own colour at stratigraphic height s, before any weather. */
export function bandColorAt(s: number): Rgb {
  const member = memberColorAt(memberCoordAt(s))
  const lift = 1 + bedLift(courseAt(s))
  return member.map((channel) => Math.min(1, channel * lift)) as Rgb
}

/** The bedding plane each finished triangle of the massif belongs to. The
 *  bake stores one contiguous triangle range per mass (tools/bake/pack.mjs
 *  re-measures them after welding), so this is a lookup, not a guess. */
const TRIANGLE_MASS = buildTriangleMass()

function buildTriangleMass(): Int16Array {
  const out = new Int16Array(MASSIF_BAKE.triangles).fill(0)
  MASSIF_BAKE.strata.forEach((mass, at) => {
    for (let t = mass.from; t < mass.to; t++) out[t] = at
  })
  return out
}

export function planeForTriangle(triangle: number): BeddingPlane {
  const mass = MASSIF_BAKE.strata[TRIANGLE_MASS[triangle] ?? 0]
  return mass.plane as unknown as BeddingPlane
}

/** The hero buttress's own bedding. Everything procedural — the gate prow,
 *  the lip, the skirt — is cut into or piled against the hero mass, so it
 *  carries the hero's attitude and its courses line straight up with the
 *  baked rock's. */
export const HERO_PLANE: BeddingPlane = (
  MASSIF_BAKE.strata.find((mass) => mass.name === 'heroButtress') ?? MASSIF_BAKE.strata[0]
).plane as unknown as BeddingPlane
