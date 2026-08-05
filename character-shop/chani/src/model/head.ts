// character-shop/chani/src/model/head.ts
// ONE closed lofted solid from the chin to just under the crown, with the
// cranium carried BACKWARD (rzB roughly 1.7x rzF) so the head has a real
// front-to-back axis: pass 2's revolved skull was as deep as it was wide and
// as full in front as behind, which is why the profile read as a disc. The
// last 16mm of stature is the hair crown (hair.ts) sitting on this skull,
// not the skull itself — that is how a head works, and it keeps the total
// inside the seam test's 1% budget.
//
// Likeness — brow, cheekbones, lids, mouth — is R2's job. This round authors
// only what the SILHOUETTE needs: skull mass, jaw taper, a nose that is the
// frontmost geometry on the figure's head (the -Z facing guard), and ears,
// which cost four lines and are the difference between a profile that reads
// as a head and one that reads as an egg.

import type { Group, Mesh } from 'three'
import type { Proportions } from './proportions'
import type { ChaniMaterials } from './materials'
import { blob } from './primitives'
import { loft, type Ring } from './loft'

/** Head-local: Y=0 is the chin, +Z is the back of the skull. */
function headRings(p: Proportions): Ring[] {
  const hh = p.headH
  const sk = p.skullR
  const jw = p.jawR
  return [
    { y: 0, rx: jw * 0.54, zc: -0.008, rzF: 0.036, rzB: 0.048 },
    { y: hh * 0.13, rx: jw * 0.99, zc: -0.004, rzF: 0.052, rzB: 0.070 },
    { y: hh * 0.27, rx: sk * 0.85, zc: 0, rzF: 0.062, rzB: 0.086 },
    { y: hh * 0.41, rx: sk * 0.96, zc: 0.004, rzF: 0.066, rzB: 0.098 },
    { y: hh * 0.50, rx: sk, zc: 0.006, rzF: 0.064, rzB: 0.106 },
    { y: hh * 0.60, rx: sk, zc: 0.006, rzF: 0.062, rzB: 0.110 },
    { y: hh * 0.72, rx: sk * 0.97, zc: 0.008, rzF: 0.054, rzB: 0.108 },
    { y: hh * 0.85, rx: sk * 0.84, zc: 0.010, rzF: 0.040, rzB: 0.092 },
    { y: hh * 0.93, rx: sk * 0.58, zc: 0.012, rzF: 0.026, rzB: 0.062 },
  ]
}

export function buildHead(head: Group, p: Proportions, mat: ChaniMaterials): Mesh[] {
  const skull = loft(headRings(p), mat.skin, 24)
  skull.name = 'skull'
  head.add(skull)

  // Nose: sunk into the interpolated face surface at its own height so its
  // back half is inside the skull, tip ~27mm proud — the frontmost point of
  // the whole figure's head, which depth.test.ts asserts.
  const noseY = p.headH * 0.44
  const faceZ = -0.061
  const nose = blob(p.noseR, { x: 0.72, y: 1.5, z: 1.2 }, mat.skin, 12)
  nose.position.set(0, noseY, faceZ - p.noseR * 0.3)
  nose.name = 'nose'
  head.add(nose)

  const ears = [-1, 1].map((side) => {
    const ear = blob(p.noseR * 0.92, { x: 0.35, y: 1.5, z: 0.9 }, mat.skin, 10)
    ear.position.set(side * p.skullR * 0.97, p.headH * 0.47, 0.016)
    ear.name = side < 0 ? 'earL' : 'earR'
    head.add(ear)
    return ear
  })

  return [skull, nose, ...ears]
}
