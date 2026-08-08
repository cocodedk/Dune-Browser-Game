// character-shop/chani/src/model/face/eyes.ts
// Full ibad — spec.ts IBAD is true and PALETTE.eyes is one flat spice blue
// for the WHOLE visible eye, no white anywhere. That ruling is the reason
// the eye is an authored almond and not an eyeball: with no sclera, no iris
// and no pupil, the aperture SHAPE is the entire read, so it is authored as
// a station table exactly like the head is (aperture.ts), rather than left
// to emerge from wherever a sphere happens to intersect the lids.
//
// PASS 3 GAVE THE EYE LIDS (lids.ts) and moved it 1.8mm outboard (plan.ts
// EYE_X). Neither the aperture's size nor its cant changed, and that is
// deliberate: three judges called the eyes "two blue marbles pressed into a
// mask", and none of the three said they were the wrong SIZE. What was
// missing was everything around them — an orbital seat to sit in
// (warp.ts SEAT), skin passing in front of the blue (lids.ts), and enough
// gap between them to read as a wide-set face.

import type { Group, Mesh } from 'three'
import type { ChaniMaterials } from '../materials'
import { loft, type Ring } from '../loft'
import { APERTURE, placeAtEye } from './aperture'
import { buildLids } from './lids'

function eyeRings(side: number): Ring[] {
  return APERTURE.map(([y, rx, xc, rzF, rzB]) => ({
    y, rx, xc: side * xc, rzF, rzB,
  }))
}

/** One lens plus its two lids per side. `side` is +1 for the figure's own
 *  right (+X), which is the side armR sits on. */
export function buildEyes(head: Group, mat: ChaniMaterials): Mesh[] {
  return [-1, 1].flatMap((side) => {
    // 26 radial segments, not 18. With no sclera and no iris the aperture
    // OUTLINE is the entire read, and 18 segments put a visible corner
    // every 20 degrees round a 37mm almond at head framing.
    const eye = loft(eyeRings(side), mat.eyes, 26)
    eye.name = side < 0 ? 'eyeL' : 'eyeR'
    placeAtEye(eye, side)
    head.add(eye)
    return [eye, ...buildLids(head, mat, side)]
  })
}
