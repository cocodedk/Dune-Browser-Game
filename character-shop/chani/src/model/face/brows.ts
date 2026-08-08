// character-shop/chani/src/model/face/brows.ts
// The brows, laid ALONG the brow ridge warp.ts carves rather than floated
// in front of it: every control point asks surface.ts where the skin is at
// that half-width and that height, then stands 1.6mm proud of it. A brow
// authored in free space drifts off a curved forehead within 20mm of the
// centre line and reads as a sticker.
//
// Destination: dark, fairly straight, LOW, with a slight peak at the outer
// third. Low is the important one — it is what makes the eyes read as
// large, because the lid space between brow and lash line stays small.
// Together with the eye masses these are the two darkest shapes on the
// face, and they carry the expression at bust framing where 2mm of relief
// carries nothing.

import type { Group, Mesh } from 'three'
import type { ChaniMaterials } from '../materials'
import { tube, type Point3 } from '../primitives'
import { EYE_Y } from './plan'
import { skinAtFront } from './surface'

/** [half-width along the ridge, height above the eye line, half-height of
 *  the brow itself]. The bar starts thin at the glabella end, thickens
 *  through the body, and tapers to a tail. LOW is the important thing and
 *  it is unchanged: the measured brow-to-lid gap stays at 1.6mm, which is
 *  what keeps large apertures reading large.
 *
 *  A 9.2mm bar is what Zendaya's brows are; pass 1's 7.6mm read as
 *  pencilled at bust framing, and pass 2's thickening stands.
 *
 *  PASS 3 FLATTENED THE ARCH AND LENGTHENED THE BAR, because the render
 *  and the vertex table disagreed and the render is the brief. MEASURED
 *  two ways on pass 2: the finished brow vertices run from (12.06, 130.59)
 *  to (52.88, 130.86), a slope of +0.37 degrees — dead level — while a
 *  least-squares fit through the brow's own dark PIXELS in headfront comes
 *  out at 7.4 degrees down-and-in, which is what made three judges read
 *  the face as severe.
 *
 *  The gap is two things that only exist in the picture. About 2.8 degrees
 *  is PROJECTION: the outer end sits 27.6mm further back than the inner
 *  one, the portrait camera looks 3 degrees down, and a receding point at
 *  the same height projects nearer the horizon. The rest is the ARCH — the
 *  peak sat at 41mm, past the middle of a 12-53mm bar, so the fitted line
 *  through the mass leans even though its two ends are level.
 *
 *  Both are answered by moving the peak to the middle (32-39mm of a
 *  10.5-56.6mm bar) and cutting the arch from 3.4mm to 1.8. Geometric
 *  slope comes out at -0.24 degrees and the predicted render angle at
 *  ~2.6, inside the brief's 5. The bar is 46mm long against 40, and its
 *  radius column tapers over three points at each end instead of dropping
 *  off one: pass 2's outer end was a spike. */
const BROW: readonly (readonly number[])[] = [
  [0.0105, 0.0130, 0.0012],
  [0.0172, 0.0138, 0.0032],
  [0.0246, 0.0144, 0.0043],
  [0.0320, 0.0148, 0.0046],
  [0.0392, 0.0148, 0.0043],
  [0.0458, 0.0144, 0.0034],
  [0.0518, 0.0136, 0.0021],
  [0.0566, 0.0126, 0.0009],
]

/** Proud of the skin along the body, and sunk INTO it at both ends — the
 *  tube has no caps, so an end left in the open would be a hole. Buried,
 *  the brow also fades into the face instead of stopping dead, which is
 *  what a real brow's inner edge does. */
const PROUD = 0.0016
const BURY = 0.0040
/** Cross-section is 0.72 as deep as it is tall: a brow is a flattened bar
 *  lying on the ridge, not a wire. */
const FLATTEN = 0.72

function browPath(side: number): { path: Point3[]; radii: number[] } {
  const path: Point3[] = []
  const radii: number[] = []
  BROW.forEach(([ax, dy, r], i) => {
    const [x, y, z] = skinAtFront(side * ax, EYE_Y + dy)
    // Both ends buried, and the tail buried one point EARLIER than the
    // head: past ~48mm the skin is turning away toward the temple fast
    // enough that a proud tube crosses the head's own silhouette and reads
    // as a detached stick beside the face. It did exactly that in the
    // first three-quarter capture.
    const buried = i === 0 || i >= BROW.length - 2
    path.push({ x, y, z: z + (buried ? BURY : -PROUD) })
    radii.push(r)
  })
  return { path, radii }
}

export function buildBrows(head: Group, mat: ChaniMaterials): Mesh[] {
  return [-1, 1].map((side) => {
    const { path, radii } = browPath(side)
    const brow = tube(path, radii, mat.hair, 14, radii.map(() => FLATTEN))
    brow.name = side < 0 ? 'browL' : 'browR'
    head.add(brow)
    return brow
  })
}
