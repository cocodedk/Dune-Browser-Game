// vehicle-shop/ornihopter/src/interior/lighting.ts
// Cabin fill lighting. Bar item: "the cabin must be lit". main.ts forces
// castShadow/receiveShadow true on every mesh under the craft root (see its
// header) with no exceptions, so the sun's shadow map treats the hull and
// the canopy glazing alike as full shadow casters — the cabin sits in their
// combined shadow almost regardless of what any material in this directory
// does, and that shadow cannot be opted out of from here. HemisphereLight
// (stage/scene.ts) is not shadow-mapped and always reaches the cabin, but at
// its own scene-wide intensity that alone still read as near-total black
// silhouette (progress.md's round-1 cockpit critic). These are ordinary,
// non-shadow-casting point lights local to the cabin: cheap, and in this
// small an enclosed volume a missing self-shadow will not be noticed.

import { Group, PointLight } from 'three'
import { OVERHEAD, EYE } from './layout'

const DOME_COLOR = 0xffdca8
const FILL_COLOR = 0xb8c6d4

export interface CabinLighting {
  group: Group
  dispose(): void
}

export function createCabinLighting(): CabinLighting {
  const group = new Group()
  group.name = 'cabinLighting'

  // The overhead panel's own fixture (thopter-03's "ILLUMINATED LIGHTS"
  // callout) doubling as the cabin's main dome light.
  const dome = new PointLight(DOME_COLOR, 9, 6.5, 2)
  dome.position.set(OVERHEAD.x, OVERHEAD.panelBottomY - 0.1, OVERHEAD.z)
  dome.castShadow = false

  // A softer, cooler fill over the seats, centred on the aisle between
  // pilot and copilot so both sides read as lit, solid volumes rather than
  // silhouettes — including the copilot figure, which the pilot only sees
  // by turning their head (camera/cameraRig.ts's lookAround).
  const fill = new PointLight(FILL_COLOR, 5, 7, 2)
  fill.position.set(0, 0.7, EYE.z + 0.4)
  fill.castShadow = false

  group.add(dome, fill)

  return {
    group,
    dispose() {
      group.clear()
    },
  }
}
