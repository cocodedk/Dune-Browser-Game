// vehicle-shop/ornihopter/src/interior/canopyLiner.ts
// Closes the one gap the glazing fix and cabinShell.ts's tapered walls do
// not: a band between the console's own top edge and the canopy's sill line
// directly above it. The console sits inside the NOSE-SHOULDER glazing bay
// (model/geometry/canopyGeometry.ts), so everything ABOVE the canopy's local
// sill there is glass once that material reads correctly — but MEASURED, the
// console's dash top (COCKPIT.consoleHeightAboveFloor) sits at y=-0.85, and
// the canopy's own sill at the console's z is y=-0.54. Nothing filled that
// band. This is what round 3's critic named verbatim: "the slab's top edge
// and the rail above it don't meet".
//
// FOUND while verifying this round: a first version started the panel at
// CONSOLE.topY itself and went fully black on screen. It was not occluded —
// it was the occluder: console.ts's centre hood and its dials stand up to
// y=-0.62 (topY + 0.23), taller than the flat dash top this assumed, and an
// opaque panel starting at topY sat in front of them, hiding the dash the
// panel was meant to frame. LINER_BASE_Y starts above the hood instead.

// FOUND, round 6a: this panel is bounded ABOVE by canopySectionAt(z).baseY,
// which used to be a sill just above the dash and is now, with the canopy
// rebuilt as a flush deck panel, the deck line itself — about 1.8m up, and
// directly in the pilot's forward view. An opaque quad there would black out
// the windscreen it exists to frame, which is the same class of mistake as the
// original one recorded below. It is clamped to the canopy's own exported sill
// line instead, so the band stays the band it always was.

import { Group } from 'three'
import { CONSOLE } from './layout'
import { canopySectionAt, CANOPY_SIDE_SILL_Y } from '../model/geometry/canopyGeometry'
import { flatQuad, disposeGroup, type Placed } from './sceneUtils'
import { consoleBodyMaterial } from './materials'

// Console centre hood + its dials peak at CONSOLE.topY + 0.23 (console.ts);
// +0.25 clears that with a small margin instead of occluding it.
const LINER_BASE_Y = CONSOLE.topY + 0.25

export interface CanopyLiner {
  group: Group
  dispose(): void
}

export function createCanopyLiner(): CanopyLiner {
  const group = new Group()
  group.name = 'canopyLiner'

  const sill = canopySectionAt(CONSOLE.nearZ)
  const topY = Math.min(sill.baseY, CANOPY_SIDE_SILL_Y)
  const bottomLeft: Placed = { x: -CONSOLE.halfWidth, y: LINER_BASE_Y, z: CONSOLE.nearZ }
  const bottomRight: Placed = { x: CONSOLE.halfWidth, y: LINER_BASE_Y, z: CONSOLE.nearZ }
  const topRight: Placed = { x: sill.halfWidth, y: topY, z: CONSOLE.nearZ }
  const topLeft: Placed = { x: -sill.halfWidth, y: topY, z: CONSOLE.nearZ }
  group.add(flatQuad(bottomLeft, bottomRight, topRight, topLeft, consoleBodyMaterial()))

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
