// vehicle-shop/ornihopter/src/interior/controlConduit.ts
// The coil conduit, moved OFF the stick. Round 9c: the reference boards hang
// this from the OVERHEAD console, and round 7's "black helix wound around
// it" was partly this cable being read as the control column's own
// structure. Same short-stepped-zigzag technique round 6b's stick used for
// its coil — it reads as a coiled cord at a fraction of a swept helix's
// cost — now run between layout.ts's CONDUIT endpoints instead of alongside
// an arm.

import { Group, Vector3 } from 'three'
import { CONDUIT } from './layout'
import { segment } from './sceneUtils'
import { gunmetalMaterial } from './materials'

export function buildControlConduit(): Group {
  const group = new Group()
  group.name = 'control-conduit'

  const material = gunmetalMaterial()
  const from = new Vector3(CONDUIT.top.x, CONDUIT.top.y, CONDUIT.top.z)
  const to = new Vector3(CONDUIT.bottom.x, CONDUIT.bottom.y, CONDUIT.bottom.z)

  // A short straight clamp where it leaves the overhead console's own
  // underside, so "attaches to the overhead" is a mesh flush on CONDUIT.top,
  // not an assumption about where the coil below happens to start.
  group.add(
    segment({ x: from.x, y: from.y, z: from.z }, { x: from.x, y: from.y - 0.04, z: from.z }, 0.018, 0.018, material)
  )

  // MEASURED, round 6b's coiledCable: 16 short steps at a 0.028m throw read
  // as a coil; fewer reads as a coarse zigzag the size of the run itself.
  const coils = 16
  const direction = new Vector3().subVectors(to, from)
  const step = direction.clone().multiplyScalar(1 / coils)
  const side = new Vector3(step.z, 0, -step.x).normalize().multiplyScalar(0.028)
  for (let i = 0; i < coils; i++) {
    const at = from.clone().addScaledVector(step, i)
    const swing = i % 2 === 0 ? 1 : -1
    const a = at.clone().addScaledVector(side, swing)
    const b = at.clone().add(step).addScaledVector(side, -swing)
    group.add(segment(a, b, 0.011, 0.011, material))
  }

  return group
}
