// vehicle-shop/ornihopter/src/interior/console.ts
// The instrument console, assembled: consoleShell.ts's tapered structure,
// instruments.ts's faces, a side console beside each pilot's hip, and a
// throttle quadrant that actually reflects FlightState.throttle. Positions
// come from layout.ts's CONSOLE block; see that file for why consoleZ is read
// as the pilot-facing (near) edge and why the dash's width is a function of z
// rather than one number measured at its narrowest corner.

import { Group } from 'three'
import { COCKPIT } from '../spec'
import { CONSOLE, seatX } from './layout'
import { RAIL_Y } from './canopyLayout'
import { hullInteriorHalfWidthAt } from './hullSection'
import { box, cylinderY, disposeGroup, type Placed } from './sceneUtils'
import { buildConsoleShell } from './consoleShell'
import { buildInstruments } from './instruments'
import {
  consoleBodyMaterial, machinedMaterial, machinedDarkMaterial, gunmetalMaterial,
  amberLitMaterial, redLitMaterial,
} from './materials'

const THROTTLE_AT: Placed = {
  x: seatX(-1) - 0.34,
  y: CONSOLE.topY,
  z: CONSOLE.nearZ - 0.14,
}

/**
 * Side consoles: a low box down each flank between the seat and the wall, from
 * the hip forward to the dash. These are the parts that appear at the bottom
 * corners of the pilot frame, and they are most of what makes the view read as
 * SEATED — a body has something either side of it at elbow height instead of
 * open air out to the sills.
 */
function sideConsole(group: Group, side: -1 | 1): void {
  const zFront = CONSOLE.nearZ
  const zBack = COCKPIT.seatZ + 0.2
  const topY = RAIL_Y - 0.28
  const outer = hullInteriorHalfWidthAt(topY, (zFront + zBack) / 2)
  const inner = COCKPIT.seatOffsetX + COCKPIT.seatWidth / 2 + 0.03
  // Capped rather than run out to the skin: the cabin is 4.2m wide at this
  // height and the crew occupy the middle 1.4m of it, so an uncapped console
  // would be a 1.4m shelf per side — a floor, not a console.
  const width = Math.min(0.52, outer - inner)
  if (width <= 0.05) return
  const centreX = side * (inner + width / 2)
  const midZ = (zFront + zBack) / 2
  const length = zBack - zFront
  group.add(
    box(width, topY - CONSOLE.baseY, length, consoleBodyMaterial(), {
      x: centreX,
      y: (topY + CONSOLE.baseY) / 2,
      z: midZ,
    }),
    box(width + 0.03, 0.05, length, machinedMaterial(), {
      x: centreX,
      y: topY + 0.025,
      z: midZ,
    })
  )
  // Switch blocks along the console top, so it is not a bare shelf.
  for (let i = 0; i < 3; i++) {
    const z = zFront + (length * (i + 0.6)) / 3.4
    group.add(
      box(width * 0.55, 0.045, 0.12, machinedDarkMaterial(), { x: centreX, y: topY + 0.07, z }),
      box(0.05, 0.03, 0.05, i === 1 ? redLitMaterial() : amberLitMaterial(), {
        x: centreX + width * 0.18,
        y: topY + 0.1,
        z,
      })
    )
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

  const shell = buildConsoleShell()
  const instruments = buildInstruments()
  group.add(shell.group, instruments.group)

  sideConsole(group, -1)
  sideConsole(group, 1)

  // Throttle quadrant: a slotted plate with a lever standing in it, on the
  // flat switch deck outboard of the pilot's own instruments.
  group.add(
    box(0.16, 0.05, 0.3, machinedDarkMaterial(), {
      x: THROTTLE_AT.x,
      y: CONSOLE.topY + 0.025,
      z: THROTTLE_AT.z,
    })
  )
  const throttlePivot = new Group()
  throttlePivot.position.set(THROTTLE_AT.x, THROTTLE_AT.y, THROTTLE_AT.z)
  throttlePivot.add(
    cylinderY(0.026, 0.034, 0.3, gunmetalMaterial(), { x: 0, y: 0.15, z: 0 }),
    box(0.07, 0.06, 0.06, machinedMaterial(), { x: 0, y: 0.3, z: 0 })
  )
  group.add(throttlePivot)

  // A grab handle on the coaming — the reference cockpits are full of them,
  // and it gives the near edge of the dash a readable silhouette.
  group.add(
    box(0.03, 0.03, 0.34, machinedMaterial(), {
      x: seatX(-1) + 0.5,
      y: CONSOLE.topY + CONSOLE.coamingRise + 0.05,
      z: CONSOLE.nearZ - 0.16,
    })
  )

  return {
    group,
    dispose() {
      shell.dispose()
      instruments.dispose()
      disposeGroup(group)
    },
    // Idle leans aft (toward the pilot), full throttle stands the lever up —
    // the ordinary sense for a quadrant-style throttle.
    setThrottle(t) {
      throttlePivot.rotation.x = 0.35 - 0.4 * Math.min(1, Math.max(0, t))
    },
  }
}
