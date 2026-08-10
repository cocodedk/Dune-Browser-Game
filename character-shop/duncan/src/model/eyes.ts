// character-shop/duncan/src/model/eyes.ts
// The eyeballs, and the one place in this shop where an analytic solid IS the
// anatomy rather than a stand-in for it: an eyeball really is a ball, and
// primitives.ts's rule allows exactly that. The socket is carved into the
// skull loft (faceBrow.ts); the LIDS are lofted ridges that wrap this ball
// (lids.ts). Three surfaces, each doing the job it does in a head.
//
// WHAT PASS 1 GOT RIGHT AND STILL FAILED ON. Its aperture measured 28 x 10mm
// against ~30 x 11 on a man — the right hole in the right place — and the
// render read as two dead slots anyway, for two reasons that had nothing to
// do with size:
//
//   1. THE LENS WAS FLAT. rz 0.0030 over rx 0.0175 is a disc. Every point on
//      a disc takes the key light at the same angle, so it renders as one
//      uniform value: a silhouette, not a form. GLOBE is 20mm deep now
//      (faceLandmarks.ts argues the number), which sweeps the surface normal
//      through ~90 degrees inside the aperture and gives it a lit side, a
//      terminator and a shadowed side. `proud` grew with rz so the aperture
//      itself stays the size that measured correctly.
//   2. NOTHING FRAMED IT. The lid ridges were displacement on skin 10mm away
//      and rendered as smooth ramps with no edge. lids.ts is the answer and
//      its header argues it.
//
// spec.ts sets IBAD false, so there is no sclera this round: the whole
// visible globe is PALETTE.eyes, which the lead lifted to 0x453425 after the
// same critic — near-black in a shadowed socket has no gradient to show even
// when the geometry finally has one.
//
// THE GLOBE IS PLACED ON THE SURFACE, NEVER AT A DEPTH. R2's first render put
// it at one authored z and a head is round: 33mm off the centreline the skull
// has already fallen back, and the globes hung out of the face as two
// pebbles. It asks frontZAt() where the skin is at its own x and y and clears
// it by GLOBE.proud. brows.ts and lids.ts do the same.

import type { Group } from 'three'
import type { DuncanMaterials } from './materials'
import { blob } from './primitives'
import type { Bin } from './primitives'
import { FACE, GLOBE } from './faceLandmarks'
import { ORBIT_TILT } from './faceSculpt'
import { buildBrows } from './brows'
import { buildLids } from './lids'
import { buildScar } from './scar'

/** Where the skin is at (x, y): stature metres in, group-local z out. */
export type Surface = (x: number, y: number) => number

export function buildEyes(
  bin: Bin, materials: DuncanMaterials, head: Group, originY: number, surface: Surface,
): void {
  for (const side of [-1, 1] as const) {
    const x = side * FACE.pupilX
    // The front pole stands GLOBE.proud in front of the socket floor whatever
    // rz is, so growing the ball forward-to-back does not grow the hole it
    // shows through — the aperture is set by this one number.
    const centreZ = surface(x, FACE.eye) + GLOBE.rz - GLOBE.proud
    const eye = blob(bin, head, GLOBE.rx, GLOBE.ry, GLOBE.rz, materials.eyes,
      x, FACE.eye - originY, centreZ, 'eyeMass', [40, 28])
    // Baked, not carried — see ridge.ts: a rotated child measures larger than
    // it is under Box3, and the guards measure these boxes. lids.ts treats
    // this rotation as a shear of the eye's own axis, which it is to within
    // 2% at 0.10 rad, and rides the same axis so the pair cannot separate.
    eye.geometry.rotateZ(-ORBIT_TILT * side)
    buildLids(bin, materials, head, originY, side, surface, centreZ)
  }
  buildBrows(bin, materials, head, originY, surface)
  // After the brows, because the cord crosses the gap they leave and the
  // reading the render has to deliver is one mark THROUGH an interrupted
  // brow — scar.ts's header argues why absence alone could not deliver it.
  buildScar(bin, materials, head, originY, surface)
}
