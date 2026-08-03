// vehicle-shop/ornihopter/src/interior/collective.ts
// The collective: a lever at the pilot's own left hand, raking aft-down from
// a pivot mounted through the side console's own top to a twist-grip end with
// a small switch box — the AH-64E element round 6b's single arm never had at
// all. layout.ts's COLLECTIVE documents the placement math (why it clears
// forwardCone.test.ts's cone on bearing, not only on elevation); this file
// only builds the parts. Pilot-only: no reference names a copilot collective.

import { Group } from 'three'
import { COLLECTIVE } from './layout'
import { box, cylinderY, segment } from './sceneUtils'
import { machinedDarkMaterial, gunmetalMaterial, stickGripMaterial, amberLitMaterial } from './materials'

export function buildCollective(): Group {
  const group = new Group()
  group.name = 'collective'

  const { pivot, grip, leverRadius } = COLLECTIVE

  // The pivot bracket: where the lever roots through the console's own top,
  // not a rod ending in open air.
  const pivotMesh = box(0.09, 0.05, 0.09, machinedDarkMaterial(), pivot)
  pivotMesh.name = 'collective-pivot'

  const lever = segment(pivot, grip, leverRadius, leverRadius * 1.15, gunmetalMaterial())
  lever.name = 'collective-lever'

  // Twist-grip: a wider cylinder at the lever's own end — the hand's actual
  // hold, not a point on the rod.
  const gripMesh = cylinderY(0.045, 0.05, 0.16, stickGripMaterial(), grip, 12)
  gripMesh.name = 'collective-grip'

  group.add(
    pivotMesh,
    lever,
    gripMesh,
    // A small switch box on the grip's own head — engine and lighting
    // switches, the detail that reads "collective" rather than "handle".
    box(0.06, 0.035, 0.05, machinedDarkMaterial(), { x: grip.x, y: grip.y + 0.1, z: grip.z }),
    box(0.015, 0.015, 0.015, amberLitMaterial(), { x: grip.x + 0.02, y: grip.y + 0.12, z: grip.z })
  )

  return group
}
