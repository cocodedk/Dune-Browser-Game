// vehicle-shop/ornihopter/src/interior/sticks.ts
// Twin flight-control sticks pulled in toward a shared centre pedestal. Each
// stick's grip position is chosen in layout.ts specifically so it clears the
// pilot camera's frustum — see STICK there for why the copilot's grip sits
// near the console rather than at their own knees.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { STICK } from './layout'
import { box, cylinderY, disposeGroup, type Placed } from './sceneUtils'
import { stickGripMaterial, gunmetalMaterial } from './materials'

function buildStick(grip: Placed): Group {
  const group = new Group()
  const base: Placed = { x: grip.x, y: COCKPIT.floorY + 0.04, z: grip.z }
  const shaftHeight = grip.y - base.y

  group.add(
    box(0.16, 0.08, 0.16, gunmetalMaterial(), base),
    cylinderY(STICK.shaftRadius, STICK.shaftRadius * 1.3, shaftHeight, gunmetalMaterial(), {
      x: grip.x,
      y: base.y + shaftHeight / 2,
      z: grip.z,
    }),
    cylinderY(STICK.gripRadius, STICK.gripRadius * 0.7, 0.16, stickGripMaterial(), grip, 8)
  )
  return group
}

export interface Sticks {
  group: Group
  dispose(): void
}

export function createControlSticks(): Sticks {
  const group = new Group()
  group.name = 'sticks'
  group.add(buildStick(STICK.pilotGrip), buildStick(STICK.copilotGrip))

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
  }
}
