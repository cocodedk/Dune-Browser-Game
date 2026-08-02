// vehicle-shop/ornihopter/src/model/geometry/hullGreebles.ts
// The hull's authored detail, merged into the hull's own BufferGeometry so it
// shares the skin's material and weathering maps. Everything here is measured
// off docs/dune_ornihopter_kit-3.png, the nose-on close-up, and everything is
// seated on a real surface point read back from hullProfile.ts — nothing is
// placed at a guessed coordinate and nothing floats.
//
// SPARSE ON PURPOSE. The close-up's panel language is a few large trapezoids
// with crisp trim, two authored grilles and a blunt slotted nose; it is not
// dense random panelling.
//
//   nose cap      the blunt vertical chisel tip. The station table stops the
//                 loft at a small octagon rather than a point, which leaves a
//                 hole; this closes it, and its UVs point at the nose island
//                 where hullWeathering.ts paints the TWO STACKED HORIZONTAL
//                 SLOTS that are this craft's clearest identity feature.
//                 Painted rather than modelled because they are recesses, and
//                 additive geometry cannot cut a recess.
//   deck louvre   three slats on the centreline between the two mount frames.
//                 The wing-mount hardware itself moved out to
//                 wing/mountPlate.ts in round 6a, when it stopped being two
//                 long strips along the deck edge and became the kit's own two
//                 transverse frames — measured, so it belongs beside the roots
//                 it is measured against, not in a general greeble bag.
//   flank grille  one per side on the upper flank aft of the canopy, its
//                 outward face mapped to the fine-rib texture island.

import { HALF_LENGTH } from '../../spec'
import { hullHalfWidthAt, hullHalfHeightAt, hullShapeAt, hullKeelYAt } from './hullStations'
import { buildRing } from './hullCrossSection'
import { isOutsideHull } from './hullProfile'
import { buildBox, type BoxMesh, type UvRect } from './hullBox'
import { GRILLE_U, NOSE_U, MACHINERY_U } from './hullUv'

const rect = (u: readonly [number, number], inset = 0.005): UvRect =>
  ({ u0: u[0] + inset, u1: u[1] - inset, v0: 0.06, v1: 0.94 })

const MACHINERY = rect(MACHINERY_U)
const GRILLE = rect(GRILLE_U, 0.004)

/** Craft-local z for a distance aft of the nose. */
const at = (metresAft: number): number => metresAft - HALF_LENGTH

/** Top of the deck at craft-local z — the section's own centre plus its half-height. */
function deckYAt(z: number): number {
  return hullKeelYAt(z) + hullHalfHeightAt(z)
}

/** Hull surface x at height y and craft-local z, by bisection against the real
 *  faceted skin. Used to seat the flank grilles ON the flank rather than at a
 *  guessed offset, the same discipline rootPod.ts's seatOnHull follows. */
function flankXAt(y: number, z: number): number {
  let inner = 0
  let outer = hullHalfWidthAt(z)
  for (let i = 0; i < 32; i++) {
    const mid = (inner + outer) / 2
    if (isOutsideHull(mid, y, z, 0)) outer = mid
    else inner = mid
  }
  return (inner + outer) / 2
}

/** Eight triangles closing the loft's blunt nose octagon, wound to face -Z. */
function buildNoseCap(): BoxMesh {
  const z = -HALF_LENGTH
  const halfWidth = hullHalfWidthAt(z)
  const halfHeight = hullHalfHeightAt(z)
  const keelY = hullKeelYAt(z)
  const ring = buildRing(halfWidth, halfHeight, hullShapeAt(z), 0, keelY)
  const positions: number[] = []
  const uvs: number[] = []
  const midU = (NOSE_U[0] + NOSE_U[1]) / 2
  const push = (x: number, y: number): void => {
    positions.push(x, y, z)
    const nx = halfWidth > 0 ? x / halfWidth : 0
    const ny = halfHeight > 0 ? (y - keelY) / halfHeight : 0
    uvs.push(midU + ((NOSE_U[1] - NOSE_U[0]) / 2) * nx * 0.9, 0.5 + 0.45 * ny)
  }
  for (let k = 0; k < ring.length; k++) {
    const next = ring[(k + 1) % ring.length]
    push(0, keelY)
    push(next.x, next.y)
    push(ring[k].x, ring[k].y)
  }
  return { positions, uvs }
}

/** Three slats on the centreline deck between the mount frames. */
function buildDeckLouvre(): BoxMesh[] {
  return [9.6, 9.8, 10.0].map((metresAft) => {
    const z = at(metresAft)
    const halfY = 0.11
    return buildBox(
      { x: 0, y: deckYAt(z) + 0.05 - halfY, z },
      { x: 0.62, y: halfY, z: 0.055 },
      MACHINERY,
    )
  })
}

/** One fine-ribbed intake per side, on the upper flank aft of the canopy. */
function buildFlankGrilles(): BoxMesh[] {
  const z = at(6.6)
  const y = 0.3
  const x = flankXAt(y, z)
  return ([1, -1] as const).map((mirror) => buildBox(
    { x: mirror * x, y, z },
    { x: 0.2, y: 0.5, z: 1.05 },
    MACHINERY,
    mirror === 1 ? 'px' : 'nx',
    GRILLE,
  ))
}

/** Every greeble, ready for hullGeometry.ts to concatenate. */
export function buildHullGreebles(): BoxMesh[] {
  return [buildNoseCap(), ...buildDeckLouvre(), ...buildFlankGrilles()]
}
