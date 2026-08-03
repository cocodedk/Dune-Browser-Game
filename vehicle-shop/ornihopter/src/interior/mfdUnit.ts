// vehicle-shop/ornihopter/src/interior/mfdUnit.ts
// One multifunction display: a hard bezel, the lit screen recessed in it, and
// the rows of bezel keys that make it an MFD rather than a television.
//
// THE ELEMENT B2 ASKS FOR is "two large colour MFDs with bezel-key rows
// dominating the panel", and the keys are not decoration — they are how a
// critic tells an avionics display from a rectangle of glow. The AH-64E's MFD
// carries keys on all four sides; this panel's raked face is only 0.50m from
// break to top (consoleShell.ts's PANEL_RISE), so a bezel tall enough for a
// top row as well would run off the panel. Five down each side and five along
// the bottom is 15 keys per bezel, against B3's bar of >= 8.
//
// SIZES, and where they come from. The screen is 0.36 x 0.27m of real face:
// B3 wants each screen >= 140px wide in the 1600x1000 pilot frame, and at the
// 1.4-1.7m this panel sits from PILOT_EYE that costs about 0.30m — so 0.36 is
// the bar plus a margin, not a number picked for looks. The bezel adds a
// 0.08m key gutter around it and no more; a wider frame would eat the panel
// width the standby cluster and the annunciators still need.

import { Group, type Texture } from 'three'
import { box } from './sceneUtils'
import { onPanel, uPer } from './panelMount'
import { bezelMaterial, keyMaterial, screenMaterial } from './materials'

const SCREEN_W = 0.36
const SCREEN_H = 0.27
const BEZEL_W = 0.52
const BEZEL_H = 0.42

/** Perpendicular offsets off the panel face: the bezel plate, then the screen
 *  sitting on it, then the keys standing proud of both. */
const BEZEL_LIFT = 0.02
const SCREEN_LIFT = 0.04
const KEY_LIFT = 0.048

/** The screen sits high in the bezel; the bottom key row lives under it. */
const SCREEN_OFFSET = 0.055
const KEY_ROW_OFFSET = -0.15

function bottomKeys(group: Group, x: number, u: number): void {
  for (const dx of [-0.16, -0.08, 0, 0.08, 0.16]) {
    const key = box(0.07, 0.022, 0.05, keyMaterial(), { x: 0, y: 0, z: 0 })
    key.name = 'mfd-key'
    group.add(onPanel(key, x + dx, u + uPer(KEY_ROW_OFFSET), KEY_LIFT))
  }
}

function sideKeys(group: Group, x: number, u: number): void {
  for (const side of [-1, 1] as const) {
    for (const step of [-2, -1, 0, 1, 2]) {
      const key = box(0.05, 0.022, 0.048, keyMaterial(), { x: 0, y: 0, z: 0 })
      key.name = 'mfd-key'
      group.add(
        onPanel(
          key,
          x + side * 0.215,
          u + uPer(SCREEN_OFFSET) + uPer(step * 0.058),
          KEY_LIFT
        )
      )
    }
  }
}

/**
 * `u` is the bezel's own centre station on the panel. The screen and the key
 * rows are placed relative to it, so moving a whole display is one number.
 */
export function buildMfdUnit(x: number, u: number, page: Texture): Group {
  const group = new Group()
  group.name = 'mfd-unit'

  const bezel = box(BEZEL_W, 0.03, BEZEL_H, bezelMaterial(), { x: 0, y: 0, z: 0 })
  bezel.name = 'mfd-bezel'
  group.add(onPanel(bezel, x, u, BEZEL_LIFT))

  const screen = box(SCREEN_W, 0.012, SCREEN_H, screenMaterial(page), { x: 0, y: 0, z: 0 })
  screen.name = 'mfd-screen'
  group.add(onPanel(screen, x, u + uPer(SCREEN_OFFSET), SCREEN_LIFT))

  bottomKeys(group, x, u)
  sideKeys(group, x, u)
  return group
}
