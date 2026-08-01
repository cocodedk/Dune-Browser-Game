// vehicle-shop/ornihopter/src/interior/console.ts
// The instrument console: one wide low dash, a raised centre hood, rows of
// small dial/switch greebles, and a throttle lever that actually reflects
// FlightState.throttle. Positions come from layout.ts's CONSOLE block; see
// that file for why consoleZ is read as the pilot-facing (near) edge.

import { Group } from 'three'
import { CONSOLE } from './layout'
import { box, cylinderY, disposeGroup, type Placed } from './sceneUtils'
import {
  consoleBodyMaterial, darkDialMaterial, amberLitMaterial, greenLitMaterial, redLitMaterial,
  gunmetalMaterial,
} from './materials'

const CENTER_Z = (CONSOLE.nearZ + CONSOLE.farZ) / 2
const BODY_HEIGHT = CONSOLE.topY - CONSOLE.baseY
const THROTTLE_AT: Placed = { x: -0.9, y: CONSOLE.topY, z: CONSOLE.nearZ - 0.15 }

const LIT = [amberLitMaterial, greenLitMaterial, redLitMaterial]

/** A row of small flush dial faces, alternating lit colours over a dark base. */
function dialRow(group: Group, xs: number[], y: number, z: number): void {
  xs.forEach((x, i) => {
    const material = i % 3 === 0 ? darkDialMaterial() : LIT[i % LIT.length]()
    group.add(box(0.12, 0.03, 0.1, material, { x, y, z }))
  })
}

/** A row of small raised toggle-switch nubs. */
function switchRow(group: Group, xs: number[], z: number): void {
  for (const x of xs) {
    group.add(cylinderY(0.02, 0.02, 0.09, gunmetalMaterial(), { x, y: CONSOLE.topY + 0.045, z }, 6))
  }
}

export interface Console {
  group: Group
  dispose(): void
  setThrottle(t: number): void
}

export function createConsole(): Console {
  const group = new Group()
  group.name = 'console'

  const body = box(CONSOLE.halfWidth * 2, BODY_HEIGHT, CONSOLE.depth, consoleBodyMaterial(), {
    x: 0,
    y: (CONSOLE.topY + CONSOLE.baseY) / 2,
    z: CENTER_Z,
  })
  group.add(body)

  // Centre hood: the one part of the dash raised above the flat top, holding
  // the primary gauge. Measured visible at ~27 degrees below the sightline.
  // Offsets below are SUBTRACTED from nearZ (the pilot-facing edge) to move
  // further into the console body, toward the nose — nearZ is the larger
  // (least-negative) end of the console's z-span, since -Z is forward.
  const hoodZ = CONSOLE.nearZ - 0.15
  const hood = box(0.5, 0.2, 0.3, consoleBodyMaterial(), { x: 0, y: CONSOLE.topY + 0.1, z: hoodZ })
  group.add(hood)
  dialRow(group, [-0.15, 0, 0.15], CONSOLE.topY + 0.2 + 0.015, hoodZ)

  // Pilot's side: the wide, fully-visible half of the dash gets most of the
  // readable structure — two rows, dials then switches.
  const pilotXs = [-1.9, -1.6, -1.3, -1.0, -0.7, -0.45]
  dialRow(group, pilotXs, CONSOLE.topY + 0.015, CONSOLE.nearZ - 0.08)
  switchRow(group, pilotXs, CONSOLE.nearZ - 0.35)

  // Copilot's side: per layout.ts, only the far strip of the console clears
  // the camera frustum on this side, so the cluster sits back there, not at
  // the near edge where the pilot's own dials are. Named as its own group so
  // frustum.test.ts can check it independently of the rest of the dash.
  const copilotCluster = new Group()
  copilotCluster.name = 'console-copilot-cluster'
  const copilotXs = [
    CONSOLE.copilotClusterXMin,
    (CONSOLE.copilotClusterXMin + CONSOLE.copilotClusterXMax) / 2,
    CONSOLE.copilotClusterXMax,
  ]
  const copilotZ = (CONSOLE.copilotClusterZMin + CONSOLE.copilotClusterZMax) / 2
  dialRow(copilotCluster, copilotXs, CONSOLE.topY + 0.015, copilotZ)
  group.add(copilotCluster)

  const throttlePivot = new Group()
  throttlePivot.position.set(THROTTLE_AT.x, THROTTLE_AT.y, THROTTLE_AT.z)
  const lever = cylinderY(0.022, 0.03, 0.26, gunmetalMaterial(), { x: 0, y: 0.13, z: 0 })
  throttlePivot.add(lever)
  group.add(throttlePivot)

  return {
    group,
    dispose() {
      disposeGroup(group)
    },
    // Idle leans aft (toward the pilot), full throttle stands the lever up —
    // the ordinary sense for a quadrant-style throttle.
    setThrottle(t) {
      throttlePivot.rotation.x = 0.3 - 0.35 * Math.min(1, Math.max(0, t))
    },
  }
}
