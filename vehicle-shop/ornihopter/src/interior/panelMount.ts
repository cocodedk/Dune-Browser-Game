// vehicle-shop/ornihopter/src/interior/panelMount.ts
// How anything gets attached to the raked instrument panel. Every part on the
// dash — MFD, keypad, standby dial, annunciator — is placed by a station along
// the panel's own slope and a lift off its face, never by an absolute y that
// would have to be re-guessed if consoleShell.ts's rake ever changes.
//
// u runs 0 at the panel's lower (pilot-facing) edge to 1 at its top. SLOPE is
// how many metres of real panel that is, so `uPer` converts a part's height in
// metres into the span of u it occupies — which is what keeps a 0.42m bezel
// from being authored as "about 0.8 of the panel" and drifting.

import type { Mesh } from 'three'
import { CONSOLE } from './layout'
import { PANEL_BREAK_Z, PANEL_PITCH, PANEL_RISE, surfaceYAt } from './consoleShell'

/** Along-slope length of the raked panel, metres. */
export const PANEL_SLOPE = Math.hypot(PANEL_BREAK_Z - CONSOLE.farZ, PANEL_RISE)

export function panelZ(u: number): number {
  return PANEL_BREAK_Z + (CONSOLE.farZ - PANEL_BREAK_Z) * u
}

/** The span of u taken up by `metres` measured up the panel's face. */
export function uPer(metres: number): number {
  return metres / PANEL_SLOPE
}

/** Lays `mesh` flush on the panel at (x, u), `lift` metres off its face along
 *  the panel normal. Returns the same mesh so calls read as one expression. */
export function onPanel(mesh: Mesh, x: number, u: number, lift = 0.02): Mesh {
  const z = panelZ(u)
  mesh.position.set(
    x,
    surfaceYAt(z) + lift * Math.cos(PANEL_PITCH),
    z + lift * Math.sin(PANEL_PITCH)
  )
  mesh.rotation.x = PANEL_PITCH
  return mesh
}
