// vehicle-shop/ornihopter/src/interior/upFrontDisplay.ts
// The up-front display and its data-entry keypad — B2's "up-front display and
// keypad between/above them".
//
// BETWEEN, not above, and that is a measurement rather than a preference. The
// raked panel is 0.50m from break to top and the two MFD bezels are 0.42m of
// it (mfdUnit.ts), so there is no band left above them to hang a UFD in. There
// is width to spare: the dash is 3.3-4.0m across at this height
// (consoleShell.ts's swept sections), and the crew sit 0.76m apart. So the UFD
// and the keyboard unit go in a narrow column standing between the pilot's two
// displays, which is also where an AH-64E crew member's hand actually finds
// them without leaving the grips.

import { Group, type Texture } from 'three'
import { box } from './sceneUtils'
import { onPanel, uPer } from './panelMount'
import { bezelMaterial, keyMaterial, screenMaterial } from './materials'

const COLUMN_W = 0.3
const COLUMN_H = 0.42

const KEY_COLUMNS = [-0.0975, -0.0325, 0.0325, 0.0975]
const KEY_ROWS = [-0.14, -0.085, -0.03, 0.025]

/**
 * `u` is the column's centre station, matched to the MFD bezels either side so
 * the three read as one instrument bay rather than three parts that happened
 * to land near each other.
 */
export function buildUpFrontDisplay(x: number, u: number, strip: Texture): Group {
  const group = new Group()
  group.name = 'ufd-unit'

  const backing = box(COLUMN_W, 0.026, COLUMN_H, bezelMaterial(), { x: 0, y: 0, z: 0 })
  backing.name = 'ufd-backing'
  group.add(onPanel(backing, x, u, 0.018))

  // The display strip at the top of the column, under the glareshield's own
  // shadow line — the AH-64E's UFD station.
  const screen = box(0.25, 0.012, 0.085, screenMaterial(strip), { x: 0, y: 0, z: 0 })
  screen.name = 'ufd-screen'
  group.add(onPanel(screen, x, u + uPer(0.155), 0.038))

  // 4 x 4 keyboard unit below it: 16 keys, against the guard's bar of 12.
  for (const du of KEY_ROWS) {
    for (const dx of KEY_COLUMNS) {
      const key = box(0.05, 0.022, 0.045, keyMaterial(), { x: 0, y: 0, z: 0 })
      key.name = 'ufd-key'
      group.add(onPanel(key, x + dx, u + uPer(du), 0.044))
    }
  }
  return group
}
