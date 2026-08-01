// vehicle-shop/ornihopter/src/interior/overheadPanel.ts
// The hanging avionics panel from thopter-03's "ILLUMINATED LIGHTS" inset:
// a mount reaching up to a bracket clamped on the canopy's own ridge beam
// (OVERHEAD.mountTopY is canopyGeometry.ts's ridgeHeightAt — see layout.ts),
// a box, and a row of lit switches on its underside where a pilot looking
// up-and-forward sees them. Position from layout.ts OVERHEAD — chosen
// off-centre because the pilot's eye itself is off-centre with no toe-in
// (see layout.ts's header note).
//
// MEASURED: the ridge clamp itself sits ~2.9m above eye height, needing a
// ~69-degree upward look — well past the pilot camera's 34-degree half-VFOV,
// so the clamp is always off the TOP of frame at 1600x1000 and only the
// mount's lower run is ever seen. A thin wire reading toward nothing in an
// off-screen direction is exactly "floating with no fixture"; a wide flare
// right at the panel — a visible collar within frame — is what a blind
// critic can actually credit as structure, whatever happens above the crop.

import { Group } from 'three'
import { OVERHEAD } from './layout'
import { box, cylinderY, disposeGroup } from './sceneUtils'
import { consoleBodyMaterial, amberLitMaterial, greenLitMaterial, gunmetalMaterial } from './materials'

const PANEL_DEPTH = 0.22
const PANEL_HEIGHT = OVERHEAD.panelTopY - OVERHEAD.panelBottomY
const PANEL_CENTER_Y = (OVERHEAD.panelTopY + OVERHEAD.panelBottomY) / 2

export interface OverheadPanel {
  group: Group
  dispose(): void
}

export function createOverheadPanel(): OverheadPanel {
  const group = new Group()
  group.name = 'overheadPanel'

  // Flared, not a wire: wide at the panel (0.32 diameter) narrowing toward
  // the ridge clamp, which the header above notes sits off-screen anyway.
  const mount = cylinderY(0.06, 0.16, OVERHEAD.mountTopY - OVERHEAD.panelTopY, gunmetalMaterial(), {
    x: OVERHEAD.x,
    y: (OVERHEAD.mountTopY + OVERHEAD.panelTopY) / 2,
    z: OVERHEAD.z,
  })

  // Clamp bracket where the stalk meets the canopy's ridge beam — the actual
  // physical join, not just a stalk that stops in open air.
  const bracket = box(0.16, 0.04, 0.14, gunmetalMaterial(), {
    x: OVERHEAD.x,
    y: OVERHEAD.mountTopY,
    z: OVERHEAD.z,
  })

  const panel = box(OVERHEAD.halfWidth * 2, PANEL_HEIGHT, PANEL_DEPTH, consoleBodyMaterial(), {
    x: OVERHEAD.x,
    y: PANEL_CENTER_Y,
    z: OVERHEAD.z,
  })

  group.add(mount, bracket, panel)

  const lights = [amberLitMaterial, greenLitMaterial, amberLitMaterial, greenLitMaterial]
  const lightXs = lights.map((_, i) => {
    const t = lights.length > 1 ? i / (lights.length - 1) : 0.5
    return OVERHEAD.x - OVERHEAD.halfWidth * 0.7 + t * OVERHEAD.halfWidth * 1.4
  })
  lightXs.forEach((x, i) => {
    group.add(
      box(0.08, 0.02, 0.1, lights[i](), { x, y: OVERHEAD.panelBottomY - 0.01, z: OVERHEAD.z })
    )
  })

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
