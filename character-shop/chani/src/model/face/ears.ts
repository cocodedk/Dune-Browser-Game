// character-shop/chani/src/model/face/ears.ts
// Ears as authored flaps — a station table thin in X and broad in Z, so
// the loft's own rings ARE the helix outline. R1 used a scaled sphere and
// it read as a bean stuck to the temple; the method rule in this shop is
// that a form gets a table, not a primitive.
//
// The brief scopes these to "ears where the hair leaves them visible", and
// with the curl masses in hairCurls.ts the answer is: the outer helix and
// the lobe, seen against the hair from three-quarter and profile framings.
// The rest is covered, which is what happens to ears under hair that has
// been pushed back rather than tucked.

import type { Group, Mesh } from 'three'
import type { ChaniMaterials } from '../materials'
import { loft, type Ring } from '../loft'

/** Ear-local, origin at the concha: y up, x out from the skull, z back.
 *  52mm tall and 30mm front-to-back, which is a small ear on a 231mm
 *  head — the brief's "fine-boned". */
const EAR: readonly (readonly number[])[] = [
  // y,       rx (half thickness), rzF,     rzB,     zc
  [-0.0262, 0.0038, 0.0068, 0.0062, 0.0004], // lobe
  [-0.0175, 0.0050, 0.0102, 0.0090, -0.0006],
  [-0.0060, 0.0057, 0.0138, 0.0116, -0.0010],
  [0.0060, 0.0058, 0.0150, 0.0126, -0.0012],
  [0.0168, 0.0049, 0.0133, 0.0116, -0.0008],
  [0.0252, 0.0032, 0.0090, 0.0080, -0.0002], // helix top
]

const EAR_X = 0.0668
const EAR_Y = 0.0942
const EAR_Z = 0.0135
/** Top tipped 7 degrees out from the skull, which is what puts the helix
 *  clear of the temple instead of flush against it. */
const FLARE = (7 * Math.PI) / 180

export function buildEars(head: Group, mat: ChaniMaterials): Mesh[] {
  const rings: Ring[] = EAR.map(([y, rx, rzF, rzB, zc]) => ({ y, rx, rzF, rzB, zc }))
  return [-1, 1].map((side) => {
    const ear = loft(rings, mat.skin, 14)
    ear.name = side < 0 ? 'earL' : 'earR'
    ear.position.set(side * EAR_X, EAR_Y, EAR_Z)
    ear.rotation.set(0, 0, -side * FLARE)
    head.add(ear)
    return ear
  })
}
