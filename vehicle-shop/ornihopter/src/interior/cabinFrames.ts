// vehicle-shop/ornihopter/src/interior/cabinFrames.ts
// The two transverse frames that close the cockpit fore and aft: the nose
// bulkhead under the windscreen, and the rear arch behind the crew's
// shoulders. Both are built the same way the floor and the side liner are —
// from hullSection.ts's slice of the hull's OWN section — so neither can land
// anywhere the skin does not.
//
// FOUND, round 6b. The nose bulkhead closes the critic's second hole verbatim:
// "sunlit desert filling the lower-left past the dash's end (x 0-110 below y
// 800) — you are looking out of the airframe". The floor simply stopped at its
// forward station and the nose bay beyond it was open to the bullnose, which
// is single-sided hull skin and therefore not there at all from inside. Any
// ray that cleared the dash's outboard edge and dipped below the deck line
// sailed straight out of the front of the craft.
//
// The rear arch is the reference board's BULKHEAD callout
// (.shots/reference/thopter-03.jpg, left inset): a machined transverse frame
// standing behind the seats with panels and boxes on it. It is what the pilot
// finds when the head turns past about 70 degrees, and without it the answer
// to "what is behind me" was the rear bulkhead 2.25m aft and nothing between.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { NOSE_BULKHEAD_Z, REAR_ARCH_Z, roofYAt, roofHalfWidthAt } from './canopyLayout'
import { hullInteriorHalfWidthAt, hullSectionBreakpoints } from './hullSection'
import { box, flatQuad, disposeGroup, type Placed } from './sceneUtils'
import {
  hullLinerMaterial, machinedMaterial, machinedDarkMaterial, gunmetalMaterial, oliveMaterial,
} from './materials'

/** A full transverse plate at z, banded on the section's real corners so each
 *  band is a chord of an actually-straight edge rather than an approximation. */
function plate(group: Group, z: number, topY: number): void {
  const material = hullLinerMaterial()
  const ys = hullSectionBreakpoints(z, COCKPIT.floorY, topY)
  for (let i = 0; i < ys.length - 1; i++) {
    const yA = ys[i]
    const yB = ys[i + 1]
    const wA = hullInteriorHalfWidthAt(yA, z)
    const wB = i + 1 === ys.length - 1 ? roofHalfWidthAt(z) : hullInteriorHalfWidthAt(yB, z)
    if (wA <= 0 || wB <= 0) continue
    const bottomLeft: Placed = { x: -wA, y: yA, z }
    const bottomRight: Placed = { x: wA, y: yA, z }
    const topRight: Placed = { x: wB, y: yB, z }
    const topLeft: Placed = { x: -wB, y: yB, z }
    group.add(flatQuad(bottomLeft, topLeft, topRight, bottomRight, material))
  }
}

/** Ribs and equipment boxes on a frame's face, so it reads as machined plate
 *  rather than as a flat card. */
function frameDetail(group: Group, z: number, topY: number, facing: 1 | -1): void {
  const width = hullInteriorHalfWidthAt((COCKPIT.floorY + topY) / 2, z)
  if (width <= 0) return
  const depth = 0.09 * facing
  group.add(
    box(width * 2 - 0.1, 0.1, 0.08, machinedMaterial(), {
      x: 0,
      y: topY - 0.18,
      z: z + depth,
    })
  )
  for (const side of [-1, 1] as const) {
    group.add(
      box(0.11, topY - COCKPIT.floorY - 0.3, 0.07, machinedDarkMaterial(), {
        x: side * width * 0.62,
        y: (COCKPIT.floorY + topY) / 2,
        z: z + depth,
      })
    )
  }
  group.add(
    box(0.42, 0.3, 0.16, oliveMaterial(), {
      x: -width * 0.34,
      y: topY - 0.42,
      z: z + depth * 1.6,
    })
  )
  group.add(
    box(0.26, 0.2, 0.13, gunmetalMaterial(), {
      x: width * 0.42,
      y: topY - 0.5,
      z: z + depth * 1.6,
    })
  )
}

export interface CabinFrames {
  group: Group
  dispose(): void
}

export function createCabinFrames(): CabinFrames {
  const group = new Group()
  group.name = 'cabinFrames'

  const nose = new Group()
  nose.name = 'noseBulkhead'
  plate(nose, NOSE_BULKHEAD_Z, roofYAt(NOSE_BULKHEAD_Z))
  frameDetail(nose, NOSE_BULKHEAD_Z, roofYAt(NOSE_BULKHEAD_Z), 1)

  const arch = new Group()
  arch.name = 'rearArch'
  plate(arch, REAR_ARCH_Z, roofYAt(REAR_ARCH_Z))
  frameDetail(arch, REAR_ARCH_Z, roofYAt(REAR_ARCH_Z), -1)

  group.add(nose, arch)

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
